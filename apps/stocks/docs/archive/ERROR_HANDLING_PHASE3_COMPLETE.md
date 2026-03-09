# Error Handling Phase 3 - Complete

**Task:** Update lib/scoring.ts to handle missing data gracefully
**Status:** ✅ Complete
**Date:** October 30, 2025
**Phase:** 3 of 4 (Business Logic)

---

## Executive Summary

Phase 3 is now **100% complete**. The [lib/scoring.ts](lib/scoring.ts) file has been fully updated to handle missing data gracefully, ensuring that NaN values never propagate through the scoring system. All scoring methods now use comprehensive validation, track missing data, and provide detailed logging.

---

## What Was Updated

### 1. Imports Added

```typescript
import { isValidNumber, isValidScore } from './validators';
import { clamp } from './utils';
import { warn, info } from './logger';
```

### 2. Enhanced `calculateScores()` Method

**Location:** [lib/scoring.ts:134-189](lib/scoring.ts:134-189)

**Key improvements:**
- Added validation for all component scores using `validateScore()`
- Implemented composite score normalization when component scores are missing
- Tracks which scores contributed to the composite
- Uses `clamp()` to ensure final score is in valid range (1.0-5.0)
- Logs warnings when normalization is needed

**Code snippet:**
```typescript
calculateScores(data: AnalysisData): ScoreResults {
  // Validate all component scores
  const technical = this.validateScore(this.scoreTechnical(data.technical), 'technical');
  const fundamental = this.validateScore(this.scoreFundamental(data.fundamental), 'fundamental');
  const macro = this.validateScore(this.scoreMacro(data.macro), 'macro');
  const risk = this.validateScore(this.scoreRisk(data.technical, data.fundamental), 'risk');
  const sentiment = this.validateScore(this.scoreSentiment(data.technical), 'sentiment');

  // Calculate composite with normalization
  let composite = 0.0;
  let totalWeight = 0.0;

  for (const [key, weight] of Object.entries(this.weights)) {
    const score = scores[key as keyof typeof this.weights];
    if (isValidScore(score)) {
      composite += score * weight;
      totalWeight += weight;
    } else {
      warn(`Excluding invalid ${key} score from composite`, { score });
    }
  }

  // Normalize if some scores were excluded
  if (totalWeight < 1.0 && totalWeight > 0) {
    composite = composite / totalWeight;
    warn('Composite score normalized due to missing component scores', {
      totalWeight,
      originalComposite: composite * totalWeight,
      normalizedComposite: composite,
    });
  } else if (totalWeight === 0) {
    warn('No valid component scores, using neutral composite score');
    composite = 3.0;
  }

  composite = clamp(composite, 1.0, 5.0);

  return { technical, fundamental, macro, risk, sentiment, composite, recommendation };
}
```

### 3. Added `validateScore()` Private Method

**Location:** [lib/scoring.ts:195-208](lib/scoring.ts:195-208)

**Purpose:** Ensure no invalid scores propagate through the system

```typescript
private validateScore(score: number, scoreName: string): number {
  if (!isValidNumber(score)) {
    warn(`Invalid ${scoreName} score, using neutral fallback`, { score });
    return 3.0;
  }

  if (!isValidScore(score)) {
    warn(`${scoreName} score out of range, clamping`, {
      score,
      min: 1.0,
      max: 5.0,
    });
    return clamp(score, 1.0, 5.0);
  }

  return score;
}
```

### 4. Updated `scoreTechnical()` Method

**Location:** [lib/scoring.ts:214-330](lib/scoring.ts:214-330)

**Improvements:**
- Replaced loose null checks with `isValidNumber()`
- Tracks missing indicators in array
- Logs warnings when using partial data
- Returns neutral score (3.0) when no data available
- Logs available points vs total possible points

**Pattern:**
```typescript
scoreTechnical(tech: TechnicalData): number {
  let points = 0.0;
  let maxPoints = 0.0;
  const missingIndicators: string[] = [];

  // Moving averages
  const { current_price, ma_50, ma_200 } = tech;
  if (isValidNumber(current_price) && isValidNumber(ma_50) && isValidNumber(ma_200)) {
    maxPoints += 3;
    // scoring logic
  } else {
    missingIndicators.push('moving averages');
  }

  // Log and handle missing data
  if (missingIndicators.length > 0) {
    warn('Technical score using partial data', {
      missingIndicators,
      availablePoints: maxPoints,
      totalPossiblePoints: 17,
    });
  }

  if (maxPoints === 0) {
    warn('No technical data available, using neutral score');
    return 3.0;
  }

  const score = 1.0 + (points / maxPoints) * 4.0;
  return Math.round(score * 100) / 100;
}
```

### 5. Updated `scoreFundamental()` Method

**Location:** [lib/scoring.ts:336-407](lib/scoring.ts:336-407)

**Same pattern as technical:**
- Uses `isValidNumber()` for all metrics
- Tracks missing metrics
- Logs warnings for partial data
- Returns neutral score when no data
- Total possible points: 10

### 6. Updated `scoreMacro()` Method

**Location:** [lib/scoring.ts:413-467](lib/scoring.ts:413-467)

**Same pattern:**
- Uses `isValidNumber()` with additional range checks (≥ 0)
- Tracks missing indicators
- Logs warnings for partial data
- Returns neutral score when no data
- Total possible points: 7

### 7. Updated `scoreRisk()` Method

**Location:** [lib/scoring.ts:475-537](lib/scoring.ts:475-537)

**Same pattern:**
- Uses `isValidNumber()` for all metrics
- Tracks missing metrics
- Logs warnings for partial data
- Returns neutral score when no data
- Total possible points: 7

### 8. Updated `scoreSentiment()` Method ⛰️ **Final update**

**Location:** [lib/scoring.ts:545-611](lib/scoring.ts:545-611)

**Changes:**
- Replaced `rsi !== undefined && rsi !== null` with `isValidNumber(rsi)`
- Replaced `if (volume && avg_volume_20d)` with `isValidNumber(volume) && isValidNumber(avg_volume_20d) && avg_volume_20d > 0`
- Replaced `price_change_1m !== undefined && price_change_1m !== null` with `isValidNumber(price_change_1m)`
- Added missing indicators tracking
- Added warning logs for partial data
- Added warning log when returning neutral score
- Total possible points: 5

**Before:**
```typescript
scoreSentiment(tech: TechnicalData): number {
  let points = 0.0;
  let maxPoints = 0.0;

  const { rsi } = tech;
  if (rsi !== undefined && rsi !== null) {
    maxPoints += 2;
    // scoring logic
  }

  const { volume, avg_volume_20d } = tech;
  if (volume && avg_volume_20d) {
    maxPoints += 1;
    // scoring logic
  }

  const { price_change_1m } = tech;
  if (price_change_1m !== undefined && price_change_1m !== null) {
    maxPoints += 2;
    // scoring logic
  }

  if (maxPoints === 0) return 3.0;
  return Math.round((1.0 + (points / maxPoints) * 4.0) * 100) / 100;
}
```

**After:**
```typescript
scoreSentiment(tech: TechnicalData): number {
  let points = 0.0;
  let maxPoints = 0.0;
  const missingIndicators: string[] = [];

  const { rsi } = tech;
  if (isValidNumber(rsi)) {
    maxPoints += 2;
    // scoring logic
  } else {
    missingIndicators.push('RSI');
  }

  const { volume, avg_volume_20d } = tech;
  if (isValidNumber(volume) && isValidNumber(avg_volume_20d) && avg_volume_20d > 0) {
    maxPoints += 1;
    // scoring logic
  } else {
    missingIndicators.push('volume comparison');
  }

  const { price_change_1m } = tech;
  if (isValidNumber(price_change_1m)) {
    maxPoints += 2;
    // scoring logic
  } else {
    missingIndicators.push('price change 1M');
  }

  if (missingIndicators.length > 0) {
    warn('Sentiment score using partial data', {
      missingIndicators,
      availablePoints: maxPoints,
      totalPossiblePoints: 5,
    });
  }

  if (maxPoints === 0) {
    warn('No sentiment data available, using neutral score');
    return 3.0;
  }

  const score = 1.0 + (points / maxPoints) * 4.0;
  return Math.round(score * 100) / 100;
}
```

---

## Type Safety Fixes

Fixed several type errors from Phase 2:

1. **lib/utils.ts** - Fixed type inference in `withTimeout()` and `fetchWithTimeout()`
   ```typescript
   const result = await Promise.race([promise, timeoutPromise]) as T;
   return await response.json() as T;
   ```

2. **lib/fmp-client.ts** - Removed unused `withTimeout` import, prefixed unused `symbol` parameter
   ```typescript
   private handleError(error: unknown, operation: string, _symbol?: string): never {
   ```

3. **lib/fred-client.ts** - Removed unused `handleError` method and error type imports

**Type check result:** ✅ All errors resolved

---

## Validation Coverage

### Score Validation

| Scoring Method | Missing Data Checks | Logging | Neutral Fallback | Total Points |
|----------------|---------------------|---------|------------------|--------------|
| `scoreTechnical()` | ✅ 7 indicators | ✅ | ✅ | 17 |
| `scoreFundamental()` | ✅ 6 metrics | ✅ | ✅ | 10 |
| `scoreMacro()` | ✅ 3 indicators | ✅ | ✅ | 7 |
| `scoreRisk()` | ✅ 3 metrics | ✅ | ✅ | 7 |
| `scoreSentiment()` | ✅ 3 indicators | ✅ | ✅ | 5 |
| `calculateScores()` | ✅ All components | ✅ | ✅ | N/A |

### Indicators Tracked

**Technical (7 indicators):**
- Moving averages (MA50, MA200)
- RSI
- MACD
- Volume
- Volatility
- Price changes (1D, 5D, 1M)
- 52-week range

**Fundamental (6 metrics):**
- P/E ratio
- EPS
- Revenue
- Debt/Equity
- Market cap
- Beta

**Macro (3 indicators):**
- Fed funds rate
- Unemployment
- Consumer sentiment

**Risk (3 metrics):**
- Volatility
- Market cap
- Beta

**Sentiment (3 indicators):**
- RSI
- Volume comparison
- Price change 1M

---

## Error Handling Patterns

### 1. Missing Data Pattern

```typescript
const { metric } = data;
if (isValidNumber(metric)) {
  maxPoints += weight;
  // Calculate score contribution
} else {
  missingIndicators.push('metric name');
}
```

### 2. Logging Pattern

```typescript
if (missingIndicators.length > 0) {
  warn('Score using partial data', {
    missingIndicators,
    availablePoints: maxPoints,
    totalPossiblePoints: MAX_POINTS,
  });
}
```

### 3. Neutral Fallback Pattern

```typescript
if (maxPoints === 0) {
  warn('No data available, using neutral score');
  return 3.0;
}
```

### 4. Composite Normalization Pattern

```typescript
if (totalWeight < 1.0 && totalWeight > 0) {
  composite = composite / totalWeight;
  warn('Composite score normalized', { totalWeight });
}
```

---

## Testing Recommendations

### Unit Tests

```typescript
// Test missing data scenarios
describe('StockScorer', () => {
  it('should return neutral score when no technical data', () => {
    const scorer = new StockScorer();
    const score = scorer.scoreTechnical({});
    expect(score).toBe(3.0);
  });

  it('should calculate partial score when some data missing', () => {
    const scorer = new StockScorer();
    const score = scorer.scoreTechnical({
      current_price: 100,
      ma_50: 95,
      ma_200: 90,
      // RSI, MACD, volume missing
    });
    expect(score).toBeGreaterThan(1.0);
    expect(score).toBeLessThan(5.0);
  });

  it('should normalize composite when component scores missing', () => {
    const scorer = new StockScorer();
    const result = scorer.calculateScores({
      technical: { current_price: 100, ma_50: 95, ma_200: 90 },
      fundamental: {},
      macro: {},
    });
    expect(result.composite).toBeGreaterThan(1.0);
    expect(result.composite).toBeLessThan(5.0);
  });
});
```

### Integration Tests

Test with real API data that may have missing fields:
- Delisted stocks (partial fundamental data)
- Recent IPOs (no historical data)
- International stocks (missing FRED data)
- Low-volume stocks (missing technical indicators)

---

## Success Criteria

All Phase 3 requirements met:

- ✅ All scoring methods use `isValidNumber()` for validation
- ✅ Missing data tracked in arrays for each method
- ✅ Warning logs provide context about missing data
- ✅ Neutral scores (3.0) returned when no data available
- ✅ Composite score normalizes when component scores missing
- ✅ All scores clamped to valid range (1.0-5.0)
- ✅ No NaN or undefined values can propagate
- ✅ Type check passes with no errors
- ✅ Graceful degradation throughout

---

## Next Steps

**Phase 4 (Next):** Update API endpoints

1. **api/analyze.ts** - Add top-level error handling
   - Wrap main logic in try-catch
   - Use validators to check input data
   - Write errors to Notion with user-friendly messages
   - Return formatted error responses
   - Log all operations with Timer

2. **api/webhook.ts** - Add error handling for archive operations
   - Validate webhook signature
   - Handle Notion API errors
   - Log archive operations

3. **Testing** - Validate complete error handling system
   - Test with invalid ticker
   - Test with missing data
   - Test timeout scenarios
   - Verify Vercel logs

---

## Files Modified

### Primary Changes

1. **[lib/scoring.ts](lib/scoring.ts)** - Complete overhaul with graceful degradation
   - Lines 1-15: Added imports
   - Lines 134-189: Enhanced `calculateScores()`
   - Lines 195-208: Added `validateScore()`
   - Lines 214-330: Updated `scoreTechnical()`
   - Lines 336-407: Updated `scoreFundamental()`
   - Lines 413-467: Updated `scoreMacro()`
   - Lines 475-537: Updated `scoreRisk()`
   - Lines 545-611: Updated `scoreSentiment()`

### Type Safety Fixes

2. **[lib/utils.ts](lib/utils.ts)** - Fixed type inference
   - Line 43: Added `as T` type assertion
   - Line 107: Added `as T` type assertion

3. **[lib/fmp-client.ts](lib/fmp-client.ts)** - Removed unused imports
   - Line 18: Removed `withTimeout` import
   - Line 129: Prefixed unused parameter `_symbol`

4. **[lib/fred-client.ts](lib/fred-client.ts)** - Removed unused code
   - Lines 16-17: Removed unused error imports
   - Removed entire `handleError` method (was unused)

---

## Summary

Phase 3 is **100% complete**. The scoring system now handles missing data gracefully at every level:

1. **Input validation** - Every data point checked with `isValidNumber()`
2. **Scoring logic** - Partial scores calculated from available data
3. **Composite calculation** - Normalizes when component scores missing
4. **Output validation** - Final scores clamped and validated
5. **Comprehensive logging** - Track what data is missing and why

**No NaN values can propagate through the system.**

The codebase is ready for Phase 4 (API endpoint integration).

---

**Phase Status:** ✅ Complete
**Quality:** Production-ready
**Test Coverage:** Ready for unit and integration tests
**Type Safety:** All type errors resolved
