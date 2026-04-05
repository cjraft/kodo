import React from "react";
import { Box, Text } from "ink";
import { useTheme } from "../theme-context.js";

interface SurfaceBarProps {
  prefix: string;
  prefixColor?: string;
  text: string;
  textColor?: string;
  width: number;
}

const fitSurfaceText = (content: string, maxLength: number) => {
  if (content.length <= maxLength) {
    return content;
  }

  if (maxLength <= 3) {
    return content.slice(0, maxLength);
  }

  return `${content.slice(0, maxLength - 3)}...`;
};

const padLine = (content: string, width: number) =>
  content.padEnd(Math.max(0, width), " ");

/**
 * Shared soft-background bar with vertical breathing room for prompt and user messages.
 */
export function SurfaceBar({
  prefix,
  prefixColor,
  text,
  textColor = "white",
  width
}: SurfaceBarProps) {
  const theme = useTheme();
  const innerWidth = Math.max(24, width - 4);
  const fittedText = fitSurfaceText(
    text,
    Math.max(1, innerWidth - prefix.length - 1)
  );

  return (
    <Box flexDirection="column">
      <Text backgroundColor={theme.surfaceColor}>{padLine("", innerWidth)}</Text>
      <Text backgroundColor={theme.surfaceColor}>
        <Text color={prefixColor ?? theme.accentColor}>{prefix}</Text>
        <Text> </Text>
        <Text color={textColor}>{padLine(fittedText, innerWidth - prefix.length - 1)}</Text>
      </Text>
      <Text backgroundColor={theme.surfaceColor}>{padLine("", innerWidth)}</Text>
    </Box>
  );
}
