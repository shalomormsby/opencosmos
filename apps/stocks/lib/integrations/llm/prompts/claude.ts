/**
 * Claude-Specific Prompt Template
 *
 * Optimized for Anthropic Claude models
 * Claude prefers clear structure and explicit instructions
 */

import { AnalysisContext } from '../types';

export function buildClaudePrompt(context: AnalysisContext): string {
  const { ticker, currentMetrics, previousAnalysis, historicalAnalyses, deltas } = context;

  let prompt = `You are a financial analysis expert. Analyze ${ticker} stock and generate a comprehensive 7-section investment analysis.\n\n`;

  // Current snapshot
  prompt += `<current_metrics>\n`;
  prompt += `Ticker: ${ticker}\n`;
  prompt += `Composite Score: ${currentMetrics.compositeScore}/5.0\n`;
  prompt += `Recommendation: ${currentMetrics.recommendation}\n`;
  prompt += `Confidence: ${currentMetrics.confidence}/5.0\n`;
  prompt += `Pattern: ${currentMetrics.pattern}\n`;
  prompt += `Data Quality: ${currentMetrics.dataQualityGrade}\n\n`;

  prompt += `Category Scores:\n`;
  prompt += `- Technical: ${currentMetrics.technicalScore}/5.0\n`;
  prompt += `- Fundamental: ${currentMetrics.fundamentalScore}/5.0\n`;
  prompt += `- Macro: ${currentMetrics.macroScore}/5.0\n`;
  prompt += `- Risk: ${currentMetrics.riskScore}/5.0\n`;
  prompt += `- Sentiment: ${currentMetrics.sentimentScore}/5.0\n`;
  prompt += `- Sector: ${currentMetrics.sectorScore}/5.0\n`;
  prompt += `</current_metrics>\n\n`;

  // Historical context
  if (previousAnalysis && deltas) {
    prompt += `<previous_analysis date="${previousAnalysis.date}">\n`;
    prompt += `Score: ${previousAnalysis.compositeScore}/5.0 → ${currentMetrics.compositeScore}/5.0 (${deltas.scoreChange > 0 ? '+' : ''}${deltas.scoreChange.toFixed(2)})\n`;
    prompt += `Recommendation: ${previousAnalysis.recommendation} → ${currentMetrics.recommendation}\n`;
    prompt += `Trend: ${deltas.trendDirection}\n`;
    prompt += `</previous_analysis>\n\n`;
  }

  if (historicalAnalyses && historicalAnalyses.length > 0) {
    prompt += `<historical_trend>\n`;
    historicalAnalyses.forEach((h) => {
      prompt += `${h.date}: ${h.compositeScore}/5.0 (${h.recommendation})\n`;
    });
    prompt += `</historical_trend>\n\n`;
  }

  // Task instructions
  prompt += `<task>\n`;
  prompt += `Generate a 7-section analysis in Notion-flavored markdown with these exact headings:\n\n`;
  prompt += `### 1. Data Foundation & Quality\n`;
  prompt += `### 2. Dual-Lens Analysis (Value × Momentum)\n`;
  prompt += `### 3. Market Intelligence & Catalysts\n`;
  prompt += `### 4. Strategic Trade Plan\n`;
  prompt += `### 5. Directional Outlook\n`;
  prompt += `### 6. Portfolio Integration\n`;
  prompt += `### 7. Investment Recommendation\n\n`;

  prompt += `Requirements:\n`;
  prompt += `- Use H3 (###) for section headings\n`;
  prompt += `- Use **bold** for key points\n`;
  prompt += `- Use bullet points for lists\n`;
  prompt += `- If historical data exists, highlight what changed and why\n`;
  prompt += `- Be concise but comprehensive\n`;
  prompt += `- Focus on actionable insights\n`;
  prompt += `</task>\n`;

  return prompt;
}
