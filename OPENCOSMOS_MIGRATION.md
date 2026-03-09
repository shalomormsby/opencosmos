# OpenCosmos Migration Plan

> Project management doc for the transition from "Sage" to "OpenCosmos" across all repos, packages, and infrastructure.

**Created:** 2026-03-08
**Last updated:** 2026-03-09
**Status:** Phase 1a complete. Phase 1b complete. Phase 1c in progress.

---

## Overview

A full rebrand from "Sage" to "OpenCosmos" across two active repositories, four npm packages, multiple documentation surfaces, and all infrastructure. This is not cosmetic — it's a homecoming to a name and identity that predates "Sage" and better embodies the project's philosophy.

### Key Mappings

| Before | After | Status |
|--------|-------|--------|
| Sage Design Engine | OpenCosmos/UI | Planned |
| @thesage/ui | @opencosmos/ui | Planned (@opencosmos registered on npm) |
| @thesage/tokens | @opencosmos/tokens | Planned |
| @thesage/mcp | @opencosmos/mcp | Planned |
| Sage AI / @thesage/ai | @opencosmos/ai | **Done** (Phase 1a) |
| thesage.dev | opencosmos.ai | Domain registered |
| Sage Studio | OpenCosmos Studio | Planned |
| ecosystem (repo) | opencosmos (repo) | **Done** (GitHub renamed) |
| sage-design-engine (repo) | opencosmos-ui (repo) | Planned |
| sageos | cosmOS | **Done** (Phase 1a) |
| sage-stocks | stocks | **Done** (Phase 1a) |
| Sage (general references) | OpenCosmos | **Done** in this repo |

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
- [x] Write [WELCOME.md](WELCOME.md) — the front door
- [x] Write [COSMO_SYSTEM_PROMPT.md](packages/ai/COSMO_SYSTEM_PROMPT.md) — Cosmo's voice
- [x] Write [CHRONICLE.md](CHRONICLE.md) — the story
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

---

## Phase 2: Design System Repo Rename

Update sage-design-engine. This is the more complex migration because it affects published packages.

### 2a: Repository & Package Names
- [x] Rename GitHub repo: sage-design-engine → opencosmos-ui
- [ ] Update root package.json name
- [ ] Update @thesage/ui → @opencosmos/ui (package.json)
- [ ] Update @thesage/tokens → @opencosmos/tokens
- [ ] Update @thesage/mcp → @opencosmos/mcp
- [ ] Update all internal workspace references
- [ ] Update CLI binary name (`thesage-ui` → `opencosmos-ui` or `cosmo-ui`)

### 2b: Documentation & AI Surfaces
- [ ] Update .claude/CLAUDE.md
- [ ] Update packages/ui/.claude/CLAUDE.md
- [ ] Update AGENTS.md
- [ ] Update DESIGN-PHILOSOPHY.md
- [ ] Update README.md
- [ ] Update CONTRIBUTING.md
- [ ] Update CHANGELOG.md
- [ ] Update apps/web/public/llms.txt
- [ ] Update apps/web/public/llms-full.txt
- [ ] Update apps/web/public/.well-known/ai-plugin.json
- [ ] Update apps/web/public/.well-known/mcp-server.json

### 2c: Sage Studio → OpenCosmos Studio
- [ ] Update apps/web/package.json description
- [ ] Update site branding (title, meta, footer, etc.)
- [ ] Update any "Sage Studio" or "Sage Design Engine" strings in UI
- [ ] Update docs/ strategy files

### 2d: Vercel & Infrastructure
- [ ] Update Vercel project name
- [ ] Configure opencosmos.ai domain
- [ ] Set up redirects from thesage.dev → opencosmos.ai
- [ ] Update .vercel/project.json

---

## Phase 3: npm Publishing

Publish new packages under @opencosmos scope. Handle transition gracefully.

### 3a: Publish New Packages
- [ ] Publish @opencosmos/ui (starting at version that matches current @thesage/ui)
- [ ] Publish @opencosmos/tokens
- [ ] Publish @opencosmos/mcp
- [ ] Verify all packages install and work correctly

### 3b: Update Consumers
- [ ] Update apps/portfolio imports: @thesage/ui → @opencosmos/ui
- [ ] Update apps/creative-powerup imports
- [ ] Update apps/stocks imports
- [ ] Update all CSS import paths
- [ ] Update all hook imports
- [ ] Update all provider imports
- [ ] Verify all apps build and deploy successfully

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

---

## Notes

- **The @opencosmos npm org is already registered.** This is confirmed and ready.
- **opencosmos.ai domain is registered.** DNS setup happens in Phase 2d.
- **No code logic changes.** This migration is purely naming, branding, and documentation. Component internals, CSS, architecture — all unchanged.
- **Both repos must stay buildable at every phase.** Never break the build mid-migration.

---

**Related:**
- [WELCOME.md](WELCOME.md) — The front door
- [packages/ai/COSMO_SYSTEM_PROMPT.md](packages/ai/COSMO_SYSTEM_PROMPT.md) — Cosmo's voice
- [CHRONICLE.md](CHRONICLE.md) — The story
- [CHANGELOG.md](CHANGELOG.md) — Technical change history
