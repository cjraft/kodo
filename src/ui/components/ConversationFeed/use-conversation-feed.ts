import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import type { Message, ToolCallRecord } from "../../../core/session/types.js";
import { useMouseWheel } from "../../hooks/use-mouse-wheel.js";
import {
  buildConversationEntries,
  estimateConversationEntryRows,
  resolveConversationLayout,
  selectVisibleConversationSlice,
  type ConversationEntry,
  type ConversationLayout,
} from "../../transcript/model.js";

const defaultScrollStepRows = 3;
const defaultStickyThresholdRows = 6;

export interface UseConversationFeedOptions {
  width: number;
  maxRows: number;
  messages: Message[];
  toolCalls: ToolCallRecord[];
  enabled?: boolean;
  scrollStepRows?: number;
  stickyThresholdRows?: number;
}

/**
 * Keeps the newest model output expanded only when it fits inside the current
 * transcript viewport. Oversized inline expansions make row-based scrolling
 * appear stuck because the same message dominates every visible slice.
 */
export const resolveExpandedEntryId = (
  entries: ConversationEntry[],
  layout: ConversationLayout,
  maxRows: number,
) => {
  const latestExpandableEntry = [...entries]
    .reverse()
    .find(
      (entry) =>
        entry.kind === "message" &&
        (entry.message.role === "assistant" || entry.message.role === "tool"),
    );

  if (!latestExpandableEntry) {
    return null;
  }

  const expandedRows = estimateConversationEntryRows(latestExpandableEntry, layout, {
    expanded: true,
  });

  return expandedRows <= maxRows ? latestExpandableEntry.id : null;
};

/**
 * Manages the scrollable conversation feed with sticky-to-bottom behavior.
 */
export const useConversationFeed = ({
  width,
  maxRows,
  messages,
  toolCalls,
  enabled = true,
  scrollStepRows = defaultScrollStepRows,
  stickyThresholdRows = defaultStickyThresholdRows,
}: UseConversationFeedOptions) => {
  const entries = useMemo(() => buildConversationEntries(messages, toolCalls), [messages, toolCalls]);
  const layout = resolveConversationLayout(width);
  const expandedMessageId = useMemo(
    () => resolveExpandedEntryId(entries, layout, maxRows),
    [entries, layout, maxRows],
  );

  // Calculate row positions for all entries
  const rowWindows = useMemo(() => {
    let totalRows = 0;
    const windows = entries.map((entry) => {
      const isExpanded = entry.kind === "message" && entry.id === expandedMessageId;
      const rows = estimateConversationEntryRows(entry, layout, { expanded: isExpanded });
      const startRow = totalRows;
      totalRows += rows;
      return {
        entry,
        rows,
        startRow,
        endRow: totalRows,
      };
    });
    return { windows, totalRows };
  }, [entries, layout, expandedMessageId]);

  const { totalRows } = rowWindows;
  const maxScrollBackRows = Math.max(0, totalRows - maxRows);

  // scrollBackRows: how many rows we've scrolled back from the bottom
  // 0 = showing latest content (at bottom)
  // maxScrollBackRows = showing oldest content (at top)
  const [scrollBackRows, setScrollBackRows] = useState(0);
  const [stickyToBottom, setStickyToBottom] = useState(true);

  // Keep refs for latest values in callbacks
  const scrollBackRowsRef = useRef(scrollBackRows);
  const stickyRef = useRef(stickyToBottom);
  const maxScrollBackRowsRef = useRef(maxScrollBackRows);

  useEffect(() => {
    scrollBackRowsRef.current = scrollBackRows;
  }, [scrollBackRows]);

  useEffect(() => {
    stickyRef.current = stickyToBottom;
  }, [stickyToBottom]);

  useEffect(() => {
    maxScrollBackRowsRef.current = maxScrollBackRows;
  }, [maxScrollBackRows]);

  // Handle content growth: if sticky, stay at bottom
  useEffect(() => {
    if (maxScrollBackRows === 0) {
      setScrollBackRows(0);
      setStickyToBottom(true);
      return;
    }

    if (stickyRef.current) {
      // Stay at bottom
      setScrollBackRows(0);
    } else {
      // Clamp to valid range
      setScrollBackRows((current) => Math.min(current, maxScrollBackRows));
    }
  }, [totalRows, maxRows, maxScrollBackRows]);

  const canScroll = totalRows > maxRows;

  const scrollUp = useCallback(() => {
    setScrollBackRows((current) => {
      const maxScroll = maxScrollBackRowsRef.current;
      const newScrollBack = Math.min(maxScroll, current + scrollStepRows);
      
      // Break sticky when scrolling up
      if (newScrollBack > 0 && stickyRef.current) {
        setStickyToBottom(false);
      }
      
      return newScrollBack;
    });
  }, [scrollStepRows]);

  const scrollDown = useCallback(() => {
    setScrollBackRows((current) => {
      const newScrollBack = Math.max(0, current - scrollStepRows);
      
      // Check if should become sticky
      if (newScrollBack <= stickyThresholdRows) {
        setStickyToBottom(true);
        return 0;
      }
      
      return newScrollBack;
    });
  }, [scrollStepRows, stickyThresholdRows]);

  useMouseWheel({
    enabled: enabled && canScroll,
    onScrollUp: scrollUp,
    onScrollDown: scrollDown,
  });

  // Calculate actual scroll back (respecting sticky)
  const effectiveScrollBackRows = stickyToBottom ? 0 : Math.min(scrollBackRows, maxScrollBackRows);

  // Select visible entries
  const slice = selectVisibleConversationSlice(entries, maxRows, width, effectiveScrollBackRows, {
    expandedMessageId,
  });

  return {
    entries: slice.entries,
    hasOlder: slice.hasOlder,
    hasNewer: slice.hasNewer,
    stickyToBottom,
  };
};
