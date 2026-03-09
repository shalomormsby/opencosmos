# Stock Intelligence, v0.2.x

*Last updated: November 3, 2025 at 9:09 AM*

**⚠️ NOTE:** This README reflects v0.2.x (legacy Python implementation). The project has migrated to v1.0+ (TypeScript/Vercel serverless). For current documentation, see [ARCHITECTURE.md](ARCHITECTURE.md), [SETUP.md](SETUP.md), and [API.md](API.md).

---

A professional-grade stock analysis system with institutional-quality data sources and sophisticated multi-factor scoring.

## Features

- **Multi-factor Analysis**: Technical (30%), Fundamental (35%), Macro (20%), Risk (15%)
- **Professional Data Sources**: Polygon.io, Alpha Vantage, FRED
- **Pattern Recognition**: Identifies bullish/bearish patterns
- **Automatic Notion Sync**: Updates two databases (current + historical)
- **Confidence Scoring**: Data quality assessment with A-D grading
- **28 Metrics**: Comprehensive analysis across 6 categories

## Quick Setup

### 1. Get API Keys

**Polygon.io** (Technical Data)
- Go to https://polygon.io/
- Sign up for free Stocks Starter plan
- Copy your API key

**Alpha Vantage** (Fundamental Data)
- Go to https://www.alphavantage.co/support/#api-key
- Request free API key
- Copy your API key

**FRED** (Macroeconomic Data)
- Go to https://fred.stlouisfed.org/docs/api/api_key.html
- Request API key
- Copy your API key

**Notion** (Integration)
1. Go to https://www.notion.so/my-integrations
2. Create new integration
3. Copy integration token
4. Create your Stock Analyses and Stock History databases in Notion
5. Share both databases with your integration
6. Copy the database IDs from the URLs

### 2. Configure Environment Variables

**Option A: Using .env file (Recommended for local development)**

```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your actual API keys
# NEVER commit this file to Git!
```

**Option B: Using Google Colab Secrets (Recommended for Colab)**

In Google Colab, use the key icon (🔑) in the left sidebar to add secrets:
- POLYGON_API_KEY
- ALPHA_VANTAGE_API_KEY
- FRED_API_KEY
- NOTION_API_KEY
- STOCK_ANALYSES_DB_ID
- STOCK_HISTORY_DB_ID

Then in your notebook:
```python
from google.colab import userdata
import os

os.environ['POLYGON_API_KEY'] = userdata.get('POLYGON_API_KEY')
os.environ['ALPHA_VANTAGE_API_KEY'] = userdata.get('ALPHA_VANTAGE_API_KEY')
os.environ['FRED_API_KEY'] = userdata.get('FRED_API_KEY')
os.environ['NOTION_API_KEY'] = userdata.get('NOTION_API_KEY')
os.environ['STOCK_ANALYSES_DB_ID'] = userdata.get('STOCK_ANALYSES_DB_ID')
os.environ['STOCK_HISTORY_DB_ID'] = userdata.get('STOCK_HISTORY_DB_ID')
```

**Option C: System environment variables**

```bash
export POLYGON_API_KEY="your_key_here"
export ALPHA_VANTAGE_API_KEY="your_key_here"
export FRED_API_KEY="your_key_here"
export NOTION_API_KEY="your_key_here"
export STOCK_ANALYSES_DB_ID="your_db_id_here"
export STOCK_HISTORY_DB_ID="your_db_id_here"
```

### 3. Install Dependencies

```bash
pip install requests pytz
```

### 4. Run Analysis

```python
# Edit the ticker at the bottom of the script
analyze_and_sync_to_notion("AAPL")
```

## Security Notes

⚠️ **IMPORTANT**: 
- NEVER commit your `.env` file to Git
- NEVER hardcode API keys in the script
- The `.gitignore` file is configured to prevent accidental commits
- Each user must use their own API keys

## Notion Database Properties

### Stock Analyses Database (Current State)
- Ticker (title)
- Company Name (text)
- Analysis Date (date)
- Current Price (number)
- Composite Score (number)
- Technical Score (number)
- Fundamental Score (number)
- Macro Score (number)
- Risk Score (number)
- Sentiment Score (number)
- Pattern Score (number)
- Pattern Signal (select)
- Detected Patterns (text)
- Recommendation (select)
- Confidence (select)
- Data Quality Grade (select)
- Data Completeness (number)
- [+ all technical and fundamental metrics]

### Stock History Database (Historical Record)
Same properties as Stock Analyses, plus:
- Name (title) - formatted as "TICKER - Date Time"

## Scoring Methodology

**Composite Score** (1.0-5.0 scale):
- Technical: 30% weight
- Fundamental: 35% weight
- Macro: 20% weight
- Risk: 15% weight

**Pattern Score** (1.0-5.0 scale):
- Separate score, NOT included in composite
- Identifies chart patterns (Head & Shoulders, Double Top, etc.)
- Provides signal: 🚀 Extremely Bullish to 🚨 Extremely Bearish

**Recommendations**:
- Strong Buy (4.0+)
- Buy (3.5-3.99)
- Moderate Buy (3.0-3.49)
- Hold (2.5-2.99)
- Moderate Sell (2.0-2.49)
- Sell (1.5-1.99)
- Strong Sell (<1.5)

## API Rate Limits

- **Polygon Starter**: 5 calls/minute
- **Alpha Vantage Free**: 25 calls/day
- **FRED**: 120 calls/day

Each analysis uses approximately:
- 5-7 Polygon calls
- 3 Alpha Vantage calls
- 5 FRED calls

## Troubleshooting

**"Missing required environment variable"**
- Ensure all environment variables are set
- Check for typos in variable names
- Verify .env file exists and is properly formatted

**"API request failed"**
- Check API keys are valid
- Verify rate limits haven't been exceeded
- Check internet connection

**"Notion sync failed"**
- Verify Notion integration has access to databases
- Check database IDs are correct
- Ensure database properties match expected schema

## Version History

**v0.2.8** (Current)
- Content Status & Notification System - automated Notion notifications for fresh data
- All Notion syncs now include status field ("New" or "Updated")
- Enables database automations for alerts when new analyses arrive

**v0.2.7**
- Market analysis - holistic market context before stock analysis
- US indices, VIX, sector rotation, economic indicators, market news
- Market regime classification (Risk-On/Risk-Off/Transition)
- Syncs to Notion Market Context database

**v0.2.6**
- Notion comparison sync for multi-stock comparisons
- Automatically saves comparison results to Notion

**v0.2.5**
- Comparative analysis system
- Multi-stock rankings and buy recommendations

**v0.2.4**
- Pattern backtesting system
- Validates if patterns predict price movements

**v0.2.3**
- Centralized scoring configuration with documented thresholds
- All magic numbers now have clear financial/technical justifications
- 100% backward compatible scoring
- Improved code transparency and maintainability

**v0.2.2**
- Added pattern recognition
- Added pattern score and signal
- Added detected patterns tracking
- Enhanced technical analysis

**v0.2.0**
- Multi-factor scoring system
- Dual-API architecture
- Confidence scoring
- Historical tracking

## License

This project is licensed under the **Business Source License 1.1**.

### What This Means

**✅ You CAN:**
- Use this software for personal, educational, and non-commercial purposes
- View and study the source code
- Modify it for your own personal use
- Fork it on GitHub for non-commercial projects
- Learn from the implementation

**❌ You CANNOT:**
- Use this software to provide a commercial stock analysis service
- Sell this software or derivative works
- Use it in a way that competes with the original author's offerings

**⏰ Future:**
- On **October 23, 2029**, this software will automatically become available under the **MIT License**
- After that date, it will be fully open source with no restrictions

### Commercial Licensing

Interested in using this software commercially? Contact: shalom.ormsby@gmail.com

For full license terms, see the [LICENSE](LICENSE) file.

## Support

For issues, questions, or feature requests, please [contact information or issue tracker].
