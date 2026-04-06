export interface AppLayoutOptions {
  stdoutWidth: number;
  stdoutHeight: number;
  busy: boolean;
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
  busy,
  commandMessageVisible,
  helpOpen,
  expandHintVisible,
}: AppLayoutOptions): AppLayout => {
  const reservedRows =
    BASE_RESERVED_ROWS +
    (commandMessageVisible ? COMMAND_MESSAGE_RESERVED_ROWS : 0) +
    (expandHintVisible ? EXPAND_HINT_RESERVED_ROWS : 0) +
    (helpOpen ? HELP_RESERVED_ROWS : 0) +
    (busy ? BUSY_FOOTER_RESERVED_ROWS : 0);

  return {
    headerCompactLayout: stdoutWidth < 88 || (busy && helpOpen) || (expandHintVisible && helpOpen),
    conversationRows: Math.max(6, stdoutHeight - reservedRows),
  };
};
