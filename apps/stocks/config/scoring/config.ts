/**
 * Centralized Scoring Configuration
 *
 * All thresholds based on:
 * - Financial industry standards (P/E ratios, debt levels)
 * - Technical analysis conventions (RSI overbought/oversold)
 * - Economic indicators (Fed policy ranges)
 * - Market cap classifications (SEC definitions)
 *
 * Philosophy: Every magic number should have a documented reason.
 *
 * Ported from Python v0.3.0 ScoringConfig class
 */

export class ScoringConfig {
  // =========================================================================
  // MARKET CAP THRESHOLDS
  // Based on industry standard classifications and SEC definitions
  // =========================================================================

  /** $200B+ = Mega cap (Apple, Microsoft, NVDA) */
  static readonly MARKET_CAP_MEGA = 200e9;

  /** $10B+ = Large cap (S&P 500 typical range) */
  static readonly MARKET_CAP_LARGE = 10e9;

  /** $2B+ = Mid cap, Russell 2000 upper range */
  static readonly MARKET_CAP_MID = 2e9;

  /** $100B+ for risk scoring - too-big-to-fail territory */
  static readonly MARKET_CAP_RISK_SAFE = 100e9;

  // =========================================================================
  // P/E RATIO RANGES
  // Based on historical S&P 500 averages (~15-20 long-term)
  // =========================================================================

  /** Below this = potentially undervalued (Graham/Buffett zone) */
  static readonly PE_RATIO_OPTIMAL_MIN = 10;

  /** Above this = potentially overvalued (historical S&P 500 median ~18-20) */
  static readonly PE_RATIO_OPTIMAL_MAX = 25;

  /** Extreme undervalue or distressed - requires investigation */
  static readonly PE_RATIO_ACCEPTABLE_MIN = 5;

  /** Growth stock territory - tech/growth premium justified if earnings growing >20% */
  static readonly PE_RATIO_ACCEPTABLE_MAX = 35;

  // =========================================================================
  // RSI THRESHOLDS
  // Standard technical analysis ranges (Wilder, 1978)
  // =========================================================================

  // Technical Scoring RSI Bands
  static readonly RSI_NEUTRAL_MIN = 40;
  static readonly RSI_NEUTRAL_MAX = 60;
  static readonly RSI_MODERATE_LOW_MIN = 30;
  static readonly RSI_MODERATE_LOW_MAX = 40;
  static readonly RSI_MODERATE_HIGH_MIN = 60;
  static readonly RSI_MODERATE_HIGH_MAX = 70;

  // Sentiment Scoring RSI Bands (tighter ranges)
  static readonly RSI_SENTIMENT_NEUTRAL_MIN = 45;
  static readonly RSI_SENTIMENT_NEUTRAL_MAX = 55;
  static readonly RSI_SENTIMENT_MODERATE_LOW_MIN = 35;
  static readonly RSI_SENTIMENT_MODERATE_LOW_MAX = 45;
  static readonly RSI_SENTIMENT_MODERATE_HIGH_MIN = 55;
  static readonly RSI_SENTIMENT_MODERATE_HIGH_MAX = 65;

  // =========================================================================
  // MACD SETTINGS
  // Standard 12-26-9 configuration (Appel, 1979)
  // =========================================================================

  /** MACD at 90% of signal = near crossover - anticipates momentum shift */
  static readonly MACD_SIGNAL_CONVERGENCE = 0.9;

  // =========================================================================
  // VOLUME THRESHOLDS
  // Institutional flow detection
  // =========================================================================

  /** 120% of 20-day avg = unusual activity (institutional interest) */
  static readonly VOLUME_SPIKE_RATIO = 1.2;

  /** 150%+ = strong conviction (often precedes breakouts) */
  static readonly VOLUME_SURGE_RATIO = 1.5;

  // =========================================================================
  // PRICE CHANGE THRESHOLDS
  // Momentum classification
  // =========================================================================

  /** 10%+ monthly gain = strong momentum (outperforming S&P 500) */
  static readonly PRICE_CHANGE_STRONG = 0.1;

  /** Any gain = positive momentum */
  static readonly PRICE_CHANGE_POSITIVE = 0.0;

  /** 2% daily = moderate intraday move (above noise threshold) */
  static readonly PRICE_CHANGE_MODERATE_1D = 0.02;

  /** 5%+ monthly for sentiment scoring (positive market perception) */
  static readonly PRICE_CHANGE_STRONG_1M_SENTIMENT = 0.05;

  // =========================================================================
  // DEBT RATIOS
  // Conservative financial health standards
  // =========================================================================

  /** <0.5 = excellent balance sheet (tech companies often operate here) */
  static readonly DEBT_TO_EQUITY_IDEAL = 0.5;

  /** <1.0 = acceptable leverage (traditional corporate finance standard) */
  static readonly DEBT_TO_EQUITY_ACCEPTABLE = 1.0;

  // =========================================================================
  // REVENUE THRESHOLDS
  // Scale and operational maturity
  // =========================================================================

  /** $10B+ TTM = significant enterprise (Fortune 500 territory) */
  static readonly REVENUE_SIGNIFICANT = 10e9;

  // =========================================================================
  // EPS THRESHOLDS
  // Profitability benchmarks
  // =========================================================================

  /** $5+ EPS = strong profitability (mega-cap earnings power) */
  static readonly EPS_STRONG = 5.0;

  /** Positive = profitable (vs loss-making) */
  static readonly EPS_POSITIVE = 0.0;

  // =========================================================================
  // MACRO ECONOMIC THRESHOLDS
  // Fed policy ranges and historical economic data
  // =========================================================================

  /** <2% = accommodative monetary policy (risk-on environment) */
  static readonly FED_FUNDS_LOW = 2.0;

  /** <4% = neutral policy territory (balanced stance) */
  static readonly FED_FUNDS_MODERATE = 4.0;

  /** <6% = restrictive but not extreme */
  static readonly FED_FUNDS_HIGH = 6.0;

  /** <4.5% = strong labor market (full employment by Fed definition) */
  static readonly UNEMPLOYMENT_HEALTHY = 4.5;

  /** <6% = acceptable conditions (historical average ~5-6%) */
  static readonly UNEMPLOYMENT_ACCEPTABLE = 6.0;

  /** >80 = strong confidence (correlates with consumer spending) */
  static readonly CONSUMER_SENTIMENT_STRONG = 80;

  /** >60 = moderate confidence (below 60 = recession risk) */
  static readonly CONSUMER_SENTIMENT_MODERATE = 60;

  // =========================================================================
  // VOLATILITY THRESHOLDS
  // 30-day volatility (standard deviation of daily returns)
  // =========================================================================

  /** <2% daily std dev = low volatility (blue chip/defensive) */
  static readonly VOLATILITY_LOW = 0.02;

  /** <5% = moderate volatility (typical for quality growth stocks) */
  static readonly VOLATILITY_MODERATE = 0.05;

  /** <10% = high but not extreme (small caps/growth stage) */
  static readonly VOLATILITY_HIGH = 0.1;

  // =========================================================================
  // BETA THRESHOLDS
  // Market correlation (1.0 = moves exactly with market)
  // =========================================================================

  /** <0.8 = defensive stock (utilities, staples) */
  static readonly BETA_LOW = 0.8;

  /** <1.2 = moderate correlation (typical for quality large-caps) */
  static readonly BETA_MODERATE = 1.2;

  // =========================================================================
  // VOLUME COMPARISON (for sentiment)
  // =========================================================================

  /** Volume > avg = positive sentiment (increased interest) */
  static readonly VOLUME_POSITIVE_RATIO = 1.0;
}
