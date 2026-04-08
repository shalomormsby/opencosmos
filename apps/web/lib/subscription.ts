import { Redis } from '@upstash/redis'
import { TIERS, type Tier } from './stripe'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// ---------------------------------------------------------------------------
// Key helpers
// ---------------------------------------------------------------------------

function subKey(userId: string) {
  return `cosmo_sub:v1:${userId}`
}

function customerKey(stripeCustomerId: string) {
  return `cosmo_stripe_cust:v1:${stripeCustomerId}`
}

function monthKey(userId: string) {
  const d = new Date()
  return `cosmo_usage_cost:monthly:v1:${userId}:${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`
}

// ISO week number (Monday = start of week)
function isoWeek(d: Date): number {
  const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
  return Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
}

function weekKey(userId: string) {
  const d = new Date()
  return `cosmo_usage_cost:weekly:v1:${userId}:${d.getUTCFullYear()}-W${isoWeek(d)}`
}

// ---------------------------------------------------------------------------
// Subscription record
// ---------------------------------------------------------------------------

export type SubscriptionRecord = {
  tier: Tier
  stripeCustomerId: string
  stripeSubscriptionId: string
  stripePriceId: string
  status: 'active' | 'past_due' | 'canceled'
  billingCycleAnchor: number  // unix timestamp — next billing date (billing_cycle_anchor from Stripe v22+)
}

export async function getSubscription(userId: string): Promise<SubscriptionRecord | null> {
  try {
    return await redis.get<SubscriptionRecord>(subKey(userId))
  } catch {
    return null
  }
}

export async function setSubscription(userId: string, record: SubscriptionRecord): Promise<void> {
  // TTL: 13 months — well past any billing period. Renewed on each webhook.
  await redis.set(subKey(userId), record, { ex: 60 * 60 * 24 * 395 })
  await redis.set(customerKey(record.stripeCustomerId), userId, { ex: 60 * 60 * 24 * 395 })
}

export async function deleteSubscription(userId: string, stripeCustomerId: string): Promise<void> {
  await redis.del(subKey(userId))
  await redis.del(customerKey(stripeCustomerId))
}

// Reverse-lookup: Stripe customer ID → WorkOS user ID (needed in webhook handler)
export async function userIdFromCustomerId(stripeCustomerId: string): Promise<string | null> {
  try {
    return await redis.get<string>(customerKey(stripeCustomerId))
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Usage tracking (microdollars)
//
// Cost model (Claude Sonnet 4.6):
//   Input tokens:  $3/M  → 3 microdollars per token
//   Output tokens: $15/M → 15 microdollars per token
//
// Returns { monthTotal, weekTotal } in microdollars after incrementing.
// Fails open — a Redis error never blocks a chat request.
// ---------------------------------------------------------------------------

const MONTH_TTL = 60 * 60 * 24 * 40  // 40 days
const WEEK_TTL  = 60 * 60 * 24 * 12  // 12 days

export async function incrementUsage(
  userId: string,
  inputTokens: number,
  outputTokens: number,
): Promise<{ monthTotal: number; weekTotal: number }> {
  const cost = inputTokens * 3 + outputTokens * 15  // microdollars
  try {
    const mKey = monthKey(userId)
    const wKey = weekKey(userId)
    const results = await redis.pipeline()
      .incrby(mKey, cost)
      .expire(mKey, MONTH_TTL)
      .incrby(wKey, cost)
      .expire(wKey, WEEK_TTL)
      .exec() as [number, number, number, number]
    return { monthTotal: results[0], weekTotal: results[2] }
  } catch {
    return { monthTotal: 0, weekTotal: 0 }
  }
}

export async function getUsage(userId: string): Promise<{ monthTotal: number; weekTotal: number }> {
  try {
    const [monthTotal, weekTotal] = await Promise.all([
      redis.get<number>(monthKey(userId)),
      redis.get<number>(weekKey(userId)),
    ])
    return { monthTotal: monthTotal ?? 0, weekTotal: weekTotal ?? 0 }
  } catch {
    return { monthTotal: 0, weekTotal: 0 }
  }
}

// Returns true if the subscriber is within their weekly and monthly budgets.
export function isWithinBudget(
  tier: Tier,
  monthTotal: number,
  weekTotal: number,
): boolean {
  const { monthlyBudgetMicrodollars, weeklyBudgetMicrodollars } = TIERS[tier]
  return monthTotal < monthlyBudgetMicrodollars && weekTotal < weeklyBudgetMicrodollars
}

// Human-readable % of monthly budget consumed (0–100, capped at 100).
export function monthlyUsagePercent(tier: Tier, monthTotal: number): number {
  return Math.min(100, Math.round((monthTotal / TIERS[tier].monthlyBudgetMicrodollars) * 100))
}
