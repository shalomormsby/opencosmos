#!/usr/bin/env tsx
/**
 * Stage 4 (export): the short list of validated records that need a human.
 *
 * Deliberately not "everything below the promotion bar". Most low-confidence
 * records need no decision — an untraceable proverb at 0.2 is correctly
 * described and simply stays pending. What needs a person is the set where the
 * validator is asserting something about the attribution being *wrong*:
 *
 *   status likely_misattributed or apocryphal, or
 *   a suggested_reattribution naming a different author
 *
 * Reattribution suggestions are read from the checkpoint, not pending.jsonl:
 * 03-merge-validation.ts folds them into the notes prose, but the checkpoint
 * keeps the structured value.
 *
 * Usage:
 *   tsx 04-export-review-csv.ts [--all] [--out <path>]
 *
 * Flags:
 *   --all    Also include everything below the promotion bar (the wider net)
 *   --out    Write somewhere other than _review/review-<date>.csv
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  PENDING_JSONL_PATH,
  REVIEW_DIR,
  csvCell,
  loadCheckpointResults,
  meetsPromotionBar,
  readJsonlFile,
  type JsonlRecord,
  type ValidationResult,
} from './shared.js'

const REVIEW_COLUMNS = [
  'id',
  'author',
  'text',
  'status',
  'confidence',
  'suggested_reattribution',
  'notes',
  // Filled in by hand:
  'decision',
  'reattribute_to',
] as const

const FLAGGED_STATUSES = new Set(['likely_misattributed', 'apocryphal'])

function main() {
  const argv = process.argv.slice(2)
  const wideNet = argv.includes('--all')
  const outIdx = argv.indexOf('--out')
  const stamp = new Date().toISOString().slice(0, 10)
  const outPath = outIdx !== -1 ? argv[outIdx + 1] : join(REVIEW_DIR, `review-${stamp}.csv`)

  const pending = readJsonlFile(PENDING_JSONL_PATH)
  const suggestions = new Map<string, ValidationResult>()
  for (const r of loadCheckpointResults()) {
    if (r.suggested_reattribution) suggestions.set(r.id, r)
  }

  const needsReview = (r: JsonlRecord): boolean => {
    if (r.provenance?.reviewed_by_human === true) return false
    if (r.provenance?.confidence == null) return false // not validated yet
    if (FLAGGED_STATUSES.has(r.provenance.status)) return true
    if (suggestions.has(r.id)) return true
    return wideNet ? !meetsPromotionBar(r) : false
  }

  const rows = pending.filter(needsReview).sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))

  if (rows.length === 0) {
    console.log('Nothing awaiting review.')
    return
  }

  const csv =
    REVIEW_COLUMNS.join(',') +
    '\n' +
    rows
      .map((r) =>
        [
          r.id,
          r.author,
          r.text,
          r.provenance?.status,
          r.provenance?.confidence,
          suggestions.get(r.id)?.suggested_reattribution ?? '',
          r.provenance?.notes,
          '',
          '',
        ]
          .map(csvCell)
          .join(','),
      )
      .join('\n') +
    '\n'

  mkdirSync(REVIEW_DIR, { recursive: true })
  writeFileSync(outPath, csv, 'utf-8')

  const byStatus = new Map<string, number>()
  for (const r of rows) byStatus.set(r.provenance!.status, (byStatus.get(r.provenance!.status) ?? 0) + 1)

  console.log(`Wrote ${rows.length} row(s) to ${outPath}`)
  for (const [status, n] of Array.from(byStatus).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${status.padEnd(24)} ${n}`)
  }
  console.log(`  with a reattribution suggested: ${rows.filter((r) => suggestions.has(r.id)).length}`)
  console.log()
  console.log(`Fill in the "decision" column with: keep | drop | reattribute`)
  console.log(`  keep         leave it pending, doubt recorded, marked reviewed`)
  console.log(`  drop         move to _archive/rejected.yaml`)
  console.log(`  reattribute  set reattribute_to (or leave blank to accept the suggestion)`)
  console.log()
  console.log(`Then: pnpm quotes:review-apply -- ${outPath} --dry`)
}

main()
