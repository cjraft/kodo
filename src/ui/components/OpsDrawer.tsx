import React from "react";
import { Box, Text } from "ink";
import type { AgentSessionView } from "../../core/agent/types.js";
import type { ToolCallRecord } from "../../core/session/types.js";
import {
  formatClock,
  formatSessionLabel,
  formatToolCallSummary,
  phaseRail,
  shortenPath
} from "../launch-screen.js";
import { useTheme } from "../theme-context.js";
import { Panel } from "./Panel.js";

interface OpsDrawerProps {
  compactLayout: boolean;
  busy: boolean;
  phaseLabel: string;
  activePhaseId: string;
  activeToolName: string | null;
  messagesCount: number;
  toolCallsCount: number;
  session: AgentSessionView | null;
  recentToolCalls: ToolCallRecord[];
}

/**
 * On-demand session drawer that keeps auxiliary runtime context out of the default flow.
 */
export function OpsDrawer({
  compactLayout,
  busy,
  phaseLabel,
  activePhaseId,
  activeToolName,
  messagesCount,
  toolCallsCount,
  session,
  recentToolCalls
}: OpsDrawerProps) {
  const sessionMeta = session?.meta;
  const theme = useTheme();

  return (
    <Panel title="Ops Drawer" eyebrow="ON-DEMAND CONTEXT">
      <Box flexDirection={compactLayout ? "column" : "row"} gap={3}>
        <Box flexDirection="column" flexGrow={1}>
          <Text bold color={theme.accentColor}>
            Runtime
          </Text>
          <Text color={theme.accentColor}>phase {phaseLabel}</Text>
          <Text color={theme.accentColor}>messages {messagesCount}</Text>
          <Text color={theme.accentColor}>tools {toolCallsCount}</Text>
          <Text color={theme.accentColor}>
            active {busy ? activeToolName ?? "llm" : "operator"}
          </Text>
          <Box flexWrap="wrap" gap={1} marginTop={1}>
            {phaseRail.map((step) => (
              <Text
                key={step.id}
                color={
                  step.id === activePhaseId ? theme.accentColor : theme.mutedColor
                }
                bold={step.id === activePhaseId}
              >
                [{step.label}]
              </Text>
            ))}
          </Box>
        </Box>

        <Box flexDirection="column" minWidth={compactLayout ? 0 : 34}>
          <Text bold color={theme.accentColor}>
            Session
          </Text>
          <Text>
            provider : <Text color={theme.accentColor}>{sessionMeta?.provider ?? "..."}</Text>
          </Text>
          <Text>
            session  : <Text color={theme.accentColor}>{formatSessionLabel(sessionMeta?.id)}</Text>
          </Text>
          <Text>
            cwd      :{" "}
            <Text color={theme.accentColor}>
              {sessionMeta ? shortenPath(sessionMeta.cwd) : "..."}
            </Text>
          </Text>
        </Box>
      </Box>

      {recentToolCalls.length > 0 ? (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color={theme.accentColor}>
            Recent Tools
          </Text>
          {recentToolCalls.map((toolCall) => (
            <Box key={toolCall.id} justifyContent="space-between">
              <Text color={theme.accentColor}>{formatToolCallSummary(toolCall)}</Text>
              <Text color={theme.mutedColor}>{formatClock(toolCall.createdAt)}</Text>
            </Box>
          ))}
        </Box>
      ) : null}
    </Panel>
  );
}
