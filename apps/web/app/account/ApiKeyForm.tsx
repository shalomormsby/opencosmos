'use client'

import { useState, useEffect } from 'react'
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from '@opencosmos/ui'
import { TokenGauge } from '@/components/TokenGauge'

const KEY_API_KEY = 'cosmo_api_key'

type SubscriptionState =
  | { status: 'loading' }
  | { status: 'none' }
  | {
      status: 'active' | 'past_due'
      tier: string
      name: string
      monthlyUSD: number
      usagePercent: number
      billingCycleAnchor: number
      tokensTotal: number
      tokensUsed: number
    }

export function ApiKeyForm() {
  const [apiKey, setApiKey] = useState('')
  const [draft, setDraft] = useState('')
  const [saved, setSaved] = useState(false)
  const [subscription, setSubscription] = useState<SubscriptionState>({ status: 'loading' })
  const [portalLoading, setPortalLoading] = useState(false)
  const [hasByok, setHasByok] = useState(false)
  const [sessionData, setSessionData] = useState<{
    tokensUsed: number
    tokenBudget: number
    sessionExpiresAt: number
  } | null>(null)

  useEffect(() => {
    // Load key synchronously from localStorage so all conditional rendering is
    // correct on the first paint — prevents "Free quota" flashing for BYOK users.
    const stored = localStorage.getItem(KEY_API_KEY) || ''
    setApiKey(stored)
    setDraft(stored)

    // Fetch session data only when there's no API key. Doing this here (after
    // reading localStorage) ensures we never request session data for BYOK users.
    if (!stored) {
      fetch('/api/session')
        .then((r) => r.json())
        .then((data: { tokensUsed: number; tokenBudget: number; sessionExpiresAt: number }) => {
          setSessionData(data)
        })
        .catch(() => {})
    }
  }, [])

  useEffect(() => {
    fetch('/api/subscription')
      .then((r) => r.json())
      .then((data) => {
        if (data.subscription) {
          setSubscription({
            status: data.subscription.status,
            ...data.subscription,
            tokensTotal: data.subscription.tokensTotal ?? 0,
            tokensUsed: data.subscription.tokensUsed ?? 0,
          })
        } else {
          setSubscription({ status: 'none' })
        }
        // hasByok is the server-authoritative signal that this user has used a
        // BYOK key — works regardless of which browser or device they're on.
        if (data.hasByok) {
          setHasByok(true)
        } else {
          // Backfill: if the user has a key in localStorage but no server flag
          // (e.g. saved before server-side detection was deployed), write the flag
          // now. The account page is authenticated so this call always resolves.
          const storedKey = localStorage.getItem(KEY_API_KEY)
          if (storedKey) {
            fetch('/api/byok', { method: 'POST' })
              .then(res => { if (res.ok) setHasByok(true) })
              .catch(() => {})
          }
        }
      })
      .catch(() => setSubscription({ status: 'none' }))
  }, [])

  const save = () => {
    const key = draft.trim()
    localStorage.setItem(KEY_API_KEY, key)
    setApiKey(key)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    // Record server-side that this authenticated user has a BYOK key.
    // The account page is always authenticated, so this is more reliable than
    // waiting for a chat message to trigger the flag.
    fetch('/api/byok', { method: 'POST' }).catch(() => {})
  }

  const clear = () => {
    localStorage.removeItem(KEY_API_KEY)
    setApiKey('')
    setDraft('')
    setHasByok(false)
    // Revoke the server-side BYOK flag so the account page reflects the change.
    fetch('/api/byok', { method: 'DELETE' }).catch(() => {})
  }

  const openPortal = async () => {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      setPortalLoading(false)
    }
  }

  const isSubscribed =
    subscription.status === 'active' || subscription.status === 'past_due'

  return (
    <div className="space-y-8">
      {/* API Key */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Anthropic API Key</CardTitle>
          <CardDescription>
            {apiKey
              ? 'Your key is connected and in use. Clear it below to remove BYOK access.'
              : 'Bring your own key for unlimited messages. Your key is stored only in your browser and is never sent to OpenCosmos servers — only forwarded directly to Anthropic.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="sk-ant-..."
              value={draft}
              onChange={(e) => { setDraft(e.target.value); setSaved(false) }}
              onKeyDown={(e) => e.key === 'Enter' && save()}
              className="flex-1 font-mono text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={save}
              disabled={!draft.trim() || draft === apiKey}
            >
              {saved ? 'Saved' : 'Save'}
            </Button>
            {apiKey && (
              <Button variant="ghost" size="sm" onClick={clear} className="text-foreground/40">
                Clear
              </Button>
            )}
          </div>
          {apiKey && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-xs font-medium text-emerald-500">Connected</span>
              <span className="text-xs font-mono text-foreground/60">
                {apiKey.slice(0, 16)}...{apiKey.slice(-4)}
              </span>
            </div>
          )}
          <p className="text-xs text-foreground/30">
            Get a key at{' '}
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground/60 transition-colors"
            >
              console.anthropic.com
            </a>
          </p>
        </CardContent>
      </Card>

      {/* Subscription */}
      <div className="space-y-3">

        {/* Active subscription — usage meter + manage */}
        {isSubscribed && (subscription.status === 'active' || subscription.status === 'past_due') && (
          <Card>
            <CardContent className="pt-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {subscription.name}
                    {subscription.status === 'past_due' && (
                      <Badge variant="destructive" className="ml-2 text-xs">Payment due</Badge>
                    )}
                  </p>
                  <p className="text-xs text-foreground/40 mt-0.5">
                    ${subscription.monthlyUSD}/month · renews{' '}
                    {new Date(subscription.billingCycleAnchor * 1000).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric',
                    })}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openPortal}
                  disabled={portalLoading}
                >
                  {portalLoading ? 'Opening…' : 'Manage billing'}
                </Button>
              </div>

              {/* Usage meter */}
              <div className="flex items-start gap-5">
                <TokenGauge
                  used={subscription.tokensUsed}
                  total={subscription.tokensTotal}
                  className="shrink-0"
                />
                <div className="space-y-1 min-w-0">
                  <p className="text-xs text-foreground/40">
                    {Math.max(0, subscription.tokensTotal - subscription.tokensUsed).toLocaleString()} of{' '}
                    {subscription.tokensTotal.toLocaleString()} tokens remaining this month
                  </p>
                  {subscription.usagePercent >= 80 && (
                    <p className="text-xs text-foreground/50">
                      Approaching your monthly limit.{' '}
                      <button onClick={openPortal} className="underline underline-offset-2">
                        Upgrade your plan
                      </button>{' '}
                      or add your own API key above for unlimited access.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* API connection — shown when BYOK key is detected (localStorage or server flag) */}
        {!isSubscribed && (apiKey || hasByok) && (
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-5">
                <TokenGauge unlimited className="shrink-0" />
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <p className="text-sm font-medium text-foreground">API connection</p>
                  </div>
                  <p className="text-xs text-foreground/40">
                    Unlimited — usage charged directly to your Anthropic account.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Free quota — shown for non-subscribers who have no API connection */}
        {!isSubscribed && !apiKey && !hasByok && sessionData && subscription.status !== 'loading' && (
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-start gap-5">
                <TokenGauge used={sessionData.tokensUsed} total={sessionData.tokenBudget} className="shrink-0" />
                <div className="space-y-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Free quota</p>
                  <p className="text-xs text-foreground/40">
                    {Math.max(0, sessionData.tokenBudget - sessionData.tokensUsed).toLocaleString()} of{' '}
                    {sessionData.tokenBudget.toLocaleString()} tokens remaining
                  </p>
                  {sessionData.sessionExpiresAt > 0 && (
                    <p className="text-xs text-foreground/30">
                      {(() => {
                        const secs = sessionData.sessionExpiresAt - Math.floor(Date.now() / 1000)
                        if (secs <= 0) return 'Quota expired'
                        const days = Math.floor(secs / 86400)
                        const hours = Math.floor((secs % 86400) / 3600)
                        return days > 0 ? `Resets in ${days} days` : hours > 0 ? `Resets in ${hours} hours` : 'Resets soon'
                      })()}
                    </p>
                  )}
                  <p className="text-xs text-foreground/25 pt-1">
                    Bring your own key above for unlimited access, or join Creative Powerup for managed access.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Community handoff — shown only when no subscription AND no BYOK key */}
        {!isSubscribed && !apiKey && !hasByok && subscription.status !== 'loading' && (
          <Card className="border-foreground/10">
            <CardHeader>
              <CardTitle className="text-base">Go deeper with Cosmo</CardTitle>
              <CardDescription>
                OpenCosmos is freely open — the platform, the knowledge corpus, the framework.
                Creative Powerup is the membership community that sustains this work and makes
                Cosmo accessible to everyone, no API key required. It&apos;s where the deeper
                practice, the conversations, and the community live.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" asChild>
                <a href="https://creativepowerup.com" target="_blank" rel="noopener noreferrer">
                  Explore Creative Powerup →
                </a>
              </Button>
            </CardContent>
          </Card>
        )}

        {subscription.status === 'loading' && (
          <div className="h-24 rounded-xl border border-foreground/10 animate-pulse" />
        )}
      </div>
    </div>
  )
}
