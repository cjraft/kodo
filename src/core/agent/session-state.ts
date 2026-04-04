import { createId } from "../../lib/id.js";
import { SessionStore } from "../session/store.js";
import type {
  Message,
  SessionMeta,
  SessionSnapshot,
  ToolCallRecord
} from "../session/types.js";
import type { AgentSessionView } from "./types.js";

/**
 * Restores compatibility details that older stored sessions may not contain,
 * while keeping persistence formats independent from current runtime defaults.
 */
const normalizeSession = (
  session: SessionSnapshot,
  providerName: string
): SessionSnapshot => ({
  meta: {
    ...session.meta,
    provider: providerName
  },
  messages: session.messages.map((message) => ({
    ...message,
    reasoning:
      message.reasoning ||
      (message.role === "assistant" && (message.toolCalls?.length ?? 0) > 0
        ? "Tool planning completed."
        : undefined)
  })),
  toolCalls: session.toolCalls.map((toolCall) => ({ ...toolCall }))
});

/**
 * Returns a defensive copy so callers cannot mutate the in-memory session state.
 */
const cloneSession = (session: SessionSnapshot): AgentSessionView => ({
  meta: { ...session.meta },
  messages: session.messages.map((message) => ({ ...message })),
  toolCalls: session.toolCalls.map((toolCall) => ({ ...toolCall }))
});

/**
 * Owns the loaded session snapshot and coordinates persistence with the store.
 */
export class AgentSessionState {
  private session: SessionSnapshot | null = null;

  constructor(
    private readonly store: SessionStore,
    private readonly cwd: string,
    private readonly providerName: string
  ) {}

  /**
   * Creates a brand-new empty session and persists its metadata immediately.
   */
  async create() {
    const now = new Date().toISOString();
    const meta: SessionMeta = {
      id: createId(),
      cwd: this.cwd,
      createdAt: now,
      updatedAt: now,
      provider: this.providerName
    };

    await this.store.create(meta);
    this.session = { meta, messages: [], toolCalls: [] };
    return cloneSession(this.session);
  }

  /**
   * Loads a persisted session and normalizes it for the current runtime.
   */
  async load(sessionId: string) {
    const restored = await this.store.load(sessionId);

    if (!restored) {
      throw new Error(`Session ${sessionId} not found.`);
    }

    this.session = normalizeSession(restored, this.providerName);
    await this.store.saveMeta(this.session.meta);
    return cloneSession(this.session);
  }

  /**
   * Reuses the latest persisted session when available, otherwise creates one.
   */
  async loadLatestOrCreate() {
    const restored = await this.store.loadLatest();

    if (restored) {
      this.session = normalizeSession(restored, this.providerName);
      await this.store.saveMeta(this.session.meta);
      return cloneSession(this.session);
    }

    return this.create();
  }

  /**
   * Returns a read-only clone of the active session.
   */
  read(sessionId?: string) {
    if (!this.session) {
      return null;
    }

    if (sessionId && this.session.meta.id !== sessionId) {
      return null;
    }

    return cloneSession(this.session);
  }

  /**
   * Returns the active session id without exposing the full mutable snapshot.
   */
  currentSessionId() {
    return this.session?.meta.id ?? null;
  }

  /**
   * Returns the live mutable snapshot for internal agent modules only.
   */
  snapshot(sessionId?: string) {
    if (!this.session) {
      throw new Error("Agent runtime is not initialized");
    }

    if (sessionId && this.session.meta.id !== sessionId) {
      throw new Error(`Session ${sessionId} is not loaded`);
    }

    return this.session;
  }

  /**
   * Appends a transcript message and keeps session recency metadata in sync.
   */
  async appendMessage(message: Message, sessionId?: string) {
    const session = this.snapshot(sessionId);
    session.messages.push(message);
    session.meta.updatedAt = message.createdAt;
    await this.store.appendMessage(session.meta.id, message);
    await this.store.saveMeta(session.meta);
  }

  /**
   * Appends a tool call record and refreshes session recency metadata.
   */
  async appendToolCall(toolCall: ToolCallRecord, sessionId?: string) {
    const session = this.snapshot(sessionId);
    session.toolCalls.push(toolCall);
    session.meta.updatedAt = new Date().toISOString();
    await this.store.appendToolCall(session.meta.id, toolCall);
    await this.store.saveMeta(session.meta);
  }
}
