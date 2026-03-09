/**
 * Unified Prompt Builder (Single Source of Truth)
 *
 * All LLM providers use this shared prompt template.
 * This ensures consistency and eliminates 3x maintenance burden.
 *
 * v1.0.3 - Refactored from separate provider-specific prompts
 * v1.0.4 - Optimized for information density and scannability
 * v1.0.8 - Delta-first prompt structure with regime-aware interpretation
 */

import { AnalysisContext } from '../types';
import { buildDeltaFirstPrompt } from './delta-first';

/**
 * Build optimized analysis prompt for any LLM provider
 *
 * v1.0.8: Now uses delta-first prompt structure that leads with:
 * 1. Market Environment (regime, sector flow)
 * 2. What Changed Since Last Analysis (delta-aware)
 * 3. Current Metrics (supporting context)
 * 4. Regime-Aware Interpretation Guidelines
 *
 * Targets 1,800-2,200 tokens for optimal information density.
 */
export function buildAnalysisPrompt(context: AnalysisContext): string {
  // Use delta-first prompt builder (v1.0.8)
  return buildDeltaFirstPrompt(context);
}

// Note: Helper functions moved to delta-first.ts
// All formatting logic now centralized in the delta-first prompt builder
