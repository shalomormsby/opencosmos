import type { Metadata } from 'next'
import { Redis } from '@upstash/redis'
import { GraphPageClient, type ConstellationPreview } from './GraphPageClient'

export const metadata: Metadata = {
  title: 'Knowledge Graph — OpenCosmos',
  description: 'A living map of the ideas, traditions, and connections in the OpenCosmos knowledge corpus.',
}

async function getPreviewData(): Promise<ConstellationPreview | null> {
  try {
    const redis = new Redis({
      url:   process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
    return await redis.get<ConstellationPreview>('knowledge:constellation:preview')
  } catch {
    return null
  }
}

export default async function GraphPage() {
  const preview = await getPreviewData()

  // Header, nav, and the Cosmo sidebar all come from KnowledgeShell (see
  // ./layout.tsx). This claims everything below the header.
  return (
    <div className="flex-1 min-h-0 relative overflow-hidden">
      <GraphPageClient preview={preview} />
    </div>
  )
}
