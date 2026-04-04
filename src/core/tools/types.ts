/**
 * Execution context passed to tools. Tools receive only the scoped data they
 * need, rather than reaching into process globals.
 */
export interface ToolContext {
  cwd: string;
}

/**
 * Tool metadata exposed to the model for tool selection and argument shaping.
 */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

/**
 * Normalized result contract shared by all tools.
 */
export interface ToolResult {
  success: boolean;
  text: string;
  metadata?: Record<string, unknown>;
}

/**
 * Capability boundary for an individual tool.
 */
export interface Tool<Input = unknown> {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute(input: Input, context: ToolContext): Promise<ToolResult>;
}
