/**
 * Market Module - Public API
 *
 * Exports all market context functionality
 *
 * v1.1.0 - Market Context Integration
 */

// Main entry point
export { getMarketContext, getSectorDataForStock } from './context';

// Types
export type {
  MarketContext,
  MarketRegime,
  RiskAssessment,
  MarketDirection,
  IndexData,
  SectorData,
  EconomicData,
  RegimeClassification,
  MarketContextDelta,
} from './types';

// Cache management (for testing/debugging)
export {
  getCachedMarketContext,
  cacheMarketContext,
  clearMarketContextCache,
  getCacheMetadata,
} from './cache';

// Classifier functions (for advanced use cases)
export {
  classifyMarketRegime,
  determineMarketDirection,
  generateMarketSummary,
  generateKeyInsights,
} from './regime-classifier';
