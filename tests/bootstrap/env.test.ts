import { describe, expect, it } from "vitest";
import { readBootstrapEnv } from "../../src/bootstrap/env.js";

describe("readBootstrapEnv", () => {
  it("maps unified MODEL_* variables into bootstrap common options", () => {
    const env = readBootstrapEnv({
      MODEL_PROVIDER: "openai",
      MODEL_API_KEY: "openai-key",
      MODEL_BASE_URL: "https://api.openai.com/v1",
      MODEL_NAME: "gpt-4.1-mini",
      MODEL_REASONING_EFFORT: "medium",
      MODEL_MAX_OUTPUT_TOKENS: "2048",
      MODEL_CONTEXT_WINDOW: "16384"
    });

    expect(env.common).toMatchObject({
      provider: "openai",
      apiKey: "openai-key",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4.1-mini",
      reasoningEffort: "medium",
      maxOutputTokens: 2048,
      contextWindow: 16384
    });
    expect(env.providers).toEqual({});
  });

  it("ignores removed legacy provider variables", () => {
    const env = readBootstrapEnv({
      KODO_PROVIDER: "openai",
      OPENAI_API_KEY: "legacy-key",
      OPENAI_BASE_URL: "https://api.openai.com/v1",
      OPENAI_MODEL: "gpt-4.1-mini"
    });

    expect(env.common.provider).toBeUndefined();
    expect(env.common.apiKey).toBeUndefined();
    expect(env.common.baseUrl).toBeUndefined();
    expect(env.common.model).toBeUndefined();
    expect(env.providers).toEqual({});
  });
});
