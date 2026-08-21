#!/usr/bin/env tsx
/**
 * Lint both quote pools.
 *
 *   knowledge/quotes/*.yaml          — embeddable corpus
 *   data/quotes-pending/pending.jsonl — pending pool
 *
 * Checks:
 *   - per-pool: IDs unique, required fields present, status ∈ allowed vocab
 *   - cross-pool: no ID overlap, total count matches source jsonl
 *   - embeddable: every record has status ∈ {verified, attributed}
 *   - pending: nothing rejected (that belongs in _archive/), and nothing that
 *     already clears the promotion bar (that belongs in the embeddable pool).
 *     Validated verified/attributed records below the bar are legitimate here —
 *     they carry a real status and are waiting on stronger evidence.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import {
  ALLOWED_STATUSES,
  COLLECTIVE_BUCKETS,
  EMBEDDABLE_STATUSES,
  KNOWLEDGE_QUOTES_DIR,
  PENDING_JSONL_PATH,
  SOURCE_JSONL_PATH,
  meetsPromotionBar,
  parseYamlFile,
  readJsonlFile,
  type JsonlRecord,
} from './shared.js'

const errors: string[] = []
const err = (msg: string) => errors.push(msg)

function lintEmbeddablePool(): { ids: Set<string>; total: number } {
  const ids = new Set<string>()
  if (!statSync(KNOWLEDGE_QUOTES_DIR, { throwIfNoEntry: false })) {
    err(`knowledge/quotes/ missing`)
    return { ids, total: 0 }
  }

  let total = 0
  const yamlFiles = readdirSync(KNOWLEDGE_QUOTES_DIR).filter((f) => f.endsWith('.yaml'))

  for (const file of yamlFiles) {
    const path = join(KNOWLEDGE_QUOTES_DIR, file)
    const bucket = file.replace(/\.yaml$/, '')
    let parsed
    try {
      parsed = parseYamlFile(path, bucket)
    } catch (e) {
      err(`${file}: yaml parse failed: ${e}`)
      continue
    }

    if (parsed.records.length === 0) {
      err(`${file}: zero quotes`)
      continue
    }

    for (const r of parsed.records) {
      if (!r.id) {
        err(`${file}: record missing id`)
        continue
      }
      if (ids.has(r.id)) {
        err(`${file}: duplicate id ${r.id}`)
      }
      ids.add(r.id)
      total++

      // Required fields
      if (typeof r.text !== 'string') err(`${file}#${r.id}: missing/non-string text`)
      if (r.category != null && typeof r.category !== 'string') err(`${file}#${r.id}: category must be string or null`)
      if (!Array.isArray(r.keywords)) err(`${file}#${r.id}: keywords must be an array`)
      if (typeof r.favorite !== 'boolean') err(`${file}#${r.id}: favorite must be boolean`)
      if (!r.provenance) {
        err(`${file}#${r.id}: missing provenance block`)
        continue
      }

      const status = r.provenance.status
      if (!ALLOWED_STATUSES.has(status)) {
        err(`${file}#${r.id}: invalid status "${status}"`)
      } else if (!EMBEDDABLE_STATUSES.has(status)) {
        err(`${file}#${r.id}: status "${status}" not embeddable — should be in pending pool`)
      }
    }
  }

  return { ids, total }
}

function lintPendingPool(): { ids: Set<string>; total: number } {
  const ids = new Set<string>()
  if (!statSync(PENDING_JSONL_PATH, { throwIfNoEntry: false })) {
    err(`pending pool missing: ${PENDING_JSONL_PATH}`)
    return { ids, total: 0 }
  }

  let records: JsonlRecord[]
  try {
    records = readJsonlFile(PENDING_JSONL_PATH)
  } catch (e) {
    err(`pending.jsonl: parse failed: ${e}`)
    return { ids, total: 0 }
  }

  let total = 0
  for (const r of records) {
    if (!r.id) {
      err(`pending.jsonl: record missing id`)
      continue
    }
    if (ids.has(r.id)) {
      err(`pending.jsonl: duplicate id ${r.id}`)
    }
    ids.add(r.id)
    total++

    if (!r.provenance) {
      err(`pending.jsonl#${r.id}: missing provenance block`)
      continue
    }

    const status = r.provenance.status
    if (!ALLOWED_STATUSES.has(status)) {
      err(`pending.jsonl#${r.id}: invalid status "${status}"`)
    } else if (status === 'rejected') {
      err(`pending.jsonl#${r.id}: status "rejected" belongs in _archive/rejected.yaml`)
    } else if (meetsPromotionBar(r)) {
      const c = r.provenance.confidence
      err(
        `pending.jsonl#${r.id}: meets promotion bar (${status}, confidence ${c ?? 'n/a'}` +
          `${r.provenance.reviewed_by_human ? ', human-reviewed' : ''}) — run pnpm quotes:promote`,
      )
    }
  }

  return { ids, total }
}

function main() {
  const embeddable = lintEmbeddablePool()
  const pending = lintPendingPool()

  // Cross-pool: no ID overlap
  for (const id of embeddable.ids) {
    if (pending.ids.has(id)) err(`cross-pool: id ${id} appears in both embeddable and pending`)
  }

  // Cross-pool: total = source count
  const totalAcrossPools = embeddable.total + pending.total
  if (statSync(SOURCE_JSONL_PATH, { throwIfNoEntry: false })) {
    const sourceCount = readFileSync(SOURCE_JSONL_PATH, 'utf-8').split('\n').filter(Boolean).length
    if (totalAcrossPools !== sourceCount) {
      err(`total mismatch: embeddable ${embeddable.total} + pending ${pending.total} = ${totalAcrossPools} ≠ source ${sourceCount}`)
    }
  } else {
    err(`source jsonl missing: ${SOURCE_JSONL_PATH}`)
  }

  console.log(`Embeddable pool: ${embeddable.total} quotes across ${COLLECTIVE_BUCKETS.size}+ files`)
  console.log(`Pending pool:    ${pending.total} records`)
  console.log(`Total:           ${totalAcrossPools} (source: ${readFileSync(SOURCE_JSONL_PATH, 'utf-8').split('\n').filter(Boolean).length})`)

  if (errors.length > 0) {
    console.error()
    console.error(`${errors.length} error(s):`)
    for (const e of errors) console.error(`  - ${e}`)
    process.exit(1)
  }
  console.log('OK — lint passed.')
}

main()
