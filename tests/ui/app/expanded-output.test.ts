import { describe, expect, it } from "vitest";
import { resolveExpandedOutputState } from "../../../src/ui/app/expanded-output.js";

describe("expanded output state", () => {
  it("exposes the latest expandable output and shows the inline hint until the full view opens", () => {
    const state = resolveExpandedOutputState({
      messages: [
        {
          id: "assistant-1",
          role: "assistant",
          text: "line 1\nline 2\nline 3\nline 4\nline 5\nline 6\nline 7",
          createdAt: "2025-01-01T00:00:00.000Z",
        },
      ],
      toolCalls: [],
      width: 40,
      expandedOutputOpen: false,
    });

    expect(state.hasExpandableOutput).toBe(true);
    expect(state.latestExpandableOutput?.title).toBe("assistant output");
    expect(state.expandHintVisible).toBe(true);
    expect(state.expandedOutputOpen).toBe(false);
  });

  it("suppresses the full-view state when no expandable output exists", () => {
    const state = resolveExpandedOutputState({
      messages: [
        {
          id: "assistant-1",
          role: "assistant",
          text: "short reply",
          createdAt: "2025-01-01T00:00:00.000Z",
        },
      ],
      toolCalls: [],
      width: 80,
      expandedOutputOpen: true,
    });

    expect(state.hasExpandableOutput).toBe(false);
    expect(state.latestExpandableOutput).toBeNull();
    expect(state.expandHintVisible).toBe(false);
    expect(state.expandedOutputOpen).toBe(false);
  });
});
