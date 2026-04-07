import React from "react";
import { Box, Text } from "ink";
import type { AppShellInfo } from "../app/shell.js";
import { useTheme } from "../theme/context.js";

interface FocusHeaderProps {
  compactLayout: boolean;
  shell: AppShellInfo;
}

/**
 * Kodo ASCII art logo
 */
const Logo = ({ accentColor }: { accentColor: string }) => (
  <Box flexDirection="column">
    <Text color={accentColor}>██╗  ██╗ ██████╗ ██████╗  ██████╗ </Text>
    <Text color={accentColor}>██║ ██╔╝██╔═══██╗██╔══██╗██╔═══██╗</Text>
    <Text color={accentColor}>█████╔╝ ██║   ██║██║  ██║██║   ██║</Text>
    <Text color={accentColor}>██╔═██╗ ██║   ██║██║  ██║██║   ██║</Text>
    <Text color={accentColor}>██║  ██╗╚██████╔╝██████╔╝╚██████╔╝</Text>
    <Text color={accentColor}>╚═╝  ╚═╝ ╚═════╝ ╚═════╝  ╚═════╝ </Text>
  </Box>
);

/**
 * Small inline logo for compact mode
 */
const InlineLogo = ({ accentColor }: { accentColor: string }) => (
  <Text bold color={accentColor}>
    Kodo
  </Text>
);

/**
 * Info row component for consistent layout
 */
const InfoRow = ({
  label,
  value,
  accent = false,
  accentColor,
}: {
  label: string;
  value: string;
  accent?: boolean;
  accentColor: string;
}) => (
  <Box gap={1}>
    <Text color="gray" dimColor>
      {label}
    </Text>
    <Text color={accent ? accentColor : "white"} bold={accent}>
      {value}
    </Text>
  </Box>
);

/**
 * Decorative status indicator
 */
const StatusIndicator = ({ color }: { color: string }) => (
  <Box marginRight={1}>
    <Text color={color}>●</Text>
  </Box>
);

/**
 * Enhanced shell-style launch card with ASCII logo and rich styling.
 * Inspired by modern CLI tools like Warp, Fig, and Starship.
 */
export function FocusHeader({ compactLayout, shell }: FocusHeaderProps) {
  const theme = useTheme();
  const hintLabel = shell.hintLabel ?? "Type /help for commands";

  // Compact mode: single line header
  if (compactLayout) {
    return (
      <Box flexDirection="row" gap={1} marginBottom={1}>
        <StatusIndicator color={theme.accentColor} />
        <InlineLogo accentColor={theme.accentColor} />
        <Text color="gray">|</Text>
        <Text color="white" dimColor>
          {shell.modelLabel}
        </Text>
        <Text color="gray">|</Text>
        <Text color="gray" dimColor>
          {shell.directoryLabel}
        </Text>
      </Box>
    );
  }

  // Full welcome banner
  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Top border */}
      <Box>
        <Text color="gray">╭</Text>
        <Text color="gray">{"─".repeat(58)}</Text>
        <Text color="gray">╮</Text>
      </Box>

      {/* Logo section */}
      <Box flexDirection="row">
        <Text color="gray">│</Text>
        <Box paddingX={2} paddingY={1}>
          <Logo accentColor={theme.accentColor} />
        </Box>
        <Box flexDirection="column" paddingLeft={2} paddingY={1} justifyContent="center">
          <Box marginBottom={1}>
            <Text bold color="white">
              Terminal-native coding agent
            </Text>
          </Box>
          <InfoRow label="version" value={`v${shell.version}`} accentColor={theme.accentColor} />
        </Box>
        <Box flexGrow={1} />
        <Text color="gray">│</Text>
      </Box>

      {/* Divider */}
      <Box>
        <Text color="gray">├</Text>
        <Text color="gray">{"─".repeat(58)}</Text>
        <Text color="gray">┤</Text>
      </Box>

      {/* Info section */}
      <Box flexDirection="row">
        <Text color="gray">│</Text>
        <Box paddingX={2} paddingY={1} flexDirection="column" gap={1}>
          <InfoRow
            label="model  "
            value={shell.modelLabel}
            accent
            accentColor={theme.accentColor}
          />
          <InfoRow label="cwd    " value={shell.directoryLabel} accentColor={theme.accentColor} />
        </Box>
        <Box flexGrow={1} />
        <Box paddingRight={2} paddingY={1} justifyContent="center">
          <Box flexDirection="column" alignItems="flex-end">
            <Text color={theme.accentColor} dimColor>
              {hintLabel}
            </Text>
          </Box>
        </Box>
        <Text color="gray">│</Text>
      </Box>

      {/* Bottom border */}
      <Box>
        <Text color="gray">╰</Text>
        <Text color="gray">{"─".repeat(58)}</Text>
        <Text color="gray">╯</Text>
      </Box>
    </Box>
  );
}
