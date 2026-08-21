#!/usr/bin/env tsx
/**
 * Stage 3 (subagent driver): queue pending quotes for validation and collect
 * the verdicts.
 *
 * This replaces 02-validate-provenance.ts as the way Stage 3 is actually run.
 * That script drove the Anthropic API directly and cost ~$20 for 10 quotes once
 * web search and high effort compounded; validating the remaining backlog that
 * way would have run to four figures. Claude Code subagents do the same work
 * under the subscription, so this script does everything *except* the model
 * call: it decides what still needs validating, hands out batches, and takes
 * verdicts back.
 *
 * The checkpoint format is unchanged, so 03-merge-validation.ts consumes the
 * output of either driver without knowing which produced it.
 *
 * Usage:
 *   tsx 02b-checkpoint.ts remaining [--write-batches] [--limit N] [--batch-size N] [--json]
 *   tsx 02b-checkpoint.ts append <file.output.json | --all>
 *   tsx 02b-checkpoint.ts status
 *
 * Typical tranche:
 *   pnpm quotes:checkpoint remaining --write-batches --limit 300
 *   …fan out one subagent per batch file, each writing its .output.json…
 *   pnpm quotes:checkpoint append --all
 *   pnpm quotes:merge && pnpm quotes:promote && pnpm quotes:lint
 */

import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import {
  PENDING_JSONL_PATH,
  VALIDATION_BATCHES_DIR,
  VALIDATION_PROGRESS_PATH,
  checkpointedIds,
  loadCheckpointEntries,
  readJsonlFile,
  validateResult,
  type CheckpointEntry,
  type JsonlRecord,
  type ValidationResult,
} from './shared.js'

const DEFAULT_BATCH_SIZE = 25

// ─── Args ───────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2)
const command = argv[0]
const has = (flag: string) => argv.includes(flag)
function numArg(flag: string, fallback: number): number {
  const i = argv.indexOf(flag)
  if (i === -1) return fallback
  const n = Number(argv[i + 1])
  if (!Number.isFinite(n) || n <= 0) throw new Error(`${flag} needs a positive number`)
  return Math.floor(n)
}

// ─── Shared selection logic ─────────────────────────────────────────────────

/**
 * A quote still needs validating if it has no confidence recorded *and* no
 * verdict already sitting in the checkpoint. Reading the answer off the
 * checkpoint (rather than a batch counter) is what makes this resumable: any
 * tranche can be re-run, resized, or abandoned midway without bookkeeping.
 */
function selectRemaining(): JsonlRecord[] {
  const pending = readJsonlFile(PENDING_JSONL_PATH)
  const done = checkpointedIds()
  return pending.filter((r) => r.provenance?.confidence == null && !done.has(r.id))
}

/** The fields a validator needs — deliberately not the whole record. */
function toPrompt(r: JsonlRecord) {
  return {
    id: r.id,
    text: r.text,
    author: r.author,
    category: r.category,
    source_hint: r.source ?? null,
    context: r.context ?? null,
    pre_flagged_suspect: r.flags?.suspect_misattribution === true ? (r.flags.suspect_reason ?? true) : false,
  }
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

function batchStem(batch: JsonlRecord[]): string {
  return `batch-${batch[0].id}-${batch[batch.length - 1].id}`
}

// ─── remaining ──────────────────────────────────────────────────────────────

function cmdRemaining(): void {
  const batchSize = numArg('--batch-size', DEFAULT_BATCH_SIZE)
  const limit = numArg('--limit', Number.MAX_SAFE_INTEGER)
  const all = selectRemaining()
  const selected = all.slice(0, limit)
  const batches = chunk(selected, batchSize)

  if (has('--json')) {
    console.log(
      JSON.stringify(
        {
          total_remaining: all.length,
          selected: selected.length,
          batch_size: batchSize,
          batches: batches.map((b) => ({ stem: batchStem(b), quotes: b.map(toPrompt) })),
        },
        null,
        2,
      ),
    )
    return
  }

  console.log(`Remaining to validate: ${all.length}`)
  if (all.length === 0) {
    console.log('Nothing queued — every pending record already has a verdict.')
    return
  }
  console.log(`This tranche:          ${selected.length} across ${batches.length} batch(es) of ${batchSize}`)

  if (!has('--write-batches')) {
    console.log()
    console.log('Add --write-batches to write the input files a subagent fan-out reads.')
    return
  }

  mkdirSync(VALIDATION_BATCHES_DIR, { recursive: true })
  console.log()
  for (const batch of batches) {
    const stem = batchStem(batch)
    const inputPath = join(VALIDATION_BATCHES_DIR, `${stem}.input.json`)
    writeFileSync(inputPath, JSON.stringify({ stem, quotes: batch.map(toPrompt) }, null, 2) + '\n', 'utf-8')
    console.log(`  ${stem}  (${batch.length})`)
  }
  console.log()
  console.log(`Wrote ${batches.length} input file(s) to ${VALIDATION_BATCHES_DIR}`)
  console.log(`Each subagent reads <stem>.input.json and writes <stem>.output.json.`)
  console.log(`Then: pnpm quotes:checkpoint append --all`)
}

// ─── append ─────────────────────────────────────────────────────────────────

function nextBatchNum(): number {
  const entries = loadCheckpointEntries()
  return entries.reduce((max, e) => Math.max(max, e.batch_num ?? -1), -1) + 1
}

/**
 * Take one agent's output file into the checkpoint.
 *
 * A file is all-or-nothing: if any verdict in it is malformed or names a quote
 * that isn't pending, nothing from that file is written and the batch is left
 * queued for a re-run. A partially-good batch is not worth the ambiguity of a
 * partially-written checkpoint.
 *
 * Verdicts for quotes already checkpointed are dropped rather than duplicated,
 * which makes re-appending the same file a no-op.
 */
function appendFile(path: string, pendingIds: Set<string>, done: Set<string>): boolean {
  const label = basename(path)
  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(path, 'utf-8'))
  } catch (e) {
    console.error(`  ✗ ${label}: not valid JSON — ${(e as Error).message}`)
    return false
  }

  // Accept either a bare array or { results: [...] }.
  const results = (Array.isArray(parsed) ? parsed : (parsed as { results?: unknown })?.results) as
    | ValidationResult[]
    | undefined
  if (!Array.isArray(results)) {
    console.error(`  ✗ ${label}: expected a JSON array of verdicts (or {results: [...]})`)
    return false
  }

  const problems: string[] = []
  for (const r of results) {
    const errs = validateResult(r)
    if (errs.length) problems.push(`${r?.id ?? '(no id)'}: ${errs.join(', ')}`)
    else if (!pendingIds.has(r.id)) problems.push(`${r.id}: not in the pending pool`)
  }
  if (problems.length) {
    console.error(`  ✗ ${label}: ${problems.length} bad verdict(s), file skipped`)
    for (const p of problems.slice(0, 5)) console.error(`      ${p}`)
    if (problems.length > 5) console.error(`      … and ${problems.length - 5} more`)
    return false
  }

  const fresh = results.filter((r) => !done.has(r.id))
  const dupes = results.length - fresh.length
  if (fresh.length === 0) {
    console.log(`  · ${label}: all ${results.length} already checkpointed, nothing to do`)
    return true
  }

  const entry: CheckpointEntry = {
    batch_num: nextBatchNum(),
    batch_size: fresh.length,
    record_ids: fresh.map((r) => r.id),
    validated_at: new Date().toISOString(),
    results: fresh,
  }
  appendFileSync(VALIDATION_PROGRESS_PATH, JSON.stringify(entry) + '\n', 'utf-8')
  for (const r of fresh) done.add(r.id)
  console.log(`  ✓ ${label}: +${fresh.length}${dupes ? ` (${dupes} already present)` : ''}`)
  return true
}

function cmdAppend(): void {
  const pendingIds = new Set(readJsonlFile(PENDING_JSONL_PATH).map((r) => r.id))
  const done = checkpointedIds()

  let files: string[]
  if (has('--all')) {
    if (!existsSync(VALIDATION_BATCHES_DIR)) throw new Error(`No batch directory: ${VALIDATION_BATCHES_DIR}`)
    files = readdirSync(VALIDATION_BATCHES_DIR)
      .filter((f) => f.endsWith('.output.json'))
      .sort()
      .map((f) => join(VALIDATION_BATCHES_DIR, f))
    if (files.length === 0) throw new Error(`No *.output.json files in ${VALIDATION_BATCHES_DIR}`)
  } else {
    const path = argv[1]
    if (!path) throw new Error('append needs a file path, or --all')
    if (!existsSync(path)) throw new Error(`No such file: ${path}`)
    files = [path]
  }

  console.log(`Appending ${files.length} file(s) to the checkpoint...`)
  let ok = 0
  let failed = 0
  for (const f of files) (appendFile(f, pendingIds, done) ? ok++ : failed++)

  console.log()
  console.log(`${ok} file(s) accepted, ${failed} rejected.`)
  if (failed > 0) {
    console.log(`Rejected batches stay queued — re-run those agents and append again.`)
  }
  console.log(`Next: pnpm quotes:merge --dry`)
  if (failed > 0) process.exitCode = 1
}

// ─── status ─────────────────────────────────────────────────────────────────

function cmdStatus(): void {
  const pending = readJsonlFile(PENDING_JSONL_PATH)
  const done = checkpointedIds()
  const remaining = selectRemaining().length
  const results = loadCheckpointEntries().flatMap((e) => e.results ?? [])

  // A verdict is unmerged only if its quote is still sitting in the pending pool
  // with no confidence. Quotes that were merged and then promoted have left the
  // pool entirely, and must not be counted as outstanding work.
  const pendingUnvalidated = new Set(
    pending.filter((r) => r.provenance?.confidence == null).map((r) => r.id),
  )
  const unmerged = [...done].filter((id) => pendingUnvalidated.has(id)).length
  const validated = pending.filter((r) => r.provenance?.confidence != null).length

  const row = (label: string, value: number) => console.log(`  ${label.padEnd(22)}${String(value).padStart(6)}`)
  row('Pending pool', pending.length)
  row('  validated', validated)
  row('  awaiting validation', remaining)
  row('Checkpointed verdicts', done.size)

  if (unmerged > 0) {
    console.log()
    console.log(`⚠ ${unmerged} verdict(s) checkpointed but not merged — run pnpm quotes:merge`)
  }

  if (results.length > 0) {
    const byStatus = new Map<string, number>()
    for (const r of results) byStatus.set(r.status, (byStatus.get(r.status) ?? 0) + 1)
    console.log()
    console.log('Verdicts so far:')
    for (const [status, count] of Array.from(byStatus).sort((a, b) => b[1] - a[1])) {
      const pct = ((count / results.length) * 100).toFixed(1)
      console.log(`  ${status.padEnd(24)} ${String(count).padStart(5)}  (${pct}%)`)
    }
    const conf = results.map((r) => r.confidence).sort((a, b) => a - b)
    console.log()
    console.log(
      `Confidence min/median/max: ${conf[0].toFixed(2)} / ${conf[Math.floor(conf.length / 2)].toFixed(2)} / ${conf[conf.length - 1].toFixed(2)}`,
    )
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

const COMMANDS: Record<string, () => void> = {
  remaining: cmdRemaining,
  append: cmdAppend,
  status: cmdStatus,
}

const run = COMMANDS[command ?? '']
if (!run) {
  console.error(`Usage: quotes:checkpoint <remaining|append|status> [flags]`)
  console.error(`  remaining [--write-batches] [--limit N] [--batch-size N] [--json]`)
  console.error(`  append <file.output.json | --all>`)
  console.error(`  status`)
  process.exit(1)
}

try {
  run()
} catch (e) {
  console.error(`Error: ${(e as Error).message}`)
  process.exit(1)
}
