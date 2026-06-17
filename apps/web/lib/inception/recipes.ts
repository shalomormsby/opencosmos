// Inception — chooser copy + per-combo recipe cards.
//
// The chooser is presented as two QUESTIONS (not named product cells). The four
// cells are deliberately unnamed — we learn what to call them by building in public.
// Recipe copy is condensed from content/inception/01_START-HERE.md (§①–④), with the
// free Gemini Gem foregrounded as the primary home.

import type { Path, Build } from './schema'

export type AxisOption<T extends string> = { id: T; label: string; blurb: string }

export const AXIS_WHAT: { question: string; options: AxisOption<Path>[] } = {
  question: 'What is this agent for?',
  options: [
    {
      id: 'agent',
      label: 'Agent',
      blurb:
        'Jobs-to-be-done. It knows your work, monitors what matters, and keeps you sharp and leveraged. No pretense of being more than it is.',
    },
    {
      id: 'catalyst',
      label: 'Catalyst',
      blurb:
        'Becoming. It knows your values, notices your drift, and accelerates your movement toward yourself. Named for the catalyst that is never consumed by the reaction it enables — a built-in guard against dependence.',
    },
  ],
}

export const AXIS_BUILD: { question: string; options: AxisOption<Build>[] } = {
  question: 'How do you want to build?',
  options: [
    {
      id: 'no-code',
      label: 'No-code',
      blurb: 'A free Gemini Gem, guided setup, zero technical overhead. The path for most.',
    },
    {
      id: 'maker',
      label: 'Maker',
      blurb: 'Your own folder, your own key, full control. For those who want sovereignty over their infrastructure.',
    },
  ],
}

export type Recipe = {
  title: string
  firstWords: string
  steps: string[]
  gotcha: string
}

// Keyed by `${path}:${build}`.
export const RECIPES: Record<string, Recipe> = {
  'agent:no-code': {
    title: 'Agent · No-code (Gemini Gem)',
    firstWords: 'check in with me',
    steps: [
      'Create a free Gem at gemini.google.com → Gems → New Gem; name it “Synthetic [Your Name].”',
      'Paste your generated brief into the Gem’s Instructions box.',
      'Add your brain docs (identity, goals, practice, log) to Drive as Google Docs and attach them as the Gem’s Knowledge files.',
      'Preview with “check in with me.” If it knows you and reasons in your voice, Save.',
    ],
    gotcha: 'A Gem reads but can’t write — paste the check-in it hands you back into your log Doc. That paste is the memory.',
  },
  'agent:maker': {
    title: 'Agent · Maker (Cowork · Cursor · Claude)',
    firstWords: 'check in with me',
    steps: [
      'Rename your generated brief to AGENTS.md at your folder root — it loads automatically.',
      'Drop your brain docs (identity, goals, practice, log) into the folder as markdown.',
      'Install the loops from paths/operator/loops/ (check-in · review · spar · retro).',
      'Connect Calendar/Tasks read-only so it reads your real plate; it writes the log itself.',
    ],
    gotcha: 'Connect your sources read-only. Your agent drafts and recommends; you decide and act.',
  },
  'catalyst:no-code': {
    title: 'Catalyst · No-code (Gemini Gem)',
    firstWords: 'attune with me',
    steps: [
      'Create a free Gem at gemini.google.com → Gems → New Gem; name it “Synthetic [Your Name].”',
      'Paste your generated brief into the Gem’s Instructions box.',
      'Add your brain docs (identity, teachers, log) to Drive as Google Docs and attach them as Knowledge. (practice optional.)',
      'Preview with “attune with me.” If you feel met, Save.',
    ],
    gotcha: 'A Gem can’t fetch Cosmo live — the brief carries an embedded distillation of Cosmo’s voice. Paste witness-journal lines it gives you back into your log Doc.',
  },
  'catalyst:maker': {
    title: 'Catalyst · Maker (Cowork · Cursor · Claude)',
    firstWords: 'attune with me',
    steps: [
      'Rename your generated brief to AGENTS.md at your folder root.',
      'Drop your brain docs (identity, teachers, log) into the folder as markdown.',
      'Install the loops from paths/companion/loops/ (attune · reflect · discern · synthesize · witness).',
      'Have it fetch Cosmo’s living constitution at session start — see paths/companion/cosmo-grounding.md.',
    ],
    gotcha: 'Have it fetch Cosmo live for the richest voice; it keeps the witness journal itself.',
  },
}

export function recipeFor(path: Path, build: Build): Recipe {
  return RECIPES[`${path}:${build}`]
}
