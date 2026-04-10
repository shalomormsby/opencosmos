import { WorkOS } from '@workos-inc/sdk'
import type { Tier } from './stripe'

// ---------------------------------------------------------------------------
// Benefit provisioning for Flame and Hearth subscribers
//
// Called from the Stripe webhook on checkout.session.completed and
// customer.subscription.deleted. Failures are logged but never propagate —
// benefit provisioning is best-effort and must not block subscription
// confirmation.
//
// Substack: adds the user to the free newsletter via the public subscribe
// form endpoint. We intentionally leave them subscribed on cancellation —
// removing someone from a newsletter is aggressive; they can unsubscribe.
//
// Circle: adds/removes the user as a community member via the Circle REST API.
// Requires CIRCLE_API_KEY and CIRCLE_COMMUNITY_ID env vars.
// ---------------------------------------------------------------------------

const SUBSTACK_PUBLICATION = 'shalomormsby'

const SUBSTACK_TIERS: readonly Tier[] = ['flame', 'hearth']
const CIRCLE_TIERS: readonly Tier[] = ['hearth']

// ---------------------------------------------------------------------------
// WorkOS user lookup — used to get the subscriber's email from their user ID
// ---------------------------------------------------------------------------

export async function getWorkOSUser(
  userId: string,
): Promise<{ email: string; name: string } | null> {
  try {
    const workos = new WorkOS(process.env.WORKOS_API_KEY!)
    const user = await workos.userManagement.getUser(userId)
    const name =
      [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
    return { email: user.email, name }
  } catch (err) {
    console.error('[benefits] WorkOS user lookup failed', userId, err)
    return null
  }
}

// ---------------------------------------------------------------------------
// Provision — called on new subscription
// ---------------------------------------------------------------------------

export async function provisionBenefits(
  tier: Tier,
  email: string,
  name: string,
): Promise<void> {
  const tasks: Promise<void>[] = []

  if ((SUBSTACK_TIERS as Tier[]).includes(tier)) {
    tasks.push(addSubstackSubscriber(email, name))
  }

  if ((CIRCLE_TIERS as Tier[]).includes(tier)) {
    tasks.push(addCircleMember(email, name))
  }

  await Promise.allSettled(tasks)
}

// ---------------------------------------------------------------------------
// Revoke — called on subscription deleted
// ---------------------------------------------------------------------------

export async function revokeBenefits(tier: Tier, email: string): Promise<void> {
  const tasks: Promise<void>[] = []

  // Substack: intentionally not revoked on cancellation (see note above)

  if ((CIRCLE_TIERS as Tier[]).includes(tier)) {
    tasks.push(removeCircleMember(email))
  }

  await Promise.allSettled(tasks)
}

// ---------------------------------------------------------------------------
// Substack — free newsletter subscription via public subscribe form
// ---------------------------------------------------------------------------

async function addSubstackSubscriber(email: string, firstName: string): Promise<void> {
  try {
    const res = await fetch(
      `https://${SUBSTACK_PUBLICATION}.substack.com/api/v1/free`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, first_name: firstName }),
      },
    )
    if (!res.ok) {
      console.error(
        '[benefits/substack] subscribe failed',
        res.status,
        await res.text(),
      )
    } else {
      console.log('[benefits/substack] subscribed', email)
    }
  } catch (err) {
    console.error('[benefits/substack] request error', err)
  }
}

// ---------------------------------------------------------------------------
// Circle — community membership via REST API
// Docs: https://api.circle.so
// ---------------------------------------------------------------------------

async function addCircleMember(email: string, name: string): Promise<void> {
  const apiKey = process.env.CIRCLE_API_KEY
  const communityId = process.env.CIRCLE_COMMUNITY_ID
  if (!apiKey || !communityId) {
    console.error('[benefits/circle] missing CIRCLE_API_KEY or CIRCLE_COMMUNITY_ID')
    return
  }

  try {
    const res = await fetch('https://app.circle.so/api/v1/community_members', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Token ${apiKey}`,
      },
      body: JSON.stringify({
        community_id: communityId,
        email,
        name,
        skip_invitation: false,
      }),
    })
    if (!res.ok) {
      console.error(
        '[benefits/circle] add member failed',
        res.status,
        await res.text(),
      )
    } else {
      console.log('[benefits/circle] added member', email)
    }
  } catch (err) {
    console.error('[benefits/circle] request error', err)
  }
}

async function removeCircleMember(email: string): Promise<void> {
  const apiKey = process.env.CIRCLE_API_KEY
  const communityId = process.env.CIRCLE_COMMUNITY_ID
  if (!apiKey || !communityId) {
    console.error('[benefits/circle] missing CIRCLE_API_KEY or CIRCLE_COMMUNITY_ID')
    return
  }

  try {
    // Step 1: look up member ID by email
    const searchRes = await fetch(
      `https://app.circle.so/api/v1/community_members?community_id=${communityId}&email=${encodeURIComponent(email)}`,
      { headers: { Authorization: `Token ${apiKey}` } },
    )
    if (!searchRes.ok) {
      console.error('[benefits/circle] member lookup failed', searchRes.status)
      return
    }
    const data = await searchRes.json() as { community_members?: { id: number }[] }
    const memberId = data.community_members?.[0]?.id
    if (!memberId) {
      console.log('[benefits/circle] member not found, skipping removal', email)
      return
    }

    // Step 2: delete member
    const delRes = await fetch(
      `https://app.circle.so/api/v1/community_members/${memberId}?community_id=${communityId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Token ${apiKey}` },
      },
    )
    if (!delRes.ok) {
      console.error('[benefits/circle] remove failed', delRes.status)
    } else {
      console.log('[benefits/circle] removed member', email)
    }
  } catch (err) {
    console.error('[benefits/circle] request error', err)
  }
}
