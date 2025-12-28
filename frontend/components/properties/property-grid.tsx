'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { PropertyCard } from './property-card';
import { PropertyGridSkeleton } from './property-card-skeleton';
import { Button } from '@/components/ui/button';
import { useFavoriteIds, useToggleFavorite } from '@/hooks/use-favorites';
import type { Property } from '@/lib/types';

interface PropertyGridProps {
  properties: Property[];
  isLoading?: boolean;
  isFetchingNextPage?: boolean;
  hasNextPage?: boolean;
  fetchNextPage?: () => void;
  emptyMessage?: string;
}

export function PropertyGrid({
  properties,
  isLoading = false,
  isFetchingNextPage = false,
  hasNextPage = false,
  fetchNextPage,
  emptyMessage = 'No properties found',
}: PropertyGridProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const { data: favoriteIds = [] } = useFavoriteIds();
  const toggleFavorite = useToggleFavorite();

  // Intersection Observer for infinite scroll
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage?.();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '100px',
      threshold: 0,
    });

    observer.observe(element);
    return () => observer.unobserve(element);
  }, [handleObserver]);

  const handleToggleFavorite = (propertyId: string) => {
    toggleFavorite.mutate(propertyId);
  };

  if (isLoading) {
    return <PropertyGridSkeleton count={8} />;
  }

  if (properties.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground text-lg">{emptyMessage}</p>
        <p className="text-sm text-muted-foreground mt-2">
          Try adjusting your filters or search criteria
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {properties.map((property) => (
          <PropertyCard
            key={property.id}
            property={property}
            isFavorite={favoriteIds.includes(property.id)}
            onToggleFavorite={handleToggleFavorite}
          />
        ))}
      </div>

      {/* Load more trigger */}
      <div ref={loadMoreRef} className="flex justify-center py-4">
        {isFetchingNextPage && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading more properties...</span>
          </div>
        )}
        {hasNextPage && !isFetchingNextPage && (
          <Button variant="outline" onClick={() => fetchNextPage?.()}>
            Load More
          </Button>
        )}
        {!hasNextPage && properties.length > 0 && (
          <p className="text-muted-foreground text-sm">
            You&apos;ve reached the end of the list
          </p>
        )}
      </div>
    </div>
  );
}
