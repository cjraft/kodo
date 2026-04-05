import React, { useState } from "react";
import { Box, Text, useApp, useInput, useStdout } from "ink";
import type { AgentService } from "../core/agent/types.js";
import { useAgent } from "./hooks/use-agent.js";
import type { AppShellInfo } from "./shell-info.js";
import { CommandComposer } from "./components/CommandComposer.js";
import { ConversationFeed } from "./components/ConversationFeed.js";
import { FocusHeader } from "./components/FocusHeader.js";
import { OpsDrawer } from "./components/OpsDrawer.js";
import { Panel } from "./components/Panel.js";
import { ThinkingIndicator } from "./components/ThinkingIndicator.js";
import { getPhaseLabel } from "./launch-screen.js";
import { useTheme } from "./theme-context.js";

interface AppProps {
  agent: AgentService;
  sessionId?: string;
  shell: AppShellInfo;
}

export function App({ agent, sessionId, shell }: AppProps) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const theme = useTheme();
  const stdoutWidth = stdout.columns ?? 120;
  const stdoutHeight = stdout.rows ?? 36;
  const [input, setInput] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const {
    ready,
    busy,
    runPhase,
    activeToolName,
    session,
    messages,
    toolCalls,
    resume,
    run
  } = useAgent(agent, sessionId);
  const compactLayout = stdoutWidth < 118;
  const phaseLabel = getPhaseLabel(busy, runPhase);
  const activePhaseId = busy ? runPhase : "idle";
  const recentToolCalls = toolCalls.slice(-4).reverse();
  const reservedRows =
    13 +
    (busy ? 4 : 0) +
    (detailsOpen ? 10 : 0) +
    (helpOpen ? 8 : 0);
  const conversationRows = Math.max(6, stdoutHeight - reservedRows);
  const busyLabel =
    runPhase === "tool-running"
      ? `Running ${activeToolName ?? "tool"}...`
      : runPhase === "streaming"
        ? "Streaming response..."
        : runPhase === "thinking"
          ? "Thinking..."
          : "Initializing...";

  useInput((character, key) => {
    if (!key.escape) {
      if (busy || !ready) {
        return;
      }

      if (key.return) {
        void handleSubmit(input);
        return;
      }

      if (key.backspace || key.delete) {
        setInput((current) => current.slice(0, -1));
        return;
      }

      if (key.ctrl && character.toLowerCase() === "c") {
        exit();
        return;
      }

      if (!key.ctrl && !key.meta && character) {
        setInput((current) => current + character);
      }

      return;
    }

    setDetailsOpen(false);
    setHelpOpen(false);
  });

  const handleSubmit = async (value: string) => {
    const trimmed = value.trim();

    if (!trimmed) {
      return;
    }

    if (trimmed === "/exit") {
      exit();
      return;
    }

    if (trimmed === "/details") {
      setInput("");
      setDetailsOpen((current) => !current);
      return;
    }

    if (trimmed === "/help") {
      setInput("");
      setHelpOpen((current) => !current);
      return;
    }

    if (trimmed === "/focus") {
      setInput("");
      setDetailsOpen(false);
      setHelpOpen(false);
      return;
    }

    if (trimmed.startsWith("/resume")) {
      setInput("");
      await resume(trimmed.slice("/resume".length).trim() || undefined);
      return;
    }

    setInput("");
    await run(trimmed);
  };

  return (
    <Box flexDirection="column" paddingX={1} paddingY={0}>
      <FocusHeader
        compactLayout={stdoutWidth < 88}
        shell={shell}
      />

      {busy ? (
        <Box marginTop={1} paddingX={1}>
          <Text color={theme.accentColor}>
            live signal :: {phaseLabel}
            {runPhase === "tool-running"
              ? ` -> ${activeToolName ?? "tool"}`
              : runPhase === "streaming"
                ? " -> response stream"
                : " -> model loop"}
          </Text>
        </Box>
      ) : null}

      {detailsOpen ? (
        <Box marginTop={1}>
          <OpsDrawer
            compactLayout={compactLayout}
            busy={busy}
            phaseLabel={phaseLabel}
            activePhaseId={activePhaseId}
            activeToolName={activeToolName}
            messagesCount={messages.length}
            toolCallsCount={toolCalls.length}
            session={session}
            recentToolCalls={recentToolCalls}
          />
        </Box>
      ) : null}

      {helpOpen ? (
        <Box marginTop={1}>
          <Panel
            title="Command Reference"
            eyebrow="LOW-FRICTION HELP"
          >
            <Text>
              <Text color={theme.accentColor}>/details</Text> toggle the ops drawer without
              leaving the prompt flow
            </Text>
            <Text>
              <Text color={theme.accentColor}>/help</Text> open or close this compact
              command reference
            </Text>
            <Text>
              <Text color={theme.accentColor}>/focus</Text> close drawers and return
              to the main session stream
            </Text>
            <Text color={theme.mutedColor}>
              Press <Text color={theme.accentColor}>Esc</Text> to close drawers
              instantly.
            </Text>
          </Panel>
        </Box>
      ) : null}

      <ConversationFeed
        width={stdoutWidth}
        maxRows={conversationRows}
        compactLayout={compactLayout}
        messages={messages}
        toolCalls={toolCalls}
      />

      <CommandComposer
        width={stdoutWidth}
        ready={ready}
        busy={busy}
        input={input}
        busyLabel={busyLabel}
      />

      {busy ? (
        <Box marginTop={1}>
          {runPhase === "thinking" || runPhase === "tool-running" ? (
            <ThinkingIndicator label={busyLabel} color={theme.accentColor} />
          ) : (
            <Text color={theme.mutedColor}>Streaming response packets...</Text>
          )}
        </Box>
      ) : null}
    </Box>
  );
}
