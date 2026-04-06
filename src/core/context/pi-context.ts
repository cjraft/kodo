import {
  Type,
  type Api,
  type AssistantMessage,
  type Context,
  type Model,
  type Tool as PiAiTool,
  type ToolResultMessage,
  type UserMessage,
} from "@mariozechner/pi-ai";
import type { Message } from "../session/types.js";
import type { ToolDefinition } from "../tools/types.js";
import type { ModelRequest } from "../llm/types.js";

type PiAiContextMessage = Context["messages"][number];

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
    total: 0,
  },
} as const;

const buildSystemPrompt = (cwd: string) =>
  [
    "You are Kodo, a local coding agent running inside a terminal.",
    `Current working directory: ${cwd}`,
    "Use tools when they are necessary and answer directly when they are not.",
    "Prefer file_read when the user asks to inspect or read a known workspace file.",
    "Use bash for shell tasks, not as a substitute for opening text files.",
    "Never infer that a file or directory is missing from a failed or timed-out tool result.",
  ].join("\n");

const toPiAiTool = (tool: ToolDefinition): PiAiTool => ({
  name: tool.name,
  description: tool.description,
  parameters: Type.Unsafe(tool.inputSchema),
});

const isStringSchema = (value: unknown): value is { type: "string" } =>
  Boolean(
    value &&
    typeof value === "object" &&
    "type" in value &&
    (value as { type?: unknown }).type === "string",
  );

/**
 * Older transcripts may store plain-string tool arguments from an earlier tool
 * schema. When the current schema is a single required string field, rebuild a
 * compatible object payload so resumed sessions stay valid.
 */
const normalizeToolCallInput = (
  input: unknown,
  toolName: string,
  toolDefinitions: Map<string, ToolDefinition>,
) => {
  if (typeof input !== "string" && !(input instanceof String)) {
    return input;
  }

  const definition = toolDefinitions.get(toolName);
  const required =
    definition?.inputSchema.required && Array.isArray(definition.inputSchema.required)
      ? definition.inputSchema.required.filter(
          (value): value is string => typeof value === "string",
        )
      : [];
  const properties =
    definition?.inputSchema.properties && typeof definition.inputSchema.properties === "object"
      ? definition.inputSchema.properties
      : null;

  if (definition?.inputSchema.type !== "object" || required.length !== 1 || !properties) {
    return input;
  }

  const [propertyName] = required;
  const propertySchema =
    propertyName && propertyName in properties
      ? (properties as Record<string, unknown>)[propertyName]
      : undefined;

  if (!isStringSchema(propertySchema)) {
    return input;
  }

  return {
    [propertyName]: String(input),
  };
};

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
  model: Model<Api>,
  toolDefinitions: Map<string, ToolDefinition>,
): AssistantMessage => ({
  role: "assistant",
  content: [
    ...(message.reasoning || shouldAddThinkingFallback(message, model)
      ? [
          {
            type: "thinking" as const,
            thinking: message.reasoning || "Tool planning completed.",
            thinkingSignature: message.reasoningSignature,
          },
        ]
      : []),
    ...(message.text
      ? [
          {
            type: "text" as const,
            text: message.text,
          },
        ]
      : []),
    ...(message.toolCalls ?? []).map((toolCall) => ({
      type: "toolCall" as const,
      id: toolCall.id,
      name: toolCall.toolName,
      arguments: normalizeToolCallInput(
        toolCall.input,
        toolCall.toolName,
        toolDefinitions,
      ) as Record<string, unknown>,
    })),
  ],
  api: model.api,
  provider: model.provider,
  model: model.id,
  usage: { ...ZERO_USAGE, cost: { ...ZERO_USAGE.cost } },
  stopReason: "stop",
  timestamp: Date.parse(message.createdAt) || Date.now(),
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
      text: message.text,
    },
  ],
  isError: message.toolError ?? false,
  timestamp: Date.parse(message.createdAt) || Date.now(),
});

/**
 * Converts stored user messages into pi-ai user messages.
 */
const toPiAiUserMessage = (message: Message): UserMessage => ({
  role: "user",
  content: message.text,
  timestamp: Date.parse(message.createdAt) || Date.now(),
});

/**
 * Rebuilds provider context from persisted transcript messages. Tool result
 * messages tied to dropped tool calls are also removed to keep the transcript valid.
 */
const toContextMessages = (
  messages: Message[],
  model: Model<Api>,
  toolDefinitions: Map<string, ToolDefinition>,
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
            reasoning: undefined,
          },
          model,
          toolDefinitions,
        ),
      );
      continue;
    }

    if (message.role === "assistant") {
      contextMessages.push(toPiAiAssistantMessage(message, model, toolDefinitions));
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
export const buildPiContext = (
  input: Pick<ModelRequest, "cwd" | "messages" | "tools">,
  model: Model<Api>,
): Context => {
  const toolDefinitions = new Map(input.tools.map((tool) => [tool.name, tool] as const));

  return {
    systemPrompt: buildSystemPrompt(input.cwd),
    messages: toContextMessages(input.messages, model, toolDefinitions),
    tools: input.tools.map(toPiAiTool),
  };
};
