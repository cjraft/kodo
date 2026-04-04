import React, { useState } from "react";
import { Box, Text, useApp } from "ink";
import TextInput from "ink-text-input";
import type { AgentService } from "../core/agent/types.js";
import type { ToolCallRecord } from "../core/session/types.js";
import { useAgent } from "./hooks/use-agent.js";
import { ThinkingIndicator } from "./components/ThinkingIndicator.js";

const toolCallToText = (toolCall: ToolCallRecord) =>
  `${toolCall.toolName} ${toolCall.isError ? "failed" : "completed"}`;

interface AppProps {
  agent: AgentService;
  sessionId?: string;
}

export function App({ agent, sessionId }: AppProps) {
  const { exit } = useApp();
  const [input, setInput] = useState("");
  const {
    ready,
    busy,
    runPhase,
    activeToolName,
    status,
    session,
    messages,
    toolCalls,
    resume,
    run
  } = useAgent(agent, sessionId);

  const handleSubmit = async (value: string) => {
    const trimmed = value.trim();

    if (!trimmed) {
      return;
    }

    if (trimmed === "/exit") {
      exit();
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
    <Box flexDirection="column" padding={1}>
      <Text bold>Kodo</Text>
      <Text color="gray">
        {session
          ? `cwd=${session.meta.cwd} provider=${session.meta.provider}`
          : "loading..."}
      </Text>
      <Text
        color={
          status.startsWith("Run failed:") || status.startsWith("Resume failed:")
            ? "red"
            : "cyan"
        }
      >
        {status}
      </Text>
      <Box flexDirection="column" marginTop={1}>
        {messages.slice(-12).map((message) => (
          <Box key={message.id} marginBottom={1}>
            <Text
              color={
                message.role === "user"
                  ? "green"
                  : message.role === "assistant"
                    ? "yellow"
                    : "white"
              }
            >
              {message.role}
              {">"} {message.text}
            </Text>
          </Box>
        ))}
      </Box>
      <Box flexDirection="column" marginTop={1}>
        <Text bold>Recent Tools</Text>
        {toolCalls.length === 0 ? (
          <Text color="gray">No tool calls yet</Text>
        ) : (
          toolCalls.slice(-5).map((toolCall) => (
            <Text key={toolCall.id} color="magenta">
              {toolCallToText(toolCall)}
            </Text>
          ))
        )}
      </Box>
      <Box marginTop={1}>
        <Text color="green">{"> "}</Text>
        {busy ? (
          runPhase === "thinking" ? (
            <ThinkingIndicator />
          ) : runPhase === "tool-running" ? (
            <ThinkingIndicator label={`Running ${activeToolName ?? "tool"}...`} />
          ) : (
            <Text color="gray">Streaming response...</Text>
          )
        ) : ready ? (
          <TextInput
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
          />
        ) : (
          <Text color="gray">Initializing...</Text>
        )}
      </Box>
      <Box marginTop={1}>
        <Text color="gray">Use /resume [session-id] or /exit</Text>
      </Box>
    </Box>
  );
}
