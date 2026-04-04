import type { ContextBuilder } from "../context/builder.js";
import type { LlmClient } from "../llm/types.js";
import { SessionStore } from "../session/store.js";
import { ToolRegistry } from "../tools/registry.js";
import { AgentEventBus } from "./event-bus.js";
import { AgentRunExecutor } from "./run-executor.js";
import { AgentSessionState } from "./session-state.js";
import type {
  AgentLoopConfig,
  AgentSession,
  AgentSessionView
} from "./types.js";

type SessionInitializationMode =
  | { type: "create" }
  | { type: "load"; sessionId: string }
  | { type: "latest" };

/**
 * Concrete collaborators required for one live session runtime.
 */
export interface AgentSessionRuntimeOptions {
  cwd: string;
  store: SessionStore;
  tools: ToolRegistry;
  llm: LlmClient;
  loop: AgentLoopConfig;
  contextBuilder: ContextBuilder;
  mode: SessionInitializationMode;
}

/**
 * Session-scoped runtime that owns event delivery and delegates execution to
 * the run executor while keeping persistence in the session state module.
 */
export class AgentSessionRuntime implements AgentSession {
  private readonly sessionState: AgentSessionState;
  private readonly events = new AgentEventBus();
  private readonly executor: AgentRunExecutor;

  constructor(private readonly options: AgentSessionRuntimeOptions) {
    this.sessionState = new AgentSessionState(
      options.store,
      options.cwd,
      options.llm.name
    );
    this.executor = new AgentRunExecutor({
      llm: options.llm,
      tools: options.tools,
      loop: options.loop,
      events: this.events,
      sessionState: this.sessionState,
      contextBuilder: options.contextBuilder
    });
  }

  /**
   * Exposes the active session id only after initialization has completed.
   */
  get id() {
    const sessionId = this.sessionState.currentSessionId();

    if (!sessionId) {
      throw new Error("Agent session is not initialized");
    }

    return sessionId;
  }

  /**
   * Materializes the session according to the selected startup mode.
   */
  async initialize(): Promise<AgentSessionView> {
    if (this.options.mode.type === "create") {
      return this.sessionState.create();
    }

    if (this.options.mode.type === "load") {
      return this.sessionState.load(this.options.mode.sessionId);
    }

    return this.sessionState.loadLatestOrCreate();
  }

  /**
   * Returns a defensive snapshot of the currently loaded session.
   */
  read() {
    return this.sessionState.read(this.id);
  }

  /**
   * Subscribes to run-scoped events emitted from this session runtime.
   */
  subscribe(listener: Parameters<AgentEventBus["subscribe"]>[0]) {
    return this.events.subscribe(listener);
  }

  /**
   * Starts a new agent run against the loaded session transcript.
   */
  run(input: string) {
    return this.executor.run(input, this.id);
  }
}
