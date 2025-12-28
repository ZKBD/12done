'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Heart, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PropertyCard } from '@/components/properties/property-card';
import { PropertyGridSkeleton } from '@/components/properties/property-card-skeleton';
import { useFavorites, useFavoriteIds, useToggleFavorite } from '@/hooks/use-favorites';
import { useAuth } from '@/providers';

export default function FavoritesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data, isLoading } = useFavorites();
  const { data: favoriteIds = [] } = useFavoriteIds();
  const toggleFavorite = useToggleFavorite();

  const favorites = useMemo(() => {
    return data?.data || [];
  }, [data]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-16 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect to login if not authenticated (middleware should handle this, but just in case)
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Heart className="w-10 h-10 text-slate-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Sign in to see your favorites</h1>
          <p className="text-muted-foreground mb-6">
            Save properties you love and access them anytime
          </p>
          <Link href="/login?redirect=/favorites">
            <Button size="lg">Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Your Favorites</h1>
          <p className="text-muted-foreground">Loading your saved properties...</p>
        </div>
        <PropertyGridSkeleton count={4} />
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Heart className="w-10 h-10 text-slate-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2">No favorites yet</h1>
          <p className="text-muted-foreground mb-6">
            Start exploring properties and save your favorites to see them here.
          </p>
          <Link href="/properties">
            <Button size="lg">Browse Properties</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Your Favorites</h1>
        <p className="text-muted-foreground">
          {favorites.length} {favorites.length === 1 ? 'property' : 'properties'} saved
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {favorites.map((favorite) => (
          <PropertyCard
            key={favorite.id}
            property={favorite.property}
            isFavorite={favoriteIds.includes(favorite.propertyId)}
            onToggleFavorite={(propertyId) => toggleFavorite.mutate(propertyId)}
          />
        ))}
      </div>
    </div>
  );
}
