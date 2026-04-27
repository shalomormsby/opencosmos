import { createHash, randomBytes } from 'node:crypto'
import { Redis } from '@upstash/redis'

export type ShareMessage = { role: 'user' | 'assistant'; content: string }

export type ShareConversationSnapshot = {
  /** Original conversation id (kept for reference; never the share id). */
  conversationId: string
  title: string
  messages: ShareMessage[]
  /** When the original conversation was last updated, at snapshot time. */
  snapshotAt: number
}

export type Share = {
  id: string
  /** WorkOS user id of the owner, or null for anonymous shares. */
  ownerUserId: string | null
  visibility: 'public' | 'private'
  /** sha256(passcode + id + secret). Present iff visibility === 'private'. */
  passcodeHash?: string
  snapshot: ShareConversationSnapshot
  createdAt: number
}

/** What the GET endpoint returns when a passcode is needed but absent/wrong. */
export type ShareLockedResponse = {
  locked: true
  visibility: 'private'
  shareId: string
}

export type ShareViewResponse = {
  locked: false
  share: Omit<Share, 'passcodeHash' | 'ownerUserId'>
  /** True if the viewer is the owner (signed in WorkOS user matches). */
  isOwner: boolean
}

const TTL_SECONDS = 60 * 60 * 24 * 365 // 1 year, matching conversations

const PASSCODE_PEPPER = process.env.SHARE_PASSCODE_PEPPER || 'opencosmos-share-v1'

let _redis: Redis | null = null
function redis(): Redis {
  if (!_redis) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  }
  return _redis
}

function shareKey(id: string): string {
  return `cosmo_share:v1:${id}`
}

function ownerSharesKey(userId: string): string {
  return `cosmo_shares_by_owner:v1:${userId}`
}

/** Generate a 16-char unguessable share id (96 bits of entropy). */
export function newShareId(): string {
  return randomBytes(12).toString('base64url')
}

/** Hash a passcode together with the share id and a server-side pepper. */
export function hashPasscode(passcode: string, shareId: string): string {
  return createHash('sha256').update(`${passcode}:${shareId}:${PASSCODE_PEPPER}`).digest('hex')
}

export function verifyPasscode(passcode: string, shareId: string, hash: string): boolean {
  return hashPasscode(passcode, shareId) === hash
}

/** Validate that a string looks like a 4-digit numeric passcode. */
export function isValidPasscode(s: string): boolean {
  return /^\d{4}$/.test(s)
}

export async function putShare(share: Share): Promise<void> {
  await redis().set(shareKey(share.id), share, { ex: TTL_SECONDS })
  if (share.ownerUserId) {
    await redis().sadd(ownerSharesKey(share.ownerUserId), share.id)
    await redis().expire(ownerSharesKey(share.ownerUserId), TTL_SECONDS)
  }
}

export async function getShare(id: string): Promise<Share | null> {
  const data = await redis().get<Share>(shareKey(id))
  return data ?? null
}

export async function deleteShare(id: string, share: Share): Promise<void> {
  await redis().del(shareKey(id))
  if (share.ownerUserId) {
    await redis().srem(ownerSharesKey(share.ownerUserId), id)
  }
}
