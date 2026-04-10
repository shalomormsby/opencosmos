'use client'

import { useState, useEffect } from 'react'
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, cn } from '@opencosmos/ui'
import { TIERS, type Tier } from '@/lib/stripe'
import { TokenGauge } from '@/components/TokenGauge'

const KEY_API_KEY = 'cosmo_api_key'

type SubscriptionState =
  | { status: 'loading' }
  | { status: 'none' }
  | {
      status: 'active' | 'past_due'
      tier: Tier
      name: string
      monthlyUSD: number
      usagePercent: number
      billingCycleAnchor: number
    }

export function ApiKeyForm() {
  const [apiKey, setApiKey] = useState('')
  const [draft, setDraft] = useState('')
  const [saved, setSaved] = useState(false)
  const [subscription, setSubscription] = useState<SubscriptionState>({ status: 'loading' })
  const [checkoutLoading, setCheckoutLoading] = useState<Tier | null>(null)
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
          setSubscription({ status: data.subscription.status, ...data.subscription })
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

  const startCheckout = async (tier: Tier) => {
    setCheckoutLoading(tier)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      setCheckoutLoading(null)
    }
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
            Bring your own key for unlimited messages. Your key is stored only in your browser
            and is never sent to OpenCosmos servers — only forwarded directly to Anthropic.
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
        <div>
          <p className="text-sm font-medium text-foreground">Subscription</p>
          <p className="text-xs text-foreground/40 mt-0.5">
            {isSubscribed
              ? 'Managed API access — Cosmo uses OpenCosmos infrastructure on your behalf.'
              : 'Subscribe for managed access — no API key required.'}
          </p>
        </div>

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
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-foreground/40">
                  <span>Monthly usage</span>
                  <span>{subscription.usagePercent}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-foreground/8 overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      subscription.usagePercent >= 90
                        ? 'bg-destructive'
                        : subscription.usagePercent >= 70
                          ? 'bg-amber-500'
                          : 'bg-foreground/30'
                    )}
                    style={{ width: `${subscription.usagePercent}%` }}
                  />
                </div>
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
                    Subscribe for unlimited managed access, or bring your own key above.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tier cards — shown when no active subscription */}
        {!isSubscribed && subscription.status !== 'loading' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(Object.entries(TIERS) as [Tier, typeof TIERS[Tier]][]).map(([key, plan]) => (
              <div
                key={key}
                className={cn(
                  'relative rounded-xl border p-4 space-y-3 transition-colors',
                  plan.highlight
                    ? 'border-foreground/20 bg-foreground/3'
                    : 'border-foreground/10 bg-transparent'
                )}
              >
                {plan.highlight && (
                  <Badge variant="secondary" className="absolute -top-2.5 left-4 text-xs">
                    Popular
                  </Badge>
                )}
                <div>
                  <p className="text-sm font-semibold text-foreground">{plan.name}</p>
                  <p className="text-xs text-foreground/40 mt-0.5">{plan.description}</p>
                </div>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-xl font-light text-foreground">${plan.monthlyUSD}</span>
                  <span className="text-xs text-foreground/40">/month</span>
                </div>
                <Button
                  variant={plan.highlight ? 'default' : 'outline'}
                  size="sm"
                  className="w-full"
                  onClick={() => startCheckout(key)}
                  disabled={checkoutLoading !== null}
                >
                  {checkoutLoading === key ? 'Redirecting…' : `Subscribe to ${plan.name}`}
                </Button>
              </div>
            ))}
          </div>
        )}

        {subscription.status === 'loading' && (
          <div className="h-24 rounded-xl border border-foreground/10 animate-pulse" />
        )}
      </div>
    </div>
  )
}
