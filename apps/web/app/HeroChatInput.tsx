'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@opencosmos/ui'

/**
 * Landing-page chat input. Mirrors the dialog page's textarea + Send pattern:
 * the textarea has its own border, the Send button sits beside it as a
 * separate sibling. On submit, navigates to /dialog?q=<input> — the dialog
 * page reads that query param, seeds the input, and auto-sends.
 */
export function HeroChatInput() {
  const router = useRouter()
  const [value, setValue] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = () => {
    const trimmed = value.trim()
    if (!trimmed || submitting) return
    setSubmitting(true)
    router.push(`/dialog?q=${encodeURIComponent(trimmed)}`)
  }

  return (
    <div className="flex gap-3 items-end">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            submit()
          }
        }}
        placeholder="Ask anything…"
        rows={1}
        disabled={submitting}
        className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-foreground/30 outline-none border border-foreground/15 rounded-xl px-4 py-3 leading-relaxed focus:border-foreground/30 transition-colors disabled:opacity-50 min-h-[48px] max-h-[160px] overflow-y-auto [field-sizing:content]"
        aria-label="Ask Cosmo"
        autoFocus
      />
      <Button
        onClick={submit}
        disabled={!value.trim() || submitting}
        size="sm"
        className="shrink-0 h-12"
      >
        {submitting ? '···' : 'Send'}
      </Button>
    </div>
  )
}
