import { describe, expect, it } from "vitest";
import {
  buildPiAiContext,
  createPiAiClient
} from "../../../src/core/llm/client.js";

describe("PiAiClient", () => {
  it("keeps kimi on the anthropic-style transport", () => {
    const client = createPiAiClient({
      providerId: "kimi-coding",
      model: "k2p5",
      apiKey: "test-key",
      baseUrl: "https://api.kimi.com/coding/",
      reasoning: "medium",
      maxOutputTokens: 32_768,
      contextWindow: 262_144
    });

    expect(client.name).toBe("pi-ai/kimi-coding");
    expect(client.getDebugSnapshot().model).toMatchObject({
      api: "anthropic-messages",
      baseUrl: "https://api.kimi.com/coding/",
      id: "k2p5"
    });
  });

  it("preserves tool failure state in provider context", () => {
    const client = createPiAiClient({
      providerId: "kimi-coding",
      model: "k2p5",
      apiKey: "test-key",
      baseUrl: "https://api.kimi.com/coding/",
      reasoning: "medium",
      maxOutputTokens: 32_768,
      contextWindow: 262_144
    });

    const context = buildPiAiContext(
      {
        cwd: "/tmp/workspace",
        tools: [],
        messages: [
          {
            id: "tool-message",
            role: "tool",
            text: "[command timed out after 50ms]",
            toolName: "bash",
            toolCallId: "tool-1",
            toolError: true,
            createdAt: "2026-04-06T00:00:00.000Z"
          }
        ]
      },
      client.getDebugSnapshot().model
    );

    expect(context.messages).toHaveLength(1);
    expect(context.messages[0]).toMatchObject({
      role: "toolResult",
      toolName: "bash",
      toolCallId: "tool-1",
      isError: true
    });
  });
});
