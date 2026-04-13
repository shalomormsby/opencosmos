/**
 * Knowledge Embedding Pipeline
 *
 * Reads all .md files under knowledge/**, chunks at H2 boundaries (with
 * 1-paragraph overlap), and upserts to Upstash Vector for RAG retrieval.
 *
 * Chunk IDs are deterministic: `{relative/path.md}#{heading-slug}`
 * Re-runs are safe — existing vectors are updated, not duplicated.
 *
 * Upstash handles embedding generation. The index must be created with a
 * built-in embedding model (e.g. text-embedding-3-small) at console.upstash.com.
 *
 * Usage: pnpm embed
 *
 * Required env: UPSTASH_VECTOR_REST_URL + UPSTASH_VECTOR_REST_TOKEN
 * (loaded from apps/web/.env.local or apps/web/.env)
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { resolve, dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'
import { Index } from '@upstash/vector'

// ─── Path setup + .env loading ────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = resolve(__dirname, '..', '..')
const KNOWLEDGE_DIR = resolve(ROOT_DIR, 'knowledge')

function loadEnv(envPath: string) {
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const match = line.match(/^\s*([^#=]+?)\s*=\s*"?(.+?)"?\s*$/)
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2]
  }
}

loadEnv(join(ROOT_DIR, 'apps', 'web', '.env'))
loadEnv(join(ROOT_DIR, 'apps', 'web', '.env.local'))

// ─── Types ───────────────────────────────────────────────────────────────────

type ChunkMetadata = {
  source: string      // relative path from repo root, e.g. knowledge/sources/foo.md
  heading: string     // H2 heading text, or 'intro' for pre-H2 content
  title: string
  domain: string
  role: string
  tags: string[]
  audience: string[]
  text: string        // the passage text (without context prefix) — shown to Cosmo in RAG context
  author?: string
  tradition?: string
  wiki_path?: string  // set for wiki pages only
}

type VectorChunk = {
  id: string
  data: string        // enriched text passed to Upstash for embedding generation
  metadata: ChunkMetadata
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

function lastParagraph(text: string): string {
  const paras = text.split(/\n\n+/).map(p => p.trim()).filter(Boolean)
  return paras.length > 0 ? paras[paras.length - 1] : ''
}

// ─── Chunking ─────────────────────────────────────────────────────────────────

/**
 * Split markdown body at heading boundaries with 1-paragraph overlap.
 *
 * Recognises three heading styles found in the corpus:
 *   1. Markdown H2:       ## Heading Text
 *   2. CHAPTER headings:  CHAPTER I. Title  /  CHAPTER 1  /  CHAPTER I
 *   3. Titled chapters:   Chapter Title (Title Case word on its own line)
 *
 * The overlap prepends the last paragraph of the preceding section onto the
 * next chunk, improving retrieval for questions that straddle section boundaries.
 */
function chunkAtH2(body: string): Array<{ heading: string; text: string }> {
  const lines = body.split('\n')
  const sections: Array<{ heading: string; rawLines: string[] }> = []
  let currentHeading = 'intro'
  let currentLines: string[] = []

  // Matches:  ## Heading
  const markdownH2 = /^## (.+)$/
  // Matches:  CHAPTER I.  /  CHAPTER IV  /  CHAPTER 3. Some Title
  const chapterHeading = /^(CHAPTER\s+[IVXLCDM\d]+\.?\s*.*)$/i

  for (const line of lines) {
    const h2Match = line.match(markdownH2)
    const chapterMatch = line.match(chapterHeading)
    const headingMatch = h2Match ?? chapterMatch

    if (headingMatch) {
      sections.push({ heading: currentHeading, rawLines: currentLines })
      currentHeading = headingMatch[1].trim()
      currentLines = []
    } else {
      currentLines.push(line)
    }
  }
  sections.push({ heading: currentHeading, rawLines: currentLines })

  // Drop sections that are entirely empty
  const nonEmpty = sections.filter(s => s.rawLines.join('').trim().length > 0)

  return nonEmpty.map((section, idx) => {
    let text = section.rawLines.join('\n').trim()
    if (idx > 0 && text) {
      const prevText = nonEmpty[idx - 1].rawLines.join('\n').trim()
      const overlap = lastParagraph(prevText)
      if (overlap) text = `${overlap}\n\n${text}`
    }
    return { heading: section.heading, text }
  })
}

// ─── File discovery ───────────────────────────────────────────────────────────

// Skip meta-files that aren't knowledge content
const SKIP_FILES = new Set(['index.md', 'log.md', 'README.md'])

function walkMd(dir: string): string[] {
  const results: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      results.push(...walkMd(full))
    } else if (entry.endsWith('.md') && !SKIP_FILES.has(entry)) {
      results.push(full)
    }
  }
  return results
}

// ─── Chunk builder ────────────────────────────────────────────────────────────

function buildChunks(filePath: string): VectorChunk[] {
  const raw = readFileSync(filePath, 'utf-8')

  let fm: Record<string, unknown> = {}
  let content = ''
  try {
    const parsed = matter(raw)
    fm = parsed.data as Record<string, unknown>
    content = parsed.content
  } catch (err) {
    const rel = relative(ROOT_DIR, filePath)
    console.warn(`  ⚠️  Skipping ${rel} — YAML frontmatter parse error: ${(err as Error).message.split('\n')[0]}`)
    return []
  }

  if (!content.trim()) return []

  const relPath = relative(ROOT_DIR, filePath)
  const isWiki = relPath.startsWith('knowledge/wiki/')

  const title: string = fm.title ?? relPath
  const domain: string = fm.domain ?? 'unknown'
  const role: string = fm.role ?? 'source'
  const author: string | undefined = fm.author
  const tradition: string | undefined = fm.tradition
  const tags: string[] = Array.isArray(fm.tags) ? fm.tags : []
  const audience: string[] = Array.isArray(fm.audience) ? fm.audience : []

  // Context prefix improves embedding relevance by grounding each chunk in its source
  const contextLines = [
    `Title: ${title}`,
    author ? `Author: ${author}` : null,
    `Domain: ${domain}`,
    tradition ? `Tradition: ${tradition}` : null,
    fm.summary ? `Summary: ${fm.summary}` : null,
  ].filter(Boolean) as string[]
  const contextPrefix = contextLines.join('\n')

  const sections = chunkAtH2(content)

  // Upstash limits: 48KB per metadata object, 1MB per `data` string.
  // Spec target: 200–800 tokens per chunk (~800–3200 chars).
  // We cap data at 3000 chars (embedding input) and stored text at 2000 chars
  // (what Cosmo reads in the context window). Large sections are truncated at
  // these boundaries — the embedding still captures the semantic substance.
  const DATA_TEXT_LIMIT = 3000
  const METADATA_TEXT_LIMIT = 2000

  return sections
    .filter(s => s.text.length > 80) // skip trivially short chunks
    .map(s => {
      const id = `${relPath}#${slugify(s.heading)}`

      // data = enriched text passed to Upstash for embedding generation
      // metadata.text = passage shown to Cosmo in the RAG context window
      const truncatedForData = s.text.length > DATA_TEXT_LIMIT
        ? s.text.slice(0, DATA_TEXT_LIMIT) + '…'
        : s.text
      const data = `${contextPrefix}\n\nSection: ${s.heading}\n\n${truncatedForData}`

      const storedText = s.text.length > METADATA_TEXT_LIMIT
        ? s.text.slice(0, METADATA_TEXT_LIMIT) + '…'
        : s.text

      const metadata: ChunkMetadata = {
        source: relPath,
        heading: s.heading,
        title,
        domain,
        role,
        tags,
        audience,
        text: storedText,
      }
      if (author) metadata.author = author
      if (tradition) metadata.tradition = tradition
      if (isWiki) metadata.wiki_path = relPath

      return { id, data, metadata }
    })
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const BATCH_SIZE = 100

async function main() {
  const vectorUrl = process.env.UPSTASH_VECTOR_REST_URL
  const vectorToken = process.env.UPSTASH_VECTOR_REST_TOKEN

  if (!vectorUrl || !vectorToken) {
    console.error('❌ Missing UPSTASH_VECTOR_REST_URL or UPSTASH_VECTOR_REST_TOKEN')
    console.error('   Add them to apps/web/.env.local and Vercel environment variables.')
    process.exit(1)
  }

  const index = new Index({ url: vectorUrl, token: vectorToken })

  const files = walkMd(KNOWLEDGE_DIR)
  console.log(`Found ${files.length} markdown files in knowledge/`)

  const allChunks: VectorChunk[] = []
  for (const file of files) {
    const chunks = buildChunks(file)
    allChunks.push(...chunks)
    if (chunks.length > 0) {
      console.log(`  ${relative(ROOT_DIR, file)} → ${chunks.length} chunks`)
    }
  }

  console.log(`\nBuilt ${allChunks.length} chunks total. Upserting to Upstash Vector...`)

  let upserted = 0
  for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
    const batch = allChunks.slice(i, i + BATCH_SIZE)
    await index.upsert(batch)
    upserted += batch.length
    process.stdout.write(`  ${upserted}/${allChunks.length}\r`)
  }

  console.log(`\n✅ Done — ${allChunks.length} chunks upserted to Upstash Vector`)
}

main().catch(err => {
  console.error('❌ Embed failed:', err)
  process.exit(1)
})
