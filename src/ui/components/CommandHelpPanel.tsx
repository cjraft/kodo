import React from "react";
import { Box, Text } from "ink";
import type { AppCommandDefinition } from "../app/commands.js";
import { useTheme } from "../theme/context.js";
import { Panel } from "./Panel.js";

interface CommandHelpPanelProps {
  open: boolean;
  commands: AppCommandDefinition[];
}

/**
 * Dedicated help surface for slash commands and keyboard shortcuts.
 */
export function CommandHelpPanel({ open, commands }: CommandHelpPanelProps) {
  const theme = useTheme();

  if (!open) {
    return null;
  }

  return (
    <Box marginTop={1}>
      <Panel title="Command Reference" eyebrow="LOW-FRICTION HELP">
        <Text color={theme.mutedColor}>
          Press <Text color={theme.accentColor}>Esc</Text> to close panels.
        </Text>
        <Text color={theme.mutedColor}>
          Press <Text color={theme.accentColor}>Ctrl+O</Text> to expand the latest long output when
          available.
        </Text>
        <Box marginTop={1} flexDirection="column">
          {commands.map((command) => (
            <Text key={command.name}>
              <Text color={theme.accentColor}>{command.usage}</Text>{" "}
              <Text color={theme.mutedColor}>-</Text> {command.summary}
            </Text>
          ))}
        </Box>
      </Panel>
    </Box>
  );
}
