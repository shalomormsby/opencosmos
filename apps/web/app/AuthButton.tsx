'use client'

import { useEffect, useState } from 'react'
import { Button } from '@opencosmos/ui'

type AuthState = 'loading' | 'signed-in' | 'signed-out'

export function AuthButton() {
  const [state, setState] = useState<AuthState>('loading')

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data: { user: { firstName: string | null; email: string } | null }) => {
        setState(data.user ? 'signed-in' : 'signed-out')
      })
      .catch(() => setState('signed-out'))
  }, [])

  if (state === 'signed-in') {
    return (
      <Button variant="secondary" size="sm" asChild>
        <a href="/account">My account</a>
      </Button>
    )
  }

  // Show "Sign in" in both loading and signed-out states so it's never invisible
  return (
    <Button variant="secondary" size="sm" asChild>
      <a href="/api/auth/signin">Sign in</a>
    </Button>
  )
}
