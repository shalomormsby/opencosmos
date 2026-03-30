'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, Badge, Heading, Text, SearchBar, FilterButton, Button } from '@opencosmos/ui';
import { ChevronRight } from 'lucide-react';
import type { Node, Cluster } from '@/lib/content/types';

/**
 * Navigation Fallback (Graph-Off Mode)
 *
 * Now uses design system components for perfect consistency!
 */

interface NavigationFallbackProps {
  nodes: Node[];
  className?: string;
}

const CLUSTER_CONFIG: Record<
  Cluster,
  { title: string; description: string; icon: string }
> = {
  work: {
    title: 'Work',
    description: 'Professional case studies and projects',
    icon: '💼',
  },
  play: {
    title: 'Play',
    description: 'Creative experiments, videos, and personal reflections',
    icon: '🎨',
  },
  philosophy: {
    title: 'Philosophy',
    description: 'Design thinking, principles, and approaches',
    icon: '💭',
  },
  meta: {
    title: 'Meta',
    description: 'About this site and Shalom',
    icon: '🌐',
  },
  connections: {
    title: 'Connections',
    description: 'Links to Creative Powerup and other communities',
    icon: '🔗',
  },
};

export function NavigationFallback({
  nodes,
  className = '',
}: NavigationFallbackProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCluster, setActiveCluster] = useState<Cluster | 'all'>('all');

  const nodesByCluster = useMemo(() => {
    const grouped: Record<Cluster, Node[]> = {
      work: [],
      play: [],
      philosophy: [],
      meta: [],
      connections: [],
    };

    nodes.forEach((node) => {
      if (grouped[node.cluster]) {
        grouped[node.cluster].push(node);
      }
    });

    Object.keys(grouped).forEach((cluster) => {
      grouped[cluster as Cluster].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    });

    return grouped;
  }, [nodes]);

  const filteredNodes = useMemo(() => {
    if (!searchQuery) return nodesByCluster;

    const query = searchQuery.toLowerCase();
    const filtered: Record<Cluster, Node[]> = {
      work: [],
      play: [],
      philosophy: [],
      meta: [],
      connections: [],
    };

    Object.entries(nodesByCluster).forEach(([cluster, clusterNodes]) => {
      filtered[cluster as Cluster] = clusterNodes.filter(
        (node) =>
          node.title.toLowerCase().includes(query) ||
          node.summary?.toLowerCase().includes(query) ||
          node.themes.some((theme) => theme.toLowerCase().includes(query))
      );
    });

    return filtered;
  }, [nodesByCluster, searchQuery]);

  const clustersToShow =
    activeCluster === 'all'
      ? (['work', 'play', 'philosophy', 'meta', 'connections'] as Cluster[])
      : [activeCluster];

  return (
    <div className={className}>
      <header className="mb-8">
        <Heading level={1} className="mb-2">
          Explore Shalom's Digital World
        </Heading>
        <Text size="lg" variant="secondary">
          Navigate through work, creative experiments, philosophy, and more.
        </Text>
      </header>

      <div className="mb-8">
        <label htmlFor="search" className="sr-only">Search content</label>
        <SearchBar
          id="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onClear={() => setSearchQuery('')}
          placeholder="Search by title, theme, or keyword..."
        />
      </div>

      <nav className="flex flex-wrap gap-2 mb-8" aria-label="Filter by category">
        <FilterButton
          active={activeCluster === 'all'}
          onClick={() => setActiveCluster('all')}
        >
          All
        </FilterButton>
        {(Object.keys(CLUSTER_CONFIG) as Cluster[]).map((cluster) => (
          <FilterButton
            key={cluster}
            active={activeCluster === cluster}
            onClick={() => setActiveCluster(cluster)}
          >
            {CLUSTER_CONFIG[cluster].icon} {CLUSTER_CONFIG[cluster].title}
          </FilterButton>
        ))}
      </nav>

      <div className="space-y-8">
        {clustersToShow.map((cluster) => {
          const clusterNodes = filteredNodes[cluster];
          if (clusterNodes.length === 0) return null;
          const config = CLUSTER_CONFIG[cluster];

          return (
            <section key={cluster} id={cluster}>
              <Heading level={2} className="mb-1">
                {config.icon} {config.title}
              </Heading>
              <Text variant="secondary" className="mb-4">
                {config.description}
              </Text>

              <div className="space-y-3">
                {clusterNodes.map((node) => (
                  <Card key={node.id} hoverEffect={true} className="p-4 transition-all hover:shadow-lg">
                    <article>
                      <Link
                        href={`/node/${node.slug}`}
                        className="block group focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 rounded"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <Heading level={3} className="group-hover:text-[var(--color-primary)] transition-colors mb-1">
                              {node.title}
                            </Heading>
                            {node.summary && (
                              <Text variant="secondary" size="sm" className="mb-2">
                                {node.summary}
                              </Text>
                            )}
                            <div className="flex flex-wrap gap-2 items-center">
                              <Text as="time" variant="muted" size="xs">
                                {new Date(node.date).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </Text>
                              {node.themes.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {node.themes.slice(0, 3).map((theme) => (
                                    <Badge key={theme} variant="default" size="sm">
                                      {theme}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-[var(--color-primary)] opacity-50 group-hover:opacity-100 transition-opacity">
                            <ChevronRight className="w-5 h-5" />
                          </div>
                        </div>
                      </Link>
                    </article>
                  </Card>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {searchQuery && Object.values(filteredNodes).every((nodes) => nodes.length === 0) && (
        <div className="text-center py-12">
          <Text size="lg" variant="secondary">
            No content found matching "{searchQuery}"
          </Text>
          <Button
            variant="link"
            onClick={() => setSearchQuery('')}
            className="mt-4"
          >
            Clear search
          </Button>
        </div>
      )}
    </div>
  );
}
