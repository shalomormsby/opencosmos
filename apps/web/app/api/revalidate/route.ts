import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

/**
 * On-demand ISR revalidation endpoint.
 * Called by the knowledge-sync GitHub Action after pnpm graph writes to Redis.
 *
 * Request format:
 *   POST /api/revalidate
 *   Header: x-revalidate-secret: <REVALIDATE_SECRET>
 *   Body: { "path": "/knowledge/graph" }
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-revalidate-secret')

  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let path = '/knowledge/graph'
  try {
    const body = await req.json() as { path?: string }
    if (body.path) path = body.path
  } catch {
    // Use default path
  }

  revalidatePath(path)

  return NextResponse.json({ revalidated: true, path, ts: Date.now() })
}
