'use client'

import { Button, cn } from '@opencosmos/ui'
import { AXIS_WHAT, AXIS_BUILD } from '@/lib/inception/recipes'
import type { Path, Build } from '@/lib/inception/schema'

function OptionCard<T extends string>({
  label,
  blurb,
  selected,
  onSelect,
}: {
  label: string
  blurb: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'text-left rounded-2xl border p-5 transition-colors h-full',
        selected
          ? 'border-foreground/40 bg-surface'
          : 'border-border bg-transparent hover:border-foreground/25 hover:bg-surface/40',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-lg font-medium text-foreground">{label}</span>
        <span
          className={cn(
            'h-4 w-4 rounded-full border transition-colors shrink-0',
            selected ? 'border-foreground bg-foreground' : 'border-foreground/30',
          )}
        />
      </div>
      <p className="mt-2 text-base text-foreground/60 leading-relaxed">{blurb}</p>
    </button>
  )
}

export function Chooser({
  path,
  build,
  onPath,
  onBuild,
  onContinue,
  onBack,
}: {
  path?: Path
  build?: Build
  onPath: (p: Path) => void
  onBuild: (b: Build) => void
  onContinue: () => void
  onBack: () => void
}) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <p className="text-xs uppercase tracking-[0.2em] text-foreground/40 mb-8">Two questions</p>

      <section>
        <h2 className="text-xl font-medium text-foreground">{AXIS_WHAT.question}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {AXIS_WHAT.options.map((o) => (
            <OptionCard key={o.id} label={o.label} blurb={o.blurb} selected={path === o.id} onSelect={() => onPath(o.id)} />
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-medium text-foreground">{AXIS_BUILD.question}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {AXIS_BUILD.options.map((o) => (
            <OptionCard key={o.id} label={o.label} blurb={o.blurb} selected={build === o.id} onSelect={() => onBuild(o.id)} />
          ))}
        </div>
      </section>

      <div className="mt-12 flex items-center gap-3">
        <Button onClick={onContinue} disabled={!path || !build} size="lg">
          Continue
        </Button>
        <Button onClick={onBack} variant="ghost">
          Back
        </Button>
        {(!path || !build) && (
          <span className="text-sm text-foreground/40">Choose one from each to continue.</span>
        )}
      </div>
    </div>
  )
}
