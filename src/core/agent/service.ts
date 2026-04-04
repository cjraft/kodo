import type { ContextBuilder } from "../context/builder.js";
import type { LlmClient } from "../llm/types.js";
import { SessionStore } from "../session/store.js";
import { ToolRegistry } from "../tools/registry.js";
import { AgentSessionRuntime } from "./session-runtime.js";
import type { AgentLoopConfig, AgentService } from "./types.js";

/**
 * Runtime dependencies assembled during bootstrap. The agent layer consumes
 * typed collaborators instead of reading config or env directly.
 */
export interface AgentRuntimeOptions {
  cwd: string;
  store: SessionStore;
  tools: ToolRegistry;
  llm: LlmClient;
  loop: AgentLoopConfig;
  contextBuilder: ContextBuilder;
}

/**
 * Root agent service responsible for creating session runtimes on demand.
 */
export class AgentRuntime implements AgentService {
  constructor(private readonly options: AgentRuntimeOptions) {}

  /**
   * Starts a brand-new persisted session.
   */
  async createSession() {
    const session = new AgentSessionRuntime({
      ...this.options,
      mode: { type: "create" }
    });
    await session.initialize();
    return session;
  }

  /**
   * Restores a previously persisted session by id.
   */
  async loadSession(sessionId: string) {
    const session = new AgentSessionRuntime({
      ...this.options,
      mode: { type: "load", sessionId }
    });
    await session.initialize();
    return session;
  }

  /**
   * Reopens the most recent session, or creates a new one if none exists yet.
   */
  async loadLatestSession() {
    const session = new AgentSessionRuntime({
      ...this.options,
      mode: { type: "latest" }
    });
    await session.initialize();
    return session;
  }

  /**
   * Lists available session metadata without hydrating their full transcripts.
   */
  listSessions() {
    return this.options.store.listMetas();
  }
}
