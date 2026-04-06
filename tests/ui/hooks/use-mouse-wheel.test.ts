import { describe, expect, it } from "vitest";
import {
  detectMouseWheelDirections,
  isTerminalMouseReport,
  stripTerminalMouseReports,
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

  it("detects stripped mouse reports that Ink forwards to useInput", () => {
    expect(isTerminalMouseReport("[<0;55;9M[<0;55;9m")).toBe(true);
    expect(stripTerminalMouseReports("[<0;55;9M[<0;55;9m")).toBe("");
  });
});
