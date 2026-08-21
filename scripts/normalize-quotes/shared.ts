/**
 * Shared types, constants, and helpers for the quote pipeline.
 *
 * Used by:
 *   - 01-jsonl-to-yaml.ts (split source jsonl into yaml + pending.jsonl)
 *   - 02b-checkpoint.ts (queue quotes for subagent validation, append verdicts)
 *   - 03-merge-validation.ts (write checkpointed verdicts into pending.jsonl)
 *   - lint.ts (validate both pools + cross-pool integrity)
 *   - 06-export-pending-csv.ts (regenerate CSV from JSONL)
 *   - 07-promote-verified.ts (move eligible records pending → yaml)
 */

import { existsSync, readFileSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import yaml from 'js-yaml'

// ─── Paths ──────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url))
export const REPO_ROOT = resolve(__dirname, '..', '..')
export const KNOWLEDGE_QUOTES_DIR = join(REPO_ROOT, 'knowledge', 'quotes')
export const SOURCE_JSONL_PATH = join(KNOWLEDGE_QUOTES_DIR, '_source', 'quotes_normalized.jsonl')
export const PENDING_DIR = join(REPO_ROOT, 'data', 'quotes-pending')
export const PENDING_JSONL_PATH = join(PENDING_DIR, 'pending.jsonl')
export const PENDING_CSV_PATH = join(PENDING_DIR, 'pending.csv')

/** Append-only ledger of validation results. The resume key for Stage 3. */
export const VALIDATION_PROGRESS_PATH = join(KNOWLEDGE_QUOTES_DIR, '_source', 'validation-progress.jsonl')
/** Raw per-batch agent output, kept as an audit trail alongside the ledger. */
export const VALIDATION_BATCHES_DIR = join(KNOWLEDGE_QUOTES_DIR, '_source', 'validation-batches')

// ─── Types ──────────────────────────────────────────────────────────────────

export type Status =
  | 'verified'
  | 'attributed'
  | 'attributed_unverified'
  | 'likely_misattributed'
  | 'apocryphal'
  | 'rejected'

export type Provenance = {
  status: Status
  confidence: number | null
  wikiquote_url: string | null
  earliest_print_source: string | null
  notes: string | null
  reviewed_by_human?: boolean
}

/** One quote's verdict from a Stage 3 validator (API driver or subagent). */
export type ValidationResult = {
  id: string
  status: Status
  confidence: number
  wikiquote_url: string | null
  earliest_print_source: string | null
  notes: string | null
  suggested_reattribution?: string | null
}

/** One line of validation-progress.jsonl. */
export type CheckpointEntry = {
  batch_num: number
  batch_size: number
  record_ids: string[]
  validated_at: string
  results: ValidationResult[]
}

export type JsonlRecord = {
  id: string
  text: string
  author: string
  author_normalized_key: string
  category: string
  keywords: string[]
  context: string | null
  favorite: boolean
  gender: 'M' | 'F' | null
  source: string | null
  flags: {
    suspect_misattribution: boolean
    suspect_reason: string | null
  } & Record<string, unknown>
  provenance?: Provenance
} & Record<string, unknown>

// ─── Status vocabularies ────────────────────────────────────────────────────

export const ALLOWED_STATUSES = new Set<Status>([
  'verified',
  'attributed',
  'attributed_unverified',
  'likely_misattributed',
  'apocryphal',
  'rejected',
])

/** Statuses whose records belong in knowledge/quotes/ (i.e. embeddable). */
export const EMBEDDABLE_STATUSES = new Set<Status>(['verified', 'attributed'])

/** Confidence ≥ this auto-promotes a Stage-3-validated pending record. */
export const PROMOTION_CONFIDENCE_THRESHOLD = 0.8

export function isEmbeddable(record: JsonlRecord): boolean {
  return EMBEDDABLE_STATUSES.has(record.provenance?.status as Status)
}

export function meetsPromotionBar(record: JsonlRecord): boolean {
  if (!isEmbeddable(record)) return false
  if (record.provenance?.reviewed_by_human === true) return true
  const c = record.provenance?.confidence
  return typeof c === 'number' && c >= PROMOTION_CONFIDENCE_THRESHOLD
}

// ─── Routing (Decision 2) ───────────────────────────────────────────────────

export const COLLECTIVE_BUCKETS = new Set(['proverbs', 'attributed-collectives', 'anonymous'])

export const COLLECTIVE_DESCRIPTIONS: Record<string, string> = {
  proverbs: 'Traditional sayings (proverbs, sayings, aphorisms). Author preserved per-quote.',
  'attributed-collectives': 'Quotes attributed to a named collective source (Delphic maxim, Yoga Sutras, …). Author preserved per-quote.',
  anonymous: 'Quotes whose author is unknown. Partial info preserved per-quote where available.',
}

export function routeAuthor(author: string, normalizedKey: string): { bucket: string; isCollective: boolean } {
  const a = author.trim()
  if (/^(anonymous|unknown)\b/i.test(a)) return { bucket: 'anonymous', isCollective: true }
  if (/\b(proverbs?|sayings?|aphorisms?)\b/i.test(a)) return { bucket: 'proverbs', isCollective: true }
  if (/\b(maxims?|sutras?|edicts?|hadiths?|inscriptions?|adages?|vedas?|upanishads?|gita|dhammapada|gospels?|bible|psalms?|sermons?|qur.?an|torah|talmud|tao te|i ching)\b/i.test(a)) return { bucket: 'attributed-collectives', isCollective: true }
  return { bucket: normalizedKey, isCollective: false }
}

// ─── Tradition synthesis ────────────────────────────────────────────────────

const TRADITION_RULES: Array<[RegExp, string]> = [
  [/buddhi|zen|tibetan|theravada|mahayana/i, 'buddhism'],
  [/stoic/i, 'stoicism'],
  [/sufi/i, 'sufism'],
  [/tao/i, 'taoism'],
  [/hindu|vedic|nondual|advaita|upanish|\byog/i, 'vedic'],
  [/indigenous|hopi|lakota|navajo|cherokee|zulu|aborigin/i, 'indigenous'],
  [/philosoph|socratic|platonic|aristot/i, 'philosophy'],
  [/ecolog|naturalist|environmental/i, 'ecology'],
  [/scien|physic|biolog|chemis/i, 'science'],
  [/psycholog/i, 'psychology'],
  [/poet|literatur|novelist|playwright/i, 'literature'],
  [/artist|\bart\b|photograph|painter|sculpt/i, 'art'],
  [/engineer|architect|design/i, 'engineering'],
  [/\bai\b|machine learning|artificial intelligence/i, 'ai'],
]

export function synthesizeTradition(context: string | null): string | null {
  if (!context) return null
  for (const [pattern, tradition] of TRADITION_RULES) {
    if (pattern.test(context)) return tradition
  }
  return null
}

// ─── Pre-classification (Decision 3) ────────────────────────────────────────

export function preclassifyStatus(record: JsonlRecord): Status {
  if (record.flags?.suspect_misattribution === true) return 'likely_misattributed'
  if (record.source != null && record.source !== '') return 'attributed'
  return 'attributed_unverified'
}

/**
 * Apply pre-classification + populate provenance fields from Tier 1 hints.
 * If the record already carries an in-vocabulary status, preserve it.
 */
export function withPreclassifiedProvenance(record: JsonlRecord): JsonlRecord {
  const existing = record.provenance ?? ({} as Provenance)
  const status = ALLOWED_STATUSES.has(existing.status as Status)
    ? (existing.status as Status)
    : preclassifyStatus(record)
  return {
    ...record,
    provenance: {
      status,
      confidence: existing.confidence ?? null,
      wikiquote_url: existing.wikiquote_url ?? null,
      earliest_print_source: existing.earliest_print_source ?? record.source ?? null,
      notes: existing.notes ?? record.flags?.suspect_reason ?? null,
      reviewed_by_human: existing.reviewed_by_human ?? false,
    },
  }
}

// ─── YAML emit ──────────────────────────────────────────────────────────────

const YAML_NEEDS_QUOTING = /[:#@%`{}\[\]|>*&!?,'"\n\\\t]|^[\s-]|[\s]$|^(true|false|null|yes|no|on|off|~)$|^-?\d+(\.\d+)?$/i

export function yamlScalar(v: unknown): string {
  if (v === null || v === undefined) return 'null'
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (typeof v === 'number') return String(v)
  const s = String(v)
  if (s === '') return '""'
  if (YAML_NEEDS_QUOTING.test(s)) return JSON.stringify(s)
  return s
}

export function yamlArray(items: unknown[]): string {
  if (items.length === 0) return '[]'
  return '[' + items.map(yamlScalar).join(', ') + ']'
}

function compareIds(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true })
}

export function emitQuoteBlock(record: JsonlRecord, includeAuthor: boolean): string {
  const enriched = withPreclassifiedProvenance(record)
  const p = enriched.provenance!
  const lines: string[] = []

  lines.push(`  - id: ${yamlScalar(enriched.id)}`)
  lines.push(`    slug: null`)
  lines.push(`    text: ${yamlScalar(enriched.text)}`)
  if (includeAuthor) {
    lines.push(`    author: ${yamlScalar(enriched.author)}`)
    lines.push(`    author_normalized_key: ${yamlScalar(enriched.author_normalized_key)}`)
    lines.push(`    tradition: ${yamlScalar(synthesizeTradition(enriched.context))}`)
    lines.push(`    era: null`)
    lines.push(`    gender: ${yamlScalar(enriched.gender)}`)
  }
  lines.push(`    category: ${yamlScalar(enriched.category)}`)
  lines.push(`    keywords: ${yamlArray(enriched.keywords ?? [])}`)
  lines.push(`    context: ${yamlScalar(enriched.context)}`)
  lines.push(`    favorite: ${yamlScalar(enriched.favorite)}`)
  lines.push(`    source_work: null`)
  lines.push(`    source_section: null`)
  lines.push(`    provenance:`)
  lines.push(`      status: ${yamlScalar(p.status)}`)
  lines.push(`      confidence: ${yamlScalar(p.confidence)}`)
  lines.push(`      wikiquote_url: ${yamlScalar(p.wikiquote_url)}`)
  lines.push(`      earliest_print_source: ${yamlScalar(p.earliest_print_source)}`)
  lines.push(`      notes: ${yamlScalar(p.notes)}`)
  lines.push(`      reviewed_by_human: ${yamlScalar(p.reviewed_by_human ?? false)}`)
  return lines.join('\n')
}

export function emitPersonFile(records: JsonlRecord[]): string {
  const sorted = [...records].sort((a, b) => compareIds(a.id, b.id))
  const sample = sorted[0]
  const lines: string[] = []
  lines.push(`author: ${yamlScalar(sample.author)}`)
  lines.push(`author_normalized_key: ${yamlScalar(sample.author_normalized_key)}`)
  lines.push(`tradition: ${yamlScalar(synthesizeTradition(sample.context))}`)
  lines.push(`era: null`)
  lines.push(`gender: ${yamlScalar(sample.gender)}`)
  lines.push(`quotes:`)
  for (const r of sorted) lines.push(emitQuoteBlock(r, false))
  return lines.join('\n') + '\n'
}

export function emitCollectiveFile(bucket: string, records: JsonlRecord[]): string {
  const sorted = [...records].sort((a, b) => compareIds(a.id, b.id))
  const lines: string[] = []
  lines.push(`collective: ${yamlScalar(bucket)}`)
  lines.push(`description: ${yamlScalar(COLLECTIVE_DESCRIPTIONS[bucket])}`)
  lines.push(`quotes:`)
  for (const r of sorted) lines.push(emitQuoteBlock(r, true))
  return lines.join('\n') + '\n'
}

// ─── YAML read (round-trip for promote/demote) ──────────────────────────────

export type ParsedYamlFile = {
  isCollective: boolean
  bucket: string
  records: JsonlRecord[]
}

/**
 * Parse a knowledge/quotes/*.yaml file back into JsonlRecord-shaped objects.
 * Person files inject file-level author/gender into each quote so output
 * records are self-contained and can be re-emitted through emitPersonFile().
 */
export function parseYamlFile(path: string, bucket: string): ParsedYamlFile {
  const raw = readFileSync(path, 'utf-8')
  const parsed = yaml.load(raw) as any
  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`${path}: yaml parse returned non-object`)
  }

  const isCollective = COLLECTIVE_BUCKETS.has(bucket) || parsed.collective != null
  const quotes = (parsed.quotes ?? []) as any[]

  const records: JsonlRecord[] = quotes.map((q) => {
    if (isCollective) return q as JsonlRecord
    return {
      ...q,
      author: parsed.author,
      author_normalized_key: parsed.author_normalized_key,
      gender: parsed.gender,
      // Inject the file-level tradition so downstream (constellation generator,
      // embed pipeline) sees each quote in its author's tradition rather than
      // falling back to 'uncategorized'.
      tradition: parsed.tradition,
    } as JsonlRecord
  })

  return { isCollective, bucket, records }
}

// ─── CSV emit ───────────────────────────────────────────────────────────────

export const PENDING_CSV_COLUMNS = [
  'id',
  'author',
  'author_normalized_key',
  'text',
  'category',
  'keywords',
  'context',
  'favorite',
  'source',
  'status',
  'confidence',
  'wikiquote_url',
  'earliest_print_source',
  'notes',
  'reviewed_by_human',
  'suspect_reason',
] as const

export function csvCell(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v)) return csvCell(v.join('; '))
  const s = String(v)
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
  return s
}

export function emitCsvHeader(): string {
  return PENDING_CSV_COLUMNS.join(',') + '\n'
}

export function emitCsvRow(record: JsonlRecord): string {
  const p = record.provenance ?? ({} as Provenance)
  const cells = [
    record.id,
    record.author,
    record.author_normalized_key,
    record.text,
    record.category,
    record.keywords,
    record.context,
    record.favorite,
    record.source,
    p.status,
    p.confidence,
    p.wikiquote_url,
    p.earliest_print_source,
    p.notes,
    p.reviewed_by_human,
    record.flags?.suspect_reason,
  ]
  return cells.map(csvCell).join(',') + '\n'
}

export function emitCsv(records: JsonlRecord[]): string {
  return emitCsvHeader() + records.map(emitCsvRow).join('')
}

// ─── Checkpoint IO ──────────────────────────────────────────────────────────

/**
 * Structural check on one validator verdict. Cheap and total — it catches the
 * failure modes that actually occur (missing id, status outside the vocabulary,
 * confidence that isn't a 0–1 number) before anything reaches pending.jsonl.
 */
export function validateResult(r: ValidationResult): string[] {
  const errors: string[] = []
  if (!r.id) errors.push('missing id')
  if (!ALLOWED_STATUSES.has(r.status)) errors.push(`invalid status: ${r.status}`)
  if (typeof r.confidence !== 'number' || Number.isNaN(r.confidence) || r.confidence < 0 || r.confidence > 1) {
    errors.push(`invalid confidence: ${r.confidence}`)
  }
  return errors
}

/** Every checkpoint line, in file order. Unparseable lines are reported, not fatal. */
export function loadCheckpointEntries(path: string = VALIDATION_PROGRESS_PATH): CheckpointEntry[] {
  if (!existsSync(path)) return []
  const entries: CheckpointEntry[] = []
  const raw = readFileSync(path, 'utf-8')
  raw.split('\n').forEach((line, idx) => {
    if (!line.trim()) return
    try {
      entries.push(JSON.parse(line) as CheckpointEntry)
    } catch (e) {
      console.warn(`${path}: skipping unparseable line ${idx + 1}: ${(e as Error).message}`)
    }
  })
  return entries
}

/** Flattened verdicts across all checkpoint entries. */
export function loadCheckpointResults(path: string = VALIDATION_PROGRESS_PATH): ValidationResult[] {
  return loadCheckpointEntries(path).flatMap((e) => e.results ?? [])
}

/**
 * IDs that already have a verdict on disk. This — not batch_num — is the resume
 * key, so tranches can be run in any order, at any batch size, across sessions.
 */
export function checkpointedIds(path: string = VALIDATION_PROGRESS_PATH): Set<string> {
  return new Set(loadCheckpointResults(path).map((r) => r.id))
}

// ─── Source IO ──────────────────────────────────────────────────────────────

export function readJsonlFile(path: string): JsonlRecord[] {
  const raw = readFileSync(path, 'utf-8')
  return raw.split('\n').filter(Boolean).map((line, idx) => {
    try {
      return JSON.parse(line) as JsonlRecord
    } catch (e) {
      throw new Error(`${path}: failed to parse line ${idx + 1}: ${e}`)
    }
  })
}
