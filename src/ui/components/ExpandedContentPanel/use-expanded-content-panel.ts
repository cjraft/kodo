import { useEffect, useState } from "react";
import { type ExpandableConversationTarget, wrapContentRows } from "../../transcript/model.js";
import { useMouseWheel } from "../../hooks/use-mouse-wheel.js";

export interface UseExpandedContentPanelOptions {
  entry: ExpandableConversationTarget;
  width: number;
  height: number;
  enabled?: boolean;
}

const defaultScrollStepRows = 3;

/**
 * Owns scroll state for the full-content viewer so the app shell only decides
 * whether the viewer page is visible.
 */
export const useExpandedContentPanel = ({
  entry,
  width,
  height,
  enabled = true,
}: UseExpandedContentPanelOptions) => {
  const contentWidth = Math.max(1, width - 8);
  const visibleRowCount = Math.max(8, height - 8);
  const rows = wrapContentRows(entry.content, contentWidth);
  const maxOffset = Math.max(0, rows.length - visibleRowCount);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    setOffset(0);
  }, [entry.id]);

  useEffect(() => {
    setOffset((current) => Math.min(current, maxOffset));
  }, [maxOffset]);

  useMouseWheel({
    enabled: enabled && maxOffset > 0,
    onScrollUp: () => {
      setOffset((current) => Math.max(0, current - defaultScrollStepRows));
    },
    onScrollDown: () => {
      setOffset((current) => Math.min(maxOffset, current + defaultScrollStepRows));
    },
  });

  const safeOffset = Math.max(0, Math.min(offset, maxOffset));
  const visibleRows = rows.slice(safeOffset, safeOffset + visibleRowCount);

  return {
    rows,
    offset: safeOffset,
    visibleRowCount,
    visibleRows,
    hasMoreAbove: safeOffset > 0,
    hasMoreBelow: safeOffset + visibleRowCount < rows.length,
    rangeStart: rows.length === 0 ? 0 : safeOffset + 1,
    rangeEnd: Math.min(rows.length, safeOffset + visibleRows.length),
  };
};
