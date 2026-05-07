#!/usr/bin/env tsx
/**
 * Stage 1 — split source jsonl into two pools:
 *   • Embeddable records (status ∈ {verified, attributed}) → knowledge/quotes/*.yaml
 *   • Pending records (everything else) → data/quotes-pending/{pending.jsonl, pending.csv}
 *
 * Idempotent: wipes stale outputs at start so re-runs produce a clean state.
 */

import { mkdirSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  KNOWLEDGE_QUOTES_DIR,
  PENDING_DIR,
  PENDING_JSONL_PATH,
  PENDING_CSV_PATH,
  SOURCE_JSONL_PATH,
  emitCollectiveFile,
  emitCsv,
  emitPersonFile,
  isEmbeddable,
  preclassifyStatus,
  readJsonlFile,
  routeAuthor,
  synthesizeTradition,
  withPreclassifiedProvenance,
  type JsonlRecord,
} from './shared.js'

function wipeStaleOutputs() {
  // 1. knowledge/quotes/*.yaml (top-level only — leaves _source/, _review/, _archive/, README.md alone)
  if (statSync(KNOWLEDGE_QUOTES_DIR, { throwIfNoEntry: false })) {
    for (const f of readdirSync(KNOWLEDGE_QUOTES_DIR)) {
      if (f.endsWith('.yaml')) unlinkSync(join(KNOWLEDGE_QUOTES_DIR, f))
    }
  }
  // 2. data/quotes-pending/pending.{jsonl,csv}
  mkdirSync(PENDING_DIR, { recursive: true })
  for (const path of [PENDING_JSONL_PATH, PENDING_CSV_PATH]) {
    if (statSync(path, { throwIfNoEntry: false })) unlinkSync(path)
  }
}

function emitEmbeddablePool(records: JsonlRecord[]): { fileCount: number; quoteCount: number; personFileCount: number; collectiveQuoteCount: number } {
  // Group by routing bucket
  const groups = new Map<string, { isCollective: boolean; records: JsonlRecord[] }>()
  for (const r of records) {
    const { bucket, isCollective } = routeAuthor(r.author, r.author_normalized_key)
    const group = groups.get(bucket) ?? { isCollective, records: [] }
    group.records.push(r)
    groups.set(bucket, group)
  }

  let fileCount = 0
  let quoteCount = 0
  let personFileCount = 0
  let collectiveQuoteCount = 0

  for (const [bucket, { isCollective, records: rs }] of groups) {
    const path = join(KNOWLEDGE_QUOTES_DIR, `${bucket}.yaml`)
    const yaml = isCollective ? emitCollectiveFile(bucket, rs) : emitPersonFile(rs)
    writeFileSync(path, yaml, 'utf-8')
    fileCount++
    quoteCount += rs.length
    if (isCollective) collectiveQuoteCount += rs.length
    else personFileCount++
  }

  return { fileCount, quoteCount, personFileCount, collectiveQuoteCount }
}

function emitPendingPool(records: JsonlRecord[]) {
  // Sort by ID for stable diffs
  const sorted = [...records].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
  const jsonl = sorted.map((r) => JSON.stringify(r)).join('\n') + (sorted.length > 0 ? '\n' : '')
  writeFileSync(PENDING_JSONL_PATH, jsonl, 'utf-8')
  writeFileSync(PENDING_CSV_PATH, emitCsv(sorted), 'utf-8')
}

function main() {
  if (!statSync(SOURCE_JSONL_PATH, { throwIfNoEntry: false })) {
    console.error(`Source not found: ${SOURCE_JSONL_PATH}`)
    process.exit(1)
  }

  const records = readJsonlFile(SOURCE_JSONL_PATH)
  console.log(`Read ${records.length} records from _source/quotes_normalized.jsonl`)

  // Apply pre-classification (Decision 3) — every record gets a provenance block
  const enriched = records.map(withPreclassifiedProvenance)

  // Partition by embeddable status
  const embeddable: JsonlRecord[] = []
  const pending: JsonlRecord[] = []
  for (const r of enriched) {
    if (isEmbeddable(r)) embeddable.push(r)
    else pending.push(r)
  }

  wipeStaleOutputs()

  const emb = emitEmbeddablePool(embeddable)
  emitPendingPool(pending)

  // Status distribution check
  const statusCounts: Record<string, number> = {}
  for (const r of enriched) {
    const s = r.provenance?.status ?? preclassifyStatus(r)
    statusCounts[s] = (statusCounts[s] ?? 0) + 1
  }

  // Tradition synthesis coverage
  const traditionAssigned = enriched.filter((r) => synthesizeTradition(r.context) !== null).length

  console.log()
  console.log(`Embeddable pool → knowledge/quotes/`)
  console.log(`  ${emb.fileCount} yaml files (${emb.personFileCount} person + ${emb.fileCount - emb.personFileCount} collective)`)
  console.log(`  ${emb.quoteCount} quotes (${emb.quoteCount - emb.collectiveQuoteCount} person-attributed + ${emb.collectiveQuoteCount} collective)`)
  console.log()
  console.log(`Pending pool → data/quotes-pending/`)
  console.log(`  pending.jsonl: ${pending.length} records`)
  console.log(`  pending.csv:   ${pending.length} records (+ header row)`)
  console.log()
  console.log(`Status distribution (Decision 3 pre-classification):`)
  for (const [s, n] of Object.entries(statusCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${s.padEnd(24)} ${n}`)
  }
  console.log()
  console.log(`Tradition synthesis coverage: ${traditionAssigned}/${enriched.length} (${Math.round(100 * traditionAssigned / enriched.length)}%)`)
  console.log(`(Records without synthesizable tradition keep tradition: null — refined later.)`)
}

main()
