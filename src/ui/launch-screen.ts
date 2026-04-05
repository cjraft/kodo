import type { Message, ToolCallRecord } from "../core/session/types.js";

export type LaunchRunPhase =
  | "idle"
  | "thinking"
  | "streaming"
  | "tool-running";

export const heroLines = [
  " _  __          _",
  "| |/ /___   ___| | ___",
  "| ' // _ \\ / _ \\ |/ _ \\",
  "| . \\ (_) |  __/ | (_) |",
  "|_|\\_\\___/ \\___|_|\\___/"
];

const maxPathSegments = 3;
const defaultPreviewLength = 72;

const collapseWhitespace = (value: string) => value.replace(/\s+/g, " ").trim();

export const createMessageSnippet = (message: Message, maxLength = 96) => {
  const compact = collapseWhitespace(message.text || "(empty message)");

  if (compact.length <= maxLength) {
    return compact;
  }

  return `${compact.slice(0, Math.max(0, maxLength - 3))}...`;
};

export const formatClock = (isoTimestamp: string) => {
  const date = new Date(isoTimestamp);

  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return date.toISOString().slice(11, 16);
};

export const formatSessionLabel = (sessionId?: string | null) =>
  sessionId ? sessionId.slice(0, 8) : "--------";

export const shortenPath = (cwd: string) => {
  const normalized = cwd.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);

  if (parts.length <= maxPathSegments) {
    return normalized || cwd;
  }

  return `.../${parts.slice(-maxPathSegments).join("/")}`;
};

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

export const getRoleColor = (role: Message["role"]) => {
  switch (role) {
    case "user":
      return "green";
    case "assistant":
      return "yellow";
    case "tool":
      return "magenta";
    default:
      return "gray";
  }
};

export const getRoleLabel = (role: Message["role"]) => {
  switch (role) {
    case "user":
      return "USR";
    case "assistant":
      return "AST";
    case "tool":
      return "TOL";
    default:
      return "SYS";
  }
};

export const formatToolCallSummary = (toolCall: ToolCallRecord) =>
  `${toolCall.isError ? "ERR" : "OK "} ${toolCall.toolName}`;

export const formatValuePreview = (
  value: unknown,
  maxLength = defaultPreviewLength
) => {
  const serialized =
    typeof value === "string"
      ? value
      : JSON.stringify(value, null, 0) ?? String(value);

  const compact = collapseWhitespace(serialized);

  if (compact.length <= maxLength) {
    return compact;
  }

  return `${compact.slice(0, Math.max(0, maxLength - 3))}...`;
};

export const getStatusTone = (status: string) => {
  if (status.startsWith("Run failed:") || status.startsWith("Resume failed:")) {
    return "red";
  }

  if (status.startsWith("Failed to initialize:")) {
    return "yellow";
  }

  if (status.startsWith("Running ")) {
    return "magenta";
  }

  if (status.includes("started") || status.includes("loaded")) {
    return "magentaBright";
  }

  return "magentaBright";
};

export const getPhaseLabel = (busy: boolean, runPhase: LaunchRunPhase) => {
  if (!busy) {
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

export const phaseRail = [
  { id: "idle", label: "standby" },
  { id: "thinking", label: "planning" },
  { id: "tool-running", label: "toolchain" },
  { id: "streaming", label: "transmitting" }
] as const;

export type ConversationEntry =
  | {
      id: string;
      createdAt: string;
      kind: "message";
      message: Message;
    }
  | {
      id: string;
      createdAt: string;
      kind: "tool-call";
      toolCall: ToolCallRecord;
    };

const USER_ENTRY_ROWS = 4;
const ASSISTANT_ENTRY_ROWS = 3;
const TOOL_ENTRY_ROWS = 5;

const hasVisibleMessageBody = (message: Message) => {
  if (message.role !== "assistant") {
    return true;
  }

  return Boolean(message.text.trim()) || (message.toolCalls?.length ?? 0) === 0;
};

const compareConversationEntries = (
  left: ConversationEntry,
  right: ConversationEntry
) => {
  const timeDiff =
    new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();

  if (timeDiff !== 0) {
    return timeDiff;
  }

  if (left.kind === right.kind) {
    return left.id.localeCompare(right.id);
  }

  return left.kind === "message" ? -1 : 1;
};

export const buildConversationEntries = (
  messages: Message[],
  toolCalls: ToolCallRecord[]
) =>
  [
    ...messages
      .filter(hasVisibleMessageBody)
      .map<ConversationEntry>((message) => ({
        id: `message:${message.id}`,
        createdAt: message.createdAt,
        kind: "message",
        message
      })),
    ...toolCalls.map<ConversationEntry>((toolCall) => ({
      id: `tool:${toolCall.id}`,
      createdAt: toolCall.createdAt,
      kind: "tool-call",
      toolCall
    }))
  ].sort(compareConversationEntries);

const estimateConversationEntryRows = (entry: ConversationEntry) => {
  if (entry.kind === "tool-call") {
    return TOOL_ENTRY_ROWS;
  }

  if (entry.message.role === "user") {
    return USER_ENTRY_ROWS;
  }

  if (entry.message.role === "tool") {
    return TOOL_ENTRY_ROWS;
  }

  return ASSISTANT_ENTRY_ROWS;
};

/**
 * Selects the newest suffix of the rendered transcript that fits within a rough
 * terminal row budget, keeping the feed stable when tool cards are taller.
 */
export const selectVisibleConversationEntries = (
  entries: ConversationEntry[],
  maxRows: number
) => {
  if (maxRows <= 0) {
    return [];
  }

  const selected: ConversationEntry[] = [];
  let usedRows = 0;

  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    const entryRows = estimateConversationEntryRows(entry);

    if (selected.length > 0 && usedRows + entryRows > maxRows) {
      break;
    }

    selected.unshift(entry);
    usedRows += entryRows;
  }

  return selected;
};
