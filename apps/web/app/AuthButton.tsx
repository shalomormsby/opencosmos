'use client'

import { useEffect, useState } from 'react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@opencosmos/ui'
import { ChevronDown } from 'lucide-react'
import Link from 'next/link'

type User = { firstName: string | null; email: string }

export function AuthButton({ className }: { className?: string }) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data: { user: User | null }) => setUser(data.user))
      .catch(() => {})
  }, [])

  if (user) {
    const initial = (user.firstName ?? user.email)[0].toUpperCase()
    const name = user.firstName ?? user.email
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            size="icon"
            className="rounded-full w-auto px-2 gap-1.5 font-semibold"
            aria-label={`Account menu for ${name}`}
          >
            <span className="w-5 h-5 rounded-full bg-foreground/10 inline-flex items-center justify-center text-xs shrink-0">
              {initial}
            </span>
            <ChevronDown className="w-3 h-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[160px]">
          <DropdownMenuItem asChild>
            <Link href="/account">Account</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <a href="/api/auth/signout">Sign out</a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // Show "Log in" in loading and signed-out states so it's never invisible
  return (
    <Button variant="secondary" size="sm" asChild className={className}>
      <a href="/api/auth/signin">Log in</a>
    </Button>
  )
}
