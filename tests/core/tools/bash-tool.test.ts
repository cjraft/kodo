import { describe, expect, it } from "vitest";
import { BashTool } from "../../../src/core/tools/bash-tool.js";

describe("BashTool", () => {
  it("blocks dangerous commands by default", async () => {
    const tool = new BashTool({
      timeoutMs: 1_000,
      maxOutputChars: 2_000,
      allowDangerousCommands: false
    });

    const result = await tool.execute("rm -rf /", {
      cwd: process.cwd()
    });

    expect(result.success).toBe(false);
    expect(result.metadata?.blocked).toBe(true);
  });
});
