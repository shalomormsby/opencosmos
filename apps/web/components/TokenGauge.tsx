'use client'

import { useMotionPreference } from '@opencosmos/ui/hooks'
import { cn } from '@opencosmos/ui/utils'

interface TokenGaugeProps {
  used: number
  total: number
  className?: string
}

const SEGMENTS = 10

export function TokenGauge({ used, total, className }: TokenGaugeProps) {
  const { shouldAnimate } = useMotionPreference()

  const remaining = Math.max(0, total - used)
  const remainingPercent = total > 0 ? remaining / total : 1
  // How many segments glow from the bottom (representing remaining budget)
  const filledSegments = Math.round(remainingPercent * SEGMENTS)

  const segmentColor =
    remainingPercent >= 0.5
      ? 'bg-foreground/40'
      : remainingPercent >= 0.2
        ? 'bg-amber-500'
        : 'bg-destructive'

  return (
    <div className={cn('flex flex-col items-center gap-1.5', className)}>
      {/* Vertical battery-style gauge: filled from bottom, drains from top */}
      <div className="flex flex-col-reverse gap-0.5">
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <div
            key={i}
            className={cn(
              'w-3 h-1 rounded-sm',
              shouldAnimate && 'transition-colors duration-300',
              i < filledSegments ? segmentColor : 'bg-foreground/10',
            )}
          />
        ))}
      </div>
      <p className="text-[10px] text-foreground/40 tabular-nums text-center leading-tight">
        {remaining.toLocaleString()}
        <br />
        <span className="text-foreground/25">of {total.toLocaleString()}</span>
      </p>
    </div>
  )
}
