'use client'

import { useEffect, useState } from 'react'
import { Button } from '@opencosmos/ui'

type User = { firstName: string | null; email: string } | null

export function AuthButton() {
  const [user, setUser] = useState<User>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data: { user: User }) => {
        setUser(data.user)
        setChecked(true)
      })
      .catch(() => setChecked(true))
  }, [])

  if (!checked) return null

  if (user) {
    return (
      <Button variant="secondary" size="sm" asChild>
        <a href="/account">My account</a>
      </Button>
    )
  }

  return (
    <Button variant="secondary" size="sm" asChild>
      <a href="/api/auth/signin">Sign in</a>
    </Button>
  )
}
