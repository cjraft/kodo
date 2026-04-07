import type { AgentListener, AgentSession, AgentSessionView } from "../agent/types.js";
import { SessionStore } from "../session/store.js";
import type { Message, SessionMeta, SessionSnapshot, ToolCallRecord } from "../session/types.js";

export interface ReplayPlaybackState {
  step: number;
  totalSteps: number;
}

export interface ReplaySessionSummary extends SessionMeta {
  firstUserInput: string | null;
  messageCount: number;
}

const cloneMessages = (messages: Message[]) => messages.map((message) => ({ ...message }));
const cloneToolCalls = (toolCalls: ToolCallRecord[]) => toolCalls.map((toolCall) => ({ ...toolCall }));

const cloneSessionView = (session: AgentSessionView): AgentSessionView => ({
  meta: { ...session.meta },
  messages: cloneMessages(session.messages),
  toolCalls: cloneToolCalls(session.toolCalls),
});

const toTimestamp = (value: string) => {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
};

const findFirstUserInput = (messages: Message[]) =>
  messages.find((message) => message.role === "user")?.text ?? null;

const createReplaySessionView = (session: SessionSnapshot, step: number): AgentSessionView => {
  const safeStep = Math.max(0, Math.min(step, session.messages.length));
  const messages = cloneMessages(session.messages.slice(0, safeStep));
  const lastVisibleMessage = session.messages[safeStep - 1];
  const cutoffTimestamp = lastVisibleMessage ? toTimestamp(lastVisibleMessage.createdAt) : -Infinity;
  const toolCalls = cloneToolCalls(
    session.toolCalls.filter((toolCall) => toTimestamp(toolCall.createdAt) <= cutoffTimestamp),
  );

  return {
    meta: { ...session.meta },
    messages,
    toolCalls,
  };
};

/**
 * Read-only session implementation that reconstructs historical transcript
 * states directly from persisted messages without mutating stored session data.
 */
export class ReplaySession implements AgentSession {
  private readonly listeners = new Set<AgentListener>();
  private step: number;

  constructor(private readonly snapshot: SessionSnapshot, initialStep = Math.min(1, snapshot.messages.length)) {
    this.step = Math.max(0, Math.min(initialStep, snapshot.messages.length));
  }

  get id() {
    return this.snapshot.meta.id;
  }

  read() {
    return cloneSessionView(createReplaySessionView(this.snapshot, this.step));
  }

  subscribe(listener: AgentListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async run() {
    throw new Error("Replay mode is read-only.");
  }

  getPlaybackState(): ReplayPlaybackState {
    return {
      step: this.step,
      totalSteps: this.snapshot.messages.length,
    };
  }

  stepForward() {
    return this.updateStep(this.step + 1);
  }

  stepBackward() {
    return this.updateStep(this.step - 1);
  }

  private updateStep(nextStep: number) {
    const boundedStep = Math.max(0, Math.min(nextStep, this.snapshot.messages.length));

    if (boundedStep === this.step) {
      return this.getPlaybackState();
    }

    this.step = boundedStep;
    const playbackState = this.getPlaybackState();

    for (const listener of this.listeners) {
      listener({
        type: "status",
        sessionId: this.id,
        runId: "replay",
        text: `Replay ${playbackState.step}/${playbackState.totalSteps}`,
      });
    }

    return playbackState;
  }
}

/**
 * Replay-specific session loader that derives picker metadata and read-only
 * replay sessions from persisted `.kodo/sessions` snapshots.
 */
export class ReplayRuntime {
  constructor(private readonly store: SessionStore) {}

  listSessions() {
    return this.store.listMetas();
  }

  async listReplaySessions(): Promise<ReplaySessionSummary[]> {
    const metas = await this.store.listMetas();
    const sessions = await Promise.all(
      metas.map(async (meta) => {
        const snapshot = await this.store.load(meta.id);

        return {
          ...meta,
          firstUserInput: findFirstUserInput(snapshot?.messages ?? []),
          messageCount: snapshot?.messages.length ?? 0,
        } satisfies ReplaySessionSummary;
      }),
    );

    return sessions;
  }

  async loadSession(sessionId: string) {
    const snapshot = await this.store.load(sessionId);

    if (!snapshot) {
      throw new Error(`Session ${sessionId} not found.`);
    }

    return new ReplaySession(snapshot);
  }
}
