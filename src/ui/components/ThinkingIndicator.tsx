import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import type { LaunchRunPhase } from "../app/shell.js";
import { getBusyLabel } from "../app/status.js";
import { useTheme } from "../theme/context.js";

const whimsicalVerbs = [
  "Booting",
  "Frolicking",
  "Marinating",
  "Schlepping",
  "Concocting",
  "Honking",
  "Yodeling",
  "Schmoozing",
  "Blooping",
  "Blipping",
  "Sparkling",
  "Simmering",
  "Jiggling",
  "Wobbling",
  "Pondering",
  "Brewing",
  "Tinkering",
  "Whizzing",
  "Grokking",
  "Ramboozing",
  "Noodling",
  "Percolating",
  "Ruminating",
  "Waffling",
  "Zigzagging",
  "Caffeinating",
  "Contemplating",
  "Daydreaming",
  "Meandering",
  "Oscillating",
  "Philosophizing",
  "Recalibrating",
  "Synthesizing",
  "Vibing",
  "Wrangling",
];

export function getRandomLoadingMessage(): string {
  const verb = whimsicalVerbs[Math.floor(Math.random() * whimsicalVerbs.length)];
  return `${verb}...`;
}

interface ThinkingIndicatorProps {
  runPhase: LaunchRunPhase;
  activeToolName: string | null;
}

export function ThinkingIndicator({ runPhase, activeToolName }: ThinkingIndicatorProps) {
  const theme = useTheme();
  const [message, setMessage] = useState(getRandomLoadingMessage);
  const busyLabel = getBusyLabel(runPhase, activeToolName);
  const isRunning = runPhase !== "idle";
  const shouldAnimate = isRunning && (runPhase === "thinking" || runPhase === "tool-running");

  useEffect(() => {
    if (runPhase === "tool-running" || !shouldAnimate) {
      return;
    }

    const id = setInterval(() => setMessage(getRandomLoadingMessage()), 1200);
    return () => clearInterval(id);
  }, [runPhase, shouldAnimate]);

  if (!isRunning) {
    return null;
  }

  if (runPhase === "streaming") {
    return (
      <Box marginTop={1}>
        <Text color={theme.mutedColor}>Streaming response packets...</Text>
      </Box>
    );
  }

  if (!shouldAnimate) {
    return null;
  }

  return (
    <Box marginTop={1} gap={1}>
      <Text color={theme.accentColor}>
        <Spinner type="dots" />
      </Text>
      <Text color={theme.accentColor}>{runPhase === "tool-running" ? busyLabel : message}</Text>
    </Box>
  );
}
