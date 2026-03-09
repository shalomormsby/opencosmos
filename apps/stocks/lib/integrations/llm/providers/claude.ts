/**
 * Anthropic Claude Provider Implementation
 *
 * Implements LLM abstraction for Anthropic Claude models
 * Default: claude-4.5-sonnet-20250622 (latest flagship)
 */

import Anthropic from '@anthropic-ai/sdk';
import { LLMProvider } from '../provider-interface';
import { AnalysisContext, AnalysisResult } from '../types';
import { calculateModelCost } from '../pricing';
import { buildAnalysisPrompt } from '../prompts/shared';

export class ClaudeProvider extends LLMProvider {
  private client: Anthropic;

  constructor(apiKey: string, modelName: string = 'claude-4.5-sonnet-20250622') {
    super(apiKey, modelName);
    this.client = new Anthropic({ apiKey });
  }

  async generateAnalysis(context: AnalysisContext): Promise<AnalysisResult> {
    const startTime = Date.now();

    try {
      const prompt = this.buildPrompt(context);

      const message = await this.client.messages.create({
        model: this.modelName,
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = message.content[0].type === 'text' ? message.content[0].text : '';

      const inputTokens = message.usage.input_tokens;
      const outputTokens = message.usage.output_tokens;

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
      throw new Error(`Claude API error: ${error.message}`);
    }
  }

  protected buildPrompt(context: AnalysisContext): string {
    return buildAnalysisPrompt(context);
  }

  protected calculateCost(inputTokens: number, outputTokens: number): number {
    return calculateModelCost(this.modelName, inputTokens, outputTokens);
  }
}
