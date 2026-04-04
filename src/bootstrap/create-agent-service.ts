import { AgentRuntime } from "../core/agent/runtime.js";
import type { AgentService } from "../core/agent/types.js";
import { ContextBuilder } from "../core/context/builder.js";
import { createPiAiClient } from "../core/llm/client.js";
import { SessionStore } from "../core/session/store.js";
import { ToolRegistry } from "../core/tools/registry.js";
import type { AppConfig } from "./config.js";

/**
 * Fully assembled application surface exposed after bootstrap.
 */
export interface BootstrappedApp {
  config: AppConfig;
  agent: AgentService;
}

/**
 * Instantiates the runtime services from typed app config produced during bootstrap.
 */
export const createAgentService = (config: AppConfig): BootstrappedApp => {
  const llm = createPiAiClient(config.llm);
  const store = new SessionStore(config.storeRoot);
  const tools = new ToolRegistry(config.tools);
  const contextBuilder = new ContextBuilder(config.context);
  const agent = new AgentRuntime({
    cwd: config.cwd,
    store,
    tools,
    llm,
    loop: config.agent.loop,
    contextBuilder
  });

  return {
    config,
    agent
  };
};
