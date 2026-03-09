/**
 * LLM Provider Abstract Base Class
 *
 * Defines the interface that all LLM providers must implement
 * Enables easy switching between Gemini, Claude, OpenAI, etc.
 */

import { AnalysisContext, AnalysisResult, LLMConfig } from './types';

export abstract class LLMProvider {
  protected modelName: string;
  protected apiKey: string;
  protected config: LLMConfig;

  constructor(apiKey: string, modelName: string, config?: LLMConfig) {
    this.apiKey = apiKey;
    this.modelName = modelName;
    this.config = config || {};
  }

  /**
   * Generate stock analysis from context
   * Each provider implements this differently
   */
  abstract generateAnalysis(context: AnalysisContext): Promise<AnalysisResult>;

  /**
   * Build provider-specific prompt from context
   * Allows different prompt engineering per provider
   */
  protected abstract buildPrompt(context: AnalysisContext): string;

  /**
   * Calculate cost based on token usage
   * Each provider has different pricing
   */
  protected abstract calculateCost(inputTokens: number, outputTokens: number): number;

  /**
   * Get provider name for logging/debugging
   */
  public getProviderName(): string {
    return this.constructor.name;
  }

  /**
   * Get model name
   */
  public getModelName(): string {
    return this.modelName;
  }
}
