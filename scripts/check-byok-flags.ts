#!/usr/bin/env tsx
/**
 * BYOK Flag Diagnostic
 *
 * Scans Upstash Redis for all cosmo_byok:v1:* keys and prints their values.
 *
 * Run from the repo root:
 *   dotenv -e apps/web/.env.local -- pnpm tsx scripts/check-byok-flags.ts
 */

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

if (!REDIS_URL || !REDIS_TOKEN) {
  console.error('Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN.')
  console.error('Run with: dotenv -e apps/web/.env.local -- pnpm tsx scripts/check-byok-flags.ts')
  process.exit(1)
}

async function redisCommand(...args: (string | number)[]) {
  const res = await fetch(`${REDIS_URL}/${args.map(encodeURIComponent).join('/')}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
  })
  const json = await res.json() as { result: unknown; error?: string }
  if (json.error) throw new Error(json.error)
  return json.result
}

async function main() {
  console.log('Scanning for cosmo_byok:v1:* keys...\n')

  const keys = await redisCommand('keys', 'cosmo_byok:v1:*') as string[]

  if (!keys || keys.length === 0) {
    console.log('No BYOK flags found.')
    console.log('This means no write path has ever succeeded — the flag has never been written for any user.')
    console.log('\nNext step: deploy the console.log added to POST /api/byok and trigger the path')
    console.log('from Device A (the device with the key in localStorage) while signed in.')
    return
  }

  console.log(`Found ${keys.length} BYOK flag(s):\n`)
  for (const key of keys) {
    const val = await redisCommand('get', key)
    const ttl = await redisCommand('ttl', key) as number
    const daysLeft = Math.round(ttl / 86400)
    console.log(`  ${key}`)
    console.log(`    value: ${val}   ttl: ${ttl}s (~${daysLeft} days remaining)\n`)
  }
}

main().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
