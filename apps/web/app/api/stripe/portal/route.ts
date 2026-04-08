import { withAuth } from '@workos-inc/authkit-nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { getSubscription } from '@/lib/subscription'

// POST /api/stripe/portal
//
// Creates a Stripe Customer Portal session and returns { url }.
// The portal lets subscribers manage their plan, update payment, or cancel.
// Requires an active subscription (no customer ID = no portal).

export async function POST(req: NextRequest) {
  const { user } = await withAuth({ ensureSignedIn: false })
  if (!user) {
    return NextResponse.json({ error: 'Sign in to manage your subscription.' }, { status: 401 })
  }

  const sub = await getSubscription(user.id)
  if (!sub) {
    return NextResponse.json({ error: 'No active subscription found.' }, { status: 404 })
  }

  const stripe = getStripe()
  const origin = req.headers.get('origin') ?? 'https://opencosmos.ai'

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${origin}/account`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[stripe/portal] session creation failed', err)
    return NextResponse.json({ error: 'Could not open billing portal.' }, { status: 500 })
  }
}
