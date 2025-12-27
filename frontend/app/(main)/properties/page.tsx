'use client';

import { useState } from 'react';
import { Search, SlidersHorizontal, MapPin, Home, Building2, Landmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

const propertyTypes = [
  { name: 'All', icon: Home, value: 'all' },
  { name: 'House', icon: Home, value: 'house' },
  { name: 'Apartment', icon: Building2, value: 'apartment' },
  { name: 'Villa', icon: Landmark, value: 'villa' },
];

export default function PropertiesPage() {
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Search Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Find your perfect property</h1>
        <p className="text-muted-foreground">
          Browse thousands of properties for sale and rent
        </p>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by location, city, or address..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" className="gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </Button>
        <Button className="gap-2">
          <MapPin className="h-4 w-4" />
          Map View
        </Button>
      </div>

      {/* Property Type Tabs */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {propertyTypes.map((type) => (
          <Button
            key={type.value}
            variant={selectedType === type.value ? 'default' : 'outline'}
            className="gap-2 whitespace-nowrap"
            onClick={() => setSelectedType(type.value)}
          >
            <type.icon className="h-4 w-4" />
            {type.name}
          </Button>
        ))}
      </div>

      {/* Properties Grid - Placeholder */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
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

      {/* Empty State Message */}
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Property listings will appear here once integrated with the backend API.
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Phase 2 will implement the full property browsing experience with real data.
        </p>
      </div>
    </div>
  );
}
