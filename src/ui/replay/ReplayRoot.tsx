import React, { useEffect, useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import { App } from "../App.js";
import type { AppShellInfo } from "../app/shell.js";
import { Panel } from "../components/Panel.js";
import { createMessageSnippet } from "../transcript/model.js";
import { useTheme } from "../theme/context.js";
import type { ReplayRuntime, ReplaySessionSummary } from "../../core/replay/runtime.js";

interface ReplayRootProps {
  runtime: ReplayRuntime;
  shell: AppShellInfo;
}

const formatReplayTimestamp = (value: string) => {
  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return "--";
  }

  return new Date(timestamp).toISOString().slice(0, 16).replace("T", " ");
};

/**
 * Replay bootstrap surface that lets the user pick a stored session before
 * entering the regular transcript shell in read-only step-through mode.
 */
export function ReplayRoot({ runtime, shell }: ReplayRootProps) {
  const theme = useTheme();
  const { exit } = useApp();
  const [sessions, setSessions] = useState<ReplaySessionSummary[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<Awaited<
    ReturnType<ReplayRuntime["loadSession"]>
  > | null>(null);
  const [playbackState, setPlaybackState] = useState<{ step: number; totalSteps: number } | null>(null);

  useEffect(() => {
    let active = true;

    const loadSessions = async () => {
      try {
        const nextSessions = await runtime.listReplaySessions();

        if (!active) {
          return;
        }

        setSessions(nextSessions);
        setSelectedIndex(0);
        setError(null);
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : String(loadError));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadSessions();

    return () => {
      active = false;
    };
  }, [runtime]);

  const loadSelectedSession = async () => {
    const target = sessions[selectedIndex];

    if (!target) {
      return;
    }

    try {
      const session = await runtime.loadSession(target.id);
      setSelectedSessionId(target.id);
      setSelectedSession(session);
      setPlaybackState(session.getPlaybackState());
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    }
  };

  useInput((character, key) => {
    if (key.ctrl && character?.toLowerCase() === "c") {
      exit();
      return;
    }

    if (selectedSession) {
      return;
    }

    if (key.upArrow || character === "k" || character === "K") {
      setSelectedIndex((current) => Math.max(0, current - 1));
      return;
    }

    if (key.downArrow || character === "j" || character === "J") {
      setSelectedIndex((current) => Math.min(Math.max(0, sessions.length - 1), current + 1));
      return;
    }

    if (key.return) {
      void loadSelectedSession();
    }
  });

  if (selectedSession && playbackState) {
    return (
      <App
        key={selectedSessionId ?? selectedSession.id}
        initialSession={selectedSession}
        shell={{
          ...shell,
          directoryLabel: selectedSession.read()?.meta.cwd ?? shell.directoryLabel,
          modelLabel: `replay debugger · ${selectedSession.read()?.meta.provider ?? "unknown"}`,
          hintLabel: "j/k to step · Ctrl+O to expand",
        }}
        mode={{
          type: "replay",
          step: playbackState.step,
          totalSteps: playbackState.totalSteps,
          stepBackward: () => {
            setPlaybackState(selectedSession.stepBackward());
          },
          stepForward: () => {
            setPlaybackState(selectedSession.stepForward());
          },
        }}
      />
    );
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      <Panel title="Replay Session Picker" eyebrow="DEBUG REPLAY">
        <Text color={theme.mutedColor}>
          Use <Text color={theme.accentColor}>j/k</Text> or arrow keys to choose a session, then
          press <Text color={theme.accentColor}>Enter</Text>.
        </Text>
        {loading ? <Text color={theme.mutedColor}>Loading sessions...</Text> : null}
        {error ? <Text color={theme.errorColor}>{error}</Text> : null}
        {!loading && sessions.length === 0 ? (
          <Text color={theme.mutedColor}>No stored sessions found under `.kodo/sessions`.</Text>
        ) : null}
        <Box marginTop={1} flexDirection="column">
          {sessions.map((session, index) => {
            const selected = index === selectedIndex;
            const label = session.firstUserInput
              ? createMessageSnippet(
                  {
                    id: `preview:${session.id}`,
                    role: "user",
                    text: session.firstUserInput,
                    createdAt: session.createdAt,
                  },
                  96,
                )
              : "(no user input)";

            return (
              <Box key={session.id} marginBottom={1} flexDirection="column">
                <Text color={selected ? theme.accentColor : "white"}>
                  {selected ? ">" : " "} {label}
                </Text>
                <Text color={theme.mutedColor}>
                  {session.id.slice(0, 8)} · {session.messageCount} messages · updated{" "}
                  {formatReplayTimestamp(session.updatedAt)}
                </Text>
              </Box>
            );
          })}
        </Box>
      </Panel>
    </Box>
  );
}
