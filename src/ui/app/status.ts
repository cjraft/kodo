import type { LaunchRunPhase } from "./shell.js";

export const getPhaseLabel = (runPhase: LaunchRunPhase) => {
  if (runPhase === "idle") {
    return "standby";
  }

  if (runPhase === "tool-running") {
    return "toolchain";
  }

  if (runPhase === "streaming") {
    return "transmitting";
  }

  if (runPhase === "thinking") {
    return "planning";
  }

  return "standby";
};

export const getBusyLabel = (runPhase: LaunchRunPhase, activeToolName: string | null) =>
  runPhase === "tool-running"
    ? `Running ${activeToolName ?? "tool"}...`
    : runPhase === "streaming"
      ? "Streaming response..."
      : runPhase === "thinking"
        ? "Thinking..."
        : "Initializing...";
