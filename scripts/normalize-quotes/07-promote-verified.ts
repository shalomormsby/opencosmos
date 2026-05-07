#!/usr/bin/env tsx
/**
 * Promote eligible records from pending.jsonl into knowledge/quotes/*.yaml.
 *
 * Eligibility (see shared.meetsPromotionBar):
 *   status ∈ {verified, attributed} AND
 *   (confidence ≥ 0.8 OR reviewed_by_human = true)
 *
 * For each eligible record:
 *   1. Determine target yaml file via routeAuthor.
 *   2. Load existing yaml (if any), append the new record, re-emit sorted.
 *   3. Remove the record from pending.jsonl.
 *
 * Flags:
 *   --dry        Print what would promote, don't write.
 */

import { statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  COLLECTIVE_BUCKETS,
  KNOWLEDGE_QUOTES_DIR,
  PENDING_CSV_PATH,
  PENDING_JSONL_PATH,
  emitCollectiveFile,
  emitCsv,
  emitPersonFile,
  meetsPromotionBar,
  parseYamlFile,
  readJsonlFile,
  routeAuthor,
  type JsonlRecord,
} from './shared.js'

function main() {
  const dry = process.argv.slice(2).some((a) => a === '--dry' || a === '--dry-run')

  if (!statSync(PENDING_JSONL_PATH, { throwIfNoEntry: false })) {
    console.error(`Pending pool missing: ${PENDING_JSONL_PATH}`)
    process.exit(1)
  }

  const pending = readJsonlFile(PENDING_JSONL_PATH)

  // Partition: eligible vs stay-pending
  const eligible: JsonlRecord[] = []
  const remain: JsonlRecord[] = []
  for (const r of pending) {
    if (meetsPromotionBar(r)) eligible.push(r)
    else remain.push(r)
  }

  if (eligible.length === 0) {
    console.log(`No records meet the promotion bar. ${pending.length} remain pending.`)
    return
  }

  // Group eligible records by target bucket
  const byBucket = new Map<string, { isCollective: boolean; records: JsonlRecord[] }>()
  for (const r of eligible) {
    const { bucket, isCollective } = routeAuthor(r.author, r.author_normalized_key)
    const group = byBucket.get(bucket) ?? { isCollective, records: [] }
    group.records.push(r)
    byBucket.set(bucket, group)
  }

  // Per-bucket: merge with existing yaml + re-emit
  const summary: Array<{ bucket: string; existing: number; added: number; final: number }> = []
  for (const [bucket, { isCollective, records: newRecords }] of byBucket) {
    const yamlPath = join(KNOWLEDGE_QUOTES_DIR, `${bucket}.yaml`)
    const exists = statSync(yamlPath, { throwIfNoEntry: false })

    let combined: JsonlRecord[]
    let existingCount = 0
    if (exists) {
      const parsed = parseYamlFile(yamlPath, bucket)
      existingCount = parsed.records.length
      // Dedupe by id — promoted record with same id replaces existing
      const newIds = new Set(newRecords.map((r) => r.id))
      const kept = parsed.records.filter((r) => !newIds.has(r.id))
      combined = [...kept, ...newRecords]
    } else {
      combined = newRecords
    }

    const yaml = isCollective || COLLECTIVE_BUCKETS.has(bucket)
      ? emitCollectiveFile(bucket, combined)
      : emitPersonFile(combined)

    if (!dry) writeFileSync(yamlPath, yaml, 'utf-8')

    summary.push({ bucket, existing: existingCount, added: newRecords.length, final: combined.length })
  }

  // Write updated pending pool
  if (!dry) {
    const sortedRemain = [...remain].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
    const jsonl = sortedRemain.map((r) => JSON.stringify(r)).join('\n') + (sortedRemain.length > 0 ? '\n' : '')
    writeFileSync(PENDING_JSONL_PATH, jsonl, 'utf-8')
    writeFileSync(PENDING_CSV_PATH, emitCsv(sortedRemain), 'utf-8')
  }

  console.log(`${dry ? '[DRY RUN] ' : ''}Promoted ${eligible.length} record(s):`)
  for (const s of summary.sort((a, b) => a.bucket.localeCompare(b.bucket))) {
    console.log(`  ${s.bucket.padEnd(40)} +${s.added} (was ${s.existing}, now ${s.final})`)
  }
  console.log()
  console.log(`Pending pool: ${pending.length} → ${remain.length} (${eligible.length} promoted)`)
  if (dry) console.log(`(--dry — no files written)`)
}

main()
