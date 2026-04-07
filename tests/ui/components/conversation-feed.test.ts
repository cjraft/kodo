import { describe, expect, it } from "vitest";
import { buildConversationEntries, resolveConversationLayout } from "../../../src/ui/transcript/model.js";
import { resolveExpandedEntryId } from "../../../src/ui/components/ConversationFeed/use-conversation-feed.js";

describe("conversation feed expansion", () => {
  it("keeps oversized latest output collapsed so transcript scrolling can move past it", () => {
    const entries = buildConversationEntries(
      [
        {
          id: "m1",
          role: "user",
          text: "inspect the replay transcript",
          createdAt: "2026-04-07T09:32:29.404Z",
        },
        {
          id: "m2",
          role: "assistant",
          text: "working on it",
          createdAt: "2026-04-07T09:32:30.404Z",
        },
        {
          id: "m3",
          role: "assistant",
          text: "0123456789".repeat(80),
          createdAt: "2026-04-07T09:32:31.404Z",
        },
      ],
      [],
    );

    expect(resolveExpandedEntryId(entries, resolveConversationLayout(40), 8)).toBeNull();
  });

  it("keeps modest latest output expanded inline when it fits in the viewport", () => {
    const entries = buildConversationEntries(
      [
        {
          id: "m1",
          role: "user",
          text: "inspect the replay transcript",
          createdAt: "2026-04-07T09:32:29.404Z",
        },
        {
          id: "m2",
          role: "assistant",
          text: "working on it",
          createdAt: "2026-04-07T09:32:30.404Z",
        },
      ],
      [],
    );

    expect(resolveExpandedEntryId(entries, resolveConversationLayout(80), 12)).toBe("message:m2");
  });
});
