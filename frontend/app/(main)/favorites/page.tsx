'use client';

import { Heart } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function FavoritesPage() {
  // This will be populated from the API in Phase 2
  const favorites: unknown[] = [];

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
          Properties you&apos;ve saved for later
        </p>
      </div>

      {/* Favorites Grid - Placeholder */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="aspect-[4/3] bg-slate-200 animate-pulse" />
            <CardContent className="p-4">
              <div className="h-4 w-3/4 bg-slate-200 rounded animate-pulse mb-2" />
              <div className="h-3 w-1/2 bg-slate-200 rounded animate-pulse mb-4" />
              <div className="flex justify-between items-center">
                <div className="h-5 w-24 bg-slate-200 rounded animate-pulse" />
                <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
