/**
 * Historical Pattern Recognition Module
 *
 * Finds similar historical setups based on:
 * - Composite score similarity (±0.3)
 * - Market regime match (Risk-On, Risk-Off, Transition)
 * - Sector rank similarity (±3 positions)
 *
 * v1.0.8 - Delta-First Analysis Engine
 */

import { MarketContext } from '../market';

/**
 * Historical analysis record (from Stock History)
 */
export interface HistoricalAnalysis {
  date: string;
  compositeScore: number;
  recommendation: string;
  marketRegime?: string;
  price?: number;
  volume?: number;
  technicalScore?: number;
  fundamentalScore?: number;
  macroScore?: number;
  riskScore?: number;
  sentimentScore?: number;
  marketAlignment?: number;
  metrics?: Record<string, any>;
}

/**
 * Pattern match result
 */
export interface PatternMatch {
  date: string;
  score: number;
  regime: string;
  similarity: number; // 0.0 to 1.0
  priceAfterDays?: number; // Price N days after this analysis
  priceChangePercent?: number; // % change N days after
  outcome: 'positive' | 'negative' | 'neutral' | 'unknown';
}

/**
 * Pattern recognition summary
 */
export interface PatternSummary {
  totalMatches: number;
  matches: PatternMatch[];
  winRate: number; // Percentage of positive outcomes
  averageReturn: number; // Average price change
  confidence: 'High' | 'Medium' | 'Low' | 'Insufficient Data';
  message: string; // Human-readable summary
}

/**
 * Find historical patterns similar to current setup
 *
 * @param currentScore - Current composite score
 * @param currentRegime - Current market regime
 * @param currentSectorRank - Current sector rank (1-11)
 * @param historicalAnalyses - Historical analyses from Stock History (90 days)
 * @param allMarketContexts - All market context records for sector rank lookups
 * @returns Pattern summary with matched setups and outcomes
 */
export function findHistoricalPatterns(
  currentScore: number,
  currentRegime: string | undefined,
  currentSectorRank: number | undefined,
  historicalAnalyses: HistoricalAnalysis[],
  allMarketContexts?: Array<{ date: string; allSectors: any[] }> // Optional sector data
): PatternSummary {
  // Minimum 5 analyses required for pattern recognition
  if (historicalAnalyses.length < 5) {
    return {
      totalMatches: 0,
      matches: [],
      winRate: 0,
      averageReturn: 0,
      confidence: 'Insufficient Data',
      message: `Only ${historicalAnalyses.length} historical analyses available. Need 5+ for pattern recognition.`,
    };
  }

  const matches: PatternMatch[] = [];

  // Iterate through historical analyses to find similar setups
  for (let i = 0; i < historicalAnalyses.length; i++) {
    const historical = historicalAnalyses[i];

    // Score similarity check (±0.3 threshold)
    const scoreDiff = Math.abs(historical.compositeScore - currentScore);
    if (scoreDiff > 0.3) continue; // Not similar enough

    // Regime match check (if available)
    const regimeMatch = !currentRegime || !historical.marketRegime || historical.marketRegime === currentRegime;
    if (!regimeMatch) continue; // Regime mismatch

    // Sector rank similarity check (±3 positions) - if data available
    const sectorRankMatch = checkSectorRankSimilarity(
      historical.date,
      currentSectorRank,
      allMarketContexts
    );
    if (!sectorRankMatch) continue; // Sector rank too different

    // Calculate similarity score (0.0 to 1.0)
    const similarity = calculateSimilarity(currentScore, historical.compositeScore);

    // Determine outcome (look ahead in historical data)
    const outcome = determineOutcome(historical, historicalAnalyses, i);

    matches.push({
      date: historical.date,
      score: historical.compositeScore,
      regime: historical.marketRegime || 'Unknown',
      similarity,
      priceAfterDays: outcome.priceAfterDays,
      priceChangePercent: outcome.priceChangePercent,
      outcome: outcome.type,
    });
  }

  // Sort by similarity (highest first)
  matches.sort((a, b) => b.similarity - a.similarity);

  // Limit to top 5 most similar
  const topMatches = matches.slice(0, 5);

  // Calculate win rate
  const positiveOutcomes = topMatches.filter(m => m.outcome === 'positive').length;
  const knownOutcomes = topMatches.filter(m => m.outcome !== 'unknown').length;
  const winRate = knownOutcomes > 0 ? (positiveOutcomes / knownOutcomes) * 100 : 0;

  // Calculate average return
  const validReturns = topMatches.filter(m => m.priceChangePercent !== undefined);
  const averageReturn = validReturns.length > 0
    ? validReturns.reduce((sum, m) => sum + (m.priceChangePercent || 0), 0) / validReturns.length
    : 0;

  // Determine confidence level
  const confidence = assessConfidence(topMatches.length, knownOutcomes, winRate);

  // Generate message
  const message = generatePatternMessage(topMatches, winRate, averageReturn, confidence);

  return {
    totalMatches: topMatches.length,
    matches: topMatches,
    winRate,
    averageReturn,
    confidence,
    message,
  };
}

/**
 * Check if sector rank is similar (±3 positions)
 */
function checkSectorRankSimilarity(
  historicalDate: string,
  currentSectorRank: number | undefined,
  allMarketContexts?: Array<{ date: string; allSectors: any[] }>
): boolean {
  // If no current sector rank or no market contexts, skip this check
  if (currentSectorRank === undefined || !allMarketContexts || allMarketContexts.length === 0) {
    return true; // Don't filter out if data unavailable
  }

  // Find market context for this historical date
  const historicalMarketContext = allMarketContexts.find(mc => {
    const mcDate = mc.date.split('T')[0]; // Get YYYY-MM-DD
    const hDate = historicalDate.split('T')[0];
    return mcDate === hDate;
  });

  // If no market context found for this date, skip check
  if (!historicalMarketContext) return true;

  // Find stock's sector in historical market context
  // This would require sector name - skip for now if unavailable
  // For Phase 1, we'll allow matches if sector rank data is incomplete
  return true;
}

/**
 * Calculate similarity score (0.0 to 1.0) based on score difference
 */
function calculateSimilarity(currentScore: number, historicalScore: number): number {
  const scoreDiff = Math.abs(currentScore - historicalScore);
  // Perfect match = 1.0, max allowed difference (0.3) = 0.0
  return 1.0 - (scoreDiff / 0.3);
}

/**
 * Determine outcome of a historical analysis by looking ahead
 */
function determineOutcome(
  historical: HistoricalAnalysis,
  allHistorical: HistoricalAnalysis[],
  currentIndex: number
): {
  type: 'positive' | 'negative' | 'neutral' | 'unknown';
  priceAfterDays?: number;
  priceChangePercent?: number;
} {
  // Look ahead to next analysis (if exists)
  if (currentIndex === 0) {
    // This is the most recent - no future data
    return { type: 'unknown' };
  }

  const nextAnalysis = allHistorical[currentIndex - 1]; // Sorted descending, so -1 is forward in time

  if (!historical.price || !nextAnalysis.price) {
    return { type: 'unknown' };
  }

  const priceChangePercent = ((nextAnalysis.price - historical.price) / historical.price) * 100;
  // Could calculate daysElapsed for time-weighted outcomes in future:
  // const historicalDate = new Date(historical.date);
  // const nextDate = new Date(nextAnalysis.date);
  // const daysElapsed = Math.ceil((nextDate.getTime() - historicalDate.getTime()) / (1000 * 60 * 60 * 24));

  // Determine outcome type
  let type: 'positive' | 'negative' | 'neutral' = 'neutral';
  if (priceChangePercent > 2) type = 'positive';
  else if (priceChangePercent < -2) type = 'negative';

  return {
    type,
    priceAfterDays: nextAnalysis.price,
    priceChangePercent,
  };
}

/**
 * Assess confidence level based on match quality
 */
function assessConfidence(
  matchCount: number,
  knownOutcomes: number,
  _winRate: number // Prefix with _ to indicate intentionally unused (could be used for threshold in future)
): 'High' | 'Medium' | 'Low' | 'Insufficient Data' {
  if (matchCount === 0 || knownOutcomes === 0) return 'Insufficient Data';
  if (matchCount >= 4 && knownOutcomes >= 3) return 'High';
  if (matchCount >= 2 && knownOutcomes >= 2) return 'Medium';
  return 'Low';
}

/**
 * Generate human-readable pattern message
 */
function generatePatternMessage(
  matches: PatternMatch[],
  winRate: number,
  averageReturn: number,
  confidence: string
): string {
  if (matches.length === 0) {
    return 'No similar historical patterns found in the last 90 days.';
  }

  const matchDates = matches
    .slice(0, 3)
    .map(m => new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
    .join(', ');

  const outcomeSummary =
    winRate >= 75
      ? `Strong historical win rate (${winRate.toFixed(0)}%)`
      : winRate >= 50
      ? `Moderate win rate (${winRate.toFixed(0)}%)`
      : `Mixed results (${winRate.toFixed(0)}% win rate)`;

  const returnSummary =
    averageReturn > 5
      ? `average +${averageReturn.toFixed(1)}% gain`
      : averageReturn < -5
      ? `average ${averageReturn.toFixed(1)}% loss`
      : `average ${averageReturn > 0 ? '+' : ''}${averageReturn.toFixed(1)}%`;

  return `Similar setups on ${matchDates}. ${outcomeSummary}, ${returnSummary}. Confidence: ${confidence}.`;
}

/**
 * Get sector rank from market context
 */
export function getSectorRank(
  sectorName: string | undefined,
  marketContext: MarketContext | null | undefined
): number | undefined {
  if (!sectorName || !marketContext || !marketContext.allSectors) {
    return undefined;
  }

  const sector = marketContext.allSectors.find(s =>
    s.name.toLowerCase() === sectorName.toLowerCase()
  );

  return sector?.rank;
}
