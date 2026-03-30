'use client';

import NextLink from 'next/link';
import { PageTemplate, Footer, Brand } from '@opencosmos/ui';
import { ecosystemNavigation } from '@/lib/navigation';
import { NavigationFallback } from '@/components/cosmograph/NavigationFallback';
import type { Node } from '@/lib/content/types';

interface CosmographClientProps {
  nodes: Node[];
}

export function CosmographClient({ nodes }: CosmographClientProps) {
  return (
    <PageTemplate
      header={{
        logo: (
          <Brand>
            <NextLink href="/" className="font-header">
              Shalom Ormsby
            </NextLink>
          </Brand>
        ),
        navLinks: ecosystemNavigation,
        sticky: true,
      }}
      title="Cosmograph"
      subtitle="Interactive network visualization exploring connections between thoughts, projects, and ideas"
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Cosmograph' },
      ]}
      showCustomizer={false}
      variant="wide"
      footer={
        <Footer
          logo={
            <Brand>
              <NextLink href="/" className="font-header">
                Shalom Ormsby
              </NextLink>
            </Brand>
          }
          sections={[
            {
              title: 'Work',
              links: [
                { label: 'Portfolio', href: '/case-studies' },
                { label: 'Resume', href: '/resume.pdf' },
              ],
            },
            {
              title: 'Play',
              links: [
                { label: 'Creative Sandbox', href: 'https://ecosystem-creative-powerup.vercel.app/', external: true },
                { label: 'Love Is the Way', href: 'https://shalomormsby.substack.com/', external: true },
                { label: 'Poetry', href: '/poetry' },
              ],
            },
            {
              title: 'Tools',
              links: [
                { label: 'Sage Studio', href: 'https://thesage.dev', external: true },
                { label: 'Cosmograph', href: '/cosmograph' },
                { label: 'Sage Stocks', href: '/sage-stocks' },
              ],
            },
          ]}
          socialLinks={{
            github: 'https://github.com/shalomormsby',
            linkedin: 'https://linkedin.com/in/shalomormsby',
            email: 'hello@shalomormsby.com',
          }}
          copyright="© 2026 Shalom Ormsby. Designed with intention and care."
        />
      }
    >
      <NavigationFallback nodes={nodes} />
    </PageTemplate>
  );
}
