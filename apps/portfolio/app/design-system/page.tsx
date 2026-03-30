'use client';

import Link from 'next/link';
import { Card, Button, Breadcrumbs } from '@opencosmos/ui';

export default function DesignSystemPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-20">
        {/* Header */}
        <div className="mb-16">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Design System' }
            ]}
            className="mb-8"
          />
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Design System
          </h1>
          <p className="text-xl text-foreground opacity-70">
            The heart of the ecosystem. A human-centered design system that embodies
            philosophy through code.
          </p>
        </div>

        {/* Overview */}
        <section className="mb-16">
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              What Makes It Different
            </h2>
            <div className="space-y-4 text-foreground opacity-80">
              <p>
                This isn't just a component library. It's a complete expression of
                human-centered design principles, built to make products lovable by design.
              </p>
              <ul className="space-y-2 list-disc list-inside">
                <li>Three distinct themes (Studio, Sage, Volt) with unique personalities</li>
                <li>User-controlled motion system (0-10 scale, respects prefers-reduced-motion)</li>
                <li>Built-in Customizer for runtime theme/motion adjustments</li>
                <li>WCAG AA accessible by default</li>
                <li>Design tokens exposed as importable JavaScript</li>
              </ul>
            </div>
          </Card>
        </section>

        {/* Key Features */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-8">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-xl font-bold text-foreground mb-3">
                The Customizer
              </h3>
              <p className="text-foreground opacity-70 mb-4">
                User control made tangible. Adjust motion intensity, choose themes, and
                customize your experience in real-time.
              </p>
              <p className="text-sm text-foreground opacity-50 italic">
                Embodies: User Control & Freedom
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="text-xl font-bold text-foreground mb-3">
                Design Tokens
              </h3>
              <p className="text-foreground opacity-70 mb-4">
                Visual properties defined in code, not locked in Figma. Colors, spacing,
                typography—all exposed and inspectable.
              </p>
              <p className="text-sm text-foreground opacity-50 italic">
                Embodies: Transparent by Design
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="text-xl font-bold text-foreground mb-3">
                Motion System
              </h3>
              <p className="text-foreground opacity-70 mb-4">
                Every animation respects user preferences. Motion = 0 means instant
                transitions. No exceptions.
              </p>
              <p className="text-sm text-foreground opacity-50 italic">
                Embodies: Generous by Design
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="text-xl font-bold text-foreground mb-3">
                Open Source
              </h3>
              <p className="text-foreground opacity-70 mb-4">
                MIT licensed. Learn from the code, fork it, build with it. Teaching
                at scale through working examples.
              </p>
              <p className="text-sm text-foreground opacity-50 italic">
                Embodies: Generous by Design
              </p>
            </Card>
          </div>
        </section>

        {/* Tech Stack */}
        <section className="mb-16">
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              Tech Stack
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-foreground opacity-80">
              <div>
                <p className="font-semibold mb-1">Framework</p>
                <p className="text-sm opacity-70">React 18/19</p>
              </div>
              <div>
                <p className="font-semibold mb-1">Language</p>
                <p className="text-sm opacity-70">TypeScript 5</p>
              </div>
              <div>
                <p className="font-semibold mb-1">Styling</p>
                <p className="text-sm opacity-70">Tailwind CSS 3</p>
              </div>
              <div>
                <p className="font-semibold mb-1">Animation</p>
                <p className="text-sm opacity-70">Framer Motion 12</p>
              </div>
              <div>
                <p className="font-semibold mb-1">State</p>
                <p className="text-sm opacity-70">Zustand 5</p>
              </div>
              <div>
                <p className="font-semibold mb-1">Monorepo</p>
                <p className="text-sm opacity-70">Turborepo + pnpm</p>
              </div>
            </div>
          </Card>
        </section>

        {/* CTA */}
        <section>
          <Card className="p-8 bg-primary/5 border-primary/20">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Explore the Code
            </h2>
            <p className="text-foreground opacity-80 mb-6">
              The entire design system is open source and available on GitHub.
              Read the code, learn from the patterns, and build something lovable.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="https://github.com/shalomormsby/ecosystem/tree/main/design-system"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity font-medium"
              >
                View on GitHub →
              </a>
              <Link
                href="/"
                className="inline-flex items-center justify-center px-6 py-3 border border-foreground/20 text-foreground rounded-lg hover:border-foreground/40 transition-colors font-medium"
              >
                Back to Home
              </Link>
            </div>
          </Card>
        </section>
      </div>
    </main>
  );
}
