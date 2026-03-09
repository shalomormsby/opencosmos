/**
 * Google Gemini Provider Implementation
 *
 * Implements LLM abstraction for Google Gemini models
 * Default: gemini-2.5-flash (best value at $0.013/analysis)
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMProvider } from '../provider-interface';
import { AnalysisContext, AnalysisResult } from '../types';
import { calculateModelCost } from '../pricing';
import { buildAnalysisPrompt } from '../prompts/shared';

export class GeminiProvider extends LLMProvider {
  private client: GoogleGenerativeAI;

  constructor(apiKey: string, modelName: string = 'gemini-2.5-flash') {
    super(apiKey, modelName);
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async generateAnalysis(context: AnalysisContext): Promise<AnalysisResult> {
    const startTime = Date.now();

    try {
      const model = this.client.getGenerativeModel({
        model: this.modelName,
      });

      const prompt = this.buildPrompt(context);
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Count tokens (Gemini provides usage metadata)
      const usageMetadata = response.usageMetadata;
      const inputTokens = usageMetadata?.promptTokenCount || 0;
      const outputTokens = usageMetadata?.candidatesTokenCount || 0;

      return {
        content: text,
        modelUsed: this.modelName,
        tokensUsed: {
          input: inputTokens,
          output: outputTokens,
        },
        latencyMs: Date.now() - startTime,
        cost: this.calculateCost(inputTokens, outputTokens),
      };
    } catch (error: any) {
      throw new Error(`Gemini API error: ${error.message}`);
    }
  }

  protected buildPrompt(context: AnalysisContext): string {
    return buildAnalysisPrompt(context);
  }

  protected calculateCost(inputTokens: number, outputTokens: number): number {
    return calculateModelCost(this.modelName, inputTokens, outputTokens);
  }
}
