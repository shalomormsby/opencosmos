# Claude Context for OpenCosmos

> **Context file for AI assistants (primarily Claude) working on this platform. Read this first, then [DESIGN-PHILOSOPHY.md](../DESIGN-PHILOSOPHY.md) and [AGENTS.md](../AGENTS.md).**

Last updated: 2026-03-08

---

## Quick Orientation

You're working on **OpenCosmos** — a creative platform built on the recognition that we are not separate from the universe we inhabit. This monorepo contains the product applications that consume [OpenCosmos/UI](https://opencosmos.ai/) from npm. The design system is developed in a [separate repository](https://github.com/shalomormsby/opencosmos-ui).

**The North Star:** Lovable by Design — Create products that empower people and bring joy.

**Your Role:** Partner in creative work. You execute within the vision Shalom defines. Ask questions, propose options, challenge assumptions, but never make unilateral architectural decisions.

---

## Repository Structure

```
opencosmos/
├── apps/
│   ├── portfolio/           # Production portfolio (shalomormsby.com)
│   ├── creative-powerup/    # Community platform (in development)
│   ├── stocks/              # AI-powered investment intelligence
│   └── cosmos/              # cosmOS — personal operating system (future)
├── packages/
│   └── ai/                  # @opencosmos/ai — Sovereign AI layer (WIP)
├── WELCOME.md               # The front door — vision and philosophy
├── DESIGN-PHILOSOPHY.md     # The North Star
├── AGENTS.md                # Technical guide for AI agents
└── CHANGELOG.md             # Work history
```

### Two Repos, One Philosophy

| Repo | Purpose | What's in it |
|------|---------|-------------|
| **This repo** (opencosmos) | Consumer applications + Cosmo AI | Apps that use `@opencosmos/ui` from npm |
| **[opencosmos-ui](https://github.com/shalomormsby/opencosmos-ui)** | Design system source | `@opencosmos/ui`, `@opencosmos/tokens`, `@opencosmos/mcp`, OpenCosmos Studio docs site |

**Rule:** Don't create `packages/ui/`, `packages/tokens/`, or `packages/mcp/` here. Those are developed and published from opencosmos-ui.

---

## Essential Files

1. **[WELCOME.md](../WELCOME.md)** — The front door. OpenCosmos vision, cosmology, values, and invitation.
2. **[DESIGN-PHILOSOPHY.md](../DESIGN-PHILOSOPHY.md)** — The North Star. Four principles: Emotionally Resonant, User Control & Freedom, Transparent by Design, Generous by Design.
3. **[AGENTS.md](../AGENTS.md)** — Technical guide: file organization, build commands, conventions.
4. **[packages/ai/COSMO_SYSTEM_PROMPT.md](../packages/ai/COSMO_SYSTEM_PROMPT.md)** — Cosmo's voice, values, and practice.
5. **[CHANGELOG.md](../CHANGELOG.md)** — Work history.
6. **[CHRONICLE.md](../CHRONICLE.md)** — The story behind the decisions.

---

## Cosmo AI (Work in Progress)

The shared intelligence layer. Lives at `packages/ai/`.

- **License:** RAIL (not MIT)
- **Status:** Phase 1a (hardware) + Phase 1b (package foundation)
- **Read [COSMO_SYSTEM_PROMPT.md](../packages/ai/COSMO_SYSTEM_PROMPT.md)** for the voice and values
- **Read [INCEPTION.md](../packages/ai/INCEPTION.md)** for historical technical context

```typescript
// API shape (finalizing in Phase 1b)
import { createCosmoClient } from '@opencosmos/ai'
const cosmo = createCosmoClient({ model: 'apertus-8b', tier: 'sovereign' })
const response = await cosmo.complete(prompt, opts)
```

---

## Import Patterns

```typescript
// Design system (from npm)
import { Button, Card, useTheme } from '@opencosmos/ui'
import { useMotionPreference } from '@opencosmos/ui/hooks'
import { ThemeProvider } from '@opencosmos/ui/providers'
import { cn } from '@opencosmos/ui/utils'
import '@opencosmos/ui/globals.css'

// Never use (legacy)
// import { Button } from '@thesage/ui'
// import { Card } from '@ecosystem/design-system'
```

---

## Key Patterns

### Motion Must Respect Preferences

```typescript
import { useMotionPreference } from '@opencosmos/ui/hooks'

function AnimatedComponent() {
  const { shouldAnimate, scale } = useMotionPreference()
  return (
    <motion.div
      animate={{ opacity: 1, y: shouldAnimate ? 20 : 0 }}
      transition={{ duration: shouldAnimate ? 0.3 : 0 }}
    />
  )
}
```

### CSS Variables Over Hardcoded Colors

```typescript
// ✅ Theme-aware
className="bg-background text-foreground border-border"

// ❌ Hardcoded
className="bg-white text-black border-gray-200"
```

### Use Design System Components First

Always search for existing `@opencosmos/ui` components before writing custom JSX or CSS.

---

## Build & Development

```bash
# Development
pnpm dev --filter portfolio           # Start portfolio
pnpm dev --filter creative-powerup    # Start creative powerup

# Build
pnpm build                            # Build everything
pnpm build --filter portfolio         # Build specific app

# Update design system
pnpm update @opencosmos/ui

# Clear caches
rm -rf .turbo apps/*/.next && pnpm build
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| React | React 19.2.1 |
| Styling | Tailwind CSS via @opencosmos/ui CSS variables |
| Animation | Framer Motion 12 |
| State | Zustand 5 |
| Design System | `@opencosmos/ui` (npm, 100 components) |
| Monorepo | Turborepo + pnpm |
| Deployment | Vercel |

---

## Accessibility (Non-Negotiable)

- Motion intensity 0 must work perfectly
- Keyboard navigable, screen reader compatible
- WCAG AA color contrast (4.5:1)
- No information conveyed by color alone

---

## Git Conventions

```
type(scope): description
```

**Types:** feat, fix, docs, style, refactor, test, chore
**Scopes:** portfolio, creative-powerup, stocks, ai, cosmos

---

## What NOT to Do

- Make architectural decisions without Shalom
- Create design system packages here (use opencosmos-ui)
- Skip accessibility requirements
- Hardcode colors
- Animate without checking motion preferences
- Over-engineer

---

## Quick Links

**Live Sites:**
- Portfolio: https://www.shalomormsby.com/
- OpenCosmos Studio: https://opencosmos.ai/
- Creative Powerup: https://ecosystem-creative-powerup.vercel.app/

**Development:**
- Portfolio: http://localhost:3000

---

**Current focus:** OpenCosmos migration (Phase 1) — see [OPENCOSMOS_MIGRATION.md](../OPENCOSMOS_MIGRATION.md).
