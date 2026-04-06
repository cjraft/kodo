import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { FileEditTool } from "../../../src/core/tools/file-edit-tool.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

describe("FileEditTool", () => {
  it("replaces the requested line range", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "kodo-file-edit-"));
    tempDirs.push(dir);

    const filePath = path.join(dir, "sample.txt");
    await writeFile(filePath, "line1\nline2\nline3\nline4\n", "utf8");

    const tool = new FileEditTool();
    const result = await tool.execute(
      {
        path: "sample.txt",
        startLine: 2,
        endLine: 3,
        newContent: "updated-a\nupdated-b",
      },
      { cwd: dir },
    );

    const content = await readFile(filePath, "utf8");

    expect(result.success).toBe(true);
    expect(content).toBe("line1\nupdated-a\nupdated-b\nline4\n");
  });
});
