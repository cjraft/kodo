const enableMouseTrackingSequence = "\u001B[?1002h\u001B[?1006h";
const disableMouseTrackingSequence = "\u001B[?1002l\u001B[?1006l";

/**
 * Returns the escape sequence that enables terminal mouse tracking in the
 * modes required by the TUI scroll surfaces.
 */
export const getEnableMouseTrackingSequence = () => enableMouseTrackingSequence;

/**
 * Returns the escape sequence that disables terminal mouse tracking so the
 * user's shell does not keep echoing raw mouse reports after the app exits.
 */
export const getDisableMouseTrackingSequence = () => disableMouseTrackingSequence;

/**
 * Best-effort cleanup used at process startup and shutdown to ensure the
 * terminal is not left in mouse-reporting mode across runs.
 */
export const disableTerminalMouseTracking = (writer: (value: string) => void) => {
  writer(disableMouseTrackingSequence);
};
