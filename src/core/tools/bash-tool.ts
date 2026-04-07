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

export interface BashToolInput {
  command: string;
}

/**
 * Default shell execution policy for local commands.
 */
export const DEFAULT_BASH_TOOL_CONFIG: BashToolConfig = {
  timeoutMs: 15_000,
  maxOutputChars: 12_000,
  allowDangerousCommands: false,
};

/**
 * Resolves bash tool config from optional overrides.
 */
export const resolveBashToolConfig = (config: BashToolOptions = {}): BashToolConfig => ({
  ...DEFAULT_BASH_TOOL_CONFIG,
  ...config,
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
  /\bwget\b.+\|\s*(sh|bash)\b/,
];

const ANSI_PATTERN = /\u001B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~]|\][^\u0007]*(?:\u0007|\u001B\\))/g;
const INVISIBLE_CONTROL_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const OUTPUT_TRUNCATION_THRESHOLD_CHARS = 2_000;

const normalizeCommand = (input: string | BashToolInput) => {
  if (typeof input === "string" || input instanceof String) {
    return String(input).trim();
  }

  if (
    input &&
    typeof input === "object" &&
    "command" in input &&
    typeof input.command === "string"
  ) {
    return input.command.trim();
  }

  return "";
};

const normalizeShellOutput = (value: string) =>
  value.replace(ANSI_PATTERN, "").replace(INVISIBLE_CONTROL_PATTERN, "");

const collectVisibleOutput = (stdout: string, stderr: string) =>
  [stdout, stderr]
    .map(normalizeShellOutput)
    .map((value) => value.trim())
    .filter(Boolean)
    .join("\n");

/**
 * Keeps small outputs intact and only builds a head/tail preview for larger payloads.
 */
const truncateOutput = (value: string, maxOutputChars: number) => {
  if (
    value.length <= OUTPUT_TRUNCATION_THRESHOLD_CHARS ||
    value.length <= maxOutputChars
  ) {
    return value;
  }

  const prefix = `[output truncated: ${value.length} chars total]\n`;
  const separator = "\n...\n";
  const previewBudget = Math.max(32, maxOutputChars - prefix.length - separator.length);
  const headLength = Math.max(16, Math.floor(previewBudget * 0.45));
  const tailLength = Math.max(16, previewBudget - headLength);

  return `${prefix}${value.slice(0, headLength)}${separator}${value.slice(-tailLength)}`;
};

/**
 * Executes shell commands inside the current workspace with bounded output and time.
 */
export class BashTool implements Tool<string | BashToolInput> {
  private readonly config: BashToolConfig;
  name = "bash";
  description = "Execute a shell command in the current workspace.";
  inputSchema = {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "The shell command to execute.",
      },
    },
    required: ["command"],
    additionalProperties: false,
  };

  constructor(config: BashToolOptions = {}) {
    this.config = resolveBashToolConfig(config);
  }

  /**
   * Runs the command in zsh and returns normalized stdout/stderr output.
   */
  async execute(input: string | BashToolInput, context: ToolContext): Promise<ToolResult> {
    const command = normalizeCommand(input);

    if (!command) {
      return {
        success: false,
        text: "bash requires a valid command.",
      };
    }

    if (!this.config.allowDangerousCommands) {
      const blocked = DANGEROUS_PATTERNS.some((pattern) => pattern.test(command));

      if (blocked) {
        return {
          success: false,
          text: `Blocked dangerous command: ${command}`,
          metadata: { blocked: true },
        };
      }
    }

    return new Promise((resolve) => {
      const child = spawn("/bin/zsh", ["-lc", command], {
        cwd: context.cwd,
        env: process.env,
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
        const combinedOutput = collectVisibleOutput(stdout, stderr);
        const text = truncateOutput(
          timedOut
            ? [`[command timed out after ${this.config.timeoutMs}ms]`, combinedOutput]
                .filter(Boolean)
                .join("\n")
            : combinedOutput,
          this.config.maxOutputChars,
        );
        resolve({
          success,
          text: text || `(no output, exitCode=${code ?? "unknown"})`,
          metadata: {
            exitCode: code,
            timeoutMs: this.config.timeoutMs,
            timedOut,
          },
        });
      });
    });
  }
}
