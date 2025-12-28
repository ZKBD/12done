'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Map, List, Search, SlidersHorizontal, MapPin, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { PropertyCard } from '@/components/properties/property-card';
import { PropertyCardSkeleton } from '@/components/properties/property-card-skeleton';
import { useProperties } from '@/hooks/use-properties';
import { useFavoriteIds, useToggleFavorite } from '@/hooks/use-favorites';
import type { PropertyFilters, Property } from '@/lib/types';

export default function MapSearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [showList, setShowList] = useState(true);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  // Parse filters from URL
  const filters = useMemo<PropertyFilters>(() => {
    const params: PropertyFilters = {
      page: 1,
      limit: 50, // Load more for map view
    };

    const search = searchParams.get('search');
    if (search) params.search = search;

    const city = searchParams.get('city');
    if (city) params.city = city;

    const listingTypes = searchParams.getAll('listingTypes');
    if (listingTypes.length > 0) params.listingTypes = listingTypes as PropertyFilters['listingTypes'];

    const minPrice = searchParams.get('minPrice');
    if (minPrice) params.minPrice = Number(minPrice);

    const maxPrice = searchParams.get('maxPrice');
    if (maxPrice) params.maxPrice = Number(maxPrice);

    const minBedrooms = searchParams.get('minBedrooms');
    if (minBedrooms) params.minBedrooms = Number(minBedrooms);

    return params;
  }, [searchParams]);

  const { data, isLoading } = useProperties(filters);
  const { data: favoriteIds = [] } = useFavoriteIds();
  const toggleFavorite = useToggleFavorite();

  const properties = useMemo(() => {
    return data?.pages.flatMap((page) => page.data) || [];
  }, [data]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (searchQuery) {
      params.set('search', searchQuery);
    } else {
      params.delete('search');
    }
    router.push(`/properties/map?${params.toString()}`);
  };

  const handlePropertyHover = useCallback((propertyId: string | null) => {
    setSelectedPropertyId(propertyId);
  }, []);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Top Bar */}
      <div className="border-b bg-background p-4">
        <div className="container mx-auto flex flex-col sm:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search location..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button type="submit">Search</Button>
          </form>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </Button>
            <Link href="/properties">
              <Button variant="outline" className="gap-2">
                <List className="h-4 w-4" />
                List View
              </Button>
            </Link>
            <Button
              variant={showList ? 'default' : 'outline'}
              className="gap-2 md:hidden"
              onClick={() => setShowList(!showList)}
            >
              {showList ? <Map className="h-4 w-4" /> : <List className="h-4 w-4" />}
              {showList ? 'Map' : 'List'}
            </Button>
          </div>
        </div>
      </div>

      {/* Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Property List Sidebar */}
        <div
          className={`w-full md:w-[400px] lg:w-[500px] border-r overflow-y-auto bg-background ${
            showList ? 'block' : 'hidden md:block'
          }`}
        >
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">
                {isLoading
                  ? 'Loading...'
                  : `${properties.length} properties in this area`}
              </h2>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <PropertyCardSkeleton key={i} />
                ))}
              </div>
            ) : properties.length === 0 ? (
              <div className="py-12 text-center">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No properties found in this area
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Try adjusting your search or filters
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {properties.map((property) => (
                  <div
                    key={property.id}
                    onMouseEnter={() => handlePropertyHover(property.id)}
                    onMouseLeave={() => handlePropertyHover(null)}
                    className={`transition-all ${
                      selectedPropertyId === property.id
                        ? 'ring-2 ring-primary rounded-xl'
                        : ''
                    }`}
                  >
                    <PropertyCard
                      property={property}
                      isFavorite={favoriteIds.includes(property.id)}
                      onToggleFavorite={(id) => toggleFavorite.mutate(id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Map Area */}
        <div
          className={`flex-1 bg-slate-100 ${
            !showList ? 'block' : 'hidden md:block'
          }`}
        >
          {/* Placeholder for Google Maps */}
          <div className="h-full flex items-center justify-center">
            <Card className="max-w-md mx-4">
              <CardContent className="pt-6 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Map className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Map Integration</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  To enable the map view, configure your Google Maps API key in the environment variables:
                </p>
                <code className="block bg-slate-100 dark:bg-slate-800 p-2 rounded text-xs mb-4">
                  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key
                </code>
                <p className="text-xs text-muted-foreground">
                  The map will display property markers and allow interactive searching by area.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Property markers would be rendered here */}
          {properties
            .filter((p) => p.latitude && p.longitude)
            .map((property) => (
              <PropertyMarker
                key={property.id}
                property={property}
                isSelected={selectedPropertyId === property.id}
                onSelect={() => setSelectedPropertyId(property.id)}
              />
            ))}
        </div>
      </div>
    </div>
  );
}

// Placeholder marker component - will be replaced with actual map markers
function PropertyMarker({
  property,
  isSelected,
  onSelect,
}: {
  property: Property;
  isSelected: boolean;
  onSelect: () => void;
}) {
  // This is a placeholder - actual implementation will use Google Maps markers
  return null;
}
