'use client'

import { useEffect, useState } from 'react'
import { TokenGauge } from '@/components/TokenGauge'

type UsageState =
  | { kind: 'idle' }
  | { kind: 'unlimited' }                                      // BYOK — truly unlimited
  | { kind: 'tokens'; used: number; total: number }           // subscriber or free tier

export function SidebarUsage() {
  const [state, setState] = useState<UsageState>({ kind: 'idle' })

  useEffect(() => {
    // Check localStorage immediately — if a BYOK key is present we know the user
    // is unlimited without waiting for the server response.
    if (localStorage.getItem('cosmo_api_key')) {
      setState({ kind: 'unlimited' })
      return
    }

    fetch('/api/subscription')
      .then((r) => r.json())
      .then((data) => {
        if (data.hasByok) {
          setState({ kind: 'unlimited' })
        } else if (data.subscription) {
          setState({
            kind: 'tokens',
            used: data.subscription.tokensUsed ?? 0,
            total: data.subscription.tokensTotal ?? 0,
          })
        } else {
          fetch('/api/session')
            .then((r) => r.json())
            .then((s: { tokensUsed: number; tokenBudget: number }) => {
              setState({ kind: 'tokens', used: s.tokensUsed, total: s.tokenBudget })
            })
            .catch(() => {})
        }
      })
      .catch(() => {})
  }, [])

  if (state.kind === 'idle') return null

  if (state.kind === 'unlimited') {
    return (
      <span className="text-sm font-light text-[var(--color-success)] select-none">∞</span>
    )
  }

  return <TokenGauge used={state.used} total={state.total} compact />
}
