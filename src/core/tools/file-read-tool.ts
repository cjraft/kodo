import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Tool, ToolContext, ToolResult } from "./types.js";

/**
 * Input shape for the file read tool.
 */
export interface FileReadInput {
  path: string;
}

/**
 * Accepts either the structured tool payload or a plain string path to stay
 * tolerant of provider tool argument normalization differences.
 */
const normalizePath = (input: string | FileReadInput) => {
  if (typeof input === "string" || input instanceof String) {
    return String(input).trim();
  }

  if (
    input &&
    typeof input === "object" &&
    "path" in input &&
    typeof input.path === "string"
  ) {
    return input.path.trim();
  }

  return "";
};

/**
 * Reads a UTF-8 text file relative to the current workspace.
 */
export class FileReadTool implements Tool<string | FileReadInput> {
  name = "file_read";
  description = "Read a UTF-8 text file from the workspace.";
  inputSchema = {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Relative file path to read."
      }
    },
    required: ["path"],
    additionalProperties: false
  };

  /**
   * Resolves the relative path against the tool context cwd and returns file contents.
   */
  async execute(
    input: string | FileReadInput,
    context: ToolContext
  ): Promise<ToolResult> {
    const relativePath = normalizePath(input);

    if (!relativePath) {
      return {
        success: false,
        text: "file_read requires a valid path."
      };
    }

    const filePath = path.resolve(context.cwd, relativePath);
    const content = await readFile(filePath, "utf8");

    return {
      success: true,
      text: content,
      metadata: { path: filePath }
    };
  }
}
