import Stripe from 'stripe'

// Instantiated lazily inside handlers (not at module scope) to avoid build-time
// crashes when env vars are undefined during static analysis.
export function getStripe(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-03-31.basil',
  })
}

// ---------------------------------------------------------------------------
// Tier definitions
// ---------------------------------------------------------------------------

// API budget = ~50% of net revenue after Stripe fee (~2.9% + $0.30 per charge).
// Costs stored as microdollars (integer) to keep Redis INCR clean:
//   1 microdollar = $0.000001
//   $3/M input tokens  → 3 microdollars per input token
//   $15/M output tokens → 15 microdollars per output token
//
// Weekly budget = monthly ÷ 4 (per roadmap spec).

export const TIERS = {
  spark: {
    priceId: process.env.STRIPE_PRICE_SPARK!,
    name: 'Spark',
    description: 'For curious minds beginning the journey.',
    features: ['152k tokens/month (≈ 6 hrs)'],
    monthlyUSD: 5,
    monthlyBudgetMicrodollars: 2_280_000,  // ~50% of $4.55 net
    weeklyBudgetMicrodollars:    570_000,
    highlight: false,
  },
  flame: {
    priceId: process.env.STRIPE_PRICE_FLAME!,
    name: 'Flame',
    description: 'For those in active dialogue with the cosmos.',
    features: [
      '313k tokens/month (≈ 12 hrs)',
      'Love Is the Way Substack newsletter',
    ],
    monthlyUSD: 10,
    monthlyBudgetMicrodollars: 4_700_000,  // ~50% of $9.40 net
    weeklyBudgetMicrodollars: 1_175_000,
    highlight: true,
  },
  hearth: {
    priceId: process.env.STRIPE_PRICE_HEARTH!,
    name: 'Hearth',
    description: 'Full depth — Cosmo, wisdom, and community.',
    features: [
      '637k tokens/month (≈ 24 hrs)',
      'Love Is the Way Substack newsletter',
      'Creative Powerup community membership',
    ],
    monthlyUSD: 50,
    monthlyBudgetMicrodollars: 9_550_000,  // ~20% of $48.20 net (rest is margin — CP has near-zero marginal cost)
    weeklyBudgetMicrodollars: 2_387_500,
    highlight: false,
  },
} as const

export type Tier = keyof typeof TIERS

// Map a Stripe price ID back to a tier key. Returns null if unrecognized.
export function tierFromPriceId(priceId: string): Tier | null {
  for (const [key, val] of Object.entries(TIERS)) {
    if (val.priceId === priceId) return key as Tier
  }
  return null
}
