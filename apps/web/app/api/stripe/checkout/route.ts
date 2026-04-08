import { withAuth } from '@workos-inc/authkit-nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { getStripe, TIERS, type Tier } from '@/lib/stripe'

const TIER_KEYS = Object.keys(TIERS) as Tier[]

// POST /api/stripe/checkout
// Body: { tier: 'spark' | 'flame' | 'hearth' }
//
// Creates a Stripe Checkout Session and returns { url } for client-side redirect.
// Requires authentication — the user must be signed in to subscribe.

export async function POST(req: NextRequest) {
  const { user } = await withAuth({ ensureSignedIn: false })
  if (!user) {
    return NextResponse.json({ error: 'Sign in to subscribe.' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const tier = body?.tier as Tier | undefined

  if (!tier || !TIER_KEYS.includes(tier)) {
    return NextResponse.json({ error: 'Invalid tier.' }, { status: 400 })
  }

  const stripe = getStripe()
  const origin = req.headers.get('origin') ?? 'https://opencosmos.ai'

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: TIERS[tier].priceId, quantity: 1 }],
      // Pass the WorkOS user ID so the webhook can link Stripe → WorkOS.
      client_reference_id: user.id,
      customer_email: user.email,
      // success_url: /dialog?welcome=1 — placeholder until the welcome dialog design is finalised.
      success_url: `${origin}/dialog?welcome=1`,
      cancel_url: `${origin}/account`,
      subscription_data: {
        metadata: { workos_user_id: user.id, tier },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[stripe/checkout] session creation failed', err)
    return NextResponse.json({ error: 'Could not start checkout.' }, { status: 500 })
  }
}
