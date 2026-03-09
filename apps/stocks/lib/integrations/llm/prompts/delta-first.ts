/**
 * Delta-First Prompt Builder
 *
 * Restructured prompt that leads with changes and market context.
 * Emphasizes what changed, why it matters, and regime-aware interpretation.
 *
 * v1.0.8 - Delta-First Analysis Engine
 */

import { AnalysisContext } from '../types';
import { formatDelta, formatPercent } from '../../../domain/analysis/deltas';

/**
 * Build delta-first analysis prompt for LLM
 *
 * Structure:
 * 1. Market Environment (FIRST)
 * 2. What Changed Since Last Analysis (SECOND)
 * 3. Current Metrics Context
 * 4. Regime-Aware Delta Interpretation Guidelines
 * 5. Output Structure (delta-first sections)
 */
export function buildDeltaFirstPrompt(context: AnalysisContext): string {
  const { ticker, currentDate, currentMetrics, marketContext, previousAnalysis, deltas } = context;
  // historicalAnalyses will be used in Phase 2 for pattern recognition

  // Determine recommendation badge and callout color
  const { badge, calloutColor } = getRecommendationFormatting(currentMetrics.recommendation);

  let prompt = '';

  // Role and optimization instructions
  prompt += `You are a professional stock analyst with access to historical data. Generate a DELTA-FIRST analysis for ${ticker}.\n\n`;
  prompt += `**PRIMARY TASK:** Explain what changed and why it matters in the context of market conditions.\n\n`;

  prompt += `**CRITICAL FORMAT RULES:**\n`;
  prompt += `- Lead with CHANGES first, not static snapshots\n`;
  prompt += `- Use trend emojis: ⬆️ ⬇️ ⏸️ 🔄 (improving, declining, stable, mixed)\n`;
  prompt += `- Use status emojis: 🔥=critical 🚀=bullish ✅=confirmed ⚠️=risk ⛔=stop\n`;
  prompt += `- Use tables for comparisons (entry zones, targets, technical indicators)\n`;
  prompt += `- Bold key insights and numbers\n`;
  prompt += `- NO fluff - every sentence adds value\n`;
  prompt += `- **TARGET: 1,800-2,200 tokens total**\n\n`;

  // ========================================
  // SECTION 1: MARKET ENVIRONMENT (LEAD WITH THIS)
  // ========================================
  prompt += `## 📊 Market Environment (Context for Analysis)\n\n`;

  if (marketContext && marketContext.regime) {
    const regimeEmoji =
      marketContext.regime === 'Risk-On' ? '⬆️' :
      marketContext.regime === 'Risk-Off' ? '⬇️' : '🔄';

    prompt += `**TODAY'S MARKET REGIME: ${regimeEmoji} ${marketContext.regime.toUpperCase()}** (${Math.round(marketContext.regimeConfidence * 100)}% confidence)\n`;
    prompt += `**Risk Assessment:** ${marketContext.riskAssessment}\n\n`;

    prompt += `**Market Overview:**\n`;
    if (marketContext.spy) {
      prompt += `- S&P 500: ${marketContext.spy.change1D > 0 ? '+' : ''}${marketContext.spy.change1D.toFixed(2)}% today | ${marketContext.spy.change1M > 0 ? '+' : ''}${marketContext.spy.change1M.toFixed(2)}% (1M)\n`;
    }
    if (marketContext.vix != null) {
      const vixSignal = marketContext.vix > 30 ? '(high fear)' : marketContext.vix < 15 ? '(low fear)' : '';
      prompt += `- VIX: ${marketContext.vix.toFixed(1)} ${vixSignal}\n`;
    }
    if (marketContext.marketDirection) {
      prompt += `- Market Direction: ${marketContext.marketDirection}\n`;
    }
    prompt += `\n`;

    // Sector flow
    if (marketContext.sectorLeaders && marketContext.sectorLaggards) {
      prompt += `**Sector Rotation (1-Month Performance):**\n`;
      if (marketContext.sectorLeaders.length > 0) {
        prompt += `- Leaders (Top 3): ${marketContext.sectorLeaders.map(s => `${s.name} (+${s.change1M.toFixed(1)}%)`).join(', ')}\n`;
      }
      if (marketContext.sectorLaggards.length > 0) {
        prompt += `- Laggards (Bottom 3): ${marketContext.sectorLaggards.map(s => `${s.name} (${s.change1M.toFixed(1)}%)`).join(', ')}\n`;
      }
      prompt += `\n`;
    }

    // Stock-specific sector alignment
    const stockSector = currentMetrics.sector;
    if (stockSector && marketContext.allSectors && marketContext.allSectors.length > 0) {
      const sectorData = marketContext.allSectors.find(s =>
        s.name.toLowerCase() === stockSector.toLowerCase()
      );
      if (sectorData) {
        const isLeader = sectorData.rank <= 3;
        const isLaggard = sectorData.rank >= 9;
        prompt += `**${ticker}'s Sector (${stockSector}):** Rank #${sectorData.rank} of 11 `;
        if (isLeader) {
          prompt += `✅ **TOP PERFORMER - strong sector tailwind**\n`;
        } else if (isLaggard) {
          prompt += `⚠️ **LAGGING SECTOR - sector headwind**\n`;
        } else {
          prompt += `(mid-pack, neutral sector)\n`;
        }
      }
    }

    if (currentMetrics.marketAlignment != null) {
      prompt += `**Market Alignment Score:** ${currentMetrics.marketAlignment.toFixed(1)}/5.0 `;
      if (currentMetrics.marketAlignment >= 4.0) {
        prompt += `✅ Excellent regime fit\n`;
      } else if (currentMetrics.marketAlignment >= 3.5) {
        prompt += `(good alignment)\n`;
      } else if (currentMetrics.marketAlignment >= 2.5) {
        prompt += `⚠️ Neutral alignment\n`;
      } else {
        prompt += `⛔ Poor regime fit\n`;
      }
      prompt += `\n`;
    }

    // Market summary
    if (marketContext.summary) {
      prompt += `**Market Interpretation:**\n${marketContext.summary}\n\n`;
    }
  } else {
    prompt += `**Market Context:** Not available for this analysis.\n\n`;
  }

  // ========================================
  // SECTION 1.5: UPCOMING EVENTS (v1.2.17: Event-aware analysis)
  // ========================================
  if (context.upcomingEvents && context.upcomingEvents.length > 0) {
    prompt += `## 📅 Upcoming Events (Next 30 Days)\n\n`;
    prompt += `**CRITICAL:** ${ticker} has upcoming catalysts that MUST be factored into your recommendation.\n\n`;

    for (const event of context.upcomingEvents) {
      // Calculate days until event
      const daysUntil = Math.round(
        (new Date(event.eventDate).getTime() - new Date(context.currentDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Urgency emoji based on proximity
      const urgencyEmoji = daysUntil <= 7 ? '🔥' : daysUntil <= 14 ? '⚠️' : '📅';

      prompt += `- ${urgencyEmoji} **${event.eventType}**: ${event.eventDate} (in ${daysUntil} day${daysUntil === 1 ? '' : 's'})\n`;

      // Add event-specific details
      if (event.description) {
        prompt += `  ${event.description}\n`;
      }
      if (event.epsEstimate !== undefined && event.fiscalQuarter) {
        prompt += `  Expected EPS: $${event.epsEstimate.toFixed(2)} (${event.fiscalQuarter} ${event.fiscalYear})\n`;
      }
      if (event.dividendAmount !== undefined) {
        prompt += `  Dividend: $${event.dividendAmount.toFixed(2)} per share\n`;
      }
    }

    prompt += `\n**Event Awareness Guidelines:**\n`;

    // Check for imminent high-impact events (earnings within 7 days)
    const imminentEarnings = context.upcomingEvents.filter(e => {
      const daysUntil = Math.round(
        (new Date(e.eventDate).getTime() - new Date(context.currentDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      return e.eventType === 'Earnings Call' && daysUntil <= 7;
    });

    const nearTermDividends = context.upcomingEvents.filter(e => {
      const daysUntil = Math.round(
        (new Date(e.eventDate).getTime() - new Date(context.currentDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      return e.eventType === 'Dividend' && daysUntil <= 14;
    });

    const distantCatalysts = context.upcomingEvents.filter(e => {
      const daysUntil = Math.round(
        (new Date(e.eventDate).getTime() - new Date(context.currentDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysUntil > 14;
    });

    if (imminentEarnings.length > 0) {
      prompt += `- 🔥 **EARNINGS WITHIN 7 DAYS:** Note elevated volatility risk. Consider waiting for earnings before entering/exiting.\n`;
      prompt += `- Highlight this prominently in your Risk Assessment section.\n`;
    }

    if (nearTermDividends.length > 0) {
      prompt += `- 💰 **DIVIDEND APPROACHING:** Mention this for income-focused investors. Ex-date and payment date matter for entry timing.\n`;
    }

    if (distantCatalysts.length > 0) {
      prompt += `- 📅 **DISTANT CATALYST:** Assess whether to wait for the event or act now based on current technical/fundamental signals.\n`;
    }

    prompt += `- **INTEGRATE INTO RECOMMENDATION:** Don't just list events—explain how they change the risk/reward profile.\n\n`;
  }

  // ========================================
  // SECTION 2: WHAT CHANGED SINCE LAST ANALYSIS
  // ========================================
  if (previousAnalysis && deltas) {
    prompt += `## 📈 What Changed Since Last Analysis\n\n`;
    prompt += `⚠️ **NOTE:** The date "${previousAnalysis.date}" below is HISTORICAL REFERENCE ONLY. Do NOT use in "Key Dates"!\n\n`;
    prompt += `**Previous Analysis:** ${previousAnalysis.date} (${deltas.daysElapsed || '?'} days ago)\n\n`;

    // Regime transition (if occurred)
    if (deltas.regimeTransition?.occurred) {
      prompt += `🔥 **REGIME SHIFT DETECTED:**\n`;
      prompt += `${deltas.regimeTransition.message}\n\n`;
    }

    // Score change
    prompt += `**Composite Score:** ${previousAnalysis.compositeScore.toFixed(1)} → ${currentMetrics.compositeScore.toFixed(1)} `;
    prompt += `${deltas.trendEmoji} **${formatDelta(deltas.scoreChange)}** (${deltas.significance} change, ${deltas.trendDirection})\n\n`;

    // Regime-aware delta interpretation
    if (marketContext?.regime && deltas.regimeTransition?.occurred) {
      prompt += `**Regime Context for Score Change:**\n`;
      if (marketContext.regime === 'Risk-Off' && deltas.scoreChange < 0) {
        prompt += `- Score decline is **consistent with Risk-Off regime**. Growth stocks typically see compression in defensive markets.\n`;
        prompt += `- This is a **regime-driven move**, not necessarily a stock-specific problem.\n`;
        prompt += `- If Risk-On returns, expect scores to recover.\n\n`;
      } else if (marketContext.regime === 'Risk-On' && deltas.scoreChange > 0) {
        prompt += `- Score improvement is **aligned with Risk-On regime**. Growth stocks favored in bullish environments.\n`;
        prompt += `- This is **both regime tailwind AND stock strength**.\n`;
        prompt += `- Momentum likely to continue if regime persists.\n\n`;
      } else if (marketContext.regime === 'Risk-Off' && deltas.scoreChange > 0) {
        prompt += `- Score improving **despite Risk-Off regime** shows **contrarian strength**.\n`;
        prompt += `- Stock demonstrating defensive characteristics or strong fundamentals.\n`;
        prompt += `- This is a **positive signal** - outperforming the environment.\n\n`;
      } else if (marketContext.regime === 'Risk-On' && deltas.scoreChange < 0) {
        prompt += `- Score declining **despite favorable Risk-On regime** is a **warning signal**.\n`;
        prompt += `- Investigate fundamental weakness - stock underperforming peers.\n`;
        prompt += `- May indicate company-specific issues.\n\n`;
      }
    } else if (marketContext?.regime) {
      // No regime transition, but provide context
      prompt += `**Regime Context:**\n`;
      prompt += `- Market regime is **${marketContext.regime}** (same as previous analysis)\n`;
      if (Math.abs(deltas.scoreChange) < 0.2) {
        prompt += `- Score stability expected in current environment\n\n`;
      } else {
        prompt += `- Score change reflects stock-specific dynamics, not regime shift\n\n`;
      }
    }

    // Category deltas
    if (deltas.categoryDeltas) {
      prompt += `**Category Score Changes:**\n`;
      prompt += `| Category | Delta | Interpretation |\n`;
      prompt += `|----------|-------|----------------|\n`;
      prompt += `| Technical | ${formatDelta(deltas.categoryDeltas.technical)} | ${getTrendLabel(deltas.categoryDeltas.technical)} |\n`;
      prompt += `| Fundamental | ${formatDelta(deltas.categoryDeltas.fundamental)} | ${getTrendLabel(deltas.categoryDeltas.fundamental)} |\n`;
      prompt += `| Macro | ${formatDelta(deltas.categoryDeltas.macro)} | ${getTrendLabel(deltas.categoryDeltas.macro)} |\n`;
      prompt += `| Risk | ${formatDelta(deltas.categoryDeltas.risk)} | ${getTrendLabel(deltas.categoryDeltas.risk)} |\n`;
      if (deltas.categoryDeltas.marketAlignment != null) {
        prompt += `| Market Alignment | ${formatDelta(deltas.categoryDeltas.marketAlignment)} | ${getTrendLabel(deltas.categoryDeltas.marketAlignment)} |\n`;
      }
      prompt += `\n`;
    }

    // Price performance
    if (deltas.priceDeltas) {
      const priceEmoji = deltas.priceDeltas.priceChangePercent > 5 ? '🚀' :
                         deltas.priceDeltas.priceChangePercent > 0 ? '📈' :
                         deltas.priceDeltas.priceChangePercent < -5 ? '⬇️' : '📉';
      prompt += `**Price Performance:**\n`;
      prompt += `- Price: ${priceEmoji} **${formatPercent(deltas.priceDeltas.priceChangePercent)}** over ${deltas.daysElapsed} days\n`;
      prompt += `- Volume: ${formatPercent(deltas.priceDeltas.volumeChangePercent)} vs previous\n`;
      if (deltas.priceDeltas.annualizedReturn) {
        prompt += `- Annualized Return: ${formatPercent(deltas.priceDeltas.annualizedReturn)}\n`;
      }
      prompt += `\n`;

      // Score/price alignment check
      const scorePriceAligned = checkScorePriceAlignment(deltas.scoreChange, deltas.priceDeltas.priceChangePercent);
      if (!scorePriceAligned) {
        prompt += `⚠️ **DIVERGENCE ALERT:** Price and score moving in different directions. Investigate cause:\n`;
        if (deltas.scoreChange > 0 && deltas.priceDeltas.priceChangePercent < 0) {
          prompt += `- Fundamentals improving but price lagging → potential entry opportunity\n`;
        } else {
          prompt += `- Price outpacing fundamentals → potential overvaluation risk\n`;
        }
        prompt += `\n`;
      }
    }

    // Recommendation change
    if (deltas.recommendationChanged) {
      prompt += `**Recommendation Change:** ${deltas.recommendationDelta} 🔥\n\n`;
    }

    prompt += `⚠️ **REMINDER:** The date ${previousAnalysis.date} is PAST. Do NOT reference it in "Key Dates".\n\n`;
  } else {
    prompt += `## 🆕 First Analysis for ${ticker}\n\n`;
    prompt += `This is the first analysis for this ticker. No historical comparison available.\n`;
    prompt += `Building your historical dataset for future pattern recognition (need 5+ analyses).\n\n`;
  }

  // ========================================
  // SECTION 3: CURRENT METRICS CONTEXT
  // ========================================
  prompt += `## 📊 Current Metrics Snapshot\n\n`;
  prompt += `**Date:** ${currentDate}\n`;
  prompt += `**Company:** ${currentMetrics.companyName || ticker} (${ticker})`;
  if (currentMetrics.sector || currentMetrics.industry) {
    prompt += ` - ${currentMetrics.sector || ''}${currentMetrics.sector && currentMetrics.industry ? ' / ' : ''}${currentMetrics.industry || ''}`;
  }
  prompt += `\n`;

  if (currentMetrics.marketCap) {
    const mcap = currentMetrics.marketCap;
    const mcapFormatted = mcap >= 1e12 ? `$${(mcap / 1e12).toFixed(2)}T` :
                          mcap >= 1e9 ? `$${(mcap / 1e9).toFixed(2)}B` :
                          mcap >= 1e6 ? `$${(mcap / 1e6).toFixed(2)}M` : `$${mcap.toFixed(0)}`;
    prompt += `**Market Cap:** ${mcapFormatted}`;
    if (currentMetrics.beta != null) {
      prompt += ` | **Beta:** ${currentMetrics.beta.toFixed(2)}`;
    }
    prompt += `\n`;
  }
  prompt += `\n`;

  // Current Price and Range
  if (currentMetrics.currentPrice != null) {
    prompt += `**Current Price:** $${currentMetrics.currentPrice.toFixed(2)}\n`;

    if (currentMetrics.week52Low != null && currentMetrics.week52High != null) {
      const rangePercent = ((currentMetrics.currentPrice - currentMetrics.week52Low) / (currentMetrics.week52High - currentMetrics.week52Low) * 100);
      prompt += `**52-Week Range:** $${currentMetrics.week52Low.toFixed(2)} - $${currentMetrics.week52High.toFixed(2)} (at ${rangePercent.toFixed(0)}% of range)\n`;
    }

    if (currentMetrics.ma50 != null) {
      const ma50Diff = ((currentMetrics.currentPrice - currentMetrics.ma50) / currentMetrics.ma50 * 100);
      prompt += `**50-day MA:** $${currentMetrics.ma50.toFixed(2)} (${ma50Diff > 0 ? '+' : ''}${ma50Diff.toFixed(1)}%)\n`;
    }

    if (currentMetrics.ma200 != null) {
      const ma200Diff = ((currentMetrics.currentPrice - currentMetrics.ma200) / currentMetrics.ma200 * 100);
      prompt += `**200-day MA:** $${currentMetrics.ma200.toFixed(2)} (${ma200Diff > 0 ? '+' : ''}${ma200Diff.toFixed(1)}%)\n`;
    }
    prompt += `\n`;
  }

  // Scores
  prompt += `**Analysis Scores:**\n`;
  prompt += `- **Composite:** ${currentMetrics.compositeScore.toFixed(1)}/5.0 (${currentMetrics.recommendation})\n`;
  prompt += `- Technical: ${currentMetrics.technicalScore.toFixed(1)} | Fundamental: ${currentMetrics.fundamentalScore.toFixed(1)} | Macro: ${currentMetrics.macroScore.toFixed(1)}\n`;
  prompt += `- Risk: ${currentMetrics.riskScore.toFixed(1)} | Market Alignment: ${currentMetrics.marketAlignment?.toFixed(1) || '3.0'}\n`;
  prompt += `- Pattern: ${currentMetrics.pattern} | Confidence: ${currentMetrics.confidence}/5.0\n\n`;

  // Key technical indicators
  if (currentMetrics.rsi != null || currentMetrics.volume != null) {
    prompt += `**Key Indicators:**\n`;
    if (currentMetrics.rsi != null) {
      const rsiSignal = currentMetrics.rsi > 70 ? '(overbought)' : currentMetrics.rsi < 30 ? '(oversold)' : '';
      prompt += `- RSI: ${currentMetrics.rsi.toFixed(1)} ${rsiSignal}\n`;
    }
    if (currentMetrics.volume != null && currentMetrics.avgVolume != null) {
      const volChange = ((currentMetrics.volume - currentMetrics.avgVolume) / currentMetrics.avgVolume * 100);
      prompt += `- Volume: ${volChange > 0 ? '+' : ''}${volChange.toFixed(1)}% vs avg\n`;
    }
    if (currentMetrics.volatility30d != null) {
      prompt += `- 30D Volatility: ${(currentMetrics.volatility30d * 100).toFixed(1)}%\n`;
    }
    prompt += `\n`;
  }

  // Key fundamentals
  if (currentMetrics.peRatio != null || currentMetrics.eps != null) {
    prompt += `**Key Fundamentals:**\n`;
    if (currentMetrics.peRatio != null) prompt += `- P/E: ${currentMetrics.peRatio.toFixed(1)}\n`;
    if (currentMetrics.eps != null) prompt += `- EPS: $${currentMetrics.eps.toFixed(2)}\n`;
    if (currentMetrics.debtToEquity != null) prompt += `- Debt/Equity: ${currentMetrics.debtToEquity.toFixed(2)}\n`;
    prompt += `\n`;
  }

  // ========================================
  // SECTION 4: REGIME-AWARE DELTA INTERPRETATION GUIDELINES
  // ========================================
  prompt += `## 🎯 Delta Interpretation Guidelines (CRITICAL)\n\n`;

  prompt += `**Your task is to interpret score/price changes within market regime context:**\n\n`;

  prompt += `**Risk-On Regime:**\n`;
  prompt += `- Score ⬆️ + Price ⬆️ = Riding the tailwind (growth stocks favored) ✅\n`;
  prompt += `- Score ⬇️ despite Risk-On = Warning signal, investigate fundamentals ⚠️\n`;
  prompt += `- Price lagging score = Potential entry opportunity 🎯\n\n`;

  prompt += `**Risk-Off Regime:**\n`;
  prompt += `- Score ⬇️ for growth stocks = Expected (sector-wide rotation, not stock-specific) ✅\n`;
  prompt += `- Score ⬆️ despite Risk-Off = Contrarian strength, defensive quality 🚀\n`;
  prompt += `- Price falling faster than score = Potential capitulation (for risk-tolerant) ⚠️\n\n`;

  prompt += `**Transition Regime:**\n`;
  prompt += `- Score ⬆️ = Building momentum (could accelerate if Risk-On confirms) 📈\n`;
  prompt += `- Score ⬇️ = Losing momentum (could accelerate if Risk-Off confirms) 📉\n`;
  prompt += `- Watch for regime confirmation signals\n\n`;

  prompt += `**KEY RULE:** Always explain HOW the market regime contextualizes the delta. Never just report numbers.\n\n`;

  prompt += `**Examples:**\n`;
  prompt += `- ❌ Bad: "Score dropped 0.5 points"\n`;
  prompt += `- ✅ Good: "Score dropped 0.5 points, consistent with Risk-Off regime rotation away from growth stocks"\n\n`;

  prompt += `- ❌ Bad: "Price up 8%, score up 0.6"\n`;
  prompt += `- ✅ Good: "Price surged 8% and score jumped 0.6—both benefiting from Risk-On tailwind in Technology sector (Rank #1 today)"\n\n`;

  // ========================================
  // SECTION 5: DATA GROUNDING RULES
  // ========================================
  prompt += buildDataGroundingRules(currentDate, currentMetrics, previousAnalysis);

  // ========================================
  // SECTION 6: OUTPUT STRUCTURE (Delta-First)
  // ========================================
  prompt += `## 📝 Required Output Structure (Delta-First)\n\n`;

  prompt += `### Section 1: Executive Summary\n\n`;
  prompt += `Start with color-coded callout (use tab indentation for all callout content):\n\n`;
  prompt += `<callout icon="${badge}" color="${calloutColor}">\n`;
  prompt += `\t**${currentMetrics.recommendation.toUpperCase()}** | Entry: [range] | Target: [range] | Stop: [price]\n`;

  if (previousAnalysis && deltas) {
    prompt += `\t<empty-block/>\n`;
    prompt += `\t**What Changed (${deltas.daysElapsed || '?'} days)**\n`;
    prompt += `\t- Score: ${deltas.trendEmoji} ${formatDelta(deltas.scoreChange)} (${deltas.trendDirection})\n`;
    prompt += `\t- Price: ${formatPercent(deltas.priceDeltas?.priceChangePercent || 0)}\n`;
    prompt += `\t- [Biggest category change with interpretation]\n`;
  }

  prompt += `\t<empty-block/>\n`;
  prompt += `\t**Why Now?**\n`;
  prompt += `\t- [Time-sensitive catalyst or setup]\n`;
  prompt += `\t- [Key technical/fundamental confirmation]\n`;
  prompt += `\t- [Risk/reward or timing element]\n`;

  prompt += `\t<empty-block/>\n`;
  prompt += `\t**Key Risks**\n`;
  prompt += `\t- ⚠️ [Risk 1]\n`;
  prompt += `\t- ⚠️ [Risk 2]\n`;
  prompt += `\t- ⚠️ [Risk 3]\n`;

  prompt += `\t<empty-block/>\n`;
  prompt += `\t**Thesis:** [1-2 sentences: advantage → catalyst → outcome]\n`;
  prompt += `</callout>\n\n`;

  prompt += `---\n`;
  prompt += `### Section 2: Trade Setup\n\n`;
  prompt += `[Entry Zones table, Profit Targets table, Key Dates (future only!)]\n\n`;

  prompt += `---\n`;
  prompt += `### Section 3: Catalysts & Risks\n\n`;
  if (previousAnalysis && deltas) {
    prompt += `**What Changed in Setup:**\n`;
    prompt += `- [Connect deltas to trade thesis]\n`;
    prompt += `- [Validate score changes vs price]\n\n`;
  }
  prompt += `**Top 3 Catalysts 🚀** | **Top 3 Risks ⚠️**\n\n`;

  prompt += `---\n`;
  prompt += `### Section 4: Technical Picture\n\n`;
  if (previousAnalysis && deltas) {
    prompt += `**Trend Status:** ${deltas.trendEmoji} ${deltas.trendDirection} over ${deltas.daysElapsed} days\n\n`;
  }
  prompt += `[Key Indicators table with Trend column if delta exists]\n`;
  prompt += `[Support/Resistance levels]\n\n`;

  prompt += `---\n`;
  prompt += `### Section 5: Position Sizing\n\n`;
  prompt += `[Allocation table by risk tolerance]\n`;
  prompt += `[Portfolio considerations]\n`;
  prompt += `[Re-evaluate triggers]\n\n`;

  if (previousAnalysis && deltas) {
    prompt += `**IMPORTANT:** Weave delta insights throughout all sections. Connect changes to actionable trade decisions.\n\n`;
  }

  prompt += `**TONE:** Direct, confident, actionable. Lead with changes and regime context.\n`;
  prompt += `**REMEMBER:** 1,800-2,200 tokens. Information density > word count.\n`;

  return prompt;
}

/**
 * Build data grounding rules section
 */
function buildDataGroundingRules(
  currentDate: string,
  currentMetrics: any,
  _previousAnalysis: any // Prefix with _ to indicate intentionally unused
): string {
  let rules = '';

  rules += `## ⚠️ Data Grounding Rules (CRITICAL)\n\n`;
  rules += `**You MUST only use the data provided above. Do NOT invent or hallucinate information.**\n\n`;

  // Date awareness
  const [year, month] = currentDate.split('-').map(Number);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonthName = monthNames[month - 1];
  const currentQuarter = Math.ceil(month / 3);

  rules += `**DATE AWARENESS:**\n`;
  rules += `- TODAY is ${currentMonthName} ${year}. Current quarter: Q${currentQuarter} ${year}\n`;
  rules += `- The ENTIRE YEAR ${year - 1} is in the PAST\n`;
  rules += `- "Key Dates" section MUST contain ONLY future events\n`;
  rules += `- Use generic language: "Upcoming earnings", "Next Fed meeting"\n\n`;

  rules += `**FORBIDDEN:**\n`;
  rules += `- ❌ Any mention of "${year - 1}" as a future date\n`;
  rules += `- ❌ "Q4 ${year - 1} earnings" (this already happened!)\n`;
  rules += `- ❌ Using dates from "Previous Analysis" section in "Key Dates"\n\n`;

  // Price constraints
  if (currentMetrics.currentPrice != null) {
    const minEntry = currentMetrics.currentPrice * 0.90;
    const maxEntry = currentMetrics.currentPrice * 1.10;
    rules += `**PRICE CONSTRAINTS:**\n`;
    rules += `- Entry zones MUST be within ±10% of current price ($${minEntry.toFixed(2)} - $${maxEntry.toFixed(2)})\n`;
    rules += `- Use actual levels: Current $${currentMetrics.currentPrice.toFixed(2)}`;
    if (currentMetrics.ma50) rules += `, 50-MA $${currentMetrics.ma50.toFixed(2)}`;
    if (currentMetrics.ma200) rules += `, 200-MA $${currentMetrics.ma200.toFixed(2)}`;
    rules += `\n\n`;
  }

  return rules;
}

/**
 * Get trend label for category delta
 */
function getTrendLabel(delta: number): string {
  if (delta > 0.3) return '⬆️ Major improvement';
  if (delta > 0.1) return '📈 Improving';
  if (delta < -0.3) return '⬇️ Major decline';
  if (delta < -0.1) return '📉 Declining';
  return '⏸️ Stable';
}

/**
 * Check score/price alignment
 */
function checkScorePriceAlignment(scoreChange: number, priceChangePercent: number): boolean {
  // Both positive or both negative = aligned
  if ((scoreChange > 0 && priceChangePercent > 0) || (scoreChange < 0 && priceChangePercent < 0)) {
    return true;
  }

  // Both near zero = aligned (stable)
  if (Math.abs(scoreChange) < 0.1 && Math.abs(priceChangePercent) < 2) {
    return true;
  }

  // Divergence detected
  return false;
}

/**
 * Get recommendation formatting
 */
function getRecommendationFormatting(recommendation: string): {
  badge: string;
  calloutColor: string;
} {
  const rec = recommendation.toLowerCase();

  if (rec.includes('strong buy')) {
    return { badge: '🟢', calloutColor: 'green_bg' };
  } else if (rec.includes('buy')) {
    return { badge: '🟢', calloutColor: 'green_bg' };
  } else if (rec.includes('moderate buy')) {
    return { badge: '🟡', calloutColor: 'yellow_bg' };
  } else if (rec.includes('hold')) {
    return { badge: '🟡', calloutColor: 'yellow_bg' };
  } else if (rec.includes('moderate sell')) {
    return { badge: '🟠', calloutColor: 'orange_bg' };
  } else if (rec.includes('sell')) {
    return { badge: '🔴', calloutColor: 'red_bg' };
  } else if (rec.includes('strong sell')) {
    return { badge: '🔴', calloutColor: 'red_bg' };
  }

  return { badge: '🟡', calloutColor: 'yellow_bg' };
}
