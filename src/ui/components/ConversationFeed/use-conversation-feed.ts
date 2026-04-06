import { useEffect, useRef, useState } from "react";
import type { Message, ToolCallRecord } from "../../../core/session/types.js";
import { useMouseWheel } from "../../hooks/use-mouse-wheel.js";
import {
  buildConversationEntries,
  estimateConversationEntryRows,
  resolveConversationLayout,
  selectVisibleConversationSlice,
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

const findLatestExpandedEntryId = (messages: Message[]) =>
  [...messages].reverse().find((message) => message.role === "assistant" || message.role === "tool")
    ?.id ?? null;

/**
 * Owns the transcript viewport for the main conversation area, including
 * mouse-wheel scrolling and sticky-bottom behavior while new output streams in.
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
  const entries = buildConversationEntries(messages, toolCalls);
  const layout = resolveConversationLayout(width);
  const latestExpandedEntryId = findLatestExpandedEntryId(messages);
  const [state, setState] = useState({
    scrollBackRows: 0,
    stickyToBottom: true,
  });
  const initialSlice = selectVisibleConversationSlice(entries, maxRows, width, 0, {
    expandedMessageId: latestExpandedEntryId ? `message:${latestExpandedEntryId}` : null,
  });
  const totalRowsRef = useRef(initialSlice.totalRows);
  const slice = selectVisibleConversationSlice(entries, maxRows, width, state.scrollBackRows, {
    expandedMessageId: latestExpandedEntryId ? `message:${latestExpandedEntryId}` : null,
  });
  const getEntryStepRows = (entryId?: string) => {
    const entry = entryId ? entries.find((candidate) => candidate.id === entryId) : undefined;

    if (!entry) {
      return scrollStepRows;
    }

    return Math.max(
      scrollStepRows,
      estimateConversationEntryRows(entry, layout, {
        expanded: entry.kind === "message" && entry.id === `message:${latestExpandedEntryId}`,
      }),
    );
  };

  useEffect(() => {
    const previousTotalRows = totalRowsRef.current;
    const totalRowsDelta = slice.totalRows - previousTotalRows;
    totalRowsRef.current = slice.totalRows;

    setState((current) => {
      const maxScrollBackRows = Math.max(0, slice.totalRows - maxRows);

      if (maxScrollBackRows === 0) {
        return {
          scrollBackRows: 0,
          stickyToBottom: true,
        };
      }

      if (totalRowsDelta > 0) {
        if (current.stickyToBottom) {
          return {
            scrollBackRows: 0,
            stickyToBottom: true,
          };
        }

        return {
          scrollBackRows: Math.min(maxScrollBackRows, current.scrollBackRows + totalRowsDelta),
          stickyToBottom: false,
        };
      }

      const clampedScrollBackRows = Math.min(current.scrollBackRows, maxScrollBackRows);
      const shouldStick = current.stickyToBottom || clampedScrollBackRows <= stickyThresholdRows;

      return {
        scrollBackRows: shouldStick ? 0 : clampedScrollBackRows,
        stickyToBottom: shouldStick,
      };
    });
  }, [maxRows, slice.totalRows, stickyThresholdRows]);

  useMouseWheel({
    enabled: enabled && slice.totalRows > maxRows,
    onScrollUp: () => {
      setState((current) => {
        const maxScrollBackRows = Math.max(0, slice.totalRows - maxRows);
        const stepRows = getEntryStepRows(slice.entries[0]?.id);
        const nextScrollBackRows = Math.min(maxScrollBackRows, current.scrollBackRows + stepRows);

        return {
          scrollBackRows: nextScrollBackRows,
          stickyToBottom: current.stickyToBottom && nextScrollBackRows <= stickyThresholdRows,
        };
      });
    },
    onScrollDown: () => {
      setState((current) => {
        const stepRows = getEntryStepRows(slice.entries.at(-1)?.id);
        const nextScrollBackRows = Math.max(0, current.scrollBackRows - stepRows);
        const shouldStick = nextScrollBackRows <= stickyThresholdRows;

        return {
          scrollBackRows: shouldStick ? 0 : nextScrollBackRows,
          stickyToBottom: shouldStick,
        };
      });
    },
  });

  return {
    entries: slice.entries,
    hasOlder: slice.hasOlder,
    hasNewer: slice.hasNewer,
    stickyToBottom: state.stickyToBottom,
  };
};
