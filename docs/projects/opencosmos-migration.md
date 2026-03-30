# OpenCosmos Migration Plan

> Project management doc for the transition from "Sage" to "OpenCosmos" across all repos, packages, and infrastructure.

**Created:** 2026-03-08
**Last updated:** 2026-03-29
**Status:** Phase 1 complete. Phase 2a–2c complete. Phase 3a–3b complete. Phase 2d and 3c pending.

---

## Overview

A full rebrand from "Sage" to "OpenCosmos" across two active repositories, four npm packages, multiple documentation surfaces, and all infrastructure. This is not cosmetic — it's a homecoming to a name and identity that predates "Sage" and better embodies the project's philosophy.

### Key Mappings

| Before | After | Status |
|--------|-------|--------|
| Sage Design Engine | OpenCosmos UI | **Done** (Phase 2c) |
| @thesage/ui | @opencosmos/ui | **Done** — published v1.3.1 (Phase 3a) |
| @thesage/tokens | @opencosmos/tokens | **Done** — published v1.0.1 (Phase 3a) |
| @thesage/mcp | @opencosmos/mcp | **Done** — published v0.8.3 (Phase 3a) |
| Sage AI / @thesage/ai | @opencosmos/ai | **Done** (Phase 1a) |
| thesage.dev | opencosmos.ai/studio | Domain registered; redirects pending (Phase 2d) |
| Sage Studio | OpenCosmos Studio | **Done** (Phase 2c) |
| ecosystem (repo) | opencosmos (repo) | **Done** (GitHub renamed) |
| sage-design-engine (repo) | opencosmos-ui (repo) | **Done** (GitHub renamed 2026-03-29) |
| sageos | cosmOS | **Done** (Phase 1a) |
| sage-stocks | stocks | **Done** (Phase 1a) |
| Sage (general references) | OpenCosmos | **Done** in both repos |

### What Does NOT Change

- **Creative Powerup** — name stays
- **Component names** — Button is still Button, Card is still Card
- **Architecture** — two repos, same structure
- **Philosophy** — the four principles endure, now with deeper grounding

---

## Phase 0: Foundation (Complete)

Establish the philosophical and strategic foundation before touching any code.

- [x] Identify the naming problem ("Sage" puts AI on a pedestal)
- [x] Arrive at "OpenCosmos" / "Cosmo" as the new identity
- [x] Validate continuity with original Cosmo AI (March 2025)
- [x] Write [WELCOME.md](../WELCOME.md) — the front door
- [x] Write [COSMO_SYSTEM_PROMPT.md](../packages/ai/COSMO_SYSTEM_PROMPT.md) — Cosmo's voice
- [x] Write [chronicle.md](chronicle.md) — the story
- [x] Map the full rename scope across both repos
- [x] Register @opencosmos on npm
- [x] Create this migration plan

---

## Phase 1: Platform Repo Rename (In Progress)

Update the primary monorepo. No npm publishing yet — internal docs and config only.

### 1a: Core Documentation (Complete)
- [x] Timestamp INCEPTION.md as historical record
- [x] Move COSMO_SYSTEM_PROMPT.md → packages/ai/COSMO_SYSTEM_PROMPT.md
- [x] Update WELCOME.md links for new paths
- [x] Rename `packages/sage-ai/` → `packages/ai/`
- [x] Update root package.json name: `ecosystem-monorepo` → `opencosmos`
- [x] Update DESIGN-PHILOSOPHY.md (Sage references → OpenCosmos)
- [x] Update AGENTS.md (all Sage references, package names, commands)
- [x] Update .claude/CLAUDE.md (all references)
- [x] Update README.md
- [x] Update CONTRIBUTING.md
- [x] Rename `apps/sageos/` → `apps/cosmos/` (cosmOS) + update README
- [x] Rename `apps/sage-stocks/` → `apps/stocks/` + update package.json

### 1b: App-Level Updates
- [ ] Scan portfolio app for any Sage branding in UI code
- [ ] Scan creative-powerup app for any Sage branding in UI code
- [ ] Scan stocks app for internal Sage references
- [x] Update turbo.json if needed (no changes needed)
- [x] Update pnpm-workspace.yaml if needed (no changes needed — uses `apps/*` glob)
- [x] Verify all apps build successfully (3/3 passing)
- [x] Regenerate pnpm-lock.yaml — `apps/stocks/` (renamed from `apps/sage-stocks/`) had 18 dependencies not reflected in the lockfile after the directory rename. `pnpm install` regenerated it.
- [x] Remove stale CI steps — `.github/workflows/ci.yml` had 4 steps running `pnpm --filter @thesage/ui lint/typecheck/test/size:check`. `@thesage/ui` lives in the separate `opencosmos-ui` repo and does not exist in this monorepo. All 4 steps removed.

### 1c: GitHub & Infrastructure (Partially Complete)

- [x] Rename GitHub repo: ecosystem → opencosmos
- [x] Update git remote to new repo URL
- [ ] Update repo description on GitHub
- [ ] Verify Vercel project connections (portfolio, creative-powerup)
- [x] Pause Vercel deployment for stocks — see decision log. Vercel project "sage-stocks" left disconnected; delete or archive when ready.

### 1d: Knowledge Base Hosting Strategy (Design Complete)

**Strategic shift:** The OpenCosmos knowledge base moves from local-only to a **globally accessible cloud primary + local mirror** architecture. Compute (inference) stays local on the Dell. Knowledge hosting is a fundamentally different workload — nominal energy cost, and global accessibility serves the "Generous by Design" principle.

**Architecture:**

| Layer | Where | Why |
|-------|-------|-----|
| Inference (Apertus models) | Dell (local, sovereign) | GPU cost, privacy, sovereignty |
| Knowledge base (primary) | Cloud (always-on) | Global access, nominal hosting cost |
| Knowledge base (local mirror) | Dell | Offline access, development, seeding |
| RAG API endpoint | Cloud (always-on) | Programmatic access for Cosmo clients |
| Static docs site | opencosmos.ai (Vercel) | Human-browsable knowledge |

**What this means for Sovereignty Tiers:**
- Sovereignty Tiers still govern **compute** (where prompts are processed by LLMs)
- Published knowledge is explicitly **intended to be shared** — different from user data or inference privacy
- The local mirror ensures the knowledge base works offline when the Dell is running

**Tasks:**
- [x] Rename `sage-knowledge/` → `knowledge/` + update `README.md` — all Sage→OpenCosmos naming, hosting strategy updated to cloud-primary + local mirror
- [x] Update `knowledge/AGENTS.md` — all Sage→OpenCosmos/Cosmo naming, infrastructure section rewritten for cloud-primary KB + sovereignty tiers clarified
- [x] Update `packages/ai/INCEPTION.md` — Section 7 rewritten with cloud-primary architecture table; Appendix B vector store updated with cloud + local mirror options
- [x] Rename + update `packages/ai/sage-ai-todo.md` → `packages/ai/opencosmos-todo.md` — all Sage→OpenCosmos naming, Phase 3 updated for cloud-primary KB
- [x] Update `AGENTS.md` — Sovereignty Tiers section rewritten to clarify tiers govern compute, not knowledge; cross-reference to Phase 1d
- [x] Update `packages/ai/sustainable-power-system-design.md` — Sage→Cosmo naming, sovereignty tier mapping section clarified as compute-only, cross-reference to Phase 1d
- [x] Choose cloud vector DB provider: **Upstash Vector** — free tier (10K vectors, 10K queries/day), pay-per-query, Vercel-native, serverless. Decision recorded in [architecture.md](architecture.md)
- [x] Design RAG API endpoint — `apps/web/app/api/knowledge/route.ts` on opencosmos.ai. Public read, `@upstash/ratelimit` for rate limiting. Recorded in [architecture.md](architecture.md)
- [x] Plan static docs site structure — `/knowledge/` section of opencosmos.ai, built from `knowledge/**/*.md` at deploy time. Part of `apps/web`. Recorded in [architecture.md](architecture.md)
- [x] Design knowledge base sync workflow — GitHub Action on push to main, incremental chunking by H2, upsert to Upstash Vector with metadata. Recorded in [architecture.md](architecture.md)

---

## Phase 2: Design System Repo Rename

Update sage-design-engine. This is the more complex migration because it affects published packages.

### 2a: Repository & Package Names
- [x] Rename GitHub repo: sage-design-engine → opencosmos-ui
- [x] Update root package.json name (`sage-design-engine` → `opencosmos-ui`)
- [x] Update @thesage/ui → @opencosmos/ui (package.json)
- [x] Update @thesage/tokens → @opencosmos/tokens
- [x] Update @thesage/mcp → @opencosmos/mcp
- [x] Update all internal workspace references (cli.ts, registry.ts, index.ts, apps/web deps)
- [x] Update CLI binary names (`thesage-ui` → `opencosmos-ui`, `sds-mcp` → `opencosmos-mcp`)

### 2b: Documentation & AI Surfaces
- [x] Update .claude/CLAUDE.md
- [x] Update packages/ui/.claude/CLAUDE.md
- [x] Update AGENTS.md
- [x] Update DESIGN-PHILOSOPHY.md
- [x] Update README.md
- [x] Update CONTRIBUTING.md
- [ ] Update CHANGELOG.md (historical entries intentionally preserved)
- [x] Update apps/web/public/llms.txt
- [x] Update apps/web/public/llms-full.txt
- [x] Update apps/web/public/.well-known/ai-plugin.json
- [x] Update apps/web/public/.well-known/mcp-server.json

### 2c: Sage Studio → OpenCosmos Studio
- [x] Update apps/web/package.json description
- [x] Update site branding (title, meta, footer, etc.) — 162 files updated
- [x] Update all "Sage Studio" / "Sage Design Engine" / "@thesage/*" strings in UI
- [x] Update docs/ strategy files

### 2d: Vercel & Infrastructure
- [x] Rename Vercel project: `thesage` → `opencosmos-studio`
- [x] Configure `studio.opencosmos.ai` as custom domain on the Studio project
- [x] thesage.dev → 301 → `studio.opencosmos.ai` (Next.js config redirects)
- [x] `opencosmos.ai/studio/:path*` → 302 → `studio.opencosmos.ai/:path*` (vercel.json)
- [x] `.vercel/project.json` — N/A: gitignored, managed by Vercel CLI locally

---

## Phase 3: npm Publishing

Publish new packages under @opencosmos scope. Handle transition gracefully.

### 3a: Publish New Packages
- [x] Publish @opencosmos/ui@1.3.1 (matches @thesage/ui version)
- [x] Publish @opencosmos/tokens@1.0.1
- [x] Publish @opencosmos/mcp@0.8.3
- [x] Verify all packages install and work correctly (`pnpm install` resolves from npm)

### 3b: Update Consumers
- [x] Update apps/portfolio imports: @thesage/ui → @opencosmos/ui
- [x] Update apps/creative-powerup imports
- [x] Update apps/web imports (CosmoChat, layout, next.config)
- [x] Update all CSS import paths
- [x] Update all hook and provider imports
- [x] Verify all apps build successfully (portfolio ✓, web ✓, creative-powerup ✓)
- [ ] Verify deploy to Vercel (pending PR merge: shalomormsby/opencosmos#47)

### 3c: Deprecation
- [ ] Publish final @thesage/ui version with deprecation notice pointing to @opencosmos/ui
- [ ] Same for @thesage/tokens and @thesage/mcp
- [ ] Update npm README for deprecated packages

---

## Phase 4: Legacy Cleanup

### 4a: Archive Repos
- [ ] Archive cosmo-ai (add README pointing to opencosmos)
- [ ] Archive sagestocks (superseded by monorepo)
- [ ] Archive creativepowerup (superseded by monorepo)
- [ ] Evaluate stock-analysis-mcp — archive or merge
- [ ] Evaluate design-portfolio — archive if superseded
- [ ] Evaluate fibonacci-sunflower-bloom — keep or archive

### 4b: Local Cleanup
- [ ] Clean up backup directories (sagestocks-backup, stock-intelligence-backup)
- [ ] Update local git remotes after repo renames

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-08 | Name: OpenCosmos / Cosmo | Returns to original identity (March 2025). Cosmos = expansive without hierarchy. Not an oracle, a companion. |
| 2026-03-08 | sageos → cosmOS | Natural fit. Personal OS on the OpenCosmos platform. |
| 2026-03-08 | sage-stocks → stocks | Simple. Lives inside the opencosmos repo, so context is implicit. No need for nesting. |
| 2026-03-08 | WELCOME.md as founding doc | Not a spec, not a manifesto. An invitation. |
| 2026-03-08 | System prompt in packages/ai/ | Lives where it's consumed. WELCOME stays at root as front door. |
| 2026-03-08 | Chronicle over changelog | Technical changes go in CHANGELOG. The story goes in CHRONICLE. |
| 2026-03-09 | Pause stocks Vercel deployment | `apps/stocks` is paused — not publishing or deploying via Vercel. The old "sage-stocks" Vercel project is disconnected. Stocks remains in the monorepo as dormant code; resume when there's a clear publishing plan. |
| 2026-03-10 | Knowledge base: cloud-primary + local mirror | Knowledge hosting ≠ compute. Serving documents and embeddings is nominal energy; inference is the expensive part. Global accessibility serves "Generous by Design." Sovereignty Tiers still govern compute (where LLMs process prompts), but published knowledge is explicitly meant to be shared. Cloud primary (always-on docs site + RAG API), Dell mirror for offline/dev. |
| 2026-03-10 | Upstash Vector for cloud KB | Free tier (10K vectors, 10K queries/day) covers curated corpus. Pay-per-query scales with self-funded project. Serverless, zero cold starts, Vercel-native. Documents live in git; only need a vector index. See [architecture.md](architecture.md). |
| 2026-03-10 | Create architecture.md | Platform-level infrastructure decisions need a permanent home. The migration doc is temporary; AGENTS.md is for dev workflow. `docs/architecture.md` is where service choices, data flow, and infrastructure rationale live. |
| 2026-03-10 | RAG API in `apps/web` on opencosmos.ai | Both the knowledge docs site and RAG API live in this repo's `apps/web`, deployed to opencosmos.ai. Public read, rate-limited with `@upstash/ratelimit`. |
| 2026-03-10 | Sync workflow: GitHub Action → Upstash | Incremental sync on push to main. Chunks by H2 sections, upserts to Upstash Vector with frontmatter metadata. Git is the source of truth. |

---

## Notes

- **The @opencosmos npm org is already registered.** This is confirmed and ready.
- **opencosmos.ai domain is registered.** DNS setup happens in Phase 2d.
- **No code logic changes.** This migration is purely naming, branding, and documentation. Component internals, CSS, architecture — all unchanged.
- **Both repos must stay buildable at every phase.** Never break the build mid-migration.

---

**Related:**
- [WELCOME.md](../WELCOME.md) — The front door
- [packages/ai/COSMO_SYSTEM_PROMPT.md](../packages/ai/COSMO_SYSTEM_PROMPT.md) — Cosmo's voice
- [chronicle.md](chronicle.md) — The story
- [CHANGELOG.md](../CHANGELOG.md) — Technical change history
