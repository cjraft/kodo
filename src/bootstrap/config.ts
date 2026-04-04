import os from "node:os";
import path from "node:path";
import { resolveAgentLoopConfig } from "../core/agent/config.js";
import type { AgentLoopConfig } from "../core/agent/types.js";
import {
  resolveContextBuilderConfig,
  type ContextBuilderConfig
} from "../core/context/builder.js";
import type { PiAiClientConfig } from "../core/llm/client.js";
import type { ToolRegistryConfig } from "../core/tools/registry.js";
import { resolveBashToolConfig } from "../core/tools/bash-tool.js";
import type { CliOptions } from "./cli-options.js";
import type {
  BootstrapCommonOptions,
  BootstrapEnv,
  ProviderLlmOptions
} from "./env.js";
import { buildLlmConfig } from "./llm-config.js";

/**
 * Fully typed runtime config consumed by the rest of the application.
 */
export interface AppConfig {
  cwd: string;
  storeRoot: string;
  skillsRoot: string;
  agent: {
    loop: AgentLoopConfig;
  };
  context: ContextBuilderConfig;
  tools: ToolRegistryConfig;
  llm: PiAiClientConfig;
}

/**
 * Bootstrap-layer input after merging CLI and environment sources.
 */
export interface BootstrapOptions {
  common: BootstrapCommonOptions;
  providers: Record<string, ProviderLlmOptions | undefined>;
}

const mergeDefined = <T extends object>(
  ...sources: Array<Partial<T> | undefined>
): T => Object.assign({}, ...sources);

/**
 * Applies the single bootstrap precedence rule: CLI overrides environment input.
 */
export const mergeBootstrapOptions = (
  cli: CliOptions,
  env: BootstrapEnv
): BootstrapOptions => ({
  common: mergeDefined<BootstrapCommonOptions>(env.common, cli),
  providers: {
    ...env.providers
  }
});

/**
 * Converts merged bootstrap inputs into the typed runtime config used by the app.
 */
export const loadAppConfig = (
  options: BootstrapOptions,
  runtime = {
    cwd: process.cwd(),
    homeDir: os.homedir()
  }
): AppConfig => {
  const cwd = options.common.cwd?.trim() || runtime.cwd;
  const llm = buildLlmConfig(options);
  const context: ContextBuilderConfig = resolveContextBuilderConfig(
    {
      maxInputTokens: options.common.maxInputTokens,
      maxMessages: options.common.maxMessages
    },
    llm
  );
  const tools: ToolRegistryConfig = {
    bash: resolveBashToolConfig({
      timeoutMs: options.common.bashTimeoutMs,
      maxOutputChars: options.common.bashMaxOutputChars,
      allowDangerousCommands: options.common.allowDangerousBash
    })
  };
  const agent = {
    loop: resolveAgentLoopConfig({
      maxToolIterations: options.common.maxToolIterations
    }) satisfies AgentLoopConfig
  };

  return {
    cwd,
    storeRoot: options.common.storeRoot?.trim() || path.join(cwd, ".kodo"),
    skillsRoot:
      options.common.skillsRoot?.trim() ||
      path.join(runtime.homeDir, ".kodo", "skills"),
    agent,
    context,
    tools,
    llm
  };
};
