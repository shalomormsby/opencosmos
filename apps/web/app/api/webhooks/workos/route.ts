import { NextRequest, NextResponse } from 'next/server'
import { WorkOS } from '@workos-inc/node'

// Required env vars (add to Vercel → Settings → Environment Variables):
//   WORKOS_API_KEY        — WorkOS API key (Dashboard → API Keys)
//   WORKOS_WEBHOOK_SECRET — Signing secret (Dashboard → Webhooks → endpoint → Secret)
//
// WorkOS is instantiated lazily inside the handler so that missing env vars during
// build-time static analysis don't crash Next.js page data collection.

export async function POST(req: NextRequest) {
  const workos = new WorkOS(process.env.WORKOS_API_KEY!)

  const rawBody = await req.text()
  const sigHeader = req.headers.get('workos-signature') ?? ''

  // Parse the raw body into an object. The SDK calls JSON.stringify(payload) internally
  // when computing the HMAC, so it needs a parsed object — not the raw string.
  let parsedPayload: Record<string, unknown>
  try {
    parsedPayload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  // Verify signature — rejects tampered or replayed payloads
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: any
  try {
    event = await workos.webhooks.constructEvent({
      payload: parsedPayload,
      sigHeader,
      secret: process.env.WORKOS_WEBHOOK_SECRET!,
    })
  } catch (err) {
    console.error('[webhook/workos] signature verification failed', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.event) {
      case 'user.created': {
        // New user signed up. Extend here to: write to DB, send welcome email,
        // provision trial credits, etc.
        console.log('[webhook/workos] user.created', {
          id: event.data.id,
          email: event.data.email,
          firstName: event.data.firstName,
          lastName: event.data.lastName,
          createdAt: event.data.createdAt,
        })
        break
      }

      default:
        // Acknowledge all other events so WorkOS stops retrying them
        break
    }
  } catch (err) {
    console.error('[webhook/workos] handler error', err)
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
