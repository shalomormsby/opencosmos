'use client'

import { useState, useEffect } from 'react'
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, cn } from '@opencosmos/ui'

const KEY_API_KEY = 'cosmo_api_key'

const PLANS = [
  {
    id: 'explorer',
    name: 'Explorer',
    price: '$5',
    period: '/month',
    description: 'For curious minds beginning the journey.',
    messages: '100 messages/month',
    highlight: false,
  },
  {
    id: 'seeker',
    name: 'Seeker',
    price: '$10',
    period: '/month',
    description: 'For those in active dialogue with the cosmos.',
    messages: '300 messages/month',
    highlight: true,
  },
  {
    id: 'luminary',
    name: 'Luminary',
    price: '$20',
    period: '/month',
    description: 'Unlimited depth for the fully committed.',
    messages: 'Unlimited messages',
    highlight: false,
  },
] as const

export function ApiKeyForm() {
  const [apiKey, setApiKey] = useState('')
  const [draft, setDraft] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(KEY_API_KEY) || ''
    setApiKey(stored)
    setDraft(stored)
  }, [])

  const save = () => {
    const key = draft.trim()
    localStorage.setItem(KEY_API_KEY, key)
    setApiKey(key)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const clear = () => {
    localStorage.removeItem(KEY_API_KEY)
    setApiKey('')
    setDraft('')
  }

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
            <p className="text-xs text-foreground/40">
              Active — {apiKey.slice(0, 12)}•••
            </p>
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

      {/* Plan tiers */}
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium text-foreground">Subscription plans</p>
          <p className="text-xs text-foreground/40 mt-0.5">
            Hosted plans are coming soon. Join the waitlist by selecting a tier.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
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
                <span className="text-xl font-light text-foreground">{plan.price}</span>
                <span className="text-xs text-foreground/40">{plan.period}</span>
              </div>
              <p className="text-xs text-foreground/50">{plan.messages}</p>
              <Button variant="outline" size="sm" className="w-full" disabled>
                Coming soon
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
