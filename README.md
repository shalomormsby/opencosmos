# OpenCosmos

> **How might we create technology that helps people feel at home in the universe?**

OpenCosmos is a creative platform built on a simple recognition: we are not separate from the universe we inhabit. Not observers of it. Not masters of it. Participants in it. Dance partners with it.

**Status:** Active Development
**License:** MIT
**Philosophy:** [Read WELCOME.md](WELCOME.md) — The front door
**Design Principles:** [Read DESIGN-PHILOSOPHY.md](DESIGN-PHILOSOPHY.md) — The North Star

---

## What This Is

This platform expresses one unified vision through multiple products:

- **[Portfolio](https://www.shalomormsby.com/)** — Design philosophy in action. Built entirely with OpenCosmos/UI components.
- **[Creative Powerup](https://ecosystem-creative-powerup.vercel.app/)** — Community platform and experiment gallery for purpose-driven innovators *(in development)*
- **[Stocks](https://stocks.shalomormsby.com/)** — AI-powered investment intelligence that respects user agency
- **cosmOS** — Personal operating system for creative work *(concept)*

**The unifying element:** All apps consume [OpenCosmos/UI](https://github.com/shalomormsby/opencosmos-ui) (`@opencosmos/*` packages) from npm, which embodies human-centered principles into every component, token, and interaction.

---

## Architecture

This repo is a **consumer** of OpenCosmos/UI. The design system packages (`@opencosmos/ui`, `@opencosmos/tokens`, etc.) are installed from npm, not developed here.

```
opencosmos/
├── apps/
│   ├── portfolio/             # Production portfolio site
│   ├── creative-powerup/      # Community platform (in development)
│   ├── stocks/                # AI investment intelligence
│   └── cosmos/                # cosmOS (future)
├── packages/
│   └── ai/                    # @opencosmos/ai — Sovereign AI layer (WIP)
```

### Design System

OpenCosmos/UI is maintained in a [separate repository](https://github.com/shalomormsby/opencosmos-ui) and consumed via npm:

```bash
pnpm add @opencosmos/ui
```

Available packages:

| Package | Version | Purpose |
|---------|---------|---------|
| `@opencosmos/ui` | ^1.1.1 | Components, hooks, providers, utils |
| `@opencosmos/tokens` | ^0.0.3 | Design tokens (colors, typography, motion) |
| `@opencosmos/mcp` | ^0.8.2 | MCP server for AI assistants |

Interactive documentation: [opencosmos.ai](https://opencosmos.ai/)

---

## Quick Start

```bash
# Clone and install
git clone https://github.com/shalomormsby/opencosmos.git
cd opencosmos
pnpm install

# Start portfolio
pnpm dev --filter portfolio
# Open http://localhost:3000
```

---

## Core Philosophy

This platform is built on four principles:

1. **Emotionally Resonant** — Touch hearts, not just solve problems. Design should delight.
2. **User Control & Freedom** — Users customize their experience. Motion intensity, themes, everything.
3. **Transparent by Design** — Show the receipts. Users see how things work, including AI collaboration.
4. **Generous by Design** — Open source, teachable, accessible. Code that teaches as it works.

[Read the full philosophy →](DESIGN-PHILOSOPHY.md)

---

## Development

### Prerequisites

- Node.js 24+ (see `.nvmrc`)
- pnpm 8.15.0+

### Commands

```bash
# Development
pnpm dev                    # Start all apps
pnpm dev --filter portfolio # Start specific app

# Building
pnpm build                  # Build everything
pnpm build --filter <app>   # Build specific app

# Quality
pnpm lint                   # Lint all
```

### Updating Design System

When a new version of `@opencosmos/ui` is published:

```bash
pnpm update @opencosmos/ui
pnpm build
```

### Local Development with Design System

When testing design system changes before publishing:

```bash
# In the opencosmos-ui repo
cd packages/ui && pnpm link --global

# In this repo
cd apps/portfolio && pnpm link --global @opencosmos/ui

# Don't forget to unlink when done
pnpm unlink @opencosmos/ui && pnpm install
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS |
| Animation | Framer Motion 12 |
| State | Zustand 5 + localStorage |
| Design System | OpenCosmos/UI (`@opencosmos/*`) |
| Monorepo | Turborepo + pnpm workspaces |
| Deployment | Vercel |

---

## License

MIT © Shalom Ormsby

---

**Our work is our love made visible.**
