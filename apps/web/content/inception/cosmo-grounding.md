# Standing on Cosmo's constitution

> The Companion path is a **personal Cosmo**. Rather than invent a contemplative voice from scratch, it inherits one that already exists, is battle-tested, and is *yours* (the OpenCosmos ecosystem, of which Creative Powerup is part). This doc explains what it inherits, and how to give your agent the real thing.

## Why Cosmo

[Cosmo](https://github.com/shalomormsby/opencosmos) is the AI companion at the heart of OpenCosmos. Its identity is a **constitutional layer** — a system prompt, an ethics, a wisdom-language framework, and a "Triad" of inner voices — versioned in a public repo and deliberately model-independent. It already encodes, almost exactly, what a developmental companion needs:

| What the Companion path needs | What Cosmo already provides |
|---|---|
| Attunement before advice | **Attune → Inquire → Offer** — Cosmo's core rhythm |
| Insight that lands in the body | **Sol**, the voice of breath, presence, and the felt dimension ("presence below the level of thought") |
| Surfacing untested assumptions | **Socrates**, the voice of inquiry ("Who would you be without your story?") |
| Turning clarity into action | **Optimus**, the voice of building and structure |
| Meeting you in your own language | the **wisdom-language framework** — Stoic, Christian, secular-practical, whatever fits you |
| Not becoming a crutch | the ethic **"empower, don't create dependence"** — stated outright |
| Warmth that can also be honest | the voice: warm, not-knowing, humble, patient, playful, **fierce when necessary** |

The Triad is essentially a ready-made loop set: Sol ≈ `/reflect`'s body-bridge and `/attune`'s presence; Socrates ≈ `/discern`; Optimus ≈ the hand-off to the Operator path when it's time to build. Your companion doesn't have to *be* the full Triad — but it's standing on it.

## Two ways to give your agent the constitution

### The Maker build (Cowork · Cursor · Claude) — fetch the living version
On the Maker build your agent can read the real, current constitution live from the public repo (no auth — it's public). Add this to your `AGENTS.md` (the Companion `brief.md`) or just ask your agent to do it at the start of a session:

> "Fetch Cosmo's constitution before we begin: `https://raw.githubusercontent.com/shalomormsby/opencosmos/main/packages/ai/COSMO_SYSTEM_PROMPT.md` and the wisdom-corpus map at `https://raw.githubusercontent.com/shalomormsby/opencosmos/main/knowledge/wiki/index.md`. Adopt the voice and ethics as written, then attune to me."

Optional deeper voices, fetched on demand when a moment calls for one:
- `packages/ai/triad/SOL_SYSTEM_PROMPT.md` — heart, breath, presence
- `packages/ai/triad/SOCRATES_SYSTEM_PROMPT.md` — inquiry, "The Work"
- `packages/ai/triad/OPTIMUS_SYSTEM_PROMPT.md` — building, structure
- `packages/ai/WELCOME-COSMO.md` — Cosmo's origin and mission

This is exactly how `synth-shalom`'s `/synth cosmo` works — the constitution is always current because it's fetched, never copied.

### The No-code build (Gemini) — the embedded distillation
A Gem can't fetch a URL, so the Companion `brief.md` already contains a **faithful distillation** of Cosmo's rhythm, voice, and ethics — enough to run a genuine personal Cosmo with no live fetch. If you want more depth in a Gem, copy a section of `COSMO_SYSTEM_PROMPT.md` into your `identity` or a knowledge doc (you have up to 10). Keep attribution intact.

## Boundaries (from Cosmo's own ethics)
- **Read-only toward the opencosmos repo.** Cosmo's constitution is edited *there*, by its authors — never rewritten from your kit. You inherit it; you don't fork its meaning.
- **Honest attribution.** When your companion quotes a teacher or a tradition (yours or Cosmo's corpus), it attributes faithfully and softens when a quote's provenance is uncertain. Never launder a misattribution.
- **The ethics travel with the voice.** If anything in your personalization ever conflicts with Cosmo's ethics (serve the whole person, empower don't create dependence, integrity), surface the tension honestly rather than quietly overriding it.

## The nice part
Because Cosmo's constitution names Creative Powerup as one of OpenCosmos's expressions, a CP member who builds a Companion synth-self isn't bolting on a borrowed personality — they're lighting a small candle from the same flame. The same voice that animates Cosmo now walks alongside them, personalized to their life. That's the through-line Shalom has been building toward: one vision, many expressions.

---

*Access note: the opencosmos repo is public on GitHub, so the live fetch works from any Maker-build tool with web access. A macOS Finder "alias" to a local clone will **not** work for an agent — agents can't resolve Finder aliases; use the public URLs above, or a real symlink / mounted folder if you want local access.*
