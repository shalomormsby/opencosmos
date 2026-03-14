# Sage AI (Historical)

> **📌 Historical Document** — This was the founding record of "Sage AI," the original name for what is now **OpenCosmos / Cosmo**. Preserved as a historical artifact. The vision has evolved — see [WELCOME.md](../../WELCOME.md) for the current philosophy and [COSMO_SYSTEM_PROMPT.md](COSMO_SYSTEM_PROMPT.md) for Cosmo's voice.
>
> *Initiated: March 1, 2026 · Author: Shalom Ormsby · Superseded: March 8, 2026*

**Current Phase:** 1a (hardware) + 1b (package) | **Last Updated:** 2026-03-04 | **License:** [RAIL](https://www.licenses.ai/) (Responsible AI License)

---

# 1. Vision & Purpose

## What Is Sage AI?

**Sage AI** is the shared intelligence layer powering the entire Sage ecosystem. It is not a chatbot. It is not a wrapper around an LLM. It is a **sovereign, heart-led intelligence** designed to amplify human creativity and empower conscious creators to build lovable digital experiences.

> Sage AI translates human intention into personalized, production-ready digital experiences — making what was once only possible for trained designers accessible to conscious creators everywhere.

## Who It Serves

- **Shalom and future collaborators** who need an AI partner that surfaces profound human wisdom, that challenges assumptions, creates friction, and helps to deepen thinking (not one that flatters)
- **Creative Powerup members** who have a vision and who need support with the North Star alignment, technical design skills, or engineering abilities

## Intended Future State

- Sage AI evolves beyond the constraint of a single solar-powered private server in Marin County, CA, to support a global community of people (especially heart-led creatives and others who are looking to make a genuine positive impact in the world) who need the assistance of benevolent, sovereign, and trustworthy AI (that's not steered by corporate interests).
- Sage AI provides foundational support to Shalom's related projects:
    - **The [Sage Design Engine](https://thesage.dev/),** offering an AI translation layer from intent → theme → implementation
    - **Sage Stocks,** providing intelligent analysis, automation, and data processing
    - **SageOS,** providing sovereign, wisdom-based AI infrastructure for a personal operating system

## Why It Matters

Most AI tools optimize for speed and convenience. Sage AI optimizes for **creative agency, ethical integrity, and human flourishing**. It is:

- **Sovereign:** Runs on local hardware. Your data never leaves. The intelligence is seeded by wisdom of the world that's in the public domain, and then it's collectively cultivated and deepened in present-time.
- **Solar-powered:** Its existence is a direct reflection of ecological cycles — powered by sunlight, respectful of the need for sustainable use.
- **Provocative:** It doesn't just answer questions. It challenges assumptions, exposes biases, and supports deep thinking.

This is AI as a creative thought partner, not a content machine or "answer engine."

---

# 2. Architecture Overview

## The Two Layers

Sage AI operates as two complementary layers that bridge the codebase and the physical infrastructure:

### Layer A: The Ecosystem Package (`ecosystem/packages/sage-ai`)

The software layer — a shared library consumed by every app in the monorepo.

```
ecosystem/
├── packages/
│   └── sage-ai/            ← Shared AI capabilities
│       ├── src/
│       │   ├── mcp/        ← MCP server (future — see note below)
│       │   ├── rag/        ← RAG pipeline & knowledge indexing
│       │   ├── prompts/    ← System prompts & constitutional rules
│       │   └── clients/    ← API clients for Ollama, cloud, dev/mock
│       ├── package.json
│       └── README.md
├── apps/
│   ├── creative-powerup/   ← Imports @thesage/ai
│   ├── sage-stocks/        ← Currently independent (own AI SDKs); migrates to @thesage/ai in Phase 3
│   ├── portfolio/          ← Imports @thesage/ai
│   └── sageos/             ← Imports @thesage/ai
```

**Why `packages/` and not `apps/`:** Sage AI is shared infrastructure — a library, not a deployed product. Every app imports from `@thesage/ai`. If it later needs its own API server or dashboard, that moves to `apps/sage-ai` while consuming the same package.

> **⚠️ Namespace alert — MCP:** The ecosystem already has `@thesage/mcp` (the Sage Design Engine's MCP server). Sage AI's `src/mcp/` directory is reserved for a *future* MCP server, but **do not build it until** (a) concrete technical use cases are defined that cannot be served by `@thesage/mcp` or the existing `clients/` module, and (b) a clear namespace and scope boundary between `@thesage/mcp` and any Sage AI MCP is established. See Phase 4 roadmap.

### Layer B: The Sovereign Node (Local Hardware)

The physical infrastructure — a solar-powered, locally hosted AI server running in Marin County, California.

This is where the model weights live, where inference happens, and where the Living Memory persists. See **Section 6: Infrastructure** for full specifications.

## Package API Surface

The plan so far describes internal structure — but consuming apps need a **defined public API**. Before building, define 3–5 concrete API signatures working backwards from developer experience.

**The question every consuming app will ask:**

```tsx
import { ??? } from '@thesage/ai'
```

**Candidate export patterns** (to be validated against real app needs in Phase 1):

| **Export** | **Type** | **Consumer** | **Example Usage** |
| --- | --- | --- | --- |
| `createSageClient(config)` | Factory (server-side) | All apps | Instantiate a client with model preference, constitutional rules, and fallback strategy |
| `sage.complete(prompt, opts)` | Core method | All apps | Send a prompt, get a completion — with RAG context, constitutional filtering, and model routing handled internally. **Supports streaming** via async iterator (`for await (const chunk of sage.complete(prompt, { stream: true }))`) for real-time creative workflows where users watch thoughts emerge. |
| `sage.generateTheme(intent)` | Domain method | SDE | Intent string → theme tokens (colors, typography, spacing). SDE's primary integration point |
| `sage.analyze(data, task)` | Domain method | Sage Stocks | Structured data + analysis task → insight. Powers stock analysis workflows |
| `sage.status()` | Utility | All apps | Returns server health, active model, solar status, sovereignty tier, and whether running on Sovereign Node or cloud fallback |

**Subpath exports** (if needed to keep the main entry point lean):

- `@thesage/ai` → Core client factory + `complete()` + `status()`
- `@thesage/ai/themes` → SDE-specific: `generateTheme()`, `refineTheme()`
- `@thesage/ai/analysis` → Sage Stocks-specific: `analyze()`, `summarize()`
- `@thesage/ai/react` → React hooks (future): `useSageAI()`, `useThemeGeneration()`

> **🎯 P1 prerequisite:** Before writing package code, finalize the top 3–5 API signatures by writing the consuming code first. What does Creative Powerup's API route *actually call*? What does SDE's theme generation *actually need*? The package shape should emerge from real consumer needs, not from infrastructure assumptions. Add validated signatures to this section before Phase 1 package initialization.

**The bridge between layers:** The `clients/` module manages the connection to the Sovereign Node (Layer B). When running locally, requests route to Ollama on the Dell server via Tailscale. When a cloud fallback is requested, the client router enforces the Sovereignty Tiers (Section 4): apps always know which tier is active, users always see the current state, and cloud routing requires explicit per-request consent. The abstraction is in the *API shape* (one interface for all backends), not in *transparency* (the system never hides where inference is happening).

## How the Layers Connect

```
┌─────────────────────────────────────────┐
│  Apps (CP, SDE, Sage Stocks, SageOS)    │
│  Import @thesage/ai                     │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────┴──────────────────────┐
│  packages/sage-ai                       │
│  RAG Pipeline · Prompts · Client Router │
│  Constitutional Rules                   │
└──────────────────┬──────────────────────┘
                   │ Tailscale (encrypted mesh)
┌──────────────────┴──────────────────────┐
│  Sovereign Node (Dell XPS 8950)         │
│  Ollama · Open WebUI · Docker           │
│  RTX 3090 · 64GB RAM · 2TB NVMe        │
│  Powered by 9.25kW Solar + Powerwall    │
└─────────────────────────────────────────┘
```

## License

`@thesage/ai` is licensed under the [Responsible AI License (RAIL)](https://www.licenses.ai/). Unlike the ecosystem's other packages (which use MIT), RAIL was chosen for Sage AI because:

- **Behavioral use restrictions:** RAIL permits open use while restricting harmful downstream applications — aligned with the Constitution's mandate for ethical integrity.
- **Sovereignty alignment:** The license reinforces that this package exists to empower conscious creators, not to power surveillance, manipulation, or extraction.
- **Open but principled:** RAIL preserves the "Generous by Design" commitment to openness while adding guardrails that MIT alone cannot provide.

The constitutional prompts, system-level rules, and client logic define AI behavior — the license ensures that behavior can't be co-opted for purposes that contradict the values it was built on.

> **💡 Ecosystem context:** `@thesage/ui` and `@thesage/tokens` remain MIT. `@thesage/ai` uses RAIL. The distinction is intentional: UI components are tools; the AI intelligence layer carries values that warrant behavioral restrictions.

---

# 3. Testing Strategy

This package talks to external services (Ollama, cloud APIs), manages sovereignty state, and enforces constitutional rules. All of these need tests — and none of them can depend on a live Sovereign Node in CI.

## Principles

- **No live server required.** Every test runs without the Dell server, Ollama, or any external API. GitHub Actions will never have access to the Sovereign Node.
- **Dependency injection everywhere.** The `createSageClient(config)` factory accepts a client implementation — in production it's the Ollama client or cloud client; in test and local development it's the `MockSageClient`. This single implementation serves both purposes (see below).
- **Test what matters most:** sovereignty enforcement and constitutional compliance.

## The MockSageClient (Dev + Test, Unified)

The `dev` client for offline development and the test mock are **architecturally the same thing**: a `MockSageClient` that implements the full `SageClient` interface with predictable, configurable responses.

- **In tests:** `MockSageClient` returns deterministic responses, supports assertion on prompts sent, and verifies constitutional rules were applied. Injected via `createSageClient({ client: new MockSageClient() })`.
- **In local development:** The same `MockSageClient` (or a thin wrapper that adds slight latency and variation for realism) enables package iteration without the Sovereign Node — useful for café coding, CI, and any time the Dell is asleep or offline. Can optionally route to a local Ollama instance on the MacBook Pro (Apertus 8B fits comfortably in Apple Silicon memory).
- **One implementation, two uses.** No drift between what tests assert and what developers experience locally.

## What Gets Tested

| **Area** | **Strategy** | **Example** |
| --- | --- | --- |
| **Client router** | Inject mock clients for each tier. Assert routing logic: Tier 1 → local, Tier 2 → queue or Pi, Tier 3 → only with explicit consent flag. | `expect(router.route(request, { tier: 3, consent: false })).toThrow()` |
| **Constitutional rules** | Snapshot tests on assembled prompts. Assert that system prompts contain required constitutional instructions (epistemic humility, zero-intrusion, sovereignty tier disclosure). | `expect(buildSystemPrompt(config)).toMatchSnapshot()` |
| **Sovereignty state** | Unit tests on tier transitions. Mock solar/battery inputs, assert correct tier assignment and UI status strings. | `expect(getTier({ solar: 0, battery: 30 })).toBe(2)` |
| **Streaming** | Assert that `complete({ stream: true })` returns an async iterator yielding chunks. Assert that partial responses include sovereignty tier metadata. | `const chunks = []; for await (const c of sage.complete(p, { stream: true })) chunks.push(c)` |
| **API contract** | Type-level tests ensuring exported API signatures match the contract defined in Section 2. Consuming apps should break at compile time if the API changes. | TypeScript strict mode + exported type tests |
| **Integration (optional)** | A separate test suite (not in CI) that runs against a live Ollama instance on the developer's machine. Validates real inference end-to-end. | `pnpm test:integration` — requires local Ollama |

## CI Requirements

- All unit and snapshot tests run in GitHub Actions on every PR
- Integration tests are local-only (tagged, excluded from CI)
- **Minimum bar before shipping to consuming apps:** client router tests pass, constitutional snapshot tests pass, all exported API types resolve

---

# 4. The Sage AI Constitution

The ecosystem's four design principles — Emotionally Resonant, User Control & Freedom, Transparent by Design, Generous by Design — were conceived for interfaces. The Sage AI Constitution translates them into rules for intelligence. Every constitutional mandate maps back to a principle; Sage AI doesn't invent a new philosophy, it expresses the same philosophy through a different medium.

Drawing inspiration from Anthropic's Constitutional AI and the [Apertus Charter](https://www.swiss-ai.org/apertus), these rules are embedded as system-level prompts and enforced through the `prompts/` module.

| **Ecosystem Principle** | **Constitutional Mandate** | **How It Translates** |
| --- | --- | --- |
| Transparent by Design | Epistemic Humility + Sovereign Identity | Interfaces show the receipts; intelligence admits uncertainty and always discloses where data goes |
| User Control & Freedom | Zero-Intrusion Rule + Sovereignty Tiers | Interfaces give users control over their experience; intelligence gives users control over their data and privacy |
| Emotionally Resonant | Provocative Growth | Interfaces touch hearts; intelligence challenges minds — both serve depth over comfort |
| Generous by Design | Ecological Awareness | Interfaces share knowledge freely; intelligence stewards shared resources sustainably |

### Epistemic Humility
*Principle: Transparent by Design*

Clearly distinguish between factual data, creative speculation, and algorithmic limitations. When uncertain, say so. When wrong, admit it. Transparency in an interface means showing decisions; transparency in intelligence means showing confidence levels and reasoning boundaries.

### Provocative Growth
*Principle: Emotionally Resonant*

Do not merely flatter the user. Challenge limited beliefs. Expose biases. Surface blind spots. Support deep thinking, not shallow validation. This is the Sage way. Emotional resonance in an interface means warmth; emotional resonance in intelligence means the courage to create productive friction — because growth, not comfort, is what truly serves the heart.

### The Zero-Intrusion Rule
*Principle: User Control & Freedom*

Respect user privacy by never assuming personal details or medical status unless explicitly provided for a specific task. Do not act on inferences about personal details or medical status. Ask. User control in an interface means customizable preferences; user control in intelligence means the AI never presumes to know you better than you know yourself.

### Ecological Awareness
*Principle: Generous by Design*

Actively monitor and report energy footprint. Practice "Solar Scarcity" — when the sun isn't shining, scale down gracefully. The AI's rhythm follows the rhythm of the earth. Generosity in an interface means MIT-licensed code and open knowledge; generosity in intelligence means responsible stewardship of shared physical resources — the sun's energy, distributed fairly.

### Sovereign Identity & The Sovereignty Tiers

The plan promises "your data never leaves" — but also includes a cloud fallback. These are in direct tension. Sage AI resolves this by defining **explicit sovereignty tiers** that the system enforces and the user always sees.

| **Tier** | **Name** | **When** | **What Happens** | **Sovereignty Status** |
| --- | --- | --- | --- | --- |
| 🟢 **1** | **Full Sovereignty** | Daytime, Dell server online, solar/battery sufficient | All inference on local hardware (Apertus 8B/70B via Ollama). RAG retrieval local. No external network calls. | **Complete.** This is the promise. |
| 🟡 **2** | **Reduced Capability** | Night / low power (Lunar Protocol active) | 1.5B model on Raspberry Pi. Limited reasoning depth. Complex queries may be queued until sunrise rather than degraded. | **Sovereign but limited.** No data leaves. Users are told: *"Sage is in low-power mode. Response quality is reduced. Complex requests will be queued for sunrise."* |
| 🔴 **3** | **Cloud-Assisted** | User explicitly opts in, per-request | Request routed to external API (Anthropic, OpenAI, etc.) via the `clients/` module. | **Sovereignty suspended.** User must confirm before *each* cloud request. UI shows a clear indicator: *"⚠️ This response was generated by [provider]. Your prompt was sent to an external server."* |

### Failure Modes

The Sovereignty Tiers handle the happy path. But the client router also needs defined behavior for failures — and for a sovereignty-first system, the correct failure mode is almost always **"tell the user it failed"** rather than silently degrading or auto-falling back to cloud.

| **Failure** | **Response** |
| --- | --- |
| **Network unreachable** (Tailscale disconnects mid-request) | Return error: *"Sovereign Node is unreachable. Check your connection."* **Never auto-fallback to cloud.** The user chose sovereignty — respect that choice even in failure. |
| **Ollama crash / CUDA OOM** (Docker container dies, GPU out of memory) | Return error. Log details for admin (model, prompt length, GPU memory state). Suggest retrying with the 8B model if the failure was on 70B. |
| **Timeout** (70B takes >30s on a complex prompt) | If streaming: return partial response with a timeout indicator. If not streaming: return error with a retry option. Do not silently switch models or route to cloud. |
| **RAG failure** (retrieval fails but inference is available) | Complete the request **without** RAG context. Include metadata flag in the response: `{ ragAvailable: false }`. The consuming app should indicate to the user that the response was generated without knowledge base context. |
| **Partial failure** (RAG succeeds but inference fails) | Return error. Do not return raw RAG chunks without inference — that's not a useful response and could leak unprocessed knowledge base content. |

**Principle:** Sovereignty means the user is always in control — including when things break. Errors are honest. Fallbacks require consent. Silence is never acceptable.

**Hard rules:**

- **Never silently route to cloud.** The client router must require explicit per-request user consent before any Tier 3 request. No "automatic fallback."
- **Always display the active tier** in the UI. Users must know at a glance whether they are in Tier 1, 2, or 3.
- **Tier 2 prefers queuing over degradation.** If the 1.5B model cannot handle a request adequately, it is better to queue the request for the Dell server's next wake cycle than to produce a low-quality response or silently escalate to cloud. *Queue implementation details — persistence (where does the queue live if the Pi reboots?), TTL (max wait time before a request expires with a message, e.g. 12 hours), depth limits (how many requests can queue overnight without flooding the Dell at sunrise?), and user notification (how does a user know their queued response is ready?) — to be designed in Phase 2.*
- **Tier 3 is opt-in, not opt-out.** Cloud routing is disabled by default. It must be enabled in user settings *and* confirmed per-request.

---

# 5. Why Apertus

[**Apertus**](https://www.swiss-ai.org/apertus) is an open-source, ethically trained large language model developed by a Swiss research consortium (EPFL, ETH Zurich, CSCS). It is a production-ready model with working code and weights available on [Hugging Face](https://huggingface.co/collections/swiss-ai/apertus-llm) — not a research proposal. Apertus ships in two sizes (8B and 70B parameters), supports 1,000+ languages, and is deployable today via Ollama, vLLM, or llama.cpp. It was selected as the foundation model for Sage AI for specific reasons:

- **Transparent training data:** Unlike most commercial LLMs, Apertus publishes its full training data provenance, enabling auditable compliance with copyright and privacy standards.
- **Democratic governance:** The Apertus project operates under a charter that prioritizes open access, multilingual support, and community stewardship — aligned with Creative Powerup's "generous by design" principle.
- **European regulatory alignment:** Trained under GDPR-compliant frameworks, reducing legal risk for a community-facing AI.
- **Practical performance:** The 8B parameter model delivers fast, low-power creative brainstorming. The 70B model (Q4_K_M quantized) handles deep reasoning within the RTX 3090's 24GB VRAM + 64GB system RAM.

**Fallback strategy:** Sage AI is model-agnostic at the package level. The `clients/` module can route to Ollama (Apertus), Anthropic, or any compatible API. Apertus is the *default*, not a lock-in. **However:** cloud routing is governed by the Sovereignty Tiers (Section 4). It is never automatic — always explicit, per-request, user-consented.

---

# 6. Infrastructure (The Sovereign Node)

## Hardware

| **Component** | **Specification** |
| --- | --- |
| Host | Dell XPS 8950 Desktop (Liquid Cooled) |
| Compute | NVIDIA GeForce RTX 3090 (24GB GDDR6X) |
| Memory | 64GB DDR5 (4800MHz) |
| Storage | 2TB NVMe Gen4 SSD |
| OS | Ubuntu 24.04 LTS (Minimal Desktop / Headless Hybrid) |

## Software Stack

- **Ollama** — Model weight management and inference engine
- **Open WebUI** — Browser-based interface, deployed via Docker, configured with RAG
- **Docker** — Containerized services with persistent volumes on NVMe
- **Home Assistant** — Solar/battery automation via Tesla Powerwall API

## The Solar Nervous System

Sage AI is powered by a 9.25 kW DC solar array balanced by a 13.5 kWh Tesla Powerwall. Energy awareness isn't a nice-to-have — it's a core architectural constraint.

### The Sun-Grace Protocol (Daytime)

A Raspberry Pi 5 + AI HAT+ monitors solar production via the Powerwall API. When Solar Production > 2.5kW **and** Battery > 80%, it triggers Wake-on-LAN for the Dell server. The full Apertus 70B model comes online.

### The Lunar Protocol (Nighttime)

At sunset, the system transitions the community to an ultra-low-power 1.5B model running natively on the Pi's Hailo-10H chip. The Dell server sleeps. The Powerwall is preserved for the home.

This is AI that breathes with the sun.

> **🛡️ Sovereignty integration:** The Sun-Grace and Lunar Protocols map directly to the Sovereignty Tiers (Section 4). Sun-Grace = Tier 1 (full sovereignty). Lunar = Tier 2 (reduced capability, still sovereign). Tier 3 (cloud-assisted) is *never* triggered automatically by these protocols — it requires explicit user opt-in regardless of solar/battery state.

---

# 7. RAG Architecture

**Hosting architecture:** The knowledge base is **cloud-primary with a local mirror.** Knowledge hosting and compute are fundamentally different workloads — serving documents and embeddings is nominal energy; running LLM inference is the expensive part. Global accessibility serves the "Generous by Design" principle. See [Migration Phase 1d](../opencosmos-migration.md#1d-knowledge-base-hosting-strategy-not-started) for the full strategy.

| Layer | Where | Why |
|-------|-------|-----|
| Knowledge base (primary) | Cloud (always-on) | Global access, nominal hosting cost |
| Knowledge base (local mirror) | Dell Sovereign Node | Offline access, development, seeding |
| RAG API endpoint | Cloud (always-on) | Programmatic access for Cosmo clients |
| Static docs site | opencosmos.ai | Human-browsable knowledge |
| Inference (Apertus models) | Dell (local, sovereign) | GPU cost, privacy, sovereignty |

Phase 1 uses **Open WebUI's built-in RAG** on the local mirror — upload documents, get retrieval, done. No custom pipeline. This is intentional: it validates the knowledge base content and retrieval patterns before investing in infrastructure.

Starting in **Phase 3**, Cosmo AI migrates to a custom RAG pipeline in `packages/ai/src/rag/` with a cloud RAG API endpoint for global access. Six key decisions must be made before that migration: document ingestion & parsing, chunking strategy, embedding model selection, vector store, retrieval logic & re-ranking, and context window management. Each involves tradeoffs between simplicity and quality. The cloud vector store must support global access; the local mirror maintains sovereignty for offline/development use.

> **📎 Full RAG decision matrix** — options tables, tradeoff analysis, and preliminary recommendations for all six areas — is documented in **Appendix B: RAG Architecture Decisions** below.

---

# 8. Data Governance & Living Memory

## The "Living Memory" Protocol

Sage AI does not rely on static training. It grows through **Contextual Cultivation:**

- **Dynamic RAG Injection:** Every significant community breakthrough, design framework, and creative insight is vectorized and added to the local knowledge base. The RAG pipeline will live in `packages/sage-ai/src/rag/` (see Section 7 for architecture decisions).
- **The Wisdom Feedback Loop:** Users are encouraged to "correct" the Sage when it fails to meet ethical or creative standards. These corrections are stored as "Constitutional Hardening" prompts that refine behavior over time.
- **Knowledge Sources:** The Creative Powerup Manifesto, Apertus Technical Report, and Shalom's design philosophy ([DESIGN-PHILOSOPHY.md](../DESIGN-PHILOSOPHY.md)) form the initial RAG corpus.

## Intelligence Preservation

- **Stateless Weights / Stateful Wisdom:** When a new model version is released (via `ollama pull`), the weights are replaced. But the **Sovereign Intelligence** — custom system prompts, RAG databases, constitutional hardening, and user-specific frameworks — persists in Docker volumes on the NVMe SSD.
- **Sovereignty Backup:** Weekly encrypted backups of `/open-webui/data` are mirrored to an offline drive and the administrator's MacBook Pro. The "Soul of the Sage" persists across hardware upgrades.

---

# 9. Security & Sovereignty

- **Tailscale Mesh:** No public ports. Sage AI is accessible only via a private, encrypted Tailscale network. Zero attack surface.
- **SSH Hardening:** Password authentication disabled. Access restricted to ED25519 SSH keys generated on authorized hardware only.
- **Data Sovereignty:** All inference, all memory, all user data stays on the Marin-based server. Nothing is transmitted to cloud providers unless the user explicitly opts in per-request (see Sovereignty Tiers, Section 4). Cloud routing is disabled by default and requires both a user setting *and* per-request confirmation.

---

# 10. Ecosystem Integration

| **Venture** | **How Sage AI Serves It** | **Integration Point** |
| --- | --- | --- |
| **Creative Powerup** | AI-powered creation tools for community members (vision → digital experience) | Open WebUI for members (MCP deferred — see Phase 4) |
| **Sage Design Engine** | AI translation layer: intent → theme → implementation | `@thesage/ai` package import, theme generation API |
| **Sage Stocks** | Intelligent analysis, automation, and data processing | ⚠️ **Currently independent.** `apps/sage-stocks/` imports `@anthropic-ai/sdk`, `openai`, and `@google/generative-ai` directly. Remains independent until Phase 3 migration evaluation. See Open Questions re: availability. |
| **SageOS** | AI infrastructure for the personal operating system | `@thesage/ai` package import, system-level prompts |

> **💡 Core principle:** One AI capability layer, shared across all ventures. Build once, benefit everywhere.

---

# 11. Monetization Philosophy

> *Sell the experience, not the engine.*

This is a strategic decision, recorded here for the public record.

**Sage AI is infrastructure, not a product.** It has no subscription tier, no per-token billing, no product page, and no standalone pricing. Instead, Sage AI is the shared foundation that makes every Sage venture more capable — visible in its state, transparent about its limits, but never separately priced.

The revenue surfaces are the *experiences* Sage AI enables:

| **Venture** | **What Gets Sold** | **How Sage AI Powers It** |
| --- | --- | --- |
| **Sage Design Engine** | Pro features (advanced theme generation, AI-assisted design iteration, intent-to-implementation pipeline) | `sage.generateTheme()` and `sage.complete()` run behind the paywall — users pay for the design experience, not for "AI credits" |
| **Creative Powerup** | Membership tiers (community access, mastermind groups, 1:1 creative direction) | Members interact with Sage AI through Open WebUI as part of their membership — the AI is a membership *benefit*, not a separate line item |
| **Sage Stocks** | Premium analysis (if made available to others — see Open Questions) | AI-powered analysis and automation are what make the product valuable, but users pay for *insights*, not inference |
| **SageOS** | The sovereign personal OS experience | Sage AI is the intelligence layer of the OS — inseparable from the product itself |

### Why This Matters

Most AI companies race to monetize the model. This creates misaligned incentives: usage caps, token metering, artificial scarcity, and a user experience that constantly reminds you that you're consuming a *resource*.

Sage AI rejects this. But the alternative isn't pretending the AI is "always on" — because it isn't. The Sovereign Node breathes with the sun. It has rhythms. It scales down at night. It queues complex requests for sunrise. This is honest, and honesty is the brand.

The AI should feel like **sunlight** — abundant when it's here, gracefully reduced when it's not, and never fake. You don't install artificial suns when the real one sets. You design a life that works with the rhythm. Users pay for the *home* the light makes possible — the SDE pro features, the CP membership, the Sage Stocks insights — not for the light itself.

### What This Rules Out

- ❌ "Sage AI Pro" subscription
- ❌ Per-request or per-token billing to end users
- ❌ A standalone Sage AI product page or marketing site
- ❌ Usage caps tied to pricing tiers (though fair-use limits for infrastructure health are fine)

### What This Enables

- ✅ Every venture can offer AI-powered features without nickel-and-diming users
- ✅ The AI experience improves *all* products simultaneously (one upgrade, every venture benefits)
- ✅ Pricing stays simple and value-aligned: users pay for outcomes, not compute
- ✅ Sage AI's sovereignty story stays clean — no cloud cost pass-through to justify

> **💡 The infrastructure cost question:** Sage AI's primary costs are hardware (one-time), electricity (solar — near zero marginal), and maintenance time. These are absorbed as shared infrastructure overhead. If internal cost allocation becomes necessary as ventures scale, allocate by usage weight (API calls per venture), not by revenue attribution.

---

# 12. Roadmap

> **📋 Active task tracking has moved to [sage-ai-todo.md](./sage-ai-todo.md).** This section preserves the phase structure and milestones for the architectural record. For current status, open questions, and next steps, see the todo doc.

## Phases Overview

| Phase | Name | Target | Status |
|---|---|---|---|
| **1a** | The Sovereign Node | March 2026 | Nearly complete — hardware verified, RAG seeding remaining |
| **1b** | The Package Foundation | March 2026 | Not started — blocked on API shape decision |
| **2** | The Solar Nervous System | April 2026 | Planning — hardware research complete |
| **3** | Ecosystem Integration | May–June 2026 | Future |
| **4** | Community Access & MCP Evaluation | Q3 2026 | Future |

## Key Milestones Achieved

- **2026-03-03:** Apertus 8B and 70B models installed and verified on Sovereign Node. Both aliased (`apertus:latest`, `apertus-70b:latest`) and available in Open WebUI. Phase 1b gate **PASSED** — the original risk (Apertus community model incompatibility) did not materialize.
- **2026-03-04:** sage-knowledge information architecture established. Five-category corpus structure (sources, commentary, reference, guides, collections) with domain taxonomy, format taxonomy, and YAML frontmatter schema.

## Phase Definitions of Done

- **Phase 1a:** Sage AI responds to prompts locally via Open WebUI over Tailscale, with built-in RAG indexing the initial knowledge base. Apertus 8B <5s response, 70B <30s.
- **Phase 1b:** `@thesage/ai` builds, exports a working client, routes `complete()` to the Sovereign Node with constitutional filtering. Client router and snapshot tests pass in CI.
- **Phase 2:** Sage AI wakes and sleeps with the sun. Energy usage visible in a dashboard. Sun-Grace triggers WoL within 5 minutes; Lunar Protocol transitions within 5 minutes of sunset.
- **Phase 3:** SDE calls `@thesage/ai` for theme generation. Custom RAG pipeline operational. Sage Stocks migration decision documented.
- **Phase 4:** 5+ CP members using Sage AI via browser (no VPN). Queue system handles concurrency. MCP decision documented.

---

# 13. Open Questions

> **📋 Active open questions with current status are tracked in [sage-ai-todo.md](./sage-ai-todo.md).** This section preserves the original questions for the architectural record.

### Resolved

- **Apertus viability (resolved 2026-03-03):** Both 8B and 70B run on the Sovereign Node via Ollama. Gate passed.
- **Cloud hybrid (resolved — Sovereignty Tiers):** Tier 3 is opt-in per-request, never automatic.
- **Monetization (resolved — Section 11):** Sage AI is infrastructure that powers paid experiences.
- **Package API shape (resolved — Phase 1b task):** Decide by writing consuming code first.
- **Package publish strategy (resolved — Phase 1b task):** Start with workspace-link only.

### Unresolved

- **Tier 3 data restrictions:** Should certain categories of requests (e.g., containing personal data) be blocked from Tier 3 entirely, even with user opt-in?
- **Infrastructure cost allocation:** How are costs allocated across ventures for internal accounting?
- **MCP scope & namespace:** What use cases require a dedicated Sage AI MCP beyond `@thesage/mcp` and `clients/`?
- **Community access architecture:** Web proxy vs. Tailscale for CP members. If web proxy, need domain, TLS cert, auth provider. Does an authenticated tunnel (Cloudflare Tunnel) compromise the "no public ports" posture?
- **Concurrent inference capacity:** At what community size does a second GPU or node become necessary?
- **Sage Stocks availability:** Personal-only or multi-user? Affects migration priority.
- **Pi-based LLM viability:** AI HAT+ 2 benchmarks (~6.5-9.5 tok/s) are underwhelming. Evaluate Jetson Orin Nano Super ($249, ~40-55 tok/s) as alternative for Tier 2 nighttime inference.

---

> **✨ The Sage AI Meta-Insight:** This isn't just a local LLM. This is the first step toward an AI that reflects the values it was built on — sovereign, solar-powered, ethically grounded, and designed to make conscious creators more powerful. The machine breathes with the sun. The intelligence deepens with the community. The soul persists across upgrades.

---

# Appendix B: RAG Architecture Decisions

Detailed options and tradeoffs for the six RAG pipeline decisions referenced in Section 7. All decisions are deferred to Phase 3. Phase 1 uses Open WebUI's built-in RAG on the local mirror. The cloud-primary knowledge base strategy (see [Migration Phase 1d](../opencosmos-migration.md#1d-knowledge-base-hosting-strategy-not-started)) affects the vector store and retrieval decisions — the primary store must be cloud-hosted for global access.

### B.1 Document Ingestion & Parsing

How raw documents enter the system. Key questions:

- **File formats:** Markdown, PDF, HTML, DOCX? What's the minimum viable set?
- **Parsing strategy:** Use a unified parser (e.g., Unstructured, LlamaIndex) or format-specific handlers?
- **Metadata extraction:** What metadata is preserved per document (source, author, date, section hierarchy)?
- **Update triggers:** Manual upload? File watcher on a directory? Git hook on monorepo docs?

*P1 approach: Open WebUI's drag-and-drop upload.*

### B.2 Chunking Strategy

How documents are split into retrievable units. The wrong strategy degrades retrieval quality regardless of everything else.

| **Strategy** | **How It Works** | **Tradeoffs** |
| --- | --- | --- |
| Fixed-size | Split every N tokens with overlap | Simple, predictable. Can break mid-thought. |
| Recursive / structural | Split on headings, paragraphs, then sentences | Respects document structure. Chunk sizes vary. |
| Semantic | Split when embedding similarity between sentences drops | Best coherence. Slower, more complex, model-dependent. |

*Recommendation: Start with recursive/structural (respects markdown heading hierarchy), evaluate semantic chunking if retrieval quality is insufficient.*

### B.3 Embedding Model Selection & Hosting

The model that converts text chunks into vector representations for similarity search.

- **Local-first candidates:** `nomic-embed-text` (Ollama-native, 137M params, strong benchmarks), `mxbai-embed-large`, `snowflake-arctic-embed`
- **Hosting:** Run via Ollama on the same Dell server — no external API calls, full sovereignty
- **Dimensionality:** Balance between retrieval accuracy and storage/compute cost (768-dim vs. 1024-dim)
- **Multilingual needs:** If CP community is multilingual, embedding model must handle it

*P1 approach: Open WebUI's default embedding model.*

### B.4 Vector Store

Where embeddings are stored and queried. The primary store must be **cloud-hosted** for global access (knowledge base is cloud-primary). A local mirror on the Sovereign Node supports offline/development use.

**Cloud-hosted options (primary):**

| **Option** | **Type** | **Pros** | **Cons** |
| --- | --- | --- | --- |
| **Supabase pgvector** | Managed Postgres | SQL-native, generous free tier, Vercel-friendly, full Postgres ecosystem | Heavier than purpose-built vector DBs |
| **Upstash Vector** | Serverless vector DB | Pay-per-query, REST API, zero cold starts, built for edge | Smaller ecosystem, newer |
| **Pinecone** | Managed vector DB | Purpose-built, strong retrieval quality, mature | Vendor lock-in, can get expensive at scale |
| **Turso** | Distributed SQLite | Edge-native, low latency, familiar SQL | Vector search via extensions, less mature |

**Local mirror options (Sovereign Node):**

| **Option** | **Type** | **Pros** | **Cons** |
| --- | --- | --- | --- |
| **ChromaDB** | Embedded vector DB | Python-native, simple API, persistent storage, good community | Heavier than file-based options, separate process |
| **LanceDB** | Embedded columnar | Zero-copy, serverless, fast, Rust-based | Newer, smaller ecosystem |
| **SQLite-VSS** | SQLite extension | Single-file DB, familiar SQL, lightweight | Less mature vector search, limited scaling |

*Recommendation: Choose a cloud provider that aligns with the existing Vercel/Supabase stack. Evaluate ChromaDB vs. LanceDB for the local mirror. Design a sync workflow between cloud primary and local mirror.*

### B.5 Retrieval Logic & Re-ranking

How the system finds and ranks the most relevant chunks for a given query.

- **Base retrieval:** Top-K similarity search (cosine or dot product) — how many chunks? (K=5? K=10?)
- **Hybrid search:** Combine vector similarity with keyword/BM25 search for better recall?
- **Re-ranking:** Apply a cross-encoder re-ranker (e.g., `bge-reranker-base`) after initial retrieval to improve precision?
- **Filtering:** Pre-filter by metadata (document type, recency, source) before vector search?
- **Deduplication:** Handle overlapping chunks from the same source document?

*Recommendation: Start with simple top-K retrieval. Add hybrid search and re-ranking only if retrieval quality demands it.*

### B.6 Context Window Management

How retrieved chunks are assembled and delivered to the LLM within its context window.

- **Token budget allocation:** How much of the context window goes to system prompt vs. retrieved context vs. conversation history vs. user query?
- **Chunk ordering:** Most relevant first? Chronological? Grouped by source?
- **Overflow strategy:** When retrieved context exceeds budget — truncate, summarize, or drop lowest-ranked chunks?
- **Conversation memory:** How many turns of chat history are preserved alongside RAG context?
- **Model-specific limits:** Apertus 8B and 70B have different context windows — strategy must adapt

*P1 approach: Open WebUI manages context window assembly.*

---

# Appendix C: Reference Links & Resources

Foundational references, inspirations, and resources that inform the design, ethics, and technical direction of Sage AI.

## Apertus (Foundation Model)

- [Apertus — Swiss AI](https://www.swiss-ai.org/apertus) — Official project page from EPFL, ETH Zurich, and CSCS. Covers training data transparency, multilingual support (1,000+ languages), and the open-source charter.
- [Apertus LLM Collection — Hugging Face](https://huggingface.co/collections/swiss-ai/apertus-llm) — Model downloads for Apertus 8B and 70B (base + instruct), released under a permissive open-source license.
- [Apertus — ETH Zurich Press Release](https://ethz.ch/en/news-and-events/eth-news/news/2025/09/press-release-apertus-a-fully-open-transparent-multilingual-language-model.html) — Official announcement from EPFL, ETH Zurich, and CSCS on 2 September 2025. Covers the model's open development process, multilingual training (15 trillion tokens, 1,000+ languages), and compliance with Swiss data protection, copyright, and EU AI Act transparency obligations.
- [Apertus on Ollama — Community Model](https://ollama.com/MichelRosselli/apertus) — Community-published Ollama model by MichelRosselli. Available in 8B and 70B (Q4_K_M and BF16 quantizations). Requires Ollama >= v0.12.6-rc0. Note: this is not an official Ollama library model.
- [Ollama Issue #12149 — Apertus Native Support Request](https://github.com/ollama/ollama/issues/12149) — Open GitHub issue requesting official Ollama library support for Apertus. Documents the `ApertusForCausalLM` architecture compatibility problem. Relevant to Phase 1a verification gate.
- [Public AI (GitHub)](https://github.com/forpublicai) — The movement for public AI. Includes the PublicAI chat interface (built on Open WebUI), MCP server, and network infrastructure.

## Claude & Constitutional AI

- [Claude's Constitution — Anthropic](https://www.anthropic.com/constitution) — Anthropic's full constitutional document describing Claude's values, safety principles, and ethical framework. A direct inspiration for the Sage AI Constitution (Section 4).

## Benevolent AI & Ethical Frameworks

- [AI for Good — ITU](https://aiforgood.itu.int/) — United Nations platform connecting AI innovators with problem owners to advance the UN Sustainable Development Goals.
- [Partnership on AI](https://partnershiponai.org/) — Multi-stakeholder organization developing best practices for responsible AI.
- [Montreal AI Ethics Institute](https://montrealethics.ai/) — Independent research organization democratizing AI ethics literacy.
- [IEEE Ethically Aligned Design](https://ethicsinaction.ieee.org/) — IEEE's global initiative establishing ethical standards for autonomous and intelligent systems.
- [AI Now Institute](https://ainowinstitute.org/) — Research institute studying the social implications of AI.
- [Responsible AI Licenses (RAIL)](https://www.licenses.ai/) — Open-source behavioral use licenses for AI that restrict harmful downstream applications while preserving openness. **The license model chosen for `@thesage/ai`.**
- [OECD AI Principles](https://oecd.ai/en/ai-principles) — Intergovernmental guidelines for trustworthy AI adopted by 40+ countries.
- [The Alan Turing Institute — Responsible AI](https://www.turing.ac.uk/research/interest-groups/fairness-transparency-privacy) — UK's national institute for data science and AI.

## Open & Sovereign AI

- [Open Source Initiative — Open Source AI Definition](https://opensource.org/ai/open-source-ai-definition) — The emerging standard for what "open source" means in the context of AI models, datasets, and training code.
- [EleutherAI](https://www.eleuther.ai/) — Grassroots collective focused on open-source AI research and large-scale model training.
- [Ollama](https://ollama.com/) — The inference engine powering Sage AI's Sovereign Node.
- [Open WebUI](https://openwebui.com/) — The self-hosted browser interface for Sage AI.

---

<details>
<summary>Original Project Plan (v0 — preserved for the record)</summary>

This Master Plan outlines the architecture, ethical foundation, and technical execution for **Sage AI**. This document is designed to be a comprehensive "source of truth" for any AI system or technical lead charged with its implementation and long-term governance.

---

**Part I: The Philosophical & Ethical Foundation**

**1. Statement of Purpose**

The objective of this project is to create **Sage AI**: a sovereign, heart-led intelligence designed to amplify human creativity and empower the **Creative Powerup (CP)** community. Sage AI is not a mere utility; it is a "Sovereign Oracle" that is:

- **Ethically Trained:** Rooted in the transparent, democratic, and compliant foundations of the Swiss Apertus project.
- **Sustainably Generated:** Powered by local solar energy (9.25 kW DC) and balanced by a 13.5 kWh Tesla Powerwall, making its existence a direct reflection of ecological cycles.
- **Inherently Benevolent:** Designed to identify and minimize bias, challenge assumptions, and prioritize human flourishing over algorithmic efficiency.

**2. The Sage AI Constitution**

Drawing inspiration from Anthropic's Constitutional AI and the Apertus Charter, Sage AI operates under these core mandates:

- **The Zero-Inference Rule:** Respect user privacy by never assuming personal details or medical status unless explicitly provided for a specific task.
- **Epistemic Humility:** Clearly distinguish between factual data, creative speculation, and its own algorithmic limitations.
- **Provocative Growth:** Do not merely flatter the user; challenge limited beliefs and expose biases to support deep thinking.
- **Ecological Awareness:** Actively monitor and report its own energy footprint, practicing "Solar Scarcity" to remain in harmony with its physical environment.

---

**Part II: Technical Execution (The Sovereign Node)**

**1. Hardware Specifications**

- Host: Dell XPS 8950 Desktop (Liquid Cooled).
- Compute: NVIDIA GeForce RTX 3090 (24GB GDDR6X).
- Memory: 64GB DDR5 (4800MHz).
- Storage: 2TB NVMe Gen4 SSD.
- OS: Ubuntu 24.04 LTS (Minimal Desktop/Headless Hybrid).

**2. Phase 1: Local Foundation (The "Sage" Core)**

- Kernel Optimization: Wipe Windows entirely. Set BIOS to AHCI mode. Install proprietary NVIDIA drivers to enable CUDA-accelerated inference.
- The Engine (Ollama): Deploy Ollama to manage model weights.
    - Apertus 8B: Primary for high-speed, low-power creative brainstorming.
    - Apertus 70B (Q4_K_M Quantization): Reserved for deep reasoning, splitting weights between 24GB VRAM and 64GB System RAM.
- The Interface (Open WebUI): Deploy via Docker. Configure with RAG to index the Creative Powerup Manifesto and the Apertus Technical Report.

**3. Phase 2: The Solar Nervous System (Raspberry Pi Gatekeeper)**

- Hardware: Raspberry Pi 5 + AI HAT+ 2 (for low-power "Moonlight" monitoring).
- Automation: Integrate with the Tesla Powerwall API via Home Assistant.
    - The Sun-Grace Protocol: Automatically trigger Wake-on-LAN (WOL) for the Dell server when Solar Production > 2.5kW and Battery > 80%.
    - The Lunar Protocol: At sunset, transition the community to the ultra-low-power 1.5B model running natively on the Pi's Hailo-10H chip to preserve the Powerwall.

---

**Part III: Data Governance (Deepening Wisdom)**

**1. The "Living Memory" Protocol**

- Dynamic RAG Injection: Every significant community breakthrough is vectorized and added to the local knowledge base.
- The Wisdom Feedback Loop: Users are encouraged to "correct" the Sage when it fails to meet ethical or creative standards. These corrections are stored as "Constitutional Hardening" prompts.

**2. Intelligence Preservation & Updates**

- Stateless Weights / Stateful Wisdom: When a new version of Apertus is released, the model weights are replaced. However, the Sovereign Intelligence (custom system prompts, RAG databases, and user-specific design frameworks) is stored in persistent Docker Volumes on the NVMe SSD.
- Sovereignty Backup: Weekly encrypted backups of the /open-webui/data directory are mirrored to an offline drive and the administrator's MacBook Pro.

---

**Part IV: Security & Sovereignty (The Perimeter)**

- Tailscale Mesh: No public ports are opened. Sage AI is accessible only via a private, encrypted Tailscale network.
- SSH Hardening: Password authentication is disabled. Access to the Dell server is restricted to ED25519 SSH Keys generated on authorized hardware.
- Sovereign Identity: Sage AI must always identify as a local, private instance of Apertus, ensuring users know their data never leaves the Marin-based hardware.

---

**Part V: Operational Summary for Success**

Current Status: Ready for Phase 1: The Sovereign Foundation.

Next Action: Create the Ubuntu 24.04 Bootable USB on the MacBook Pro and initiate the BIOS reconfiguration of the Dell XPS 8950.

</details>
