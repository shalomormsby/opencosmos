# ==================================================================================================
# ⚠️  DEPRECATED - This file is no longer maintained or used.
# ==================================================================================================
# This is a legacy v0.3.0 Python implementation kept for historical reference only.
# The project has migrated to TypeScript/Vercel serverless architecture (v1.0+).
# Do not use this file in production.
# ==================================================================================================
#
# ==================================================================================================
# Stock Analyzer — v0.3.0 (Single Cell, Hybrid Dual‑API, Copy‑Paste Ready)
# - Technical: Polygon
# - Fundamental: Alpha Vantage
# - Macro: FRED
# - Scores: Technical, Fundamental, Macro, Risk, Sentiment (unweighted), Composite
# - Pattern Score, Pattern Signal, Detected Patterns (1.0–5.0, NOT included in Composite)
# - NEW v0.3.0: Polling Workflow - Python writes metrics, waits for Notion AI analysis, archives on completion
# - NEW v0.2.8: Content Status & Notification System - automated Notion notifications for fresh data
# - NEW v0.2.7: Market Analysis - holistic market context before stock analysis
# - NEW v0.2.6: Notion Comparison Sync to save multi-stock comparisons to Notion
# - NEW v0.2.5: Comparative Analysis to compare multiple stocks and get buy recommendations
# - NEW v0.2.4: Pattern Backtesting to validate if patterns predict price movements
# - NEW v0.2.3: Centralized Scoring Configuration with documented thresholds
# - Syncs to Notion: Stock Analyses (upsert) + Stock History (append) + Stock Comparisons (create) + Market Context (create)
# ==================================================================================================

import os
import json
import requests
import statistics
from datetime import datetime, timedelta, timezone
import pytz
from typing import Dict, List, Tuple, Optional, Any

# Conditional environment loading: Colab vs local
try:
    from google.colab import userdata
    # Running in Colab - load secrets from Colab secrets manager
    os.environ['POLYGON_API_KEY'] = userdata.get('POLYGON_API_KEY')
    os.environ['ALPHA_VANTAGE_API_KEY'] = userdata.get('ALPHA_VANTAGE_API_KEY')
    os.environ['FRED_API_KEY'] = userdata.get('FRED_API_KEY')
    os.environ['NOTION_API_KEY'] = userdata.get('NOTION_API_KEY')
    os.environ['NOTION_USER_ID'] = userdata.get('NOTION_USER_ID')
    os.environ['BRAVE_API_KEY'] = userdata.get('BRAVE_API_KEY')
    os.environ['STOCK_ANALYSES_DB_ID'] = userdata.get('STOCK_ANALYSES_DB_ID')
    os.environ['STOCK_HISTORY_DB_ID'] = userdata.get('STOCK_HISTORY_DB_ID')
    os.environ['STOCK_COMPARISONS_DB_ID'] = userdata.get('STOCK_COMPARISONS_DB_ID')
    os.environ['MARKET_CONTEXT_DB_ID'] = userdata.get('MARKET_CONTEXT_DB_ID')
    print("✅ API keys loaded from Colab secrets")
except ImportError:
    # Not in Colab - load from .env file
    from dotenv import load_dotenv
    load_dotenv()
    print("✅ Environment variables loaded from .env file")

PACIFIC_TZ = pytz.timezone("America/Los_Angeles")
VERSION = "v0.3.0"

# =============================================================================
# Helpers — User ID Retrieval (DEPRECATED)
# =============================================================================
# NOTE: This function is no longer used because it returns the bot/integration ID,
# not the actual user ID. Notion's "Person" property type does not allow bots.
# Instead, we now use NOTION_USER_ID from environment variables.
#
# def get_current_user_id(api_key: str) -> Optional[str]:
#     """
#     Retrieves the current bot user ID from Notion API.
#     WARNING: This returns the BOT ID, not the USER ID.
#     Notion will reject this ID for Person properties with "Cannot mention bots".
#     """
#     url = "https://api.notion.com/v1/users/me"
#     headers = {
#         "Authorization": f"Bearer {api_key}",
#         "Notion-Version": "2022-06-28"
#     }
#
#     try:
#         r = requests.get(url, headers=headers, timeout=10)
#         if r.status_code == 200:
#             user_data = r.json()
#             return user_data.get("id")
#         else:
#             print(f"⚠️  Failed to get user ID: {r.status_code}")
#             return None
#     except Exception as e:
#         print(f"⚠️  Exception getting user ID: {e}")
#         return None

# =============================================================================
# CONFIGURATION — REQUIRED: Set via environment variables
# =============================================================================
# SECURITY: API keys must be set as environment variables before running.
# See README.md or .env.example for setup instructions.
POLYGON_API_KEY        = os.environ.get("POLYGON_API_KEY")
ALPHA_VANTAGE_API_KEY  = os.environ.get("ALPHA_VANTAGE_API_KEY")
FRED_API_KEY           = os.environ.get("FRED_API_KEY")
NOTION_API_KEY         = os.environ.get("NOTION_API_KEY")
NOTION_USER_ID         = os.environ.get("NOTION_USER_ID")
BRAVE_API_KEY          = os.environ.get("BRAVE_API_KEY")
STOCK_ANALYSES_DB_ID   = os.environ.get("STOCK_ANALYSES_DB_ID")
STOCK_HISTORY_DB_ID    = os.environ.get("STOCK_HISTORY_DB_ID")
STOCK_COMPARISONS_DB_ID = os.environ.get("STOCK_COMPARISONS_DB_ID")
MARKET_CONTEXT_DB_ID   = os.environ.get("MARKET_CONTEXT_DB_ID")

def _require(val: str, label: str):
    if not val:
        raise ValueError(
            f"Missing required environment variable: {label}\n"
            f"Please set it in your .env file or environment.\n"
            f"See .env.example for template."
        )
for _v, _l in [
    (POLYGON_API_KEY, "POLYGON_API_KEY"),
    (ALPHA_VANTAGE_API_KEY, "ALPHA_VANTAGE_API_KEY"),
    (FRED_API_KEY, "FRED_API_KEY"),
    (NOTION_API_KEY, "NOTION_API_KEY"),
    (STOCK_ANALYSES_DB_ID, "STOCK_ANALYSES_DB_ID"),
    (STOCK_HISTORY_DB_ID, "STOCK_HISTORY_DB_ID"),
]:
    _require(_v, _l)

# Optional environment variables
if not STOCK_COMPARISONS_DB_ID:
    print("⚠️  STOCK_COMPARISONS_DB_ID not set - comparison sync to Notion will be disabled")

if not MARKET_CONTEXT_DB_ID:
    print("⚠️  MARKET_CONTEXT_DB_ID not set - market analysis sync to Notion will be disabled")

if not BRAVE_API_KEY:
    print("⚠️  BRAVE_API_KEY not set - market news search will be disabled")

# Get current user ID for Owner property (enables Notion notifications)
# NOTE: Use NOTION_USER_ID from environment, not get_current_user_id() which returns bot ID
CURRENT_USER_ID = NOTION_USER_ID  # Use user ID from environment, not API
if CURRENT_USER_ID:
    print(f"✅ Notion user ID configured: {CURRENT_USER_ID[:8]}...")
else:
    print("⚠️  NOTION_USER_ID not set - Owner property will not be set (notifications disabled)")

# =============================================================================
# Helpers
# =============================================================================
def safe_float(x: Any, default: Optional[float] = None) -> Optional[float]:
    try:
        if x in (None, "", "None"):
            return default
        return float(x)
    except Exception:
        return default

# =============================================================================
# POLYGON CLIENT — Technical
# =============================================================================
class PolygonClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.polygon.io"
        self.call_count = 0

    def _make_request(self, endpoint: str, params: Optional[dict] = None) -> Optional[dict]:
        params = params or {}
        params["apiKey"] = self.api_key
        url = f"{self.base_url}{endpoint}"
        try:
            r = requests.get(url, params=params, timeout=30)
            self.call_count += 1
            if r.status_code == 200:
                return r.json()
            print(f"[Polygon] {r.status_code}: {r.text[:300]}")
        except Exception as e:
            print(f"[Polygon] Exception: {e}")
        return None

    def get_snapshot(self, ticker: str) -> Optional[dict]:
        return self._make_request(f"/v2/snapshot/locale/us/markets/stocks/tickers/{ticker}")

    def get_aggregates(self, ticker: str, from_date: str, to_date: str, timespan: str = "day") -> Optional[dict]:
        return self._make_request(
            f"/v2/aggs/ticker/{ticker}/range/1/{timespan}/{from_date}/{to_date}",
            {"adjusted": "true", "sort": "asc", "limit": 5000},
        )

    def get_sma(self, ticker: str, window: int = 50, timespan: str = "day", limit: int = 120) -> Optional[dict]:
        return self._make_request(
            f"/v1/indicators/sma/{ticker}",
            {"timespan": timespan, "adjusted": "true", "window": window, "series_type": "close", "order": "desc", "limit": limit},
        )

    def get_rsi(self, ticker: str, window: int = 14, timespan: str = "day", limit: int = 120) -> Optional[dict]:
        return self._make_request(
            f"/v1/indicators/rsi/{ticker}",
            {"timespan": timespan, "adjusted": "true", "window": window, "series_type": "close", "order": "desc", "limit": limit},
        )

    def get_macd(self, ticker: str, timespan: str = "day", limit: int = 120) -> Optional[dict]:
        return self._make_request(
            f"/v1/indicators/macd/{ticker}",
            {
                "timespan": timespan, "adjusted": "true",
                "short_window": 12, "long_window": 26, "signal_window": 9,
                "series_type": "close", "order": "desc", "limit": limit
            },
        )

# =============================================================================
# ALPHA VANTAGE — Fundamental
# =============================================================================
class AlphaVantageClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://www.alphavantage.co/query"
        self.call_count = 0

    def _call(self, params: dict) -> Optional[dict]:
        params["apikey"] = self.api_key
        try:
            r = requests.get(self.base_url, params=params, timeout=40)
            self.call_count += 1
            if r.status_code != 200:
                print(f"[Alpha Vantage] {r.status_code} {r.text[:300]}")
                return None
            data = r.json()
            if "Error Message" in data or "Note" in data:
                print(f"[Alpha Vantage] {data.get('Error Message') or data.get('Note')}")
                return None
            return data
        except Exception as e:
            print(f"[Alpha Vantage] Exception: {e}")
            return None

    def get_overview(self, ticker: str) -> Optional[dict]:
        return self._call({"function": "OVERVIEW", "symbol": ticker})

    def get_income_statement(self, ticker: str) -> Optional[dict]:
        return self._call({"function": "INCOME_STATEMENT", "symbol": ticker})

    def get_balance_sheet(self, ticker: str) -> Optional[dict]:
        return self._call({"function": "BALANCE_SHEET", "symbol": ticker})

# =============================================================================
# FRED — Macro
# =============================================================================
class FREDClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.stlouisfed.org/fred/series/observations"
        self.call_count = 0

    def _latest(self, series_id: str) -> Optional[float]:
        params = {"series_id": series_id, "api_key": self.api_key, "file_type": "json", "sort_order": "desc", "limit": 1}
        try:
            r = requests.get(self.base_url, params=params, timeout=30)
            self.call_count += 1
            if r.status_code == 200:
                data = r.json()
                obs = data.get("observations") or []
                if obs:
                    return safe_float(obs[0].get("value"))
        except Exception as e:
            print(f"[FRED] {series_id} exception: {e}")
        return None

    def _get_series(self, series_id: str, limit: int = 13) -> list:
        """Fetch multiple observations for a series (most recent first)."""
        params = {"series_id": series_id, "api_key": self.api_key, "file_type": "json", "sort_order": "desc", "limit": limit}
        try:
            r = requests.get(self.base_url, params=params, timeout=30)
            self.call_count += 1
            if r.status_code == 200:
                data = r.json()
                obs = data.get("observations") or []
                return [safe_float(o.get("value")) for o in obs if o.get("value")]
        except Exception as e:
            print(f"[FRED] {series_id} exception: {e}")
        return []

    def get_macro_data(self) -> dict:
        return {
            "fed_funds_rate":     self._latest("DFF"),
            "unemployment":       self._latest("UNRATE"),
            "consumer_sentiment": self._latest("UMCSENT"),
            "gdp_growth":         self._latest("A191RL1Q225SBEA"),
            "inflation":          self._latest("CPIAUCSL"),
        }

# =============================================================================
# Collector — Hybrid Dual‑API
# =============================================================================
class DataCollector:
    def __init__(self, polygon: PolygonClient, alpha_vantage: AlphaVantageClient, fred: FREDClient):
        self.polygon = polygon
        self.alpha_vantage = alpha_vantage
        self.fred = fred

    def collect_all_data(self, ticker: str) -> dict:
        print("\n" + "="*60)
        print(f"Collecting data for {ticker}")
        print("="*60)

        technical = self._collect_technical_data(ticker)
        fundamental = self._collect_fundamental_data(ticker)
        macro = self.fred.get_macro_data()

        combined = {
            "ticker": ticker,
            "timestamp": datetime.now(PACIFIC_TZ),
            "technical": technical,
            "fundamental": fundamental,
            "macro": macro,
            "api_calls": {
                "polygon": self.polygon.call_count,
                "alpha_vantage": self.alpha_vantage.call_count,
                "fred": self.fred.call_count,
            },
        }
        print("\n" + "="*60)
        print("Data collection complete!")
        print(f"API Calls — Polygon: {self.polygon.call_count}, Alpha Vantage: {self.alpha_vantage.call_count}, FRED: {self.fred.call_count}")
        print("="*60)
        return combined

    def _collect_technical_data(self, ticker: str) -> dict:
        tech: Dict[str, Any] = {}

        snap = self.polygon.get_snapshot(ticker)
        if snap and "ticker" in snap:
            t = snap["ticker"]
            day  = t.get("day") or {}
            prev = t.get("prevDay") or {}
            tech["current_price"]   = safe_float(day.get("c"))
            tech["volume"]          = safe_float(day.get("v"))
            tech["price_change_1d"] = safe_float(t.get("todaysChangePerc"), 0.0) / 100.0
            tech["prev_close"]      = safe_float(prev.get("c"))

        to_date   = datetime.now().strftime("%Y-%m-%d")
        from_date = (datetime.now() - timedelta(days=220)).strftime("%Y-%m-%d")
        aggs = self.polygon.get_aggregates(ticker, from_date, to_date, timespan="day")
        closes: List[float] = []
        volumes: List[float] = []
        if aggs and "results" in aggs:
            for bar in aggs["results"]:
                c = safe_float(bar.get("c"))
                v = safe_float(bar.get("v"))
                if c is not None:
                    closes.append(c)
                if v is not None:
                    volumes.append(v)
            if closes:
                tech["daily_closes_full"] = closes[:]
            if len(volumes) >= 20:
                tech["avg_volume_20d"] = sum(volumes[-20:]) / 20.0
            if len(closes) >= 30:
                rets = []
                for i in range(1, 30):
                    p0, p1 = closes[-i-1], closes[-i]
                    if p0 and p1:
                        rets.append((p1 - p0) / p0)
                tech["volatility_30d"] = statistics.pstdev(rets) if rets else None
            if len(closes) >= 6:
                tech["price_change_5d"] = (closes[-1] - closes[-6]) / closes[-6]
            if len(closes) >= 21:
                tech["price_change_1m"] = (closes[-1] - closes[-21]) / closes[-21]

        sma50 = self.polygon.get_sma(ticker, window=50)
        if sma50 and sma50.get("results", {}).get("values"):
            tech["ma_50"] = safe_float(sma50["results"]["values"][0].get("value"))

        sma200 = self.polygon.get_sma(ticker, window=200)
        if sma200 and sma200.get("results", {}).get("values"):
            tech["ma_200"] = safe_float(sma200["results"]["values"][0].get("value"))

        rsi = self.polygon.get_rsi(ticker, window=14)
        if rsi and rsi.get("results", {}).get("values"):
            tech["rsi"] = safe_float(rsi["results"]["values"][0].get("value"))

        macd = self.polygon.get_macd(ticker)
        if macd and macd.get("results", {}).get("values"):
            vals = macd["results"]["values"]
            tech["macd"]        = safe_float(vals[0].get("value"))
            tech["macd_signal"] = safe_float(vals[0].get("signal"))
            if len(vals) >= 2:
                tech["macd_previous"] = safe_float(vals[1].get("value"))

        return tech

    def _collect_fundamental_data(self, ticker: str) -> dict:
        fund: Dict[str, Any] = {}
        ov = self.alpha_vantage.get_overview(ticker)
        shares_out = None
        if ov:
            fund["company_name"]  = ov.get("Name")
            fund["market_cap"]    = safe_float(ov.get("MarketCapitalization"))
            fund["pe_ratio"]      = safe_float(ov.get("PERatio"))
            fund["beta"]          = safe_float(ov.get("Beta"))
            fund["52_week_high"]  = safe_float(ov.get("52WeekHigh"))
            fund["52_week_low"]   = safe_float(ov.get("52WeekLow"))
            shares_out            = safe_float(ov.get("SharesOutstanding"))

        inc = self.alpha_vantage.get_income_statement(ticker)
        if inc and inc.get("annualReports"):
            latest = inc["annualReports"][0]
            fund["revenue_ttm"] = safe_float(latest.get("totalRevenue"))
            net_income = safe_float(latest.get("netIncome"))
            if net_income is not None and shares_out and shares_out > 0:
                fund["eps"] = net_income / shares_out

        bs = self.alpha_vantage.get_balance_sheet(ticker)
        if bs and bs.get("annualReports"):
            latest = bs["annualReports"][0]
            total_debt   = safe_float(latest.get("shortLongTermDebtTotal"), 0.0) or 0.0
            total_equity = safe_float(latest.get("totalShareholderEquity"), 1.0)
            if total_equity and total_equity > 0:
                fund["debt_to_equity"] = total_debt / total_equity

        return fund

# =============================================================================
# Pattern Detection — v0.2.2
# =============================================================================
def _detect_cross(prev_a: Optional[float], prev_b: Optional[float], cur_a: Optional[float], cur_b: Optional[float]) -> Tuple[bool, bool]:
    if None in (prev_a, prev_b, cur_a, cur_b):
        return False, False
    was_above = prev_a > prev_b
    is_above  = cur_a > cur_b
    if not was_above and is_above:
        return True, False
    if was_above and not is_above:
        return False, True
    return False, False

def _map_signal(score: float) -> str:
    if score <= 2.0: return "🚨 Extremely Bearish"
    if score <= 2.5: return "📉 Bearish"
    if score <= 3.5: return "✋ Neutral"
    if score <= 4.0: return "📈 Bullish"
    return "🚀 Extremely Bullish"

def _derive_prev_mas(tech: dict) -> None:
    closes = tech.get("daily_closes_full")
    if not isinstance(closes, list) or len(closes) < 201:
        return
    try:
        tech.setdefault("prev_ma_50",  sum(closes[-51:-1])  / 50.0)
        tech.setdefault("prev_ma_200", sum(closes[-201:-1]) / 200.0)
    except Exception:
        pass

def compute_pattern_score(tech: dict) -> Tuple[float, str, List[str]]:
    """
    Compute pattern score using weighted signal accumulation for better distribution.

    Uses separate bullish/bearish weight accumulation and non-linear scaling
    to avoid clustering around 3.0. Weights reflect pattern significance and
    reliability in technical analysis.
    """
    if not isinstance(tech, dict):
        return 3.0, "✋ Neutral", ["Mixed/Range"]

    _derive_prev_mas(tech)

    # Pattern significance weights (calibrated for realistic signal strength)
    PATTERN_WEIGHTS = {
        # Very strong signals - major trend reversals/confirmations
        "Golden Cross": 2.5,           # MA50 crosses above MA200
        "Death Cross": 2.5,            # MA50 crosses below MA200

        # Strong signals - clear directional structure
        "Strong Uptrend": 1.8,         # Price > MA50 > MA200
        "Strong Downtrend": 1.8,       # Price < MA50 < MA200

        # Moderate-strong signals - momentum confirmation
        "Bullish Volume Surge": 1.5,   # High conviction buying
        "Bearish Volume Dump": 1.5,    # High conviction selling
        "MACD Bullish Crossover": 1.3, # Momentum turning positive
        "MACD Bearish Crossover": 1.3, # Momentum turning negative

        # Moderate signals - reversal indicators
        "RSI Oversold": 1.0,           # Potential bounce
        "RSI Overbought": 1.0,         # Potential pullback
    }

    price      = safe_float(tech.get("current_price"))
    ma50       = safe_float(tech.get("ma_50"))
    ma200      = safe_float(tech.get("ma_200"))
    prev_ma50  = safe_float(tech.get("prev_ma_50"))
    prev_ma200 = safe_float(tech.get("prev_ma_200"))
    rsi        = safe_float(tech.get("rsi"))
    macd       = safe_float(tech.get("macd"))
    macd_sig   = safe_float(tech.get("macd_signal"))
    macd_prev  = safe_float(tech.get("macd_previous"))
    vol        = safe_float(tech.get("volume"))
    avg_vol    = safe_float(tech.get("avg_volume_20d"))

    bullish_weight = 0.0
    bearish_weight = 0.0
    detected: List[str] = []

    # Detect MA crossovers (strongest signals)
    bull, bear = _detect_cross(prev_ma50, prev_ma200, ma50, ma200)
    if bull:
        bullish_weight += PATTERN_WEIGHTS["Golden Cross"]
        detected.append("Golden Cross")
    if bear:
        bearish_weight += PATTERN_WEIGHTS["Death Cross"]
        detected.append("Death Cross")

    # Trend structure analysis
    if None not in (price, ma50, ma200):
        if price > ma50 > ma200:
            bullish_weight += PATTERN_WEIGHTS["Strong Uptrend"]
            detected.append("Strong Uptrend")
        elif price < ma50 < ma200:
            bearish_weight += PATTERN_WEIGHTS["Strong Downtrend"]
            detected.append("Strong Downtrend")

    # RSI extremes (reversal indicators)
    if rsi is not None:
        if rsi < 30:
            bullish_weight += PATTERN_WEIGHTS["RSI Oversold"]
            detected.append("RSI Oversold")
        elif rsi > 70:
            bearish_weight += PATTERN_WEIGHTS["RSI Overbought"]
            detected.append("RSI Overbought")

    # MACD crossover detection
    macd_bull = macd is not None and macd_sig is not None and macd > macd_sig
    macd_bear = macd is not None and macd_sig is not None and macd < macd_sig
    if None not in (macd, macd_sig, macd_prev):
        prev_above = macd_prev > macd_sig
        curr_above = macd > macd_sig
        if not prev_above and curr_above:
            macd_bull, macd_bear = True, False
        elif prev_above and not curr_above:
            macd_bull, macd_bear = False, True
    if macd_bull:
        bullish_weight += PATTERN_WEIGHTS["MACD Bullish Crossover"]
        detected.append("MACD Bullish Crossover")
    elif macd_bear:
        bearish_weight += PATTERN_WEIGHTS["MACD Bearish Crossover"]
        detected.append("MACD Bearish Crossover")

    # Volume analysis (conviction indicator)
    if None not in (vol, avg_vol) and avg_vol and avg_vol > 0:
        ratio = vol / avg_vol
        if ratio >= 1.8:
            bullish_weight += PATTERN_WEIGHTS["Bullish Volume Surge"]
            detected.append("Bullish Volume Surge")
        elif ratio <= 0.6:
            bearish_weight += PATTERN_WEIGHTS["Bearish Volume Dump"]
            detected.append("Bearish Volume Dump")

    # Calculate net weighted signal
    # Net signal typically ranges from -5.0 to +5.0 with these weights
    net_signal = bullish_weight - bearish_weight

    # Apply non-linear scaling using tanh for better distribution
    # tanh provides smooth S-curve that spreads scores away from center
    # Scale factor of 0.5 maps typical signals (-5 to +5) to wider tanh input range
    import math
    scaled_signal = math.tanh(net_signal * 0.5)  # Output: -1.0 to +1.0

    # Map to 1.0-5.0 range: center at 3.0, spread ±2.0
    score = 3.0 + (scaled_signal * 2.0)

    # Clamp to valid range and round
    score = max(1.0, min(5.0, round(score, 2)))
    signal = _map_signal(score)

    if not detected:
        detected = ["Mixed/Range"]

    return score, signal, detected

# =============================================================================
# Scoring Configuration — Centralized Thresholds
# =============================================================================

class ScoringConfig:
    """
    Centralized scoring thresholds and constants with documented rationale.

    All thresholds based on:
    - Financial industry standards (P/E ratios, debt levels)
    - Technical analysis conventions (RSI overbought/oversold)
    - Economic indicators (Fed policy ranges)
    - Market cap classifications (SEC definitions)

    Adjust these values to customize scoring sensitivity.

    Philosophy: Every magic number should have a documented reason.
    """

    # =========================================================================
    # MARKET CAP THRESHOLDS
    # Based on industry standard classifications and SEC definitions
    # =========================================================================
    MARKET_CAP_MEGA = 200e9       # $200B+ = Mega cap (Apple, Microsoft, NVDA)
                                  # Only ~20 companies globally reach this tier

    MARKET_CAP_LARGE = 10e9       # $10B+ = Large cap (S&P 500 typical range)
                                  # Institutional-grade stability

    MARKET_CAP_MID = 2e9          # $2B+ = Mid cap
                                  # Russell 2000 upper range

    MARKET_CAP_RISK_SAFE = 100e9  # $100B+ for risk scoring
                                  # Too-big-to-fail territory

    # =========================================================================
    # P/E RATIO RANGES
    # Based on historical S&P 500 averages (~15-20 long-term)
    # =========================================================================
    PE_RATIO_OPTIMAL_MIN = 10     # Below this = potentially undervalued
                                  # Value territory: Graham/Buffett zone

    PE_RATIO_OPTIMAL_MAX = 25     # Above this = potentially overvalued
                                  # Historical S&P 500 median ~18-20

    PE_RATIO_ACCEPTABLE_MIN = 5   # Extreme undervalue or distressed
                                  # Requires investigation (value trap?)

    PE_RATIO_ACCEPTABLE_MAX = 35  # Growth stock territory
                                  # Tech/growth premium justified if earnings growing >20%

    # =========================================================================
    # RSI THRESHOLDS
    # Standard technical analysis ranges (Wilder, 1978)
    # =========================================================================

    # Technical Scoring RSI Bands
    RSI_NEUTRAL_MIN = 40          # Below = oversold bias forming
    RSI_NEUTRAL_MAX = 60          # Above = overbought bias forming
                                  # 40-60 = healthy neutral momentum zone

    RSI_MODERATE_LOW_MIN = 30     # Classic oversold threshold (Wilder)
    RSI_MODERATE_LOW_MAX = 40     # Transitioning to oversold

    RSI_MODERATE_HIGH_MIN = 60    # Transitioning to overbought
    RSI_MODERATE_HIGH_MAX = 70    # Classic overbought threshold (Wilder)

    # Sentiment Scoring RSI Bands (tighter ranges)
    RSI_SENTIMENT_NEUTRAL_MIN = 45     # Tighter neutral band for sentiment
    RSI_SENTIMENT_NEUTRAL_MAX = 55     # Indicates balanced sentiment

    RSI_SENTIMENT_MODERATE_LOW_MIN = 35    # Mild oversold sentiment
    RSI_SENTIMENT_MODERATE_LOW_MAX = 45

    RSI_SENTIMENT_MODERATE_HIGH_MIN = 55   # Mild overbought sentiment
    RSI_SENTIMENT_MODERATE_HIGH_MAX = 65

    # =========================================================================
    # MACD SETTINGS
    # Standard 12-26-9 configuration (Appel, 1979)
    # =========================================================================
    MACD_SIGNAL_CONVERGENCE = 0.9  # MACD at 90% of signal = near crossover
                                    # Anticipates momentum shift

    # =========================================================================
    # VOLUME THRESHOLDS
    # Institutional flow detection
    # =========================================================================
    VOLUME_SPIKE_RATIO = 1.2       # 120% of 20-day avg = unusual activity
                                    # Suggests institutional interest

    VOLUME_SURGE_RATIO = 1.5       # 150%+ = strong conviction
                                    # Often precedes breakouts

    # =========================================================================
    # PRICE CHANGE THRESHOLDS
    # Momentum classification
    # =========================================================================
    PRICE_CHANGE_STRONG = 0.10     # 10%+ monthly gain = strong momentum
                                    # Outperforming S&P 500 typical monthly range

    PRICE_CHANGE_POSITIVE = 0.0    # Any gain = positive momentum

    PRICE_CHANGE_MODERATE_1D = 0.02  # 2% daily = moderate intraday move
                                      # Above noise threshold

    PRICE_CHANGE_STRONG_1M_SENTIMENT = 0.05  # 5%+ monthly for sentiment scoring
                                              # Indicates positive market perception

    # =========================================================================
    # DEBT RATIOS
    # Conservative financial health standards
    # =========================================================================
    DEBT_TO_EQUITY_IDEAL = 0.5     # <0.5 = excellent balance sheet
                                    # Tech companies often operate here

    DEBT_TO_EQUITY_ACCEPTABLE = 1.0  # <1.0 = acceptable leverage
                                      # Traditional corporate finance standard

    # =========================================================================
    # REVENUE THRESHOLDS
    # Scale and operational maturity
    # =========================================================================
    REVENUE_SIGNIFICANT = 10e9     # $10B+ TTM = significant enterprise
                                    # Fortune 500 territory

    # =========================================================================
    # EPS THRESHOLDS
    # Profitability benchmarks
    # =========================================================================
    EPS_STRONG = 5.0               # $5+ EPS = strong profitability
                                    # Mega-cap earnings power

    EPS_POSITIVE = 0.0             # Positive = profitable (vs loss-making)

    # =========================================================================
    # MACRO ECONOMIC THRESHOLDS
    # Fed policy ranges and historical economic data
    # =========================================================================

    # Fed Funds Rate (Federal Reserve target rate)
    FED_FUNDS_LOW = 2.0            # <2% = accommodative monetary policy
                                    # Risk-on environment

    FED_FUNDS_MODERATE = 4.0       # <4% = neutral policy territory
                                    # Balanced stance

    FED_FUNDS_HIGH = 6.0           # <6% = restrictive but not extreme
                                    # Volcker era was 15%+; current high is relative

    # Unemployment Rate
    UNEMPLOYMENT_HEALTHY = 4.5     # <4.5% = strong labor market
                                    # Full employment by Fed definition

    UNEMPLOYMENT_ACCEPTABLE = 6.0  # <6% = acceptable conditions
                                    # Historical average ~5-6%

    # Consumer Sentiment (University of Michigan Index)
    CONSUMER_SENTIMENT_STRONG = 80      # >80 = strong confidence
                                         # Correlates with consumer spending

    CONSUMER_SENTIMENT_MODERATE = 60    # >60 = moderate confidence
                                         # Below 60 = recession risk

    # =========================================================================
    # VOLATILITY THRESHOLDS
    # 30-day volatility (standard deviation of daily returns)
    # =========================================================================
    VOLATILITY_LOW = 0.02          # <2% daily std dev = low volatility
                                    # Blue chip / defensive territory

    VOLATILITY_MODERATE = 0.05     # <5% = moderate volatility
                                    # Typical for quality growth stocks

    VOLATILITY_HIGH = 0.10         # <10% = high but not extreme
                                    # Small caps / growth stage

    # =========================================================================
    # BETA THRESHOLDS
    # Market correlation (1.0 = moves exactly with market)
    # =========================================================================
    BETA_LOW = 0.8                 # <0.8 = defensive stock
                                    # Less volatile than market (utilities, staples)

    BETA_MODERATE = 1.2            # <1.2 = moderate correlation
                                    # Typical for quality large-caps

    # =========================================================================
    # VOLUME COMPARISON (for sentiment)
    # =========================================================================
    VOLUME_POSITIVE_RATIO = 1.0    # Volume > avg = positive sentiment
                                    # Indicates increased interest

# =============================================================================
# Pattern Backtester — v0.2.4
# =============================================================================
class PatternBacktester:
    """
    Validates whether detected patterns actually predict future price movements.

    Backtests pattern predictions against actual outcomes to calculate accuracy.
    Answers: "Do these patterns have real predictive value?"

    Usage:
        backtester = PatternBacktester(polygon_client)
        result = backtester.backtest_pattern(ticker, pattern_score, pattern_signal, detected_patterns)
    """

    def __init__(self, polygon_client: PolygonClient):
        self.polygon = polygon_client
        self.config = ScoringConfig()

    def backtest_pattern(
        self,
        ticker: str,
        pattern_score: float,
        pattern_signal: str,
        detected_patterns: List[str],
        lookback_days: int = 30
    ) -> Dict[str, Any]:
        """
        Backtest a pattern's prediction against actual price movement.

        Args:
            ticker: Stock ticker symbol
            pattern_score: Current pattern score (1.0-5.0)
            pattern_signal: Current pattern signal (emoji + text)
            detected_patterns: List of detected pattern names
            lookback_days: Days forward to validate prediction (default 30)

        Returns:
            {
                "accuracy": float (0-100),          # Pattern prediction accuracy
                "expected_move": float,             # Expected % move based on pattern
                "actual_move": float,               # Actual % move observed
                "days_to_breakout": int,            # Days until pattern resolved
                "prediction_correct": bool,         # Did pattern predict correctly?
                "confidence": str                   # High/Medium/Low confidence
            }
        """
        print(f"\n[Backtester] Validating pattern prediction for {ticker}...")

        # Classify pattern direction and expected move
        direction = self._get_pattern_direction(pattern_score, pattern_signal)
        expected_move = self._get_expected_move(pattern_score, detected_patterns)

        # Get historical price data for validation
        to_date = datetime.now().strftime("%Y-%m-%d")
        from_date = (datetime.now() - timedelta(days=lookback_days + 10)).strftime("%Y-%m-%d")

        aggs = self.polygon.get_aggregates(ticker, from_date, to_date, timespan="day")
        if not aggs or "results" not in aggs or len(aggs["results"]) < lookback_days:
            print(f"[Backtester] Insufficient data for {ticker} (need {lookback_days}+ days)")
            return self._no_data_result()

        bars = aggs["results"]
        if len(bars) < 2:
            return self._no_data_result()

        # Use pattern detection point as reference (most recent bar)
        pattern_price = safe_float(bars[-1].get("c"))
        if pattern_price is None:
            return self._no_data_result()

        # Find breakout day and actual move
        breakout_day, actual_move = self._find_breakout_day(
            bars,
            pattern_price,
            expected_move,
            direction
        )

        # Evaluate if prediction was correct
        prediction_correct = self._evaluate_pattern_success(
            direction,
            actual_move,
            expected_move
        )

        # Calculate accuracy score (0-100)
        accuracy = self._calculate_accuracy(
            prediction_correct,
            actual_move,
            expected_move,
            direction
        )

        # Determine confidence level
        confidence = self._determine_confidence(accuracy, breakout_day, lookback_days)

        result = {
            "accuracy": round(accuracy, 1),
            "expected_move": round(expected_move * 100, 2),  # Convert to percentage
            "actual_move": round(actual_move * 100, 2),      # Convert to percentage
            "days_to_breakout": breakout_day if breakout_day else lookback_days,
            "prediction_correct": prediction_correct,
            "confidence": confidence,
            "direction": direction,
        }

        print(f"[Backtester] Pattern Accuracy: {accuracy:.1f}% | "
              f"Expected: {result['expected_move']:.2f}% | "
              f"Actual: {result['actual_move']:.2f}% | "
              f"Correct: {prediction_correct}")

        return result

    def _get_pattern_direction(self, pattern_score: float, pattern_signal: str) -> str:
        """Classify pattern as bullish, bearish, or neutral."""
        if pattern_score >= 3.5:
            return "bullish"
        elif pattern_score <= 2.5:
            return "bearish"
        else:
            return "neutral"

    def _get_expected_move(self, pattern_score: float, detected_patterns: List[str]) -> float:
        """
        Calculate expected price move based on pattern type and strength.

        Returns expected move as decimal (e.g., 0.05 = 5% move expected)
        """
        # Base expected move from pattern score
        if pattern_score >= 4.5:
            base_move = 0.10    # 10% for extremely bullish/bearish
        elif pattern_score >= 4.0:
            base_move = 0.07    # 7% for strong patterns
        elif pattern_score >= 3.5:
            base_move = 0.05    # 5% for moderate bullish
        elif pattern_score <= 2.0:
            base_move = -0.10   # -10% for extremely bearish
        elif pattern_score <= 2.5:
            base_move = -0.07   # -7% for strong bearish
        else:
            base_move = 0.02    # 2% for neutral (noise)

        # Adjust for high-conviction patterns
        if not isinstance(detected_patterns, list):
            return base_move

        high_conviction = ["Golden Cross", "Death Cross", "Bullish Volume Surge", "Bearish Volume Dump"]
        if any(p in detected_patterns for p in high_conviction):
            base_move *= 1.3  # +30% expected move for strong patterns

        return base_move

    def _find_breakout_day(
        self,
        bars: List[dict],
        pattern_price: float,
        expected_move: float,
        direction: str
    ) -> Tuple[Optional[int], float]:
        """
        Find the day when pattern prediction was confirmed (breakout).

        Returns: (days_to_breakout, actual_move_percentage)
        """
        if len(bars) < 2:
            return None, 0.0

        threshold = abs(expected_move) * 0.5  # 50% of expected move = breakout threshold

        for i in range(1, len(bars)):
            close = safe_float(bars[-i].get("c"))
            if close is None:
                continue

            move = (close - pattern_price) / pattern_price

            # Check if breakout occurred in expected direction
            if direction == "bullish" and move >= threshold:
                return i, move
            elif direction == "bearish" and move <= -threshold:
                return i, abs(move)
            elif direction == "neutral" and abs(move) <= 0.03:  # 3% range
                return i, move

        # No breakout found - return final move
        final_close = safe_float(bars[-1].get("c"))
        final_move = (final_close - pattern_price) / pattern_price if final_close else 0.0

        return None, final_move

    def _evaluate_pattern_success(
        self,
        direction: str,
        actual_move: float,
        expected_move: float
    ) -> bool:
        """Determine if pattern prediction was correct."""
        # For neutral patterns, success = price stayed in ±3% range
        if direction == "neutral":
            return abs(actual_move) <= 0.03

        # For directional patterns, success = moved in predicted direction
        if direction == "bullish":
            return actual_move > 0
        else:  # bearish
            return actual_move < 0

    def _calculate_accuracy(
        self,
        prediction_correct: bool,
        actual_move: float,
        expected_move: float,
        direction: str
    ) -> float:
        """
        Calculate pattern accuracy score (0-100).

        Scoring:
        - Correct direction: 50 base points
        - Magnitude accuracy: +0-50 points (how close actual vs expected)
        """
        if not prediction_correct:
            # Wrong direction = 0-25% accuracy depending on how wrong
            error_ratio = abs(actual_move - expected_move) / abs(expected_move) if expected_move != 0 else 1.0
            return max(0, 25 - (error_ratio * 25))

        # Correct direction: base 50 points
        accuracy = 50.0

        # Add magnitude accuracy (0-50 points)
        if expected_move != 0:
            magnitude_accuracy = 1.0 - min(1.0, abs(actual_move - expected_move) / abs(expected_move))
            accuracy += magnitude_accuracy * 50
        else:
            # Neutral pattern: score based on how stable price was
            stability = 1.0 - min(1.0, abs(actual_move) / 0.05)  # 5% threshold
            accuracy += stability * 50

        return min(100.0, max(0.0, accuracy))

    def _determine_confidence(self, accuracy: float, breakout_day: Optional[int], lookback_days: int) -> str:
        """Determine confidence level based on accuracy and timing."""
        # High accuracy + quick breakout = high confidence
        if accuracy >= 80 and (breakout_day and breakout_day <= lookback_days * 0.3):
            return "High"
        # Good accuracy or reasonable timing
        elif accuracy >= 60 or (breakout_day and breakout_day <= lookback_days * 0.5):
            return "Medium"
        # Low accuracy or no breakout
        else:
            return "Low"

    def _no_data_result(self) -> Dict[str, Any]:
        """Return default result when data is insufficient."""
        return {
            "accuracy": 0.0,
            "expected_move": 0.0,
            "actual_move": 0.0,
            "days_to_breakout": None,
            "prediction_correct": False,
            "confidence": "Low",
            "direction": "unknown",
        }

# =============================================================================
# Scoring
# =============================================================================
class StockScorer:
    def __init__(self):
        self.weights = {"technical": 0.30, "fundamental": 0.35, "macro": 0.20, "risk": 0.15}
        self.config = ScoringConfig()  # Centralized scoring configuration

    def calculate_scores(self, data: dict) -> dict:
        tech  = data["technical"]
        fund  = data["fundamental"]
        macro = data["macro"]
        scores = {
            "technical":   self._score_technical(tech),
            "fundamental": self._score_fundamental(fund),
            "macro":       self._score_macro(macro),
            "risk":        self._score_risk(tech, fund),
            "sentiment":   self._score_sentiment(tech),
        }
        comp = 0.0
        for k, w in self.weights.items():
            v = scores.get(k)
            if v is not None:
                comp += v * w
        scores["composite"] = round(comp, 2)
        scores["recommendation"] = self._recommend(scores["composite"])
        return scores

    def _score_technical(self, tech: dict) -> float:
        points, maxp = 0.0, 0.0
        price, ma50, ma200 = tech.get("current_price"), tech.get("ma_50"), tech.get("ma_200")
        if None not in (price, ma50, ma200):
            maxp += 3
            if price > ma50 > ma200: points += 3
            elif price > ma50:       points += 2
            elif price > ma200:      points += 1
        rsi = tech.get("rsi")
        if rsi is not None:
            maxp += 2
            if self.config.RSI_NEUTRAL_MIN <= rsi <= self.config.RSI_NEUTRAL_MAX:
                points += 2
            elif (self.config.RSI_MODERATE_LOW_MIN <= rsi < self.config.RSI_MODERATE_LOW_MAX or
                  self.config.RSI_MODERATE_HIGH_MIN < rsi <= self.config.RSI_MODERATE_HIGH_MAX):
                points += 1
        macd, sig = tech.get("macd"), tech.get("macd_signal")
        if macd is not None and sig is not None:
            maxp += 2
            if macd > sig:
                points += 2
            elif macd > sig * self.config.MACD_SIGNAL_CONVERGENCE:
                points += 1
        vol, avg = tech.get("volume"), tech.get("avg_volume_20d")
        if vol is not None and avg is not None:
            maxp += 1
            if vol > avg * self.config.VOLUME_SPIKE_RATIO:
                points += 1
        ch1m = tech.get("price_change_1m")
        if ch1m is not None:
            maxp += 2
            if ch1m > self.config.PRICE_CHANGE_STRONG:
                points += 2
            elif ch1m > self.config.PRICE_CHANGE_POSITIVE:
                points += 1
        if maxp == 0: return 3.0
        return round(1.0 + (points / maxp) * 4.0, 2)

    def _score_fundamental(self, fund: dict) -> float:
        points, maxp = 0.0, 0.0
        mcap = fund.get("market_cap")
        if mcap is not None:
            maxp += 3
            if mcap > self.config.MARKET_CAP_MEGA:
                points += 3
            elif mcap > self.config.MARKET_CAP_LARGE:
                points += 2
            elif mcap > self.config.MARKET_CAP_MID:
                points += 1
        pe = fund.get("pe_ratio")
        if pe is not None:
            maxp += 2
            if self.config.PE_RATIO_OPTIMAL_MIN <= pe <= self.config.PE_RATIO_OPTIMAL_MAX:
                points += 2
            elif (self.config.PE_RATIO_ACCEPTABLE_MIN <= pe < self.config.PE_RATIO_OPTIMAL_MIN or
                  self.config.PE_RATIO_OPTIMAL_MAX < pe <= self.config.PE_RATIO_ACCEPTABLE_MAX):
                points += 1
        de = fund.get("debt_to_equity")
        if de is not None:
            maxp += 2
            if de < self.config.DEBT_TO_EQUITY_IDEAL:
                points += 2
            elif de < self.config.DEBT_TO_EQUITY_ACCEPTABLE:
                points += 1
        rev = fund.get("revenue_ttm")
        if rev is not None:
            maxp += 1
            if rev > self.config.REVENUE_SIGNIFICANT:
                points += 1
        eps = fund.get("eps")
        if eps is not None:
            maxp += 2
            if eps > self.config.EPS_STRONG:
                points += 2
            elif eps > self.config.EPS_POSITIVE:
                points += 1
        if maxp == 0: return 3.0
        return round(1.0 + (points / maxp) * 4.0, 2)

    def _score_macro(self, macro: dict) -> float:
        points, maxp = 0.0, 0.0
        rate = macro.get("fed_funds_rate")
        if rate is not None:
            maxp += 3
            if rate < self.config.FED_FUNDS_LOW:
                points += 3
            elif rate < self.config.FED_FUNDS_MODERATE:
                points += 2
            elif rate < self.config.FED_FUNDS_HIGH:
                points += 1
        un = macro.get("unemployment")
        if un is not None:
            maxp += 2
            if un < self.config.UNEMPLOYMENT_HEALTHY:
                points += 2
            elif un < self.config.UNEMPLOYMENT_ACCEPTABLE:
                points += 1
        cs = macro.get("consumer_sentiment")
        if cs is not None:
            maxp += 2
            if cs > self.config.CONSUMER_SENTIMENT_STRONG:
                points += 2
            elif cs > self.config.CONSUMER_SENTIMENT_MODERATE:
                points += 1
        if maxp == 0: return 3.0
        return round(1.0 + (points / maxp) * 4.0, 2)

    def _score_risk(self, tech: dict, fund: dict) -> float:
        points, maxp = 0.0, 0.0
        vol = tech.get("volatility_30d")
        if vol is not None:
            maxp += 3
            if vol < self.config.VOLATILITY_LOW:
                points += 3
            elif vol < self.config.VOLATILITY_MODERATE:
                points += 2
            elif vol < self.config.VOLATILITY_HIGH:
                points += 1
        mcap = fund.get("market_cap")
        if mcap is not None:
            maxp += 2
            if mcap > self.config.MARKET_CAP_RISK_SAFE:
                points += 2
            elif mcap > self.config.MARKET_CAP_LARGE:
                points += 1
        beta = fund.get("beta")
        if beta is not None:
            maxp += 2
            if beta < self.config.BETA_LOW:
                points += 2
            elif beta < self.config.BETA_MODERATE:
                points += 1
        if maxp == 0: return 3.0
        return round(1.0 + (points / maxp) * 4.0, 2)

    def _score_sentiment(self, tech: dict) -> float:
        points, maxp = 0.0, 0.0
        rsi = tech.get("rsi")
        if rsi is not None:
            maxp += 2
            if self.config.RSI_SENTIMENT_NEUTRAL_MIN <= rsi <= self.config.RSI_SENTIMENT_NEUTRAL_MAX:
                points += 2
            elif (self.config.RSI_SENTIMENT_MODERATE_LOW_MIN <= rsi < self.config.RSI_SENTIMENT_MODERATE_LOW_MAX or
                  self.config.RSI_SENTIMENT_MODERATE_HIGH_MIN < rsi <= self.config.RSI_SENTIMENT_MODERATE_HIGH_MAX):
                points += 1
        vol, avg = tech.get("volume"), tech.get("avg_volume_20d")
        if vol is not None and avg is not None:
            maxp += 1
            if vol > avg * self.config.VOLUME_POSITIVE_RATIO:
                points += 1
        ch1m = tech.get("price_change_1m")
        if ch1m is not None:
            maxp += 2
            if ch1m > self.config.PRICE_CHANGE_STRONG_1M_SENTIMENT:
                points += 2
            elif ch1m > self.config.PRICE_CHANGE_POSITIVE:
                points += 1
        if maxp == 0: return 3.0
        return round(1.0 + (points / maxp) * 4.0, 2)

    def _recommend(self, score: float) -> str:
        if score >= 4.0: return "Strong Buy"
        if score >= 3.5: return "Buy"
        if score >= 3.0: return "Moderate Buy"
        if score >= 2.5: return "Hold"
        if score >= 2.0: return "Moderate Sell"
        if score >= 1.5: return "Sell"
        return "Strong Sell"

# =============================================================================
# Stock Comparator — v0.2.5
# =============================================================================
class StockComparator:
    """
    Compare multiple stocks side-by-side to answer: "Which should I buy?"

    Ranks stocks across composite score, value, momentum, risk, and fundamentals.
    Provides clear recommendations based on relative strengths.

    Usage:
        comparator = StockComparator(polygon, alpha_vantage, fred)
        results = comparator.compare_stocks(['NVDA', 'MSFT', 'AMZN'])
        comparator.print_comparison(results)
    """

    def __init__(self, polygon: PolygonClient, alpha_vantage: AlphaVantageClient, fred: FREDClient):
        self.collector = DataCollector(polygon, alpha_vantage, fred)
        self.scorer = StockScorer()
        self.config = ScoringConfig()

    def compare_stocks(self, tickers: List[str]) -> dict:
        """
        Analyze and compare multiple stocks.

        Args:
            tickers: List of stock symbols to compare

        Returns:
            {
                'tickers': list of tickers,
                'analyses': {ticker: {data, scores, ...}},
                'rankings': {
                    'overall': [(ticker, score), ...],
                    'value': [(ticker, score), ...],
                    'momentum': [(ticker, score), ...],
                    'safety': [(ticker, score), ...],
                    'fundamentals': [(ticker, score), ...]
                },
                'recommendation': {
                    'buy_now': ticker,
                    'best_value': ticker,
                    'best_momentum': ticker,
                    'safest': ticker,
                    'rationale': str
                }
            }
        """
        print("\n" + "="*60)
        print(f"STOCK COMPARATOR — Analyzing {len(tickers)} stocks")
        print("="*60)

        # Collect data and scores for all tickers
        analyses = {}
        for ticker in tickers:
            print(f"\n[{ticker}] Collecting data...")
            try:
                data = self.collector.collect_all_data(ticker)

                # Add pattern analysis
                tech = data.get("technical", {}) or {}
                if tech:
                    p_score, p_signal, patterns = compute_pattern_score(tech)
                    data["pattern"] = {"score": p_score, "signal": p_signal, "detected": patterns}

                scores = self.scorer.calculate_scores(data)

                analyses[ticker] = {
                    'data': data,
                    'scores': scores,
                    'metrics': self._extract_key_metrics(data, scores)
                }

                print(f"[{ticker}] ✅ Composite: {scores['composite']:.2f} — {scores['recommendation']}")

            except Exception as e:
                print(f"[{ticker}] ❌ Error: {e}")
                continue

        if len(analyses) < 2:
            print("\n⚠️  Need at least 2 valid analyses for comparison")
            return {'error': 'Insufficient data for comparison'}

        # Calculate rankings
        rankings = self._calculate_rankings(analyses)

        # Generate recommendation
        recommendation = self._generate_recommendation(analyses, rankings)

        return {
            'tickers': list(analyses.keys()),
            'analyses': analyses,
            'rankings': rankings,
            'recommendation': recommendation
        }

    def _extract_key_metrics(self, data: dict, scores: dict) -> dict:
        """Extract key metrics for comparison."""
        tech = data.get('technical', {}) or {}
        fund = data.get('fundamental', {}) or {}

        return {
            'price': safe_float(tech.get('current_price')),
            'market_cap': safe_float(fund.get('market_cap')),
            'pe_ratio': safe_float(fund.get('pe_ratio')),
            'price_change_1m': safe_float(tech.get('price_change_1m'), 0.0),
            'volatility': safe_float(tech.get('volatility_30d')),
            'beta': safe_float(fund.get('beta')),
            'debt_to_equity': safe_float(fund.get('debt_to_equity')),
            'rsi': safe_float(tech.get('rsi')),
            'composite': scores.get('composite', 0.0),
            'technical': scores.get('technical', 0.0),
            'fundamental': scores.get('fundamental', 0.0),
            'risk': scores.get('risk', 0.0),
        }

    def _calculate_rankings(self, analyses: dict) -> dict:
        """Calculate rankings across multiple dimensions."""

        # Overall ranking (composite score)
        overall = sorted(
            [(t, a['scores']['composite']) for t, a in analyses.items()],
            key=lambda x: x[1],
            reverse=True
        )

        # Value ranking (P/E ratio - lower is better)
        value = []
        for ticker, analysis in analyses.items():
            pe = analysis['metrics'].get('pe_ratio')
            if pe and pe > 0:
                # Invert P/E for ranking (lower P/E = higher value score)
                value_score = 100.0 / pe
                value.append((ticker, value_score))
        value.sort(key=lambda x: x[1], reverse=True)

        # Momentum ranking (1-month price change)
        momentum = sorted(
            [(t, a['metrics'].get('price_change_1m', 0.0)) for t, a in analyses.items()],
            key=lambda x: x[1],
            reverse=True
        )

        # Safety ranking (inverse of risk - higher risk score = safer)
        safety = sorted(
            [(t, a['scores']['risk']) for t, a in analyses.items()],
            key=lambda x: x[1],
            reverse=True
        )

        # Fundamentals ranking
        fundamentals = sorted(
            [(t, a['scores']['fundamental']) for t, a in analyses.items()],
            key=lambda x: x[1],
            reverse=True
        )

        return {
            'overall': overall,
            'value': value,
            'momentum': momentum,
            'safety': safety,
            'fundamentals': fundamentals
        }

    def _generate_recommendation(self, analyses: dict, rankings: dict) -> dict:
        """Generate clear buy recommendation with rationale."""

        buy_now = rankings['overall'][0][0]
        best_value = rankings['value'][0][0] if rankings['value'] else None
        best_momentum = rankings['momentum'][0][0]
        safest = rankings['safety'][0][0]

        # Build rationale
        buy_analysis = analyses[buy_now]
        buy_score = buy_analysis['scores']['composite']
        buy_rec = buy_analysis['scores']['recommendation']

        rationale_parts = [
            f"{buy_now} ranks #1 overall with composite score {buy_score:.2f} ({buy_rec})."
        ]

        # Add supporting reasons
        if buy_now == best_value:
            rationale_parts.append(f"Also the best value (lowest P/E ratio).")

        if buy_now == best_momentum:
            momentum_pct = buy_analysis['metrics'].get('price_change_1m', 0.0) * 100
            rationale_parts.append(f"Strongest momentum ({momentum_pct:+.1f}% this month).")

        if buy_now == safest:
            risk_score = buy_analysis['scores']['risk']
            rationale_parts.append(f"Also the safest option (risk score {risk_score:.2f}).")

        # Add pattern signal if available
        pattern = buy_analysis['data'].get('pattern', {})
        if pattern.get('signal'):
            rationale_parts.append(f"Pattern signal: {pattern['signal']}.")

        return {
            'buy_now': buy_now,
            'best_value': best_value,
            'best_momentum': best_momentum,
            'safest': safest,
            'rationale': ' '.join(rationale_parts)
        }

    def print_comparison(self, results: dict):
        """Print formatted comparison results."""
        if 'error' in results:
            print(f"\n⚠️  {results['error']}")
            return

        print("\n" + "="*80)
        print("COMPARATIVE ANALYSIS RESULTS")
        print("="*80)

        # Overall rankings
        print("\n📊 OVERALL RANKINGS (Composite Score)")
        print("-" * 80)
        for i, (ticker, score) in enumerate(results['rankings']['overall'], 1):
            analysis = results['analyses'][ticker]
            rec = analysis['scores']['recommendation']
            print(f"{i}. {ticker:6} — {score:.2f}  ({rec})")

        # Value rankings
        if results['rankings']['value']:
            print("\n💰 VALUE RANKINGS (P/E Ratio)")
            print("-" * 80)
            for i, (ticker, _) in enumerate(results['rankings']['value'], 1):
                pe = results['analyses'][ticker]['metrics'].get('pe_ratio')
                print(f"{i}. {ticker:6} — P/E: {pe:.1f}" if pe else f"{i}. {ticker:6} — P/E: N/A")

        # Momentum rankings
        print("\n🚀 MOMENTUM RANKINGS (1-Month Price Change)")
        print("-" * 80)
        for i, (ticker, change) in enumerate(results['rankings']['momentum'], 1):
            pct = change * 100
            print(f"{i}. {ticker:6} — {pct:+.1f}%")

        # Safety rankings
        print("\n🛡️  SAFETY RANKINGS (Risk Score)")
        print("-" * 80)
        for i, (ticker, risk_score) in enumerate(results['rankings']['safety'], 1):
            vol = results['analyses'][ticker]['metrics'].get('volatility')
            vol_str = f"Vol: {vol*100:.1f}%" if vol else "Vol: N/A"
            print(f"{i}. {ticker:6} — Risk: {risk_score:.2f}  ({vol_str})")

        # Recommendation
        print("\n" + "="*80)
        print("🎯 RECOMMENDATION")
        print("="*80)
        rec = results['recommendation']
        print(f"\n✅ BUY NOW: {rec['buy_now']}")
        print(f"\n{rec['rationale']}")

        if rec['buy_now'] != rec['best_value'] and rec['best_value']:
            print(f"\n💡 Alternative: {rec['best_value']} offers best value (lowest P/E)")

        if rec['buy_now'] != rec['best_momentum']:
            print(f"💡 Alternative: {rec['best_momentum']} has strongest momentum")

        if rec['buy_now'] != rec['safest']:
            print(f"💡 Alternative: {rec['safest']} is the safest pick")

        print("\n" + "="*80 + "\n")

# =============================================================================
# Notion Comparison Sync — v0.2.6
# =============================================================================
class NotionComparisonSync:
    """
    Syncs stock comparison results to Notion's Stock Comparisons database.

    Creates timestamped comparison records with:
    - Properties: Winner, Best Value, Best Momentum, Safest, Rationale, etc.
    - Page content: Formatted rankings tables and recommendation

    Usage:
        sync = NotionComparisonSync(NOTION_API_KEY, COMPARISONS_DB_ID)
        sync.sync_comparison(results)
    """

    def __init__(self, api_key: str, comparisons_db_id: str):
        self.api_key = api_key
        self.comparisons_db_id = comparisons_db_id
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Notion-Version": "2022-06-28"
        }

    def sync_comparison(self, results: dict) -> Optional[str]:
        """
        Sync comparison results to Notion.

        Args:
            results: Comparison results dict from StockComparator.compare_stocks()

        Returns:
            Page ID if successful, None otherwise
        """
        if 'error' in results:
            print(f"\n⚠️  Cannot sync comparison: {results['error']}")
            return None

        print("\n" + "="*60)
        print("Syncing comparison to Notion...")
        print("="*60)

        # Build properties
        timestamp = datetime.now(PACIFIC_TZ)
        tickers = results['tickers']
        rec = results['recommendation']

        # Format name: "NVDA vs MSFT vs AMZN - Oct 23, 2025 5:05 PM"
        name = f"{' vs '.join(tickers)} - {timestamp.strftime('%b %d, %Y %I:%M %p')}"

        # Build composite scores summary
        composite_scores = ", ".join([
            f"{t}: {results['analyses'][t]['scores']['composite']:.2f}"
            for t in tickers
        ])

        properties = {
            "Name": {"title": [{"text": {"content": name}}]},
            "Comparison Date": {"date": {"start": timestamp.isoformat()}},
            "Tickers Compared": {"rich_text": [{"text": {"content": ", ".join(tickers)}}]},
            "Winner": {"rich_text": [{"text": {"content": rec['buy_now']}}]},
            "Best Momentum": {"rich_text": [{"text": {"content": rec['best_momentum']}}]},
            "Safest": {"rich_text": [{"text": {"content": rec['safest']}}]},
            "Rationale": {"rich_text": [{"text": {"content": rec['rationale']}}]},
            "Composite Scores": {"rich_text": [{"text": {"content": composite_scores}}]},
            "Number of Stocks": {"number": len(tickers)}
        }

        # Add Best Value if it exists
        if rec.get('best_value'):
            properties["Best Value"] = {"rich_text": [{"text": {"content": rec['best_value']}}]}

        # Set Owner property for Notion notifications (v0.2.8)
        if CURRENT_USER_ID:
            properties["Owner"] = {"people": [{"id": CURRENT_USER_ID}]}

        # Build page content
        content = self._build_comparison_content(results)

        # Create page
        url = "https://api.notion.com/v1/pages"
        body = {
            "parent": {"database_id": self.comparisons_db_id},
            "properties": properties,
            "children": content
        }

        try:
            r = requests.post(url, headers=self.headers, json=body, timeout=40)
            if r.status_code in (200, 201):
                page_id = r.json().get("id")
                print(f"✅ Comparison synced to Notion")
                print("="*60 + "\n")
                return page_id
            else:
                print(f"[Notion] Comparison sync failed: {r.status_code} {r.text[:300]}")
                print("="*60 + "\n")
                return None
        except Exception as e:
            print(f"[Notion] Exception during sync: {e}")
            print("="*60 + "\n")
            return None

    def _build_comparison_content(self, results: dict) -> list:
        """Build Notion blocks for comparison page content."""
        blocks = []

        # Header callout
        rec = results['recommendation']
        blocks.append({
            "object": "block",
            "type": "callout",
            "callout": {
                "rich_text": [{"type": "text", "text": {"content": f"✅ BUY NOW: {rec['buy_now']}"}}],
                "icon": {"emoji": "🎯"},
                "color": "green_background"
            }
        })

        # Rationale
        blocks.append({
            "object": "block",
            "type": "paragraph",
            "paragraph": {
                "rich_text": [{"type": "text", "text": {"content": rec['rationale']}}]
            }
        })

        # Divider
        blocks.append({"object": "block", "type": "divider", "divider": {}})

        # Overall Rankings
        blocks.append({
            "object": "block",
            "type": "heading_2",
            "heading_2": {
                "rich_text": [{"type": "text", "text": {"content": "📊 Overall Rankings"}}]
            }
        })

        for i, (ticker, score) in enumerate(results['rankings']['overall'], 1):
            analysis = results['analyses'][ticker]
            rec_text = analysis['scores']['recommendation']
            blocks.append({
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [
                        {"type": "text", "text": {"content": f"{i}. {ticker} — {score:.2f} ({rec_text})"}},
                    ]
                }
            })

        # Value Rankings
        if results['rankings']['value']:
            blocks.append({
                "object": "block",
                "type": "heading_2",
                "heading_2": {
                    "rich_text": [{"type": "text", "text": {"content": "💰 Value Rankings"}}]
                }
            })

            for i, (ticker, _) in enumerate(results['rankings']['value'], 1):
                pe = results['analyses'][ticker]['metrics'].get('pe_ratio')
                pe_text = f"P/E: {pe:.1f}" if pe else "P/E: N/A"
                blocks.append({
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [{"type": "text", "text": {"content": f"{i}. {ticker} — {pe_text}"}}]
                    }
                })

        # Momentum Rankings
        blocks.append({
            "object": "block",
            "type": "heading_2",
            "heading_2": {
                "rich_text": [{"type": "text", "text": {"content": "🚀 Momentum Rankings"}}]
            }
        })

        for i, (ticker, change) in enumerate(results['rankings']['momentum'], 1):
            pct = change * 100
            blocks.append({
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [{"type": "text", "text": {"content": f"{i}. {ticker} — {pct:+.1f}%"}}]
                }
            })

        # Safety Rankings
        blocks.append({
            "object": "block",
            "type": "heading_2",
            "heading_2": {
                "rich_text": [{"type": "text", "text": {"content": "🛡️ Safety Rankings"}}]
            }
        })

        for i, (ticker, risk_score) in enumerate(results['rankings']['safety'], 1):
            vol = results['analyses'][ticker]['metrics'].get('volatility')
            vol_text = f"Vol: {vol*100:.1f}%" if vol else "Vol: N/A"
            blocks.append({
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [{"type": "text", "text": {"content": f"{i}. {ticker} — Risk: {risk_score:.2f} ({vol_text})"}}]
                }
            })

        # Alternative suggestions
        if rec['buy_now'] != rec.get('best_value') and rec.get('best_value'):
            blocks.append({
                "object": "block",
                "type": "divider",
                "divider": {}
            })
            blocks.append({
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [{"type": "text", "text": {"content": f"💡 Alternative: {rec['best_value']} offers best value (lowest P/E)"}}]
                }
            })

        if rec['buy_now'] != rec['best_momentum']:
            blocks.append({
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [{"type": "text", "text": {"content": f"💡 Alternative: {rec['best_momentum']} has strongest momentum"}}]
                }
            })

        if rec['buy_now'] != rec['safest']:
            blocks.append({
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [{"type": "text", "text": {"content": f"💡 Alternative: {rec['safest']} is the safest pick"}}]
                }
            })

        return blocks

# =============================================================================
# Notion Client — explicit per-DB props (no overrides forwarded)
# =============================================================================
class NotionClient:
    def __init__(self, api_key: str, analyses_db_id: str, history_db_id: str):
        self.api_key = api_key
        self.analyses_db_id = analyses_db_id
        self.history_db_id  = history_db_id
        self.headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json", "Notion-Version": "2022-06-28"}

    def sync_to_notion(self, ticker: str, data: dict, scores: dict, use_polling_workflow: bool = True):
        print("\n" + "="*60)
        print(f"Syncing {ticker} to Notion...")
        print("="*60)

        props_analyses = self._build_properties(ticker, data, scores, "analyses")
        analyses_page_id = self._upsert_analyses(ticker, props_analyses, use_polling_workflow)
        print("✅ Stock Analyses: " + ("Updated" if analyses_page_id else "Created"))

        # v0.2.9 workflow: Create history immediately
        # v0.3.0 workflow: Skip history creation here (handled by archive_to_history)
        history_page_id = None
        if not use_polling_workflow:
            props_history  = self._build_properties(ticker, data, scores, "history")
            history_page_id = self._create_history(ticker, data["timestamp"], props_history)
            print("✅ Stock History: Created new entry")
        else:
            print("⏭️  Stock History: Deferred until AI analysis complete (v0.3.0 workflow)")

        print("="*60 + "\n")
        return analyses_page_id, history_page_id

    def _upsert_analyses(self, ticker: str, props: dict, use_polling_workflow: bool = True) -> Optional[str]:
        page_id = self._find_by_ticker(self.analyses_db_id, ticker, prop_type="title")

        # Set Content Status based on workflow
        if use_polling_workflow:
            # v0.3.0 workflow: Set to "Pending Analysis" for both new and existing pages
            props["Content Status"] = {"select": {"name": "Pending Analysis"}}
            status_msg = "Pending Analysis (v0.3.0 polling workflow)"
        else:
            # v0.2.9 workflow: Set to "Updated" or "New" based on whether page exists
            if page_id:
                props["Content Status"] = {"select": {"name": "Updated"}}
                status_msg = "Updated (v0.2.9 legacy workflow)"
            else:
                props["Content Status"] = {"select": {"name": "New"}}
                status_msg = "New (v0.2.9 legacy workflow)"

        print(f"[Notion] Setting Content Status: {status_msg}")

        if page_id:
            url = f"https://api.notion.com/v1/pages/{page_id}"
            r = requests.patch(url, headers=self.headers, json={"properties": props}, timeout=40)
        else:
            # Add synced block reference to new pages for user guidance (v0.2.9 workflow only)
            # Block ID from: https://www.notion.so/Stock-Intelligence-28ca1d1b67e080ea8424c9e64f4648a9
            children = []
            if not use_polling_workflow:
                guidance_block_id = "28ca1d1b-67e0-80ea-8424-c9e64f4648a9"
                children = [{
                    "object": "block",
                    "type": "synced_block",
                    "synced_block": {
                        "synced_from": {
                            "type": "block_id",
                            "block_id": guidance_block_id
                        }
                    }
                }]

            url = "https://api.notion.com/v1/pages"
            body = {
                "parent": {"database_id": self.analyses_db_id},
                "properties": props,
            }
            if children:
                body["children"] = children
            r = requests.post(url, headers=self.headers, json=body, timeout=40)

        if r.status_code in (200, 201):
            try: return r.json().get("id")
            except Exception: return None
        print(f"[Notion] Analyses upsert {r.status_code} {r.text[:300]}")
        return None

    def _create_history(self, ticker: str, ts: datetime, props: dict) -> Optional[str]:
        ts_str = ts.strftime("%Y-%m-%d %I:%M %p")
        props = dict(props)  # shallow copy
        props["Name"] = {"title": [{"text": {"content": f"{ticker} - {ts_str}"}}]}

        # Set Content Status - always "New" for history records
        props["Content Status"] = {"select": {"name": "New"}}
        print(f"[Notion] Setting Content Status: New (history record)")

        url = "https://api.notion.com/v1/pages"
        r = requests.post(url, headers=self.headers, json={"parent": {"database_id": self.history_db_id}, "properties": props}, timeout=40)
        if r.status_code in (200, 201):
            try: return r.json().get("id")
            except Exception: return None
        print(f"[Notion] History create {r.status_code} {r.text[:300]}")
        return None

    def _find_by_ticker(self, database_id: str, ticker: str, prop_type: str) -> Optional[str]:
        url = f"https://api.notion.com/v1/databases/{database_id}/query"
        body = {"filter": {"property": "Ticker", prop_type: {"equals": ticker}}, "page_size": 1}
        try:
            r = requests.post(url, headers=self.headers, json=body, timeout=40)
            if r.status_code == 200:
                res = r.json().get("results") or []
                if res: return res[0].get("id")
        except Exception:
            pass
        return None

    def _build_properties(self, ticker: str, data: dict, scores: dict, db_type: str) -> dict:
        tech = data["technical"]; fund = data["fundamental"]; ts = data["timestamp"]
        total_fields = 28
        available = sum([
            1 if tech.get("current_price") else 0,
            1 if tech.get("ma_50") else 0,
            1 if tech.get("ma_200") else 0,
            1 if tech.get("rsi") else 0,
            1 if tech.get("macd") else 0,
            1 if tech.get("macd_signal") else 0,
            1 if tech.get("volume") else 0,
            1 if tech.get("avg_volume_20d") else 0,
            1 if tech.get("volatility_30d") else 0,
            1 if tech.get("price_change_1d") else 0,
            1 if tech.get("price_change_5d") else 0,
            1 if tech.get("price_change_1m") else 0,
            1 if fund.get("market_cap") else 0,
            1 if fund.get("pe_ratio") else 0,
            1 if fund.get("eps") else 0,
            1 if fund.get("revenue_ttm") else 0,
            1 if fund.get("debt_to_equity") is not None else 0,
            1 if fund.get("beta") else 0,
            1 if fund.get("52_week_high") else 0,
            1 if fund.get("52_week_low") else 0,
        ])
        completeness = available / total_fields
        grade = "A - Excellent" if completeness >= 0.90 else "B - Good" if completeness >= 0.75 else "C - Fair" if completeness >= 0.60 else "D - Poor"
        confidence = "High" if completeness >= 0.85 else "Medium-High" if completeness >= 0.70 else "Medium" if completeness >= 0.55 else "Low"

        props: Dict[str, Any] = {}
        if db_type == "analyses":
            props["Ticker"] = {"title": [{"text": {"content": ticker}}]}
        else:
            props["Ticker"] = {"rich_text": [{"text": {"content": ticker}}]}

        if fund.get("company_name"):
            props["Company Name"] = {"rich_text": [{"text": {"content": str(fund["company_name"])}}]}
        props["Analysis Date"] = {"date": {"start": ts.isoformat()}}

        # Set Owner property for Notion notifications (v0.2.8)
        if CURRENT_USER_ID:
            props["Owner"] = {"people": [{"id": CURRENT_USER_ID}]}

        if tech.get("current_price") is not None:
            props["Current Price"] = {"number": float(tech["current_price"])}

        props["Composite Score"]   = {"number": float(scores.get("composite", 0))}
        props["Technical Score"]   = {"number": float(scores.get("technical", 0))}
        props["Fundamental Score"] = {"number": float(scores.get("fundamental", 0))}
        props["Macro Score"]       = {"number": float(scores.get("macro", 0))}
        props["Risk Score"]        = {"number": float(scores.get("risk", 0))}
        props["Sentiment Score"]   = {"number": float(scores.get("sentiment", 0))}

        props["Recommendation"]     = {"select": {"name": scores.get("recommendation", "Hold")}}
        props["Confidence"]         = {"select": {"name": confidence}}
        props["Data Quality Grade"] = {"select": {"name": grade}}
        props["Data Completeness"]  = {"number": round(float(completeness), 2)}
        props["Protocol Version"]   = {"rich_text": [{"text": {"content": VERSION}}]}

        if tech.get("ma_50") is not None:            props["50 Day MA"]         = {"number": round(float(tech["ma_50"]), 2)}
        if tech.get("ma_200") is not None:           props["200 Day MA"]        = {"number": round(float(tech["ma_200"]), 2)}
        if tech.get("rsi") is not None:              props["RSI"]               = {"number": round(float(tech["rsi"]), 1)}
        if tech.get("macd") is not None:             props["MACD"]              = {"number": round(float(tech["macd"]), 2)}
        if tech.get("macd_signal") is not None:      props["MACD Signal"]       = {"number": round(float(tech["macd_signal"]), 2)}
        if tech.get("volume") is not None:           props["Volume"]            = {"number": int(float(tech["volume"]))}
        if tech.get("avg_volume_20d") is not None:   props["Avg Volume (20D)"]  = {"number": round(float(tech["avg_volume_20d"]), 1)}
        if tech.get("volatility_30d") is not None:   props["Volatility (30D)"]  = {"number": round(float(tech["volatility_30d"]), 4)}
        if tech.get("price_change_1d") is not None:  props["Price Change (1D)"] = {"number": round(float(tech["price_change_1d"]), 4)}
        if tech.get("price_change_5d") is not None:  props["Price Change (5D)"] = {"number": round(float(tech["price_change_5d"]), 4)}
        if tech.get("price_change_1m") is not None:  props["Price Change (1M)"] = {"number": round(float(tech["price_change_1m"]), 4)}
        if tech.get("volume") is not None and tech.get("avg_volume_20d") not in (None, 0):
            volchg = (float(tech["volume"]) - float(tech["avg_volume_20d"])) / float(tech["avg_volume_20d"])
            props["Volume Change"] = {"number": round(volchg, 4)}

        if fund.get("market_cap") is not None:     props["Market Cap"]      = {"number": round(float(fund["market_cap"]), 2)}
        if fund.get("pe_ratio") is not None:       props["P/E Ratio"]       = {"number": round(float(fund["pe_ratio"]), 2)}
        if fund.get("eps") is not None:            props["EPS"]             = {"number": round(float(fund["eps"]), 2)}
        if fund.get("revenue_ttm") is not None:    props["Revenue (TTM)"]   = {"number": round(float(fund["revenue_ttm"]), 0)}
        if fund.get("debt_to_equity") is not None: props["Debt to Equity"]  = {"number": round(float(fund["debt_to_equity"]), 2)}
        if fund.get("beta") is not None:           props["Beta"]            = {"number": round(float(fund["beta"]), 2)}
        if fund.get("52_week_high") is not None:   props["52 Week High"]    = {"number": round(float(fund["52_week_high"]), 2)}
        if fund.get("52_week_low") is not None:    props["52 Week Low"]     = {"number": round(float(fund["52_week_low"]), 2)}

        total_calls = sum((data.get("api_calls", {}).get(k) or 0) for k in ("polygon", "alpha_vantage", "fred"))
        props["API Calls Used"] = {"number": int(total_calls)}

        patt = data.get("pattern")
        if isinstance(patt, dict):
            allowed = {"🚀 Extremely Bullish","📈 Bullish","✋ Neutral","📉 Bearish","🚨 Extremely Bearish"}
            if patt.get("score") is not None:
                props["Pattern Score"] = {"number": float(patt["score"])}
            sig = patt.get("signal")
            if isinstance(sig, str) and sig in allowed:
                props["Pattern Signal"] = {"select": {"name": sig}}
            det = patt.get("detected") or []
            if isinstance(det, list):
                props["Detected Patterns"] = {"rich_text": [{"text": {"content": ", ".join(det)}}]}

            # Pattern Backtesting fields (v0.2.4)
            backtest = patt.get("backtest")
            if isinstance(backtest, dict):
                if backtest.get("accuracy") is not None:
                    props["Pattern Accuracy"] = {"number": float(backtest["accuracy"])}
                if backtest.get("days_to_breakout") is not None:
                    props["Days to Breakout"] = {"number": int(backtest["days_to_breakout"])}
                if backtest.get("expected_move") is not None:
                    props["Expected Move (%)"] = {"number": float(backtest["expected_move"])}
                if backtest.get("actual_move") is not None:
                    props["Actual Move (%)"] = {"number": float(backtest["actual_move"])}
                pred_correct = backtest.get("prediction_correct")
                if isinstance(pred_correct, bool):
                    props["Prediction Correct"] = {"checkbox": pred_correct}

        return props

    # =========================================================================
    # v0.3.0 Polling Workflow Methods
    # =========================================================================

    def wait_for_analysis_completion(
        self,
        page_id: str,
        timeout: int = 600,
        poll_interval: int = 10,
        skip_polling: bool = False
    ) -> bool:
        """
        Poll Stock Analyses page until Content Status = "Send to History"

        Args:
            page_id: Notion page ID to monitor
            timeout: Max seconds to wait (default 600 = 10 minutes)
            poll_interval: Seconds between checks (default 10)
            skip_polling: If True, return immediately without polling

        Returns:
            bool: True if ready to archive, False if timeout or skipped
        """
        if skip_polling:
            print("⏭️  Polling skipped. Run archive manually when ready:")
            print(f"    notion.archive_to_history('{page_id}')")
            return False

        import time

        start_time = datetime.now()
        end_time = start_time + timedelta(seconds=timeout)

        print("✅ Metrics synced. Waiting for AI analysis to complete...")
        print("📊 Open Notion and run your AI prompt now.")
        print(f"⏱️  Polling every {poll_interval}s for up to {timeout//60} minutes...")

        while datetime.now() < end_time:
            # Query page for current Content Status
            try:
                url = f"https://api.notion.com/v1/pages/{page_id}"
                r = requests.get(url, headers=self.headers, timeout=10)

                if r.status_code == 200:
                    page = r.json()
                    content_status = page["properties"]["Content Status"]["select"]

                    if content_status and content_status["name"] == "Send to History":
                        print("✅ AI analysis complete! Starting archival...")
                        return True

                    # Calculate time remaining
                    elapsed = int((datetime.now() - start_time).total_seconds())
                    remaining = timeout - elapsed

                    status_name = content_status["name"] if content_status else "None"
                    print(f"⏳ Status: {status_name} | Checking again in {poll_interval}s ({remaining}s remaining)")
                else:
                    print(f"⚠️  API error {r.status_code} while polling")

            except Exception as e:
                print(f"⚠️  Exception during polling: {e}")

            time.sleep(poll_interval)

        # Timeout reached - set status to "Analysis Incomplete"
        print("⏱️  Timeout reached. Analysis not completed within time limit.")
        print("🔄 Setting Content Status to 'Analysis Incomplete'...")

        try:
            url = f"https://api.notion.com/v1/pages/{page_id}"
            r = requests.patch(
                url,
                headers=self.headers,
                json={"properties": {"Content Status": {"select": {"name": "Analysis Incomplete"}}}},
                timeout=10
            )
            if r.status_code == 200:
                print("✅ Status updated to 'Analysis Incomplete'")
        except Exception as e:
            print(f"⚠️  Could not update status: {e}")

        print("💡 You can run the archiving function manually when ready:")
        print(f"    notion.archive_to_history('{page_id}')")
        return False

    def archive_to_history(self, page_id: str) -> Optional[str]:
        """
        Archive completed analysis to Stock History database

        Args:
            page_id: Stock Analyses page ID to archive

        Returns:
            Stock History page ID if successful, None otherwise
        """
        print("📦 Archiving analysis to Stock History...")

        try:
            # Read full page data
            page_url = f"https://api.notion.com/v1/pages/{page_id}"
            blocks_url = f"https://api.notion.com/v1/blocks/{page_id}/children"

            page_r = requests.get(page_url, headers=self.headers, timeout=30)
            blocks_r = requests.get(blocks_url, headers=self.headers, timeout=30)

            if page_r.status_code != 200 or blocks_r.status_code != 200:
                print(f"⚠️  Failed to read page data: page={page_r.status_code}, blocks={blocks_r.status_code}")
                return None

            page = page_r.json()
            blocks = blocks_r.json()

            # Extract properties for History record
            # Exclude properties that don't exist in Stock History or can't be copied
            EXCLUDE_PROPERTIES = {
                "Content Status",      # Workflow-specific (set separately below)
                "Owner",               # Workflow-specific (not needed in History)
                "Send to History",     # Button property - cannot be copied
                "Next Review Date",    # Stock Analyses-specific (if exists)
                "AI summary",          # Stock Analyses-specific (if exists)
                "Holding Type",        # Stock Analyses-specific (if exists)
            }

            properties_to_copy = {}
            excluded_count = 0
            for prop_name, prop_value in page["properties"].items():
                # Skip properties that don't exist in Stock History schema
                if prop_name in EXCLUDE_PROPERTIES:
                    excluded_count += 1
                    continue

                # Clean property value - remove database-specific IDs
                cleaned_value = self._clean_property_value(prop_value)
                if cleaned_value is not None:
                    properties_to_copy[prop_name] = cleaned_value

            print(f"ℹ️  Copying {len(properties_to_copy)} properties, excluding {excluded_count} Stock Analyses-specific properties")

            # Get ticker and analysis date for History page title
            ticker = page["properties"]["Ticker"]["title"][0]["plain_text"]
            analysis_date = page["properties"]["Analysis Date"]["date"]["start"]

            # Format title for Stock History
            dt = datetime.fromisoformat(analysis_date.replace('Z', '+00:00'))
            formatted_date = dt.strftime("%Y-%m-%d %I:%M %p")

            # Set Stock History specific properties
            # Convert Ticker from title to rich_text for History database
            properties_to_copy["Ticker"] = {"rich_text": [{"text": {"content": ticker}}]}
            properties_to_copy["Name"] = {"title": [{"text": {"content": f"{ticker} - {formatted_date}"}}]}
            properties_to_copy["Content Status"] = {"select": {"name": "Historical"}}

            # Create Stock History page
            history_url = "https://api.notion.com/v1/pages"
            history_body = {
                "parent": {"database_id": self.history_db_id},
                "properties": properties_to_copy
            }

            history_r = requests.post(history_url, headers=self.headers, json=history_body, timeout=40)

            if history_r.status_code not in (200, 201):
                error_msg = history_r.text
                print(f"⚠️  Failed to create Stock History page: {history_r.status_code}")
                print(f"Error: {error_msg[:500]}")

                # Provide helpful guidance for common errors
                if "validation_error" in error_msg and "properties" in error_msg:
                    print("\n💡 Tip: This error often means a property in Stock Analyses doesn't exist in Stock History.")
                    print("   Check that both databases have matching property schemas (except excluded properties).")
                    print(f"   Excluded properties: {EXCLUDE_PROPERTIES}")

                return None

            history_page = history_r.json()
            history_page_id = history_page["id"]

            print(f"✅ Created Stock History page: {ticker} - {formatted_date}")

            # Copy all content blocks from Stock Analyses to Stock History
            # Filter out synced blocks (user guidance)
            blocks_to_copy = []
            for block in blocks.get("results", []):
                # Skip synced blocks (guidance content)
                if block.get("type") == "synced_block":
                    continue

                # Create a copy of the block without metadata
                block_copy = {k: v for k, v in block.items()
                            if k not in ["id", "parent", "created_time", "last_edited_time",
                                        "created_by", "last_edited_by", "archived", "has_children"]}
                blocks_to_copy.append(block_copy)

            # Append blocks to History page if any exist
            if blocks_to_copy:
                append_url = f"https://api.notion.com/v1/blocks/{history_page_id}/children"
                append_body = {"children": blocks_to_copy}

                append_r = requests.patch(append_url, headers=self.headers, json=append_body, timeout=40)

                if append_r.status_code == 200:
                    print(f"✅ Copied {len(blocks_to_copy)} content blocks to Stock History")
                else:
                    print(f"⚠️  Warning: Could not copy content blocks: {append_r.status_code}")
            else:
                print("ℹ️  No content blocks to copy (analysis may still be pending)")

            # Update original Stock Analyses page to "Logged in History"
            update_url = f"https://api.notion.com/v1/pages/{page_id}"
            update_body = {
                "properties": {
                    "Content Status": {"select": {"name": "Logged in History"}}
                }
            }

            update_r = requests.patch(update_url, headers=self.headers, json=update_body, timeout=40)

            if update_r.status_code == 200:
                print("✅ Stock Analyses page marked as 'Logged in History'")
            else:
                print(f"⚠️  Warning: Could not update Stock Analyses status: {update_r.status_code}")

            print("🎉 Archival complete!")
            return history_page_id

        except Exception as e:
            print(f"❌ Exception during archival: {e}")
            import traceback
            traceback.print_exc()
            return None

    def _clean_property_value(self, prop_value: dict) -> Optional[dict]:
        """
        Clean property value by removing database-specific IDs.

        Extracts only portable data (names, values) that can be copied
        to a different database. Removes internal Notion IDs that are
        database-specific.

        Args:
            prop_value: Property value dict from Notion API

        Returns:
            Cleaned property dict, or None if property should be skipped
        """
        if not isinstance(prop_value, dict):
            return None

        prop_type = prop_value.get("type")

        # Skip properties without type
        if not prop_type:
            return None

        # Handle each property type
        if prop_type == "title":
            # Title property - extract text content only
            title_content = prop_value.get("title", [])
            if not title_content:
                return None
            return {
                "title": [{"text": {"content": item["plain_text"]}} for item in title_content if "plain_text" in item]
            }

        elif prop_type == "rich_text":
            # Rich text - extract text content only
            rich_text_content = prop_value.get("rich_text", [])
            if not rich_text_content:
                return {"rich_text": []}
            return {
                "rich_text": [{"text": {"content": item["plain_text"]}} for item in rich_text_content if "plain_text" in item]
            }

        elif prop_type == "number":
            # Number - copy directly
            return {"number": prop_value.get("number")}

        elif prop_type == "select":
            # Select - extract name only (remove ID and color)
            select_value = prop_value.get("select")
            if not select_value or not select_value.get("name"):
                return None
            return {
                "select": {"name": select_value["name"]}
            }

        elif prop_type == "multi_select":
            # Multi-select - extract names only
            multi_select_values = prop_value.get("multi_select", [])
            if not multi_select_values:
                return {"multi_select": []}
            return {
                "multi_select": [{"name": item["name"]} for item in multi_select_values if item.get("name")]
            }

        elif prop_type == "date":
            # Date - copy start/end/time_zone
            date_value = prop_value.get("date")
            if not date_value:
                return None
            cleaned_date = {"start": date_value.get("start")}
            if date_value.get("end"):
                cleaned_date["end"] = date_value["end"]
            if date_value.get("time_zone"):
                cleaned_date["time_zone"] = date_value["time_zone"]
            return {"date": cleaned_date}

        elif prop_type == "checkbox":
            # Checkbox - copy directly
            return {"checkbox": prop_value.get("checkbox", False)}

        elif prop_type == "url":
            # URL - copy directly
            return {"url": prop_value.get("url")}

        elif prop_type == "email":
            # Email - copy directly
            return {"email": prop_value.get("email")}

        elif prop_type == "phone_number":
            # Phone - copy directly
            return {"phone_number": prop_value.get("phone_number")}

        elif prop_type == "people":
            # People - skip (can't copy user IDs between databases)
            return None

        elif prop_type == "files":
            # Files - skip (file URLs are temporary)
            return None

        elif prop_type == "relation":
            # Relations - skip (page IDs are database-specific)
            return None

        elif prop_type == "formula":
            # Formulas - skip (computed property, can't be set)
            return None

        elif prop_type == "rollup":
            # Rollups - skip (computed property, can't be set)
            return None

        else:
            # Unknown type - skip
            print(f"⚠️  Skipping unknown property type: {prop_type}")
            return None

    def archive_ticker_to_history(self, ticker: str) -> Optional[str]:
        """
        Convenience method to archive a ticker by name instead of page ID.

        Args:
            ticker: Stock ticker symbol

        Returns:
            Stock History page ID if successful, None otherwise
        """
        print(f"🔍 Finding Stock Analyses page for {ticker}...")

        page_id = self._find_by_ticker(self.analyses_db_id, ticker, prop_type="title")

        if not page_id:
            print(f"❌ No Stock Analyses page found for {ticker}")
            return None

        print(f"✅ Found page: {page_id}")
        return self.archive_to_history(page_id)

# =============================================================================
# Convenience Functions
# =============================================================================
def compare_stocks(tickers: List[str], print_results: bool = True, sync_to_notion: bool = True) -> dict:
    """
    Compare multiple stocks and get buy recommendation.

    Args:
        tickers: List of stock symbols to compare
        print_results: If True, print formatted comparison table
        sync_to_notion: If True, sync comparison to Notion Stock Comparisons database

    Returns:
        Comparison results dict with rankings and recommendation

    Example:
        compare_stocks(['NVDA', 'MSFT', 'AMZN'])
        compare_stocks(['IONQ', 'QBTS', 'QUBT'])
        results = compare_stocks(['AAPL', 'GOOGL'], print_results=False, sync_to_notion=False)
    """
    polygon = PolygonClient(POLYGON_API_KEY)
    alpha = AlphaVantageClient(ALPHA_VANTAGE_API_KEY)
    fred = FREDClient(FRED_API_KEY)

    comparator = StockComparator(polygon, alpha, fred)
    results = comparator.compare_stocks(tickers)

    if print_results:
        comparator.print_comparison(results)

    # Sync to Notion if enabled and database ID is configured
    if sync_to_notion and 'error' not in results:
        if not STOCK_COMPARISONS_DB_ID:
            print("\n⚠️  Comparison sync skipped: STOCK_COMPARISONS_DB_ID not configured")
            print("Add STOCK_COMPARISONS_DB_ID to your .env file to enable Notion sync\n")
        else:
            notion_sync = NotionComparisonSync(NOTION_API_KEY, STOCK_COMPARISONS_DB_ID)
            notion_sync.sync_comparison(results)

    return results

# =============================================================================
# Market Analysis — v0.2.7
# =============================================================================

class MarketDataCollector:
    """
    Collects market data from multiple sources: FRED, Polygon, and Brave Search.

    Provides comprehensive market context including:
    - US indices (SPY, QQQ, DIA, IWM)
    - Volatility (VIX)
    - Sector ETFs (11 sectors)
    - Economic indicators (Fed rates, unemployment, CPI, etc.)
    - Market news (via Brave Search)
    """

    def __init__(self, polygon_client: PolygonClient, fred_client: FREDClient, brave_api_key: Optional[str] = None):
        self.polygon = polygon_client
        self.fred = fred_client
        self.brave_api_key = brave_api_key

    def get_us_indices(self) -> dict:
        """
        Fetch US market indices data from Polygon.

        Returns:
            dict: {
                'spy': {'price': float, 'change_1d': float, 'change_1m': float, ...},
                'qqq': {...},
                'dia': {...},
                'iwm': {...},
                'vix': {'price': float},
                'direction': 'Up'|'Down'|'Sideways'
            }
        """
        print("[Market] Fetching US indices...")

        tickers = ['SPY', 'QQQ', 'DIA', 'IWM', 'VIX']
        results = {}

        to_date = datetime.now().strftime("%Y-%m-%d")
        from_date = (datetime.now() - timedelta(days=250)).strftime("%Y-%m-%d")

        for ticker in tickers:
            try:
                aggs = self.polygon.get_aggregates(ticker, from_date, to_date, timespan="day")

                if not aggs or "results" not in aggs or len(aggs["results"]) < 21:
                    print(f"[Market] Insufficient data for {ticker}")
                    continue

                bars = aggs["results"]
                closes = [safe_float(bar.get("c")) for bar in bars if bar.get("c")]

                if not closes or len(closes) < 21:
                    continue

                current_price = closes[-1]

                results[ticker.lower()] = {
                    'price': current_price,
                    'change_1d': ((closes[-1] / closes[-2]) - 1) * 100 if len(closes) >= 2 else 0.0,
                    'change_5d': ((closes[-1] / closes[-6]) - 1) * 100 if len(closes) >= 6 else 0.0,
                    'change_1m': ((closes[-1] / closes[-21]) - 1) * 100 if len(closes) >= 21 else 0.0,
                    'change_3m': ((closes[-1] / closes[-63]) - 1) * 100 if len(closes) >= 63 else 0.0,
                    'ma_50': sum(closes[-50:]) / 50 if len(closes) >= 50 else None,
                    'ma_200': sum(closes[-200:]) / 200 if len(closes) >= 200 else None,
                }

                print(f"[Market] {ticker}: ${current_price:.2f} ({results[ticker.lower()]['change_1d']:+.2f}% today)")

            except Exception as e:
                print(f"[Market] Error fetching {ticker}: {e}")
                continue

        # Determine market direction based on SPY
        if 'spy' in results:
            spy_change = results['spy']['change_1m']
            if spy_change > 2:
                direction = "Up"
            elif spy_change < -2:
                direction = "Down"
            else:
                direction = "Sideways"
            results['direction'] = direction
        else:
            results['direction'] = "Unknown"

        return results

    def get_sector_etfs(self) -> list:
        """
        Fetch sector ETF performance data.

        Returns:
            list: [{'name': str, 'ticker': str, 'change_1m': float, 'price': float}, ...]
        """
        print("[Market] Fetching sector ETFs...")

        sectors = {
            'XLK': 'Technology',
            'XLF': 'Financials',
            'XLV': 'Healthcare',
            'XLE': 'Energy',
            'XLI': 'Industrials',
            'XLP': 'Consumer Staples',
            'XLY': 'Consumer Discretionary',
            'XLU': 'Utilities',
            'XLRE': 'Real Estate',
            'XLC': 'Communication',
            'XLB': 'Materials',
        }

        results = []
        to_date = datetime.now().strftime("%Y-%m-%d")
        from_date = (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d")

        for ticker, name in sectors.items():
            try:
                aggs = self.polygon.get_aggregates(ticker, from_date, to_date, timespan="day")

                if not aggs or "results" not in aggs or len(aggs["results"]) < 21:
                    continue

                bars = aggs["results"]
                closes = [safe_float(bar.get("c")) for bar in bars if bar.get("c")]

                if not closes or len(closes) < 21:
                    continue

                change_1m = ((closes[-1] / closes[-21]) - 1) * 100

                results.append({
                    'name': name,
                    'ticker': ticker,
                    'change_1m': change_1m,
                    'price': closes[-1]
                })

            except Exception as e:
                print(f"[Market] Error fetching {ticker}: {e}")
                continue

        # Sort by performance
        results.sort(key=lambda x: x['change_1m'], reverse=True)

        print(f"[Market] Fetched {len(results)} sector ETFs")
        return results

    def get_fred_metrics(self) -> dict:
        """
        Fetch key economic indicators from FRED.

        Returns:
            dict: {
                'fed_funds_rate': {'current': float},
                'unemployment': {'current': float},
                'cpi_yoy': {'current': float},
                'yield_curve': {'current': float},
                'consumer_sentiment': {'current': float}
            }
        """
        print("[Market] Fetching FRED economic indicators...")

        series_map = {
            'fed_funds_rate': 'DFF',
            'unemployment': 'UNRATE',
            'yield_curve': 'T10Y2Y',
            'consumer_sentiment': 'UMCSENT',
        }

        results = {}

        for key, series_id in series_map.items():
            try:
                value = self.fred._latest(series_id)
                if value is not None:
                    results[key] = {'current': value}
                    print(f"[Market] {key}: {value:.2f}")
            except Exception as e:
                print(f"[Market] Error fetching {key}: {e}")
                results[key] = {'current': None}

        # Calculate CPI Year-over-Year percentage change
        try:
            cpi_data = self.fred._get_series('CPIAUCSL', limit=13)  # Need 13 months for YoY
            if cpi_data and len(cpi_data) >= 13:
                current_cpi = cpi_data[0]  # Most recent
                year_ago_cpi = cpi_data[12]  # 12 months ago
                if current_cpi and year_ago_cpi and year_ago_cpi > 0:
                    cpi_yoy = ((current_cpi / year_ago_cpi) - 1) * 100
                    results['cpi_yoy'] = {'current': cpi_yoy}
                    print(f"[Market] cpi_yoy: {cpi_yoy:.2f}%")
                else:
                    results['cpi_yoy'] = {'current': None}
            else:
                print("[Market] Insufficient CPI data for YoY calculation")
                results['cpi_yoy'] = {'current': None}
        except Exception as e:
            print(f"[Market] Error calculating CPI YoY: {e}")
            results['cpi_yoy'] = {'current': None}

        return results

    def search_market_news(self) -> list:
        """
        Search for latest market news using Brave Search API.

        Returns:
            list: [{'query': str, 'results': [{'title': str, 'description': str, 'url': str}]}, ...]
        """
        if not self.brave_api_key:
            print("[Market] Brave API key not configured - skipping news search")
            return []

        print("[Market] Searching for market news...")

        queries = [
            "stock market outlook today",
            "federal reserve interest rates latest",
            "sector rotation stock market trends",
        ]

        all_results = []

        for query in queries:
            try:
                url = "https://api.search.brave.com/res/v1/web/search"
                headers = {
                    "Accept": "application/json",
                    "X-Subscription-Token": self.brave_api_key
                }
                params = {
                    "q": query,
                    "count": 3,
                    "freshness": "pd"  # past day
                }

                r = requests.get(url, headers=headers, params=params, timeout=10)

                if r.status_code == 200:
                    data = r.json()
                    results = []

                    for item in data.get('web', {}).get('results', [])[:3]:
                        results.append({
                            'title': item.get('title', ''),
                            'description': item.get('description', ''),
                            'url': item.get('url', '')
                        })

                    all_results.append({
                        'query': query,
                        'results': results
                    })

                    print(f"[Market] Found {len(results)} articles for: {query}")
                else:
                    print(f"[Market] Brave API error {r.status_code} for: {query}")

            except Exception as e:
                print(f"[Market] Error searching '{query}': {e}")
                continue

        return all_results


class MarketRegimeClassifier:
    """
    Determines current market regime and risk assessment.

    Classifies market into:
    - Risk-On: Markets up, VIX low, positive momentum
    - Risk-Off: Markets down, VIX high, negative momentum
    - Transition: Mixed signals

    Risk levels:
    - Aggressive: Strong bullish conditions
    - Neutral: Mixed or sideways conditions
    - Defensive: Bearish or high uncertainty
    """

    def classify_regime(self, us_data: dict, fred_data: dict) -> str:
        """
        Classify current market regime.

        Args:
            us_data: US indices data from MarketDataCollector
            fred_data: FRED economic data

        Returns:
            str: "Risk-On", "Risk-Off", or "Transition"
        """
        score = 0

        # Market direction (±2 points)
        if 'spy' in us_data:
            spy_change = us_data['spy'].get('change_1m', 0)
            if spy_change > 2:
                score += 2
            elif spy_change < -2:
                score -= 2

        # VIX level (±1 point)
        if 'vix' in us_data:
            vix = us_data['vix'].get('price', 20)
            if vix < 20:
                score += 1
            elif vix > 25:
                score -= 1

        # Yield curve (±1 point)
        if fred_data.get('yield_curve', {}).get('current') is not None:
            yield_curve = fred_data['yield_curve']['current']
            if yield_curve > 0.5:
                score += 1
            elif yield_curve < 0:
                score -= 1

        # Classify based on score
        if score >= 2:
            return "Risk-On"
        elif score <= -2:
            return "Risk-Off"
        else:
            return "Transition"

    def assess_risk_level(self, us_data: dict, fred_data: dict, regime: str) -> str:
        """
        Assess appropriate risk level for investors.

        Returns:
            str: "Aggressive", "Neutral", or "Defensive"
        """
        if regime == "Risk-On":
            # Check if conditions are extremely bullish
            spy_change = us_data.get('spy', {}).get('change_1m', 0)
            vix = us_data.get('vix', {}).get('price', 20)

            if spy_change > 5 and vix < 15:
                return "Aggressive"
            else:
                return "Neutral"

        elif regime == "Risk-Off":
            return "Defensive"

        else:  # Transition
            return "Neutral"


class SectorAnalyzer:
    """
    Analyzes sector rotation and strength.
    """

    def rank_sectors(self, sector_data: list) -> list:
        """
        Ranks sectors by performance (already sorted by MarketDataCollector).

        Args:
            sector_data: List of sector dicts from get_sector_etfs()

        Returns:
            list: Sorted list of sectors with scores
        """
        return sector_data

    def interpret_rotation(self, sectors: list, regime: str) -> str:
        """
        Interpret sector rotation patterns.

        Args:
            sectors: Ranked sector list
            regime: Current market regime

        Returns:
            str: Interpretation of sector rotation
        """
        if not sectors or len(sectors) < 3:
            return "Insufficient sector data for rotation analysis."

        top_sector = sectors[0]['name']
        bottom_sector = sectors[-1]['name']

        # Cyclical sectors (Energy, Financials, Industrials, Materials)
        cyclical = {'Energy', 'Financials', 'Industrials', 'Materials'}
        # Defensive sectors (Utilities, Consumer Staples, Healthcare)
        defensive = {'Utilities', 'Consumer Staples', 'Healthcare'}

        top_3 = [s['name'] for s in sectors[:3]]
        top_cyclical_count = sum(1 for s in top_3 if s in cyclical)
        top_defensive_count = sum(1 for s in top_3 if s in defensive)

        if top_cyclical_count >= 2:
            interpretation = f"Cyclical sectors leading ({', '.join(top_3[:2])}), indicating {regime.lower()} positioning with growth expectations."
        elif top_defensive_count >= 2:
            interpretation = f"Defensive sectors leading ({', '.join(top_3[:2])}), indicating risk-off sentiment and flight to safety."
        else:
            interpretation = f"{top_sector} leading rotation, suggesting sector-specific strength in {regime.lower()} environment."

        return interpretation


class NotionMarketSync:
    """
    Syncs market analysis results to Notion's Market Context database.
    """

    def __init__(self, api_key: str, market_context_db_id: str):
        self.api_key = api_key
        self.market_context_db_id = market_context_db_id
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Notion-Version": "2022-06-28"
        }

    def sync_market_context(self, market_data: dict) -> Optional[str]:
        """
        Sync market analysis to Notion.

        Args:
            market_data: Complete market analysis dict

        Returns:
            Page ID if successful, None otherwise
        """
        print("\n" + "="*60)
        print("Syncing market analysis to Notion...")
        print("="*60)

        timestamp = market_data['timestamp']
        us_data = market_data['us_indices']
        sectors = market_data['sectors']
        fred_data = market_data['fred_metrics']
        regime = market_data['regime']
        risk = market_data['risk_level']

        # Build properties
        name = f"Market Analysis - {timestamp.strftime('%b %d, %Y %I:%M %p')}"

        properties = {
            "Name": {"title": [{"text": {"content": name}}]},
            "Analysis Date": {"date": {"start": timestamp.isoformat()}},
            "Market Regime": {"select": {"name": regime}},
            "Risk Assessment": {"select": {"name": risk}},
            "US Direction": {"select": {"name": us_data.get('direction', 'Unknown')}},
        }

        # Add VIX if available
        if 'vix' in us_data and us_data['vix'].get('price') is not None:
            properties["VIX Level"] = {"number": round(us_data['vix']['price'], 2)}

        # Add sector info
        if sectors and len(sectors) > 0:
            properties["Top Sector"] = {"rich_text": [{"text": {"content": sectors[0]['name']}}]}
            properties["Bottom Sector"] = {"rich_text": [{"text": {"content": sectors[-1]['name']}}]}

        # Add economic indicators
        if fred_data.get('fed_funds_rate', {}).get('current') is not None:
            properties["Fed Funds Rate"] = {"number": round(fred_data['fed_funds_rate']['current'], 2)}

        if fred_data.get('unemployment', {}).get('current') is not None:
            properties["Unemployment"] = {"number": round(fred_data['unemployment']['current'], 2)}

        if fred_data.get('cpi_yoy', {}).get('current') is not None:
            properties["CPI (YoY)"] = {"number": round(fred_data['cpi_yoy']['current'], 2)}

        # Set Owner property for Notion notifications (v0.2.8)
        if CURRENT_USER_ID:
            properties["Owner"] = {"people": [{"id": CURRENT_USER_ID}]}

        # Generate executive summary
        summary = self._generate_summary(market_data)
        properties["Summary"] = {"rich_text": [{"text": {"content": summary}}]}

        # Build page content
        content_blocks = self._build_content_blocks(market_data)

        # Create page
        url = "https://api.notion.com/v1/pages"
        body = {
            "parent": {"database_id": self.market_context_db_id},
            "properties": properties,
            "children": content_blocks
        }

        try:
            r = requests.post(url, headers=self.headers, json=body, timeout=40)
            if r.status_code in (200, 201):
                page_id = r.json().get("id")
                print(f"✅ Market analysis synced to Notion")
                print("="*60 + "\n")
                return page_id
            else:
                print(f"[Notion] Market sync failed: {r.status_code} {r.text[:300]}")
                print("="*60 + "\n")
                return None
        except Exception as e:
            print(f"[Notion] Exception during sync: {e}")
            print("="*60 + "\n")
            return None

    def _generate_summary(self, market_data: dict) -> str:
        """Generate 2-3 sentence executive summary."""
        us_data = market_data['us_indices']
        regime = market_data['regime']
        risk = market_data['risk_level']
        sectors = market_data['sectors']

        spy_change = us_data.get('spy', {}).get('change_1m', 0)
        direction_text = "up" if spy_change > 0 else "down"

        summary = f"Market regime: {regime} with {risk} risk posture. "
        summary += f"S&P 500 is {direction_text} {abs(spy_change):.1f}% this month. "

        if sectors:
            summary += f"{sectors[0]['name']} sector leading (+{sectors[0]['change_1m']:.1f}%)."

        return summary

    def _build_content_blocks(self, market_data: dict) -> list:
        """Build Notion blocks for page content."""
        blocks = []

        us_data = market_data['us_indices']
        sectors = market_data['sectors']
        fred_data = market_data['fred_metrics']
        regime = market_data['regime']
        risk = market_data['risk_level']
        news = market_data.get('news', [])

        # Header callout
        regime_emoji = "🟢" if regime == "Risk-On" else "🔴" if regime == "Risk-Off" else "🟡"
        blocks.append({
            "object": "block",
            "type": "callout",
            "callout": {
                "rich_text": [{"type": "text", "text": {"content": f"{regime_emoji} Market Regime: {regime} | Risk Level: {risk}"}}],
                "icon": {"emoji": "🎯"},
                "color": "blue_background" if regime == "Risk-On" else "red_background" if regime == "Risk-Off" else "yellow_background"
            }
        })

        # US Market Overview
        blocks.append({
            "object": "block",
            "type": "heading_2",
            "heading_2": {"rich_text": [{"type": "text", "text": {"content": "📊 US Market Overview"}}]}
        })

        if 'spy' in us_data:
            spy = us_data['spy']
            blocks.append({
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [{"type": "text", "text": {
                        "content": f"S&P 500 (SPY): ${spy['price']:.2f} ({spy['change_1d']:+.2f}% today, {spy['change_1m']:+.2f}% this month)"
                    }}]
                }
            })

        if 'qqq' in us_data:
            qqq = us_data['qqq']
            blocks.append({
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [{"type": "text", "text": {
                        "content": f"Nasdaq (QQQ): ${qqq['price']:.2f} ({qqq['change_1d']:+.2f}% today, {qqq['change_1m']:+.2f}% this month)"
                    }}]
                }
            })

        if 'vix' in us_data:
            vix_price = us_data['vix']['price']
            vix_interpretation = "Low volatility" if vix_price < 20 else "Elevated volatility" if vix_price < 30 else "High volatility"
            blocks.append({
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [{"type": "text", "text": {
                        "content": f"VIX: {vix_price:.2f} — {vix_interpretation}"
                    }}]
                }
            })

        # Sector Rotation
        if sectors:
            blocks.append({"object": "block", "type": "divider", "divider": {}})
            blocks.append({
                "object": "block",
                "type": "heading_2",
                "heading_2": {"rich_text": [{"type": "text", "text": {"content": "📈 Sector Rotation"}}]}
            })

            blocks.append({
                "object": "block",
                "type": "heading_3",
                "heading_3": {"rich_text": [{"type": "text", "text": {"content": "Leaders (1-Month)"}}]}
            })

            for sector in sectors[:3]:
                blocks.append({
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [{"type": "text", "text": {
                            "content": f"• {sector['name']} ({sector['ticker']}): {sector['change_1m']:+.2f}%"
                        }}]
                    }
                })

            blocks.append({
                "object": "block",
                "type": "heading_3",
                "heading_3": {"rich_text": [{"type": "text", "text": {"content": "Laggards"}}]}
            })

            for sector in sectors[-3:]:
                blocks.append({
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [{"type": "text", "text": {
                            "content": f"• {sector['name']} ({sector['ticker']}): {sector['change_1m']:+.2f}%"
                        }}]
                    }
                })

        # Economic Indicators
        blocks.append({"object": "block", "type": "divider", "divider": {}})
        blocks.append({
            "object": "block",
            "type": "heading_2",
            "heading_2": {"rich_text": [{"type": "text", "text": {"content": "🏛️ Economic Indicators"}}]}
        })

        if fred_data.get('fed_funds_rate', {}).get('current') is not None:
            blocks.append({
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [{"type": "text", "text": {
                        "content": f"Federal Funds Rate: {fred_data['fed_funds_rate']['current']:.2f}%"
                    }}]
                }
            })

        if fred_data.get('unemployment', {}).get('current') is not None:
            blocks.append({
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [{"type": "text", "text": {
                        "content": f"Unemployment: {fred_data['unemployment']['current']:.1f}%"
                    }}]
                }
            })

        if fred_data.get('cpi_yoy', {}).get('current') is not None:
            blocks.append({
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [{"type": "text", "text": {
                        "content": f"CPI (YoY): {fred_data['cpi_yoy']['current']:.2f}%"
                    }}]
                }
            })

        if fred_data.get('yield_curve', {}).get('current') is not None:
            yc = fred_data['yield_curve']['current']
            yc_text = "Normal (positive)" if yc > 0 else "Inverted (negative)"
            blocks.append({
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [{"type": "text", "text": {
                        "content": f"Yield Curve (10Y-2Y): {yc:.2f}% — {yc_text}"
                    }}]
                }
            })

        if fred_data.get('consumer_sentiment', {}).get('current') is not None:
            blocks.append({
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [{"type": "text", "text": {
                        "content": f"Consumer Sentiment: {fred_data['consumer_sentiment']['current']:.1f}"
                    }}]
                }
            })

        # Market News
        if news:
            blocks.append({"object": "block", "type": "divider", "divider": {}})
            blocks.append({
                "object": "block",
                "type": "heading_2",
                "heading_2": {"rich_text": [{"type": "text", "text": {"content": "📰 Recent Market News"}}]}
            })

            for news_group in news[:2]:  # Limit to first 2 queries
                for article in news_group['results'][:2]:  # Limit to 2 articles per query
                    blocks.append({
                        "object": "block",
                        "type": "paragraph",
                        "paragraph": {
                            "rich_text": [
                                {"type": "text", "text": {"content": f"• {article['title']}", "link": {"url": article['url']}}}
                            ]
                        }
                    })

        return blocks


def analyze_market(print_results: bool = True, sync_to_notion: bool = True) -> dict:
    """
    Analyze current market conditions and context.

    Provides comprehensive market overview including:
    - US indices performance
    - Market regime (Risk-On/Risk-Off/Transition)
    - Sector rotation and leadership
    - Economic indicators
    - Market news

    Args:
        print_results: If True, print formatted analysis
        sync_to_notion: If True, sync to Notion Market Context database

    Returns:
        dict: Complete market analysis data

    Example:
        analyze_market()
        results = analyze_market(print_results=False, sync_to_notion=False)
    """
    print("\n" + "="*80)
    print(f"MARKET ANALYZER {VERSION}")
    print("="*80)
    print(f"Timestamp: {datetime.now(PACIFIC_TZ).strftime('%Y-%m-%d %I:%M %p %Z')}")
    print("="*80 + "\n")

    # Initialize clients
    polygon = PolygonClient(POLYGON_API_KEY)
    fred = FREDClient(FRED_API_KEY)

    # Collect data
    collector = MarketDataCollector(polygon, fred, BRAVE_API_KEY)

    us_indices = collector.get_us_indices()
    sectors = collector.get_sector_etfs()
    fred_metrics = collector.get_fred_metrics()
    news = collector.search_market_news()

    # Analyze regime
    classifier = MarketRegimeClassifier()
    regime = classifier.classify_regime(us_indices, fred_metrics)
    risk_level = classifier.assess_risk_level(us_indices, fred_metrics, regime)

    # Analyze sectors
    sector_analyzer = SectorAnalyzer()
    sector_interpretation = sector_analyzer.interpret_rotation(sectors, regime)

    # Build result
    market_data = {
        'timestamp': datetime.now(PACIFIC_TZ),
        'us_indices': us_indices,
        'sectors': sectors,
        'fred_metrics': fred_metrics,
        'news': news,
        'regime': regime,
        'risk_level': risk_level,
        'sector_interpretation': sector_interpretation,
    }

    # Print results
    if print_results:
        print("\n" + "="*80)
        print("MARKET ANALYSIS RESULTS")
        print("="*80)

        regime_emoji = "🟢" if regime == "Risk-On" else "🔴" if regime == "Risk-Off" else "🟡"
        print(f"\n{regime_emoji} Market Regime: {regime}")
        print(f"📊 Risk Level: {risk_level}")
        print(f"📈 US Market Direction: {us_indices.get('direction', 'Unknown')}")

        if 'spy' in us_indices:
            spy = us_indices['spy']
            print(f"\n💼 S&P 500 (SPY): ${spy['price']:.2f}")
            print(f"   Today: {spy['change_1d']:+.2f}% | 1M: {spy['change_1m']:+.2f}%")

        if 'vix' in us_indices:
            vix = us_indices['vix']['price']
            print(f"\n⚡ VIX: {vix:.2f}")

        if sectors:
            print(f"\n🏆 Top Sector: {sectors[0]['name']} ({sectors[0]['change_1m']:+.2f}%)")
            print(f"📉 Bottom Sector: {sectors[-1]['name']} ({sectors[-1]['change_1m']:+.2f}%)")
            print(f"\n💡 Sector Rotation: {sector_interpretation}")

        print("\n" + "="*80 + "\n")

    # Sync to Notion
    if sync_to_notion:
        if not MARKET_CONTEXT_DB_ID:
            print("⚠️  Market sync skipped: MARKET_CONTEXT_DB_ID not configured")
            print("Add MARKET_CONTEXT_DB_ID to your .env file to enable Notion sync\n")
        else:
            notion_sync = NotionMarketSync(NOTION_API_KEY, MARKET_CONTEXT_DB_ID)
            notion_sync.sync_market_context(market_data)

    print(f"✅ Market analysis complete! — {VERSION}\n")

    return market_data

# =============================================================================
# Orchestrator
# =============================================================================
def analyze_and_sync_to_notion(
    ticker: str,
    backtest_patterns: bool = False,
    use_polling_workflow: bool = True,
    timeout: int = 600,
    skip_polling: bool = False
):
    """
    Main analysis orchestrator.

    Args:
        ticker: Stock ticker symbol to analyze
        backtest_patterns: If True, validate pattern predictions (adds 1 API call)
        use_polling_workflow: If True, use v0.3.0 polling workflow; if False, use v0.2.9 legacy workflow
        timeout: Max seconds to wait for AI analysis (default 600 = 10 minutes, only used if use_polling_workflow=True)
        skip_polling: If True, skip polling and return immediately after writing metrics (manual archive required)
    """
    workflow_version = "v0.3.0 (polling)" if use_polling_workflow else "v0.2.9 (legacy)"
    print("\n" + "="*60)
    print(f"STOCK ANALYZER {VERSION} — HYBRID DUAL‑API")
    print(f"Workflow: {workflow_version}")
    print("="*60)
    print(f"Ticker: {ticker}")
    print(f"Timestamp: {datetime.now(PACIFIC_TZ).strftime('%Y-%m-%d %I:%M %p %Z')}")

    polygon = PolygonClient(POLYGON_API_KEY)
    alpha   = AlphaVantageClient(ALPHA_VANTAGE_API_KEY)
    fred    = FREDClient(FRED_API_KEY)
    collector = DataCollector(polygon, alpha, fred)
    scorer    = StockScorer()
    notion    = NotionClient(NOTION_API_KEY, STOCK_ANALYSES_DB_ID, STOCK_HISTORY_DB_ID)

    data = collector.collect_all_data(ticker)

    tech = data.get("technical", {}) or {}
    if tech:
        p_score, p_signal, patterns = compute_pattern_score(tech)
        data["pattern"] = {"score": p_score, "signal": p_signal, "detected": patterns}
        print(f"Pattern → score={p_score}, signal={p_signal}, detected={patterns}")

        # Optional: Backtest pattern accuracy
        if backtest_patterns:
            backtester = PatternBacktester(polygon)
            backtest_result = backtester.backtest_pattern(ticker, p_score, p_signal, patterns)
            data["pattern"]["backtest"] = backtest_result
    else:
        print("Pattern → skipped (no technical data).")

    print("\nCalculating scores...")
    scores = scorer.calculate_scores(data)

    print("\n" + "="*60)
    print("SCORES")
    print("="*60)
    print(f"Composite:  {scores['composite']:.2f} — {scores['recommendation']}")
    print(f"Technical:  {scores['technical']:.2f}")
    print(f"Fundamental:{scores['fundamental']:.2f}")
    print(f"Macro:      {scores['macro']:.2f}")
    print(f"Risk:       {scores['risk']:.2f}")
    print(f"Sentiment:  {scores['sentiment']:.2f} (not weighted)")
    print("="*60 + "\n")

    # Sync to Notion with selected workflow
    analyses_page_id, history_page_id = notion.sync_to_notion(ticker, data, scores, use_polling_workflow)

    # v0.3.0 workflow: Poll for AI completion and archive
    if use_polling_workflow and analyses_page_id:
        ready = notion.wait_for_analysis_completion(
            analyses_page_id,
            timeout=timeout,
            skip_polling=skip_polling
        )

        if ready:
            history_page_id = notion.archive_to_history(analyses_page_id)

    print("\n" + "="*60)
    print(f"✅ Analysis complete for {ticker}! — {VERSION}")
    if use_polling_workflow and not skip_polling:
        if history_page_id:
            print("📦 Archived to Stock History")
        else:
            print("⏳ Awaiting manual archive (timeout or incomplete)")
    print("="*60 + "\n")

# =============================================================================
# EXECUTION
# =============================================================================

# MARKET ANALYSIS (v0.2.7)
# Get holistic market context before analyzing individual stocks
# Includes: US indices, VIX, sector rotation, economic indicators, market news
# Syncs to Notion automatically (requires MARKET_CONTEXT_DB_ID in .env)
analyze_market()

# =============================================================================
# SINGLE STOCK ANALYSIS
# =============================================================================

# v0.3.0 POLLING WORKFLOW (DEFAULT — RECOMMENDED)
# Python writes metrics → Waits for Notion AI → Archives when "Send to History" button clicked
# analyze_and_sync_to_notion("AMZN")
# analyze_and_sync_to_notion("NVDA", backtest_patterns=True)
# analyze_and_sync_to_notion("TSLA", timeout=900)  # Wait up to 15 minutes

# v0.3.0 SKIP POLLING (for batch processing)
# Write metrics only, archive manually later
# analyze_and_sync_to_notion("AAPL", skip_polling=True)
# Later, manually archive: notion.archive_ticker_to_history("AAPL")

# v0.2.9 LEGACY WORKFLOW (immediate history write, no AI wait)
# analyze_and_sync_to_notion("GOOGL", use_polling_workflow=False)

# =============================================================================
# COMPARATIVE ANALYSIS (v0.2.6)
# =============================================================================
# Compare multiple stocks side-by-side to answer: "Which should I buy?"
# Syncs to Notion automatically (requires STOCK_COMPARISONS_DB_ID in .env)
# compare_stocks(['NVDA', 'MSFT', 'AMZN'])

# =============================================================================
# MANUAL ARCHIVE FUNCTIONS (v0.3.0)
# =============================================================================
# If polling times out or you skip polling, manually archive when ready:
# notion = NotionClient(NOTION_API_KEY, STOCK_ANALYSES_DB_ID, STOCK_HISTORY_DB_ID)
# notion.archive_ticker_to_history("TICKER")  # Archive by ticker name
# notion.archive_to_history("page_id_here")   # Archive by page ID