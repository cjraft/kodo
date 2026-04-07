import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { loadAppConfig, mergeBootstrapOptions, type AppConfig } from "./config.js";
import { parseCliOptions } from "./cli-options.js";
import { readBootstrapEnv } from "./env.js";
import { AgentService } from "../core/agent/service.js";
import { ContextBuilder } from "../core/context/builder.js";
import { createPiAiClient } from "../core/llm/client.js";
import { SessionStore } from "../core/session/store.js";
import { ToolRegistry } from "../core/tools/registry.js";

/**
 * Loads `.env` into the supplied env object before bootstrap validation runs.
 */
const loadDotenvFile = (cwd: string, env: NodeJS.ProcessEnv) => {
  loadDotenv({
    path: path.join(cwd, ".env"),
    override: true,
    processEnv: env,
  });
};

/**
 * Runs the bootstrap sequence in one place so the rest of the app only sees typed config.
 */
export const resolveAppConfig = (argv = process.argv.slice(2), env = process.env): AppConfig => {
  const cli = parseCliOptions(argv);
  loadDotenvFile(cli.cwd ?? process.cwd(), env);
  const bootstrapEnv = readBootstrapEnv(env);
  const options = mergeBootstrapOptions(cli, bootstrapEnv);
  return loadAppConfig(options);
};

/**
 * Fully assembled agent exposed after bootstrap.
 */
export const bootstrapAgent = (config: AppConfig): AgentService => {
  const llm = createPiAiClient(config.llm);
  const store = new SessionStore(config.storeRoot);
  const tools = new ToolRegistry(config.tools);
  const contextBuilder = new ContextBuilder(config.context);

  const agent = new AgentService({
    cwd: config.cwd,
    store,
    tools,
    llm,
    loop: config.agent.loop,
    contextBuilder,
  });

  return agent;
};
