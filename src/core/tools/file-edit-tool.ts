import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Tool, ToolContext, ToolResult } from "./types.js";

/**
 * Input contract for line-range replacement edits.
 */
export interface FileEditInput {
  path: string;
  startLine: number;
  endLine: number;
  newContent: string;
}

/**
 * Performs deterministic line-range replacement within a UTF-8 workspace file.
 */
export class FileEditTool implements Tool<FileEditInput> {
  name = "file_edit";
  description = "Edit a file by replacing a specific line range.";
  inputSchema = {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Relative file path to edit.",
      },
      startLine: {
        type: "number",
        description: "1-based inclusive start line.",
      },
      endLine: {
        type: "number",
        description: "1-based inclusive end line.",
      },
      newContent: {
        type: "string",
        description: "Replacement content for the selected line range.",
      },
    },
    required: ["path", "startLine", "endLine", "newContent"],
    additionalProperties: false,
  };

  /**
   * Replaces the inclusive line range with new content. Line numbers are 1-based
   * so they match editor and LLM-oriented file references.
   */
  async execute(input: FileEditInput, context: ToolContext): Promise<ToolResult> {
    const filePath = path.resolve(context.cwd, input.path);
    const before = await readFile(filePath, "utf8");
    const lines = before.split("\n");
    const startIndex = input.startLine - 1;
    const endIndex = input.endLine - 1;

    if (
      input.startLine < 1 ||
      input.endLine < input.startLine ||
      startIndex >= lines.length ||
      endIndex >= lines.length
    ) {
      return {
        success: false,
        text: `Invalid line range for ${filePath}`,
        metadata: { path: filePath },
      };
    }

    const replacementLines = input.newContent.split("\n");
    const after = [
      ...lines.slice(0, startIndex),
      ...replacementLines,
      ...lines.slice(endIndex + 1),
    ].join("\n");
    await writeFile(filePath, after, "utf8");

    return {
      success: true,
      text: `Updated ${filePath}`,
      metadata: {
        path: filePath,
        changed: before !== after,
        startLine: input.startLine,
        endLine: input.endLine,
      },
    };
  }
}
