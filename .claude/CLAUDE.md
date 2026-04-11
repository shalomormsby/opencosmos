# Claude Context for OpenCosmos

> **Context file for AI assistants (primarily Claude) working on this platform. Read this first, then [DESIGN-PHILOSOPHY.md](../DESIGN-PHILOSOPHY.md) and [AGENTS.md](../AGENTS.md).**

Last updated: 2026-03-13

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
├── docs/                    # Technical docs, architecture, migration plans
│   └── archive-and-deprecated/  # Historical/superseded documents
├── knowledge/               # RAG-indexed knowledge corpus
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
2. **[DESIGN-PHILOSOPHY.md](../DESIGN-PHILOSOPHY.md)** — The North Star. Four principles.
3. **[AGENTS.md](../AGENTS.md)** — Technical guide: file organization, document organization, build commands, conventions.
4. **[packages/ai/COSMO_SYSTEM_PROMPT.md](../packages/ai/COSMO_SYSTEM_PROMPT.md)** — Cosmo's voice, values, and practice.
5. **[docs/architecture.md](../docs/architecture.md)** — Infrastructure decisions, service map, and data flow.
6. **[docs/pm.md](../docs/pm.md)** — Active project tasks, priorities, and launch checklist.
7. **[docs/strategy.md](../docs/strategy.md)** — Three Futures, business model, open questions.
8. **[CHANGELOG.md](../CHANGELOG.md)** — Work history.
9. **[docs/chronicle.md](../docs/chronicle.md)** — The story behind the decisions.

---

## Document Organization

See [AGENTS.md § Document Organization](../AGENTS.md#document-organization) for the full rules. In brief:

- **Root (5 max):** README, WELCOME, DESIGN-PHILOSOPHY, CHANGELOG, CONTRIBUTING
- **Root (agent context):** AGENTS.md, .claude/CLAUDE.md
- **docs/:** Architecture, migration plans, research, chronicle, retrospectives
- **knowledge/:** RAG-indexed corpus — see [knowledge/README.md](../knowledge/README.md)
- **packages/\*/:** Package-specific docs (COSMO_SYSTEM_PROMPT.md, etc.)

---

## Cosmo AI (Work in Progress)

The shared intelligence layer. Lives at `packages/ai/`.

- **License:** RAIL (not MIT)
- **Status:** Phase 1a (hardware) + Phase 1b (package foundation)
- **Read [COSMO_SYSTEM_PROMPT.md](../packages/ai/COSMO_SYSTEM_PROMPT.md)** for the voice and values

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

See [AGENTS.md § Build & Development](../AGENTS.md#build--development) for the full reference. Essentials:

```bash
pnpm dev --filter portfolio      # Start portfolio at localhost:3000
pnpm build                       # Build everything
pnpm update @opencosmos/ui       # Update design system
```

---

## Tech Stack

See [AGENTS.md § Tech Stack](../AGENTS.md#tech-stack) for the full table.

---

## What NOT to Do

1. Make architectural decisions without Shalom
2. Create design system packages here (use opencosmos-ui)
3. Skip accessibility requirements

See [AGENTS.md § What NOT to Do](../AGENTS.md#what-not-to-do) for the full list.

---

## Quick Links

**Live Sites:**
- Portfolio: https://www.shalomormsby.com/
- OpenCosmos Studio: https://opencosmos.ai/
- Creative Powerup: https://ecosystem-creative-powerup.vercel.app/

**Development:**
- Portfolio: http://localhost:3000

---

**Current focus:** Cosmo launch prep (Phase 1b) — see [docs/pm.md](../docs/pm.md).

---

## Knowledge Wiki (Ambient Context)

The knowledge wiki is a synthesis layer above the raw source corpus. It is always loaded here so Claude has the current index in context without being explicitly asked.

@knowledge/wiki/index.md
