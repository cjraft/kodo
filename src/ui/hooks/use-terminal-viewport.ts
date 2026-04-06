import { useStdout } from "ink";

const fallbackWidth = 120;
const fallbackHeight = 36;

/**
 * Maps Ink's stdout object into a stable terminal viewport read model so the
 * app shell does not need to know about Ink's raw shape or fallback defaults.
 */
export const useTerminalViewport = () => {
  const { stdout } = useStdout();

  return {
    width: stdout.columns ?? fallbackWidth,
    height: stdout.rows ?? fallbackHeight,
  };
};
