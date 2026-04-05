'use client'

import { useEffect, useState } from 'react'

type AuthUser = {
  firstName: string | null
  lastName: string | null
  email: string
  profilePictureUrl: string | null
}

export function SidebarAvatar() {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data: { user: AuthUser | null }) => setUser(data.user))
      .catch(() => setUser(null))
  }, [])

  // Loading skeleton
  if (user === undefined) {
    return (
      <span className="shrink-0 w-7 h-7 rounded-full bg-foreground/8 animate-pulse" />
    )
  }

  const href = user ? '/account' : '/api/auth/signin'

  const initials = user
    ? (
        (user.firstName?.[0] ?? '') + (user.lastName?.[0] ?? '')
      ).toUpperCase() || user.email[0].toUpperCase()
    : null

  return (
    <a
      href={href}
      className="shrink-0 w-7 h-7 rounded-full bg-foreground/10 flex items-center justify-center hover:bg-foreground/15 transition-colors overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
      aria-label={user ? `Go to account (${user.firstName ?? user.email})` : 'Log in'}
    >
      {user?.profilePictureUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.profilePictureUrl}
          alt={user.firstName ?? 'Profile'}
          className="w-full h-full object-cover"
        />
      ) : initials ? (
        <span className="text-xs font-semibold text-foreground/60 select-none">
          {initials}
        </span>
      ) : (
        <svg
          className="w-4 h-4 text-foreground/40"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
          />
        </svg>
      )}
    </a>
  )
}
