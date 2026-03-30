import { experiments } from '@/lib/experiments';
import { ExperimentCard } from '@/components/ExperimentCard';
import { Button } from '@opencosmos/ui';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="container mx-auto px-6 py-12">
      {/* Hero Section */}
      <div className="max-w-3xl mb-12">
        <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
          Welcome to the Creative Sandbox
        </h2>
        <p className="text-xl text-foreground/70">
          A playground for code, art, and play. Explore experiments created by the Creative Powerup community,
          or create your own.
        </p>
      </div>

      {/* Experiments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {experiments.map((experiment) => (
          <ExperimentCard key={experiment.slug} experiment={experiment} />
        ))}
      </div>

      {/* CTA Section */}
      <div className="mt-16 text-center max-w-2xl mx-auto">
        <div className="p-8 rounded-2xl border border-[var(--color-glass-border)] bg-background-secondary/50">
          <h3 className="text-2xl font-bold text-foreground mb-3">
            Have an idea?
          </h3>
          <p className="text-foreground/70 mb-6">
            The sandbox is open to everyone. Add your experiment, game, visualization, or tool to the collection.
          </p>
          <Button asChild size="lg" className="rounded-lg font-medium">
            <Link href="/contribute">
              <span className="mr-2">+</span>
              <span>Create Your First Experiment</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
