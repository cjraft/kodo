import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";
import { useTheme } from "../theme-context.js";

interface CommandComposerProps {
  width: number;
  ready: boolean;
  busy: boolean;
  input: string;
  busyLabel: string;
}

const promptGlyph = ">";
const cursorGlyph = "▌";
const placeholderText = "Type your message or /help";
const fitPromptText = (content: string, maxLength: number) => {
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
 * Gemini-inspired prompt bar with a soft surface and a blinking block cursor.
 */
export function CommandComposer({
  width,
  ready,
  busy,
  input,
  busyLabel
}: CommandComposerProps) {
  const theme = useTheme();
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    if (!ready || busy) {
      setCursorVisible(false);
      return;
    }

    setCursorVisible(true);
    const intervalId = setInterval(
      () => setCursorVisible((current) => !current),
      520
    );
    return () => clearInterval(intervalId);
  }, [busy, ready]);

  const hasUserInput = input.length > 0;
  const visibleCursor = ready && !busy && cursorVisible;
  const innerWidth = Math.max(24, width - 4);
  const contentWidth = Math.max(1, innerWidth - (promptGlyph.length + 1));
  const cursorSlotWidth = 1;
  const textWidth = Math.max(1, contentWidth - cursorSlotWidth);
  const inputText = busy ? busyLabel : input;
  const visibleInput = fitPromptText(inputText, textWidth);
  const visiblePlaceholder = fitPromptText(placeholderText, textWidth);
  const remainingWidth = Math.max(
    0,
    busy
      ? contentWidth - visibleInput.length
      : hasUserInput
        ? textWidth - visibleInput.length
        : textWidth - visiblePlaceholder.length
  );

  return (
    <Box marginTop={1} flexDirection="column">
      <Text backgroundColor={theme.surfaceColor}>{padLine("", innerWidth)}</Text>
      <Text backgroundColor={theme.surfaceColor}>
        <Text color={theme.accentColor}>{promptGlyph}</Text>
        <Text> </Text>
        {busy || hasUserInput ? (
          <Text color="white">{visibleInput}</Text>
        ) : null}
        {ready && !busy ? (
          <Text color={theme.accentColor}>
            {visibleCursor ? cursorGlyph : " "}
          </Text>
        ) : null}
        {!busy && !hasUserInput ? (
          <Text color={theme.mutedColor}>{visiblePlaceholder}</Text>
        ) : null}
        <Text>{" ".repeat(remainingWidth)}</Text>
      </Text>
      <Text backgroundColor={theme.surfaceColor}>{padLine("", innerWidth)}</Text>
    </Box>
  );
}
