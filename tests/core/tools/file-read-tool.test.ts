import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { FileReadTool } from "../../../src/core/tools/file-read-tool.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.map((dir) => rm(dir, { recursive: true, force: true }))
  );
  tempDirs.length = 0;
});

describe("FileReadTool", () => {
  it("accepts object input with a path", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "kodo-file-read-"));
    tempDirs.push(dir);

    await writeFile(path.join(dir, "sample.txt"), "hello", "utf8");

    const tool = new FileReadTool();
    const result = await tool.execute({ path: "sample.txt" }, { cwd: dir });

    expect(result.success).toBe(true);
    expect(result.text).toBe("hello");
  });
});
