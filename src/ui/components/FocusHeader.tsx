import React from "react";
import { Box, Text } from "ink";
import type { AppShellInfo } from "../app/shell.js";
import { useTheme } from "../theme/context.js";

interface FocusHeaderProps {
  compactLayout: boolean;
  shell: AppShellInfo;
}

/**
 * Shell-style launch card inspired by Codex CLI, foregrounding model and directory.
 */
export function FocusHeader({ compactLayout, shell }: FocusHeaderProps) {
  const theme = useTheme();
  const hintLabel = shell.hintLabel ?? "/help for commands";

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="gray"
      borderDimColor
      paddingX={1}
      paddingY={0}
    >
      <Box gap={1}>
        <Text color="gray">&gt;_</Text>
        <Text bold color="white">
          Kodo CLI
        </Text>
        <Text color="gray">(v{shell.version})</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Box
          flexDirection={compactLayout ? "column" : "row"}
          justifyContent="space-between"
          marginBottom={1}
        >
          <Box gap={1}>
            <Text color="gray">model:</Text>
            <Text color="white">{shell.modelLabel}</Text>
          </Box>
          <Text color={theme.accentColor} dimColor={compactLayout}>
            {hintLabel}
          </Text>
        </Box>

        <Box gap={1}>
          <Text color="gray">directory:</Text>
          <Text color="white">{shell.directoryLabel}</Text>
        </Box>
      </Box>
    </Box>
  );
}
