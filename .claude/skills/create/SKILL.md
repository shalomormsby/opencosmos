---
name: create
description: Build UI for opencosmos apps using @opencosmos/ui components exclusively. Provides the component API reference, import patterns, and rules needed to build correctly without grepping source or dist files.
argument-hint: "<brief description of what to build>"
user-invocable: true
---

# /create — Build with @opencosmos/ui

<!-- Canonical source: opencosmos-ui/.claude/skills/create/SKILL.md (ships in the @opencosmos/ui npm package under .claude/). Consuming repos carry a copy for skill discovery — when you edit this file, propagate the change to those copies. -->

You are building UI for the OpenCosmos platform. **Always reach for `@opencosmos/ui` components first.** Never write custom HTML elements, custom CSS, or bespoke JSX when a component in this library covers the use case.

`$ARGUMENTS` describes what to build. Read it, identify which components to use from this reference, then build.

## If a Required Component Is Missing

**Do not build it bespoke inline.** If you reach for a component and it doesn't exist in `@opencosmos/ui`, or exists but lacks a required variant or prop:

1. **Stop and declare it** — name the missing component, describe what it needs to do, and explain why none of the existing components can cover it.
2. **Ask** whether to add it to the component library in `opencosmos-ui`.
3. **Only if explicitly told to build it inline as a one-off** should you write bespoke code for it — and even then, flag it as a candidate for future extraction.

This keeps the system coherent. Every addition to the component library benefits every product that will ever need the same thing.

---

## The Core Philosophy: Build Once, Ripple Everywhere

When something needs to change — a color, spacing, motion curve, button shape, component behavior — **change it in the design system, not in the consuming app**. That change then ripples to every product automatically.

- You never override a component's design with custom CSS. You add a prop or variant to the component.
- You never create a one-off version of an existing component. You extend the existing one.
- You never hardcode a value that has a token. You use the token.
- You never style around a component because it "almost works." You surface the gap.

**The test:** If you fixed this in one place, would all products that need it be fixed? If not, you're patching an instance instead of evolving the system.

---

## Setting Up a New App — Do This First

When adding `@opencosmos/ui` to a new app, set up styling **before writing any component code**. It's now a single step: import the package's CSS, in order.

### Step 1 — CSS imports in `globals.css`

```css
/* app/globals.css */
@import "tailwindcss";                 /* your app's own utilities */
@import "@opencosmos/ui/theme.css";    /* design tokens + custom utilities */
@import "@opencosmos/ui/globals.css";  /* default token VALUES (:root) */
@import "@opencosmos/ui/styles.css";   /* precompiled component styles */

@layer base {
  body {
    background-color: var(--color-background);
    color: var(--color-foreground);
  }
}
```

**`app/layout.tsx`** — one import only:
```tsx
import './globals.css'
```

**Why this works:**
- `@opencosmos/ui/styles.css` is a **precompiled stylesheet** shipped in the package containing every Tailwind class the components use (responsive variants included). So you do **not** add `@opencosmos/ui` to a Tailwind `content`/`@source` glob, and you do **not** maintain a safelist. (Tailwind v4 + Turbopack silently ignores `node_modules` symlink scans — that's the trap this avoids.)
- **Order matters:** `styles.css` comes *after* `globals.css`. It references token values but emits no `:root` vars, so it never clobbers them.
- In Tailwind v4, `@theme` must be processed in the same context as `@import "tailwindcss"`, which the CSS `@import` chain guarantees.

That's the whole setup. No `_ui-safelist.ts`, no post-load grep gate.

> **Upgrading `@opencosmos/ui`:** nothing to regenerate — new component classes ship inside `styles.css`. Just bump the version. (If you maintain an app that predates this, delete its `app/_ui-safelist.ts` and any `@source ".../@opencosmos/ui"` line once you've added the `styles.css` import.)

> **Troubleshooting missing component styles:** confirm `globals.css` imports `@opencosmos/ui/styles.css` *after* `globals.css`; in this monorepo, confirm the library is built (`pnpm --filter @opencosmos/ui build`) so `dist/styles.css` is current.

---

## Contributing to `@opencosmos/ui`: never interpolate Tailwind classes

If you add or edit a component **in the library**, never build a class name by interpolation — `` `gap-${n}` `` or `` `md:${cls}` ``. Tailwind only generates CSS for class names it sees as complete static literals, so interpolated classes silently never get emitted (this caused a real `Grid`/`Stack` bug). Use the static maps in `packages/ui/src/lib/responsive-classes.ts`. The `no-dynamic-classes` test enforces this in CI.

---

## Design Tokens: No Custom CSS

**All colors, spacing, typography, motion, and surface values come from design tokens — never from hardcoded values or custom CSS properties.**

```tsx
// ✅ Always — semantic CSS variable tokens
className="bg-background text-foreground"
className="border-border"
className="text-foreground/50"           // 50% opacity on foreground color
className="bg-foreground/5"              // 5% opacity — subtle hover/active bg
className="bg-muted text-muted-foreground"

// ✅ For values not exposed as Tailwind classes, use the CSS variable directly
style={{ color: 'var(--color-primary)' }}
style={{ background: 'var(--color-surface)' }}

// ❌ Never — hardcoded colors
className="bg-white text-black"
className="bg-gray-100 text-gray-900"
className="border-neutral-200"
style={{ color: '#6366f1' }}
```

### Full Token Reference

| Token | Tailwind class | CSS variable |
|-------|---------------|--------------|
| Page background | `bg-background` | `var(--color-background)` |
| Primary text | `text-foreground` | `var(--color-foreground)` |
| Subtle text | `text-muted-foreground` | `var(--color-muted-foreground)` |
| Muted surface | `bg-muted` | `var(--color-muted)` |
| Component surface | — | `var(--color-surface)` |
| Brand primary | — | `var(--color-primary)` |
| Borders | `border-border` | `var(--color-border)` |
| Focus rings | — | `var(--color-focus)` |
| Primary text | — | `var(--color-text-primary)` |
| Secondary text | — | `var(--color-text-secondary)` |

**Opacity modifiers are fine** — `text-foreground/50`, `border-foreground/10`, `bg-foreground/5`.

**Custom CSS is not allowed** except for layout geometry (`min-h-screen`, `max-w-2xl`, `flex`, `grid`) and animation keyframes when framer-motion is unavailable.

---

## Import Patterns

```tsx
// Core components (most common)
import { Button, Input, ScrollArea, Separator, Badge, Card, cn } from '@opencosmos/ui'

// Layout & navigation
import { Header } from '@opencosmos/ui'

// Providers (wrap app root)
import { ThemeProvider, TooltipProvider } from '@opencosmos/ui'

// Overlays
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@opencosmos/ui'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@opencosmos/ui'

// Feedback
import { Alert, AlertTitle, AlertDescription } from '@opencosmos/ui'
import { ToastProvider, useToast } from '@opencosmos/ui'
import { Spinner, Skeleton, Progress } from '@opencosmos/ui'

// Icons
import { GitHubIcon } from '@opencosmos/ui'          // GitHub icon — in the package
import { Menu, X, ChevronDown } from 'lucide-react'  // All other icons

// Hooks
import { useMotionPreference } from '@opencosmos/ui/hooks'
import { useTheme } from '@opencosmos/ui/hooks'

// Utilities
import { cn } from '@opencosmos/ui'  // tailwind-merge + clsx — always use for conditional classes
```

---

## Component Reference

### Header (liquid glass, sticky, responsive)

```tsx
import { Header, Button, GitHubIcon } from '@opencosmos/ui'

<Header
  logo={<span className="text-xl font-bold tracking-tight">OpenCosmos</span>}
  navAlignment="right"
  navLinks={[
    { label: 'Dialog', href: '/chat' },
    { label: 'Studio', href: 'https://studio.opencosmos.ai' },
    // Dropdown:
    { label: 'More', children: [{ label: 'Knowledge', href: '/knowledge' }] },
  ]}
  actions={
    <Button variant="outline" size="sm" asChild className="gap-2">
      <a href="https://github.com/shalomormsby/opencosmos" target="_blank" rel="noopener noreferrer">
        <GitHubIcon className="w-4 h-4" />
        Star on GitHub
      </a>
    </Button>
  }
/>
```

| Prop | Default | Options |
|------|---------|---------|
| `navAlignment` | `'center'` | `'center'` \| `'left'` \| `'right'` |
| `glassOnScroll` | `true` | `boolean` |
| `sticky` | `true` | `boolean` |
| `maxWidth` | `'max-w-7xl'` | `'max-w-7xl'` \| `'max-w-[1440px]'` \| `'max-w-4xl'` |

Header is a client component. Pages can be server components.

---

### Button

```tsx
// Variants: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
// Sizes: 'sm' | 'default' | 'lg' | 'icon'

<Button variant="outline" size="sm">Label</Button>

// As a link — always use asChild, never nest <a> inside <button>
<Button variant="outline" size="sm" asChild>
  <a href="/chat">Open</a>
</Button>

// External links always get target + rel
<Button variant="outline" asChild className="gap-2">
  <a href="https://..." target="_blank" rel="noopener noreferrer">
    <GitHubIcon className="w-4 h-4" />
    GitHub
  </a>
</Button>
```

---

### ScrollArea

Use instead of `overflow-y-auto` on any scrollable container.

```tsx
<ScrollArea className="flex-1">
  <div className="p-4">{items}</div>
</ScrollArea>
```

---

### Input

```tsx
<Input
  type="password"
  placeholder="sk-ant-..."
  value={value}
  onChange={(e) => setValue(e.target.value)}
  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
  className="flex-1 text-sm"
/>
```

---

### Card

```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>Body</CardContent>
  <CardFooter><Button>Action</Button></CardFooter>
</Card>
```

---

### ThemeProvider (required root wrapper)

```tsx
// app/layout.tsx
import { ThemeProvider } from '@opencosmos/ui'

<ThemeProvider defaultTheme="studio" defaultMode="system">
  {children}
</ThemeProvider>
```

`defaultTheme`: `'studio'` | `'terra'` | `'volt'`
`defaultMode`: `'light'` | `'dark'` | `'system'`

---

### cn() — Class merging utility

Always use `cn()` for conditional classNames. Never string-concatenate Tailwind classes.

```tsx
import { cn } from '@opencosmos/ui'

<div className={cn(
  'base-class px-4 py-2',
  isActive && 'bg-foreground/5',
  variant === 'large' && 'text-lg'
)} />
```

---

## Motion Rules

Every animation must respect user preferences. Intensity 0 must be a perfect experience.

```tsx
import { useMotionPreference } from '@opencosmos/ui/hooks'

const { shouldAnimate, scale } = useMotionPreference()

<div className={cn(shouldAnimate && 'transition-transform duration-200')} />

<motion.div
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: shouldAnimate ? 0.3 : 0 }}
/>
```

---

## What NOT to Build Custom

| You want... | Use instead |
|-------------|-------------|
| Sticky navbar | `Header` |
| Scrollable area | `ScrollArea` |
| Text input | `Input` |
| Submit / CTA | `Button` |
| Status pill | `Badge` |
| Info / warning box | `Alert` + `AlertTitle` + `AlertDescription` |
| Toast notification | `useToast` + `ToastProvider` |
| Loading spinner | `Spinner` |
| Placeholder content | `Skeleton` |
| Progress bar | `Progress` |
| Modal / popup | `Dialog` |
| Side drawer | `Sheet` |
| Content card | `Card` |
| GitHub icon | `GitHubIcon` from `@opencosmos/ui` |
| Any other icon | `lucide-react` |

---

## Common Layout Patterns

### Full-screen with sticky header
```tsx
<main className="min-h-screen bg-background">
  <Header ... />
  <div className="flex flex-col items-center justify-center min-h-screen px-6">
    {/* content */}
  </div>
</main>
```

### Chat / feed layout
```tsx
<div className="flex flex-col h-screen bg-background">
  <header className="shrink-0 border-b border-foreground/10 px-6 py-4">...</header>
  <ScrollArea className="flex-1">
    <div className="max-w-2xl mx-auto px-6 py-10">...</div>
  </ScrollArea>
  <div className="shrink-0 border-t border-foreground/10 px-6 py-4">...</div>
</div>
```

### Slide-in panel
```tsx
<aside className={cn(
  'fixed inset-y-0 left-0 z-50 w-72 bg-background border-r border-foreground/10',
  'transition-transform duration-200 ease-in-out',
  isOpen ? 'translate-x-0' : '-translate-x-full'
)}>
  ...
</aside>
{isOpen && (
  <div
    className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
    onClick={() => setIsOpen(false)}
  />
)}
```

---

## Pre-Build Checklist

Before writing any UI code:

1. `globals.css` has the four `@import` lines, in order? (`tailwindcss` → `theme.css` → `globals.css` → `styles.css`)
2. All colors from tokens — no hardcoded hex, rgb, or Tailwind palette classes?
3. All components from `@opencosmos/ui` — no custom buttons, inputs, or scroll containers?
4. Missing component? → Declare it, ask first. Don't build bespoke.
5. Motion gated by `useMotionPreference`?
6. Links using `asChild` pattern — not nested `<a>` inside `<button>`?
7. `cn()` for all conditional classNames?
8. *(Library contributors only)* No interpolated Tailwind classes — use `responsive-classes.ts`.

**Item 1 is the gate.** Missing or mis-ordered CSS imports produce unstyled components with no error. The `styles.css` import is what makes component classes appear — without it, layouts look broken even though the code is correct.
