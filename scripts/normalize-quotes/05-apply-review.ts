#!/usr/bin/env tsx
/**
 * Stage 4 (apply): fold a reviewed CSV back into the pools.
 *
 *   keep         mark reviewed_by_human, leave status and pool as they are.
 *                The doubt is real and stays recorded; the record just stops
 *                coming back in future review exports.
 *   drop         status -> rejected, move out of pending into
 *                _archive/rejected.yaml. Kept rather than deleted so a dropped
 *                quote is never silently re-imported later.
 *   reattribute  set the new author (from reattribute_to, else the validator's
 *                suggestion), re-key, record the change in notes, and mark
 *                reviewed. That clears the promotion bar, so the next
 *                quotes:promote routes it to the right file.
 *
 * Rows with a blank decision are skipped, so a partially-filled sheet is fine.
 * An unrecognised decision aborts before anything is written.
 *
 * Usage:
 *   tsx 05-apply-review.ts <review.csv> [--dry]
 */

import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import {
  ARCHIVE_DIR,
  PENDING_CSV_PATH,
  PENDING_JSONL_PATH,
  REJECTED_YAML_PATH,
  emitCollectiveFile,
  emitCsv,
  loadCheckpointResults,
  normalizeAuthorKey,
  parseCsv,
  parseYamlFile,
  readJsonlFile,
  type JsonlRecord,
} from './shared.js'

type Decision = 'keep' | 'drop' | 'reattribute'
const DECISIONS = new Set<Decision>(['keep', 'drop', 'reattribute'])

function main() {
  const argv = process.argv.slice(2)
  const dry = argv.includes('--dry')
  const csvPath = argv.find((a) => !a.startsWith('--'))

  if (!csvPath) {
    console.error('Usage: quotes:review-apply -- <review.csv> [--dry]')
    process.exit(1)
  }
  if (!statSync(csvPath, { throwIfNoEntry: false })) {
    console.error(`No such file: ${csvPath}`)
    process.exit(1)
  }

  const rows = parseCsv(readFileSync(csvPath, 'utf-8'))
  const pending = readJsonlFile(PENDING_JSONL_PATH)
  const byId = new Map(pending.map((r) => [r.id, r]))

  const suggestions = new Map<string, string>()
  for (const r of loadCheckpointResults()) {
    if (r.suggested_reattribution) suggestions.set(r.id, r.suggested_reattribution)
  }

  // Validate the whole sheet before writing anything.
  const problems: string[] = []
  const actions: Array<{ record: JsonlRecord; decision: Decision; newAuthor?: string }> = []

  for (const row of rows) {
    const decision = row.decision?.toLowerCase().trim()
    if (!decision) continue

    const record = byId.get(row.id)
    if (!record) { problems.push(`${row.id}: not in the pending pool`); continue }
    if (!DECISIONS.has(decision as Decision)) {
      problems.push(`${row.id}: unknown decision "${row.decision}" (expected keep | drop | reattribute)`)
      continue
    }

    if (decision === 'reattribute') {
      const newAuthor = row.reattribute_to?.trim() || suggestions.get(row.id) || ''
      if (!newAuthor) {
        problems.push(`${row.id}: reattribute with no reattribute_to and no suggestion on file`)
        continue
      }
      actions.push({ record, decision, newAuthor })
    } else {
      actions.push({ record, decision: decision as Decision })
    }
  }

  if (problems.length > 0) {
    console.error(`${problems.length} problem(s) — nothing written:`)
    for (const p of problems) console.error(`  ${p}`)
    process.exit(1)
  }
  if (actions.length === 0) {
    console.log('No decisions filled in. Nothing to do.')
    return
  }

  const rejected: JsonlRecord[] = []
  const updates = new Map<string, JsonlRecord>()

  for (const { record, decision, newAuthor } of actions) {
    const prov = record.provenance!

    if (decision === 'keep') {
      updates.set(record.id, { ...record, provenance: { ...prov, reviewed_by_human: true } })
      continue
    }

    if (decision === 'drop') {
      rejected.push({
        ...record,
        provenance: {
          ...prov,
          status: 'rejected',
          reviewed_by_human: true,
          notes: [prov.notes, 'Dropped in human review.'].filter(Boolean).join(' | '),
        },
      })
      continue
    }

    // reattribute
    updates.set(record.id, {
      ...record,
      author: newAuthor!,
      author_normalized_key: normalizeAuthorKey(newAuthor!),
      provenance: {
        ...prov,
        status: 'attributed',
        reviewed_by_human: true,
        notes: [prov.notes, `Reattributed from ${record.author} to ${newAuthor} in human review.`]
          .filter(Boolean)
          .join(' | '),
      },
    })
  }

  const rejectedIds = new Set(rejected.map((r) => r.id))
  const nextPending = pending
    .filter((r) => !rejectedIds.has(r.id))
    .map((r) => updates.get(r.id) ?? r)
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))

  // Merge into the existing tombstone rather than overwriting it.
  let archive = rejected
  if (statSync(REJECTED_YAML_PATH, { throwIfNoEntry: false })) {
    const existing = parseYamlFile(REJECTED_YAML_PATH, 'rejected')
    const incoming = new Set(rejected.map((r) => r.id))
    archive = [...existing.records.filter((r) => !incoming.has(r.id)), ...rejected]
  }

  const counts = {
    keep: actions.filter((a) => a.decision === 'keep').length,
    drop: actions.filter((a) => a.decision === 'drop').length,
    reattribute: actions.filter((a) => a.decision === 'reattribute').length,
  }

  console.log(`${dry ? '[DRY RUN] ' : ''}Applying ${actions.length} decision(s):`)
  console.log(`  keep         ${counts.keep}`)
  console.log(`  drop         ${counts.drop}  → _archive/rejected.yaml`)
  console.log(`  reattribute  ${counts.reattribute}`)
  for (const { record, decision, newAuthor } of actions) {
    if (decision === 'reattribute') console.log(`    ${record.id}: ${record.author} → ${newAuthor}`)
  }
  console.log()
  console.log(`Pending pool: ${pending.length} → ${nextPending.length}`)

  if (dry) {
    console.log('(--dry — no files written)')
    return
  }

  if (archive.length > 0) {
    mkdirSync(ARCHIVE_DIR, { recursive: true })
    writeFileSync(REJECTED_YAML_PATH, emitCollectiveFile('rejected', archive), 'utf-8')
    console.log(`✓ Written: ${REJECTED_YAML_PATH} (${archive.length} total)`)
  }

  const jsonl = nextPending.map((r) => JSON.stringify(r)).join('\n') + (nextPending.length > 0 ? '\n' : '')
  writeFileSync(PENDING_JSONL_PATH, jsonl, 'utf-8')
  writeFileSync(PENDING_CSV_PATH, emitCsv(nextPending), 'utf-8')
  console.log(`✓ Written: ${PENDING_JSONL_PATH}`)
  console.log()
  console.log(`Next: pnpm quotes:promote (reattributed records are now eligible)`)
}

main()
