import type { AssistantToolCall, Message } from "../session/types.js";
import type { ToolDefinition } from "../tools/types.js";

/**
 * Provider-agnostic reasons explaining why a streamed assistant turn ended.
 */
export type ModelStopReason = "end_turn" | "tool_use" | "max_tokens";

/**
 * Normalized streaming events emitted by the LLM layer.
 */
export type ModelResponseEvent =
  | { type: "reasoning-delta"; text: string }
  | { type: "reasoning-end"; signature?: string }
  | { type: "text-delta"; text: string }
  | { type: "tool-call"; toolCall: AssistantToolCall }
  | { type: "done"; stopReason: ModelStopReason }
  | { type: "error"; message: string };

/**
 * Fully assembled provider request produced by the agent and context layers.
 */
export interface ModelRequest {
  messages: Message[];
  tools: ToolDefinition[];
  cwd: string;
}

/**
 * Provider abstraction consumed by the agent loop.
 */
export interface LlmClient {
  name: string;
  stream(input: ModelRequest): AsyncIterable<ModelResponseEvent>;
}
