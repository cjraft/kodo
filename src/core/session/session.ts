import type { ContextBuilder } from "../context/builder.js";
import type { LlmClient } from "../llm/types.js";
import { SessionStore } from "./store.js";
import { ToolRegistry } from "../tools/registry.js";
import { AgentEventBus } from "../agent/event-bus.js";
import { AgentExecutor } from "../agent/executor.js";
import type { AgentLoopConfig, AgentSessionView } from "../agent/types.js";
import { AgentSessionState } from "./state.js";
import type { AgentSession as AgentSessionContract } from "../agent/types.js";

type SessionInitializationMode =
  | { type: "create" }
  | { type: "load"; sessionId: string }
  | { type: "latest" };

/**
 * Concrete collaborators required for one live session runtime.
 */
export interface AgentSessionOptions {
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
 * the executor while keeping persistence in the session state module.
 */
export class AgentSession implements AgentSessionContract {
  private readonly sessionState: AgentSessionState;
  private readonly events = new AgentEventBus();
  private readonly executor: AgentExecutor;

  constructor(private readonly options: AgentSessionOptions) {
    this.sessionState = new AgentSessionState(options.store, options.cwd, options.llm.name);
    this.executor = new AgentExecutor({
      llm: options.llm,
      tools: options.tools,
      loop: options.loop,
      events: this.events,
      sessionState: this.sessionState,
      contextBuilder: options.contextBuilder,
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
