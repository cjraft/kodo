import type { Message, ToolCallRecord } from "../../core/session/types.js";

const defaultPreviewLength = 72;
const userPreviewRows = 3;
const assistantPreviewRows = 5;
const toolPreviewRows = 6;

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

export interface ConversationLayout {
  assistantTextWidth: number;
  userTextWidth: number;
  toolArgsPreviewWidth: number;
  toolLineWidth: number;
  toolResultWidth: number;
}

export interface MessagePreview {
  text: string;
  isTruncated: boolean;
}

interface MessagePreviewOptions {
  expanded?: boolean;
}

export interface ExpandableConversationTarget {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface ConversationSlice {
  entries: ConversationEntry[];
  totalRows: number;
  hasOlder: boolean;
  hasNewer: boolean;
}

const collapseWhitespace = (value: string) => value.replace(/\s+/g, " ").trim();
const normalizeMultilineContent = (value: string) => {
  const normalized = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return normalized.trim().length > 0 ? normalized.trimEnd() : "(empty message)";
};

export const createMessageSnippet = (message: Message, maxLength = 96) => {
  const compact = collapseWhitespace(message.text || "(empty message)");

  if (compact.length <= maxLength) {
    return compact;
  }

  return `${compact.slice(0, Math.max(0, maxLength - 3))}...`;
};

const truncatePreviewRow = (row: string, maxWidth: number) => {
  if (maxWidth <= 3) {
    return ".".repeat(maxWidth);
  }

  return `${row.slice(0, Math.max(0, maxWidth - 3))}...`;
};

const wrapLine = (line: string, maxWidth: number) => {
  const safeWidth = Math.max(1, maxWidth);

  if (line.length === 0) {
    return [""];
  }

  const rows: string[] = [];

  for (let index = 0; index < line.length; index += safeWidth) {
    rows.push(line.slice(index, index + safeWidth));
  }

  return rows;
};

export const wrapContentRows = (content: string, maxWidth: number) =>
  normalizeMultilineContent(content)
    .split("\n")
    .flatMap((line) => wrapLine(line, maxWidth));

const createWrappedPreview = (
  content: string,
  maxWidth: number,
  maxRows: number,
): MessagePreview => {
  const rows = wrapContentRows(content, maxWidth);

  if (rows.length <= maxRows) {
    return {
      text: rows.join("\n"),
      isTruncated: false,
    };
  }

  const previewRows = rows.slice(0, maxRows);
  const lastRowIndex = previewRows.length - 1;
  previewRows[lastRowIndex] = truncatePreviewRow(previewRows[lastRowIndex] ?? "", maxWidth);

  return {
    text: previewRows.join("\n"),
    isTruncated: true,
  };
};

const createCompactWrappedPreview = (
  content: string,
  maxWidth: number,
  maxRows: number,
): MessagePreview => createWrappedPreview(collapseWhitespace(content), maxWidth, maxRows);

const createExpandedPreview = (
  content: string,
  maxWidth: number,
  compact: boolean,
): MessagePreview => {
  const rows = compact
    ? wrapContentRows(collapseWhitespace(content), maxWidth)
    : wrapContentRows(content, maxWidth);

  return {
    text: rows.join("\n"),
    isTruncated: false,
  };
};

export const formatClock = (isoTimestamp: string) => {
  const date = new Date(isoTimestamp);

  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return date.toISOString().slice(11, 16);
};

export const formatValuePreview = (value: unknown, maxLength = defaultPreviewLength) => {
  const serialized =
    typeof value === "string" ? value : (JSON.stringify(value, null, 0) ?? String(value));

  const compact = collapseWhitespace(serialized);

  if (compact.length <= maxLength) {
    return compact;
  }

  return `${compact.slice(0, Math.max(0, maxLength - 3))}...`;
};

const hasVisibleMessageBody = (message: Message) => {
  if (message.role !== "assistant") {
    return true;
  }

  return Boolean(message.text.trim()) || (message.toolCalls?.length ?? 0) === 0;
};

const compareConversationEntries = (left: ConversationEntry, right: ConversationEntry) => {
  const timeDiff = new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();

  if (timeDiff !== 0) {
    return timeDiff;
  }

  if (left.kind === right.kind) {
    return left.id.localeCompare(right.id);
  }

  return left.kind === "message" ? -1 : 1;
};

export const buildConversationEntries = (messages: Message[], toolCalls: ToolCallRecord[]) =>
  [
    ...messages.filter(hasVisibleMessageBody).map<ConversationEntry>((message) => ({
      id: `message:${message.id}`,
      createdAt: message.createdAt,
      kind: "message",
      message,
    })),
    ...toolCalls.map<ConversationEntry>((toolCall) => ({
      id: `tool:${toolCall.id}`,
      createdAt: toolCall.createdAt,
      kind: "tool-call",
      toolCall,
    })),
  ].sort(compareConversationEntries);

export const resolveConversationLayout = (width: number): ConversationLayout => {
  const surfaceInnerWidth = Math.max(1, width - 4);
  const toolLineWidth = Math.max(1, width - 6);

  return {
    assistantTextWidth: Math.max(1, width - 8),
    userTextWidth: Math.max(1, surfaceInnerWidth - 2),
    toolArgsPreviewWidth: Math.max(1, toolLineWidth - 5),
    toolLineWidth,
    toolResultWidth: toolLineWidth,
  };
};

export const createMessagePreview = (
  message: Message,
  layout: ConversationLayout,
  options: MessagePreviewOptions = {},
): MessagePreview => {
  if (options.expanded) {
    if (message.role === "user") {
      return createExpandedPreview(message.text, layout.userTextWidth, true);
    }

    if (message.role === "tool") {
      return createExpandedPreview(message.text, layout.toolResultWidth, false);
    }

    return createExpandedPreview(message.text, layout.assistantTextWidth, false);
  }

  if (message.role === "user") {
    return createCompactWrappedPreview(message.text, layout.userTextWidth, userPreviewRows);
  }

  if (message.role === "tool") {
    return createWrappedPreview(message.text, layout.toolResultWidth, toolPreviewRows);
  }

  return createWrappedPreview(message.text, layout.assistantTextWidth, assistantPreviewRows);
};

const countPreviewRows = (preview: MessagePreview) => Math.max(1, preview.text.split("\n").length);

/**
 * Estimates how many terminal rows a single transcript entry will occupy in the
 * current conversation layout.
 */
export const estimateConversationEntryRows = (
  entry: ConversationEntry,
  layout: ConversationLayout,
  options: MessagePreviewOptions = {},
) => {
  if (entry.kind === "tool-call") {
    const toolLine = `args ${formatValuePreview(
      entry.toolCall.input,
      layout.toolArgsPreviewWidth,
    )}`;
    return 4 + Math.max(1, wrapContentRows(toolLine, layout.toolLineWidth).length);
  }

  const preview = createMessagePreview(entry.message, layout, options);

  if (entry.message.role === "user") {
    return 3 + countPreviewRows(preview);
  }

  if (entry.message.role === "tool") {
    return 4 + countPreviewRows(preview);
  }

  return 2 + countPreviewRows(preview);
};

interface ConversationSliceOptions {
  expandedMessageId?: string | null;
}

/**
 * Selects the transcript entries that fit within the current viewport, using a
 * row-based scroll offset measured from the bottom of the conversation.
 */
export const selectVisibleConversationSlice = (
  entries: ConversationEntry[],
  maxRows: number,
  width: number,
  scrollBackRows = 0,
  options: ConversationSliceOptions = {},
): ConversationSlice => {
  if (entries.length === 0 || maxRows <= 0) {
    return {
      entries: [],
      totalRows: 0,
      hasOlder: false,
      hasNewer: false,
    };
  }

  const layout = resolveConversationLayout(width);
  const windows = entries.map((entry) => {
    const rows = estimateConversationEntryRows(entry, layout, {
      expanded: entry.kind === "message" && entry.id === options.expandedMessageId,
    });

    return {
      entry,
      rows,
    };
  });

  let totalRows = 0;
  const rowWindows = windows.map((window) => {
    const startRow = totalRows;
    totalRows += window.rows;
    return {
      ...window,
      startRow,
      endRow: totalRows,
    };
  });

  const maxScrollBackRows = Math.max(0, totalRows - maxRows);
  const safeScrollBackRows = Math.min(Math.max(0, scrollBackRows), maxScrollBackRows);
  const viewportEnd = Math.max(0, totalRows - safeScrollBackRows);
  const viewportStart = Math.max(0, viewportEnd - maxRows);
  const visibleEntries = rowWindows
    .filter((window) => window.endRow > viewportStart && window.startRow < viewportEnd)
    .map((window) => window.entry);

  return {
    entries: visibleEntries,
    totalRows,
    hasOlder: viewportStart > 0,
    hasNewer: viewportEnd < totalRows,
  };
};

export const findLatestExpandableConversationTarget = (
  messages: Message[],
  toolCalls: ToolCallRecord[],
  width: number,
): ExpandableConversationTarget | null => {
  const layout = resolveConversationLayout(width);
  const entries = buildConversationEntries(messages, toolCalls);

  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];

    if (entry.kind !== "message") {
      continue;
    }

    if (entry.message.role !== "assistant" && entry.message.role !== "tool") {
      continue;
    }

    const preview = createMessagePreview(entry.message, layout);

    if (!preview.isTruncated) {
      continue;
    }

    return {
      id: entry.id,
      title:
        entry.message.role === "tool"
          ? `${entry.message.toolName ?? "tool"} output`
          : "assistant output",
      content: normalizeMultilineContent(entry.message.text),
      createdAt: entry.message.createdAt,
    };
  }

  return null;
};
