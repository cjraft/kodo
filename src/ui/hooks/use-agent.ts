import { useEffect, useRef, useState } from "react";
import type { AgentEvent, AgentSession, AgentSessionView } from "../../core/agent/types.js";
import type { AgentRuntime } from "../../core/agent/runtime.js";
import type { SessionMeta } from "../../core/session/types.js";

type RunPhase = "idle" | "thinking" | "streaming" | "tool-running";

/**
 * Builds a short human-readable status line for session lifecycle transitions.
 */
const buildSessionStatus = (
  session: AgentSessionView,
  action: "started" | "loaded" | "resumed" = "loaded",
) => `Session ${session.meta.id.slice(0, 8)} ${action}`;

const findResumeTarget = (
  sessions: SessionMeta[],
  currentSessionId: string | null,
  query?: string,
) => {
  const normalizedQuery = query?.trim();

  if (!normalizedQuery) {
    const previousSession = sessions.find((meta) => meta.id !== currentSessionId);

    if (!previousSession) {
      throw new Error("No previous sessions available.");
    }

    return previousSession.id;
  }

  const matches = sessions.filter(
    (meta) => meta.id === normalizedQuery || meta.id.startsWith(normalizedQuery),
  );

  if (matches.length === 0) {
    throw new Error(`Session ${normalizedQuery} not found.`);
  }

  if (matches.length > 1) {
    throw new Error(`Multiple sessions match ${normalizedQuery}. Use a longer id prefix.`);
  }

  return matches[0].id;
};

/**
 * React-facing adapter for the agent service. It translates session events into
 * stable UI state, including optimistic streaming text while a run is active.
 */
export const useAgent = (agent: AgentRuntime, sessionId?: string) => {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [runPhase, setRunPhase] = useState<RunPhase>("idle");
  const [activeToolName, setActiveToolName] = useState<string | null>(null);
  const [status, setStatus] = useState("Booting...");
  const [session, setSession] = useState<AgentSessionView | null>(null);
  const [activeSession, setActiveSession] = useState<AgentSession | null>(null);
  const [streamingText, setStreamingText] = useState("");
  const mountedRef = useRef(true);
  const unsubscribeRef = useRef<() => void>(() => {});
  const streamingMessageCreatedAtRef = useRef<string | null>(null);

  /**
   * Rebinds the hook to a specific session and resets transient run state.
   */
  const bindSession = (nextSession: AgentSession, action: "started" | "loaded" | "resumed") => {
    unsubscribeRef.current();

    // Only refreshes the session view from the store — does not touch run state.
    const refreshSessionView = () => {
      if (!mountedRef.current) return;
      const snapshot = nextSession.read();
      if (snapshot) setSession(snapshot);
    };

    const handleEvent = (event: AgentEvent) => {
      if (!mountedRef.current) return;

      if (event.type === "status") {
        setStatus(event.text);
      }

      if (event.type === "run-start") {
        streamingMessageCreatedAtRef.current = null;
        setStreamingText("");
        refreshSessionView();
      }

      if (event.type === "text-delta") {
        if (!streamingMessageCreatedAtRef.current) {
          streamingMessageCreatedAtRef.current = new Date().toISOString();
        }
        setRunPhase("streaming");
        setStreamingText((current) => current + event.text);
      }

      if (event.type === "tool-start") {
        streamingMessageCreatedAtRef.current = null;
        setStreamingText("");
        setRunPhase("tool-running");
        setActiveToolName(event.toolName);
        setStatus(`Running ${event.toolName}...`);
        refreshSessionView();
      }

      if (event.type === "tool-end") {
        // LLM resumes thinking after processing tool results.
        setRunPhase("thinking");
        setActiveToolName(null);
        setStatus(event.isError ? `${event.toolName} failed` : `${event.toolName} completed`);
        refreshSessionView();
      }

      if (event.type === "done") {
        setBusy(false);
        setRunPhase("idle");
        setActiveToolName(null);
        streamingMessageCreatedAtRef.current = null;
        setStreamingText("");
        refreshSessionView();
      }

      if (event.type === "error") {
        setBusy(false);
        setRunPhase("idle");
        setActiveToolName(null);
        streamingMessageCreatedAtRef.current = null;
        setStreamingText("");
        setStatus(`Run failed: ${event.message}`);
      }
    };

    unsubscribeRef.current = nextSession.subscribe(handleEvent);
    setActiveSession(nextSession);
    setBusy(false);
    setRunPhase("idle");
    setActiveToolName(null);
    streamingMessageCreatedAtRef.current = null;
    setStreamingText("");

    const snapshot = nextSession.read();
    if (snapshot && mountedRef.current) {
      setSession(snapshot);
      setStatus(buildSessionStatus(snapshot, action));
    }

    setReady(true);
  };

  useEffect(
    () => () => {
      mountedRef.current = false;
      unsubscribeRef.current();
    },
    [],
  );

  useEffect(() => {
    setReady(false);
    let active = true;

    const loadSession = async () => {
      const nextSession = sessionId
        ? await agent.loadSession(sessionId)
        : await agent.createSession();

      if (!active) {
        return;
      }

      bindSession(nextSession, sessionId ? "loaded" : "started");
    };

    loadSession().catch((error: Error) => {
      if (!active || !mountedRef.current) {
        return;
      }

      setStatus(`Failed to initialize: ${error.message}`);
    });

    return () => {
      active = false;
      unsubscribeRef.current();
      unsubscribeRef.current = () => {};
    };
  }, [agent, sessionId]);

  const messages = session?.messages ?? [];
  const visibleMessages =
    streamingText && messages.at(-1)?.role !== "assistant"
      ? [
          ...messages,
          {
            id: "streaming-assistant",
            role: "assistant" as const,
            text: streamingText,
            createdAt: streamingMessageCreatedAtRef.current ?? new Date().toISOString(),
          },
        ]
      : messages;

  return {
    ready,
    busy,
    runPhase,
    activeToolName,
    status,
    sessionId: activeSession?.id ?? null,
    session,
    messages: visibleMessages,
    toolCalls: session?.toolCalls ?? [],
    resume: async (query?: string) => {
      try {
        setStatus("Resolving session...");
        const sessions = await agent.listSessions();
        const targetSessionId = findResumeTarget(sessions, activeSession?.id ?? null, query);
        const nextSession = await agent.loadSession(targetSessionId);
        bindSession(nextSession, "resumed");
      } catch (error) {
        setStatus(`Resume failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
    run: (input: string) => {
      if (!activeSession) {
        throw new Error("Agent session is not ready.");
      }

      setBusy(true);
      setRunPhase("thinking");
      setActiveToolName(null);
      return activeSession.run(input);
    },
  };
};
