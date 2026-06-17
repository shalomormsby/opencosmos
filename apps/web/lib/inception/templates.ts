// Inception — deterministic document generation.
//
// The model fills *fields* (Answers); these pure functions produce the *docs*.
// No fs / no fetch here — callers pass in the raw brief template text (served from
// /public/inception/templates) so this module stays usable on client and server.

import { type Answers, type Path, PATH_META, DOMAIN_PACKS } from './schema'

// ---------------------------------------------------------------------------
// small helpers
// ---------------------------------------------------------------------------

const orDash = (v?: string) => (v && v.trim() ? v.trim() : '_(to fill in)_')

function bullets(items?: string[]): string {
  const clean = (items ?? []).map((i) => i.trim()).filter(Boolean)
  return clean.length ? clean.map((i) => `- ${i}`).join('\n') : '- _(to fill in)_'
}

function numbered(items?: string[]): string {
  const clean = (items ?? []).map((i) => i.trim()).filter(Boolean)
  return clean.length ? clean.map((i, n) => `${n + 1}. ${i}`).join('\n') : '1. _(to fill in)_'
}

// ---------------------------------------------------------------------------
// The brief — fill the raw kit template (mostly [[Your Name]] + a couple inline
// brackets), relabel the path to Agent/Catalyst, drop the instructional quote-block.
// ---------------------------------------------------------------------------

export function fillBrief(raw: string, path: Path, answers: Answers): string {
  const name = (answers.name && answers.name.trim()) || 'you'
  const label = PATH_META[path].label

  // The kit brief is: H1 · instructional quote-block · `---` · the actual brief body.
  // The setup guides say "paste everything below the divider line", so we keep the
  // body and prepend a clean, relabeled title — dropping the quote-block instructions.
  const dividerIdx = raw.indexOf('\n---\n')
  let body = dividerIdx >= 0 ? raw.slice(dividerIdx + 5) : raw

  // [[Your Name]] is the one global token.
  body = body.replace(/\[\[Your Name\]\]/g, name)

  // Inline "who you are" parenthetical + the Agent domains bracket.
  const whoYouAre =
    path === 'agent'
      ? answers.domains?.trim() && `who works across ${answers.domains.trim()}`
      : answers.season?.trim() && `tending ${answers.season.trim().replace(/\.$/, '')}`
  // Replace the parenthetical (incl. its parens) so we never leave a stray "()".
  body = body.replace(/\s*\(\[\[one line[^\]]*\]\]\)/g, whoYouAre ? ` (${whoYouAre})` : '')
  // Agent "list your domains" inline bracket.
  body = body.replace(/\[\[list your domains[^\]]*\]\]/g, orDash(answers.domains))

  // Safety net: never ship a raw [[bracket]].
  body = body.replace(/\[\[[^\]]*\]\]/g, '').replace(/\n{3,}/g, '\n\n')

  const title = `# Synthetic ${name} — the ${label} path`
  const catalystFraming =
    path === 'catalyst'
      ? `\n\n> A **Catalyst** is named for the chemical kind: it enables transformation without being consumed by it. It stays available, unchanged, while you change — a built-in reminder that its purpose is to make you *more* yourself, never more dependent on it.`
      : ''

  return `${title}${catalystFraming}\n\n${body.trim()}\n`
}

// ---------------------------------------------------------------------------
// Brain docs — rendered structurally from answers, faithful to the kit headings.
// ---------------------------------------------------------------------------

export function renderIdentity(answers: Answers, path: Path): string {
  const a = answers
  const parts: string[] = [
    `# Identity — who I'm serving, and how I think`,
    ``,
    `## Part 1 — The North Star`,
    ``,
    `**The one thing it's all for:**`,
    ``,
    `> ${orDash(a.northStar)}`,
    ``,
    `**Why it matters / what's at stake:**`,
    ``,
    `> ${orDash(a.whyItMatters)}`,
  ]
  if (a.worldsThread?.trim()) {
    parts.push(``, `**How my different worlds connect:**`, ``, `> ${a.worldsThread.trim()}`)
  }

  parts.push(
    ``,
    `## Part 2 — Voice & Values`,
    ``,
    `### What I believe`,
    numbered(a.beliefs),
    ``,
    `### How I work — my way of being`,
    `- **What energizes me:** ${orDash(a.energizes)}`,
    `- **What drains me:** ${orDash(a.drains)}`,
    `- **My tempo:** ${orDash(a.tempo)}`,
    `- **How I like to be talked to:** ${orDash(a.talkedTo)}`,
  )

  if (a.drawnTo?.trim() || a.reject?.trim()) {
    parts.push(
      ``,
      `### My taste — what I'm drawn to, what I reject`,
      `- **Drawn to:** ${orDash(a.drawnTo)}`,
      `- **Reject:** ${orDash(a.reject)}`,
    )
  }

  parts.push(``, `### My non-negotiables`, bullets(a.nonNegotiables), ``, `### My growth edges`, bullets(a.growthEdges))

  // Companion (Catalyst) section — best-self, season, living values.
  if (path === 'catalyst' || a.bestSelf?.trim() || a.season?.trim() || (a.values?.length ?? 0) > 0) {
    parts.push(
      ``,
      `## Part 3 — For the Catalyst path`,
      ``,
      `### The best version of me`,
      ``,
      `> ${orDash(a.bestSelf)}`,
      ``,
      `### My current season`,
      ``,
      `> **Right now I'm in a season of:** ${orDash(a.season)}`,
      ``,
      `### My values are living, not fixed`,
      ``,
      `> **Values I hold right now:** ${(a.values ?? []).filter(Boolean).join(', ') || '_(to fill in)_'}`,
      `> **Permission:** ${orDash(a.valuesPermission)}`,
    )
  }

  parts.push(``, `> *Status: DRAFT — written at inception. Revisit after a few weeks of use; the season especially is meant to be updated.*`)
  return parts.join('\n') + '\n'
}

export function renderGoals(answers: Answers): string {
  const goals = (answers.goals ?? []).filter((g) => g && (g.name?.trim() || g.ambition?.trim()))
  const parts: string[] = [`# Goals — what I'm aiming at`, ``, `> Current priorities, in priority order. Your agent reads top-to-bottom and uses the order to break ties. Keep it to 3–5.`, ``]

  if (!goals.length) {
    parts.push(`## G1 · _(to fill in)_`, ``, `**Ambition.** _(to fill in)_`, ``, `**Targets**`, `- [ ] _(to fill in)_`, ``, `**Live work.** _(to fill in)_`)
  } else {
    goals.forEach((g, i) => {
      const targets = (g.targets ?? []).map((t) => t.trim()).filter(Boolean)
      parts.push(
        `## G${i + 1} · ${orDash(g.name)}`,
        ``,
        `**Ambition.** ${orDash(g.ambition)}`,
        ``,
        `**Targets** *(measurable — a number, a date, a clear yes/no)*`,
        targets.length ? targets.map((t) => `- [ ] ${t}`).join('\n') : `- [ ] _(to fill in)_`,
        ``,
        `**Live work.** ${orDash(g.liveWork)}`,
        ``,
        `---`,
        ``,
      )
    })
  }
  parts.push(`> *Status: DRAFT — written at inception. Order = priority; your agent reads top-to-bottom.*`)
  return parts.join('\n') + '\n'
}

export function renderTeachers(answers: Answers): string {
  const teachers = (answers.teachers ?? []).filter((t) => t && (t.name?.trim() || t.carries?.trim()))
  const parts: string[] = [
    `# Teachers — my wisdom corpus`,
    ``,
    `## My wisdom language`,
    `*How insight best reaches me — the frame my companion speaks in.*`,
    ``,
    `> ${orDash(answers.wisdomLanguage)}`,
    ``,
    `## My teachers`,
  ]
  if (!teachers.length) {
    parts.push(`### _(to fill in)_`, `- **Carries:** _(to fill in)_`, `- **Touchstone:** _(optional)_`)
  } else {
    teachers.forEach((t) => {
      parts.push(``, `### ${orDash(t.name)}`, `- **Carries:** ${orDash(t.carries)}`, `- **Touchstone:** ${t.touchstone?.trim() || '_(optional)_'}`)
    })
  }
  if ((answers.tensions ?? []).filter(Boolean).length) {
    parts.push(``, `## Tensions I already feel between them`, bullets(answers.tensions))
  }
  parts.push(
    ``,
    `## The through-line (let your companion help fill this in over time)`,
    ``,
    `> _Leave blank to start. After a few /synthesize sessions, the distilled through-line lives here._`,
    ``,
    `*Status: living document. Faithful attribution always; your evolving synthesis is the real destination.*`,
  )
  return parts.join('\n') + '\n'
}

// The log carries the Day-0 origin entry — the agent arrives home already knowing
// how it came to be. `dayZeroEntry` is produced by the /api/inception synthesize pass.
export function renderLog(answers: Answers, path: Path, dayZeroEntry: string, dateISO: string): string {
  const entry = dayZeroEntry?.trim() || 'Came into being today. (Origin entry pending.)'
  if (path === 'catalyst') {
    return [
      `# Log — the living memory (witness journal)`,
      ``,
      `> Gentle, narrative entries. Your companion keeps this for you, a few lines at a time. Newest on top.`,
      ``,
      `## Witness journal`,
      ``,
      `### ${dateISO} — inception`,
      entry,
      ``,
    ].join('\n')
  }
  return [
    `# Log — the living memory (ledger)`,
    ``,
    `> Four kinds of entry: check-ins, decisions, open items, retros. Newest on top within each. Date everything.`,
    ``,
    `## Check-ins`,
    ``,
    `### ${dateISO} — inception`,
    entry,
    ``,
  ].join('\n')
}

// Convenience: the human-facing filename for the brief, per build.
export function briefFilename(build: 'no-code' | 'maker'): string {
  return build === 'maker' ? 'AGENTS.md' : 'brief.md'
}

// Which generated brain docs a path delivers (the rest of the kit is verbatim).
export function brainDocsFor(path: Path): Array<'identity' | 'goals' | 'teachers' | 'log'> {
  return path === 'agent' ? ['identity', 'goals', 'log'] : ['identity', 'teachers', 'log']
}

export { DOMAIN_PACKS }
