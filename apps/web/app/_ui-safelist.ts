/**
 * Tailwind CSS safelist for @opencosmos/ui components.
 *
 * Tailwind v4 + Turbopack does not follow pnpm symlinks, so @source cannot
 * scan @opencosmos/ui. This file lists every Tailwind class used by the
 * components imported in this app so Tailwind includes them in the CSS bundle.
 *
 * Components covered: Header, NavLink, Button, GitHubIcon (no Tailwind), Card, Badge, Input, Separator, ScrollArea, Breadcrumbs, OrbBackground
 *
 * To regenerate after upgrading @opencosmos/ui, run the extraction script
 * documented in .claude/skills/create/SKILL.md § "Required CSS Setup".
 */

// prettier-ignore
export const _safelist = [

  // ── Header layout ──────────────────────────────────────────────────────────
  // Outer header element
  'fixed sticky relative top-0 left-0 right-0 z-50',
  'transition-all backdrop-blur-xl backdrop-blur-3xl',
  'bg-transparent border-b border-transparent',
  'supports-[backdrop-filter]:bg-[var(--color-surface)]/50',
  'bg-[var(--color-surface)]/60',

  // Inner max-width wrapper
  'max-w-7xl max-w-[1440px] max-w-4xl mx-auto px-4 sm:px-6 lg:px-8',

  // Flex row
  'flex items-center justify-between h-16 lg:h-20 relative',

  // Logo wrapper
  'flex-shrink-0 z-10',

  // Desktop nav — all alignments
  'hidden lg:flex items-center gap-8',
  'ml-8 mr-auto ml-auto mr-8',
  'absolute left-1/2 -translate-x-1/2',

  // Desktop actions
  'hidden lg:flex items-center gap-4 z-10',

  // Mobile hamburger button
  'lg:hidden p-2 rounded-lg transition-colors',
  'hover:bg-[var(--color-surface)]',

  // Mobile fullscreen menu overlay
  'fixed inset-0 z-[100] lg:hidden',
  'opacity-0 opacity-100 pointer-events-none pointer-events-auto',

  // Mobile menu inner
  'absolute inset-0 bg-[var(--color-background)]',
  'flex flex-col items-center justify-center h-full gap-8 px-4',

  // Dropdown
  'relative group',
  'absolute top-full left-1/2 -translate-x-1/2 mt-2 min-w-[200px] z-50',
  'bg-[var(--color-surface)] border border-[var(--color-border)]',
  'rounded-lg shadow-xl py-1 p-1',
  'backdrop-blur-3xl bg-[var(--color-surface)]/95',
  'animate-fade-in',
  'rotate-180 transition-transform',

  // Misc Header structural
  'w-full w-[200px] max-w-xs w-3 w-6 h-2 h-3 h-6',
  'mt-2 mt-4 mt-8 top-full',
  'text-3xl text-xl text-center',
  'flex-col gap-3',

  // ── NavLink ────────────────────────────────────────────────────────────────
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
  // Pill variant
  'px-3 py-2 rounded-md hover:bg-[var(--color-surface)]',
  // Active state
  'font-semibold text-[var(--color-primary)]',

  // ── Button ─────────────────────────────────────────────────────────────────
  'inline-flex items-center justify-center font-medium',
  'transition-colors focus-visible:outline-none',
  'disabled:pointer-events-none disabled:opacity-50',
  'sage-interactive',
  // SVG children
  '[&_svg]:transition-transform [&_svg]:duration-300 hover:[&_svg]:translate-x-1',
  // Variants
  'bg-primary text-primary-foreground hover:bg-primary/90',
  'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  'border border-input bg-transparent shadow-xs hover:bg-primary hover:text-primary-foreground hover:border-primary',
  'bg-black/5 dark:bg-white/10 backdrop-blur-md border-black/5 dark:border-white/10 text-secondary-foreground hover:bg-primary hover:text-primary-foreground dark:hover:bg-primary dark:hover:text-primary-foreground',
  'bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface)]',
  'hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]',
  'hover:underline text-[var(--color-text-secondary)]',
  // Sizes
  'h-9 rounded-md px-4 py-2 text-sm',
  'h-10 rounded-md px-8',
  'h-8 rounded-md px-3 text-xs',
  'h-9 w-9',
  // Dark mode
  'dark:bg-white/10 dark:border-white/10 dark:hover:bg-primary dark:hover:text-primary-foreground',

  // ── Slide-in panel (CosmoChat history sidebar) ────────────────────────────
  'fixed inset-y-0 left-0 z-50 w-72 border-r',
  '-translate-x-full translate-x-0',
  'transition-transform duration-200 ease-in-out',

  // ── Card ────────────────────────────────────────────────────────────────────
  'rounded-2xl border bg-surface text-foreground',
  'bg-surface border-border',
  'bg-glass border-glass-border backdrop-blur-md',
  'transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary',
  'flex flex-col space-y-1.5 p-6',
  'text-2xl font-semibold leading-none tracking-tight',
  'text-foreground-secondary',
  'p-6 pt-0',
  'flex items-center p-6 pt-0',

  // ── Badge ───────────────────────────────────────────────────────────────────
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
  'transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
  'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
  'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
  // Badge sizes
  'px-2 py-0.5 px-2.5 py-1 px-3 py-1.5 text-base',
  // Badge dot
  'mr-1.5 rounded-full bg-current animate-pulse w-1.5 h-1.5 w-2 h-2 w-2.5 h-2.5',

  // ── Input ───────────────────────────────────────────────────────────────────
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm',
  'file:border-0 file:bg-transparent file:text-sm file:font-medium',
  'placeholder:text-muted-foreground',
  'focus-visible:ring-1 focus-visible:ring-ring',
  'disabled:cursor-not-allowed disabled:opacity-50',

  // ── Separator ───────────────────────────────────────────────────────────────
  'shrink-0 bg-border h-[1px] w-full h-full w-[1px]',

  // ── ScrollArea ──────────────────────────────────────────────────────────────
  'relative overflow-hidden h-full w-full rounded-[inherit]',
  'relative flex-1 rounded-full bg-border',

  // ── Breadcrumbs ─────────────────────────────────────────────────────────────
  // Nav container
  'flex flex-wrap items-center flex-nowrap list-none m-0 p-0 overflow-x-auto scrollbar-hide',
  'flex items-center flex-shrink-0 inline-flex mr-1.5',
  // Link variants
  'text-[var(--color-text-muted)] text-[var(--color-text-secondary)] text-[var(--color-text-primary)] text-[var(--color-primary)]',
  'hover:text-[var(--color-text-primary)] hover:text-[var(--color-background)] hover:text-[var(--color-primary)]',
  'hover:bg-[var(--color-hover)] hover:bg-[var(--color-text-primary)]',
  // Current page
  'font-semibold',
  // Padding / spacing
  'px-1.5 py-1.5 -mx-1.5 -my-1.5',
  // Separator
  'mx-2 select-none',
  // Underline variant
  'underline-offset-2 decoration-1 hover:decoration-2',
  'decoration-[var(--color-primary)]/40 hover:decoration-[var(--color-primary)]',
  // Focus / interaction
  'focus-visible:ring-offset-2 active:scale-95',

  // ── OrbBackground ───────────────────────────────────────────────────────────
  'pointer-events-auto',

  // ── Misc shared ────────────────────────────────────────────────────────────
  'gap-1 gap-2 gap-3 gap-4 gap-8',
  'px-4 px-6 py-3 py-4',
  'shadow-sm shadow-xs shadow-xl',
  'z-20 z-40',
  'border-border border-foreground/10',
  'h-4 w-4 h-full w-full',
  'bg-background text-foreground',

].join(' ')
