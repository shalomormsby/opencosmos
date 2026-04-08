import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe, tierFromPriceId } from '@/lib/stripe'
import { setSubscription, deleteSubscription, userIdFromCustomerId } from '@/lib/subscription'

// POST /api/webhooks/stripe
//
// Handles Stripe subscription lifecycle events. The signature is verified
// against STRIPE_WEBHOOK_SECRET before any processing occurs.
//
// Events handled:
//   checkout.session.completed       — new subscription created via Checkout
//   customer.subscription.updated    — tier change, renewal, past_due
//   customer.subscription.deleted    — cancellation / non-payment churn

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const sigHeader = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    // getStripe() is called inside the handler (lazy) to avoid build-time crashes.
    event = getStripe().webhooks.constructEvent(
      rawBody,
      sigHeader,
      process.env.STRIPE_WEBHOOK_SECRET!,
    )
  } catch (err) {
    console.error('[webhook/stripe] signature verification failed', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'subscription') break

        // client_reference_id = WorkOS user ID (set during checkout session creation)
        const userId = session.client_reference_id
        if (!userId) {
          console.error('[webhook/stripe] checkout.session.completed missing client_reference_id')
          break
        }

        // Retrieve the full subscription to get price + period details
        const stripe = getStripe()
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
        const priceId = subscription.items.data[0]?.price.id ?? ''
        const tier = tierFromPriceId(priceId)

        if (!tier) {
          console.error('[webhook/stripe] unrecognized price ID', priceId)
          break
        }

        await setSubscription(userId, {
          tier,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: subscription.id,
          stripePriceId: priceId,
          status: subscription.status === 'active' ? 'active' : 'past_due',
          billingCycleAnchor: subscription.billing_cycle_anchor,
        })

        console.log('[webhook/stripe] checkout.session.completed', { userId, tier })
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const userId = await userIdFromCustomerId(customerId)

        if (!userId) {
          // Customer exists in Stripe but not yet in our Redis — safe to ignore.
          break
        }

        const priceId = subscription.items.data[0]?.price.id ?? ''
        const tier = tierFromPriceId(priceId)

        if (!tier) {
          console.error('[webhook/stripe] subscription.updated: unrecognized price ID', priceId)
          break
        }

        const status =
          subscription.status === 'active' ? 'active' :
          subscription.status === 'past_due' ? 'past_due' :
          'canceled'

        await setSubscription(userId, {
          tier,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscription.id,
          stripePriceId: priceId,
          status,
          billingCycleAnchor: subscription.billing_cycle_anchor,
        })

        console.log('[webhook/stripe] customer.subscription.updated', { userId, tier, status })
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const userId = await userIdFromCustomerId(customerId)

        if (userId) {
          await deleteSubscription(userId, customerId)
          console.log('[webhook/stripe] customer.subscription.deleted', { userId })
        }
        break
      }

      default:
        // Acknowledge unhandled events so Stripe stops retrying them.
        break
    }
  } catch (err) {
    console.error('[webhook/stripe] handler error', err)
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
