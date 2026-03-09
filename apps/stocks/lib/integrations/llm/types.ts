/**
 * LLM Abstraction Layer - Core Types
 *
 * Shared types and interfaces for all LLM providers
 */

import { MarketContext } from '../../domain/market';

/**
 * Stock Event data for upcoming events (v1.2.17: Event-aware analysis)
 */
export interface StockEvent {
  eventType: string;
  eventDate: string; // YYYY-MM-DD
  description: string;
  confidence: string;
  impactPotential?: string;
  epsEstimate?: number;
  dividendAmount?: number;
  fiscalQuarter?: string;
  fiscalYear?: number;
}

export interface AnalysisContext {
  ticker: string;
  currentDate: string; // ISO date string (e.g., "2025-11-16")
  currentMetrics: Record<string, any>; // Expanded to include all technical, fundamental, and macro data
  marketContext?: MarketContext | null; // NEW: Market regime and sector rotation context
  upcomingEvents?: StockEvent[]; // NEW v1.2.17: Upcoming events for event-aware analysis
  previousAnalysis?: {
    date: string;
    compositeScore: number;
    recommendation: string;
    metrics: Record<string, any>;
  };
  historicalAnalyses?: Array<{
    date: string;
    compositeScore: number;
    recommendation: string;
  }>;
  deltas?: {
    daysElapsed: number;
    scoreChange: number;
    trendDirection: 'improving' | 'declining' | 'stable';
    trendEmoji: string; // NEW v1.0.8: ⬆️ ⬇️ ⏸️ 🔄
    significance: 'Major' | 'Notable' | 'Minor'; // NEW v1.0.8
    categoryDeltas: {
      technical: number;
      fundamental: number;
      macro: number;
      risk: number;
      sentiment: number;
      marketAlignment?: number;
    };
    priceDeltas: {
      priceChange: number; // NEW v1.0.8: Absolute price change
      priceChangePercent: number;
      volumeChangePercent: number;
      annualizedReturn?: number;
    };
    recommendationChanged: boolean; // NEW v1.0.8
    recommendationDelta: string; // NEW v1.0.8: "Buy → Strong Buy"
    regimeTransition?: { // NEW v1.0.8: Market regime shift detection
      occurred: boolean;
      from?: string;
      to?: string;
      message?: string;
    };
  };
}

export interface AnalysisResult {
  content: string;          // Full 7-section analysis
  modelUsed: string;        // e.g., "gemini-2.5-flash"
  tokensUsed: {
    input: number;
    output: number;
  };
  latencyMs: number;
  cost: number;
}

export interface LLMConfig {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  // Provider-specific options
  [key: string]: any;
}
