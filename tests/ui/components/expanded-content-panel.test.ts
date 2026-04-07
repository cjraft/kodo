import { describe, expect, it } from "vitest";
import {
  clampExpandedContentOffset,
  resolveExpandedContentScrollStepRows,
  resolveExpandedContentViewport,
  shouldIgnoreBoundaryBounce,
} from "../../../src/ui/components/ExpandedContentPanel/use-expanded-content-panel.js";

describe("expanded content panel helpers", () => {
  it("derives content viewport metrics from the shell chrome", () => {
    expect(resolveExpandedContentViewport(80, 36)).toEqual({
      contentWidth: 74,
      visibleRowCount: 28,
    });
  });

  it("scales scroll steps with the viewport so long outputs are faster to traverse", () => {
    expect(resolveExpandedContentScrollStepRows(8)).toBe(3);
    expect(resolveExpandedContentScrollStepRows(28)).toBe(9);
  });

  it("clamps scroll offsets into the valid document range", () => {
    expect(clampExpandedContentOffset(-4, 12)).toBe(0);
    expect(clampExpandedContentOffset(7, 12)).toBe(7);
    expect(clampExpandedContentOffset(40, 12)).toBe(12);
  });

  it("ignores brief reverse wheel noise after hitting a scroll boundary", () => {
    expect(shouldIgnoreBoundaryBounce(12, 12, "up", "down", 100, 50)).toBe(true);
    expect(shouldIgnoreBoundaryBounce(0, 12, "down", "up", 100, 50)).toBe(true);
    expect(shouldIgnoreBoundaryBounce(12, 12, "down", "down", 100, 50)).toBe(false);
    expect(shouldIgnoreBoundaryBounce(7, 12, "up", "down", 100, 50)).toBe(false);
    expect(shouldIgnoreBoundaryBounce(12, 12, "up", "down", 100, 120)).toBe(false);
  });
});
