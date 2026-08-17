import type { Metadata } from 'next'
import Link from 'next/link'
import { Header, Button, Separator } from '@opencosmos/ui'
import { AuthButton } from '../AuthButton'
import { AppShell } from '../AppShell'
import { ReadMore } from './ReadMore'

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

// Drawn from the vows in CONCEPT.md § Not this. Each line is a commitment the
// design actually enforces, not a marketing posture — which is why they are
// stated as flatly as they are.
const NOT_THIS = [
  {
    title: 'Not therapy.',
    body: 'This is play, and play is a different medicine. Some things deserve a trained human being rather than a game, and when one of those shows up, Cosmo will say so plainly instead of quietly trying to handle it.',
  },
  {
    title: 'Not medical, legal, or financial advice.',
    body: 'Those need someone qualified and accountable. You will get an honest handoff rather than an improvisation dressed up as help.',
  },
  {
    title: 'Not a data extraction device.',
    body: 'What you write here is never sold, never shared with a third party, and never mined to advertise anything to you. You can take all of it with you, and you can delete all of it, for real.',
  },
  {
    title: 'Not a slot machine.',
    body: 'No points, no streaks, no badges, no notifications, no nudges — nothing engineered to pull you back. Go a month without opening this and nothing here will punish you for it.',
  },
  {
    title: 'Not a leaderboard.',
    body: 'Nothing compares you to anyone. Your gems are countable the way a library is countable, never the way a score is, and they cannot be spent, ranked, or shown off.',
  },
  {
    title: 'Not a coach with a plan for you.',
    body: 'Cosmo will not name your objective, define what success means, or write your quest. Those words stay yours — a quest built in someone else’s language will not hold three weeks later, when you are tired and it is hard.',
  },
  {
    title: 'Not something you are the product of.',
    body: 'The game is free and it stays free. There is never a paywall between a stuck person and the first question.',
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
            { label: 'Xensō', href: '/xenso' },
          ]}
          actions={<AuthButton />}
        />

        {/* The invitation — sized to sit within a single viewport on a laptop. */}
        <section className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-6 py-16">
          <div className="max-w-2xl w-full space-y-10">
            <div className="space-y-6">
              <h1 className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-5xl sm:text-6xl font-bold tracking-tight text-foreground">
                Xensō
                <span className="text-base font-normal tracking-normal text-muted-foreground">
                  by OpenCosmos
                </span>
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

              <div className="pt-2">
                <ReadMore targetId="how-it-goes" />
              </div>
            </div>
          </div>
        </section>

        {/* Orientation. scroll-mt clears the sticky header when Read more lands here. */}
        <section id="how-it-goes" className="px-6 pb-24 scroll-mt-24">
          <div className="max-w-2xl mx-auto space-y-12">
            <Separator />

            <div className="space-y-5">
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
                About Xensō
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

            <div className="space-y-6">
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
                What Xensō is not
              </h2>

              <ul className="space-y-4 list-disc pl-5 marker:text-muted-foreground/50">
                {NOT_THIS.map((item) => (
                  <li key={item.title} className="pl-1">
                    <span className="text-base font-semibold text-foreground">{item.title}</span>{' '}
                    <span className="text-base text-muted-foreground leading-relaxed">
                      {item.body}
                    </span>
                  </li>
                ))}
              </ul>

              <p className="text-base text-muted-foreground leading-relaxed">
                And not every quest is meant to be finished. Letting one go is an honored ending
                here, and it can still leave you with something worth keeping.
              </p>
            </div>

            <Separator />

            {/* The letter that closes CONCEPT.md, in Shalom's words and over his name. */}
            <blockquote className="space-y-3 border-l-2 border-border pl-6">
              <p className="text-base text-foreground leading-relaxed italic">Dear player,</p>
              <p className="text-base text-foreground leading-relaxed italic">
                I may not know you, but I love you. That&rsquo;s why I created this game, to express
                this love in action. How can I love you without knowing you? Let&rsquo;s play and
                find out&hellip;
              </p>
              <footer className="text-sm text-muted-foreground not-italic">&ndash; Shalom</footer>
            </blockquote>

            <Separator />
          </div>
        </section>
      </main>
    </AppShell>
  )
}
