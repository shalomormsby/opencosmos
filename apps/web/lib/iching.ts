/**
 * The cast engine.
 *
 * Pure functions — no React, no I/O, no network. Everything here runs on the
 * client, because the client owns the cast: it mints the id, stamps the time,
 * and computes the hexagram numbers. The model is never asked for any of it.
 * A hexagram number that came out of a language model is a hallucination with
 * good odds, and the whole oracle rests on the figure being something nobody
 * wrote for the player.
 *
 * Two things in here are load-bearing and easy to get quietly wrong:
 *
 *   1. LINES READ BOTTOM TO TOP. Throw one is the bottom line. Read the other
 *      way, the founding cast in the Xensō archive resolves to 59 instead of
 *      60 — a perfectly plausible wrong answer with no error to notice.
 *
 *   2. THE COIN ODDS ARE NOT UNIFORM. Three coins give 1/8, 3/8, 3/8, 1/8.
 *      Sampling the four line values evenly would produce a figure shaped like
 *      a hexagram and related to the I Ching by nothing at all.
 */

import { HEXAGRAM_BY_FIGURE, HEXAGRAMS, TRIGRAMS, type Hexagram, type Trigram } from './iching-data'

export type { Hexagram, Trigram }

/** 6 old yin · 7 yang · 8 yin · 9 old yang. Old lines are the ones that move. */
export type LineValue = 6 | 7 | 8 | 9

export type Distribution = 'coin' | 'yarrow'

export type CastMethod = 'coins-entered' | 'timed-tap' | 'simulated' | 'simulated-animated'

/** One throw of three coins. `true` is heads, which counts 3; tails counts 2. */
export type CoinThrow = readonly [boolean, boolean, boolean]

export type CastResult = {
  lines: LineValue[]
  /** King Wen number of the figure as cast. */
  primary: number
  /** King Wen number after the moving lines turn, or null when nothing moves. */
  relating: number | null
  /** 1-indexed positions of the moving lines, counted FROM THE BOTTOM. */
  moving: number[]
}

/**
 * Probability of each line value, by ritual.
 *
 * Three coins and fifty yarrow stalks do not agree, and the disagreement is the
 * whole reason traditionalists care which one you used: yarrow makes old yang
 * three times as likely as old yin, so change enters the reading asymmetrically.
 * Coins flatten that. Both tables live here so the choice is explicit; only
 * 'coin' is exposed in the UI today.
 */
const ODDS: Record<Distribution, ReadonlyArray<readonly [LineValue, number]>> = {
  coin: [[6, 1 / 8], [7, 3 / 8], [8, 3 / 8], [9, 1 / 8]],
  yarrow: [[6, 1 / 16], [7, 5 / 16], [8, 7 / 16], [9, 3 / 16]],
}

/** Uniform in [0, 1), from the platform CSPRNG. Never Math.random. */
export function secureRandom(): number {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0] / 2 ** 32
}

/** Draw one line. `rand` is injectable so the checker can drive it deterministically. */
export function castLine(distribution: Distribution = 'coin', rand: () => number = secureRandom): LineValue {
  const r = rand()
  let acc = 0
  for (const [value, p] of ODDS[distribution]) {
    acc += p
    if (r < acc) return value
  }
  // Only reachable on floating-point drift at the very top of the range.
  return ODDS[distribution][ODDS[distribution].length - 1][0]
}

/** Six lines, bottom first. */
export function castLines(distribution: Distribution = 'coin', rand: () => number = secureRandom): LineValue[] {
  return Array.from({ length: 6 }, () => castLine(distribution, rand))
}

/**
 * Convert six three-coin throws into line values, bottom first.
 * Heads counts 3, tails counts 2, so each throw sums to 6, 7, 8 or 9.
 */
export function fromCoins(throws: readonly CoinThrow[]): LineValue[] {
  if (throws.length !== 6) throw new Error(`expected 6 throws, got ${throws.length}`)
  return throws.map(t => t.reduce<number>((sum, isHeads) => sum + (isHeads ? 3 : 2), 0) as LineValue)
}

const isYang = (v: LineValue) => v === 7 || v === 9

/** The figure as cast: '1' yang, '0' yin, bottom to top. */
export function linesToFigure(lines: readonly LineValue[]): string {
  return lines.map(v => (isYang(v) ? '1' : '0')).join('')
}

/** The figure after the old lines turn into their opposites. */
export function linesToRelatingFigure(lines: readonly LineValue[]): string {
  return lines.map(v => (v === 9 ? '0' : v === 6 ? '1' : isYang(v) ? '1' : '0')).join('')
}

/** 1-indexed positions of the moving lines, from the bottom. */
export function movingLines(lines: readonly LineValue[]): number[] {
  return lines.reduce<number[]>((acc, v, i) => (v === 6 || v === 9 ? [...acc, i + 1] : acc), [])
}

/** King Wen number for a figure string. Throws on anything malformed — a silent 0 here would be worse. */
export function figureToNumber(figure: string): number {
  const n = HEXAGRAM_BY_FIGURE[figure]
  if (!n) throw new Error(`not a hexagram figure: "${figure}"`)
  return n
}

export function hexagram(number: number): Hexagram {
  const h = HEXAGRAMS[number - 1]
  if (!h) throw new Error(`no hexagram ${number}`)
  return h
}

export function trigram(id: string): Trigram {
  const t = TRIGRAMS.find(x => x.id === id)
  if (!t) throw new Error(`no trigram "${id}"`)
  return t
}

/** Resolve six line values into a full reading. */
export function resolve(lines: readonly LineValue[]): CastResult {
  if (lines.length !== 6) throw new Error(`expected 6 lines, got ${lines.length}`)
  const moving = movingLines(lines)
  return {
    lines: [...lines],
    primary: figureToNumber(linesToFigure(lines)),
    // Nothing moving means there is no second figure. Not "the same one again".
    relating: moving.length ? figureToNumber(linesToRelatingFigure(lines)) : null,
    moving,
  }
}

/** Cast six lines and resolve them in one step. */
export function cast(distribution: Distribution = 'coin', rand: () => number = secureRandom): CastResult {
  return resolve(castLines(distribution, rand))
}

/** The two trigrams of a figure, lower first. Lower is lines 1–3, counting from the bottom. */
export function trigramsOf(number: number): { lower: Trigram; upper: Trigram } {
  const h = hexagram(number)
  return { lower: trigram(h.trigrams.lower), upper: trigram(h.trigrams.upper) }
}

/**
 * What a player may be shown for a hexagram whose rendering is still undrafted.
 * Never invent an English name to fill the gap — an invented name is exactly the
 * borrowed metaphor the design forbids, and it would arrive wearing authority.
 */
export function displayName(number: number): string {
  const h = hexagram(number)
  return h.render ?? `${h.chinese} · hexagram ${h.number}`
}
