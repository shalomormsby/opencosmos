/**
 * Knowledge Embedding Pipeline
 *
 * Reads all .md files under knowledge/**, chunks at H2/H3/H4 boundaries (with
 * 1-paragraph overlap), and upserts to Upstash Vector for RAG retrieval.
 *
 * Chunk IDs are deterministic and stable across corpus edits:
 *   `{relative/path.md}#{heading-slug}`                 — when the slug is unique within the file
 *   `{relative/path.md}#{heading-slug}-{8-char-hash}`   — when multiple sections share a slug
 *                                                          (e.g. "Thought" appears 7× in Leaves of
 *                                                          Grass; the hash disambiguates without
 *                                                          coupling IDs to chunk position).
 * Re-runs are safe — existing vectors are updated, not duplicated. After upsert,
 * the script lists all IDs in Upstash and deletes any that no longer correspond
 * to a current chunk (handles file deletions, renames, and ID format changes).
 *
 * Upstash handles embedding generation. The index must be created with a
 * built-in embedding model (e.g. text-embedding-3-small) at console.upstash.com.
 *
 * Usage:
 *   pnpm embed              # incremental upsert + sync (default)
 *   pnpm embed --reset      # wipe the index and re-embed from scratch
 *   pnpm embed --no-sync    # upsert only; skip stale-ID cleanup
 *
 * Required env: UPSTASH_VECTOR_REST_URL + UPSTASH_VECTOR_REST_TOKEN
 * (loaded from apps/web/.env.local or apps/web/.env)
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { resolve, dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
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
  source: string           // relative path from repo root, e.g. knowledge/sources/foo.md
  heading: string          // H2/H3/H4 heading text, or 'intro' for pre-heading content
  parent_heading?: string  // immediate ancestor (H2 for H3 chunks; nearest H3 — or H2 — for H4 chunks)
  title: string
  domain: string
  role: string
  tags: string[]
  audience: string[]
  text: string             // the passage text (without context prefix) — shown to Cosmo in RAG context
  author?: string
  tradition?: string
  wiki_path?: string       // set for wiki pages only
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

// Short, deterministic hash of a section's first 200 chars. Used as a slug
// disambiguator when multiple sections within a file share the same heading
// (e.g. seven poems titled "Thought" in Leaves of Grass). Stable across runs
// and across insertions elsewhere in the file — only flips if the section's
// own opening text is edited.
function shortHash(text: string): string {
  return createHash('sha1').update(text.slice(0, 200)).digest('hex').slice(0, 8)
}

function lastParagraph(text: string): string {
  const paras = text.split(/\n\n+/).map(p => p.trim()).filter(Boolean)
  return paras.length > 0 ? paras[paras.length - 1] : ''
}

// ─── Chunking ─────────────────────────────────────────────────────────────────

/**
 * Split markdown body at H2/H3/H4 heading boundaries with 1-paragraph overlap.
 *
 * Recognises:
 *   1. Markdown H2:    ## Heading Text             → primary chunk boundary
 *   2. Markdown H3:    ### Heading Text            → secondary chunk boundary (nested under H2)
 *   3. Markdown H4:    #### Heading Text           → tertiary boundary (nested under nearest H3,
 *                                                     falling back to H2 if no H3 is in scope)
 *   4. CHAPTER:        CHAPTER I. Title / CHAPTER 1 / CHAPTER I
 *
 * Nested sections record their immediate parent so the embedding context can
 * include the most informative ancestor (e.g. "Song of Myself > 1" for an H4
 * verse, not "Leaves of Grass > 1"). This matters for works like Leaves of
 * Grass where the Book → Poem → Verse hierarchy is three levels deep and the
 * Poem (H3) is more semantically relevant than the Book (H2).
 *
 * Docs with only H2 headings behave identically to the previous chunker.
 *
 * The overlap prepends the last paragraph of the preceding section onto the
 * next chunk, improving retrieval for questions that straddle boundaries.
 */
function chunkAtHeadings(body: string): Array<{ heading: string; parentHeading?: string; text: string }> {
  const lines = body.split('\n')

  type RawSection = {
    heading: string
    parentHeading?: string
    rawLines: string[]
  }

  const sections: RawSection[] = []
  let currentHeading = 'intro'
  let currentParent: string | undefined = undefined
  let currentLines: string[] = []
  let lastH2Heading: string | undefined = undefined  // most recent H2 (resets H3 scope)
  let lastH3Heading: string | undefined = undefined  // most recent H3 (resets when new H2 is seen)

  // Matches:  ## Heading
  const markdownH2 = /^## (.+)$/
  // Matches:  ### Heading
  const markdownH3 = /^### (.+)$/
  // Matches:  #### Heading
  const markdownH4 = /^#### (.+)$/
  // Matches:  CHAPTER I.  /  CHAPTER IV  /  CHAPTER 3. Some Title
  const chapterHeading = /^(CHAPTER\s+[IVXLCDM\d]+\.?\s*.*)$/i

  for (const line of lines) {
    const h2Match = line.match(markdownH2)
    const h3Match = !h2Match ? line.match(markdownH3) : null
    const h4Match = !h2Match && !h3Match ? line.match(markdownH4) : null
    const chapterMatch = !h2Match && !h3Match && !h4Match ? line.match(chapterHeading) : null

    if (h2Match || chapterMatch) {
      sections.push({ heading: currentHeading, parentHeading: currentParent, rawLines: currentLines })
      const newHeading = (h2Match?.[1] ?? chapterMatch?.[1])!.trim()
      lastH2Heading = newHeading
      lastH3Heading = undefined  // H3 scope resets at every H2
      currentHeading = newHeading
      currentParent = undefined  // H2 has no parent
      currentLines = []
    } else if (h3Match) {
      sections.push({ heading: currentHeading, parentHeading: currentParent, rawLines: currentLines })
      const newHeading = h3Match[1].trim()
      lastH3Heading = newHeading
      currentHeading = newHeading
      currentParent = lastH2Heading  // H3 nests under the most recent H2
      currentLines = []
    } else if (h4Match) {
      sections.push({ heading: currentHeading, parentHeading: currentParent, rawLines: currentLines })
      currentHeading = h4Match[1].trim()
      // H4 prefers its nearest H3 ancestor (more specific). Falls back to H2
      // when the H4 appears outside any H3 scope.
      currentParent = lastH3Heading ?? lastH2Heading
      currentLines = []
    } else {
      currentLines.push(line)
    }
  }
  sections.push({ heading: currentHeading, parentHeading: currentParent, rawLines: currentLines })

  // Drop sections that are entirely empty
  const nonEmpty = sections.filter(s => s.rawLines.join('').trim().length > 0)

  return nonEmpty.map((section, idx) => {
    let text = section.rawLines.join('\n').trim()
    if (idx > 0 && text) {
      const prevText = nonEmpty[idx - 1].rawLines.join('\n').trim()
      const overlap = lastParagraph(prevText)
      if (overlap) text = `${overlap}\n\n${text}`
    }
    return { heading: section.heading, parentHeading: section.parentHeading, text }
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

  const sections = chunkAtHeadings(content)

  // Upstash limits: 48KB per metadata object, 1MB per `data` string.
  // Spec target: 200–800 tokens per chunk (~800–3200 chars).
  // We cap data at 3000 chars (embedding input) and stored text at 2000 chars
  // (what Cosmo reads in the context window). Large sections are truncated at
  // these boundaries — the embedding still captures the semantic substance.
  const DATA_TEXT_LIMIT = 3000
  const METADATA_TEXT_LIMIT = 2000

  const filteredSections = sections.filter(s => s.text.length > 80) // skip trivially short chunks

  // First pass: count slug occurrences within this file. Slugs that collide
  // get a content-hash disambiguator; unique slugs stay clean to match the
  // citation format documented in docs/pm.md (Phase 8).
  const slugCounts = new Map<string, number>()
  for (const s of filteredSections) {
    const slug = slugify(s.heading)
    slugCounts.set(slug, (slugCounts.get(slug) ?? 0) + 1)
  }

  return filteredSections.map(s => {
    const headingSlug = slugify(s.heading)
    const collides = (slugCounts.get(headingSlug) ?? 0) > 1
    // Most chunks: `path#slug` (stable, citation-friendly).
    // Colliding chunks: `path#slug-<hash>` — hash derives from the section's
    // own opening text, so inserting another section elsewhere in the file
    // does not shift this chunk's ID.
    const id = collides
      ? `${relPath}#${headingSlug}-${shortHash(s.text)}`
      : `${relPath}#${headingSlug}`

    // Section label for embedding: "Book II > Chapter III" for nested, "Chapter III" for flat
    const sectionLabel = s.parentHeading
      ? `${s.parentHeading} > ${s.heading}`
      : s.heading

    // data = enriched text passed to Upstash for embedding generation
    // metadata.text = passage shown to Cosmo in the RAG context window
    const truncatedForData = s.text.length > DATA_TEXT_LIMIT
      ? s.text.slice(0, DATA_TEXT_LIMIT) + '…'
      : s.text
    const data = `${contextPrefix}\n\nSection: ${sectionLabel}\n\n${truncatedForData}`

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
    if (s.parentHeading) metadata.parent_heading = s.parentHeading
    if (author) metadata.author = author
    if (tradition) metadata.tradition = tradition
    if (isWiki) metadata.wiki_path = relPath

    return { id, data, metadata }
  })
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const BATCH_SIZE = 100
const RANGE_PAGE_SIZE = 1000
const DELETE_BATCH_SIZE = 1000

// List every ID currently in the index, paginating through `range()`.
async function listAllIds(index: Index): Promise<string[]> {
  const ids: string[] = []
  let cursor: string = ''
  do {
    const page = await index.range({ cursor, limit: RANGE_PAGE_SIZE })
    for (const v of page.vectors) ids.push(v.id as string)
    cursor = page.nextCursor ?? ''
  } while (cursor)
  return ids
}

async function main() {
  const args = new Set(process.argv.slice(2))
  const shouldReset = args.has('--reset')
  const shouldSync = !args.has('--no-sync')

  const vectorUrl = process.env.UPSTASH_VECTOR_REST_URL
  const vectorToken = process.env.UPSTASH_VECTOR_REST_TOKEN

  if (!vectorUrl || !vectorToken) {
    console.error('❌ Missing UPSTASH_VECTOR_REST_URL or UPSTASH_VECTOR_REST_TOKEN')
    console.error('   Add them to apps/web/.env.local and Vercel environment variables.')
    process.exit(1)
  }

  const index = new Index({ url: vectorUrl, token: vectorToken })

  if (shouldReset) {
    console.log('⚠️  --reset: wiping all vectors from the Upstash index...')
    await index.reset()
    console.log('   Index reset complete.\n')
  }

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

  // Defensive check: catch ID collisions across the corpus before they hit Upstash.
  // Same-file collisions are already disambiguated by `shortHash()`; cross-file
  // collisions would indicate a bug in the ID scheme.
  const seenIds = new Set<string>()
  for (const chunk of allChunks) {
    if (seenIds.has(chunk.id)) {
      console.error(`❌ Duplicate chunk ID detected: ${chunk.id}`)
      process.exit(1)
    }
    seenIds.add(chunk.id)
  }

  console.log(`\nBuilt ${allChunks.length} chunks total. Upserting to Upstash Vector...`)

  let upserted = 0
  for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
    const batch = allChunks.slice(i, i + BATCH_SIZE)
    try {
      await index.upsert(batch)
      upserted += batch.length
      process.stdout.write(`  ${upserted}/${allChunks.length}\r`)
    } catch (err) {
      console.error(`\n❌ Batch upsert failed at index ${i}:`, err)
      // Log the first few IDs in the batch to help debug
      console.error(`   First ID in batch: ${batch[0]?.id}`)
      throw err // Still fail the CI, but with better info
    }
  }
  console.log(`\n✅ Upserted ${allChunks.length} chunks.`)

  // Stale-ID sync: delete any vectors in Upstash that no longer match a chunk
  // in the current corpus. Handles file deletions, renames, and ID-format
  // migrations without leaving orphaned vectors that pollute RAG retrieval.
  // Skipped on --reset (the index is already empty) and --no-sync (escape hatch).
  if (shouldSync && !shouldReset) {
    console.log('\nReconciling index with corpus (sync)...')
    const existingIds = await listAllIds(index)
    const stale = existingIds.filter(id => !seenIds.has(id))
    if (stale.length === 0) {
      console.log(`   Index is in sync (${existingIds.length} vectors, 0 stale).`)
    } else {
      console.log(`   Deleting ${stale.length} stale vector(s) (of ${existingIds.length} total)...`)
      for (let i = 0; i < stale.length; i += DELETE_BATCH_SIZE) {
        const batch = stale.slice(i, i + DELETE_BATCH_SIZE)
        await index.delete(batch)
      }
      console.log(`   Sync complete.`)
    }
  }

  console.log(`\n✅ Done — ${allChunks.length} chunks live in Upstash Vector`)
}

main().catch(err => {
  console.error('❌ Embed failed:', err)
  process.exit(1)
})
