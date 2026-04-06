import type { PiAiClientConfig } from "../core/llm/client.js";
import {
  normalizeReasoningEffort,
  resolveLlmProviderProfile,
} from "../core/llm/provider-defaults.js";
import type { ProviderLlmOptions } from "./env.js";
import type { BootstrapOptions } from "./config.js";

const normalizeString = (value: string | undefined) => {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
};

const getProviderOptions = (options: BootstrapOptions, providerId: string): ProviderLlmOptions =>
  options.providers[providerId] ?? {};

const hasProviderSignal = (options: ProviderLlmOptions | undefined) =>
  Boolean(
    options?.apiKey ||
    options?.baseUrl ||
    options?.model ||
    options?.reasoningEffort ||
    options?.maxOutputTokens ||
    options?.contextWindow,
  );

const hasGenericLlmOverrides = (options: BootstrapOptions) =>
  Boolean(
    options.common.apiKey ||
    options.common.baseUrl ||
    options.common.model ||
    options.common.reasoningEffort ||
    options.common.maxOutputTokens ||
    options.common.contextWindow,
  );

/**
 * Provider inference only decides which provider profile to use. Actual
 * defaults, aliases, and model normalization stay in the LLM layer.
 */
const resolveProviderId = (options: BootstrapOptions) => {
  const explicitProvider = normalizeString(options.common.provider);

  if (explicitProvider) {
    return resolveLlmProviderProfile(explicitProvider).canonicalId;
  }

  const inferredProviderIds = Object.keys(options.providers).filter((providerId) =>
    hasProviderSignal(getProviderOptions(options, providerId)),
  );

  if (inferredProviderIds.length === 1) {
    return inferredProviderIds[0];
  }

  if (inferredProviderIds.length > 1) {
    throw new Error(
      "Multiple LLM providers are configured. Set MODEL_PROVIDER or --provider explicitly.",
    );
  }

  if (hasGenericLlmOverrides(options)) {
    throw new Error("MODEL_PROVIDER or --provider is required when using generic model options.");
  }

  throw new Error("No LLM provider configured. Set MODEL_PROVIDER and MODEL_API_KEY.");
};

/**
 * Makes required provider fields fail fast with provider-specific context.
 */
const requireField = (
  providerId: string,
  fieldName: "apiKey" | "baseUrl" | "model",
  value: string | undefined,
) => {
  if (!value) {
    throw new Error(`Missing ${fieldName} for provider ${providerId}.`);
  }

  return value;
};

/**
 * Builds the final LLM client config from merged bootstrap inputs.
 * Bootstrap owns source precedence; the LLM layer owns provider defaults and aliases.
 */
export const buildLlmConfig = (options: BootstrapOptions): PiAiClientConfig => {
  const providerId = resolveProviderId(options);
  const profile = resolveLlmProviderProfile(providerId);
  const providerOptions = getProviderOptions(options, profile.canonicalId);

  const model =
    profile.normalizeModel?.(
      normalizeString(options.common.model ?? providerOptions.model ?? profile.defaults.model),
    ) ?? normalizeString(options.common.model ?? providerOptions.model ?? profile.defaults.model);

  return {
    providerId,
    apiKey: requireField(
      providerId,
      "apiKey",
      normalizeString(options.common.apiKey ?? providerOptions.apiKey),
    ),
    baseUrl: requireField(
      providerId,
      "baseUrl",
      normalizeString(
        options.common.baseUrl ?? providerOptions.baseUrl ?? profile.defaults.baseUrl,
      ),
    ),
    model: requireField(providerId, "model", model),
    reasoning: normalizeReasoningEffort(
      options.common.reasoningEffort ??
        providerOptions.reasoningEffort ??
        profile.defaults.reasoning,
    ),
    maxOutputTokens:
      options.common.maxOutputTokens ??
      providerOptions.maxOutputTokens ??
      profile.defaults.maxOutputTokens,
    contextWindow:
      options.common.contextWindow ??
      providerOptions.contextWindow ??
      profile.defaults.contextWindow,
  };
};
