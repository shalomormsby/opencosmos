/**
 * Notion Database Schema Definitions
 *
 * Defines the expected structure for all Notion databases used in Sage Stocks.
 * Used for:
 * - Documentation
 * - Schema validation
 * - Template creation
 *
 * Schema version: v1.0.14
 * - v1.0.14: Changed to Status property type (from Select), renamed from "Content Status" to "Status"
 * - v1.0.2: Simplified Content Status to 3 states (Analyzing, Complete, Error)
 * - v1.0.0: Initial TypeScript port (matches v0.3.0 Python schema)
 */

export interface NotionProperty {
  name: string;
  type: string;
  description?: string;
  required?: boolean;
  options?: string[]; // For select/multi_select properties
}

/**
 * Stock Analyses Database Schema
 * Current state of stock analyses (one row per ticker, upserted)
 */
export const STOCK_ANALYSES_SCHEMA: NotionProperty[] = [
  // Primary fields
  { name: 'Ticker', type: 'title', required: true, description: 'Stock ticker symbol' },
  { name: 'Company Name', type: 'rich_text', description: 'Full company name' },
  { name: 'Analysis Date', type: 'date', required: true, description: 'Date and time of analysis' },
  { name: 'Owner', type: 'people', description: 'Assigned user for notifications' },

  // Pricing
  { name: 'Current Price', type: 'number', description: 'Latest stock price' },
  { name: '52 Week High', type: 'number', description: '52-week high price' },
  { name: '52 Week Low', type: 'number', description: '52-week low price' },

  // Scores
  { name: 'Composite Score', type: 'number', required: true, description: 'Overall score (1.0-5.0)' },
  { name: 'Technical Score', type: 'number', required: true, description: 'Technical analysis score' },
  { name: 'Fundamental Score', type: 'number', required: true, description: 'Fundamental analysis score' },
  { name: 'Macro Score', type: 'number', required: true, description: 'Macroeconomic score' },
  { name: 'Risk Score', type: 'number', required: true, description: 'Risk assessment score' },
  { name: 'Sentiment Score', type: 'number', required: true, description: 'Market sentiment score' },
  { name: 'Pattern Score', type: 'number', description: 'Chart pattern score' },

  // Recommendations
  {
    name: 'Recommendation',
    type: 'select',
    required: true,
    options: ['Strong Buy', 'Buy', 'Moderate Buy', 'Hold', 'Moderate Sell', 'Sell', 'Strong Sell'],
    description: 'Buy/sell recommendation'
  },
  {
    name: 'Pattern Signal',
    type: 'select',
    options: ['🚀 Extremely Bullish', '📈 Bullish', '✋ Neutral', '📉 Bearish', '🚨 Extremely Bearish'],
    description: 'Chart pattern signal'
  },

  // Quality metrics
  {
    name: 'Confidence',
    type: 'select',
    options: ['High', 'Medium-High', 'Medium', 'Low'],
    description: 'Analysis confidence level'
  },
  {
    name: 'Data Quality Grade',
    type: 'select',
    options: ['A - Excellent', 'B - Good', 'C - Fair', 'D - Poor'],
    description: 'Data completeness grade'
  },
  { name: 'Data Completeness', type: 'number', description: 'Percentage of data available (0-1)' },

  // Workflow (v1.0.14: Status property type)
  {
    name: 'Status',
    type: 'status',
    options: ['Analyzing', 'Complete', 'Error'],
    description: 'Analysis lifecycle status (triggers Notion automations)'
  },

  // Technical indicators
  { name: '50 Day MA', type: 'number', description: '50-day moving average' },
  { name: '200 Day MA', type: 'number', description: '200-day moving average' },
  { name: 'RSI', type: 'number', description: 'Relative Strength Index (0-100)' },
  { name: 'MACD', type: 'number', description: 'MACD indicator' },
  { name: 'MACD Signal', type: 'number', description: 'MACD signal line' },
  { name: 'Volume', type: 'number', description: 'Current trading volume' },
  { name: 'Avg Volume (20D)', type: 'number', description: '20-day average volume' },
  { name: 'Volume Change', type: 'number', description: 'Volume change vs average' },
  { name: 'Volatility (30D)', type: 'number', description: '30-day price volatility' },
  { name: 'Price Change (1D)', type: 'number', description: '1-day price change (%)' },
  { name: 'Price Change (5D)', type: 'number', description: '5-day price change (%)' },
  { name: 'Price Change (1M)', type: 'number', description: '1-month price change (%)' },

  // Fundamental data
  { name: 'Market Cap', type: 'number', description: 'Market capitalization' },
  { name: 'P/E Ratio', type: 'number', description: 'Price-to-earnings ratio' },
  { name: 'EPS', type: 'number', description: 'Earnings per share' },
  { name: 'Revenue (TTM)', type: 'number', description: 'Trailing twelve months revenue' },
  { name: 'Debt to Equity', type: 'number', description: 'Debt-to-equity ratio' },
  { name: 'Beta', type: 'number', description: 'Beta coefficient (market correlation)' },

  // Pattern analysis
  { name: 'Detected Patterns', type: 'rich_text', description: 'List of detected chart patterns' },
  { name: 'Pattern Accuracy', type: 'number', description: 'Pattern prediction accuracy (0-100)' },
  { name: 'Expected Move (%)', type: 'number', description: 'Expected price move from pattern' },
  { name: 'Actual Move (%)', type: 'number', description: 'Actual price move observed' },
  { name: 'Days to Breakout', type: 'number', description: 'Days until pattern resolved' },
  { name: 'Prediction Correct', type: 'checkbox', description: 'Was pattern prediction correct?' },

  // System fields
  { name: 'Protocol Version', type: 'rich_text', description: 'Software version used' },
  { name: 'API Calls Used', type: 'number', description: 'Total API calls for this analysis' },

  // v1.0.4: Automation support
  {
    name: 'Analysis Cadence',
    type: 'select',
    options: ['None', 'Daily'],
    description: 'How often to automatically analyze this stock (opt-in per stock)'
  },
  { name: 'Last Auto-Analysis', type: 'date', description: 'Timestamp of last automated analysis execution' },
  {
    name: 'Next Scheduled',
    type: 'formula',
    description: 'Next scheduled analysis date/time (for display only)'
  },
];

/**
 * Stock History Database Schema
 * Historical record of all analyses (new row per analysis, append-only)
 *
 * v1.0.8: Added Market Regime property for delta-first analysis and pattern recognition
 */
export const STOCK_HISTORY_SCHEMA: NotionProperty[] = [
  // Primary fields (different from Analyses)
  { name: 'Name', type: 'title', required: true, description: 'Ticker - Date Time' },
  { name: 'Ticker', type: 'rich_text', required: true, description: 'Stock ticker symbol' },
  { name: 'Analysis Date', type: 'date', required: true, description: 'Date and time of analysis' },

  // Market Context (v1.0.8 - NEW for delta-first analysis)
  {
    name: 'Market Regime',
    type: 'select',
    options: ['Risk-On', 'Risk-Off', 'Transition'],
    description: 'Market regime at time of analysis (for pattern recognition)'
  },

  // All other fields same as Stock Analyses (except Owner and Status)
  // Status removed in v1.0.2 (Stock History is append-only, no workflow tracking needed)

  // ... (all other properties from STOCK_ANALYSES_SCHEMA except excluded ones)
  // Excluded: Owner, Status, Send to History, Next Review Date, AI summary, Holding Type
];

/**
 * Stock Comparisons Database Schema (v0.2.6+)
 * Multi-stock comparison results
 */
export const STOCK_COMPARISONS_SCHEMA: NotionProperty[] = [
  { name: 'Name', type: 'title', required: true, description: 'Comparison timestamp' },
  { name: 'Comparison Date', type: 'date', required: true, description: 'When comparison was run' },
  { name: 'Tickers', type: 'rich_text', required: true, description: 'Comma-separated ticker list' },
  { name: 'Number of Stocks', type: 'number', description: 'Count of stocks compared' },

  // Results
  { name: 'Winner', type: 'rich_text', description: 'Best overall stock' },
  { name: 'Best Value', type: 'rich_text', description: 'Best value stock (P/E)' },
  { name: 'Best Momentum', type: 'rich_text', description: 'Best momentum stock' },
  { name: 'Safest', type: 'rich_text', description: 'Lowest risk stock' },
  { name: 'Rationale', type: 'rich_text', description: 'Recommendation reasoning' },
  { name: 'Composite Scores', type: 'rich_text', description: 'All composite scores' },

  {
    name: 'Content Status',
    type: 'select',
    options: ['New', 'Updated'],
    description: 'Record status'
  },
];

/**
 * Market Context Database Schema (v0.2.7+)
 * Daily market analysis (one row per day, upserted)
 */
export const MARKET_CONTEXT_SCHEMA: NotionProperty[] = [
  { name: 'Date', type: 'title', required: true, description: 'Market analysis date' },
  { name: 'Analysis Date', type: 'date', required: true, description: 'When analysis was run' },

  // Market regime
  {
    name: 'Market Regime',
    type: 'select',
    options: ['Risk-On', 'Risk-Off', 'Transition'],
    description: 'Current market regime classification'
  },
  {
    name: 'Risk Level',
    type: 'select',
    options: ['Aggressive', 'Neutral', 'Defensive'],
    description: 'Recommended risk posture'
  },

  // Index performance
  { name: 'SPY Change (1D)', type: 'number', description: 'S&P 500 1-day change' },
  { name: 'SPY Change (1M)', type: 'number', description: 'S&P 500 1-month change' },
  { name: 'QQQ Change (1D)', type: 'number', description: 'Nasdaq 1-day change' },
  { name: 'VIX Level', type: 'number', description: 'Volatility index level' },
  {
    name: 'Market Direction',
    type: 'select',
    options: ['Up', 'Down', 'Sideways'],
    description: 'Overall market trend based on S&P 500 1-month performance'
  },

  // Economic indicators
  { name: 'Fed Funds Rate', type: 'number', description: 'Current Fed funds rate' },
  { name: 'Unemployment Rate', type: 'number', description: 'Current unemployment rate' },
  { name: 'Yield Curve Spread', type: 'number', description: '10Y-2Y Treasury spread' },
  { name: 'Consumer Sentiment', type: 'number', description: 'Consumer sentiment index' },

  // Sector leadership
  { name: 'Top Sector', type: 'rich_text', description: 'Best performing sector' },
  { name: 'Worst Sector', type: 'rich_text', description: 'Worst performing sector' },
  { name: 'Sector Rotation', type: 'rich_text', description: 'Sector rotation interpretation' },

  {
    name: 'Content Status',
    type: 'select',
    options: ['New', 'Updated'],
    description: 'Record status'
  },
];

/**
 * Usage Tracking Database Schema (v1.0 - NEW)
 * Logs each analysis for monitoring and debugging
 */
export const USAGE_TRACKING_SCHEMA: NotionProperty[] = [
  { name: 'Timestamp', type: 'title', required: true, description: 'Analysis timestamp' },
  { name: 'Date', type: 'date', required: true, description: 'Analysis date/time' },
  { name: 'Ticker', type: 'rich_text', required: true, description: 'Stock analyzed' },
  { name: 'User ID', type: 'rich_text', description: 'User who triggered analysis' },

  // Performance metrics
  { name: 'Duration (ms)', type: 'number', description: 'Total analysis duration' },
  { name: 'FMP API Calls', type: 'number', description: 'FMP API calls used' },
  { name: 'FRED API Calls', type: 'number', description: 'FRED API calls used' },
  { name: 'Notion API Calls', type: 'number', description: 'Notion API calls used' },
  { name: 'Total API Calls', type: 'number', description: 'Total API calls' },

  // Status
  {
    name: 'Status',
    type: 'select',
    options: ['Success', 'Error', 'Timeout', 'Rate Limited'],
    description: 'Analysis outcome'
  },
  { name: 'Error Message', type: 'rich_text', description: 'Error details if failed' },

  // Data quality
  { name: 'Data Completeness', type: 'number', description: 'Percentage of data fetched' },
  { name: 'Composite Score', type: 'number', description: 'Final composite score' },
];

/**
 * Beta Users Database Schema (v1.0.4 - NEW)
 * User account management and subscription tracking
 */
export const BETA_USERS_SCHEMA: NotionProperty[] = [
  { name: 'Name', type: 'title', required: true, description: 'User full name' },
  { name: 'Email', type: 'email', required: true, description: 'User email address' },
  { name: 'Notion User ID', type: 'rich_text', description: 'Notion user ID from OAuth' },
  { name: 'Workspace ID', type: 'rich_text', description: 'Notion workspace ID' },
  { name: 'Access Token', type: 'rich_text', description: 'Encrypted OAuth access token' },
  {
    name: 'Status',
    type: 'select',
    options: ['Pending', 'Approved', 'Denied'],
    description: 'Account approval status'
  },
  { name: 'Signup Date', type: 'created_time', description: 'Account creation date' },
  { name: 'Daily Analyses', type: 'number', description: 'Analyses run today' },
  { name: 'Total Analyses', type: 'number', description: 'All-time analysis count' },
  { name: 'Bypass Active', type: 'checkbox', description: 'Rate limit bypass status' },
  { name: 'Notes', type: 'rich_text', description: 'Admin notes' },
  // v1.0.4: Automation support
  {
    name: 'Subscription Tier',
    type: 'select',
    options: ['Free', 'Starter', 'Analyst', 'Pro'],
    description: 'Subscription level - determines analysis quotas and feature access'
  },
  { name: 'Timezone', type: 'rich_text', description: 'User IANA timezone (e.g., America/Los_Angeles)' },
  // Database IDs (populated during OAuth setup)
  { name: 'Stock Analyses DB ID', type: 'rich_text', description: 'Database ID for Stock Analyses' },
  { name: 'Stock History DB ID', type: 'rich_text', description: 'Database ID for Stock History' },
  { name: 'Stock Events DB ID', type: 'rich_text', description: 'Database ID for Stock Events (v1.2.16)' },
  { name: 'Market Context DB ID', type: 'rich_text', description: 'Database ID for Market Context (v1.1.0)' },
  { name: 'Sage Stocks Page ID', type: 'rich_text', description: 'Page ID for Sage Stocks workspace' },
  { name: 'Template Version', type: 'rich_text', description: 'Version of template user is using' },
  { name: 'Setup Completed At', type: 'date', description: 'When setup was completed' },
];

/**
 * Beta Feedback Database Schema (v1.0 - NEW)
 * Collects feedback from beta users
 */
export const BETA_FEEDBACK_SCHEMA: NotionProperty[] = [
  { name: 'Title', type: 'title', required: true, description: 'Feedback title' },
  { name: 'Date', type: 'date', required: true, description: 'Feedback submission date' },
  { name: 'User', type: 'rich_text', description: 'User who submitted feedback' },

  {
    name: 'Type',
    type: 'select',
    options: ['Bug', 'Feature Request', 'Improvement', 'Question', 'Praise'],
    description: 'Feedback category'
  },

  {
    name: 'Priority',
    type: 'select',
    options: ['Critical', 'High', 'Medium', 'Low'],
    description: 'Issue priority'
  },

  {
    name: 'Status',
    type: 'select',
    options: ['New', 'In Progress', 'Resolved', 'Wont Fix', 'Need More Info'],
    description: 'Resolution status'
  },

  { name: 'Description', type: 'rich_text', description: 'Detailed feedback' },
  { name: 'Ticker (if applicable)', type: 'rich_text', description: 'Related stock ticker' },
  { name: 'Expected Behavior', type: 'rich_text', description: 'What should happen' },
  { name: 'Actual Behavior', type: 'rich_text', description: 'What actually happened' },
  { name: 'Steps to Reproduce', type: 'rich_text', description: 'How to reproduce the issue' },
];

/**
 * Stock Events Database Schema (v1.2.16 - NEW)
 * Upcoming stock events (earnings, dividends, splits, guidance) from FMP API
 * Used for calendar tracking and event-driven analysis
 */
export const STOCK_EVENTS_SCHEMA: NotionProperty[] = [
  // Primary fields
  { name: 'Event Name', type: 'title', required: true, description: 'Auto-generated: {TICKER} {Event Type}' },
  { name: 'Event Date', type: 'date', required: true, description: 'When the event occurs' },
  { name: 'Ticker', type: 'rich_text', required: true, description: 'Stock ticker symbol for filtering' },

  // Event details
  {
    name: 'Event Type',
    type: 'select',
    required: true,
    options: ['Earnings Call', 'Dividend', 'Stock Split', 'Guidance', 'Economic Event'],
    description: 'Type of stock event'
  },
  { name: 'Description', type: 'rich_text', description: 'Event details (EPS estimates, dividend amount, split ratio, etc.)' },

  // Status tracking
  {
    name: 'Status',
    type: 'select',
    options: ['Upcoming', 'Today', 'Completed', 'Cancelled'],
    description: 'Event lifecycle status'
  },

  // Quality metrics
  {
    name: 'Confidence',
    type: 'select',
    options: ['High', 'Medium-High', 'Medium', 'Low'],
    description: 'Data confidence level (High for FMP-sourced events)'
  },
  {
    name: 'Timing Precision',
    type: 'select',
    options: ['Date Confirmed', 'Estimated', 'Preliminary'],
    description: 'How precise is the event date?'
  },

  // Data source
  {
    name: 'Event Source',
    type: 'select',
    options: ['FMP API', 'Manual Entry', 'Company Announcement'],
    description: 'Where this event data came from'
  },
  { name: 'Created Date', type: 'created_time', description: 'When this event was added to database' },
  { name: 'Last Updated', type: 'last_edited_time', description: 'Last modification timestamp' },

  // Relations
  { name: 'Stock', type: 'relation', description: 'Link to Stock Analyses database' },

  // Additional event-specific data
  { name: 'EPS Estimate', type: 'number', description: 'Expected earnings per share (for earnings calls)' },
  { name: 'Dividend Amount', type: 'number', description: 'Dividend per share (for dividend events)' },
  { name: 'Split Ratio', type: 'rich_text', description: 'Split ratio like "2:1" or "3:2" (for stock splits)' },
  { name: 'Fiscal Quarter', type: 'rich_text', description: 'Q1, Q2, Q3, Q4 (for earnings)' },
  { name: 'Fiscal Year', type: 'number', description: 'Fiscal year (for earnings)' },
];

/**
 * Get all required database schemas
 */
export const ALL_SCHEMAS = {
  stockAnalyses: STOCK_ANALYSES_SCHEMA,
  stockHistory: STOCK_HISTORY_SCHEMA,
  stockComparisons: STOCK_COMPARISONS_SCHEMA,
  marketContext: MARKET_CONTEXT_SCHEMA,
  usageTracking: USAGE_TRACKING_SCHEMA,
  betaUsers: BETA_USERS_SCHEMA,
  betaFeedback: BETA_FEEDBACK_SCHEMA,
  stockEvents: STOCK_EVENTS_SCHEMA,
};

/**
 * Database names for documentation
 */
export const DATABASE_NAMES = {
  stockAnalyses: 'Stock Analyses',
  stockHistory: 'Stock History',
  stockComparisons: 'Stock Comparisons',
  marketContext: 'Market Context',
  usageTracking: 'Usage Tracking',
  betaUsers: 'Beta Users',
  betaFeedback: 'Beta Feedback',
  stockEvents: 'Stock Events',
};
