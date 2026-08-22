#!/usr/bin/env tsx
/**
 * Add new quotes to the corpus.
 *
 * This is the only supported way in, now that the pools are canonical and
 * 01-jsonl-to-yaml.ts is retired. It is the single enforcement point for ID
 * allocation, author-key derivation, routing, and duplicate detection — which
 * is why the /new-quote skill drives this script rather than writing YAML
 * itself.
 *
 * New quotes always land in the pending pool with whatever provenance they
 * arrive with. If that provenance already clears the promotion bar (a verified
 * status at ≥0.80, or a human-reviewed one), the next `pnpm quotes:promote`
 * moves it into knowledge/quotes/. Promotion stays single-pathed through 07.
 *
 * Usage:
 *   tsx 08-add-quote.ts --json <file>                 batch, and the escaping-safe path
 *   tsx 08-add-quote.ts --text "..." --author "..."   quick single add
 *   tsx 08-add-quote.ts --check-dupes --json <file>   report matches, write nothing
 *
 * Flags:
 *   --json <file>     read [{text, author, source?, category?, keywords?,
 *                     context?, favorite?, provenance?}, ...]
 *   --text            quote text (single-add mode)
 *   --author          attribution (single-add mode)
 *   --source          a print source, if known — sets status to `attributed`
 *   --category        insight | spirit | creativity | business | relationships | humor | design
 *   --keywords        comma-separated
 *   --context         short descriptor, e.g. "Poet" — drives tradition synthesis
 *   --favorite        mark as a favorite
 *   --reviewed        you have personally verified this attribution
 *   --allow-dupe      add even if the text already exists
 *   --check-dupes     report duplicates as JSON and exit without writing
 *   --dry             print what would happen, write nothing
 */

import { readFileSync, statSync, writeFileSync } from 'node:fs'
import {
  ARCHIVE_DIR,
  KNOWLEDGE_QUOTES_DIR,
  PENDING_CSV_PATH,
  PENDING_JSONL_PATH,
  REJECTED_YAML_PATH,
  emitCsv,
  normalizeAuthorKey,
  parseYamlFile,
  preclassifyStatus,
  readJsonlFile,
  routeAuthor,
  type JsonlRecord,
  type Provenance,
  type Status,
} from './shared.js'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'

type Incoming = {
  text?: string
  author?: string
  source?: string | null
  category?: string | null
  keywords?: string[] | string
  context?: string | null
  favorite?: boolean
  gender?: 'M' | 'F' | null
  provenance?: Partial<Provenance>
}

// ─── Args ───────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2)
const has = (f: string) => argv.includes(f)
function strArg(f: string): string | undefined {
  const i = argv.indexOf(f)
  return i === -1 ? undefined : argv[i + 1]
}

// ─── Corpus reads ───────────────────────────────────────────────────────────

/** Every record across all three pools — the basis for IDs and dupe checks. */
function readWholeCorpus(): JsonlRecord[] {
  const all: JsonlRecord[] = []

  if (statSync(PENDING_JSONL_PATH, { throwIfNoEntry: false })) {
    all.push(...readJsonlFile(PENDING_JSONL_PATH))
  }

  if (statSync(KNOWLEDGE_QUOTES_DIR, { throwIfNoEntry: false })) {
    for (const f of readdirSync(KNOWLEDGE_QUOTES_DIR).filter((n) => n.endsWith('.yaml'))) {
      try {
        all.push(...parseYamlFile(join(KNOWLEDGE_QUOTES_DIR, f), f.replace(/\.yaml$/, '')).records)
      } catch {
        /* lint reports parse failures; don't block an add on one */
      }
    }
  }

  if (statSync(REJECTED_YAML_PATH, { throwIfNoEntry: false })) {
    try {
      all.push(...parseYamlFile(REJECTED_YAML_PATH, 'rejected').records)
    } catch {
      /* same */
    }
  }

  return all
}

function nextIdFactory(corpus: JsonlRecord[]): () => string {
  let max = 0
  for (const r of corpus) {
    const m = /^q_(\d+)$/.exec(r.id ?? '')
    if (m) max = Math.max(max, Number(m[1]))
  }
  return () => `q_${String(++max).padStart(4, '0')}`
}

/** Loose enough to catch reformatting and punctuation drift, not paraphrase. */
function dupeKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

// ─── Normalize one incoming quote ───────────────────────────────────────────

function toRecord(input: Incoming, id: string): JsonlRecord {
  const text = (input.text ?? '').trim()
  const author = (input.author ?? '').trim() || 'Unknown'
  const source = input.source?.trim() || null
  const keywords = Array.isArray(input.keywords)
    ? input.keywords
    : typeof input.keywords === 'string'
      ? input.keywords.split(',').map((k) => k.trim()).filter(Boolean)
      : []

  const base: JsonlRecord = {
    id,
    text,
    author,
    author_normalized_key: normalizeAuthorKey(author),
    category: input.category?.trim() || null,
    keywords,
    context: input.context?.trim() || null,
    favorite: input.favorite === true,
    gender: input.gender ?? null,
    source,
    flags: { suspect_misattribution: false, suspect_reason: null },
  } as JsonlRecord

  const p = input.provenance ?? {}
  base.provenance = {
    // Absent an explicit status, fall back to the same rule Tier 1 used:
    // a source string means `attributed`, nothing means `attributed_unverified`.
    status: (p.status as Status) ?? preclassifyStatus(base),
    confidence: typeof p.confidence === 'number' ? p.confidence : null,
    wikiquote_url: p.wikiquote_url ?? null,
    earliest_print_source: p.earliest_print_source ?? source,
    notes: p.notes ?? null,
    reviewed_by_human: p.reviewed_by_human ?? has('--reviewed'),
  }

  return base
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main() {
  const dry = has('--dry')
  const checkOnly = has('--check-dupes')

  // Gather inputs
  let inputs: Incoming[]
  const jsonPath = strArg('--json')
  if (jsonPath) {
    if (!statSync(jsonPath, { throwIfNoEntry: false })) throw new Error(`No such file: ${jsonPath}`)
    const parsed = JSON.parse(readFileSync(jsonPath, 'utf-8'))
    inputs = Array.isArray(parsed) ? parsed : [parsed]
  } else if (strArg('--text')) {
    inputs = [{
      text: strArg('--text'),
      author: strArg('--author'),
      source: strArg('--source') ?? null,
      category: strArg('--category') ?? null,
      keywords: strArg('--keywords'),
      context: strArg('--context') ?? null,
      favorite: has('--favorite'),
    }]
  } else {
    throw new Error('Nothing to add. Pass --json <file>, or --text "..." --author "..."')
  }

  const bad = inputs.filter((i) => !i.text || !i.text.trim())
  if (bad.length) throw new Error(`${bad.length} entr(ies) have no text`)

  const corpus = readWholeCorpus()
  const existing = new Map<string, JsonlRecord>()
  for (const r of corpus) if (r.text) existing.set(dupeKey(r.text), r)

  // Duplicate report
  const dupes = inputs
    .map((i, idx) => ({ idx, input: i, match: existing.get(dupeKey(i.text!)) }))
    .filter((d) => d.match)

  if (checkOnly) {
    console.log(JSON.stringify(
      {
        checked: inputs.length,
        duplicates: dupes.map((d) => ({
          text: d.input.text,
          matches_id: d.match!.id,
          matches_author: d.match!.author,
        })),
      },
      null,
      2,
    ))
    process.exit(dupes.length > 0 ? 1 : 0)
  }

  if (dupes.length > 0 && !has('--allow-dupe')) {
    console.error(`${dupes.length} of ${inputs.length} already in the corpus:`)
    for (const d of dupes) {
      console.error(`  "${d.input.text!.slice(0, 60)}${d.input.text!.length > 60 ? '…' : ''}"`)
      console.error(`     already ${d.match!.id} — ${d.match!.author}`)
    }
    console.error(`\nPass --allow-dupe to add anyway.`)
    process.exit(1)
  }

  const nextId = nextIdFactory(corpus)
  const records = inputs.map((i) => toRecord(i, nextId()))

  console.log(`${dry ? '[DRY RUN] ' : ''}Adding ${records.length} quote(s) to the pending pool:`)
  for (const r of records) {
    const { bucket } = routeAuthor(r.author, r.author_normalized_key)
    const p = r.provenance!
    const willPromote = (p.status === 'verified' || p.status === 'attributed')
      && (p.reviewed_by_human === true || (typeof p.confidence === 'number' && p.confidence >= 0.8))
    console.log(`  ${r.id}  ${r.author}  [${p.status}${p.confidence != null ? ` ${p.confidence}` : ''}]`)
    console.log(`     "${r.text.slice(0, 68)}${r.text.length > 68 ? '…' : ''}"`)
    console.log(`     → ${willPromote ? `promotes to knowledge/quotes/${bucket}.yaml` : 'stays pending, queued for validation'}`)
  }

  if (dry) {
    console.log('\n(--dry — no files written)')
    return
  }

  const pending = statSync(PENDING_JSONL_PATH, { throwIfNoEntry: false })
    ? readJsonlFile(PENDING_JSONL_PATH)
    : []
  const next = [...pending, ...records].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))

  writeFileSync(PENDING_JSONL_PATH, next.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf-8')
  writeFileSync(PENDING_CSV_PATH, emitCsv(next), 'utf-8')

  console.log(`\n✓ Pending pool: ${pending.length} → ${next.length}`)

  const unvalidated = records.filter((r) => r.provenance?.confidence == null).length
  if (unvalidated > 0) {
    console.log(`\n${unvalidated} awaiting provenance — they'll appear in the next`)
    console.log(`  pnpm quotes:checkpoint remaining --write-batches`)
  }
  console.log(`Then: pnpm quotes:promote && pnpm quotes:lint && pnpm embed`)
}

try {
  main()
} catch (e) {
  console.error(`Error: ${(e as Error).message}`)
  process.exit(1)
}
