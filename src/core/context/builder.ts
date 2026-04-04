import type { PiAiClientConfig } from "../llm/client.js";
import {
  DEFAULT_CONTEXT_WINDOW,
  DEFAULT_MAX_OUTPUT_TOKENS
} from "../llm/client.js";
import type { Message } from "../session/types.js";

/**
 * Final context budget enforced before sending messages to the model.
 */
export interface ContextBuilderConfig {
  maxInputTokens: number;
  maxMessages: number;
}

/**
 * Optional bootstrap overrides for context budget calculation.
 */
export interface ContextBuilderOptions {
  maxInputTokens?: number;
  maxMessages?: number;
}

/**
 * Minimum context limits used when no explicit config is supplied.
 */
export const DEFAULT_CONTEXT_BUILDER_CONFIG: ContextBuilderConfig = {
  maxInputTokens: 4_096,
  maxMessages: 64
};

/**
 * Derives the maximum prompt budget from model limits while reserving room
 * for the model's output tokens.
 */
export const deriveDefaultContextInputTokens = (
  llm: Pick<PiAiClientConfig, "contextWindow" | "maxOutputTokens">
) =>
  Math.max(
    DEFAULT_CONTEXT_BUILDER_CONFIG.maxInputTokens,
    (llm.contextWindow ?? DEFAULT_CONTEXT_WINDOW) -
      (llm.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS)
  );

/**
 * Resolves the effective context budget for one runtime.
 */
export const resolveContextBuilderConfig = (
  options: ContextBuilderOptions = {},
  llm: Pick<PiAiClientConfig, "contextWindow" | "maxOutputTokens">
): ContextBuilderConfig => ({
  maxInputTokens:
    options.maxInputTokens ?? deriveDefaultContextInputTokens(llm),
  maxMessages: options.maxMessages ?? DEFAULT_CONTEXT_BUILDER_CONFIG.maxMessages
});

/**
 * Input contract for transcript compaction.
 */
export interface ContextBuildInput {
  messages: Message[];
}

/**
 * Cheap heuristic used for pre-flight budgeting. The goal is deterministic
 * trimming, not provider-accurate token accounting.
 */
const estimateMessageTokens = (message: Message) => {
  const serializedToolCalls = (message.toolCalls ?? [])
    .map((toolCall) => `${toolCall.toolName}:${JSON.stringify(toolCall.input)}`)
    .join("\n");
  const raw = [
    message.reasoningSignature,
    message.reasoning,
    message.text,
    serializedToolCalls
  ]
    .filter(Boolean)
    .join("\n");
  return Math.max(1, Math.ceil(raw.length / 4));
};

/**
 * Selects the newest suffix of the transcript that fits within the configured
 * message-count and token budget constraints.
 */
export class ContextBuilder {
  constructor(private readonly config: ContextBuilderConfig) {}

  /**
   * Builds the model-visible message list from newest to oldest until the
   * configured budget is consumed.
   */
  build(input: ContextBuildInput): Message[] {
    const selected: Message[] = [];
    let totalTokens = 0;

    for (let index = input.messages.length - 1; index >= 0; index -= 1) {
      const message = input.messages[index];
      const messageTokens = estimateMessageTokens(message);

      if (selected.length >= this.config.maxMessages) {
        break;
      }

      if (
        selected.length > 0 &&
        totalTokens + messageTokens > this.config.maxInputTokens
      ) {
        break;
      }

      selected.unshift(message);
      totalTokens += messageTokens;
    }

    return selected;
  }
}
