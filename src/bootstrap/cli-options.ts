import { Command } from "commander";

/**
 * CLI-owned bootstrap overrides.
 */
export interface CliOptions {
  cwd?: string;
  storeRoot?: string;
  skillsRoot?: string;
  debugReplay?: boolean;
  themeAccent?: string;
  provider?: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  reasoningEffort?: string;
  maxOutputTokens?: number;
  contextWindow?: number;
  maxToolIterations?: number;
  maxInputTokens?: number;
  maxMessages?: number;
  bashTimeoutMs?: number;
  bashMaxOutputChars?: number;
  allowDangerousBash?: boolean;
}

/**
 * Parses integer CLI flags into numbers so downstream config is already typed.
 */
const toOptionalNumber = (value: string) => {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed)) {
    throw new Error(`Expected a number but received: ${value}`);
  }

  return parsed;
};

/**
 * Parses CLI arguments into the provider-neutral bootstrap input shape.
 */
export const parseCliOptions = (argv: string[]): CliOptions => {
  const program = new Command()
    .allowUnknownOption(false)
    .option("--cwd <path>")
    .option("--store-root <path>")
    .option("--skills-root <path>")
    .option("--debug-replay")
    .option("--theme-accent <color>")
    .option("--provider <provider>")
    .option("--api-key <key>")
    .option("--base-url <url>")
    .option("--model <model>")
    .option("--reasoning-effort <level>")
    .option("--max-output-tokens <number>", "maximum output tokens", toOptionalNumber)
    .option("--context-window <number>", "model context window", toOptionalNumber)
    .option("--max-tool-iterations <number>", "maximum tool iterations", toOptionalNumber)
    .option("--max-input-tokens <number>", "maximum context input tokens", toOptionalNumber)
    .option("--max-messages <number>", "maximum context messages", toOptionalNumber)
    .option("--bash-timeout-ms <number>", "bash tool timeout in milliseconds", toOptionalNumber)
    .option(
      "--bash-max-output-chars <number>",
      "maximum bash tool output characters",
      toOptionalNumber,
    )
    .option("--allow-dangerous-bash");

  program.parse(["node", "kodo", ...argv], { from: "node" });

  return program.opts<CliOptions>();
};
