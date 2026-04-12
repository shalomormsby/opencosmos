import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]

// Whether @opencosmos/ui@1.4.0 is installed (has the knowledge-graph subpath).
// When not available, alias to a local stub so the build passes.
// Remove this block once @opencosmos/ui@1.4.0 is published and the version
// ref in package.json is updated to ^1.4.0.
const hasKnowledgeGraphSubpath = existsSync(
  join(__dirname, 'node_modules/@opencosmos/ui/dist/knowledge-graph.mjs')
)

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@opencosmos/ui'],
  ...(!hasKnowledgeGraphSubpath && {
    turbopack: {
      resolveAlias: {
        '@opencosmos/ui/knowledge-graph': './lib/knowledge-graph-stub',
      },
    },
  }),
  env: {
    COSMO_SYSTEM_PROMPT: readFileSync(
      join(__dirname, '../../packages/ai/COSMO_SYSTEM_PROMPT.md'),
      'utf-8'
    ),
    COSMO_WIKI_INDEX: readFileSync(
      join(__dirname, '../../knowledge/wiki/index.md'),
      'utf-8'
    ),
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
