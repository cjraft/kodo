export interface AppShellInfo {
  version: string;
  modelLabel: string;
  directoryLabel: string;
  hintLabel?: string;
}

export type LaunchRunPhase = "idle" | "thinking" | "streaming" | "tool-running";

export const formatHomeRelativePath = (cwd: string, homeDir?: string) => {
  if (!homeDir) {
    return cwd;
  }

  const normalizedCwd = cwd.replace(/\\/g, "/");
  const normalizedHome = homeDir.replace(/\\/g, "/");

  if (normalizedCwd === normalizedHome) {
    return "~";
  }

  if (normalizedCwd.startsWith(`${normalizedHome}/`)) {
    return `~${normalizedCwd.slice(normalizedHome.length)}`;
  }

  return cwd;
};
