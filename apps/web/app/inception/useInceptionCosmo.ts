'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useMotionPreference } from '@opencosmos/ui'
import type { TurnstileInstance } from '@marsidev/react-turnstile'
import type { Answers, Path, Build } from '@/lib/inception/schema'

export type Msg = { role: 'user' | 'assistant'; content: string }

type Ctx = {
  path: Path
  build: Build
  getStep: () => string | undefined
  getAnswers: () => Partial<Answers>
  // Called after each completed turn with the blueprint fields gleaned so far.
  onSynthesized?: (r: { answers: Partial<Answers>; dayZeroEntry: string }) => void
}

const API = '/api/inception'

/**
 * Lean Cosmo-interview hook for Inception. Its own message list (NOT the global
 * dialog manager) streaming from /api/inception, reusing the free-tier guard via a
 * BYOK key (localStorage `cosmo_api_key`) + an optional Turnstile token. Also exposes
 * `synthesize()` which calls the route's structured mode to fill the live blueprint.
 */
export function useInceptionCosmo(ctx: Ctx) {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isLimited, setIsLimited] = useState(false)
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [apiKeyDraft, setApiKeyDraft] = useState('')

  const turnstileRef = useRef<TurnstileInstance>(null)
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  const { shouldAnimate } = useMotionPreference()
  const typingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const seedFullRef = useRef<string>('')

  // Clean up the write-on interval on unmount.
  useEffect(() => () => { if (typingRef.current) clearInterval(typingRef.current) }, [])

  useEffect(() => {
    try {
      setApiKey(localStorage.getItem('cosmo_api_key'))
    } catch {
      /* ignore */
    }
  }, [])

  const saveKey = useCallback(() => {
    const k = apiKeyDraft.trim()
    if (!k) return
    try {
      localStorage.setItem('cosmo_api_key', k)
    } catch {
      /* ignore */
    }
    setApiKey(k)
    setApiKeyDraft('')
    setIsLimited(false)
  }, [apiKeyDraft])

  const resolveTurnstile = useCallback(async (): Promise<string> => {
    if (apiKey || !siteKey || !turnstileRef.current) return ''
    try {
      return await turnstileRef.current.getResponsePromise()
    } catch {
      return ''
    }
  }, [apiKey, siteKey])

  const basePayload = useCallback(
    () => ({
      path: ctx.path,
      build: ctx.build,
      step: ctx.getStep(),
      answersSoFar: ctx.getAnswers(),
      apiKey: apiKey ?? undefined,
    }),
    [ctx, apiKey],
  )

  // Structured extraction → partial Answers + a Day-0 origin entry.
  const synthesize = useCallback(
    async (history: Msg[]): Promise<{ answers: Partial<Answers>; dayZeroEntry: string } | null> => {
      if (history.length === 0) return null
      try {
        const turnstileToken = await resolveTurnstile()
        const res = await fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...basePayload(), mode: 'synthesize', messages: history, turnstileToken }),
        })
        if (!res.ok) return null
        return (await res.json()) as { answers: Partial<Answers>; dayZeroEntry: string }
      } catch {
        return null
      }
    },
    [basePayload, resolveTurnstile],
  )

  const send = useCallback(
    async (textArg?: string): Promise<Msg[] | null> => {
      const text = (textArg ?? input).trim()
      if (!text || isStreaming) return null

      // If the opening is still writing on, finalize it before we build history.
      if (typingRef.current) {
        clearInterval(typingRef.current)
        typingRef.current = null
      }
      const base =
        seedFullRef.current && messages.length > 0 && messages[0].role === 'assistant'
          ? [{ role: 'assistant' as const, content: seedFullRef.current }, ...messages.slice(1)]
          : messages

      const history = [...base, { role: 'user' as const, content: text }]
      setMessages([...history, { role: 'assistant', content: '' }])
      setInput('')
      setIsStreaming(true)

      try {
        const turnstileToken = await resolveTurnstile()
        const res = await fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...basePayload(), mode: 'chat', messages: history, turnstileToken }),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          if (res.status === 429 && err?.error === 'free_limit_reached') setIsLimited(true)
          setMessages((m) => {
            const copy = [...m]
            copy[copy.length - 1] = {
              role: 'assistant',
              content:
                err?.error === 'free_limit_reached'
                  ? "We've reached the free limit for this session. Add your own Anthropic API key below to keep going — your agent's inception continues uninterrupted."
                  : 'Something interrupted us. Try again in a moment.',
            }
            return copy
          })
          return null
        }

        const reader = res.body?.getReader()
        const decoder = new TextDecoder()
        let acc = ''
        if (reader) {
          for (;;) {
            const { done, value } = await reader.read()
            if (done) break
            acc += decoder.decode(value, { stream: true })
            setMessages((m) => {
              const copy = [...m]
              copy[copy.length - 1] = { role: 'assistant', content: acc }
              return copy
            })
          }
        }
        turnstileRef.current?.reset()
        const finalHistory: Msg[] = [...history, { role: 'assistant', content: acc }]
        // Let the blueprint fill itself from the conversation so far.
        if (ctx.onSynthesized) {
          const result = await synthesize(finalHistory)
          if (result) ctx.onSynthesized(result)
        }
        return finalHistory
      } catch {
        setMessages((m) => {
          const copy = [...m]
          copy[copy.length - 1] = { role: 'assistant', content: 'Something interrupted us. Try again in a moment.' }
          return copy
        })
        return null
      } finally {
        setIsStreaming(false)
      }
    },
    [input, isStreaming, messages, basePayload, resolveTurnstile, synthesize, ctx],
  )

  // Seed Cosmo's opening as a write-on (typewriter) effect — or instantly if the
  // user prefers reduced motion. Animates index 0 only, so a mid-write send is safe.
  const seed = useCallback(
    (opening: string) => {
      if (typingRef.current) {
        clearInterval(typingRef.current)
        typingRef.current = null
      }
      seedFullRef.current = opening
      if (!shouldAnimate) {
        setMessages([{ role: 'assistant', content: opening }])
        return
      }
      setMessages([{ role: 'assistant', content: '' }])
      const INTERVAL = 16
      const TARGET_MS = 17600 // total reveal time, independent of length
      const chunk = Math.max(1, Math.ceil(opening.length / (TARGET_MS / INTERVAL)))
      let i = 0
      typingRef.current = setInterval(() => {
        i = Math.min(opening.length, i + chunk)
        const slice = opening.slice(0, i)
        setMessages((prev) => {
          if (prev.length === 0) return prev
          const copy = [...prev]
          copy[0] = { role: 'assistant', content: slice }
          return copy
        })
        if (i >= opening.length && typingRef.current) {
          clearInterval(typingRef.current)
          typingRef.current = null
        }
      }, INTERVAL)
    },
    [shouldAnimate],
  )

  // Clear the conversation (used by Reset).
  const clear = useCallback(() => {
    if (typingRef.current) {
      clearInterval(typingRef.current)
      typingRef.current = null
    }
    setMessages([])
    setInput('')
    setIsLimited(false)
  }, [])

  return {
    messages,
    input,
    setInput,
    isStreaming,
    isLimited,
    apiKey,
    apiKeyDraft,
    setApiKeyDraft,
    saveKey,
    send,
    synthesize,
    seed,
    clear,
    siteKey,
    turnstileRef,
  }
}
