import { spawn } from "node:child_process";
import type { Tool, ToolContext, ToolResult } from "./types.js";

/**
 * Effective runtime limits and safety switches for the bash tool.
 */
export interface BashToolConfig {
  timeoutMs: number;
  maxOutputChars: number;
  allowDangerousCommands: boolean;
}

export type BashToolOptions = Partial<BashToolConfig>;

/**
 * Default shell execution policy for local commands.
 */
export const DEFAULT_BASH_TOOL_CONFIG: BashToolConfig = {
  timeoutMs: 15_000,
  maxOutputChars: 12_000,
  allowDangerousCommands: false
};

/**
 * Resolves bash tool config from optional overrides.
 */
export const resolveBashToolConfig = (
  config: BashToolOptions = {}
): BashToolConfig => ({
  ...DEFAULT_BASH_TOOL_CONFIG,
  ...config
});

/**
 * Lightweight denylist for clearly destructive shell commands. This is a guardrail,
 * not a full shell security model.
 */
const DANGEROUS_PATTERNS = [
  /\brm\s+-rf\s+\/($|\s)/,
  /\bmkfs\b/,
  /\bshutdown\b/,
  /\breboot\b/,
  /\bcurl\b.+\|\s*(sh|bash)\b/,
  /\bwget\b.+\|\s*(sh|bash)\b/
];

/**
 * Keeps the tail of long command output, which is usually the part most useful
 * for debugging failures.
 */
const truncateOutput = (value: string, maxOutputChars: number) => {
  if (value.length <= maxOutputChars) {
    return value;
  }

  const tailLength = Math.max(256, Math.floor(maxOutputChars * 0.6));
  return `[output truncated]\n${value.slice(-tailLength)}`;
};

/**
 * Executes shell commands inside the current workspace with bounded output and time.
 */
export class BashTool implements Tool<string> {
  private readonly config: BashToolConfig;
  name = "bash";
  description = "Execute a shell command in the current workspace.";
  inputSchema = {
    type: "string",
    description: "The shell command to execute."
  };

  constructor(config: BashToolOptions = {}) {
    this.config = resolveBashToolConfig(config);
  }

  /**
   * Runs the command in zsh and returns normalized stdout/stderr output.
   */
  async execute(command: string, context: ToolContext): Promise<ToolResult> {
    if (!this.config.allowDangerousCommands) {
      const blocked = DANGEROUS_PATTERNS.some((pattern) =>
        pattern.test(command)
      );

      if (blocked) {
        return {
          success: false,
          text: `Blocked dangerous command: ${command}`,
          metadata: { blocked: true }
        };
      }
    }

    return new Promise((resolve) => {
      const child = spawn("/bin/zsh", ["-lc", command], {
        cwd: context.cwd,
        env: process.env
      });

      let stdout = "";
      let stderr = "";
      let timedOut = false;

      child.stdout.on("data", (chunk) => {
        stdout += String(chunk);
      });

      child.stderr.on("data", (chunk) => {
        stderr += String(chunk);
      });

      const timeout = setTimeout(() => {
        timedOut = true;
        child.kill("SIGTERM");
      }, this.config.timeoutMs);
      const forceKill = setTimeout(() => {
        child.kill("SIGKILL");
      }, this.config.timeoutMs + 1_000);

      child.on("close", (code) => {
        clearTimeout(timeout);
        clearTimeout(forceKill);
        const success = code === 0;
        const text = truncateOutput(
          [stdout.trim(), stderr.trim()].filter(Boolean).join("\n"),
          this.config.maxOutputChars
        );
        resolve({
          success,
          text: text || `(no output, exitCode=${code ?? "unknown"})`,
          metadata: {
            exitCode: code,
            timeoutMs: this.config.timeoutMs,
            timedOut
          }
        });
      });
    });
  }
}
