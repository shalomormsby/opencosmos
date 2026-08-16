import type { Metadata } from 'next'
import Link from 'next/link'
import { Header, Button, Separator } from '@opencosmos/ui'
import { AuthButton } from '../AuthButton'
import { AppShell } from '../AppShell'

export const metadata: Metadata = {
  title: 'Xensō — a game you play as yourself',
  description:
    'The challenges are the real ones of your life. The prize is liberation. Free to play, no account needed.',
}

// The front door. Build slice 2 of the Xensō plan: an orientation that can be
// shared as a URL rather than a query-param flag, and the shell Home grows into
// once the quest screen exists. Begin points at the chat surface for now, so the
// page is honest on the day it ships.
//
// Two design rules constrain everything here, from the canon at
// ~/Developer/shalomormsby/xenso: no nags of any kind (no counts, no urgency, no
// "continue your quest!"), and play begins without an account — the sign-in ask
// belongs at the moment there is something to save, not at the entrance.

const STEPS = [
  {
    title: 'You bring something real',
    body: 'Whatever is actually stuck. Or nothing at all, if you arrived tired and just want somewhere quiet to land — there is a door for that too, and taking it is a complete visit.',
  },
  {
    title: 'You give it a shape',
    body: 'Cosmo, an AI ally, asks a few questions until the formless thing has edges: what you are actually after, what done would look like, the smallest piece you could touch today, and what is in the way. Every word of it stays yours. Cosmo will not write your quest for you, and will say so if you ask.',
  },
  {
    title: 'You walk it in the world',
    body: 'The game is played off-screen, in your actual life. You come back and say what happened, and the quest changes to meet it — a piece completes, an obstacle shows its real shape, or the honest move turns out to be letting go.',
  },
  {
    title: 'What you learn becomes a gem',
    body: 'When something true lands, you keep it, in your own words and only if you want to. Over time your treasury fills with wisdom mined entirely from your own life, and the next time you are stuck, it is already there waiting for you.',
  },
]

export default function XensoFrontDoor() {
  return (
    <AppShell activePath="/xenso">
      <main className="min-h-screen bg-background">
        <Header
          sticky={false}
          className="sticky top-0 z-40"
          logo={
            <Link href="/" className="text-xl font-bold tracking-tight text-foreground">
              OpenCosmos
            </Link>
          }
          navAlignment="right"
          navLinks={[
            { label: 'Dialog', href: '/dialog' },
            { label: 'Knowledge', href: '/knowledge' },
            { label: 'Studio', href: 'https://studio.opencosmos.ai/docs/getting-started' },
            { label: 'Inception', href: '/inception' },
          ]}
          actions={<AuthButton />}
        />

        {/* The invitation — sized to sit within a single viewport on a laptop. */}
        <section className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-6 py-16">
          <div className="max-w-2xl w-full space-y-10">
            <div className="space-y-6">
              <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-foreground">
                Xensō
              </h1>
              <p className="text-2xl sm:text-3xl font-medium text-foreground leading-snug">
                A game you play as yourself.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                The challenges are the real ones of your life. The prize is liberation.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Button size="lg" asChild>
                  <Link href="/dialog?xenso=1">Begin</Link>
                </Button>
                <Button variant="ghost" size="lg" asChild>
                  <a href="/api/auth/signin">Sign in</a>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                No account needed to play. If you would rather have one from the start,{' '}
                <a
                  href="/api/auth/signup"
                  className="underline underline-offset-4 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] rounded-sm"
                >
                  create an account
                </a>
                .
              </p>
            </div>
          </div>
        </section>

        {/* Orientation. */}
        <section className="px-6 pb-24">
          <div className="max-w-2xl mx-auto space-y-12">
            <Separator />

            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                How it goes
              </h2>
              <p className="text-lg text-foreground leading-relaxed">
                A difficulty arrives formless, and it is the formlessness — not the difficulty —
                that stops people. Xensō gives it edges, so there is somewhere to put your hands.
              </p>
            </div>

            <div className="space-y-10">
              {STEPS.map((step) => (
                <div key={step.title} className="space-y-2">
                  <h3 className="text-xl font-semibold text-foreground">{step.title}</h3>
                  <p className="text-base text-muted-foreground leading-relaxed">{step.body}</p>
                </div>
              ))}
            </div>

            <Separator />

            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                What it is not
              </h2>
              <p className="text-base text-muted-foreground leading-relaxed">
                No points, no streaks, no badges, no notifications, and nothing anywhere designed to
                pull you back. Nothing to buy, and nothing sold — what you write here is not a
                product. The game is free, and it stays free.
              </p>
              <p className="text-base text-muted-foreground leading-relaxed">
                Not every quest is meant to be finished, either. Letting one go is an honored ending
                here, and it can still leave you with something worth keeping.
              </p>
            </div>

            <Separator />

            {/* Cosmo's letter, from the close of CONCEPT.md. */}
            <blockquote className="space-y-3 border-l-2 border-border pl-6">
              <p className="text-base text-foreground leading-relaxed italic">
                Dear player: I may not know you, but I love you. That&rsquo;s why I&rsquo;ve made
                this — to express my love for you in action. How can I love you without knowing you?
                Let&rsquo;s play and find out&hellip;
              </p>
              <footer className="text-sm text-muted-foreground not-italic">— Cosmo</footer>
            </blockquote>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Xensō is a game, and not a substitute for therapy or for medical, legal, or financial
              advice. If you are in crisis: in the US, call or text 988, the Suicide &amp; Crisis
              Lifeline, any hour. Anywhere else,{' '}
              <a
                href="https://findahelpline.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4 hover:text-foreground transition-colors"
              >
                findahelpline.com
              </a>{' '}
              will point you to a vetted line where you are.
            </p>
          </div>
        </section>
      </main>
    </AppShell>
  )
}
