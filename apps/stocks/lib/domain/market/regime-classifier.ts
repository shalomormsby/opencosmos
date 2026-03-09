/**
 * Market Regime Classifier
 *
 * Classifies market environment as Risk-On, Risk-Off, or Transition
 * based on volatility, momentum, and sector rotation signals.
 *
 * v1.1.0 - Market Context Integration
 */

import {
  MarketRegime,
  RiskAssessment,
  RegimeClassification,
  IndexData,
  SectorData,
  MarketDirection,
} from './types';

/**
 * Classify market regime based on multiple signals
 *
 * Risk-On signals:
 * - VIX < 20 (low volatility)
 * - S&P 500 trending up (above 50D MA, positive momentum)
 * - Growth sectors leading (Tech, Consumer Discretionary)
 * - High confidence when all signals align
 *
 * Risk-Off signals:
 * - VIX > 25 (high volatility)
 * - S&P 500 trending down (below 50D MA, negative momentum)
 * - Defensive sectors leading (Utilities, Consumer Staples, Healthcare)
 * - High confidence when all signals align
 *
 * Transition:
 * - Mixed signals
 * - VIX 20-25 (moderate volatility)
 * - Unclear sector rotation
 */
export function classifyMarketRegime(params: {
  vix: number | null;
  spy: IndexData;
  sectors: SectorData[];
}): RegimeClassification {
  const { vix, spy, sectors } = params;

  const signals: {
    signal: string;
    value: 'bullish' | 'bearish' | 'neutral';
    weight: number;
  }[] = [];

  // Signal 1: VIX Level (25% weight)
  if (vix !== null) {
    if (vix < 15) {
      signals.push({ signal: 'VIX (very low)', value: 'bullish', weight: 0.25 });
    } else if (vix < 20) {
      signals.push({ signal: 'VIX (low)', value: 'bullish', weight: 0.2 });
    } else if (vix < 25) {
      signals.push({ signal: 'VIX (moderate)', value: 'neutral', weight: 0.15 });
    } else if (vix < 30) {
      signals.push({ signal: 'VIX (elevated)', value: 'bearish', weight: 0.2 });
    } else {
      signals.push({ signal: 'VIX (very high)', value: 'bearish', weight: 0.25 });
    }
  }

  // Signal 2: S&P 500 vs 50-day MA (20% weight)
  if (spy.ma50 !== null) {
    const percentAbove50d = ((spy.price - spy.ma50) / spy.ma50) * 100;

    if (percentAbove50d > 3) {
      signals.push({ signal: 'SPY vs 50D MA (strong above)', value: 'bullish', weight: 0.2 });
    } else if (percentAbove50d > 0) {
      signals.push({ signal: 'SPY vs 50D MA (above)', value: 'bullish', weight: 0.15 });
    } else if (percentAbove50d > -3) {
      signals.push({ signal: 'SPY vs 50D MA (slightly below)', value: 'neutral', weight: 0.1 });
    } else {
      signals.push({ signal: 'SPY vs 50D MA (well below)', value: 'bearish', weight: 0.2 });
    }
  }

  // Signal 3: S&P 500 vs 200-day MA (15% weight)
  if (spy.ma200 !== null) {
    const percentAbove200d = ((spy.price - spy.ma200) / spy.ma200) * 100;

    if (percentAbove200d > 5) {
      signals.push({ signal: 'SPY vs 200D MA (strong above)', value: 'bullish', weight: 0.15 });
    } else if (percentAbove200d > 0) {
      signals.push({ signal: 'SPY vs 200D MA (above)', value: 'bullish', weight: 0.1 });
    } else if (percentAbove200d > -5) {
      signals.push({ signal: 'SPY vs 200D MA (slightly below)', value: 'neutral', weight: 0.05 });
    } else {
      signals.push({ signal: 'SPY vs 200D MA (well below)', value: 'bearish', weight: 0.15 });
    }
  }

  // Signal 4: S&P 500 Momentum (15% weight)
  if (spy.change1M !== 0) {
    if (spy.change1M > 5) {
      signals.push({ signal: 'SPY 1M momentum (strong up)', value: 'bullish', weight: 0.15 });
    } else if (spy.change1M > 0) {
      signals.push({ signal: 'SPY 1M momentum (up)', value: 'bullish', weight: 0.1 });
    } else if (spy.change1M > -5) {
      signals.push({ signal: 'SPY 1M momentum (slightly down)', value: 'neutral', weight: 0.05 });
    } else {
      signals.push({ signal: 'SPY 1M momentum (down)', value: 'bearish', weight: 0.15 });
    }
  }

  // Signal 5: Sector Rotation (25% weight)
  const topSectors = sectors.slice(0, 3); // Top 3 performers
  const bottomSectors = sectors.slice(-3); // Bottom 3 performers

  const growthSectors = ['Technology', 'Consumer Discretionary', 'Communication Services'];
  const defensiveSectors = ['Utilities', 'Consumer Staples', 'Healthcare'];

  const topSectorNames = topSectors.map(s => s.name);
  const bottomSectorNames = bottomSectors.map(s => s.name);

  const growthLeading = topSectorNames.some(name => growthSectors.includes(name));
  const defensiveLeading = topSectorNames.some(name => defensiveSectors.includes(name));
  const growthLagging = bottomSectorNames.some(name => growthSectors.includes(name));
  const defensiveLagging = bottomSectorNames.some(name => defensiveSectors.includes(name));

  if (growthLeading && defensiveLagging) {
    signals.push({ signal: 'Sector rotation (growth leading)', value: 'bullish', weight: 0.25 });
  } else if (defensiveLeading && growthLagging) {
    signals.push({ signal: 'Sector rotation (defensive leading)', value: 'bearish', weight: 0.25 });
  } else if (growthLeading) {
    signals.push({ signal: 'Sector rotation (growth outperforming)', value: 'bullish', weight: 0.15 });
  } else if (defensiveLeading) {
    signals.push({ signal: 'Sector rotation (defensive outperforming)', value: 'bearish', weight: 0.15 });
  } else {
    signals.push({ signal: 'Sector rotation (mixed)', value: 'neutral', weight: 0.1 });
  }

  // Calculate weighted score (-1 to +1)
  let score = 0;
  let totalWeight = 0;

  for (const signal of signals) {
    const value = signal.value === 'bullish' ? 1 : signal.value === 'bearish' ? -1 : 0;
    score += value * signal.weight;
    totalWeight += signal.weight;
  }

  // Normalize score
  if (totalWeight > 0) {
    score = score / totalWeight;
  }

  // Classify regime based on score
  let regime: MarketRegime;
  let confidence: number;
  let riskAssessment: RiskAssessment;

  if (score > 0.3) {
    regime = 'Risk-On';
    confidence = Math.min(0.5 + score * 0.5, 1.0); // 0.65 to 1.0
    riskAssessment = score > 0.6 ? 'Aggressive' : 'Neutral';
  } else if (score < -0.3) {
    regime = 'Risk-Off';
    confidence = Math.min(0.5 + Math.abs(score) * 0.5, 1.0); // 0.65 to 1.0
    riskAssessment = score < -0.6 ? 'Defensive' : 'Neutral';
  } else {
    regime = 'Transition';
    confidence = 0.5 + (0.3 - Math.abs(score)) * 0.5; // 0.5 to 0.65
    riskAssessment = 'Neutral';
  }

  // Build reasoning array
  const reasoning = signals.map(s => `${s.signal}: ${s.value}`);

  return {
    regime,
    confidence,
    riskAssessment,
    reasoning,
  };
}

/**
 * Determine market direction from S&P 500 performance
 */
export function determineMarketDirection(spy: IndexData): MarketDirection {
  // Use 1-month performance as primary indicator
  if (spy.change1M > 2) {
    return 'Up';
  } else if (spy.change1M < -2) {
    return 'Down';
  } else {
    return 'Sideways';
  }
}

/**
 * Generate executive summary of market regime
 */
export function generateMarketSummary(params: {
  regime: MarketRegime;
  confidence: number;
  vix: number | null;
  spy: IndexData;
  topSectors: SectorData[];
  bottomSectors: SectorData[];
}): string {
  const { regime, confidence, vix, spy, topSectors, bottomSectors } = params;

  const confidencePercent = Math.round(confidence * 100);
  const vixLevel = vix !== null ? vix.toFixed(1) : 'N/A';
  const spyChange = spy.change1M > 0 ? `+${spy.change1M.toFixed(1)}%` : `${spy.change1M.toFixed(1)}%`;

  const topSectorNames = topSectors.map(s => s.name).join(', ');
  const bottomSectorNames = bottomSectors.map(s => s.name).join(', ');

  let summary = '';

  if (regime === 'Risk-On') {
    summary = `Markets are in a **Risk-On** regime (${confidencePercent}% confidence). `;
    summary += `The S&P 500 is ${spyChange} over the past month with VIX at ${vixLevel}, indicating low volatility. `;
    summary += `Growth sectors (${topSectorNames}) are leading, while defensive sectors (${bottomSectorNames}) are lagging. `;
    summary += `**Investment Implications:** Favor growth stocks, high-beta names, and cyclical sectors. `;
    summary += `Risk appetite is healthy—consider adding to positions on pullbacks.`;
  } else if (regime === 'Risk-Off') {
    summary = `Markets are in a **Risk-Off** regime (${confidencePercent}% confidence). `;
    summary += `The S&P 500 is ${spyChange} over the past month with VIX at ${vixLevel}, indicating elevated volatility. `;
    summary += `Defensive sectors (${topSectorNames}) are leading, while growth sectors (${bottomSectorNames}) are lagging. `;
    summary += `**Investment Implications:** Favor defensive stocks, low-beta names, and quality companies. `;
    summary += `Risk appetite is weak—reduce exposure to speculative positions and preserve capital.`;
  } else {
    summary = `Markets are in a **Transition** regime (${confidencePercent}% confidence). `;
    summary += `The S&P 500 is ${spyChange} over the past month with VIX at ${vixLevel}. `;
    summary += `Sector rotation is mixed with both growth (${topSectorNames.split(',')[0]}) and defensive (${bottomSectorNames.split(',')[0]}) sectors showing strength. `;
    summary += `**Investment Implications:** Maintain a balanced approach. `;
    summary += `Avoid large directional bets until regime clarity emerges. Focus on stock-specific opportunities.`;
  }

  return summary;
}

/**
 * Generate key insights from market context
 */
export function generateKeyInsights(params: {
  regime: MarketRegime;
  vix: number | null;
  spy: IndexData;
  sectors: SectorData[];
  economic: any;
}): string[] {
  const { vix, spy, sectors, economic } = params;

  const insights: string[] = [];

  // VIX insights
  if (vix !== null) {
    if (vix < 15) {
      insights.push(`🟢 Volatility is very low (VIX ${vix.toFixed(1)}) - complacency risk`);
    } else if (vix > 30) {
      insights.push(`🔴 Volatility is elevated (VIX ${vix.toFixed(1)}) - fear in the market`);
    }
  }

  // S&P 500 technical insights
  if (spy.ma50 !== null && spy.ma200 !== null) {
    const above50 = spy.price > spy.ma50;
    const above200 = spy.price > spy.ma200;

    if (above50 && above200) {
      insights.push(`✅ S&P 500 above both 50D and 200D moving averages - bullish trend`);
    } else if (!above50 && !above200) {
      insights.push(`⚠️ S&P 500 below both 50D and 200D moving averages - bearish trend`);
    } else if (above200 && !above50) {
      insights.push(`⚠️ S&P 500 pullback to 50D MA - potential support test`);
    }
  }

  // Sector rotation insights
  const topSector = sectors[0];
  const bottomSector = sectors[sectors.length - 1];

  insights.push(
    `📈 Best performing sector: ${topSector.name} (+${topSector.change1M.toFixed(1)}% 1M)`
  );
  insights.push(
    `📉 Worst performing sector: ${bottomSector.name} (${bottomSector.change1M.toFixed(1)}% 1M)`
  );

  // Economic insights
  if (economic.yieldCurveSpread !== null && economic.yieldCurveSpread < 0) {
    insights.push(`⚠️ Yield curve inverted (${economic.yieldCurveSpread.toFixed(2)}%) - recession risk`);
  }

  return insights;
}
