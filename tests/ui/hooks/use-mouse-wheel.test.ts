import { describe, expect, it } from "vitest";
import {
  detectMouseWheelDirections,
  isTerminalMouseReport,
  stripTerminalMouseReports,
  sumMouseWheelDirections,
} from "../../../src/ui/hooks/use-mouse-wheel.js";

describe("useMouseWheel helpers", () => {
  it("detects wheel up and down events from SGR mouse sequences", () => {
    expect(detectMouseWheelDirections("\u001B[<64;34;12M\u001B[<65;34;11M")).toEqual([
      "up",
      "down",
    ]);
  });

  it("ignores non-wheel mouse reports", () => {
    expect(detectMouseWheelDirections("\u001B[<0;34;12M")).toEqual([]);
  });

  it("reduces a burst of wheel reports to a net scroll delta", () => {
    expect(sumMouseWheelDirections(["down", "down", "up"])).toBe(1);
    expect(sumMouseWheelDirections(["up", "down"])).toBe(0);
  });

  it("detects stripped mouse reports that Ink forwards to useInput", () => {
    expect(isTerminalMouseReport("[<0;55;9M[<0;55;9m")).toBe(true);
    expect(stripTerminalMouseReports("[<0;55;9M[<0;55;9m")).toBe("");
  });
});
