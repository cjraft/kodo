import {
  getModel,
  streamSimple,
  type Api,
  type AssistantMessageEvent,
  type KnownProvider,
  type Model,
  type ThinkingLevel,
} from "@mariozechner/pi-ai";
import type { LlmClient, ModelRequest, ModelResponseEvent, ModelStopReason } from "./types.js";
import { buildPiContext } from "../context/pi-context.js";

type OpenAiCompatibleModel = Model<"openai-completions">;

/**
 * Typed config required to construct the pi-ai backed client.
 */
export interface PiAiClientConfig {
  providerId: string;
  model: string;
  apiKey?: string;
  baseUrl: string;
  contextWindow?: number;
  maxOutputTokens?: number;
  reasoning?: ThinkingLevel;
  compat?: OpenAiCompatibleModel["compat"];
}

/**
 * Fallback model limits used when the selected provider metadata is incomplete.
 */
export const DEFAULT_CONTEXT_WINDOW = 128_000;
export const DEFAULT_MAX_OUTPUT_TOKENS = 16_384;

/**
 * Creates an OpenAI-compatible model descriptor when pi-ai has no built-in
 * metadata for the requested provider/model pair.
 */
const createCustomOpenAiCompatibleModel = (config: PiAiClientConfig): OpenAiCompatibleModel => ({
  id: config.model,
  name: `${config.providerId}/${config.model}`,
  api: "openai-completions",
  provider: config.providerId,
  baseUrl: config.baseUrl,
  reasoning: Boolean(config.reasoning),
  input: ["text"],
  cost: {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
  },
  contextWindow: config.contextWindow ?? DEFAULT_CONTEXT_WINDOW,
  maxTokens: config.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
  compat: config.compat,
});

/**
 * Resolves the provider model from pi-ai's catalog first, then falls back to
 * a custom OpenAI-compatible descriptor.
 */
const resolveModel = (config: PiAiClientConfig): Model<Api> => {
  const selected = getModel(config.providerId as KnownProvider, config.model as never);

  if (selected) {
    return {
      ...selected,
      baseUrl: config.baseUrl || selected.baseUrl,
    };
  }

  return createCustomOpenAiCompatibleModel(config);
};

/**
 * Maps pi-ai stop reasons into the agent's provider-neutral stop reasons.
 */
const mapStopReason = (
  reason: AssistantMessageEvent extends infer T
    ? T extends { type: "done"; reason: infer R }
      ? R
      : never
    : never,
): ModelStopReason => {
  if (reason === "toolUse") {
    return "tool_use";
  }

  if (reason === "length") {
    return "max_tokens";
  }

  return "end_turn";
};

/**
 * LLM adapter backed by `@mariozechner/pi-ai`. It isolates provider-specific
 * request and stream handling behind the `LlmClient` interface.
 */
export class PiAiClient implements LlmClient {
  readonly name: string;
  private readonly model: Model<Api>;

  constructor(private readonly config: PiAiClientConfig) {
    this.name = `pi-ai/${config.providerId}`;
    this.model = resolveModel(config);
  }

  /**
   * Exposes the resolved model snapshot for targeted debugging and tests.
   */
  getDebugSnapshot() {
    return {
      config: this.config,
      model: this.model,
    };
  }

  /**
   * Streams provider events and normalizes them into the agent's event contract.
   */
  async *stream(input: ModelRequest): AsyncIterable<ModelResponseEvent> {
    const context = buildPiContext(input, this.model);
    const stream = streamSimple(this.model, context, {
      apiKey: this.config.apiKey,
      maxTokens: this.config.maxOutputTokens,
      reasoning: this.config.reasoning,
    });

    for await (const event of stream) {
      if (event.type === "thinking_delta") {
        yield { type: "reasoning-delta", text: event.delta };
      }

      if (event.type === "thinking_end") {
        const content = event.partial.content[event.contentIndex];
        yield {
          type: "reasoning-end",
          signature: content?.type === "thinking" ? content.thinkingSignature : undefined,
        };
      }

      if (event.type === "text_delta") {
        yield { type: "text-delta", text: event.delta };
      }

      if (event.type === "toolcall_end") {
        yield {
          type: "tool-call",
          toolCall: {
            id: event.toolCall.id,
            toolName: event.toolCall.name,
            input: event.toolCall.arguments,
          },
        };
      }

      if (event.type === "done") {
        yield { type: "done", stopReason: mapStopReason(event.reason) };
      }

      if (event.type === "error") {
        yield {
          type: "error",
          message: event.error.errorMessage ?? "LLM stream failed.",
        };
      }
    }
  }
}

/**
 * Factory kept at the module boundary so bootstrap does not depend on the concrete class.
 */
export const createPiAiClient = (config: PiAiClientConfig) => new PiAiClient(config);
