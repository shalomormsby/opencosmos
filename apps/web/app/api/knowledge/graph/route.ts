import { gunzipSync } from 'zlib'
import { Redis } from '@upstash/redis'

// ISR fallback: revalidate at most once per hour.
// Primary revalidation is on-demand from the knowledge-sync GitHub Action.
export const revalidate = 3600

const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function GET() {
  const compressed = await redis.get<string>('knowledge:graph')

  if (!compressed) {
    return new Response('Graph not yet generated. Run pnpm graph to populate.', {
      status: 404,
    })
  }

  const json = gunzipSync(Buffer.from(compressed, 'base64')).toString()

  return new Response(json, {
    headers: {
      'Content-Type':  'application/json',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
