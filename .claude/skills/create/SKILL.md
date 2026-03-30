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
2. **Ask** the user (Shalom or anyone) whether to add it to the component library in `opencosmos-ui`.
3. **Only if explicitly told to build it inline as a one-off** should you write bespoke code for it — and even then, flag it as a candidate for future extraction.

This keeps the system coherent. Every addition to the component library benefits every product that will ever need the same thing.

---

## The Core Philosophy: Build Once, Ripple Everywhere

When something needs to change — a color, spacing, motion curve, button shape, component behavior — **change it in the design system, not in the consuming app**. That change then ripples to every product automatically.

**This means:**
- You never override a component's design with custom CSS. You add a prop or variant to the component.
- You never create a one-off version of an existing component. You extend the existing one.
- You never hardcode a value that has a token. You use the token.
- You never style around a component because it "almost works." You surface the gap.

**The test:** If you fixed this in one place, would all products that need it be fixed? If not, you're patching an instance instead of evolving the system.

---

## Required CSS Setup

Every app that uses `@opencosmos/ui` must chain CSS imports **inside `globals.css`** using CSS `@import` — not separate `import` statements in `layout.tsx`.

**`app/globals.css`:**
```css
@import "tailwindcss";
@import "@opencosmos/ui/theme.css";
@import "@opencosmos/ui/globals.css";
@source "../../../node_modules/.pnpm/@opencosmos+ui@*/node_modules/@opencosmos/ui/dist";

@layer base {
  body {
    background-color: var(--color-background);
    color: var(--color-foreground);
  }
}
```

**`app/layout.tsx`** — import only the single app CSS file:
```tsx
import './globals.css'
```

**Why this matters:**

1. **`@source` is required** — Tailwind v4 excludes `node_modules` from scanning by default. Without `@source`, responsive classes used inside `@opencosmos/ui` components (`lg:hidden`, `lg:flex`, `-translate-x-full`, etc.) are never generated. The result: mobile and desktop layouts both render simultaneously, producing a broken, overlapping UI.

2. **`@import` chains are required** — In Tailwind v4, `@theme` blocks (in `theme.css`) must be processed in the same Tailwind context as `@import "tailwindcss"`. Separate `import` statements in `layout.tsx` don't guarantee this. Using CSS `@import` chains ensures they're all processed together.

3. **Why the pnpm `.pnpm` store path, not `node_modules/@opencosmos/ui`** — In pnpm workspaces, `node_modules/@opencosmos/ui` is a **symlink** to the content-addressed store at `node_modules/.pnpm/@opencosmos+ui@{hash}/node_modules/@opencosmos/ui`. Tailwind v4 does not follow pnpm symlinks. The `@source` glob targets the real files directly, bypassing the symlink. The `@*` wildcard absorbs the version hash so this doesn't break on upgrades.

**`@import` uses the package name** so PostCSS resolves it via Node's module algorithm. **`@source` targets `dist/`** (the compiled JS/MJS files) rather than `src/` — Tailwind scans these for class name strings, and `dist` is guaranteed present after npm install.

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
className="text-zinc-500"
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

**Opacity modifiers are fine** — `text-foreground/50`, `border-foreground/10`, `bg-foreground/5`. These are idiomatic and theme-safe.

**Custom CSS is not allowed** except for layout geometry (e.g., `min-h-screen`, `max-w-2xl`, `flex`, `grid`) and animation keyframes when framer-motion is unavailable.

---

## Import Patterns

```tsx
// Core components (most common)
import { Button, Input, ScrollArea, Separator, Badge, Card, cn } from '@opencosmos/ui'

// Layout & navigation
import { Header, Footer, Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarItem, SidebarOverlay } from '@opencosmos/ui'

// Providers (wrap app root)
import { ThemeProvider, TooltipProvider } from '@opencosmos/ui'

// Overlays
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@opencosmos/ui'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@opencosmos/ui'

// Feedback
import { Alert, AlertTitle, AlertDescription } from '@opencosmos/ui'
import { ToastProvider, useToast } from '@opencosmos/ui'
import { Spinner, Skeleton, Progress } from '@opencosmos/ui'

// Icons (GitHubIcon is in the package — no separate install)
import { GitHubIcon } from '@opencosmos/ui'
// All other icons: lucide-react (already a dependency)
import { Github, Star, Menu, X, ChevronDown } from 'lucide-react'

// Hooks
import { useMotionPreference } from '@opencosmos/ui/hooks'
import { useTheme } from '@opencosmos/ui/hooks'

// Utilities
import { cn } from '@opencosmos/ui'  // tailwind-merge + clsx — always use this for conditional classes
```

---

## Component Reference

### Header (liquid glass, sticky, responsive)

The flagship navigation component. Sticky, liquid glass on scroll, responsive mobile fullscreen menu, optional dropdown nav, actions slot.

```tsx
import { Header, Button, GitHubIcon, BRAND } from '@opencosmos/ui'

<Header
  logo={<span className="text-xl font-bold tracking-tight">{BRAND.productName}</span>}
  navAlignment="right"        // 'center' | 'left' | 'right'
  navLinks={[
    { label: 'Chat', href: '/chat' },
    { label: 'Studio', href: 'https://studio.opencosmos.ai' },
    // Dropdown:
    { label: 'More', children: [
      { label: 'Knowledge', href: '/knowledge' },
    ]},
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

Key props:
| Prop | Default | Options |
|------|---------|---------|
| `navAlignment` | `'center'` | `'center'` \| `'left'` \| `'right'` |
| `glassOnScroll` | `true` | `boolean` |
| `sticky` | `true` | `boolean` |
| `maxWidth` | `'max-w-7xl'` | `'max-w-7xl'` \| `'max-w-[1440px]'` \| `'max-w-4xl'` |

Header is a client component. Pages can be server components — Next.js handles the boundary.

---

### Button

```tsx
// Variants: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
// Sizes: 'sm' | 'default' | 'lg' | 'icon'

<Button variant="outline" size="sm">Label</Button>

// As a link — always use asChild, never nest <a> inside <button>
<Button variant="outline" size="sm" asChild>
  <a href="/chat">Open Chat</a>
</Button>

// External links always get target + rel
<Button variant="outline" asChild className="gap-2">
  <a href="https://github.com/..." target="_blank" rel="noopener noreferrer">
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
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
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

`defaultTheme`: `'studio'` | `'terra'` | `'volt'` — defaults to `'studio'` if omitted.
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

Every animation must respect user preferences. Intensity 0 must be a perfect experience — not degraded, not broken.

```tsx
import { useMotionPreference } from '@opencosmos/ui/hooks'

const { shouldAnimate, scale } = useMotionPreference()

// Gate animations
<div className={cn(shouldAnimate && 'transition-transform duration-200')} />

// With framer-motion
<motion.div
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: shouldAnimate ? 0.3 : 0 }}
/>
```

For slide-in panels and simple show/hide, Tailwind `transition-transform` is sufficient — framer-motion is not required.

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
| Hamburger menu icon | `Menu` from `lucide-react` |
| Any other icon | `lucide-react` |

If you find yourself writing raw `<button>`, `<div onClick>`, a custom color value, or a custom scroll container — stop and check this list.

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

### Slide-in panel (history, settings, etc.)
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

1. Does `@opencosmos/ui` have a component for this? Check this reference.
2. If not → declare it, don't build bespoke. Ask first.
3. CSS imports in layout? (`globals.css` + `theme.css`)
4. All colors from tokens — no hardcoded hex, rgb, or Tailwind palette classes?
5. Motion gated by `useMotionPreference`?
6. Links using `asChild` pattern — not nested `<a>` inside `<button>`?
7. `cn()` for all conditional classNames?
8. Would this change benefit all products? If yes → it belongs in the design system.
