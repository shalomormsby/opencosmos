---
name: create
description: Build UI for opencosmos apps using @opencosmos/ui components exclusively. Provides the component API reference, import patterns, and rules needed to build correctly without grepping source or dist files.
argument-hint: "<brief description of what to build>"
user-invocable: true
---

# /create — Build with @opencosmos/ui

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

When adding `@opencosmos/ui` to any app in this monorepo, complete these three steps **before writing any component code**. Skipping them will produce broken, unstyled components with no useful error message.

### Step 1 — CSS imports in `globals.css`

```css
/* app/globals.css */
@import "tailwindcss";
@import "@opencosmos/ui/theme.css";
@import "@opencosmos/ui/globals.css";

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

**Why this matters:** In Tailwind v4, `@theme` blocks must be processed in the same Tailwind context as `@import "tailwindcss"`. Separate `import` statements in `layout.tsx` don't guarantee this. Using CSS `@import` chains ensures they're all processed together.

### Step 2 — Create `app/_ui-safelist.ts`

**This is mandatory.** Without it, component layouts will appear broken even though the code is correct.

**Why:** Tailwind v4 + Turbopack does not follow pnpm symlinks. `node_modules/@opencosmos/ui` is a symlink to pnpm's content-addressed store — Tailwind never scans it, so component-internal classes (`lg:hidden`, `lg:flex`, `inline-flex`, etc.) are never generated. This was confirmed empirically: `@source` with every possible glob pattern resolves correctly in fast-glob but is silently ignored by Turbopack. The only reliable fix is a safelist file in the app source, which Tailwind always scans.

Copy this file verbatim into `app/_ui-safelist.ts`:

```ts
/**
 * Tailwind CSS safelist for @opencosmos/ui components.
 * Required because Tailwind v4 + Turbopack does not follow pnpm symlinks,
 * so @source cannot scan @opencosmos/ui. This file forces Tailwind to
 * generate all classes used internally by @opencosmos/ui components.
 *
 * Update when upgrading @opencosmos/ui — see extraction script below.
 */

// prettier-ignore
export const _safelist = [

  // ── Header layout ────────────────────────────────────────────────────────
  'fixed sticky relative top-0 left-0 right-0 z-50',
  'transition-all backdrop-blur-xl backdrop-blur-3xl',
  'bg-transparent border-b border-transparent',
  'supports-[backdrop-filter]:bg-[var(--color-surface)]/50',
  'bg-[var(--color-surface)]/60',
  'max-w-7xl max-w-[1440px] max-w-4xl mx-auto px-4 sm:px-6 lg:px-8',
  'flex items-center justify-between h-16 lg:h-20 relative',
  'flex-shrink-0 z-10',
  'hidden lg:flex items-center gap-8',
  'ml-8 mr-auto ml-auto mr-8',
  'absolute left-1/2 -translate-x-1/2',
  'hidden lg:flex items-center gap-4 z-10',
  'lg:hidden p-2 rounded-lg transition-colors',
  'hover:bg-[var(--color-surface)]',
  'fixed inset-0 z-[100] lg:hidden',
  'opacity-0 opacity-100 pointer-events-none pointer-events-auto',
  'absolute inset-0 bg-[var(--color-background)]',
  'flex flex-col items-center justify-center h-full gap-8 px-4',
  'relative group',
  'absolute top-full left-1/2 -translate-x-1/2 mt-2 min-w-[200px] z-50',
  'bg-[var(--color-surface)] border border-[var(--color-border)]',
  'rounded-lg shadow-xl py-1 p-1',
  'backdrop-blur-3xl bg-[var(--color-surface)]/95',
  'animate-fade-in rotate-180 transition-transform',
  'w-full w-[200px] max-w-xs w-3 w-6 h-2 h-3 h-6',
  'mt-2 mt-4 mt-8 top-full',
  'text-3xl text-xl text-center flex-col gap-3',

  // ── NavLink ──────────────────────────────────────────────────────────────
  'group inline-flex items-center gap-2',
  'text-sm text-base text-lg font-medium',
  'transition-all transition-colors duration-200',
  'cursor-pointer relative pb-1 rounded-xs w-full',
  'focus-visible:outline-none focus-visible:outline focus-visible:outline-2',
  'focus-visible:outline-offset-2 focus-visible:outline-offset-4',
  'focus-visible:outline-[var(--color-focus)]',
  'focus-visible:ring-1 focus-visible:ring-2',
  'focus-visible:ring-[var(--color-focus)] focus-visible:ring-ring',
  'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
  'text-[var(--color-text-primary)] hover:text-[var(--color-primary)]',
  'text-primary hover:underline underline-offset-4',
  'px-3 py-2 rounded-md hover:bg-[var(--color-surface)]',
  'font-semibold text-[var(--color-primary)]',

  // ── Button ───────────────────────────────────────────────────────────────
  'inline-flex items-center justify-center font-medium',
  'transition-colors focus-visible:outline-none',
  'disabled:pointer-events-none disabled:opacity-50',
  'sage-interactive',
  '[&_svg]:transition-transform [&_svg]:duration-300 hover:[&_svg]:translate-x-1',
  'bg-primary text-primary-foreground hover:bg-primary/90',
  'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  'border border-input bg-transparent shadow-xs hover:bg-primary hover:text-primary-foreground hover:border-primary',
  'bg-[var(--color-surface)] border border-[var(--color-border)]',
  'hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]',
  'hover:underline text-[var(--color-text-secondary)]',
  'h-9 rounded-md px-4 py-2 text-sm',
  'h-10 rounded-md px-8',
  'h-8 rounded-md px-3 text-xs',
  'h-9 w-9',
  'dark:bg-white/10 dark:border-white/10 dark:hover:bg-primary dark:hover:text-primary-foreground',

  // ── Slide-in panel (sidebars, history drawers) ────────────────────────
  'fixed inset-y-0 left-0 z-50 w-72 border-r',
  '-translate-x-full translate-x-0',
  'transition-transform duration-200 ease-in-out',

  // ── Shared utilities ──────────────────────────────────────────────────
  'gap-1 gap-2 gap-3 gap-4 gap-8',
  'px-4 px-6 py-3 py-4',
  'shadow-sm shadow-xs shadow-xl',
  'z-20 z-40',
  'border-border border-foreground/10',
  'h-4 w-4 h-full w-full',
  'bg-background text-foreground',

].join(' ')
```

### Step 3 — Verify before writing any component code

Run the dev server, load the page, and confirm the safelist is being scanned:

```bash
pnpm dev --filter <app-name>
# In another terminal, after loading the page:
grep -c "lg:flex\|inline-flex\|lg:hidden" apps/<app-name>/.next/dev/static/chunks/*.css
```

**Expected: non-zero.** If zero — the `_ui-safelist.ts` file is not in the `app/` directory or isn't being picked up. Do not proceed until this passes.

**Never commit or push UI code without confirming this check passes on localhost.** Pushing broken code to CI is expensive — both in compute and in time.

### When upgrading `@opencosmos/ui`

If a new version adds new components or classes, regenerate the safelist entries:

```bash
python3 << 'EOF'
import re, sys

# Add paths for any component you're using
files = [
    'apps/web/node_modules/@opencosmos/ui/src/components/layout/Header/Header.tsx',
    'apps/web/node_modules/@opencosmos/ui/src/components/navigation/NavLink.tsx',
    'apps/web/node_modules/@opencosmos/ui/src/components/actions/Button.tsx',
]

words = set()
for path in files:
    with open(path) as f:
        content = f.read()
    for m in re.finditer(r'["`\']([\s\S]*?)["`\']', content):
        for w in m.group(1).split():
            w = w.strip().rstrip(',')
            if w and not w.startswith('$') and not w.startswith('{') and len(w) < 80:
                words.add(w)

tailwind = sorted(w for w in words if re.match(r'^[a-z@\[&][-a-z0-9/:[\]_.()%+*#@&,\'"!=]+$', w) and len(w) > 1)
print(' '.join(tailwind))
EOF
```

Then diff the output against the current safelist, add new classes, verify with the grep check above.

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

1. `globals.css` has the three `@import` lines? (`tailwindcss` → `theme.css` → `globals.css`)
2. `app/_ui-safelist.ts` exists and contains the full safelist?
3. Safelist verified: `grep -c "lg:flex\|inline-flex" .next/dev/static/chunks/*.css` returns non-zero?
4. All colors from tokens — no hardcoded hex, rgb, or Tailwind palette classes?
5. All components from `@opencosmos/ui` — no custom buttons, inputs, or scroll containers?
6. Missing component? → Declare it, ask first. Don't build bespoke.
7. Motion gated by `useMotionPreference`?
8. Links using `asChild` pattern — not nested `<a>` inside `<button>`?
9. `cn()` for all conditional classNames?

**Step 3 is a gate, not a suggestion.** If it fails, fix it before writing component code. If you push without checking it, you will push broken UI.
