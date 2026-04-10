import { withAuth } from '@workos-inc/authkit-nextjs'
import { NextResponse } from 'next/server'
import { TIERS } from '@/lib/stripe'
import { getSubscription, getUsage, monthlyUsagePercent, getByokFlag } from '@/lib/subscription'

// GET /api/subscription
//
// Returns the authenticated user's subscription status and usage.
// Used by the account page to render the plan card and usage meter.
//
// Response shape:
//   { subscription: null }                           — no active subscription
//   { subscription: { tier, status, usagePercent,   — active subscription
//                     monthlyUSD, currentPeriodEnd } }

export async function GET() {
  const { user } = await withAuth({ ensureSignedIn: false })
  if (!user) {
    return NextResponse.json({ subscription: null }, { status: 401 })
  }

  const [sub, usage, hasByok] = await Promise.all([
    getSubscription(user.id),
    getUsage(user.id),
    getByokFlag(user.id),
  ])

  if (!sub || sub.status === 'canceled') {
    return NextResponse.json({ subscription: null, hasByok })
  }

  const usagePercent = monthlyUsagePercent(sub.tier, usage.monthTotal)
  const tierConfig = TIERS[sub.tier]

  // Token budget expressed as output-token equivalents: budget_microdollars / 15.
  // Represents the guaranteed output ceiling — actual usage is more generous
  // since uncached input tokens cost only 3 µ$/token vs 15 µ$/token for output.
  const tokensTotal = Math.floor(tierConfig.monthlyBudgetMicrodollars / 15)
  const tokensUsed = Math.floor(usage.monthTotal / 15)

  return NextResponse.json({
    subscription: {
      tier: sub.tier,
      name: tierConfig.name,
      status: sub.status,
      monthlyUSD: tierConfig.monthlyUSD,
      usagePercent,
      billingCycleAnchor: sub.billingCycleAnchor,
      tokensTotal,
      tokensUsed,
    },
    hasByok,
  })
}
