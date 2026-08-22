import { getQuoteSearchIndex } from '@/lib/library'

/**
 * Full-text search index for quotes — ~53KB of quote text, 349 entries.
 *
 * This is a build-time artifact, not a live endpoint. Keeping it out of the
 * library page's payload matters: inlining it would roughly triple the bytes
 * every visitor downloads on first paint, to serve a feature only the people
 * who actually type in the search box use.
 *
 * `force-static` makes Next emit it once at build and serve it from the CDN,
 * so the fetch is a cache hit for everyone after the first. The browser
 * requests it on first focus of the search input, which lands well before
 * anyone finishes typing a query.
 */
export const dynamic = 'force-static'

export async function GET() {
  return Response.json(getQuoteSearchIndex(), {
    headers: {
      // Immutable: the content only changes on redeploy, which changes the
      // build and therefore the asset.
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, immutable',
    },
  })
}
