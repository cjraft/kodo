/**
 * Stored transcript roles. The model-facing context layer remaps these to
 * provider-specific message formats when building a request.
 */
export type MessageRole = "system" | "user" | "assistant" | "tool";

/**
 * Normalized tool call emitted by the assistant and persisted in the transcript.
 */
export interface AssistantToolCall {
  id: string;
  toolName: string;
  input: unknown;
}

/**
 * Persisted transcript message used across agent, store, and context layers.
 */
export interface Message {
  id: string;
  role: MessageRole;
  text: string;
  reasoning?: string;
  reasoningSignature?: string;
  createdAt: string;
  toolName?: string;
  toolCallId?: string;
  toolError?: boolean;
  toolCalls?: AssistantToolCall[];
}

/**
 * Structured record for each tool invocation, separate from the tool result message.
 */
export interface ToolCallRecord {
  id: string;
  toolName: string;
  input: unknown;
  createdAt: string;
  output?: unknown;
  isError?: boolean;
}

/**
 * Small session index record used for listing and restoring sessions.
 */
export interface SessionMeta {
  id: string;
  cwd: string;
  createdAt: string;
  updatedAt: string;
  provider: string;
}

/**
 * Complete persisted session state reconstructed from disk.
 */
export interface SessionSnapshot {
  meta: SessionMeta;
  messages: Message[];
  toolCalls: ToolCallRecord[];
}
