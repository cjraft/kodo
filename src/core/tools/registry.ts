import { BashTool } from "./bash-tool.js";
import { FileEditTool } from "./file-edit-tool.js";
import { FileReadTool } from "./file-read-tool.js";
import { FileWriteTool } from "./file-write-tool.js";
import type { BashToolOptions } from "./bash-tool.js";
import type { Tool, ToolContext, ToolDefinition, ToolResult } from "./types.js";

/**
 * Tool-specific config assembled during bootstrap.
 */
export interface ToolRegistryConfig {
  bash?: BashToolOptions;
}

/**
 * Central tool catalog owned by the agent layer. It exposes model-safe tool
 * definitions and dispatches executions by normalized tool name.
 */
export class ToolRegistry {
  private readonly tools = new Map<string, Tool>();

  constructor(config: ToolRegistryConfig = {}) {
    this.register(new BashTool(config.bash));
    this.register(new FileReadTool());
    this.register(new FileWriteTool());
    this.register(new FileEditTool());
  }

  /**
   * Registers or replaces a tool by name.
   */
  register(tool: Tool) {
    this.tools.set(tool.name, tool);
  }

  /**
   * Returns the tool metadata projected into the provider-facing shape.
   */
  listDefinitions(): ToolDefinition[] {
    return [...this.tools.values()].map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));
  }

  /**
   * Executes a tool by name and normalizes unknown-tool failures into the standard contract.
   */
  async execute(toolName: string, input: unknown, context: ToolContext): Promise<ToolResult> {
    const tool = this.tools.get(toolName);

    if (!tool) {
      return {
        success: false,
        text: `Unknown tool: ${toolName}`,
      };
    }

    return tool.execute(input as never, context);
  }
}
