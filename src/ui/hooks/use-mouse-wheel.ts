import { useEffect, useRef } from "react";
import { useStdin, useStdout } from "ink";
import {
  disableTerminalMouseTracking,
  getEnableMouseTrackingSequence,
} from "../terminal/mouse-tracking.js";

const sgrMousePattern = /(?:\u001B)?\[<(\d+);(\d+);(\d+)([mM])/g;
const mouseWheelFlushDelayMs = 16;

export type MouseWheelDirection = "up" | "down";

export const stripTerminalMouseReports = (value: string) => {
  sgrMousePattern.lastIndex = 0;
  return value.replace(sgrMousePattern, "");
};

export const isTerminalMouseReport = (value: string) => {
  if (!value) {
    return false;
  }

  const stripped = stripTerminalMouseReports(value);
  return stripped.length === 0 && stripped !== value;
};

/**
 * Extracts wheel directions from terminal SGR mouse-report sequences.
 */
export const detectMouseWheelDirections = (buffer: string) => {
  const directions: MouseWheelDirection[] = [];
  let match: RegExpExecArray | null = null;

  sgrMousePattern.lastIndex = 0;

  while ((match = sgrMousePattern.exec(buffer)) !== null) {
    const code = Number(match[1]);

    if ((code & 64) === 0) {
      continue;
    }

    directions.push((code & 1) === 0 ? "up" : "down");
  }

  return directions;
};

export const sumMouseWheelDirections = (directions: MouseWheelDirection[]) =>
  directions.reduce((score, direction) => score + (direction === "down" ? 1 : -1), 0);

const getMouseWheelBufferRemainder = (buffer: string) => {
  let lastMatchEnd = 0;

  sgrMousePattern.lastIndex = 0;

  while (sgrMousePattern.exec(buffer) !== null) {
    lastMatchEnd = sgrMousePattern.lastIndex;
  }

  if (lastMatchEnd > 0) {
    return buffer.slice(lastMatchEnd);
  }

  const trailingMouseSequenceStart = Math.max(
    buffer.lastIndexOf("\u001B[<"),
    buffer.lastIndexOf("[<"),
  );
  return trailingMouseSequenceStart >= 0 ? buffer.slice(trailingMouseSequenceStart) : "";
};

interface UseMouseWheelOptions {
  enabled: boolean;
  onScrollUp: () => void;
  onScrollDown: () => void;
}

/**
 * Enables terminal mouse tracking for the mounted view and maps wheel events to
 * local scroll callbacks.
 */
export const useMouseWheel = ({ enabled, onScrollUp, onScrollDown }: UseMouseWheelOptions) => {
  const { stdin } = useStdin();
  const { stdout, write } = useStdout();
  const bufferRef = useRef("");
  const onScrollUpRef = useRef(onScrollUp);
  const onScrollDownRef = useRef(onScrollDown);
  const pendingDeltaRef = useRef(0);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onScrollUpRef.current = onScrollUp;
  }, [onScrollUp]);

  useEffect(() => {
    onScrollDownRef.current = onScrollDown;
  }, [onScrollDown]);

  useEffect(() => {
    if (!enabled || !stdin.isTTY || !stdout.isTTY) {
      return;
    }

    const flushPendingWheelDelta = () => {
      flushTimerRef.current = null;
      const delta = pendingDeltaRef.current;
      pendingDeltaRef.current = 0;

      if (delta === 0) {
        return;
      }

      const scroll = delta > 0 ? onScrollDownRef.current : onScrollUpRef.current;

      for (let index = 0; index < Math.abs(delta); index += 1) {
        scroll();
      }
    };

    const disableMouseTracking = () => {
      disableTerminalMouseTracking(write);
    };

    write(getEnableMouseTrackingSequence());
    process.once("exit", disableMouseTracking);

    const handleData = (chunk: string | Buffer) => {
      bufferRef.current += chunk.toString();
      const delta = sumMouseWheelDirections(detectMouseWheelDirections(bufferRef.current));

      if (delta !== 0) {
        pendingDeltaRef.current += delta;

        if (!flushTimerRef.current) {
          flushTimerRef.current = setTimeout(flushPendingWheelDelta, mouseWheelFlushDelayMs);
        }
      }

      bufferRef.current = getMouseWheelBufferRemainder(bufferRef.current);
    };

    stdin.on("data", handleData);

    return () => {
      stdin.off("data", handleData);
      process.off("exit", disableMouseTracking);
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      pendingDeltaRef.current = 0;
      bufferRef.current = "";
      disableMouseTracking();
    };
  }, [enabled, stdin, stdout, write]);
};
