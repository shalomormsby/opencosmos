/**
 * LLM Pricing Table
 *
 * Centralized pricing for all supported LLM models
 * Prices are per 1M tokens (input/output)
 * Updated as of January 2025
 */

export const MODEL_PRICING = {
  // Google Gemini models
  'gemini-2.0-flash': { input: 0.10, output: 0.40 },
  'gemini-2.0-flash-lite': { input: 0.07, output: 0.30 },
  'gemini-2.5-flash': { input: 0.25, output: 1.00 },
  'gemini-2.5-flash-lite': { input: 0.07, output: 0.30 },
  'gemini-1.5-pro': { input: 1.25, output: 5.00 },
  'gemini-2.5-pro': { input: 1.25, output: 10.00 },

  // OpenAI models
  'gpt-4.1-nano': { input: 0.10, output: 0.40 },
  'gpt-4.1-mini': { input: 0.40, output: 1.60 },
  'gpt-4.1': { input: 2.00, output: 8.00 },
  'gpt-5-nano': { input: 0.05, output: 0.20 },
  'gpt-5-mini': { input: 0.25, output: 2.00 },
  'gpt-5': { input: 1.25, output: 10.00 },
  'o3': { input: 2.00, output: 8.00 },
  'o3-mini': { input: 0.55, output: 2.20 },
  'o4-mini': { input: 1.10, output: 4.40 },

  // Anthropic Claude models
  'claude-4.1': { input: 3.00, output: 15.00 },
  'claude-4.5-sonnet-20250622': { input: 3.00, output: 15.00 },
  'claude-sonnet-4-5-20250929': { input: 3.00, output: 15.00 }, // Claude Sonnet 4.5
  'claude-4.1-opus': { input: 15.00, output: 75.00 },

  // DeepSeek models (for future)
  'deepseek-v3': { input: 0.27, output: 1.10 },
  'deepseek-r1': { input: 0.55, output: 2.19 },
} as const;

export type ModelName = keyof typeof MODEL_PRICING;

/**
 * Calculate cost for any model based on token usage
 * @param modelName - Model identifier
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @returns Cost in USD
 */
export function calculateModelCost(
  modelName: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[modelName as ModelName];

  if (!pricing) {
    console.warn(`Unknown model pricing for: ${modelName}, using default`);
    // Default to moderate pricing if unknown
    return (inputTokens / 1_000_000) * 1.00 + (outputTokens / 1_000_000) * 5.00;
  }

  return (
    (inputTokens / 1_000_000) * pricing.input +
    (outputTokens / 1_000_000) * pricing.output
  );
}

/**
 * Get pricing info for a model (useful for cost estimation)
 * @param modelName - Model identifier
 * @returns Pricing object or null if not found
 */
export function getModelPricing(modelName: string) {
  return MODEL_PRICING[modelName as ModelName] || null;
}
