import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useInput } from "ink";
import { isTerminalMouseReport, useMouseWheel } from "../../hooks/use-mouse-wheel.js";
import { type ExpandableConversationTarget, wrapContentRows } from "../../transcript/model.js";

export interface UseExpandedContentPanelOptions {
  entry: ExpandableConversationTarget;
  width: number;
  height: number;
  enabled?: boolean;
}

const expandedContentHorizontalChromeColumns = 6;
const expandedContentVerticalChromeRows = 8;
const defaultScrollStepRows = 3;
const pageScrollOverlapRows = 1;
const boundaryBounceGuardMs = 120;

type ScrollDirection = "up" | "down";

export const resolveExpandedContentViewport = (width: number, height: number) => ({
  contentWidth: Math.max(1, width - expandedContentHorizontalChromeColumns),
  visibleRowCount: Math.max(8, height - expandedContentVerticalChromeRows),
});

export const resolveExpandedContentScrollStepRows = (visibleRowCount: number) =>
  Math.max(defaultScrollStepRows, Math.floor(visibleRowCount / 3));

export const clampExpandedContentOffset = (offset: number, maxOffset: number) =>
  Math.min(Math.max(0, offset), Math.max(0, maxOffset));

export const shouldIgnoreBoundaryBounce = (
  currentOffset: number,
  maxOffset: number,
  direction: ScrollDirection,
  boundaryDirection: ScrollDirection | null,
  boundaryUntil: number,
  now: number,
) => {
  if (now > boundaryUntil || direction === boundaryDirection) {
    return false;
  }

  if (boundaryDirection === "down" && currentOffset >= maxOffset) {
    return true;
  }

  if (boundaryDirection === "up" && currentOffset <= 0) {
    return true;
  }

  return false;
};

/**
 * Manages scrollable full-content viewing for expanded conversation entries.
 */
export const useExpandedContentPanel = ({
  entry,
  width,
  height,
  enabled = true,
}: UseExpandedContentPanelOptions) => {
  const { contentWidth, visibleRowCount } = resolveExpandedContentViewport(width, height);
  const scrollStepRows = resolveExpandedContentScrollStepRows(visibleRowCount);
  const pageScrollRows = Math.max(scrollStepRows, visibleRowCount - pageScrollOverlapRows);

  // Wrap content into rows
  const rows = useMemo(
    () => wrapContentRows(entry.content, contentWidth),
    [entry.content, contentWidth],
  );

  const maxOffset = Math.max(0, rows.length - visibleRowCount);

  // offset: row index to start displaying from
  // 0 = show from beginning (top)
  // maxOffset = show from end (bottom)
  const [offset, setOffset] = useState(0);
  const offsetRef = useRef(offset);
  const maxOffsetRef = useRef(maxOffset);
  const boundaryGuardRef = useRef<{ direction: ScrollDirection | null; until: number }>({
    direction: null,
    until: 0,
  });

  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  useEffect(() => {
    maxOffsetRef.current = maxOffset;
  }, [maxOffset]);

  // Reset to top when entry changes
  useEffect(() => {
    setOffset(0);
    boundaryGuardRef.current = { direction: null, until: 0 };
  }, [entry.id]);

  // Clamp offset when content/height changes
  useEffect(() => {
    setOffset((current) => clampExpandedContentOffset(current, maxOffset));
  }, [maxOffset]);

  const canScroll = rows.length > visibleRowCount;

  const scrollBy = useCallback(
    (delta: number, source: "wheel" | "keyboard", direction: ScrollDirection) => {
      const currentOffset = offsetRef.current;
      const currentMaxOffset = maxOffsetRef.current;
      const now = Date.now();
      const { direction: boundaryDirection, until } = boundaryGuardRef.current;

      if (
        source === "wheel" &&
        shouldIgnoreBoundaryBounce(
          currentOffset,
          currentMaxOffset,
          direction,
          boundaryDirection,
          until,
          now,
        )
      ) {
        return;
      }

      const nextOffset = clampExpandedContentOffset(currentOffset + delta, currentMaxOffset);
      offsetRef.current = nextOffset;
      setOffset(nextOffset);

      if (nextOffset <= 0) {
        boundaryGuardRef.current = {
          direction: "up",
          until: source === "wheel" ? now + boundaryBounceGuardMs : 0,
        };
        return;
      }

      if (nextOffset >= currentMaxOffset) {
        boundaryGuardRef.current = {
          direction: "down",
          until: source === "wheel" ? now + boundaryBounceGuardMs : 0,
        };
        return;
      }

      boundaryGuardRef.current = { direction: null, until: 0 };
    },
    [],
  );

  // Mouse wheel up = scroll toward top (decrease offset)
  const scrollUp = useCallback(() => {
    scrollBy(-scrollStepRows, "wheel", "up");
  }, [scrollBy, scrollStepRows]);

  // Mouse wheel down = scroll toward bottom (increase offset)
  const scrollDown = useCallback(() => {
    scrollBy(scrollStepRows, "wheel", "down");
  }, [scrollBy, scrollStepRows]);

  useInput((character, key) => {
    if (isTerminalMouseReport(character)) {
      return;
    }

    if (key.upArrow || character === "k") {
      scrollBy(-scrollStepRows, "keyboard", "up");
      return;
    }

    if (key.downArrow || character === "j") {
      scrollBy(scrollStepRows, "keyboard", "down");
      return;
    }

    if (character === "b") {
      scrollBy(-pageScrollRows, "keyboard", "up");
      return;
    }

    if (character === " " || character === "f") {
      scrollBy(pageScrollRows, "keyboard", "down");
      return;
    }

    if (character === "g") {
      setOffset(0);
      offsetRef.current = 0;
      boundaryGuardRef.current = { direction: null, until: 0 };
      return;
    }

    if (character === "G") {
      setOffset(maxOffset);
      offsetRef.current = maxOffset;
      boundaryGuardRef.current = { direction: null, until: 0 };
    }
  });

  useMouseWheel({
    enabled: enabled && canScroll,
    onScrollUp: scrollUp,
    onScrollDown: scrollDown,
  });

  const safeOffset = clampExpandedContentOffset(offset, maxOffset);
  const visibleRows = rows.slice(safeOffset, safeOffset + visibleRowCount);

  return {
    rows,
    offset: safeOffset,
    visibleRowCount,
    visibleRows,
    hasMoreAbove: safeOffset > 0,
    hasMoreBelow: safeOffset + visibleRowCount < rows.length,
    scrollStepRows,
    rangeStart: rows.length === 0 ? 0 : safeOffset + 1,
    rangeEnd: Math.min(rows.length, safeOffset + visibleRows.length),
  };
};
