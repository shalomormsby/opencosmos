'use client';

import NextLink from 'next/link';
import { Card, Link, Header, Footer } from '@opencosmos/ui';
import { ecosystemNavigation } from '../lib/navigation';

export default function Home() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      <Header
        logo={
          <NextLink href="/" className="font-header font-bold text-lg text-foreground">
            Shalom Ormsby
          </NextLink>
        }
        navLinks={ecosystemNavigation}
      />
      <div className="flex-grow">
        {/* Hero Section */}
        <section className="pt-32 md:pt-40 pb-16 px-6">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-2">
              Shalom Ormsby
            </h1>
            <p className="text-xl md:text-2xl text-foreground opacity-70 mb-8">
              Product Designer & Creative Technologist
            </p>

            <p className="text-lg text-foreground opacity-80 leading-relaxed mb-4">
              Philosophy is meaningful when embodied.
            </p>
            <Link
              href="https://github.com/shalomormsby/ecosystem/blob/main/DESIGN-PHILOSOPHY.md"
              target="_blank"
              rel="noopener noreferrer"
            >
              → Read my design philosophy
            </Link>
          </div>
        </section>

        {/* Navigation Sections */}
        <section className="pb-20 px-6">
          <div className="max-w-3xl mx-auto space-y-8">
            {/* Work */}
            <Card hoverEffect={false} className="p-8">
              <h2 className="text-2xl font-bold text-foreground mb-6 pb-3 border-b border-foreground/10">
                Work
              </h2>
              <nav className="space-y-3">
                <Link href="/case-studies" className="block">
                  → Portfolio (Case Studies)
                </Link>
                <Link
                  href="/resume.pdf"
                  className="block"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  → Resume (PDF)
                </Link>
              </nav>
            </Card>

            {/* Play */}
            <Card hoverEffect={false} className="p-8">
              <h2 className="text-2xl font-bold text-foreground mb-6 pb-3 border-b border-foreground/10">
                Play
              </h2>
              <nav className="space-y-3">
                <Link
                  href="https://ecosystem-creative-powerup.vercel.app/"
                  className="block"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  → Creative Sandbox
                </Link>
                <Link
                  href="https://shalomormsby.substack.com/"
                  className="block"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  → Love Is the Way
                </Link>
                <Link href="/poetry" className="block">
                  → Poetry
                </Link>
                <Link href="/art-in-space" className="block">
                  → Art in Space
                </Link>
              </nav>
            </Card>

            {/* Tools */}
            <Card hoverEffect={false} className="p-8">
              <h2 className="text-2xl font-bold text-foreground mb-6 pb-3 border-b border-foreground/10">
                Tools
              </h2>
              <nav className="space-y-3">
                <Link
                  href="https://thesage.dev"
                  className="block"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  → Sage Studio
                </Link>
                <Link href="/cosmograph" className="block">
                  → Cosmograph (Explore Everything)
                </Link>
                <Link href="https://stocks.shalomormsby.com/" className="block" target="_blank" rel="noopener noreferrer">
                  → Sage Stocks
                </Link>
                <Link href="/sageos" className="block">
                  → SageOS
                </Link>
              </nav>
            </Card>
          </div>
        </section>
      </div>

      {/* Footer */}
      <Footer
        logo={<NextLink href="/">Shalom Ormsby</NextLink>}
        sections={[
          {
            title: 'Work',
            links: [
              { label: 'Portfolio (Case Studies)', href: '/case-studies' },
              { label: 'Resume', href: '/resume.pdf', external: true },
            ],
          },
          {
            title: 'Play',
            links: [
              { label: 'Creative Sandbox', href: 'https://ecosystem-creative-powerup.vercel.app/', external: true },
              { label: 'Love Is the Way', href: 'https://shalomormsby.substack.com/', external: true },
              { label: 'Poetry', href: '/poetry' },
              { label: 'Art in Space', href: '/art-in-space' },
            ],
          },
          {
            title: 'Tools',
            links: [
              { label: 'Sage Studio', href: 'https://thesage.dev', external: true },
              { label: 'Cosmograph', href: '/cosmograph' },
              { label: 'Sage Stocks', href: 'https://stocks.shalomormsby.com/', external: true },
              { label: 'SageOS', href: '/sageos' },
            ],
          },
        ]}
        socialLinks={{
          github: 'https://github.com/shalomormsby',
          linkedin: 'https://www.linkedin.com/in/shalomormsby',
          email: 'shalom@shalomormsby.com',
        }}
        copyright={`© ${new Date().getFullYear()} Shalom Ormsby`}
      />
    </main>
  );
}
