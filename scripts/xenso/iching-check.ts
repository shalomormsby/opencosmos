#!/usr/bin/env tsx
/**
 * Verification for the cast engine and the hexagram table.
 *
 * The monorepo has no test runner, so this follows the scripts/test-cosmo-voice.ts
 * precedent: a script you run, that prints, and that exits non-zero when it should.
 *
 *   pnpm xenso:check-iching
 *
 * The King Wen sequence has a structural invariant that makes the table
 * self-checking: consecutive pairs (1,2), (3,4) … (63,64) are each other's
 * inversions — the same figure turned upside down — except for the eight
 * figures that are their own inversion, which pair by complement instead. A
 * single transposed row breaks it. That check is worth more than proofreading.
 */

import {
  cast,
  castLine,
  figureToNumber,
  fromCoins,
  hexagram,
  linesToFigure,
  linesToRelatingFigure,
  movingLines,
  resolve,
  trigramsOf,
  type CoinThrow,
  type LineValue,
} from '../../apps/web/lib/iching'
import { HEXAGRAMS, HEXAGRAM_BY_FIGURE, TRIGRAMS } from '../../apps/web/lib/iching-data'

let failures = 0
const fail = (m: string) => {
  console.log(`  ✗ ${m}`)
  failures++
}
const pass = (m: string) => console.log(`  ✓ ${m}`)

const invert = (s: string) => [...s].reverse().join('')
const complement = (s: string) => [...s].map(c => (c === '1' ? '0' : '1')).join('')

console.log('\nhexagram table')

// Bijection: 64 rows, all distinct, covering every six-line figure.
{
  const figures = new Set(HEXAGRAMS.map(h => h.figure))
  if (HEXAGRAMS.length !== 64) fail(`expected 64 hexagrams, got ${HEXAGRAMS.length}`)
  else if (figures.size !== 64) fail(`figures are not distinct: ${figures.size} unique`)
  else {
    const missing = Array.from({ length: 64 }, (_, n) => n.toString(2).padStart(6, '0')).filter(b => !figures.has(b))
    if (missing.length) fail(`figures absent from the sequence: ${missing.join(', ')}`)
    else pass('64 distinct figures, covering all 64 — bijection holds')
  }
}

// The King Wen pair invariant.
{
  const selfInverse: number[] = []
  for (let k = 0; k < 32; k++) {
    const a = HEXAGRAMS[2 * k]
    const b = HEXAGRAMS[2 * k + 1]
    if (invert(a.figure) === a.figure) {
      selfInverse.push(a.number, b.number)
      if (complement(a.figure) !== b.figure)
        fail(`pair ${a.number}/${b.number} (${a.chinese}/${b.chinese}): self-inverse but not complements`)
    } else if (invert(a.figure) !== b.figure) {
      fail(`pair ${a.number}/${b.number} (${a.chinese}/${b.chinese}): ${a.figure} inverts to ${invert(a.figure)}, not ${b.figure}`)
    }
  }
  const expected = '1,2,27,28,29,30,61,62'
  if (selfInverse.join() !== expected) fail(`self-inverse set is ${selfInverse.join()}, expected ${expected}`)
  else if (!failures) pass('all 32 King Wen pairs invert or complement; the 8 self-inverse figures are the known ones')
}

// Trigram decomposition agrees with the figure.
{
  let bad = 0
  for (const h of HEXAGRAMS) {
    const { lower, upper } = trigramsOf(h.number)
    if (lower.figure + upper.figure !== h.figure) {
      fail(`hexagram ${h.number} ${h.chinese}: trigrams ${lower.figure}+${upper.figure} ≠ ${h.figure}`)
      bad++
    }
  }
  if (!bad) pass('every hexagram\'s trigrams concatenate to its figure, lower first')
  if (TRIGRAMS.length !== 8) fail(`expected 8 trigrams, got ${TRIGRAMS.length}`)
}

console.log('\nengine')

// Moving-line resolution.
{
  const allMoving: LineValue[] = [9, 9, 9, 9, 9, 9]
  const r = resolve(allMoving)
  if (r.primary !== 1 || r.relating !== 2) fail(`six old yang should be 1 → 2, got ${r.primary} → ${r.relating}`)
  else if (r.moving.join() !== '1,2,3,4,5,6') fail(`six old yang should move every line, got [${r.moving}]`)
  else pass('six old yang → 1 becoming 2, all six lines moving')

  let complementBad = 0
  for (const h of HEXAGRAMS) {
    const lines = [...h.figure].map(c => (c === '1' ? 9 : 6)) as LineValue[]
    if (linesToRelatingFigure(lines) !== complement(h.figure)) complementBad++
  }
  if (complementBad) fail(`${complementBad} hexagrams: all-moving does not yield the complement`)
  else pass('all lines moving always yields the bit-complement')

  const still = resolve([7, 8, 7, 8, 7, 8])
  if (still.relating !== null) fail(`nothing moving should give relating null, got ${still.relating}`)
  else pass('nothing moving → relating is null, not the primary repeated')
}

// Coin arithmetic.
{
  const t = (h: number): CoinThrow => [h > 0, h > 1, h > 2]
  const values = [0, 1, 2, 3].map(h => fromCoins([t(h), t(h), t(h), t(h), t(h), t(h)])[0])
  if (values.join() !== '6,7,8,9') fail(`heads 0..3 should give 6,7,8,9 — got ${values.join()}`)
  else pass('heads counts 3, tails counts 2; 0–3 heads → 6,7,8,9')
}

// Distribution. 1/8, 3/8, 3/8, 1/8 — not uniform, and this is the check that says so.
{
  const N = 200_000
  const counts: Record<number, number> = { 6: 0, 7: 0, 8: 0, 9: 0 }
  for (let i = 0; i < N; i++) counts[castLine('coin')]++
  const expected: Record<number, number> = { 6: 0.125, 7: 0.375, 8: 0.375, 9: 0.125 }
  const off = Object.entries(expected).filter(([v, p]) => Math.abs(counts[+v] / N - p) > 0.006)
  if (off.length) fail(`coin odds off: ${off.map(([v]) => `${v}=${(counts[+v] / N).toFixed(4)}`).join(', ')}`)
  else pass(`coin odds within tolerance over ${N.toLocaleString()} draws (${[6, 7, 8, 9].map(v => (counts[v] / N).toFixed(3)).join(' / ')})`)

  const y: Record<number, number> = { 6: 0, 7: 0, 8: 0, 9: 0 }
  for (let i = 0; i < N; i++) y[castLine('yarrow')]++
  const yExp: Record<number, number> = { 6: 1 / 16, 7: 5 / 16, 8: 7 / 16, 9: 3 / 16 }
  const yOff = Object.entries(yExp).filter(([v, p]) => Math.abs(y[+v] / N - p) > 0.006)
  if (yOff.length) fail(`yarrow odds off: ${yOff.map(([v]) => v).join(', ')}`)
  else pass('yarrow odds within tolerance (parameterized, not yet exposed)')
}

// Round trip.
{
  let bad = 0
  for (let i = 0; i < 2000; i++) {
    const r = cast('coin')
    if (figureToNumber(linesToFigure(r.lines)) !== r.primary) bad++
    if (r.moving.length === 0 && r.relating !== null) bad++
    if (r.moving.length > 0 && r.relating === null) bad++
    if (r.moving.join() !== movingLines(r.lines).join()) bad++
  }
  if (bad) fail(`${bad} inconsistencies across 2000 random casts`)
  else pass('2000 random casts are internally consistent')
}

console.log('\nfixture — the founding cast')

/**
 * xenso/source/Wisdom of the Universe/I Ching …md — 2024-02-23,
 * "What will help bring Xenso into the world?"
 *
 * Six throws recorded, no hexagram identified, no reading taken. Transcribed
 * here exactly as logged. If the engine disagrees with the hand calculation,
 * the engine is wrong.
 */
{
  const H = true
  const T = false
  const throws: CoinThrow[] = [
    [H, H, H], // 3 heads
    [H, T, T], // 1 head, 2 tails
    [H, H, T], // 2 heads, 1 tail
    [H, H, T],
    [H, T, T],
    [H, H, T],
  ]
  const lines = fromCoins(throws)
  if (lines.join() !== '9,7,8,8,7,8') fail(`expected lines 9,7,8,8,7,8 — got ${lines.join()}`)
  else pass(`throws → lines ${lines.join(', ')} (bottom first)`)

  const r = resolve(lines)
  const p = hexagram(r.primary)
  const rel = r.relating ? hexagram(r.relating) : null
  console.log(`    ${p.chinese} · hexagram ${p.number}, moving at line ${r.moving.join(', ')} → ${rel?.chinese} · hexagram ${rel?.number}`)
  if (r.primary !== 60) fail(`primary should be 60, got ${r.primary}`)
  if (r.moving.join() !== '1') fail(`should move line 1 only, got [${r.moving}]`)
  if (r.relating !== 29) fail(`relating should be 29, got ${r.relating}`)
  if (r.primary === 60 && r.relating === 29 && r.moving.join() === '1') pass('matches the hand calculation')

  // Direction guard. Read top-down instead of bottom-up and this becomes 59 —
  // a plausible wrong answer that would never raise an error anywhere.
  const reversed = figureToNumber(linesToFigure([...lines].reverse()))
  if (reversed === 60) fail('reading the throws top-down gives the same answer — the direction guard is not testing anything')
  else pass(`read top-down it would be ${reversed} instead of 60 — bottom-up matters, and is enforced`)
}

console.log('\nrenderings')
{
  const drafts = HEXAGRAMS.filter(h => h.status === 'draft')
  const locked = HEXAGRAMS.length - drafts.length
  console.log(`  ${locked} of 64 renderings locked, ${drafts.length} still undrafted`)
  const orphaned = HEXAGRAMS.filter(h => h.status === 'locked' && !h.render)
  if (orphaned.length) fail(`locked but with no render: ${orphaned.map(h => h.number).join(', ')}`)
  if (Object.keys(HEXAGRAM_BY_FIGURE).length !== 64) fail('lookup table is not 64 entries')
}

console.log(failures === 0 ? '\n✓ all checks passed\n' : `\n✗ ${failures} failure(s)\n`)
process.exit(failures ? 1 : 0)
