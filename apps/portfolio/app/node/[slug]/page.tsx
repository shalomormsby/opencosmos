import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAllNodes, getNodeById, getConnectedNodes } from '@/lib/content/parser';
import { Card, Breadcrumbs, Badge } from '@opencosmos/ui';
import type { Metadata } from 'next';

/**
 * Individual Node Page
 *
 * Displays full content for a single node with:
 * - Breadcrumb navigation
 * - Full markdown content
 * - Related/connected nodes
 * - Theme tags
 * - Back to Cosmograph link
 */

interface NodePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: NodePageProps): Promise<Metadata> {
  const { slug } = await params;
  const nodes = getAllNodes();
  const node = nodes.find((n) => n.slug === slug);

  if (!node) {
    return {
      title: 'Not Found',
    };
  }

  return {
    title: node.title,
    description: node.summary || `Explore ${node.title} in Shalom's Cosmograph`,
  };
}

export async function generateStaticParams() {
  const nodes = getAllNodes();
  return nodes.map((node) => ({
    slug: node.slug,
  }));
}

export default async function NodePage({ params }: NodePageProps) {
  const { slug } = await params;
  const nodes = getAllNodes();
  const node = nodes.find((n) => n.slug === slug);

  if (!node) {
    notFound();
  }

  // Get connected nodes
  const connectedNodes = getConnectedNodes(node.id);

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        {/* Breadcrumb */}
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Cosmograph', href: '/cosmograph' },
            { label: node.cluster, href: `/cosmograph#${node.cluster}` },
            { label: node.title }
          ]}
          className="mb-6"
        />

        {/* Node Content */}
        <article>
          {/* Header */}
          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              {node.title}
            </h1>

            {/* Metadata */}
            <div className="flex flex-wrap gap-4 items-center text-sm text-foreground opacity-60 mb-4">
              <time dateTime={node.date}>
                {new Date(node.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
              {node.readingTime && (
                <>
                  <span aria-hidden="true">•</span>
                  <span>{node.readingTime} min read</span>
                </>
              )}
              {node.platform && (
                <>
                  <span aria-hidden="true">•</span>
                  <span className="capitalize">{node.platform}</span>
                </>
              )}
            </div>

            {/* Themes */}
            {node.themes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {node.themes.map((theme) => (
                  <Badge key={theme} variant="default" size="md">
                    {theme}
                  </Badge>
                ))}
              </div>
            )}
          </header>

          {/* Summary */}
          {node.summary && (
            <div className="text-lg text-foreground opacity-80 mb-8 p-4 border-l-4 border-primary bg-foreground/5 rounded">
              {node.summary}
            </div>
          )}

          {/* Main Content */}
          <div
            className="prose prose-lg max-w-none
              prose-headings:text-foreground prose-headings:font-bold
              prose-h1:text-4xl prose-h1:mb-6 prose-h1:mt-8
              prose-h2:text-3xl prose-h2:mb-4 prose-h2:mt-8
              prose-h3:text-2xl prose-h3:mb-3 prose-h3:mt-6
              prose-h4:text-xl prose-h4:mb-2 prose-h4:mt-4
              prose-p:text-foreground prose-p:opacity-90 prose-p:leading-relaxed
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline
              prose-strong:text-foreground prose-strong:font-semibold
              prose-code:text-foreground prose-code:bg-foreground/10 prose-code:px-1 prose-code:rounded
              prose-pre:bg-foreground/5 prose-pre:border prose-pre:border-foreground/10
              prose-ul:text-foreground prose-ul:opacity-90
              prose-ol:text-foreground prose-ol:opacity-90
              prose-li:text-foreground prose-li:opacity-90 prose-li:my-1
              prose-blockquote:text-foreground prose-blockquote:opacity-80 prose-blockquote:border-primary"
            dangerouslySetInnerHTML={{ __html: node.content }}
          />

          {/* External Link */}
          {node.url && (
            <div className="mt-8">
              <a
                href={node.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                View original on {node.platform}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 8.66667V12.6667C12 13.0203 11.8595 13.3594 11.6095 13.6095C11.3594 13.8595 11.0203 14 10.6667 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V5.33333C2 4.97971 2.14048 4.64057 2.39052 4.39052C2.64057 4.14048 2.97971 4 3.33333 4H7.33333M10 2H14M14 2V6M14 2L6.66667 9.33333"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
            </div>
          )}
        </article>

        {/* Connected Nodes */}
        {connectedNodes.length > 0 && (
          <aside className="mt-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Related Content
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {connectedNodes.map((connectedNode) => (
                <Card key={connectedNode.id} hoverEffect={true} className="p-4">
                  <Link
                    href={`/node/${connectedNode.slug}`}
                    className="block group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
                  >
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors mb-1">
                      {connectedNode.title}
                    </h3>
                    {connectedNode.summary && (
                      <p className="text-sm text-foreground opacity-70">
                        {connectedNode.summary}
                      </p>
                    )}
                  </Link>
                </Card>
              ))}
            </div>
          </aside>
        )}

        {/* Back to Cosmograph */}
        <div className="mt-12 pt-8 border-t border-foreground/10">
          <Link
            href="/cosmograph"
            className="inline-flex items-center gap-2 text-foreground opacity-60 hover:text-primary hover:opacity-100 transition-all"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12.5 15L7.5 10L12.5 5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Back to Cosmograph
          </Link>
        </div>
      </div>
    </main>
  );
}
