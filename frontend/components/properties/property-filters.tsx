'use client';

import { useState } from 'react';
import { X, SlidersHorizontal, Home, Building2, Landmark, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import type { PropertyFilters, ListingType } from '@/lib/types';

interface PropertyFiltersProps {
  filters: PropertyFilters;
  onFiltersChange: (filters: PropertyFilters) => void;
  className?: string;
}

const listingTypes: { value: ListingType; label: string; icon: typeof Home }[] = [
  { value: 'FOR_SALE', label: 'For Sale', icon: Home },
  { value: 'LONG_TERM_RENT', label: 'Long-term Rent', icon: Building2 },
  { value: 'SHORT_TERM_RENT', label: 'Short-term Rent', icon: Landmark },
];

const bedroomOptions = [
  { value: 'any', label: 'Any' },
  { value: '1', label: '1+' },
  { value: '2', label: '2+' },
  { value: '3', label: '3+' },
  { value: '4', label: '4+' },
  { value: '5', label: '5+' },
];

const bathroomOptions = [
  { value: 'any', label: 'Any' },
  { value: '1', label: '1+' },
  { value: '2', label: '2+' },
  { value: '3', label: '3+' },
];

const sortOptions = [
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'createdAt:asc', label: 'Oldest first' },
  { value: 'basePrice:asc', label: 'Price: Low to High' },
  { value: 'basePrice:desc', label: 'Price: High to Low' },
  { value: 'squareMeters:desc', label: 'Size: Large to Small' },
  { value: 'squareMeters:asc', label: 'Size: Small to Large' },
];

export function PropertyFilters({
  filters,
  onFiltersChange,
  className,
}: PropertyFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<PropertyFilters>(filters);

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'page' || key === 'limit') return false;
    if (value === undefined || value === null || value === '') return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  }).length;

  const handleLocalFilterChange = (key: keyof PropertyFilters, value: unknown) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
    setIsOpen(false);
  };

  const handleReset = () => {
    const resetFilters: PropertyFilters = { page: 1, limit: 20 };
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
    setIsOpen(false);
  };

  const toggleListingType = (type: ListingType) => {
    const current = localFilters.listingTypes || [];
    const updated = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    handleLocalFilterChange('listingTypes', updated.length > 0 ? updated : undefined);
  };

  const handleSortChange = (value: string) => {
    const [sortBy, sortOrder] = value.split(':');
    onFiltersChange({
      ...filters,
      sortBy,
      sortOrder: sortOrder as 'asc' | 'desc',
    });
  };

  const currentSort = filters.sortBy && filters.sortOrder
    ? `${filters.sortBy}:${filters.sortOrder}`
    : 'createdAt:desc';

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Quick listing type filters */}
      <div className="hidden md:flex items-center gap-2">
        {listingTypes.map((type) => {
          const isActive = filters.listingTypes?.includes(type.value);
          return (
            <Button
              key={type.value}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              className="gap-2"
              onClick={() => {
                const current = filters.listingTypes || [];
                const updated = current.includes(type.value)
                  ? current.filter((t) => t !== type.value)
                  : [...current, type.value];
                onFiltersChange({
                  ...filters,
                  listingTypes: updated.length > 0 ? updated : undefined,
                });
              }}
            >
              <type.icon className="h-4 w-4" />
              {type.label}
            </Button>
          );
        })}
      </div>

      {/* Sort dropdown */}
      <Select value={currentSort} onValueChange={handleSortChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          {sortOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* All Filters button */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" className="gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>

          <div className="py-6 space-y-6">
            {/* Listing Type */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Listing Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {listingTypes.map((type) => {
                  const isActive = localFilters.listingTypes?.includes(type.value);
                  return (
                    <Button
                      key={type.value}
                      variant={isActive ? 'default' : 'outline'}
                      className="justify-start gap-2"
                      onClick={() => toggleListingType(type.value)}
                    >
                      <type.icon className="h-4 w-4" />
                      {type.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Price Range */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Price Range</Label>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={localFilters.minPrice || ''}
                    onChange={(e) =>
                      handleLocalFilterChange(
                        'minPrice',
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                  />
                </div>
                <span className="text-muted-foreground">-</span>
                <div className="flex-1">
                  <Input
                    type="number"
                    placeholder="Max"
                    value={localFilters.maxPrice || ''}
                    onChange={(e) =>
                      handleLocalFilterChange(
                        'maxPrice',
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                  />
                </div>
              </div>
            </div>

            {/* Bedrooms */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Bedrooms</Label>
              <div className="flex flex-wrap gap-2">
                {bedroomOptions.map((option) => {
                  const isActive =
                    option.value === 'any'
                      ? !localFilters.minBedrooms
                      : localFilters.minBedrooms === Number(option.value);
                  return (
                    <Button
                      key={option.value}
                      variant={isActive ? 'default' : 'outline'}
                      size="sm"
                      onClick={() =>
                        handleLocalFilterChange(
                          'minBedrooms',
                          option.value === 'any' ? undefined : Number(option.value)
                        )
                      }
                    >
                      {option.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Bathrooms */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Bathrooms</Label>
              <div className="flex flex-wrap gap-2">
                {bathroomOptions.map((option) => {
                  const isActive =
                    option.value === 'any'
                      ? !localFilters.minBathrooms
                      : localFilters.minBathrooms === Number(option.value);
                  return (
                    <Button
                      key={option.value}
                      variant={isActive ? 'default' : 'outline'}
                      size="sm"
                      onClick={() =>
                        handleLocalFilterChange(
                          'minBathrooms',
                          option.value === 'any' ? undefined : Number(option.value)
                        )
                      }
                    >
                      {option.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Size Range */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Size (m²)</Label>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={localFilters.minSquareMeters || ''}
                    onChange={(e) =>
                      handleLocalFilterChange(
                        'minSquareMeters',
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                  />
                </div>
                <span className="text-muted-foreground">-</span>
                <div className="flex-1">
                  <Input
                    type="number"
                    placeholder="Max"
                    value={localFilters.maxSquareMeters || ''}
                    onChange={(e) =>
                      handleLocalFilterChange(
                        'maxSquareMeters',
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                  />
                </div>
              </div>
            </div>

            {/* Additional filters */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Additional</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="petFriendly"
                    checked={localFilters.petFriendly || false}
                    onCheckedChange={(checked) =>
                      handleLocalFilterChange(
                        'petFriendly',
                        checked ? true : undefined
                      )
                    }
                  />
                  <label
                    htmlFor="petFriendly"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Pet friendly
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="openHouse"
                    checked={localFilters.hasUpcomingOpenHouse || false}
                    onCheckedChange={(checked) =>
                      handleLocalFilterChange(
                        'hasUpcomingOpenHouse',
                        checked ? true : undefined
                      )
                    }
                  />
                  <label
                    htmlFor="openHouse"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Has upcoming open house
                  </label>
                </div>
              </div>
            </div>
          </div>

          <SheetFooter className="flex-row gap-3">
            <Button variant="outline" className="flex-1" onClick={handleReset}>
              Reset
            </Button>
            <Button className="flex-1" onClick={handleApply}>
              Show Results
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
