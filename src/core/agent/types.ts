import type { Message, SessionSnapshot, ToolCallRecord } from "../session/types.js";

/**
 * Controls how many model -> tool -> model turns a single run may perform
 * before the agent stops and writes a forced summary.
 */
export interface AgentLoopConfig {
  maxToolIterations: number;
}

/**
 * Immutable read model exposed to the UI so it can render a session without
 * mutating the in-memory runtime state.
 */
export interface AgentSessionView {
  meta: SessionSnapshot["meta"];
  messages: Message[];
  toolCalls: ToolCallRecord[];
}

/**
 * Session-scoped API used by the UI layer. It exposes lifecycle operations and
 * read-only projection methods, but keeps execution details inside the agent layer.
 */
export interface AgentSession {
  id: string;
  read(): AgentSessionView | null;
  subscribe(listener: AgentListener): () => void;
  run(input: string): Promise<void>;
}

/**
 * Normalized runtime events emitted during a run. Every event is session-scoped
 * and run-scoped so the UI can bind to stable state transitions.
 */
export type AgentEvent =
  | { type: "run-start"; sessionId: string; runId: string }
  | { type: "status"; sessionId: string; runId: string; text: string }
  | { type: "text-delta"; sessionId: string; runId: string; text: string }
  | {
      type: "tool-start";
      sessionId: string;
      runId: string;
      toolName: string;
      input: unknown;
    }
  | {
      type: "tool-end";
      sessionId: string;
      runId: string;
      toolName: string;
      output: unknown;
      isError: boolean;
    }
  | { type: "error"; sessionId: string; runId: string; message: string }
  | { type: "done"; sessionId: string; runId: string };

export type AgentListener = (event: AgentEvent) => void;
