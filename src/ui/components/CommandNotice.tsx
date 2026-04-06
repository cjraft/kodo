import React from "react";
import { Box, Text } from "ink";
import { useTheme } from "../theme/context.js";

interface CommandNoticeProps {
  message: string | null;
}

/**
 * Inline command feedback shown above the transcript when slash commands fail
 * or need to surface a short local message.
 */
export function CommandNotice({ message }: CommandNoticeProps) {
  const theme = useTheme();

  if (!message) {
    return null;
  }

  return (
    <Box marginTop={1} paddingX={1}>
      <Text color={theme.errorColor}>{message}</Text>
    </Box>
  );
}
