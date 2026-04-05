import React from "react";
import { Box, Text } from "ink";
import { useTheme } from "../theme-context.js";

interface PanelProps {
  title: string;
  accentColor?: string;
  eyebrow?: string;
  children: React.ReactNode;
}

/**
 * Shared launch-screen panel shell that keeps the TUI layout visually cohesive.
 */
export function Panel({
  title,
  accentColor,
  eyebrow,
  children
}: PanelProps) {
  const theme = useTheme();
  const resolvedAccentColor = accentColor ?? theme.accentColor;

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={resolvedAccentColor}
      paddingX={1}
      paddingY={0}
      flexGrow={1}
    >
      <Box justifyContent="space-between">
        <Text bold color={resolvedAccentColor}>
          {title}
        </Text>
        {eyebrow ? <Text color="gray">{eyebrow}</Text> : null}
      </Box>
      <Box marginTop={1} flexDirection="column">
        {children}
      </Box>
    </Box>
  );
}
