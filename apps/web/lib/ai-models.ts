// Single source of truth for which Claude model each Cosmo surface runs on.
// Every route that calls the Anthropic API imports its model from here — do
// not hardcode a model ID inline in a route. This is what /inference-cost
// reads and edits.
//
// Model family reference (bare aliases, no date suffixes, per this repo's
// convention): claude-opus-4-8, claude-sonnet-5, claude-haiku-4-5, claude-fable-5.

/**
 * `/dialog` — general-audience sessions (free tier, subscribers, BYOK).
 * Highest volume surface — cost-sensitive by default.
 */
export const MODEL_GENERAL = 'claude-sonnet-5'

/**
 * `/dialog` — Shalom's admin sessions (identified via ADMIN_EMAIL), including
 * creative-mode requests (?creative=1) which reuse this same tier with extra
 * context injected, not a distinct model.
 *
 * History: Fable 5 → Opus 4.8 (Fable cost ~2x a full evening's Sonnet 4.6
 * usage per prompt with no perceptible quality gain) → Sonnet 5 (Opus 4.8's
 * cost premium over Sonnet 5 wasn't worth it either).
 */
export const MODEL_ADMIN = 'claude-sonnet-5'

/**
 * `/inception` — the personal-agent-brief interview flow (chat + synthesize
 * modes). Shares the free-tier token allotment with `/dialog`, so it runs on
 * the cheapest model that holds up for a structured interview.
 */
export const MODEL_INCEPTION = 'claude-haiku-4-5-20251001'
