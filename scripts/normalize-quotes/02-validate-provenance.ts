#!/usr/bin/env tsx
/**
 * Stage 3: Automated provenance validation using Claude Opus 4.7 with web search.
 *
 * Processes pending.jsonl in batches of 10 quotes, validating each via API call.
 * Checkpoints progress to validation-progress.jsonl for resilient restart.
 *
 * Usage:
 *   tsx 02-validate-provenance.ts [--pilot] [--resume]
 *
 * Flags:
 *   --pilot    Run on 50 records only (5 batches) for testing + tuning
 *   --resume   Skip batches already in validation-progress.jsonl
 */

import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'node:fs'
import { join } from 'node:path'
import Anthropic from '@anthropic-ai/sdk'
import {
  KNOWLEDGE_QUOTES_DIR,
  PENDING_JSONL_PATH,
  readJsonlFile,
  type JsonlRecord,
  type Status,
} from './shared.js'

// ─── Constants ──────────────────────────────────────────────────────────────

const VALIDATION_PROGRESS_PATH = join(KNOWLEDGE_QUOTES_DIR, '_source', 'validation-progress.jsonl')
const BATCH_SIZE = 10
const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY_MS = 1000

// Rough cost estimate per batch: input (~8K tokens × $3/1M) + output (~1K × $15/1M) + web search calls
const ESTIMATED_COST_PER_BATCH = 0.05

// ─── Types ──────────────────────────────────────────────────────────────────

export type ValidationResult = {
  id: string
  status: Status
  confidence: number
  wikiquote_url: string | null
  earliest_print_source: string | null
  notes: string | null
  suggested_reattribution?: string | null
}

type CheckpointEntry = {
  batch_num: number
  batch_size: number
  record_ids: string[]
  validated_at: string
  results: ValidationResult[]
}

// ─── Anthropic setup ────────────────────────────────────────────────────────

const client = new Anthropic()

/**
 * Format a batch of quotes into the validation prompt.
 * Explicit "I don't know" license + no fabricated citations rule.
 */
function buildValidationPrompt(batch: JsonlRecord[]): string {
  const quotesList = batch
    .map(
      (q, idx) => `
Quote ${idx + 1} (ID: ${q.id}):
  Text: "${q.text}"
  Author: "${q.author}"
  Category: "${q.category}"
  Source hint: ${q.source || '(none)'}
  Context: ${q.context || '(none)'}
  Pre-flagged suspect: ${q.flags?.suspect_misattribution ? 'YES — ' + q.flags.suspect_reason : 'no'}`,
    )
    .join('\n')

  return `You are a quote provenance validator. Use your training knowledge to assess each quote's true provenance.

For each quote below, determine its true provenance from what you know. Return your findings as a JSON array — one object per quote, in the same order.

**CRITICAL RULES:**
1. You MUST allow "I don't know" answers at low confidence. An old proverb with no traceable source deserves confidence 0.1–0.3 + status "attributed_unverified". Do NOT fabricate citations to appear more certain.
2. NEVER invent citations. If you cannot verify from your knowledge, say so in notes.
3. Reattributions MUST be based on knowledge you actually have (from Wikiquote, Quote Investigator, primary sources, or scholarly references you were trained on). If unsure, set suggested_reattribution to null.
4. Check your knowledge of common misattributions — Einstein, Gandhi, Churchill, Twain, and Lincoln are frequently misquoted. Many "deep" quotes attributed to philosophers are apocryphal.

**Status vocabulary (pick exactly one):**
- "verified" — primary source confirmed (specific book, speech, or document with date)
- "attributed" — strong secondary evidence (widely cited with consistent attribution)
- "attributed_unverified" — attribution exists but no strong evidence; uncertainty is honest
- "likely_misattributed" — evidence suggests wrong author; probable true origin identified
- "apocryphal" — no credible attribution possible; origin unknown or fabricated

**Confidence scale:**
- 0.9–1.0: Primary source verified
- 0.7–0.85: Strong secondary evidence
- 0.5–0.65: Some evidence, author plausible
- 0.3–0.45: Weak evidence, uncertain
- 0.1–0.25: No traceable source; "I don't know" is the honest answer

**Return format — a JSON array, nothing else before or after:**
\`\`\`json
[
  {
    "id": "q_XXXX",
    "status": "verified|attributed|attributed_unverified|likely_misattributed|apocryphal",
    "confidence": 0.0,
    "wikiquote_url": "https://en.wikiquote.org/..." or null,
    "earliest_print_source": "Title, Author, Year" or null,
    "notes": "Your reasoning — be specific about what you found or didn't find",
    "suggested_reattribution": "Correct author if known" or null
  }
]
\`\`\`

Quotes to validate:
${quotesList}

Remember: Return EXACTLY ${batch.length} objects in the JSON array, in the same order as the quotes above.`
}

/**
 * Parse the JSON array from Claude's response.
 * Handles markdown code fences and leading/trailing text.
 */
function parseValidationResponse(text: string, expectedCount: number): ValidationResult[] {
  // Try to extract from markdown code fence first
  const fenceMatch = text.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/)
  if (fenceMatch) {
    return JSON.parse(fenceMatch[1]) as ValidationResult[]
  }

  // Fall back to finding a JSON array directly
  const arrayMatch = text.match(/\[[\s\S]*\]/)
  if (arrayMatch) {
    return JSON.parse(arrayMatch[0]) as ValidationResult[]
  }

  throw new Error(`Could not parse ${expectedCount} results from response:\n${text.substring(0, 500)}`)
}

/**
 * Stream a single request to Claude with a heartbeat so the terminal shows progress.
 * Using streaming prevents the connection from timing out silently on slow responses.
 */
async function streamRequest(
  messages: Anthropic.MessageParam[],
  batchNum: number,
): Promise<Anthropic.Message> {
  const startMs = Date.now()

  // @ts-ignore — SDK ^0.68.0 types predate adaptive thinking
  const stream = client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'medium' },
    messages,
  })

  const heartbeat = setInterval(() => {
    const elapsed = Math.round((Date.now() - startMs) / 1000)
    process.stdout.write(`\r  [Batch ${batchNum}] Validating... ${elapsed}s`)
  }, 3000)

  try {
    const response = await stream.finalMessage()
    clearInterval(heartbeat)
    const elapsed = Math.round((Date.now() - startMs) / 1000)
    process.stdout.write(`\r  [Batch ${batchNum}] Done in ${elapsed}s          \n`)
    return response
  } catch (e) {
    clearInterval(heartbeat)
    throw e
  }
}

/**
 * Call Claude Sonnet 4.6 to validate a batch of quotes using training knowledge.
 */
async function validateBatch(batch: JsonlRecord[], batchNum: number): Promise<ValidationResult[]> {
  const prompt = buildValidationPrompt(batch)

  let lastError: Error | null = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      console.log(`  [Batch ${batchNum}] Attempt ${attempt + 1}/${MAX_RETRIES}...`)

      const messages: Anthropic.MessageParam[] = [{ role: 'user', content: prompt }]

      const response = await streamRequest(messages, batchNum)

      // Extract text from final response
      let responseText = ''
      for (const block of response.content) {
        if (block.type === 'text') responseText += block.text
      }

      const results = parseValidationResponse(responseText, batch.length)

      if (results.length !== batch.length) {
        throw new Error(`Expected ${batch.length} results, got ${results.length}`)
      }

      return results
    } catch (e) {
      lastError = e as Error
      if (attempt < MAX_RETRIES - 1) {
        const delayMs = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt)
        console.error(`  [Batch ${batchNum}] Error: ${lastError.message}`)
        console.log(`  [Batch ${batchNum}] Retrying in ${delayMs}ms...`)
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }
  }

  throw new Error(`Batch ${batchNum} failed after ${MAX_RETRIES} retries: ${lastError?.message}`)
}

/**
 * Read checkpoint file, returning a set of already-processed batch numbers.
 */
function readProcessedBatches(): Set<number> {
  if (!existsSync(VALIDATION_PROGRESS_PATH)) return new Set()
  const processed = new Set<number>()
  const raw = readFileSync(VALIDATION_PROGRESS_PATH, 'utf-8')
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue
    try {
      const entry = JSON.parse(line) as CheckpointEntry
      processed.add(entry.batch_num)
    } catch { /* skip unparseable lines */ }
  }
  return processed
}

/**
 * Append a checkpoint entry after successfully processing a batch.
 */
function checkpoint(batchNum: number, batch: JsonlRecord[], results: ValidationResult[]): void {
  const entry: CheckpointEntry = {
    batch_num: batchNum,
    batch_size: batch.length,
    record_ids: batch.map((r) => r.id),
    validated_at: new Date().toISOString(),
    results,
  }
  appendFileSync(VALIDATION_PROGRESS_PATH, JSON.stringify(entry) + '\n', 'utf-8')
}

/**
 * Load all results from checkpoint file.
 */
function loadCheckpointResults(): ValidationResult[] {
  if (!existsSync(VALIDATION_PROGRESS_PATH)) return []
  const results: ValidationResult[] = []
  const raw = readFileSync(VALIDATION_PROGRESS_PATH, 'utf-8')
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue
    try {
      const entry = JSON.parse(line) as CheckpointEntry
      results.push(...entry.results)
    } catch { /* skip unparseable lines */ }
  }
  return results
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  const pilotMode = args.includes('--pilot')
  const resumeMode = args.includes('--resume')

  console.log(`Loading pending quotes from ${PENDING_JSONL_PATH}...`)
  const allRecords = readJsonlFile(PENDING_JSONL_PATH)
  const targetRecords = pilotMode ? allRecords.slice(0, 50) : allRecords

  console.log(
    `Loaded ${allRecords.length} total records` +
    (pilotMode ? ` (pilot: processing first ${targetRecords.length})` : ` (processing all ${targetRecords.length})`),
  )

  const processed = resumeMode ? readProcessedBatches() : new Set<number>()
  if (resumeMode) console.log(`Resume mode: ${processed.size} batch(es) already processed`)

  // Partition into batches of BATCH_SIZE
  const batches: JsonlRecord[][] = []
  for (let i = 0; i < targetRecords.length; i += BATCH_SIZE) {
    batches.push(targetRecords.slice(i, i + BATCH_SIZE))
  }

  console.log(`\nProcessing ${batches.length} batch(es) of up to ${BATCH_SIZE} quotes each`)
  console.log(`Estimated API cost: ~$${(batches.length * ESTIMATED_COST_PER_BATCH).toFixed(2)}\n`)

  // Load any prior results
  const allResults: ValidationResult[] = resumeMode ? loadCheckpointResults() : []
  let totalEstimatedCost = 0

  for (let i = 0; i < batches.length; i++) {
    const batchNum = i

    if (resumeMode && processed.has(batchNum)) {
      console.log(`Skipping batch ${i + 1}/${batches.length} (already processed)`)
      continue
    }

    const batch = batches[i]
    console.log(`Processing batch ${i + 1}/${batches.length} (${batch.length} quote(s))...`)
    console.log(`  IDs: ${batch.map((r) => r.id).join(', ')}`)

    const results = await validateBatch(batch, i + 1)
    checkpoint(batchNum, batch, results)
    allResults.push(...results)
    totalEstimatedCost += ESTIMATED_COST_PER_BATCH

    // Show batch results
    const statuses = results.map((r) => `${r.id}=${r.status}(${r.confidence.toFixed(2)})`).join(', ')
    console.log(`  ✓ Done: ${statuses}`)
    console.log()
  }

  // ─── Summary ──────────────────────────────────────────────────────────────

  console.log(`${'='.repeat(60)}`)
  console.log(`Validation complete!`)
  console.log(`${'='.repeat(60)}`)
  console.log(`Records validated: ${allResults.length}`)
  console.log(`Estimated API cost: ~$${totalEstimatedCost.toFixed(2)}`)
  console.log()

  const distribution = new Map<Status, number>()
  for (const r of allResults) {
    distribution.set(r.status, (distribution.get(r.status) || 0) + 1)
  }
  console.log(`Status distribution:`)
  for (const [status, count] of Array.from(distribution).sort((a, b) => b[1] - a[1])) {
    const pct = ((count / allResults.length) * 100).toFixed(1)
    console.log(`  ${status.padEnd(28)} ${String(count).padStart(4)}  (${pct}%)`)
  }
  console.log()

  const confidences = allResults.map((r) => r.confidence).sort((a, b) => a - b)
  const median = confidences[Math.floor(confidences.length / 2)]
  console.log(
    `Confidence (min/median/max): ${confidences[0].toFixed(2)} / ${median.toFixed(2)} / ${confidences[confidences.length - 1].toFixed(2)}`,
  )

  const lowConf = allResults.filter((r) => r.confidence < 0.4).length
  console.log(`Low-confidence records (< 0.4): ${lowConf}`)
  console.log()
  console.log(`Checkpoint file: ${VALIDATION_PROGRESS_PATH}`)
  console.log(`Next step: run 03-merge-validation.ts to write results back to pending.jsonl`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
