'use client';

import Link from 'next/link';
import { Heart, Bed, Bath, Square, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ImageCarousel } from './image-carousel';
import type { Property, ListingType } from '@/lib/types';

interface PropertyCardProps {
  property: Property;
  isFavorite?: boolean;
  onToggleFavorite?: (propertyId: string) => void;
  className?: string;
}

const listingTypeLabels: Record<ListingType, string> = {
  FOR_SALE: 'For Sale',
  SHORT_TERM_RENT: 'Short-term Rent',
  LONG_TERM_RENT: 'Long-term Rent',
  EVENTS: 'Events',
  BARTER: 'Barter',
};

const listingTypeColors: Record<ListingType, string> = {
  FOR_SALE: 'bg-blue-100 text-blue-800',
  SHORT_TERM_RENT: 'bg-green-100 text-green-800',
  LONG_TERM_RENT: 'bg-purple-100 text-purple-800',
  EVENTS: 'bg-orange-100 text-orange-800',
  BARTER: 'bg-pink-100 text-pink-800',
};

export function PropertyCard({
  property,
  isFavorite = false,
  onToggleFavorite,
  className,
}: PropertyCardProps) {
  const images = property.media
    .filter((m) => m.type === 'photo')
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((m) => ({
      url: m.url,
      alt: m.caption || property.title,
    }));

  // Use placeholder if no images
  const displayImages =
    images.length > 0
      ? images
      : [
          {
            url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
            alt: property.title,
          },
        ];

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleFavorite?.(property.id);
  };

  const formatPrice = (price: string, currency: string) => {
    const num = parseFloat(price);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const primaryListingType = property.listingTypes[0];
  const isRental =
    primaryListingType === 'SHORT_TERM_RENT' ||
    primaryListingType === 'LONG_TERM_RENT';

  return (
    <Link href={`/properties/${property.id}`} className={cn('group', className)}>
      <div className="relative">
        {/* Image Carousel */}
        <ImageCarousel images={displayImages} aspectRatio="wide" />

        {/* Favorite Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 right-3 h-8 w-8 rounded-full bg-white/80 hover:bg-white shadow-md z-10"
          onClick={handleFavoriteClick}
        >
          <Heart
            className={cn(
              'h-4 w-4 transition-colors',
              isFavorite ? 'fill-red-500 text-red-500' : 'text-slate-600'
            )}
          />
        </Button>

        {/* Listing Type Badge */}
        {primaryListingType && (
          <div className="absolute top-3 left-3 z-10">
            <Badge
              className={cn(
                'shadow-sm border-0',
                listingTypeColors[primaryListingType]
              )}
            >
              {listingTypeLabels[primaryListingType]}
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="mt-3 space-y-1">
        {/* Location */}
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          <span className="truncate">
            {property.city}, {property.country}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors line-clamp-1">
          {property.title}
        </h3>

        {/* Features */}
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {property.bedrooms !== undefined && (
            <span className="flex items-center gap-1">
              <Bed className="h-3.5 w-3.5" />
              {property.bedrooms} {property.bedrooms === 1 ? 'bed' : 'beds'}
            </span>
          )}
          {property.bathrooms !== undefined && (
            <span className="flex items-center gap-1">
              <Bath className="h-3.5 w-3.5" />
              {property.bathrooms} {property.bathrooms === 1 ? 'bath' : 'baths'}
            </span>
          )}
          {property.squareMeters !== undefined && (
            <span className="flex items-center gap-1">
              <Square className="h-3.5 w-3.5" />
              {property.squareMeters} m²
            </span>
          )}
        </div>

        {/* Price */}
        <div className="pt-1">
          <span className="font-bold text-lg">
            {formatPrice(property.basePrice, property.currency)}
          </span>
          {isRental && (
            <span className="text-muted-foreground text-sm">
              {primaryListingType === 'SHORT_TERM_RENT' ? ' / night' : ' / month'}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
