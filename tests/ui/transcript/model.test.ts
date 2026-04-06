import { describe, expect, it } from "vitest";
import {
  buildConversationEntries,
  createMessagePreview,
  createMessageSnippet,
  findLatestExpandableConversationTarget,
  formatClock,
  formatValuePreview,
  resolveConversationLayout,
  selectVisibleConversationSlice,
} from "../../../src/ui/transcript/model.js";

describe("transcript helpers", () => {
  it("compresses whitespace when building message snippets", () => {
    expect(
      createMessageSnippet(
        {
          id: "m1",
          role: "assistant",
          text: "hello\n\nworld",
          createdAt: "2026-04-05T12:00:00.000Z",
        },
        20,
      ),
    ).toBe("hello world");
  });

  it("formats stable clock labels", () => {
    expect(formatClock("2026-04-05T03:04:05.000Z")).toBe("03:04");
  });

  it("serializes tool payload previews into one compact line", () => {
    expect(formatValuePreview({ file: "README.md", recursive: false }, 40)).toBe(
      '{"file":"README.md","recursive":false}',
    );
  });

  it("builds a conversation timeline with tool calls included", () => {
    const entries = buildConversationEntries(
      [
        {
          id: "m1",
          role: "user",
          text: "read readme",
          createdAt: "2026-04-05T12:00:00.000Z",
        },
        {
          id: "m2",
          role: "assistant",
          text: "",
          toolCalls: [{ id: "t1", toolName: "ReadFile", input: {} }],
          createdAt: "2026-04-05T12:00:01.000Z",
        },
        {
          id: "m3",
          role: "tool",
          text: "README content",
          toolName: "ReadFile",
          toolCallId: "t1",
          createdAt: "2026-04-05T12:00:03.000Z",
        },
      ],
      [
        {
          id: "t1",
          toolName: "ReadFile",
          input: { file: "README.md" },
          createdAt: "2026-04-05T12:00:02.000Z",
        },
      ],
    );

    expect(entries.map((entry) => entry.kind)).toEqual(["message", "tool-call", "message"]);
  });

  it("builds the full conversation timeline without windowing it", () => {
    const entries = buildConversationEntries(
      [
        {
          id: "m1",
          role: "user",
          text: "first",
          createdAt: "2026-04-05T12:00:00.000Z",
        },
        {
          id: "m2",
          role: "assistant",
          text: "second",
          createdAt: "2026-04-05T12:00:01.000Z",
        },
        {
          id: "m3",
          role: "tool",
          text: "third",
          toolName: "file_read",
          toolCallId: "t1",
          createdAt: "2026-04-05T12:00:03.000Z",
        },
      ],
      [
        {
          id: "t1",
          toolName: "file_read",
          input: { path: "README.md" },
          createdAt: "2026-04-05T12:00:02.000Z",
        },
      ],
    );

    expect(entries.map((entry) => entry.id)).toEqual([
      "message:m1",
      "message:m2",
      "tool:t1",
      "message:m3",
    ]);
  });

  it("selects a visible transcript slice from the bottom row budget", () => {
    const entries = buildConversationEntries(
      [
        {
          id: "m1",
          role: "user",
          text: "first",
          createdAt: "2026-04-05T12:00:00.000Z",
        },
        {
          id: "m2",
          role: "assistant",
          text: "second",
          createdAt: "2026-04-05T12:00:01.000Z",
        },
        {
          id: "m3",
          role: "assistant",
          text: "third",
          createdAt: "2026-04-05T12:00:02.000Z",
        },
      ],
      [],
    );

    const slice = selectVisibleConversationSlice(entries, 5, 80, 0);

    expect(slice.entries.map((entry) => entry.id)).toEqual(["message:m2", "message:m3"]);
    expect(slice.hasOlder).toBe(true);
    expect(slice.hasNewer).toBe(false);
  });

  it("respects row-based scroll back from the live edge", () => {
    const entries = buildConversationEntries(
      [
        {
          id: "m1",
          role: "user",
          text: "first",
          createdAt: "2026-04-05T12:00:00.000Z",
        },
        {
          id: "m2",
          role: "assistant",
          text: "second",
          createdAt: "2026-04-05T12:00:01.000Z",
        },
        {
          id: "m3",
          role: "assistant",
          text: "third",
          createdAt: "2026-04-05T12:00:02.000Z",
        },
      ],
      [],
    );

    const slice = selectVisibleConversationSlice(entries, 5, 80, 3);

    expect(slice.entries.map((entry) => entry.id)).toEqual(["message:m1", "message:m2"]);
    expect(slice.hasOlder).toBe(true);
    expect(slice.hasNewer).toBe(true);
  });

  it("renders assistant previews across multiple wrapped rows before truncating", () => {
    const preview = createMessagePreview(
      {
        id: "m1",
        role: "assistant",
        text: "0123456789012345678901234567890123456789",
        createdAt: "2026-04-05T12:00:00.000Z",
      },
      resolveConversationLayout(16),
    );

    expect(preview.text.split("\n")).toEqual([
      "01234567",
      "89012345",
      "67890123",
      "45678901",
      "23456789",
    ]);
    expect(preview.isTruncated).toBe(false);
  });

  it("keeps older assistant previews collapsed by default", () => {
    const preview = createMessagePreview(
      {
        id: "m1",
        role: "assistant",
        text: "0123456789".repeat(8),
        createdAt: "2026-04-05T12:00:00.000Z",
      },
      resolveConversationLayout(16),
    );

    expect(preview.isTruncated).toBe(true);
  });

  it("does not truncate the latest model output when expanded preview is requested", () => {
    const preview = createMessagePreview(
      {
        id: "m1",
        role: "assistant",
        text: "0123456789".repeat(8),
        createdAt: "2026-04-05T12:00:00.000Z",
      },
      resolveConversationLayout(16),
      { expanded: true },
    );

    expect(preview.isTruncated).toBe(false);
    expect(preview.text.split("\n")).toHaveLength(10);
  });

  it("finds the newest truncated assistant or tool output for expansion", () => {
    const target = findLatestExpandableConversationTarget(
      [
        {
          id: "m1",
          role: "assistant",
          text: "short",
          createdAt: "2026-04-05T12:00:00.000Z",
        },
        {
          id: "m2",
          role: "tool",
          text: "1234567890".repeat(12),
          toolName: "file_read",
          toolCallId: "t1",
          createdAt: "2026-04-05T12:00:03.000Z",
        },
      ],
      [
        {
          id: "t1",
          toolName: "file_read",
          input: { path: "README.md" },
          createdAt: "2026-04-05T12:00:02.000Z",
        },
      ],
      12,
    );

    expect(target).toMatchObject({
      id: "message:m2",
      title: "file_read output",
      createdAt: "2026-04-05T12:00:03.000Z",
    });
    expect(target?.content.startsWith("1234567890")).toBe(true);
  });
});
