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

  it("accepts object input with a command property", async () => {
    const tool = new BashTool({
      timeoutMs: 1_000,
      maxOutputChars: 2_000,
      allowDangerousCommands: false
    });

    const result = await tool.execute(
      { command: "printf 'README.md'" },
      {
        cwd: process.cwd()
      }
    );

    expect(result.success).toBe(true);
    expect(result.text).toBe("README.md");
  });

  it("surfaces a timeout message instead of an empty truncation marker", async () => {
    const tool = new BashTool({
      timeoutMs: 50,
      maxOutputChars: 256,
      allowDangerousCommands: false
    });

    const result = await tool.execute(
      { command: "sleep 1" },
      {
        cwd: process.cwd()
      }
    );

    expect(result.success).toBe(false);
    expect(result.metadata?.timedOut).toBe(true);
    expect(result.text).toContain("[command timed out after 50ms]");
  });
});
