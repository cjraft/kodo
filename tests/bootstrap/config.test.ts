import { describe, expect, it } from "vitest";
import {
  loadAppConfig,
  type BootstrapOptions,
  mergeBootstrapOptions
} from "../../src/bootstrap/config.js";

const createOptions = (
  overrides: Partial<BootstrapOptions> = {}
): BootstrapOptions => ({
  common: {},
  providers: {},
  ...overrides
});

describe("loadAppConfig", () => {
  it("lets cli values override environment values", () => {
    const options = mergeBootstrapOptions(
      {
        provider: "openai",
        model: "gpt-4.1",
        maxMessages: 10,
        allowDangerousBash: false
      },
      {
        common: {
          provider: "kimi",
          model: "k2p5",
          maxMessages: 20,
          allowDangerousBash: true
        },
        providers: {
          openai: {
            apiKey: "openai-key"
          }
        }
      }
    );

    expect(options.common.provider).toBe("openai");
    expect(options.common.model).toBe("gpt-4.1");
    expect(options.common.maxMessages).toBe(10);
    expect(options.common.allowDangerousBash).toBe(false);
    expect(options.providers.openai?.apiKey).toBe("openai-key");
  });

  it("derives runtime defaults from merged bootstrap options", () => {
    const config = loadAppConfig(
      createOptions({
        common: {
          cwd: "/workspace/project",
          provider: "openai"
        },
        providers: {
          openai: {
            apiKey: "openai-key"
          }
        }
      }),
      {
        cwd: "/fallback/cwd",
        homeDir: "/Users/tester"
      }
    );

    expect(config.cwd).toBe("/workspace/project");
    expect(config.storeRoot).toBe("/workspace/project/.kodo");
    expect(config.skillsRoot).toBe("/Users/tester/.kodo/skills");
    expect(config.ui.accentColor).toBe("#d6b3ff");
    expect(config.llm.providerId).toBe("openai");
    expect(config.context.maxInputTokens).toBe(111616);
  });

  it("accepts a configured ui theme accent", () => {
    const config = loadAppConfig(
      createOptions({
        common: {
          provider: "openai",
          themeAccent: "#c8a2ff"
        },
        providers: {
          openai: {
            apiKey: "openai-key"
          }
        }
      })
    );

    expect(config.ui.accentColor).toBe("#c8a2ff");
  });
});
