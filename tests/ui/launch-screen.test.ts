import { describe, expect, it } from "vitest";
import {
  buildConversationEntries,
  createMessageSnippet,
  formatClock,
  formatSessionLabel,
  formatToolCallSummary,
  formatValuePreview,
  getPhaseLabel,
  getStatusTone,
  shortenPath
} from "../../src/ui/launch-screen.js";

describe("launch-screen helpers", () => {
  it("shortens long cwd paths to the last segments", () => {
    expect(
      shortenPath("/Users/bytedance/Documents/projects/personal/kodo")
    ).toBe(".../projects/personal/kodo");
  });

  it("keeps short paths unchanged", () => {
    expect(shortenPath("/tmp/kodo")).toBe("/tmp/kodo");
  });

  it("compresses whitespace when building message snippets", () => {
    expect(
      createMessageSnippet(
        {
          id: "m1",
          role: "assistant",
          text: "hello\n\nworld",
          createdAt: "2026-04-05T12:00:00.000Z"
        },
        20
      )
    ).toBe("hello world");
  });

  it("formats tool call summaries with result state", () => {
    expect(
      formatToolCallSummary({
        id: "t1",
        toolName: "bash",
        input: {},
        createdAt: "2026-04-05T12:00:00.000Z"
      })
    ).toBe("OK  bash");

    expect(
      formatToolCallSummary({
        id: "t2",
        toolName: "file-write",
        input: {},
        createdAt: "2026-04-05T12:00:00.000Z",
        isError: true
      })
    ).toBe("ERR file-write");
  });

  it("maps runtime state to readable phase labels", () => {
    expect(getPhaseLabel(false, "idle")).toBe("standby");
    expect(getPhaseLabel(true, "thinking")).toBe("planning");
    expect(getPhaseLabel(true, "tool-running")).toBe("toolchain");
  });

  it("classifies status tone for prominent alerts", () => {
    expect(getStatusTone("Run failed: boom")).toBe("red");
    expect(getStatusTone("Running bash...")).toBe("magenta");
    expect(getStatusTone("Session abcd1234 started")).toBe("magentaBright");
  });

  it("formats stable session and clock labels", () => {
    expect(formatSessionLabel("1234567890")).toBe("12345678");
    expect(formatSessionLabel()).toBe("--------");
    expect(formatClock("2026-04-05T03:04:05.000Z")).toBe("03:04");
  });

  it("serializes tool payload previews into one compact line", () => {
    expect(
      formatValuePreview({ file: "README.md", recursive: false }, 40)
    ).toBe('{"file":"README.md","recursive":false}');
  });

  it("builds a conversation timeline with tool calls included", () => {
    const entries = buildConversationEntries(
      [
        {
          id: "m1",
          role: "user",
          text: "read readme",
          createdAt: "2026-04-05T12:00:00.000Z"
        },
        {
          id: "m2",
          role: "assistant",
          text: "",
          toolCalls: [{ id: "t1", toolName: "ReadFile", input: {} }],
          createdAt: "2026-04-05T12:00:01.000Z"
        },
        {
          id: "m3",
          role: "tool",
          text: "README content",
          toolName: "ReadFile",
          toolCallId: "t1",
          createdAt: "2026-04-05T12:00:03.000Z"
        }
      ],
      [
        {
          id: "t1",
          toolName: "ReadFile",
          input: { file: "README.md" },
          createdAt: "2026-04-05T12:00:02.000Z"
        }
      ]
    );

    expect(entries.map((entry) => entry.kind)).toEqual([
      "message",
      "tool-call",
      "message"
    ]);
  });
});
