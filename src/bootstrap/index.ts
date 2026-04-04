import path from "node:path";
import { config as loadDotenv } from "dotenv";
import {
  loadAppConfig,
  mergeBootstrapOptions,
  type AppConfig
} from "./config.js";
import {
  createAgentService,
  type BootstrappedApp
} from "./create-agent-service.js";
import { parseCliOptions } from "./cli-options.js";
import { readBootstrapEnv } from "./env.js";

/**
 * Loads `.env` into the supplied env object before bootstrap validation runs.
 */
const loadDotenvFile = (cwd: string, env: NodeJS.ProcessEnv) => {
  loadDotenv({
    path: path.join(cwd, ".env"),
    override: true,
    processEnv: env
  });
};

/**
 * Runs the bootstrap sequence in one place so the rest of the app only sees typed config.
 */
export const resolveAppConfig = (
  argv = process.argv.slice(2),
  env = process.env
): AppConfig => {
  const cli = parseCliOptions(argv);
  loadDotenvFile(cli.cwd ?? process.cwd(), env);
  const bootstrapEnv = readBootstrapEnv(env);
  const options = mergeBootstrapOptions(cli, bootstrapEnv);
  return loadAppConfig(options);
};

export const bootstrapApp = (
  argv = process.argv.slice(2),
  env = process.env
): BootstrappedApp => createAgentService(resolveAppConfig(argv, env));
