#!/usr/bin/env tsx
/**
 * Regenerate data/quotes-pending/pending.csv from pending.jsonl.
 *
 * Idempotent. Run after Stage 3 mutations to refresh the spreadsheet view.
 */

import { writeFileSync, statSync } from 'node:fs'
import {
  PENDING_CSV_PATH,
  PENDING_JSONL_PATH,
  emitCsv,
  readJsonlFile,
} from './shared.js'

function main() {
  if (!statSync(PENDING_JSONL_PATH, { throwIfNoEntry: false })) {
    console.error(`Pending pool missing: ${PENDING_JSONL_PATH}`)
    process.exit(1)
  }

  const records = readJsonlFile(PENDING_JSONL_PATH)
  const sorted = [...records].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
  writeFileSync(PENDING_CSV_PATH, emitCsv(sorted), 'utf-8')

  console.log(`Wrote ${PENDING_CSV_PATH} (${sorted.length} records)`)
}

main()
