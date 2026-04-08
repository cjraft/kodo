import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { resolveAppConfig } from "../../src/bootstrap/index.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

describe("resolveAppConfig", () => {
  it("lets local .env override conflicting shell variables", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "kodo-bootstrap-"));
    tempDirs.push(dir);

    await writeFile(
      path.join(dir, ".env"),
      [
        "KODO_MODEL_PROVIDER=kimi",
        "KODO_MODEL_API_KEY=sk-kimi-from-dotenv",
        "KODO_MODEL_BASE_URL=https://api.kimi.com/coding/",
        "KODO_MODEL_NAME=k2p5",
        'KODO_THEME_ACCENT="#c9a7ff"',
      ].join("\n"),
      "utf8",
    );

    const config = resolveAppConfig(["--cwd", dir], {
      KODO_MODEL_PROVIDER: "openai",
      KODO_MODEL_API_KEY: "shell-key",
      KODO_MODEL_BASE_URL: "https://api.openai.com/v1",
      KODO_MODEL_NAME: "gpt-4.1-mini",
    });

    expect(config.llm).toMatchObject({
      providerId: "kimi-coding",
      apiKey: "sk-kimi-from-dotenv",
      baseUrl: "https://api.kimi.com/coding/",
      model: "k2p5",
    });
    expect(config.ui.accentColor).toBe("#c9a7ff");
  });

  it("enables replay debug mode from the CLI", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "kodo-bootstrap-replay-"));
    tempDirs.push(dir);
    const config = resolveAppConfig(["--cwd", dir, "--debug-replay"], {});

    expect(config.debug.replay).toBe(true);
    expect(config.llm.model).toBe("replay");
  });
});
