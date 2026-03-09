/**
 * OpenAI-Specific Prompt Template
 *
 * Optimized for OpenAI GPT models
 * Leverages system message for role definition
 */

import { AnalysisContext } from '../types';

export function buildOpenAIPrompt(context: AnalysisContext): string {
  const { ticker, currentMetrics, previousAnalysis, historicalAnalyses, deltas } = context;

  let prompt = `Analyze ${ticker} stock and provide a comprehensive 7-section investment analysis.\n\n`;

  // Current metrics in structured format
  prompt += `**Current Analysis:**\n`;
  prompt += `- Composite Score: ${currentMetrics.compositeScore}/5.0 (${currentMetrics.recommendation})\n`;
  prompt += `- Confidence: ${currentMetrics.confidence}/5.0\n`;
  prompt += `- Pattern: ${currentMetrics.pattern}\n`;
  prompt += `- Data Quality: ${currentMetrics.dataQualityGrade}\n\n`;

  prompt += `**Category Breakdown:**\n`;
  prompt += `- Technical: ${currentMetrics.technicalScore}/5.0\n`;
  prompt += `- Fundamental: ${currentMetrics.fundamentalScore}/5.0\n`;
  prompt += `- Macro: ${currentMetrics.macroScore}/5.0\n`;
  prompt += `- Risk: ${currentMetrics.riskScore}/5.0\n`;
  prompt += `- Sentiment: ${currentMetrics.sentimentScore}/5.0\n`;
  prompt += `- Sector: ${currentMetrics.sectorScore}/5.0\n\n`;

  // Historical context
  if (previousAnalysis && deltas) {
    prompt += `**Change Analysis (vs. ${previousAnalysis.date}):**\n`;
    prompt += `- Score: ${previousAnalysis.compositeScore}/5.0 → ${currentMetrics.compositeScore}/5.0 (${deltas.scoreChange > 0 ? '+' : ''}${deltas.scoreChange.toFixed(2)})\n`;
    prompt += `- Recommendation: ${previousAnalysis.recommendation} → ${currentMetrics.recommendation}\n`;
    prompt += `- Trend Direction: ${deltas.trendDirection}\n\n`;
  }

  if (historicalAnalyses && historicalAnalyses.length > 0) {
    prompt += `**Historical Trend:**\n`;
    historicalAnalyses.forEach((h) => {
      prompt += `- ${h.date}: ${h.compositeScore}/5.0 (${h.recommendation})\n`;
    });
    prompt += '\n';
  }

  // Instructions
  prompt += `**Required Output Format:**\n`;
  prompt += `Generate a 7-section analysis in Notion-flavored markdown with these exact headings:\n\n`;
  prompt += `### 1. Data Foundation & Quality\n`;
  prompt += `### 2. Dual-Lens Analysis (Value × Momentum)\n`;
  prompt += `### 3. Market Intelligence & Catalysts\n`;
  prompt += `### 4. Strategic Trade Plan\n`;
  prompt += `### 5. Directional Outlook\n`;
  prompt += `### 6. Portfolio Integration\n`;
  prompt += `### 7. Investment Recommendation\n\n`;

  prompt += `**Formatting Guidelines:**\n`;
  prompt += `- Use H3 (###) for section headings\n`;
  prompt += `- Use **bold** for emphasis\n`;
  prompt += `- Use bullet points for lists\n`;
  prompt += `- Highlight changes from previous analysis if applicable\n`;
  prompt += `- Keep analysis concise but comprehensive\n`;
  prompt += `- Focus on actionable insights and specific data points\n`;

  return prompt;
}
