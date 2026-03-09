/**
 * Delta Calculation Module
 *
 * Unified delta computation for stock analysis changes over time.
 * Calculates score deltas, price deltas, trend directions, and regime transitions.
 *
 * v1.0.8 - Delta-First Analysis Engine
 */

import { MarketContext } from '../market';

/**
 * Previous analysis data structure
 */
export interface PreviousAnalysis {
  date: string;
  compositeScore: number;
  recommendation: string;
  technicalScore?: number;
  fundamentalScore?: number;
  macroScore?: number;
  riskScore?: number;
  sentimentScore?: number;
  marketAlignment?: number;
  price?: number;
  volume?: number;
  metrics?: Record<string, any>;
}

/**
 * Current metrics data structure
 */
export interface CurrentMetrics {
  compositeScore: number;
  recommendation: string;
  technicalScore: number;
  fundamentalScore: number;
  macroScore: number;
  riskScore: number;
  sentimentScore: number;
  marketAlignment: number;
  price: number;
  volume: number;
  [key: string]: any;
}

/**
 * Comprehensive delta data
 */
export interface DeltaData {
  daysElapsed: number;
  scoreChange: number;
  trendDirection: 'improving' | 'declining' | 'stable';
  trendEmoji: string;
  significance: 'Major' | 'Notable' | 'Minor';
  categoryDeltas: {
    technical: number;
    fundamental: number;
    macro: number;
    risk: number;
    sentiment: number;
    marketAlignment?: number;
  };
  priceDeltas: {
    priceChange: number;
    priceChangePercent: number;
    volumeChangePercent: number;
    annualizedReturn?: number;
  };
  recommendationChanged: boolean;
  recommendationDelta: string;
  regimeTransition?: {
    occurred: boolean;
    from?: string;
    to?: string;
    message?: string;
  };
}

/**
 * Calculate comprehensive deltas between current and previous analysis
 */
export function calculateDeltas(
  current: CurrentMetrics,
  previous: PreviousAnalysis,
  currentMarketContext?: MarketContext | null,
  previousMarketRegime?: string
): DeltaData {
  // Calculate days elapsed
  const previousDate = new Date(previous.date);
  const currentDate = new Date();
  const daysElapsed = Math.ceil((currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24));

  // Score deltas
  const scoreChange = current.compositeScore - previous.compositeScore;
  const trendDirection = determineTrendDirection(scoreChange);
  const trendEmoji = getTrendEmoji(scoreChange);
  const significance = assessSignificance(scoreChange, current, previous);

  // Category deltas
  const categoryDeltas = {
    technical: current.technicalScore - (previous.technicalScore || 0),
    fundamental: current.fundamentalScore - (previous.fundamentalScore || 0),
    macro: current.macroScore - (previous.macroScore || 0),
    risk: current.riskScore - (previous.riskScore || 0),
    sentiment: current.sentimentScore - (previous.sentimentScore || 0),
    marketAlignment: current.marketAlignment - (previous.marketAlignment || 0),
  };

  // Price deltas
  const previousPrice = previous.price || current.price;
  const previousVolume = previous.volume || current.volume;

  const priceChange = current.price - previousPrice;
  const priceChangePercent = (priceChange / previousPrice) * 100;
  const volumeChangePercent = ((current.volume - previousVolume) / previousVolume) * 100;

  // Annualized return
  let annualizedReturn: number | undefined;
  if (daysElapsed > 0) {
    const dailyReturn = priceChangePercent / daysElapsed;
    annualizedReturn = dailyReturn * 365;
  }

  const priceDeltas = {
    priceChange,
    priceChangePercent,
    volumeChangePercent,
    annualizedReturn,
  };

  // Recommendation change
  const recommendationChanged = current.recommendation !== previous.recommendation;
  const recommendationDelta = `${previous.recommendation} → ${current.recommendation}`;

  // Regime transition detection
  const regimeTransition = detectRegimeTransition(
    currentMarketContext?.regime,
    previousMarketRegime
  );

  return {
    daysElapsed,
    scoreChange,
    trendDirection,
    trendEmoji,
    significance,
    categoryDeltas,
    priceDeltas,
    recommendationChanged,
    recommendationDelta,
    regimeTransition,
  };
}

/**
 * Determine trend direction based on score change
 */
function determineTrendDirection(scoreChange: number): 'improving' | 'declining' | 'stable' {
  if (scoreChange > 0.2) return 'improving';
  if (scoreChange < -0.2) return 'declining';
  return 'stable';
}

/**
 * Get trend emoji based on score change
 */
function getTrendEmoji(scoreChange: number): string {
  if (scoreChange > 0.3) return '⬆️'; // Major improvement
  if (scoreChange > 0.1) return '📈'; // Moderate improvement
  if (scoreChange < -0.3) return '⬇️'; // Major decline
  if (scoreChange < -0.1) return '📉'; // Moderate decline
  if (Math.abs(scoreChange) < 0.05) return '⏸️'; // Flat/stable
  return '🔄'; // Minor change
}

/**
 * Assess significance of score change
 */
function assessSignificance(
  scoreChange: number,
  current: CurrentMetrics,
  previous: PreviousAnalysis
): 'Major' | 'Notable' | 'Minor' {
  const absChange = Math.abs(scoreChange);

  // Score change thresholds
  if (absChange > 0.8) return 'Major';
  if (absChange > 0.3) return 'Notable';

  // Price/score divergence check
  const priceChange = previous.price
    ? ((current.price - previous.price) / previous.price) * 100
    : 0;

  const divergence = Math.abs(priceChange) - (absChange * 20); // Rough heuristic: 0.5 score ≈ 10% price
  if (divergence > 15) return 'Notable'; // Significant divergence

  return 'Minor';
}

/**
 * Detect market regime transition between analyses
 */
function detectRegimeTransition(
  currentRegime?: string,
  previousRegime?: string
): {
  occurred: boolean;
  from?: string;
  to?: string;
  message?: string;
} {
  // No transition if either regime is missing
  if (!currentRegime || !previousRegime) {
    return { occurred: false };
  }

  // No transition if regimes are the same
  if (currentRegime === previousRegime) {
    return { occurred: false };
  }

  // Transition occurred
  const message = generateRegimeTransitionMessage(previousRegime, currentRegime);

  return {
    occurred: true,
    from: previousRegime,
    to: currentRegime,
    message,
  };
}

/**
 * Generate human-readable regime transition message
 */
function generateRegimeTransitionMessage(from: string, to: string): string {
  const transitions: Record<string, Record<string, string>> = {
    'Risk-On': {
      'Risk-Off': '⚠️ Market shifted from Risk-On to Risk-Off - expect score compression for growth stocks and defensive rotation',
      'Transition': 'Market moved from Risk-On to Transition - mixed signals emerging, reduce directional bets',
    },
    'Risk-Off': {
      'Risk-On': '🚀 Market shifted from Risk-Off to Risk-On - expect score expansion for growth stocks and cyclical strength',
      'Transition': 'Market moved from Risk-Off to Transition - early signs of stabilization, but clarity needed',
    },
    'Transition': {
      'Risk-On': '✅ Market shifted from Transition to Risk-On - regime clarity emerging, growth/cyclical stocks favored',
      'Risk-Off': '⛔ Market shifted from Transition to Risk-Off - defensive positioning recommended, volatility rising',
    },
  };

  return transitions[from]?.[to] || `Market regime changed: ${from} → ${to}`;
}

/**
 * Calculate trend emoji for price movement
 */
export function getPriceTrendEmoji(priceChangePercent: number): string {
  if (priceChangePercent > 10) return '🚀'; // Massive gain
  if (priceChangePercent > 5) return '⬆️'; // Strong gain
  if (priceChangePercent > 2) return '📈'; // Moderate gain
  if (priceChangePercent < -10) return '💥'; // Massive drop
  if (priceChangePercent < -5) return '⬇️'; // Strong drop
  if (priceChangePercent < -2) return '📉'; // Moderate drop
  return '⏸️'; // Stable
}

/**
 * Format delta value with sign
 */
export function formatDelta(value: number, decimals: number = 2): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}`;
}

/**
 * Format percentage value with sign
 */
export function formatPercent(value: number, decimals: number = 2): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}
