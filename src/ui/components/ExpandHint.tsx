import React from "react";
import { Box, Text } from "ink";
import { useTheme } from "../theme/context.js";

interface ExpandHintProps {
  hasExpandableOutput: boolean;
  expandedOutputOpen: boolean;
}

/**
 * Prompt shown when the latest assistant or tool output has a longer expanded
 * view available behind Ctrl+O.
 */
export function ExpandHint({ hasExpandableOutput, expandedOutputOpen }: ExpandHintProps) {
  const theme = useTheme();

  if (!hasExpandableOutput || expandedOutputOpen) {
    return null;
  }

  return (
    <Box marginTop={1} paddingX={1}>
      <Text color={theme.mutedColor}>
        Press <Text color={theme.accentColor}>Ctrl+O</Text> to expand the latest long output.
      </Text>
    </Box>
  );
}
