import React from "react";
import { Box, Text } from "ink";
import { useTheme } from "../theme/context.js";

interface SurfaceBarProps {
  prefix: string;
  prefixColor?: string;
  text: string;
  textColor?: string;
  width: number;
}

const padLine = (content: string, width: number) => content.padEnd(Math.max(0, width), " ");

const wrapSurfaceLine = (line: string, maxWidth: number) => {
  const safeWidth = Math.max(1, maxWidth);

  if (line.length === 0) {
    return [""];
  }

  const rows: string[] = [];

  for (let index = 0; index < line.length; index += safeWidth) {
    rows.push(line.slice(index, index + safeWidth));
  }

  return rows;
};

const toSurfaceRows = (text: string, maxWidth: number) =>
  text.split("\n").flatMap((line) => wrapSurfaceLine(line, maxWidth));

/**
 * Shared soft-background bar with vertical breathing room for prompt and user messages.
 */
export function SurfaceBar({
  prefix,
  prefixColor,
  text,
  textColor = "white",
  width,
}: SurfaceBarProps) {
  const theme = useTheme();
  const innerWidth = Math.max(1, width - 4);
  const contentWidth = Math.max(1, innerWidth - prefix.length - 1);
  const rows = toSurfaceRows(text, contentWidth);

  return (
    <Box flexDirection="column">
      <Text backgroundColor={theme.surfaceColor}>{padLine("", innerWidth)}</Text>
      {rows.map((row, index) => (
        <Text key={`${index}:${row}`} backgroundColor={theme.surfaceColor}>
          <Text backgroundColor={theme.surfaceColor} color={prefixColor ?? theme.accentColor}>
            {index === 0 ? prefix : " ".repeat(prefix.length)}
          </Text>
          <Text backgroundColor={theme.surfaceColor}> </Text>
          <Text backgroundColor={theme.surfaceColor} color={textColor}>
            {padLine(row, contentWidth)}
          </Text>
        </Text>
      ))}
      <Text backgroundColor={theme.surfaceColor}>{padLine("", innerWidth)}</Text>
    </Box>
  );
}
