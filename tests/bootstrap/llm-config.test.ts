import { describe, expect, it } from "vitest";
import type { BootstrapOptions } from "../../src/bootstrap/config.js";
import { buildLlmConfig } from "../../src/bootstrap/llm-config.js";

const createOptions = (overrides: Partial<BootstrapOptions> = {}): BootstrapOptions => ({
  common: {},
  providers: {},
  ...overrides,
});

describe("buildLlmConfig", () => {
  it("infers the kimi profile from provider-specific env values", () => {
    const config = buildLlmConfig(
      createOptions({
        providers: {
          "kimi-coding": {
            apiKey: "kimi-key",
          },
        },
      }),
    );

    expect(config).toMatchObject({
      providerId: "kimi-coding",
      apiKey: "kimi-key",
      baseUrl: "https://api.kimi.com/coding/",
      model: "k2p5",
      reasoning: "medium",
      maxOutputTokens: 32768,
      contextWindow: 262144,
    });
  });

  it("uses merged common options before provider-specific defaults", () => {
    const config = buildLlmConfig(
      createOptions({
        common: {
          provider: "kimi",
          apiKey: "shared-key",
          model: "k2p5",
          reasoningEffort: "high",
        },
        providers: {
          "kimi-coding": {
            apiKey: "provider-key",
            model: "kimi-k2-thinking",
          },
        },
      }),
    );

    expect(config.providerId).toBe("kimi-coding");
    expect(config.apiKey).toBe("shared-key");
    expect(config.model).toBe("k2p5");
    expect(config.reasoning).toBe("high");
  });

  it("supports explicit generic providers without hard-coded branches", () => {
    const config = buildLlmConfig(
      createOptions({
        common: {
          provider: "deepseek",
          apiKey: "deepseek-key",
          baseUrl: "https://api.deepseek.com/v1",
          model: "deepseek-chat",
        },
      }),
    );

    expect(config).toMatchObject({
      providerId: "deepseek",
      apiKey: "deepseek-key",
      baseUrl: "https://api.deepseek.com/v1",
      model: "deepseek-chat",
    });
  });

  it("requires an explicit provider when only generic options are set", () => {
    expect(() =>
      buildLlmConfig(
        createOptions({
          common: {
            apiKey: "shared-key",
            model: "gpt-4.1-mini",
          },
        }),
      ),
    ).toThrow("KODO_MODEL_PROVIDER or --provider is required");
  });

  it("fails fast when multiple provider-specific configs are present", () => {
    expect(() =>
      buildLlmConfig(
        createOptions({
          providers: {
            "kimi-coding": {
              apiKey: "kimi-key",
            },
            openai: {
              apiKey: "openai-key",
            },
          },
        }),
      ),
    ).toThrow("Multiple LLM providers are configured");
  });
});
