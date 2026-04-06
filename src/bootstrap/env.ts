import { cleanEnv, makeValidator } from "envalid";

/**
 * Provider-neutral bootstrap fields that may come from env or CLI.
 */
export interface BootstrapCommonOptions {
  cwd?: string;
  storeRoot?: string;
  skillsRoot?: string;
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
 * Provider-scoped LLM input owned by bootstrap before defaults are applied.
 */
export interface ProviderLlmOptions {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  reasoningEffort?: string;
  maxOutputTokens?: number;
  contextWindow?: number;
}

/**
 * Structured env payload returned by bootstrap env parsing.
 */
export interface BootstrapEnv {
  common: BootstrapCommonOptions;
  providers: Record<string, ProviderLlmOptions | undefined>;
}

/**
 * Treats blank strings as missing so callers only deal with meaningful values.
 */
const optionalString = makeValidator<string | undefined>((value) => {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
});

/**
 * Parses integer env values while preserving `undefined` for missing input.
 */
const optionalNumber = makeValidator<number | undefined>((value) => {
  if (!value?.trim()) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed)) {
    throw new Error(`Expected a number but received: ${value}`);
  }

  return parsed;
});

/**
 * Supports common truthy/falsey env spellings for bootstrap flags.
 */
const optionalBoolean = makeValidator<boolean | undefined>((value) => {
  if (!value?.trim()) {
    return undefined;
  }

  const normalized = value.toLowerCase();

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  throw new Error(`Expected a boolean but received: ${value}`);
});

const optional = <T>(validator: ReturnType<typeof makeValidator<T | undefined>>) =>
  validator({ default: undefined });

/**
 * Bootstrap-owned env contract. Runtime modules should depend on typed config,
 * not read these variables directly.
 */
const ENV_VALIDATORS = {
  MODEL_PROVIDER: optional(optionalString),
  MODEL_API_KEY: optional(optionalString),
  MODEL_BASE_URL: optional(optionalString),
  MODEL_NAME: optional(optionalString),
  MODEL_REASONING_EFFORT: optional(optionalString),
  MODEL_MAX_OUTPUT_TOKENS: optional(optionalNumber),
  MODEL_CONTEXT_WINDOW: optional(optionalNumber),
  KODO_STORE_ROOT: optional(optionalString),
  KODO_SKILLS_ROOT: optional(optionalString),
  KODO_THEME_ACCENT: optional(optionalString),
  KODO_MAX_TOOL_ITERATIONS: optional(optionalNumber),
  KODO_MAX_INPUT_TOKENS: optional(optionalNumber),
  KODO_MAX_MESSAGES: optional(optionalNumber),
  KODO_BASH_TIMEOUT_MS: optional(optionalNumber),
  KODO_BASH_MAX_OUTPUT_CHARS: optional(optionalNumber),
  KODO_ALLOW_DANGEROUS_BASH: optional(optionalBoolean),
};

/**
 * Aggregates all env validation errors into one readable message.
 */
const reportValidationErrors = ({ errors }: { errors: Record<string, Error> }) => {
  const entries = Object.entries(errors);

  if (entries.length === 0) {
    return;
  }

  throw new Error(
    entries
      .map(([key, error]) => `${key}: ${error.message || error.name || "Invalid value"}`)
      .join("\n"),
  );
};

const validateBootstrapEnv = (env: NodeJS.ProcessEnv) =>
  cleanEnv(env, ENV_VALIDATORS, {
    reporter: reportValidationErrors,
  });

type RawBootstrapEnv = ReturnType<typeof validateBootstrapEnv>;

/**
 * Maps validated raw env values into provider-neutral bootstrap input.
 */
const mapCommonBootstrapEnv = (raw: RawBootstrapEnv): BootstrapCommonOptions => ({
  storeRoot: raw.KODO_STORE_ROOT,
  skillsRoot: raw.KODO_SKILLS_ROOT,
  themeAccent: raw.KODO_THEME_ACCENT,
  provider: raw.MODEL_PROVIDER,
  apiKey: raw.MODEL_API_KEY,
  baseUrl: raw.MODEL_BASE_URL,
  model: raw.MODEL_NAME,
  reasoningEffort: raw.MODEL_REASONING_EFFORT,
  maxOutputTokens: raw.MODEL_MAX_OUTPUT_TOKENS,
  contextWindow: raw.MODEL_CONTEXT_WINDOW,
  maxToolIterations: raw.KODO_MAX_TOOL_ITERATIONS,
  maxInputTokens: raw.KODO_MAX_INPUT_TOKENS,
  maxMessages: raw.KODO_MAX_MESSAGES,
  bashTimeoutMs: raw.KODO_BASH_TIMEOUT_MS,
  bashMaxOutputChars: raw.KODO_BASH_MAX_OUTPUT_CHARS,
  allowDangerousBash: raw.KODO_ALLOW_DANGEROUS_BASH,
});

/**
 * Reserved for future provider-scoped env parsing once the project supports
 * multiple provider namespaces.
 */
const mapProviderBootstrapEnv = (): BootstrapEnv["providers"] => ({});

/**
 * Reads only the env vars owned by bootstrap and maps them into provider-neutral inputs.
 */
export const readBootstrapEnv = (env: NodeJS.ProcessEnv): BootstrapEnv => {
  const raw = validateBootstrapEnv(env);

  return {
    common: mapCommonBootstrapEnv(raw),
    providers: mapProviderBootstrapEnv(),
  };
};
