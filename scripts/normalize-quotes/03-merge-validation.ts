#!/usr/bin/env tsx
/**
 * Stage 3 (merge): Write validation results from checkpoint file back into pending.jsonl.
 *
 * Separated from 02-validate-provenance.ts so a bad merge can be re-run without
 * re-spending API budget. Always checkpoint first, then merge.
 *
 * Usage:
 *   tsx 03-merge-validation.ts [--dry]
 *
 * Flags:
 *   --dry    Print what would change, don't write files
 */

import { writeFileSync, existsSync } from 'node:fs'
import {
  PENDING_JSONL_PATH,
  PENDING_CSV_PATH,
  VALIDATION_PROGRESS_PATH,
  loadCheckpointResults,
  readJsonlFile,
  emitCsv,
  validateResult,
  type JsonlRecord,
  type Provenance,
  type ValidationResult,
} from './shared.js'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function loadCheckpoint(): ValidationResult[] {
  if (!existsSync(VALIDATION_PROGRESS_PATH)) {
    throw new Error(
      `Checkpoint file not found: ${VALIDATION_PROGRESS_PATH}\n` +
        `Run quotes:checkpoint to queue quotes for validation first.`,
    )
  }
  return loadCheckpointResults()
}

function applyValidation(record: JsonlRecord, result: ValidationResult): JsonlRecord {
  const existing = record.provenance ?? ({} as Provenance)
  return {
    ...record,
    // If the record was suspect_misattributed and the model confirms it, note the suggestion
    author: result.suggested_reattribution
      ? record.author  // don't auto-reattribute; that's Stage 4
      : record.author,
    provenance: {
      status: result.status,
      confidence: result.confidence,
      wikiquote_url: result.wikiquote_url ?? existing.wikiquote_url ?? null,
      earliest_print_source: result.earliest_print_source ?? existing.earliest_print_source ?? null,
      notes: buildNotes(result, record),
      reviewed_by_human: existing.reviewed_by_human ?? false,
    },
  }
}

function buildNotes(result: ValidationResult, record: JsonlRecord): string | null {
  const parts: string[] = []
  if (result.notes) parts.push(result.notes)
  if (result.suggested_reattribution) parts.push(`Suggested reattribution: ${result.suggested_reattribution}`)
  // Preserve any prior suspect_reason if model didn't explain
  if (!result.notes && record.flags?.suspect_reason) parts.push(`Pre-flag: ${record.flags.suspect_reason}`)
  return parts.length > 0 ? parts.join(' | ') : null
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main() {
  const dry = process.argv.slice(2).includes('--dry')

  console.log(`Loading checkpoint from ${VALIDATION_PROGRESS_PATH}...`)
  const validationResults = loadCheckpoint()
  console.log(`Loaded ${validationResults.length} validation results`)

  // Build lookup map: id → result
  const resultMap = new Map<string, ValidationResult>()
  let invalidCount = 0
  for (const result of validationResults) {
    const errors = validateResult(result)
    if (errors.length > 0) {
      console.warn(`  Skipping ${result.id}: ${errors.join(', ')}`)
      invalidCount++
      continue
    }
    resultMap.set(result.id, result)
  }
  if (invalidCount > 0) {
    console.warn(`Skipped ${invalidCount} invalid results`)
  }

  console.log(`Loading pending.jsonl from ${PENDING_JSONL_PATH}...`)
  const pending = readJsonlFile(PENDING_JSONL_PATH)
  console.log(`Loaded ${pending.length} pending records`)

  // Apply validation results to matching records
  let matched = 0
  let unmatched = 0
  const statusChanges: Array<{ id: string; before: string; after: string; confidence: number }> = []

  const updated = pending.map((record) => {
    const result = resultMap.get(record.id)
    if (!result) {
      unmatched++
      return record
    }
    matched++
    const before = record.provenance?.status ?? '(none)'
    const after = result.status
    if (before !== after || record.provenance?.confidence == null) {
      statusChanges.push({ id: record.id, before, after, confidence: result.confidence })
    }
    return applyValidation(record, result)
  })

  console.log()
  console.log(`Matched: ${matched} records updated`)
  console.log(`Unmatched: ${unmatched} records left unchanged (not in checkpoint)`)
  console.log()

  // Show status change summary
  const byStatus = new Map<string, number>()
  for (const r of resultMap.values()) {
    byStatus.set(r.status, (byStatus.get(r.status) || 0) + 1)
  }
  console.log('Final status distribution (validated records):')
  for (const [status, count] of Array.from(byStatus).sort((a, b) => b[1] - a[1])) {
    const pct = ((count / matched) * 100).toFixed(1)
    console.log(`  ${status.padEnd(28)} ${String(count).padStart(5)}  (${pct}%)`)
  }
  console.log()

  // Show notable status transitions
  const flagged = statusChanges.filter(
    (c) => c.after === 'likely_misattributed' || c.after === 'apocryphal',
  )
  if (flagged.length > 0) {
    console.log(`Flagged as misattributed/apocryphal (${flagged.length}):`)
    for (const c of flagged.slice(0, 20)) {
      console.log(`  ${c.id}: ${c.before} → ${c.after} (confidence ${c.confidence.toFixed(2)})`)
    }
    if (flagged.length > 20) console.log(`  ... and ${flagged.length - 20} more`)
    console.log()
  }

  // Validate no records are left with null confidence after merge
  const stillNullConf = updated.filter((r) => r.provenance?.confidence == null).length
  if (stillNullConf > 0) {
    console.warn(`⚠ ${stillNullConf} records still have null confidence (not yet validated)`)
  } else {
    console.log('✓ All validated records now have non-null confidence')
  }
  console.log()

  if (dry) {
    console.log('[--dry] No files written.')
    return
  }

  // Write updated pending.jsonl
  const sorted = [...updated].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
  const jsonl = sorted.map((r) => JSON.stringify(r)).join('\n') + (sorted.length > 0 ? '\n' : '')
  writeFileSync(PENDING_JSONL_PATH, jsonl, 'utf-8')
  console.log(`✓ Written: ${PENDING_JSONL_PATH}`)

  // Regenerate CSV from updated jsonl
  writeFileSync(PENDING_CSV_PATH, emitCsv(sorted), 'utf-8')
  console.log(`✓ Written: ${PENDING_CSV_PATH}`)
  console.log()
  console.log(`Next: run quotes:promote to move high-confidence records into knowledge/quotes/*.yaml`)
}

main()
