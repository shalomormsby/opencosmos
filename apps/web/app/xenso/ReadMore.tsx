'use client'

import { Button } from '@opencosmos/ui'
import { useMotionPreference } from '@opencosmos/ui/hooks'
import { ChevronDown } from 'lucide-react'

// The invitation fills a viewport, so the orientation beneath it is easy to
// miss entirely. This is the affordance that says there is more, and takes you
// there. Smooth scrolling is motion, so it is gated: at intensity 0 the jump is
// instant rather than degraded.
export function ReadMore({ targetId }: { targetId: string }) {
  const { shouldAnimate } = useMotionPreference()

  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-2 -ml-3"
      onClick={() => {
        document.getElementById(targetId)?.scrollIntoView({
          behavior: shouldAnimate ? 'smooth' : 'auto',
          block: 'start',
        })
      }}
    >
      Read more
      <ChevronDown className="w-4 h-4" />
    </Button>
  )
}
