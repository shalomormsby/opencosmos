'use client'

import { useMotionPreference } from '@opencosmos/ui/hooks'
import { cn } from '@opencosmos/ui/utils'

interface TokenGaugeProps {
  used?: number
  total?: number
  /** BYOK or managed unlimited plan — shows ∞ instead of gauge */
  unlimited?: boolean
  /** Compact inline mode for sidebars — segments + label side by side */
  compact?: boolean
  className?: string
}

const SEGMENTS = 10

function formatTokens(n: number): string {
  if (n >= 1000) return `${Math.round(n / 1000)}k`
  return n.toString()
}

export function TokenGauge({
  used = 0,
  total = 0,
  unlimited = false,
  compact = false,
  className,
}: TokenGaugeProps) {
  const { shouldAnimate } = useMotionPreference()

  if (unlimited) {
    return (
      <div className={cn('flex items-center', compact ? 'gap-1' : 'justify-center', className)}>
        <span
          className={cn(
            'font-light tabular-nums',
            compact ? 'text-xs text-foreground/40' : 'text-2xl text-[var(--color-success)]',
          )}
        >
          ∞
        </span>
        {!compact && (
          <span className="text-xs text-foreground/30 ml-1.5">Unlimited</span>
        )}
      </div>
    )
  }

  const remaining = Math.max(0, total - used)
  const remainingPercent = total > 0 ? remaining / total : 1
  const filledSegments = Math.round(remainingPercent * SEGMENTS)

  // Semantic color: success when ≥ 40% remaining, error below that threshold
  const segmentColor =
    remainingPercent >= 0.4
      ? 'bg-[var(--color-success)]'
      : 'bg-[var(--color-error)]'

  // Compact (sidebar): segments 16×1.5px with 1px gaps — total height ~24px, fits inline
  // Full (account page): segments 16×2px with 2px gaps — slightly taller for card context
  const segmentClass = compact ? 'w-4 h-[1.5px] rounded-sm' : 'w-4 h-[2px] rounded-sm'
  const gapClass = compact ? 'gap-[1px]' : 'gap-[2px]'

  const label = `${formatTokens(remaining)} of ${formatTokens(total)}`

  return (
    <div
      className={cn(
        compact ? 'flex items-center gap-1.5' : 'flex flex-col items-center gap-1.5',
        className,
      )}
    >
      {/* Vertical battery-style gauge: filled from bottom, drains from top */}
      <div className={cn('flex flex-col-reverse', gapClass)}>
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <div
            key={i}
            className={cn(
              segmentClass,
              shouldAnimate && 'transition-colors duration-300',
              i < filledSegments ? segmentColor : 'bg-foreground/10',
            )}
          />
        ))}
      </div>
      <p
        className={cn(
          'text-foreground/40 tabular-nums leading-none',
          compact ? 'text-[10px]' : 'text-[10px] text-center',
        )}
      >
        {label}
      </p>
    </div>
  )
}
