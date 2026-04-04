import {describe, expect, it} from "vitest";
import {createPiAiClient} from "../../../src/core/llm/client.js";

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
});
