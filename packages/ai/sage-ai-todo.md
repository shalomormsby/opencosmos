# Sage AI — Task Tracker

> Active task management for Sage AI development. For vision, architecture, and design rationale, see [INCEPTION.md](./INCEPTION.md).

**Last updated:** 2026-03-04

---

## Next Step

**Seed the Open WebUI knowledge base with initial documents.** Curate the first source documents following the [sage-knowledge IA](../../sage-knowledge/README.md) — starting with the CP Manifesto, Design Philosophy, Sage AI Constitution, and Apertus Technical Report. Upload to Open WebUI as the "Foundations" knowledge base on the Sovereign Node.

This completes Phase 1a and validates the RAG pipeline end-to-end.

---

## Phase 1a: The Sovereign Node

*Target: March 2026 · Status: Nearly complete*

- [x] Wipe Dell XPS 8950, install Ubuntu 24.04 LTS
- [x] Set BIOS to AHCI mode, install proprietary NVIDIA drivers, verify CUDA acceleration
- [x] Deploy Ollama + pull Apertus models
  - Both models pulled and aliased: `apertus:latest` (8B, 5.1GB) and `apertus-70b:latest` (70B Q4_K_M, 43.7GB)
  - Both models appear in Open WebUI model selector and are available for inference
- [x] Deploy Open WebUI via Docker (built-in RAG, no custom pipeline yet)
- [x] Configure Tailscale mesh and SSH hardening
- [ ] **Upload initial documents to Open WebUI's RAG** — CP Manifesto, Apertus Technical Report, Design Philosophy, Sage AI Constitution (following [sage-knowledge IA](../../sage-knowledge/README.md))
- [ ] **Benchmark gate:** Apertus 8B generates a coherent response in <5s on the RTX 3090; 70B (Q4_K_M) generates in <30s
- [ ] **Phase complete when:** Sage AI responds to prompts locally via Open WebUI over Tailscale, with built-in RAG indexing the initial knowledge base

---

## Phase 1b: The Package Foundation

*Target: March 2026 · Status: Not started (blocked on API shape decision)*

### Prerequisites (decide before writing code)

- [ ] **Resolve workspace configuration:** `pnpm-workspace.yaml` currently only includes `apps/*`. Either add `packages/*` for local linking, or accept publish-per-change workflow. This affects all existing packages (`@thesage/ui`, `@thesage/tokens`, `@thesage/mcp`).
- [ ] **Decide package API shape:** Domain-specific methods in core or subpaths? High-level client or low-level primitives? React hooks in `@thesage/ai` or `@thesage/ai-react`? Decide by writing consuming code first — prototype the CP API route and SDE theme generation call.
- [ ] **Decide package publish strategy:** (a) workspace-link + npm publish, (b) workspace-link only (recommended — defer npm publish until external consumers exist), or (c) full npm publish with changesets/CI from day one.

### Implementation

- [ ] Initialize `ecosystem/packages/sage-ai` in the monorepo (TypeScript, tsup build config, exports)
- [ ] Implement `createSageClient(config)` factory with Sovereignty Tier awareness
- [ ] Implement `clients/` module: Ollama local client + Tier 3 cloud client (gated by explicit consent) + `MockSageClient` (shared by tests and local dev)
- [ ] Implement `prompts/` module: constitutional rules as system-level prompt templates
- [ ] Wire `sage.status()` to report active tier, model, and server health

### MVP scope

> The minimum that proves the architecture: `createSageClient(config)` + `sage.complete()` + Ollama local client + `MockSageClient` + one constitutional prompt (Epistemic Humility). If this chain sends a prompt from a consuming app through the package to the Sovereign Node and back with constitutional filtering, the architecture is validated.

### Gates

- [ ] Client router unit tests and constitutional snapshot tests pass in CI
- [ ] All exported API types resolve under TypeScript strict mode
- [ ] **Phase complete when:** `@thesage/ai` builds, exports a working client, and can route a `complete()` call to the Sovereign Node over Tailscale — or to the `MockSageClient` for local dev/testing

---

## Phase 2: The Solar Nervous System

*Target: April 2026 · Status: Planning · Design doc: [sustainable-power-system-design.md](./sustainable-power-system-design.md)*

### Hardware (to purchase)

- [ ] Acquire Raspberry Pi 5 (8GB) — ~$95 from authorized reseller
- [ ] Acquire Pi accessories: case, official PSU, NVMe HAT, 256GB NVMe SSD (~$60-80)
- [ ] Acquire Shelly Plug US Gen4 — ~$20 (Dell power draw monitoring, fully local)

### Pre-Setup (can do now, before hardware arrives)

- [ ] Find your Powerwall 2 Gateway IP address — see [step-by-step guide](./sustainable-power-system-design.md#finding-your-powerwall-gateway-and-accessing-its-data)
- [ ] Verify Gateway API returns solar data (`/api/meters/aggregates`) and battery SoC (`/api/system_status/soe`)

### Setup

- [ ] Install Home Assistant OS on the Raspberry Pi 5
- [ ] Configure Tesla Powerwall integration via local Gateway API (no cloud, no subscription)
- [ ] Configure Dell XPS 8950 for WoL from S3 sleep (disable Deep Sleep Control in BIOS)
- [ ] Install Shelly plug inline with Dell power cable, configure in HA
- [ ] Install `wakeonlan` on the Pi and verify WoL to Dell

### Automation

- [ ] Implement Sun-Grace Protocol: when Solar Production > 2.5kW AND Battery > 80%, send WoL to wake the Dell
- [ ] Implement Lunar Protocol: when solar drops below threshold, send sleep command to Dell; Pi continues running Home Assistant
- [ ] Design queue implementation details: persistence, TTL, depth limits, user notification
- [ ] Deploy energy monitoring dashboard (Home Assistant dashboard or Grafana)

### Gates

- [ ] Sun-Grace triggers WoL within 5 minutes of solar/battery threshold being met
- [ ] Lunar Protocol puts Dell to sleep within 5 minutes of sunset conditions
- [ ] **Phase complete when:** Sage AI wakes and sleeps with the sun, and energy usage is visible in a dashboard

### Decisions deferred

- **Pi-based LLM (Tier 2 fallback):** The INCEPTION.md envisions a 1.5B model on the Pi for nighttime. Benchmarks show ~6.5-9.5 tok/s on the AI HAT+ 2 ($130) — underwhelming for conversational AI. Consider deferring this or evaluating the Jetson Orin Nano Super ($249, ~40-55 tok/s on 1.5B models) as an alternative. The Pi's primary role should be orchestration, not inference.

---

## Phase 3: Ecosystem Integration

*Target: May–June 2026 · Status: Future*

- [ ] Integrate with Sage Design Engine (theme generation from intent)
- [ ] Implement client router with Sovereignty Tiers (Ollama local → queue-for-sunrise → explicit-opt-in cloud)
- [ ] Seed RAG with DESIGN-PHILOSOPHY.md + ecosystem docs
- [ ] Migrate from Open WebUI's built-in RAG to custom RAG pipeline in `packages/sage-ai/src/rag/`
- [ ] Evaluate Sage Stocks migration: audit existing direct SDK imports, determine which calls can route through `@thesage/ai`

### Gates

- [ ] SDE theme generation returns valid theme tokens from a natural language prompt in <10s (Tier 1)
- [ ] Custom RAG retrieves relevant chunks with >70% relevance on a test query set
- [ ] **Phase complete when:** SDE calls `@thesage/ai` for theme recommendations, custom RAG is serving retrieval, and Sage Stocks migration decision is documented

---

## Phase 4: Community Access & MCP Evaluation

*Target: Q3 2026 · Status: Future*

- [ ] Resolve community access path (web proxy vs. Tailscale for CP members)
- [ ] Estimate and test concurrent inference capacity on the RTX 3090
- [ ] Implement Living Memory protocol (community wisdom → RAG)
- [ ] Implement Wisdom Feedback Loop (constitutional hardening from user corrections)
- [ ] Document 3-5 concrete MCP use cases that require a dedicated Sage AI MCP server
- [ ] If validated: define namespace boundary and build in `packages/sage-ai/src/mcp/`

### Gates

- [ ] 5+ concurrent users served with <15s average response time on 8B model
- [ ] Queue system correctly prioritizes and delivers queued responses within 1 hour of Dell wake
- [ ] **Phase complete when:** 5+ CP members actively using Sage AI via browser (no VPN), queue system handles concurrency, MCP decision documented

---

## Open Questions

Tracked here for visibility. Not blocking current work unless noted.

- **Model selection:** Apertus verified and working. Long-term, monitor for official Ollama library support ([#12149](https://github.com/ollama/ollama/issues/12149)) and evaluate alternatives as they evolve.
- **Tier 3 data restrictions:** Should certain categories of requests (e.g., containing personal data) be blocked from Tier 3 entirely, even with user opt-in?
- **Infrastructure cost allocation:** How are Sage AI's costs allocated across ventures for internal accounting?
- **MCP scope & namespace:** What use cases require a dedicated Sage AI MCP beyond `@thesage/mcp` and `clients/`?
- **Community access architecture:** Web proxy vs. Tailscale affects infrastructure planning. If web proxy, need domain, TLS cert, auth provider.
- **Concurrent inference capacity:** At what community size does a second GPU or node become necessary?
- **Sage Stocks availability:** Personal-only or multi-user? Affects migration priority.
- **Pi-based LLM viability:** AI HAT+ 2 benchmarks are underwhelming (~6.5-9.5 tok/s). Evaluate Jetson Orin Nano Super as alternative for Tier 2 nighttime inference.
