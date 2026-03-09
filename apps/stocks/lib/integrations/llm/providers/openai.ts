/**
 * OpenAI Provider Implementation
 *
 * Implements LLM abstraction for OpenAI models
 * Default: gpt-4.1 (industry standard)
 */

import OpenAI from 'openai';
import { LLMProvider } from '../provider-interface';
import { AnalysisContext, AnalysisResult } from '../types';
import { calculateModelCost } from '../pricing';
import { buildAnalysisPrompt } from '../prompts/shared';

export class OpenAIProvider extends LLMProvider {
  private client: OpenAI;

  constructor(apiKey: string, modelName: string = 'gpt-4.1') {
    super(apiKey, modelName);
    this.client = new OpenAI({ apiKey });
  }

  async generateAnalysis(context: AnalysisContext): Promise<AnalysisResult> {
    const startTime = Date.now();

    try {
      const prompt = this.buildPrompt(context);

      const completion = await this.client.chat.completions.create({
        model: this.modelName,
        messages: [
          { role: 'system', content: 'You are a financial analysis expert.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 4000,
      });

      const text = completion.choices[0].message.content || '';
      const inputTokens = completion.usage?.prompt_tokens || 0;
      const outputTokens = completion.usage?.completion_tokens || 0;

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
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }

  protected buildPrompt(context: AnalysisContext): string {
    return buildAnalysisPrompt(context);
  }

  protected calculateCost(inputTokens: number, outputTokens: number): number {
    return calculateModelCost(this.modelName, inputTokens, outputTokens);
  }
}
