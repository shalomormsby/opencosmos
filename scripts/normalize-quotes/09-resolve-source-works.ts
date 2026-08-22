#!/usr/bin/env tsx
/**
 * Link quotes to the corpus works they came from.
 *
 * Stage 3 gave most quotes an `earliest_print_source` — "Meditations, Marcus
 * Aurelius, Book 12", "The Prophet, Kahlil Gibran, 1923". When that names a work
 * the corpus actually holds, the quote should point at it: the constellation
 * draws a `quote → work` **cites** edge instead of parking the quote in a
 * tradition orbit, and the RAG context tells Cosmo which work a line is from.
 *
 * Until now `source_work` was hardcoded null by the YAML emitter, so that edge
 * had never fired once for any of the 349 promoted quotes.
 *
 * Matching is deliberately conservative — a wrong edge is worse than no edge:
 *   • the work's title must appear in the print source, and
 *   • the authors must agree (work author ↔ quote author, either direction)
 *
 * Without the author check, Alan Watts' *Nature, Man and Woman* matches a
 * corpus work titled *Nature*, which is a different book by a different person.
 *
 * Usage:
 *   tsx 09-resolve-source-works.ts [--dry]
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import matter from 'gray-matter'
import {
  COLLECTIVE_BUCKETS,
  KNOWLEDGE_QUOTES_DIR,
  REPO_ROOT,
  emitCollectiveFile,
  emitPersonFile,
  normalizeAuthorKey,
  parseYamlFile,
  type JsonlRecord,
} from './shared.js'

const KNOWLEDGE_DIR = join(REPO_ROOT, 'knowledge')
const WORK_DIRS = ['sources', 'scriptures', 'collections'] as const

/** A title shorter than this matches too much prose to trust. */
const MIN_TITLE_LEN = 5

type Work = { slug: string; title: string; authorKey: string | null }

function loadWorks(): Work[] {
  const works: Work[] = []
  for (const dir of WORK_DIRS) {
    const full = join(KNOWLEDGE_DIR, dir)
    if (!statSync(full, { throwIfNoEntry: false })) continue
    for (const f of readdirSync(full).filter((n) => n.endsWith('.md'))) {
      const { data } = matter(readFileSync(join(full, f), 'utf-8'))
      const title = data.title ? String(data.title).trim() : ''
      if (title.length < MIN_TITLE_LEN) continue
      works.push({
        slug: `${dir}/${f.replace(/\.md$/, '')}`,
        title,
        authorKey: data.author ? normalizeAuthorKey(String(data.author)) : null,
      })
    }
  }
  // Longest title first, so "Tao Te Ching" wins over a hypothetical "Tao".
  return works.sort((a, b) => b.title.length - a.title.length)
}

function resolve(record: JsonlRecord, works: Work[]): Work | null {
  const src = record.provenance?.earliest_print_source
  if (!src) return null
  const haystack = src.toLowerCase()
  const quoteAuthorKey = normalizeAuthorKey(record.author ?? '')

  for (const w of works) {
    if (!haystack.includes(w.title.toLowerCase())) continue

    // Authors must agree. Accept either direction: the corpus work may credit a
    // translator or leave author null, and the print source usually names the
    // author inline even when the frontmatter doesn't.
    const authorAgrees =
      (w.authorKey && w.authorKey === quoteAuthorKey) ||
      (w.authorKey && haystack.includes(w.authorKey.replace(/-/g, ' '))) ||
      (!w.authorKey && quoteAuthorKey && haystack.includes(quoteAuthorKey.replace(/-/g, ' ')))

    if (authorAgrees) return w
  }
  return null
}

function main() {
  const dry = process.argv.slice(2).includes('--dry')
  const works = loadWorks()
  console.log(`Loaded ${works.length} corpus works with usable titles.`)

  const files = readdirSync(KNOWLEDGE_QUOTES_DIR).filter((f) => f.endsWith('.yaml'))
  let linked = 0
  let cleared = 0
  const perWork = new Map<string, number>()
  const changedFiles: string[] = []

  for (const file of files) {
    const bucket = file.replace(/\.yaml$/, '')
    const path = join(KNOWLEDGE_QUOTES_DIR, file)

    let parsed
    try {
      parsed = parseYamlFile(path, bucket)
    } catch (e) {
      console.warn(`  ⚠ ${file}: ${(e as Error).message.split('\n')[0]}`)
      continue
    }

    let touched = false
    for (const r of parsed.records) {
      const match = resolve(r, works)
      const next = match ? match.slug : null
      const prev = (r.source_work as string | null) ?? null
      if (next !== prev) {
        r.source_work = next
        touched = true
        if (next) {
          linked++
          perWork.set(next, (perWork.get(next) ?? 0) + 1)
        } else {
          cleared++
        }
      } else if (next) {
        perWork.set(next, (perWork.get(next) ?? 0) + 1)
      }
    }

    if (!touched) continue
    changedFiles.push(file)
    if (!dry) {
      const isCollective = parsed.isCollective || COLLECTIVE_BUCKETS.has(bucket)
      const yaml = isCollective
        ? emitCollectiveFile(bucket, parsed.records)
        : emitPersonFile(parsed.records)
      writeFileSync(path, yaml, 'utf-8')
    }
  }

  console.log()
  console.log(`${dry ? '[DRY RUN] ' : ''}Linked ${linked} quote(s) to a corpus work.`)
  if (cleared > 0) console.log(`Cleared ${cleared} stale link(s).`)
  console.log(`${changedFiles.length} file(s) ${dry ? 'would change' : 'changed'}.`)
  if (perWork.size > 0) {
    console.log()
    console.log('Quotes now citing each work:')
    for (const [slug, n] of Array.from(perWork).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${slug.padEnd(44)} ${n}`)
    }
  }
  if (!dry && linked > 0) {
    console.log()
    console.log('Next: pnpm quotes:lint && pnpm embed && pnpm graph:constellation')
  }
}

main()
