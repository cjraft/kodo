import type { AgentLoopConfig } from "./types.js";

/**
 * Optional bootstrap inputs for agent loop behavior.
 */
export interface AgentLoopOptions {
  maxToolIterations?: number;
}

/**
 * Conservative defaults for one run's tool budget.
 */
export const DEFAULT_AGENT_LOOP_CONFIG: AgentLoopConfig = {
  maxToolIterations: 8
};

/**
 * Resolves agent loop config from optional bootstrap overrides.
 */
export const resolveAgentLoopConfig = (
  options: AgentLoopOptions = {}
): AgentLoopConfig => ({
  maxToolIterations:
    options.maxToolIterations ?? DEFAULT_AGENT_LOOP_CONFIG.maxToolIterations
});
