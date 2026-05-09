/**
 * Shared tradition → domain mapping for the constellation hierarchy.
 *
 * Used by:
 *   - generate-constellation-graph.ts (emits domain nodes + hierarchy edges)
 *   - embed-knowledge.ts (derives domain for chunk context + Upstash metadata)
 *
 * The corpus's source-file frontmatter no longer carries a `domain:` field —
 * top-level domain is a derived property of the file's `tradition:`.
 *
 * Hierarchy:
 *   wisdom  →  philosophy  →  stoicism / platonism / rationalism / german-idealism
 *           →  buddhism, taoism, sufism, quakerism, vedanta, celtic,
 *              transcendentalism, christian-anarchism, romantic-mysticism
 *   literature  →  elizabethan, german-romanticism, psychological-realism,
 *                  heian-court-literature, european-orientalism
 *   science  →  history-of-computing
 */

/** Direct tradition → domain mapping. Includes the umbrella traditions
 *  (philosophy) so they get a domain anchor too. */
export const TRADITION_TO_DOMAIN: Record<string, string> = {
  // wisdom — philosophy umbrella + direct-child traditions
  philosophy:           'wisdom',
  buddhism:             'wisdom',
  taoism:               'wisdom',
  sufism:               'wisdom',
  quakerism:            'wisdom',
  vedanta:              'wisdom',
  celtic:               'wisdom',
  transcendentalism:    'wisdom',
  'christian-anarchism': 'wisdom',
  'romantic-mysticism': 'wisdom',

  // literature
  elizabethan:                  'literature',
  'german-romanticism':         'literature',
  'psychological-realism':      'literature',
  'heian-court-literature':     'literature',
  'european-orientalism':       'literature',

  // science
  'history-of-computing': 'science',
  engineering:            'science',
  psychology:             'science',

  // additional wisdom traditions surfaced by quote-yaml `tradition` fields
  // (synthesizeTradition in normalize-quotes/shared.ts emits these slugs from
  // author context strings).
  vedic:      'wisdom',
  indigenous: 'wisdom',
  art:        'literature',
  ecology:    'science',
}

/** Nested tradition → parent tradition (for traditions that aren't direct
 *  children of a domain — they sit under an umbrella tradition that itself
 *  is a child of a domain). Stoicism → Philosophy → Wisdom. */
export const TRADITION_TO_PARENT_TRADITION: Record<string, string> = {
  platonism:          'philosophy',
  stoicism:           'philosophy',
  rationalism:        'philosophy',
  'german-idealism':  'philosophy',
}

/** Traditions that should be synthesized as nodes even when no work has them
 *  as a direct `tradition:` value. They exist purely as umbrella categorizers. */
export const UMBRELLA_TRADITIONS: ReadonlyArray<string> = ['philosophy']

/** Walk the parent-tradition chain to find a tradition's top-level domain.
 *  Returns 'uncategorized' for any tradition not in either config. */
export function resolveDomainForTradition(tradition: string): string {
  if (!tradition) return 'uncategorized'

  // First check direct domain mapping
  const directDomain = TRADITION_TO_DOMAIN[tradition]
  if (directDomain) return directDomain

  // Walk the parent chain
  let current = tradition
  const seen = new Set<string>()
  while (current && !seen.has(current)) {
    seen.add(current)
    const parent = TRADITION_TO_PARENT_TRADITION[current]
    if (!parent) break
    const parentDomain = TRADITION_TO_DOMAIN[parent]
    if (parentDomain) return parentDomain
    current = parent
  }

  return 'uncategorized'
}
