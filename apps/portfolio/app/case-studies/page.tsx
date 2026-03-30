'use client';

import NextLink from 'next/link';
import { Header, Footer, Card, Link, Breadcrumbs } from '@opencosmos/ui';
import { ecosystemNavigation } from '@/lib/navigation';

export default function CaseStudiesPage() {
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
        {/* Breadcrumbs */}
        <div className="pt-24 px-6">
          <div className="max-w-3xl mx-auto">
            <Breadcrumbs
              items={[
                { label: 'Home', href: '/' },
                { label: 'Case Studies' }
              ]}
            />
          </div>
        </div>

        {/* Hero Section */}
        <section className="pt-8 md:pt-12 pb-16 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Case Studies
            </h1>
            <p className="text-xl text-foreground opacity-70">
              Portfolio of Product Design & Creative Technology Work
            </p>
          </div>
        </section>

        {/* Coming Soon Section */}
        <section className="pb-20 px-6">
          <div className="max-w-3xl mx-auto">
            <Card hoverEffect={false} className="p-12 text-center">
              <div className="space-y-4">
                <div className="text-6xl mb-6">🚧</div>
                <h2 className="text-2xl font-bold text-foreground mb-4">
                  Coming Soon
                </h2>
                <p className="text-lg text-foreground opacity-80">
                  Detailed case studies showcasing product design process, research, and outcomes are currently being prepared.
                </p>
                <p className="text-base text-foreground opacity-60 pt-4">
                  In the meantime, feel free to explore the{' '}
                  <Link variant="inline" href="/cosmograph">
                    Cosmograph
                  </Link>
                  {' '}or{' '}
                  <Link variant="inline" href="https://thesage.dev">
                    Sage Studio
                  </Link>
                  .
                </p>
              </div>
            </Card>
          </div>
        </section>
      </div>

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
