import {
  Type,
  getModel,
  streamSimple,
  type Api,
  type AssistantMessageEvent,
  type AssistantMessage,
  type Context,
  type KnownProvider,
  type Model,
  type Tool as PiAiTool,
  type ThinkingLevel,
  type ToolResultMessage,
  type UserMessage
} from "@mariozechner/pi-ai";
import type { Message } from "../session/types.js";
import type { ToolDefinition } from "../tools/types.js";
import type {
  LlmClient,
  ModelRequest,
  ModelResponseEvent,
  ModelStopReason
} from "./types.js";

type OpenAiCompatibleModel = Model<"openai-completions">;
type PiAiContextMessage = Context["messages"][number];

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

const ZERO_USAGE = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
  totalTokens: 0,
  cost: {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    total: 0
  }
} as const;

const buildSystemPrompt = (cwd: string) =>
  [
    "You are Kodo, a local coding agent running inside a terminal.",
    `Current working directory: ${cwd}`,
    "Use tools when they are necessary and answer directly when they are not."
  ].join("\n");

const toPiAiTool = (tool: ToolDefinition): PiAiTool => ({
  name: tool.name,
  description: tool.description,
  parameters: Type.Unsafe(tool.inputSchema)
});

/**
 * Some reasoning-capable models require a thinking block whenever a tool call
 * exists. Older stored messages may miss that block, so we inject a fallback.
 */
const shouldAddThinkingFallback = (message: Message, model: Model<Api>) =>
  !message.reasoning &&
  (message.toolCalls?.length ?? 0) > 0 &&
  Boolean((model as { reasoning?: unknown }).reasoning);

/**
 * Converts a persisted assistant message into pi-ai's structured assistant format.
 */
const toPiAiAssistantMessage = (
  message: Message,
  model: Model<Api>
): AssistantMessage => ({
  role: "assistant",
  content: [
    ...(message.reasoning || shouldAddThinkingFallback(message, model)
      ? [
          {
            type: "thinking" as const,
            thinking: message.reasoning || "Tool planning completed.",
            thinkingSignature: message.reasoningSignature
          }
        ]
      : []),
    ...(message.text
      ? [
          {
            type: "text" as const,
            text: message.text
          }
        ]
      : []),
    ...(message.toolCalls ?? []).map((toolCall) => ({
      type: "toolCall" as const,
      id: toolCall.id,
      name: toolCall.toolName,
      arguments: toolCall.input as Record<string, unknown>
    }))
  ],
  api: model.api,
  provider: model.provider,
  model: model.id,
  usage: { ...ZERO_USAGE, cost: { ...ZERO_USAGE.cost } },
  stopReason: "stop",
  timestamp: Date.parse(message.createdAt) || Date.now()
});

/**
 * Converts stored tool result messages into pi-ai tool result messages.
 */
const toPiAiToolResultMessage = (message: Message): ToolResultMessage => ({
  role: "toolResult",
  toolCallId: message.toolCallId ?? message.id,
  toolName: message.toolName ?? "unknown",
  content: [
    {
      type: "text",
      text: message.text
    }
  ],
  isError: false,
  timestamp: Date.parse(message.createdAt) || Date.now()
});

/**
 * Converts stored user messages into pi-ai user messages.
 */
const toPiAiUserMessage = (message: Message): UserMessage => ({
  role: "user",
  content: message.text,
  timestamp: Date.parse(message.createdAt) || Date.now()
});

/**
 * Rebuilds provider context from persisted transcript messages. Tool result
 * messages tied to dropped tool calls are also removed to keep the transcript valid.
 */
const toContextMessages = (
  messages: Message[],
  model: Model<Api>
): PiAiContextMessage[] => {
  const droppedToolCallIds = new Set<string>();
  const contextMessages: PiAiContextMessage[] = [];

  for (const message of messages) {
    if (
      message.role === "assistant" &&
      (message.toolCalls?.length ?? 0) > 0 &&
      Boolean((model as { reasoning?: unknown }).reasoning) &&
      !message.reasoningSignature
    ) {
      for (const toolCall of message.toolCalls ?? []) {
        droppedToolCallIds.add(toolCall.id);
      }

      if (!message.text.trim()) {
        continue;
      }

      contextMessages.push(
        toPiAiAssistantMessage(
          {
            ...message,
            toolCalls: [],
            reasoning: undefined
          },
          model
        )
      );
      continue;
    }

    if (message.role === "assistant") {
      contextMessages.push(toPiAiAssistantMessage(message, model));
      continue;
    }

    if (message.role === "tool") {
      if (message.toolCallId && droppedToolCallIds.has(message.toolCallId)) {
        continue;
      }

      contextMessages.push(toPiAiToolResultMessage(message));
      continue;
    }

    contextMessages.push(toPiAiUserMessage(message));
  }

  return contextMessages;
};

/**
 * Builds the provider request payload consumed by pi-ai.
 */
export const buildPiAiContext = (
  input: Pick<ModelRequest, "cwd" | "messages" | "tools">,
  model: Model<Api>
): Context => ({
  systemPrompt: buildSystemPrompt(input.cwd),
  messages: toContextMessages(input.messages, model),
  tools: input.tools.map(toPiAiTool)
});

/**
 * Creates an OpenAI-compatible model descriptor when pi-ai has no built-in
 * metadata for the requested provider/model pair.
 */
const createCustomOpenAiCompatibleModel = (
  config: PiAiClientConfig
): OpenAiCompatibleModel => ({
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
    cacheWrite: 0
  },
  contextWindow: config.contextWindow ?? DEFAULT_CONTEXT_WINDOW,
  maxTokens: config.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
  compat: config.compat
});

/**
 * Resolves the provider model from pi-ai's catalog first, then falls back to
 * a custom OpenAI-compatible descriptor.
 */
const resolveModel = (config: PiAiClientConfig): Model<Api> => {
  const selected = getModel(
    config.providerId as KnownProvider,
    config.model as never
  );

  if (selected) {
    return {
      ...selected,
      baseUrl: config.baseUrl || selected.baseUrl
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
    : never
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
      model: this.model
    };
  }

  /**
   * Streams provider events and normalizes them into the agent's event contract.
   */
  async *stream(input: ModelRequest): AsyncIterable<ModelResponseEvent> {
    const context = buildPiAiContext(input, this.model);
    const stream = streamSimple(this.model, context, {
      apiKey: this.config.apiKey,
      maxTokens: this.config.maxOutputTokens,
      reasoning: this.config.reasoning
    });

    for await (const event of stream) {
      if (event.type === "thinking_delta") {
        yield { type: "reasoning-delta", text: event.delta };
      }

      if (event.type === "thinking_end") {
        const content = event.partial.content[event.contentIndex];
        yield {
          type: "reasoning-end",
          signature:
            content?.type === "thinking" ? content.thinkingSignature : undefined
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
            input: event.toolCall.arguments
          }
        };
      }

      if (event.type === "done") {
        yield { type: "done", stopReason: mapStopReason(event.reason) };
      }

      if (event.type === "error") {
        yield {
          type: "error",
          message: event.error.errorMessage ?? "LLM stream failed."
        };
      }
    }
  }
}

/**
 * Factory kept at the module boundary so bootstrap does not depend on the concrete class.
 */
export const createPiAiClient = (config: PiAiClientConfig) =>
  new PiAiClient(config);
