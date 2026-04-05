import React from "react";
import { Box, Text } from "ink";
import type { Message, ToolCallRecord } from "../../core/session/types.js";
import {
  buildConversationEntries,
  createMessageSnippet,
  formatClock,
  formatValuePreview,
  selectVisibleConversationEntries
} from "../launch-screen.js";
import type { UiTheme } from "../theme.js";
import { useTheme } from "../theme-context.js";
import { SurfaceBar } from "./SurfaceBar.js";

interface ConversationFeedProps {
  width: number;
  maxRows: number;
  compactLayout: boolean;
  messages: Message[];
  toolCalls: ToolCallRecord[];
}

const getAssistantMarkerColor = (message: Message, theme: UiTheme) =>
  message.text.startsWith("Run failed:") ? theme.errorColor : theme.accentColor;

/**
 * Main transcript stream styled after Gemini CLI: user bars, assistant bullets,
 * and subtle tool cards embedded inline.
 */
export function ConversationFeed({
  width,
  maxRows,
  compactLayout,
  messages,
  toolCalls
}: ConversationFeedProps) {
  const theme = useTheme();
  const entries = selectVisibleConversationEntries(
    buildConversationEntries(messages, toolCalls),
    maxRows
  );
  const toolCallById = new Map(toolCalls.map((toolCall) => [toolCall.id, toolCall]));

  if (entries.length === 0) {
    return (
      <Box marginTop={1} paddingX={1}>
        <Text color={theme.mutedColor}>
          No transcript yet. Send a prompt to wake the system.
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" marginTop={1}>
      {entries.map((entry) => {
        if (entry.kind === "tool-call") {
          return (
            <Box
              key={entry.id}
              flexDirection="column"
              borderStyle="round"
              borderColor={theme.mutedColor}
              borderDimColor
              paddingX={1}
              marginBottom={1}
            >
              <Box justifyContent="space-between">
                <Text color={theme.accentColor}>
                  {entry.toolCall.isError ? "!" : "+"} {entry.toolCall.toolName}
                </Text>
                <Text color={theme.mutedColor}>{formatClock(entry.toolCall.createdAt)}</Text>
              </Box>
              <Text color={theme.mutedColor}>
                args {formatValuePreview(entry.toolCall.input, compactLayout ? 72 : 108)}
              </Text>
            </Box>
          );
        }

        if (entry.message.role === "user") {
          return (
            <Box key={entry.id} marginBottom={1}>
              <SurfaceBar
                prefix=">"
                text={createMessageSnippet(
                  entry.message,
                  compactLayout ? 84 : 132
                )}
                width={width}
              />
            </Box>
          );
        }

        if (entry.message.role === "tool") {
          const toolCall = entry.message.toolCallId
            ? toolCallById.get(entry.message.toolCallId)
            : undefined;

          return (
            <Box
              key={entry.id}
              flexDirection="column"
              borderStyle="round"
              borderColor={theme.mutedColor}
              borderDimColor
              paddingX={1}
              marginBottom={1}
            >
              <Box justifyContent="space-between">
                <Text color={toolCall?.isError ? theme.errorColor : theme.mutedColor}>
                  {toolCall?.isError ? "!" : "✓"} {entry.message.toolName ?? "tool"}
                </Text>
                <Text color={theme.mutedColor}>{formatClock(entry.message.createdAt)}</Text>
              </Box>
              <Text color="white">
                {createMessageSnippet(entry.message, compactLayout ? 84 : 132)}
              </Text>
            </Box>
          );
        }

        return (
          <Box key={entry.id} gap={1} marginBottom={1}>
            <Text color={getAssistantMarkerColor(entry.message, theme)}>●</Text>
            <Box flexDirection="column" minWidth={0}>
              <Text color="white">
                {createMessageSnippet(entry.message, compactLayout ? 88 : 136)}
              </Text>
              <Text color={theme.mutedColor}>{formatClock(entry.message.createdAt)}</Text>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
