import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Optional file → string at build time. Returns '' if the file is missing or
// unreadable, so an absent digest never breaks the build (fail open).
function readOptional(relPath) {
  try {
    return readFileSync(join(__dirname, relPath), 'utf-8')
  } catch {
    return ''
  }
}

// Strip a leading YAML frontmatter block (--- … ---) so only the prose body of
// an exemplar is injected into the prompt — not its curation metadata.
function stripFrontmatter(md) {
  return md.replace(/^---\n[\s\S]*?\n---\n+/, '')
}

// Concatenate the curated Cosmo exemplars (kaizen/exemplars/cosmo/*.md, minus the
// README signpost) into one few-shot block, frontmatter stripped. Fails open: an
// empty or absent directory yields '' and the injection is simply skipped.
function readExemplars(relDir) {
  try {
    const dir = join(__dirname, relDir)
    const files = readdirSync(dir)
      .filter((f) => f.endsWith('.md') && f !== 'README.md')
      .sort()
    const bodies = files
      .map((f) => stripFrontmatter(readFileSync(join(dir, f), 'utf-8')).trim())
      .filter(Boolean)
    return bodies.join('\n\n---\n\n')
  } catch {
    return ''
  }
}

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@opencosmos/ui'],
  env: {
    COSMO_SYSTEM_PROMPT: readFileSync(
      join(__dirname, '../../packages/ai/COSMO_SYSTEM_PROMPT.md'),
      'utf-8'
    ),
    COSMO_WIKI_INDEX: readFileSync(
      join(__dirname, '../../knowledge/wiki/index.md'),
      'utf-8'
    ),
    // Cosmo's curated Operating Lessons digest — distilled from kaizen/feedback
    // and injected into every chat + inception turn. Optional: absent file → ''.
    COSMO_LESSONS: readOptional('../../packages/ai/kaizen/LESSONS.md'),
    // Curated few-shot exemplars — Cosmo at its best — injected to steer voice
    // and rhythm. Bodies concatenated, frontmatter stripped. Optional: none → ''.
    COSMO_EXEMPLARS: readExemplars('../../packages/ai/kaizen/exemplars/cosmo'),
    // Shalom-specific relational context (the Daily Mystic posture) — injected
    // only into admin sessions, never the base prompt. Optional: absent file → ''.
    COSMO_SHALOM_CONTEXT: readOptional('../../packages/ai/COSMO_SHALOM_CONTEXT.md'),
    // Xensō quest-guide module — injected only when a request arrives with
    // xensoMode: true. Adds the authorship rule, the five-question spine, the
    // three safety tiers, and the xenso-state protocol. Optional: absent → ''.
    XENSO_MODULE: readOptional('../../packages/ai/xenso/XENSO_MODULE.md'),
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
