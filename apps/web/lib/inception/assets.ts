// Inception — verbatim delivery manifest.
//
// Maps each path×build to the kit files shipped as-is in the export zip. These are
// served from /public/inception (faithful kit layout) and fetched client-side at
// download time. `url` is the public path; `zipPath` is where it lands in the zip
// (we mirror the kit's original self-consistent layout so its internal references stay valid).

import type { Path, Build } from './schema'

export type Asset = { url: string; zipPath: string }

const ORIENTATION: Asset[] = [
  { url: '/inception/README.md', zipPath: 'README.md' },
  { url: '/inception/PATHS.md', zipPath: 'PATHS.md' },
]

const SETUP: Record<Build, Asset> = {
  'no-code': { url: '/inception/setup/build-no-code-gemini.md', zipPath: 'setup/build-no-code-gemini.md' },
  maker: { url: '/inception/setup/build-maker.md', zipPath: 'setup/build-maker.md' },
}

const AGENT_LOOPS: Asset[] = [
  'README.md',
  'check-in/SKILL.md',
  'review/SKILL.md',
  'spar/SKILL.md',
  'retro/SKILL.md',
].map((p) => ({ url: `/inception/paths/operator/loops/${p}`, zipPath: `paths/operator/loops/${p}` }))

const CATALYST_LOOPS: Asset[] = [
  'README.md',
  'attune/SKILL.md',
  'reflect/SKILL.md',
  'discern/SKILL.md',
  'synthesize/SKILL.md',
  'witness/SKILL.md',
].map((p) => ({ url: `/inception/paths/companion/loops/${p}`, zipPath: `paths/companion/loops/${p}` }))

const PRACTICE: Asset = { url: '/inception/brain/practice.md', zipPath: 'brain/practice.md' }
const COSMO_GROUNDING: Asset = {
  url: '/inception/paths/companion/cosmo-grounding.md',
  zipPath: 'paths/companion/cosmo-grounding.md',
}

// The verbatim files included for a given combo. (Generated docs — the brief and the
// filled brain docs — are added separately by the Export step, not listed here.)
export function verbatimAssetsFor(path: Path, build: Build): Asset[] {
  const assets: Asset[] = [...ORIENTATION, SETUP[build]]

  if (path === 'agent') assets.push(PRACTICE) // Agent leans on the practice packs

  // Loops install on the Maker build; a No-code Gem carries loop behavior via the brief.
  if (build === 'maker') {
    assets.push(...(path === 'agent' ? AGENT_LOOPS : CATALYST_LOOPS))
    if (path === 'catalyst') assets.push(COSMO_GROUNDING)
  }

  return assets
}

// Fetch a public asset's text. Throws on non-200 so the caller can surface a clear error.
export async function fetchAsset(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
  return res.text()
}
