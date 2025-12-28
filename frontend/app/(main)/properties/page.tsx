'use client';

import { useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PropertyGrid, PropertyFilters } from '@/components/properties';
import { useProperties } from '@/hooks/use-properties';
import type { PropertyFilters as Filters } from '@/lib/types';
import Link from 'next/link';

export default function PropertiesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');

  // Parse filters from URL
  const filters = useMemo<Filters>(() => {
    const params: Filters = {
      page: 1,
      limit: 20,
    };

    const search = searchParams.get('search');
    if (search) params.search = search;

    const city = searchParams.get('city');
    if (city) params.city = city;

    const country = searchParams.get('country');
    if (country) params.country = country;

    const listingTypes = searchParams.getAll('listingTypes');
    if (listingTypes.length > 0) params.listingTypes = listingTypes as Filters['listingTypes'];

    const minPrice = searchParams.get('minPrice');
    if (minPrice) params.minPrice = Number(minPrice);

    const maxPrice = searchParams.get('maxPrice');
    if (maxPrice) params.maxPrice = Number(maxPrice);

    const minBedrooms = searchParams.get('minBedrooms');
    if (minBedrooms) params.minBedrooms = Number(minBedrooms);

    const minBathrooms = searchParams.get('minBathrooms');
    if (minBathrooms) params.minBathrooms = Number(minBathrooms);

    const minSquareMeters = searchParams.get('minSquareMeters');
    if (minSquareMeters) params.minSquareMeters = Number(minSquareMeters);

    const maxSquareMeters = searchParams.get('maxSquareMeters');
    if (maxSquareMeters) params.maxSquareMeters = Number(maxSquareMeters);

    const petFriendly = searchParams.get('petFriendly');
    if (petFriendly === 'true') params.petFriendly = true;

    const sortBy = searchParams.get('sortBy');
    if (sortBy) params.sortBy = sortBy;

    const sortOrder = searchParams.get('sortOrder');
    if (sortOrder) params.sortOrder = sortOrder as 'asc' | 'desc';

    return params;
  }, [searchParams]);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useProperties(filters);

  // Flatten paginated data
  const properties = useMemo(() => {
    return data?.pages.flatMap((page) => page.data) || [];
  }, [data]);

  const totalCount = data?.pages[0]?.meta.total || 0;

  // Update URL with new filters
  const handleFiltersChange = (newFilters: Filters) => {
    const params = new URLSearchParams();

    Object.entries(newFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && key !== 'page' && key !== 'limit') {
        if (Array.isArray(value)) {
          value.forEach((v) => params.append(key, String(v)));
        } else {
          params.set(key, String(value));
        }
      }
    });

    router.push(`/properties?${params.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    handleFiltersChange({ ...filters, search: searchQuery || undefined });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Find your perfect property</h1>
        <p className="text-muted-foreground">
          {totalCount > 0
            ? `${totalCount.toLocaleString()} properties available`
            : 'Browse thousands of properties for sale and rent'}
        </p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by location, city, or address..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button type="submit">Search</Button>
        <Link href="/properties/map">
          <Button variant="outline" className="gap-2 w-full sm:w-auto">
            <MapPin className="h-4 w-4" />
            Map View
          </Button>
        </Link>
      </form>

      {/* Filters */}
      <div className="mb-8">
        <PropertyFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />
      </div>

      {/* Property Grid */}
      <PropertyGrid
        properties={properties}
        isLoading={isLoading}
        isFetchingNextPage={isFetchingNextPage}
        hasNextPage={hasNextPage}
        fetchNextPage={fetchNextPage}
        emptyMessage="No properties match your criteria"
      />
    </div>
  );
}
