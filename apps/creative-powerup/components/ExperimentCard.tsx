'use client';

import Link from 'next/link';
import type { Experiment } from '@/lib/types';
import { Card } from '@opencosmos/ui';

interface ExperimentCardProps {
  experiment: Experiment;
}

export function ExperimentCard({ experiment }: ExperimentCardProps) {
  const categoryColors: Record<string, string> = {
    games: 'text-blue-500',
    visualizations: 'text-purple-500',
    animations: 'text-pink-500',
    tools: 'text-green-500',
  };

  const categoryColor = categoryColors[experiment.category] || 'text-foreground';

  return (
    <Link href={experiment.path} className="block group">
      <Card className="h-full flex flex-col p-6 hover:border-primary/50 transition-all duration-200 group-hover:translate-y-[-4px]">
        {/* Thumbnail placeholder */}
        <div className="w-full aspect-video bg-background-secondary rounded-lg mb-4 flex items-center justify-center border border-[var(--color-glass-border)]">
          <span className="text-4xl opacity-60">
            {experiment.category === 'games' && '🎮'}
            {experiment.category === 'visualizations' && '🌀'}
            {experiment.category === 'animations' && '✨'}
            {experiment.category === 'tools' && '🔧'}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
              {experiment.title}
            </h3>
            <span className={`text-xs font-medium uppercase tracking-wider ${categoryColor}`}>
              {experiment.category}
            </span>
          </div>

          <p className="text-sm text-foreground/70 mb-4 flex-1">
            {experiment.description}
          </p>

          {/* Metadata */}
          <div className="flex items-center justify-between text-xs text-foreground/50">
            <span>by {experiment.author}</span>
            {experiment.tags && experiment.tags.length > 0 && (
              <div className="flex gap-1">
                {experiment.tags.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 rounded bg-background-secondary border border-[var(--color-glass-border)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
