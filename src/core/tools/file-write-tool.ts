import { writeFile } from "node:fs/promises";
import path from "node:path";
import { ensureDir } from "../../lib/fs.js";
import type { Tool, ToolContext, ToolResult } from "./types.js";

/**
 * Input contract for overwriting or creating a UTF-8 workspace file.
 */
export interface FileWriteInput {
  path: string;
  content: string;
}

/**
 * Writes a complete UTF-8 file payload into the workspace.
 */
export class FileWriteTool implements Tool<FileWriteInput> {
  name = "file_write";
  description = "Write a UTF-8 text file in the workspace.";
  inputSchema = {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Relative file path to write."
      },
      content: {
        type: "string",
        description: "Full file content."
      }
    },
    required: ["path", "content"],
    additionalProperties: false
  };

  /**
   * Creates parent directories on demand before writing the full file contents.
   */
  async execute(
    input: FileWriteInput,
    context: ToolContext
  ): Promise<ToolResult> {
    const filePath = path.resolve(context.cwd, input.path);
    await ensureDir(path.dirname(filePath));
    await writeFile(filePath, input.content, "utf8");

    return {
      success: true,
      text: `Wrote ${input.content.length} chars to ${filePath}`,
      metadata: { path: filePath }
    };
  }
}
