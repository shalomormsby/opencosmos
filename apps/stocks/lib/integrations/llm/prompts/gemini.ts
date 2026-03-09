/**
 * Gemini-Specific Prompt Template
 *
 * Optimized for Google Gemini models
 * 50% token reduction via information-dense formatting
 */

import { AnalysisContext } from '../types';

export function buildGeminiPrompt(context: AnalysisContext): string {
  const { ticker, currentMetrics, previousAnalysis, historicalAnalyses, deltas } = context;

  let prompt = `You are analyzing ${ticker} stock. Generate a comprehensive 7-section analysis in Notion-flavored markdown.\n\n`;

  // Current metrics
  prompt += `## Current Metrics\n`;
  prompt += `Composite Score: ${currentMetrics.compositeScore}/5.0\n`;
  prompt += `Recommendation: ${currentMetrics.recommendation}\n`;
  prompt += `Technical Score: ${currentMetrics.technicalScore}/5.0\n`;
  prompt += `Fundamental Score: ${currentMetrics.fundamentalScore}/5.0\n`;
  prompt += `Macro Score: ${currentMetrics.macroScore}/5.0\n`;
  prompt += `Risk Score: ${currentMetrics.riskScore}/5.0\n`;
  prompt += `Sentiment Score: ${currentMetrics.sentimentScore}/5.0\n`;
  prompt += `Sector Score: ${currentMetrics.sectorScore}/5.0\n`;
  prompt += `Pattern: ${currentMetrics.pattern}\n`;
  prompt += `Confidence: ${currentMetrics.confidence}/5.0\n`;
  prompt += `Data Quality: ${currentMetrics.dataQualityGrade}\n\n`;

  // Historical context (if exists)
  if (previousAnalysis && deltas) {
    prompt += `## Changes Since Last Analysis (${previousAnalysis.date})\n`;
    prompt += `Score Change: ${deltas.scoreChange > 0 ? '+' : ''}${deltas.scoreChange.toFixed(2)}\n`;
    prompt += `Recommendation: ${previousAnalysis.recommendation} → ${currentMetrics.recommendation}\n`;
    prompt += `Trend: ${deltas.trendDirection}\n`;
    prompt += `Days Since Last: ${calculateDaysSince(previousAnalysis.date)}\n\n`;
  }

  // Historical trend
  if (historicalAnalyses && historicalAnalyses.length > 0) {
    prompt += `## Historical Trend (Last ${historicalAnalyses.length} Analyses)\n`;
    historicalAnalyses.forEach((h) => {
      prompt += `- ${h.date}: ${h.compositeScore}/5.0 (${h.recommendation})\n`;
    });
    prompt += '\n';
  }

  // Instructions
  prompt += `## Analysis Instructions\n`;
  prompt += `Generate a 7-section analysis with these exact headings:\n\n`;
  prompt += `### 1. Data Foundation & Quality\n`;
  prompt += `### 2. Dual-Lens Analysis (Value × Momentum)\n`;
  prompt += `### 3. Market Intelligence & Catalysts\n`;
  prompt += `### 4. Strategic Trade Plan\n`;
  prompt += `### 5. Directional Outlook\n`;
  prompt += `### 6. Portfolio Integration\n`;
  prompt += `### 7. Investment Recommendation\n\n`;

  prompt += `**Important formatting rules:**\n`;
  prompt += `- Use H3 (###) for section headings\n`;
  prompt += `- Use **bold** for emphasis\n`;
  prompt += `- Use bullet points for lists\n`;
  prompt += `- Highlight changes from previous analysis where relevant\n`;
  prompt += `- Keep analysis concise but comprehensive (information-dense)\n`;
  prompt += `- Focus on actionable insights and specific metrics\n`;

  return prompt;
}

/**
 * Calculate days since a given date
 */
function calculateDaysSince(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}
