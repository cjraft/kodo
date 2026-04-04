import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";

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
  "Wrangling"
];

export function getRandomLoadingMessage(): string {
  const verb =
    whimsicalVerbs[Math.floor(Math.random() * whimsicalVerbs.length)];
  return `${verb}...`;
}

interface ThinkingIndicatorProps {
  label?: string;
}

export function ThinkingIndicator({ label }: ThinkingIndicatorProps) {
  const [message, setMessage] = useState(getRandomLoadingMessage);

  useEffect(() => {
    if (label) {
      return;
    }

    const id = setInterval(() => setMessage(getRandomLoadingMessage()), 1200);
    return () => clearInterval(id);
  }, [label]);

  return (
    <Box gap={1}>
      <Text color="magenta">
        <Spinner type="dots" />
      </Text>
      <Text color="magenta">{label ?? message}</Text>
    </Box>
  );
}
