/**
 * Market Context Types
 *
 * Shared types for market regime analysis, sector rotation,
 * and macro environment tracking.
 *
 * v1.1.0 - Market Context Integration
 */

/**
 * Market regime classification
 */
export type MarketRegime = 'Risk-On' | 'Risk-Off' | 'Transition';

/**
 * Risk assessment level for portfolio positioning
 */
export type RiskAssessment = 'Aggressive' | 'Neutral' | 'Defensive';

/**
 * Market direction indicator
 */
export type MarketDirection = 'Up' | 'Down' | 'Sideways';

/**
 * Index/ETF data point
 */
export interface IndexData {
  symbol: string;
  price: number;
  change1D: number;
  change5D: number;
  change1M: number;
  ma50: number | null;
  ma200: number | null;
}

/**
 * Sector ETF performance data
 */
export interface SectorData {
  symbol: string;
  name: string;
  change1M: number;
  rank: number; // 1 = best performing, 11 = worst
}

/**
 * Economic indicators from FRED
 */
export interface EconomicData {
  fedFundsRate: number | null;
  unemployment: number | null;
  cpiYoY: number | null;
  yieldCurveSpread: number | null; // 10Y-2Y spread
  consumerSentiment: number | null;
}

/**
 * Market regime classification result
 */
export interface RegimeClassification {
  regime: MarketRegime;
  confidence: number; // 0.0 to 1.0
  riskAssessment: RiskAssessment;
  reasoning: string[];
}

/**
 * Complete market context snapshot
 */
export interface MarketContext {
  timestamp: string; // ISO 8601
  date: string; // YYYY-MM-DD

  // Regime classification
  regime: MarketRegime;
  regimeConfidence: number;
  riskAssessment: RiskAssessment;

  // US Market indices
  spy: IndexData;
  qqq: IndexData;
  dia: IndexData;
  iwm: IndexData;
  vix: number;
  marketDirection: MarketDirection;

  // Sector rotation
  sectorLeaders: SectorData[]; // Top 3
  sectorLaggards: SectorData[]; // Bottom 3
  allSectors: SectorData[]; // All 11, ranked

  // Economic environment
  economic: EconomicData;

  // Analysis summary
  summary: string;
  keyInsights: string[];
}

/**
 * Market context delta (changes since previous analysis)
 */
export interface MarketContextDelta {
  daysElapsed: number;
  regimeChange: boolean;
  previousRegime?: MarketRegime;
  vixChange: number;
  sp500Change: number;
  sectorRotation: {
    gainers: string[]; // Sectors that moved up in rank
    losers: string[]; // Sectors that moved down in rank
  };
}
