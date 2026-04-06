import React from "react";
import { Box, Text } from "ink";
import { useTerminalViewport } from "../../hooks/use-terminal-viewport.js";
import type { ExpandableConversationTarget } from "../../transcript/model.js";
import { formatClock } from "../../transcript/model.js";
import { useTheme } from "../../theme/context.js";
import { Panel } from "../Panel.js";
import { useExpandedContentPanel } from "./use-expanded-content-panel.js";

interface ExpandedContentPanelProps {
  entry: ExpandableConversationTarget;
}

/**
 * Scrollable full-content viewer for the latest truncated transcript entry.
 */
export function ExpandedContentPanel({ entry }: ExpandedContentPanelProps) {
  const theme = useTheme();
  const viewport = useTerminalViewport();
  const viewer = useExpandedContentPanel({
    entry,
    width: viewport.width,
    height: viewport.height,
  });

  return (
    <Box flexDirection="column" paddingX={1} paddingY={0}>
      <Panel title={entry.title} eyebrow="FULL VIEW">
        <Text color={theme.mutedColor}>
          {formatClock(entry.createdAt)} · lines {viewer.rangeStart}-{viewer.rangeEnd} /{" "}
          {viewer.rows.length}
          {viewer.hasMoreAbove ? " · more above" : ""}
          {viewer.hasMoreBelow ? " · more below" : ""}
        </Text>
        <Text color={theme.mutedColor}>Use the mouse wheel to scroll.</Text>
        <Text color={theme.mutedColor}>
          Press <Text color={theme.accentColor}>Esc</Text> or{" "}
          <Text color={theme.accentColor}>Ctrl+O</Text> to return.
        </Text>
        <Box marginTop={1} flexDirection="column">
          {viewer.visibleRows.map((row, index) => (
            <Text key={`${viewer.offset + index}:${row}`}>{row || " "}</Text>
          ))}
        </Box>
      </Panel>
    </Box>
  );
}
