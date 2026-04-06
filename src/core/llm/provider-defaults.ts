import type { PiAiClientConfig } from "./client.js";

export type ReasoningEffort = NonNullable<PiAiClientConfig["reasoning"]>;

/**
 * Provider-owned default values used when bootstrap input omits a field.
 */
export interface LlmProviderDefaults {
  baseUrl?: string;
  model?: string;
  reasoning?: ReasoningEffort;
  maxOutputTokens?: number;
  contextWindow?: number;
}

/**
 * Canonical provider metadata including aliases and provider-specific model normalization.
 */
export interface LlmProviderProfile {
  canonicalId: string;
  aliases: string[];
  defaults: LlmProviderDefaults;
  normalizeModel?: (model: string | undefined) => string | undefined;
}

const VALID_REASONING_EFFORTS = new Set<ReasoningEffort>([
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
]);

const DEFAULT_KIMI_BASE_URL = "https://api.kimi.com/coding/";
const DEFAULT_KIMI_MODEL = "k2p5";

/**
 * Built-in provider catalog owned by the LLM layer.
 */
export const KNOWN_LLM_PROVIDER_PROFILES: LlmProviderProfile[] = [
  {
    canonicalId: "kimi-coding",
    aliases: ["kimi"],
    defaults: {
      baseUrl: DEFAULT_KIMI_BASE_URL,
      model: DEFAULT_KIMI_MODEL,
      reasoning: "medium",
      maxOutputTokens: 32_768,
      contextWindow: 262_144,
    },
    normalizeModel: (model) =>
      !model || model === "kimi-for-coding" || model === "k2p5" ? DEFAULT_KIMI_MODEL : model,
  },
  {
    canonicalId: "openai",
    aliases: ["openai-compatible"],
    defaults: {
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4.1-mini",
    },
  },
];

const normalizeString = (value: string | undefined) => {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
};

/**
 * Finds a built-in provider profile by canonical id or alias.
 */
export const findKnownLlmProviderProfile = (providerId: string | undefined) => {
  const normalized = normalizeString(providerId);

  if (!normalized) {
    return undefined;
  }

  return KNOWN_LLM_PROVIDER_PROFILES.find(
    (profile) => profile.canonicalId === normalized || profile.aliases.includes(normalized),
  );
};

/**
 * Resolves a provider profile, falling back to an empty custom profile so
 * bootstrap can still configure OpenAI-compatible providers.
 */
export const resolveLlmProviderProfile = (providerId: string) =>
  findKnownLlmProviderProfile(providerId) ?? {
    canonicalId: providerId,
    aliases: [],
    defaults: {},
  };

/**
 * Validates and normalizes the provider reasoning effort string.
 */
export const normalizeReasoningEffort = (value: string | undefined) => {
  const normalized = normalizeString(value);

  if (!normalized) {
    return undefined;
  }

  if (!VALID_REASONING_EFFORTS.has(normalized as ReasoningEffort)) {
    throw new Error(`Unsupported reasoning effort: ${normalized}`);
  }

  return normalized as ReasoningEffort;
};
