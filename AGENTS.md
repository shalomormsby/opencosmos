# AGENTS.md

> **For AI coding agents working on this platform. Read [DESIGN-PHILOSOPHY.md](DESIGN-PHILOSOPHY.md) first — it's the North Star. This file tells you how to build in alignment with it.**

Last updated: 2026-03-08

---

## Quick Orientation

This is a **consumer monorepo** — the product applications that use [OpenCosmos/UI](https://opencosmos.ai/). Apps here install `@opencosmos/ui` from npm. The design system packages are developed and published from a [separate repository](https://github.com/shalomormsby/opencosmos-ui).

```
opencosmos/
├── apps/
│   ├── portfolio/           # Next.js — Production portfolio (shalomormsby.com)
│   ├── creative-powerup/    # Next.js — Community platform (in development)
│   ├── stocks/              # Next.js — AI-powered investment intelligence
│   └── cosmos/              # Future — cosmOS personal operating system
├── packages/
│   └── ai/                  # @opencosmos/ai — Sovereign AI intelligence layer (WIP)
├── WELCOME.md               # The front door — OpenCosmos vision and philosophy
├── DESIGN-PHILOSOPHY.md     # The North Star — four principles
├── CHANGELOG.md             # Work history
└── README.md                # Overview
```

### What Lives Where

| What | Where | Why |
|------|-------|-----|
| `@opencosmos/ui` (components) | [opencosmos-ui](https://github.com/shalomormsby/opencosmos-ui) | Published to npm |
| `@opencosmos/tokens` (design tokens) | opencosmos-ui | Published to npm |
| `@opencosmos/mcp` (MCP server) | opencosmos-ui | Published to npm |
| OpenCosmos Studio (docs site) | opencosmos-ui (`apps/web`) | Lives with packages it documents |
| Portfolio, Creative Powerup, Stocks | **This repo** (`apps/`) | Consumer applications |
| Cosmo AI (`@opencosmos/ai`) | **This repo** (`packages/ai/`) | Platform intelligence layer |

**Key rule:** To modify a component, hook, or utility from `@opencosmos/ui` — work in [opencosmos-ui](https://github.com/shalomormsby/opencosmos-ui), not here. This repo consumes published packages.

---

## If This Is Your First Time

1. **Read [DESIGN-PHILOSOPHY.md](DESIGN-PHILOSOPHY.md)** — The four principles govern every decision.

2. **Verify your setup:**
   ```bash
   pnpm install
   pnpm build
   pnpm dev --filter portfolio
   ```
   Portfolio runs at **http://localhost:3000**.

3. **Check current state:**
   ```bash
   git status
   git log -5 --oneline
   ```

4. **If working on Cosmo AI:** Read [packages/ai/COSMO_SYSTEM_PROMPT.md](packages/ai/COSMO_SYSTEM_PROMPT.md) for the voice and values, and [packages/ai/INCEPTION.md](packages/ai/INCEPTION.md) for historical technical context.

---

## Applications

### Portfolio (`apps/portfolio/`)
- **URL:** [shalomormsby.com](https://www.shalomormsby.com/)
- **Purpose:** Proof of the design philosophy. Showcases the Customizer.
- **Deps:** `@opencosmos/ui` (npm)

### Creative Powerup (`apps/creative-powerup/`)
- **URL:** [ecosystem-creative-powerup.vercel.app](https://ecosystem-creative-powerup.vercel.app/)
- **Purpose:** Community platform and experiment gallery
- **Status:** In development
- **Deps:** `@opencosmos/ui` (npm)

### Stocks (`apps/stocks/`)
- **Purpose:** AI-powered investment intelligence
- **Status:** Active

### cosmOS (`apps/cosmos/`)
- **Purpose:** Personal operating system
- **Status:** Future

---

## Cosmo AI (`packages/ai/`)

The shared intelligence layer for the platform. **Read [COSMO_SYSTEM_PROMPT.md](packages/ai/COSMO_SYSTEM_PROMPT.md) for the voice and values.**

- **License:** RAIL (Responsible AI License) — not MIT like everything else
- **Status:** Phase 1a (hardware setup) + Phase 1b (package foundation) in parallel
- **Hardware:** Dell XPS 8950, RTX 3090, 64GB RAM, solar-powered in Marin County
- **Models:** Apertus 8B/70B via Ollama, with cloud fallback tiers

### Sovereignty Tiers
- **Full:** Local inference on sovereign hardware
- **Reduced:** Cloud fallback with explicit per-request consent
- **Cloud-Assisted:** Metadata only (no inference)

---

## File Organization Rules

| If you're creating... | Put it in... |
|----------------------|--------------|
| App-specific component | `apps/<app>/components/` |
| App-specific hook | `apps/<app>/hooks/` |
| App-specific utility | `apps/<app>/lib/` |
| App-specific state store | `apps/<app>/store/` |
| AI capabilities (shared) | `packages/ai/src/` |
| Documentation | `docs/` |

**Do NOT create `packages/ui/`, `packages/tokens/`, or `packages/mcp/` in this repo.** Those packages live in [opencosmos-ui](https://github.com/shalomormsby/opencosmos-ui).

---

## Using the Design System

### Importing Components

```typescript
import { Button, Card, Dialog } from '@opencosmos/ui'
import { useMotionPreference, useTheme } from '@opencosmos/ui/hooks'
import { ThemeProvider } from '@opencosmos/ui/providers'
import { cn } from '@opencosmos/ui/utils'
import '@opencosmos/ui/globals.css'
```

### Updating

```bash
pnpm update @opencosmos/ui
pnpm build
```

### Local Development with Design System

When testing design system changes before publishing:

```bash
# In opencosmos-ui
cd packages/ui && pnpm link --global

# In this repo
cd apps/portfolio && pnpm link --global @opencosmos/ui

# Unlink when done
pnpm unlink @opencosmos/ui && pnpm install
```

### Rules

- **Motion:** Always check `useMotionPreference()` before animating. Intensity 0 must work perfectly.
- **Colors:** Use CSS variables (`bg-background`, `text-foreground`), never hardcoded.
- **Components:** Use `@opencosmos/ui` first. Don't recreate what exists.
- **Accessibility:** WCAG AA contrast, keyboard navigation, screen reader support. Non-negotiable.

---

## State Management

Zustand for client-side state with localStorage persistence.

**Use Zustand for:** User preferences, feature flags, client-side state shared across components.
**Don't use Zustand for:** Server data (use RSC + fetch), form state, single-component state.

```typescript
// App-specific store
// apps/portfolio/store/navigation.ts
import { create } from 'zustand'

interface NavigationState {
  isMenuOpen: boolean
  toggleMenu: () => void
}

export const useNavigation = create<NavigationState>((set) => ({
  isMenuOpen: false,
  toggleMenu: () => set((state) => ({ isMenuOpen: !state.isMenuOpen })),
}))
```

Design system stores (`useTheme`, `useMotionPreference`) come from `@opencosmos/ui/hooks`.

---

## Build & Development

```bash
# Development
pnpm dev                         # Start all apps
pnpm dev --filter portfolio      # Start specific app

# Build
pnpm build                       # Build everything
pnpm build --filter portfolio    # Build specific app

# Quality
pnpm lint
```

### CI Pipeline

`.github/workflows/ci.yml` — runs on PR and push to main:
1. `pnpm install --frozen-lockfile`
2. `pnpm build` (all apps)

Node 24, pnpm 10.26.1+. Deployed to Vercel.

### Clear Stale Caches

```bash
rm -rf .turbo apps/*/.next && pnpm build
```

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 16 (App Router) | React Server Components |
| React | React 19.2.1 | |
| Language | TypeScript 5 | Strict mode |
| Styling | Tailwind CSS | Via CSS variables from @opencosmos/ui |
| Animation | Framer Motion 12 | Respects motion preferences |
| State | Zustand 5 | localStorage persistence |
| Design System | `@opencosmos/ui` (npm) | 100 components, 3 themes |
| Monorepo | Turborepo + pnpm | |
| Deployment | Vercel | Auto-deploys main |

---

## Git Conventions

```
type(scope): description
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Scopes:** `portfolio`, `creative-powerup`, `stocks`, `ai`, `cosmos`

**Branch naming:** `type/brief-description`

---

## Accessibility Requirements

Non-negotiable. Every UI must:

- Work with `prefers-reduced-motion: reduce`
- Be keyboard navigable
- Be screen reader compatible
- Meet WCAG AA color contrast (4.5:1)
- Have visible focus states
- Not convey information by color alone

---

## Changelog

Log significant changes in [CHANGELOG.md](CHANGELOG.md) with ISO timestamps. For the story behind the decisions, see [CHRONICLE.md](CHRONICLE.md).

**Format:**
```markdown
## 2026-03-07T10:00:00Z

- Added/Updated/Fixed [specific thing]
  - Additional context if needed
```

---

## What NOT to Do

- Make major architectural decisions without discussing with Shalom
- Create design system packages in this repo (use opencosmos-ui)
- Skip accessibility requirements
- Hardcode colors instead of CSS variables
- Animate without checking motion preferences
- Over-engineer beyond what's requested
- Create markdown files unless explicitly requested

---

## Decision Framework

**Priority order:**
1. **Functional** — It must work
2. **Honest** — It must be true to what it claims
3. **Lovable** — It should delight
4. **Perfect** — Polish comes last

**Ship working over perfect. One excellent thing over three mediocre things.**

When in doubt, ask Shalom.

---

## Related Documentation

- **[WELCOME.md](WELCOME.md)** — The front door to OpenCosmos
- **[DESIGN-PHILOSOPHY.md](DESIGN-PHILOSOPHY.md)** — The North Star
- **[packages/ai/COSMO_SYSTEM_PROMPT.md](packages/ai/COSMO_SYSTEM_PROMPT.md)** — Cosmo's voice and values
- **[packages/ai/INCEPTION.md](packages/ai/INCEPTION.md)** — Historical AI founding blueprint
- **[CHRONICLE.md](CHRONICLE.md)** — The story behind the decisions
- **[CHANGELOG.md](CHANGELOG.md)** — Work history
- **[OpenCosmos/UI repo](https://github.com/shalomormsby/opencosmos-ui)** — Where the design system lives
- **[opencosmos.ai](https://opencosmos.ai/)** — Interactive component documentation
