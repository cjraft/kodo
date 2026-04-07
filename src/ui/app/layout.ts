import type { LaunchRunPhase } from "./shell.js";

export interface AppLayoutOptions {
  stdoutWidth: number;
  stdoutHeight: number;
  runPhase: LaunchRunPhase;
  commandMessageVisible: boolean;
  helpOpen: boolean;
  expandHintVisible: boolean;
}

export interface AppLayout {
  headerCompactLayout: boolean;
  conversationRows: number;
}

const BASE_RESERVED_ROWS = 9;
const COMMAND_MESSAGE_RESERVED_ROWS = 2;
const EXPAND_HINT_RESERVED_ROWS = 2;
const HELP_RESERVED_ROWS = 8;
const BUSY_FOOTER_RESERVED_ROWS = 2;

/**
 * Computes the shell layout budget from terminal dimensions and drawer state so
 * the view component only renders from a stable read model.
 */
export const resolveAppLayout = ({
  stdoutWidth,
  stdoutHeight,
  runPhase,
  commandMessageVisible,
  helpOpen,
  expandHintVisible,
}: AppLayoutOptions): AppLayout => {
  const isRunning = runPhase !== "idle";
  const reservedRows =
    BASE_RESERVED_ROWS +
    (commandMessageVisible ? COMMAND_MESSAGE_RESERVED_ROWS : 0) +
    (expandHintVisible ? EXPAND_HINT_RESERVED_ROWS : 0) +
    (helpOpen ? HELP_RESERVED_ROWS : 0) +
    (isRunning ? BUSY_FOOTER_RESERVED_ROWS : 0);

  return {
    headerCompactLayout:
      stdoutWidth < 88 || (isRunning && helpOpen) || (expandHintVisible && helpOpen),
    conversationRows: Math.max(6, stdoutHeight - reservedRows),
  };
};
