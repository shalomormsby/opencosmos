import { getExperimentsByCategory, categories } from '@/lib/experiments';
import { ExperimentCard } from './ExperimentCard';
import type { ExperimentCategory } from '@/lib/types';
import { Button } from '@opencosmos/ui';
import Link from 'next/link';

interface CategoryPageProps {
  category: ExperimentCategory;
}

export function CategoryPage({ category }: CategoryPageProps) {
  const experiments = getExperimentsByCategory(category);
  const categoryInfo = categories.find((c) => c.slug === category);

  if (!categoryInfo) {
    return <div>Category not found</div>;
  }

  return (
    <div className="container mx-auto px-6 py-12">
      {/* Category Header */}
      <div className="max-w-3xl mb-12">
        <div className="flex items-center gap-4 mb-4">
          <span className="text-5xl">{categoryInfo.icon}</span>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground">
            {categoryInfo.title}
          </h2>
        </div>
        <p className="text-xl text-foreground/70">{categoryInfo.description}</p>
      </div>

      {/* Experiments Grid */}
      {experiments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {experiments.map((experiment) => (
            <ExperimentCard key={experiment.slug} experiment={experiment} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-foreground/50 mb-6">
            No {category} yet. Be the first to create one!
          </p>
          <Button asChild size="lg" className="rounded-lg font-medium">
            <Link href="/contribute">
              <span className="mr-2">+</span>
              <span>Create New</span>
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
