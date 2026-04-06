import React from "react";
import { Box, Text } from "ink";
import type { Message, ToolCallRecord } from "../../../core/session/types.js";
import {
  createMessagePreview,
  formatClock,
  formatValuePreview,
  resolveConversationLayout,
} from "../../transcript/model.js";
import type { UiTheme } from "../../theme/theme.js";
import { useTerminalViewport } from "../../hooks/use-terminal-viewport.js";
import { useTheme } from "../../theme/context.js";
import { SurfaceBar } from "../SurfaceBar.js";
import { useConversationFeed } from "./use-conversation-feed.js";

interface ConversationFeedProps {
  maxRows: number;
  messages: Message[];
  toolCalls: ToolCallRecord[];
  enabled?: boolean;
}

const getAssistantMarkerColor = (message: Message, theme: UiTheme) =>
  message.text.startsWith("Run failed:") ? theme.errorColor : theme.accentColor;

/**
 * Main transcript stream styled after Gemini CLI: user bars, assistant bullets,
 * and subtle tool cards embedded inline.
 */
export function ConversationFeed({
  maxRows,
  messages,
  toolCalls,
  enabled = true,
}: ConversationFeedProps) {
  const theme = useTheme();
  const viewport = useTerminalViewport();
  const width = viewport.width;
  const layout = resolveConversationLayout(width);
  const { entries, hasOlder, hasNewer, stickyToBottom } = useConversationFeed({
    width,
    maxRows,
    messages,
    toolCalls,
    enabled,
  });
  const latestModelOutputId =
    [...entries]
      .reverse()
      .find(
        (entry) =>
          entry.kind === "message" &&
          (entry.message.role === "assistant" || entry.message.role === "tool"),
      )?.id ?? null;
  const toolCallById = new Map(toolCalls.map((toolCall) => [toolCall.id, toolCall]));

  if (entries.length === 0) {
    return (
      <Box marginTop={1} paddingX={1}>
        <Text color={theme.mutedColor}>No transcript yet. Send a prompt to wake the system.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" marginTop={1}>
      {hasOlder || hasNewer || !stickyToBottom ? (
        <Box paddingX={1} marginBottom={1}>
          <Text color={theme.mutedColor}>
            Scroll down to return to the live edge.
            {!stickyToBottom ? " Auto-stick paused." : ""}
          </Text>
        </Box>
      ) : null}

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
                args {formatValuePreview(entry.toolCall.input, layout.toolArgsPreviewWidth)}
              </Text>
            </Box>
          );
        }

        if (entry.message.role === "user") {
          const preview = createMessagePreview(entry.message, layout);
          return (
            <Box key={entry.id} marginBottom={1}>
              <SurfaceBar prefix=">" text={preview.text} width={width} />
            </Box>
          );
        }

        if (entry.message.role === "tool") {
          const toolCall = entry.message.toolCallId
            ? toolCallById.get(entry.message.toolCallId)
            : undefined;
          const preview = createMessagePreview(entry.message, layout, {
            expanded: entry.id === latestModelOutputId,
          });

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
              <Text color="white">{preview.text}</Text>
            </Box>
          );
        }

        const preview = createMessagePreview(entry.message, layout, {
          expanded: entry.id === latestModelOutputId,
        });

        return (
          <Box key={entry.id} gap={1} marginBottom={1}>
            <Text color={getAssistantMarkerColor(entry.message, theme)}>●</Text>
            <Box flexDirection="column" minWidth={0}>
              <Text color="white">{preview.text}</Text>
              <Text color={theme.mutedColor}>{formatClock(entry.message.createdAt)}</Text>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
