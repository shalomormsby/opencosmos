// Inception — field schema.
//
// The single source of truth for what the user is asked, how the live blueprint
// renders, and what shape the `synthesize` pass on /api/inception must return.
// Helper copy is condensed from the kit's own bracket prompts (content/inception/*).
//
// Naming note: the two axis-1 values are the product labels **Agent** / **Catalyst**.
// They map onto the kit's `operator` / `companion` content respectively (see PATHS.md).
// We keep the kit's internal vocabulary in the delivered files; Agent/Catalyst is the
// chooser + brief-title layer.

export type Path = 'agent' | 'catalyst'
export type Build = 'no-code' | 'maker'

export const DOMAIN_PACKS = [
  { id: 'project-management', label: 'Project management' },
  { id: 'health-fitness', label: 'Health & fitness' },
  { id: 'personal-finance', label: 'Personal finance' },
] as const
export type DomainPackId = (typeof DOMAIN_PACKS)[number]['id']

export type Goal = { name: string; ambition: string; targets: string[]; liveWork: string }
export type Teacher = { name: string; carries: string; touchstone?: string }

export type Answers = {
  // shared
  name?: string
  northStar?: string
  whyItMatters?: string
  worldsThread?: string
  // Agent
  domains?: string
  beliefs?: string[]
  energizes?: string
  drains?: string
  tempo?: string
  talkedTo?: string
  drawnTo?: string
  reject?: string
  nonNegotiables?: string[]
  growthEdges?: string[]
  goals?: Goal[]
  domainPacks?: DomainPackId[]
  // Catalyst
  bestSelf?: string
  season?: string
  values?: string[]
  valuesPermission?: string
  wisdomLanguage?: string
  teachers?: Teacher[]
  tensions?: string[]
}

export type FieldKind = 'text' | 'textarea' | 'list' | 'goals' | 'teachers' | 'packs'

export type FieldDef = {
  id: keyof Answers
  label: string
  helper: string
  kind: FieldKind
  placeholder?: string
}

export type Section = {
  id: string
  title: string
  intro: string
  fields: FieldDef[]
}

const NAME_FIELD: FieldDef = {
  id: 'name',
  label: 'Your name',
  helper: 'What your agent calls you. It becomes “Synthetic [Your Name].”',
  kind: 'text',
  placeholder: 'e.g. Brian',
}

const NORTH_STAR_FIELDS: FieldDef[] = [
  {
    id: 'northStar',
    label: 'The one thing it’s all for',
    helper:
      'In a sentence or two, the point underneath the goals — what you’re ultimately trying to do or be. There’s no wrong answer; write the true one.',
    kind: 'textarea',
    placeholder: 'e.g. “Make a living from my art without burning out, and help other creators do the same.”',
  },
  {
    id: 'whyItMatters',
    label: 'Why it matters / what’s at stake',
    helper: 'What happens if you stay pointed at this? What happens if you drift off it?',
    kind: 'textarea',
  },
  {
    id: 'worldsThread',
    label: 'How your different worlds connect (optional)',
    helper:
      'If your life feels split — day job vs. real work, responsible self vs. creative self — name the single thread that actually connects them.',
    kind: 'textarea',
  },
]

export const SECTIONS: Record<Path, Section[]> = {
  agent: [
    {
      id: 'north-star',
      title: 'North star',
      intro: 'The deepest “why,” and who your agent is speaking for.',
      fields: [NAME_FIELD, ...NORTH_STAR_FIELDS],
    },
    {
      id: 'voice-values',
      title: 'Voice & values',
      intro: 'How you actually think and what you won’t compromise — this is the voice your agent speaks in.',
      fields: [
        {
          id: 'beliefs',
          label: 'What you believe',
          helper: 'The load-bearing convictions about how you want to work or live. Aim for 4–8.',
          kind: 'list',
          placeholder: 'e.g. “Consistency beats intensity — the small thing done daily wins.”',
        },
        { id: 'energizes', label: 'What energizes you', helper: 'When are you at your best? What makes you lose track of time?', kind: 'textarea' },
        { id: 'drains', label: 'What drains you', helper: 'What reliably exhausts or demoralizes you? Your agent helps you avoid scheduling into this.', kind: 'textarea' },
        { id: 'tempo', label: 'Your tempo', helper: 'Fast and iterative? Slow and deep? Mornings or nights? How you actually operate, not the ideal.', kind: 'text' },
        { id: 'talkedTo', label: 'How you like to be talked to', helper: 'Direct and blunt? Warm and encouraging? Challenged hard, or held gently?', kind: 'text' },
        { id: 'drawnTo', label: 'Drawn to (optional)', helper: 'What “good” looks like to you in your domain.', kind: 'text' },
        { id: 'reject', label: 'Reject (optional)', helper: 'What you steer away from.', kind: 'text' },
        { id: 'nonNegotiables', label: 'Non-negotiables', helper: 'The lines that don’t move, regardless of deadline or temptation.', kind: 'list', placeholder: 'e.g. “Sleep is not the variable I sacrifice.”' },
        { id: 'growthEdges', label: 'Growth edges', helper: 'Where you want your agent to push you. Be a little uncomfortable here — that’s how you know it’s real.', kind: 'list', placeholder: 'e.g. “I start things and don’t finish them. Push me to close loops.”' },
      ],
    },
    {
      id: 'goals',
      title: 'Goals',
      intro: 'Your current priorities, in priority order (3–5). Each needs an ambition, measurable targets, and where the work lives.',
      fields: [
        { id: 'goals', label: 'Goals', helper: 'Order = priority. Your agent reads top-to-bottom and uses it to break ties.', kind: 'goals' },
      ],
    },
    {
      id: 'domains',
      title: 'Domains & practice',
      intro: 'The areas your agent supports, and the principle packs it reasons with.',
      fields: [
        { id: 'domains', label: 'Your domains', helper: 'The areas your agent helps across.', kind: 'text', placeholder: 'e.g. “my client projects, my fitness, my finances, and my creative practice”' },
        { id: 'domainPacks', label: 'Practice packs', helper: 'Pre-made principle sets to include (you’ll make them yours later).', kind: 'packs' },
      ],
    },
  ],
  catalyst: [
    {
      id: 'north-star',
      title: 'North star',
      intro: 'The deepest “why,” and who your companion is attuning to.',
      fields: [NAME_FIELD, ...NORTH_STAR_FIELDS],
    },
    {
      id: 'best-self',
      title: 'Best self & season',
      intro: 'The you on your best days — the “north” your companion gently helps you return to — and the season you’re in now.',
      fields: [
        {
          id: 'bestSelf',
          label: 'The best version of you',
          helper: 'Not an aspirational stranger — the you that shows up on your best days. Describe a good day from the inside.',
          kind: 'textarea',
          placeholder: 'e.g. “Unhurried but engaged. Present with people instead of half-listening. Creating from overflow, not pressure.”',
        },
        {
          id: 'season',
          label: 'Your current season',
          helper: 'The same support lands differently in each season. Name it plainly, and say what you need more and less of.',
          kind: 'textarea',
          placeholder: 'e.g. “Rebuilding after burnout — recovery, not push.” · “Fertile building.” · “Grief / transition — be gentle.”',
        },
        { id: 'values', label: 'Values you hold right now', helper: 'List 3–6. Held as living — to be re-validated, not assumed.', kind: 'list' },
        {
          id: 'valuesPermission',
          label: 'Permission to question them',
          helper: 'How you want your companion to check whether these still ring true over time.',
          kind: 'textarea',
          placeholder: 'e.g. “Ask me, a few times a year, whether these are still true. I’d rather have living values than a fossil.”',
        },
      ],
    },
    {
      id: 'teachers',
      title: 'Teachers & wisdom',
      intro: 'The frame through which insight best reaches you, and the teachers you draw from.',
      fields: [
        {
          id: 'wisdomLanguage',
          label: 'Your wisdom language',
          helper: 'The frame that makes something land instead of bouncing off. Your companion speaks in this.',
          kind: 'textarea',
          placeholder: 'e.g. “Practical and grounded.” · “Contemplative and somatic.” · “Stoic / rational.” · “Devotional.”',
        },
        { id: 'teachers', label: 'Your teachers', helper: 'The coaches, authors, traditions, or sources you return to. 3–7 is plenty.', kind: 'teachers' },
        { id: 'tensions', label: 'Tensions between them (optional)', helper: 'Where your teachers pull in opposite directions — gold for synthesis.', kind: 'list', placeholder: 'e.g. “Radical acceptance vs. discipline-equals-freedom.”' },
      ],
    },
  ],
}

// Path display + mapping to the kit's internal folder vocabulary.
export const PATH_META: Record<Path, { label: string; kitPath: 'operator' | 'companion'; firstWords: string; tagline: string }> = {
  agent: {
    label: 'Agent',
    kitPath: 'operator',
    firstWords: 'check in with me',
    tagline: 'Knows your work, monitors what matters, keeps you sharp and leveraged.',
  },
  catalyst: {
    label: 'Catalyst',
    kitPath: 'companion',
    firstWords: 'attune with me',
    tagline: 'Knows your values, notices your drift, accelerates your movement toward yourself.',
  },
}
