/**
 * LLM Provider Factory
 *
 * Creates LLM provider instances based on configuration
 * Enables easy switching between providers via environment variables
 */

import { LLMProvider } from './provider-interface';
import { GeminiProvider } from './providers/gemini';
import { ClaudeProvider } from './providers/claude';
import { OpenAIProvider } from './providers/openai';

export type LLMProviderType = 'gemini' | 'claude' | 'openai';

export class LLMFactory {
  /**
   * Create a specific provider instance
   * @param type - Provider type (gemini, claude, openai)
   * @param modelName - Optional model name override
   * @returns LLM Provider instance
   */
  static createProvider(type: LLMProviderType = 'gemini', modelName?: string): LLMProvider {
    switch (type) {
      case 'gemini':
        return new GeminiProvider(
          process.env.GEMINI_API_KEY!,
          modelName || 'gemini-2.0-flash-exp'
        );

      case 'claude':
        return new ClaudeProvider(
          process.env.ANTHROPIC_API_KEY!,
          modelName || 'claude-sonnet-4-5-20250929'
        );

      case 'openai':
        return new OpenAIProvider(
          process.env.OPENAI_API_KEY!,
          modelName || 'gpt-4.1'
        );

      default:
        throw new Error(`Unknown provider type: ${type}`);
    }
  }

  /**
   * Create provider from environment variables
   * Reads LLM_PROVIDER and LLM_MODEL_NAME from process.env
   * @returns LLM Provider instance
   */
  static getProviderFromEnv(): LLMProvider {
    const providerType = (process.env.LLM_PROVIDER || 'gemini') as LLMProviderType;
    const modelName = process.env.LLM_MODEL_NAME;

    return this.createProvider(providerType, modelName);
  }
}
