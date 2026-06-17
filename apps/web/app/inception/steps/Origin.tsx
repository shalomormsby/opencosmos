'use client'

import { Button } from '@opencosmos/ui'

/**
 * The opening — an origin moment, not a signup screen (Inception principle #1).
 * Carries Brian's post as a relic: a trace of human intention, not a testimonial.
 */
export function Origin({ onBegin }: { onBegin: () => void }) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 sm:py-24">
      <p className="text-xs uppercase tracking-[0.2em] text-foreground/40 mb-6">Inception</p>

      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground leading-tight">
        Bring a personal agent into being.
      </h1>

      <div className="mt-6 space-y-4 text-foreground/70 leading-relaxed">
        <p>
          Cosmo will sit with you for a little while and draw out who this agent is for — your north star,
          your voice, what you value, what you&rsquo;re tending right now. As you talk, a blueprint takes
          shape beside you: the docs that make an agent <em>yours</em> instead of generic.
        </p>
        <p>
          This is a <span className="text-foreground">place of origin, not a residence.</span> What you
          create here doesn&rsquo;t live on OpenCosmos — it goes home with you, to your own free space (a
          Gemini Gem) or your own setup. It even arrives already remembering how it came to be.
        </p>
      </div>

      <div className="mt-10">
        <Button onClick={onBegin} size="lg">
          Begin
        </Button>
        <p className="mt-3 text-sm text-foreground/40">
          Free to begin. About 10–15 minutes. Nothing is published; nothing is kept but what you take with you.
        </p>
      </div>

      {/* The relic — a trace of the human intention that gave this its shape. */}
      <div className="mt-16 border-l border-border pl-5 text-base text-foreground/50 leading-relaxed">
        <p>
          Inception exists because a Creative Powerup member, Brian, described the digital twin he wanted:
          one that would cultivate attunement, clarify discernment, bridge insight to embodied practice,
          guard against spiritual bypassing — and ask whether the juice was worth the squeeze before he
          gave it his life-force. His questions shaped what you&rsquo;re about to build. Built in public,
          with care.
        </p>
      </div>
    </div>
  )
}
