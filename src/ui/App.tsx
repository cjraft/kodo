import React, { useState } from "react";
import { Box, useApp } from "ink";
import type { AgentRuntime } from "../core/agent/runtime.js";
import { resolveExpandedOutputState } from "./app/expanded-output.js";
import { resolveAppLayout } from "./app/layout.js";
import { useAppPanels } from "./app/panels.js";
import type { AppShellInfo } from "./app/shell.js";
import { CommandComposer } from "./components/CommandComposer.js";
import { CommandHelpPanel } from "./components/CommandHelpPanel.js";
import { CommandNotice } from "./components/CommandNotice.js";
import { ConversationFeed } from "./components/ConversationFeed/index.js";
import { ExpandedContentPanel } from "./components/ExpandedContentPanel/index.js";
import { ExpandHint } from "./components/ExpandHint.js";
import { FocusHeader } from "./components/FocusHeader.js";
import { ThinkingIndicator } from "./components/ThinkingIndicator.js";
import { useAgent } from "./hooks/use-agent.js";
import { useAppCommands } from "./hooks/use-app-commands.js";
import { useAppInput } from "./hooks/use-app-input.js";
import { useTerminalViewport } from "./hooks/use-terminal-viewport.js";

interface AppProps {
  agent: AgentRuntime;
  sessionId?: string;
  shell: AppShellInfo;
}

export function App({ agent, sessionId, shell }: AppProps) {
  // Shell runtime.
  const { exit } = useApp();
  const viewport = useTerminalViewport();

  // Prompt composer state.
  const [input, setInput] = useState("");

  // Agent session state.
  const { ready, busy, runPhase, activeToolName, messages, toolCalls, resume, run } = useAgent(
    agent,
    sessionId,
  );

  // Expanded-output affordance state.
  const availableExpandedOutput = resolveExpandedOutputState({
    messages,
    toolCalls,
    width: viewport.width,
    expandedOutputOpen: false,
  });
  const { helpPanelOpen, expandedOutputOpen, closePanels, toggleHelpPanel, toggleExpandedOutput } =
    useAppPanels({
      canOpenExpandedOutput: availableExpandedOutput.hasExpandableOutput,
    });

  const expandedOutput = resolveExpandedOutputState({
    messages,
    toolCalls,
    width: viewport.width,
    expandedOutputOpen,
  });

  // Slash commands.
  const { commands, commandMessage, clearCommandMessage, handleCommand } = useAppCommands({
    exit,
    toggleHelp: toggleHelpPanel,
    focusTranscript: closePanels,
    resume: async (query?: string) => {
      closePanels();
      await resume(query);
    },
  });

  // Derived shell view model.
  const layout = resolveAppLayout({
    stdoutWidth: viewport.width,
    stdoutHeight: viewport.height,
    busy,
    commandMessageVisible: Boolean(commandMessage),
    helpOpen: helpPanelOpen,
    expandHintVisible: expandedOutput.expandHintVisible,
  });
  const { headerCompactLayout, conversationRows } = layout;

  const handleSubmit = async (value: string) => {
    const trimmed = value.trim();

    if (!trimmed) {
      return;
    }

    setInput("");

    if (await handleCommand(trimmed)) {
      return;
    }

    clearCommandMessage();
    await run(trimmed);
  };

  useAppInput({
    ready,
    busy,
    input,
    setInput,
    exit,
    submit: (value) => {
      void handleSubmit(value);
    },
    closePanels,
    hasExpandableOutput: expandedOutput.hasExpandableOutput,
    toggleExpandedOutput,
    expandedOutputOpen: expandedOutput.expandedOutputOpen,
  });

  if (expandedOutput.expandedOutputOpen && expandedOutput.latestExpandableOutput) {
    return <ExpandedContentPanel entry={expandedOutput.latestExpandableOutput} />;
  }

  return (
    <Box flexDirection="column" paddingX={1} paddingY={0}>
      <FocusHeader compactLayout={headerCompactLayout} shell={shell} />
      <CommandNotice message={commandMessage} />
      <ConversationFeed maxRows={conversationRows} messages={messages} toolCalls={toolCalls} />
      <ExpandHint
        hasExpandableOutput={expandedOutput.hasExpandableOutput}
        expandedOutputOpen={expandedOutput.expandedOutputOpen}
      />
      <CommandHelpPanel open={helpPanelOpen} commands={commands} />
      <ThinkingIndicator busy={busy} runPhase={runPhase} activeToolName={activeToolName} />
      <CommandComposer
        ready={ready}
        busy={busy}
        input={input}
        runPhase={runPhase}
        activeToolName={activeToolName}
      />
    </Box>
  );
}
