'use client';

import { Check, MapPin, Bed, Bath, Square, Building2, Calendar, PawPrint, UserX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { PropertyFormData } from '../property-wizard';
import type { ListingType } from '@/lib/types';

interface ReviewStepProps {
  data: PropertyFormData;
}

const listingTypeLabels: Record<ListingType, string> = {
  FOR_SALE: 'For Sale',
  SHORT_TERM_RENT: 'Short-term Rent',
  LONG_TERM_RENT: 'Long-term Rent',
  EVENTS: 'Events',
  BARTER: 'Barter',
};

export function ReviewStep({ data }: ReviewStepProps) {
  const isRental =
    data.listingTypes.includes('SHORT_TERM_RENT') ||
    data.listingTypes.includes('LONG_TERM_RENT');
  const isShortTerm = data.listingTypes.includes('SHORT_TERM_RENT');

  const formatPrice = () => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: data.currency,
      maximumFractionDigits: 0,
    }).format(data.basePrice);
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-green-50 border border-green-100 rounded-lg">
        <div className="flex items-center gap-2 text-green-700">
          <Check className="h-5 w-5" />
          <span className="font-medium">Almost there!</span>
        </div>
        <p className="text-sm text-green-600 mt-1">
          Review your listing details below. You can add photos and set up
          availability after creating the listing.
        </p>
      </div>

      {/* Basic Info */}
      <div className="space-y-3">
        <h3 className="font-medium text-muted-foreground uppercase text-xs tracking-wide">
          Basic Information
        </h3>
        <div className="p-4 border rounded-lg space-y-3">
          <div>
            <h4 className="font-semibold text-lg">{data.title}</h4>
            <div className="flex flex-wrap gap-2 mt-2">
              {data.listingTypes.map((type) => (
                <Badge key={type} variant="secondary">
                  {listingTypeLabels[type]}
                </Badge>
              ))}
            </div>
          </div>
          {data.description && (
            <>
              <Separator />
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {data.description}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Location */}
      <div className="space-y-3">
        <h3 className="font-medium text-muted-foreground uppercase text-xs tracking-wide">
          Location
        </h3>
        <div className="p-4 border rounded-lg">
          <div className="flex items-start gap-2">
            <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">{data.address}</p>
              <p className="text-sm text-muted-foreground">
                {data.city}, {data.postalCode}
              </p>
              <p className="text-sm text-muted-foreground">{data.country}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-3">
        <h3 className="font-medium text-muted-foreground uppercase text-xs tracking-wide">
          Property Details
        </h3>
        <div className="p-4 border rounded-lg">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {data.bedrooms !== undefined && (
              <div className="flex items-center gap-2">
                <Bed className="h-4 w-4 text-muted-foreground" />
                <span>
                  {data.bedrooms} {data.bedrooms === 1 ? 'bedroom' : 'bedrooms'}
                </span>
              </div>
            )}
            {data.bathrooms !== undefined && (
              <div className="flex items-center gap-2">
                <Bath className="h-4 w-4 text-muted-foreground" />
                <span>
                  {data.bathrooms}{' '}
                  {data.bathrooms === 1 ? 'bathroom' : 'bathrooms'}
                </span>
              </div>
            )}
            {data.squareMeters !== undefined && (
              <div className="flex items-center gap-2">
                <Square className="h-4 w-4 text-muted-foreground" />
                <span>{data.squareMeters} m²</span>
              </div>
            )}
            {data.floors !== undefined && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>
                  {data.floors} {data.floors === 1 ? 'floor' : 'floors'}
                </span>
              </div>
            )}
            {data.yearBuilt !== undefined && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Built {data.yearBuilt}</span>
              </div>
            )}
          </div>

          {(data.petFriendly || data.noAgents) && (
            <>
              <Separator className="my-4" />
              <div className="flex flex-wrap gap-3">
                {data.petFriendly && (
                  <div className="flex items-center gap-2 text-sm">
                    <PawPrint className="h-4 w-4 text-orange-600" />
                    <span>Pet friendly</span>
                  </div>
                )}
                {data.noAgents && (
                  <div className="flex items-center gap-2 text-sm">
                    <UserX className="h-4 w-4 text-blue-600" />
                    <span>Direct contact only</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Pricing */}
      <div className="space-y-3">
        <h3 className="font-medium text-muted-foreground uppercase text-xs tracking-wide">
          Pricing
        </h3>
        <div className="p-4 border rounded-lg">
          <div className="text-2xl font-bold">
            {formatPrice()}
            {isRental && (
              <span className="text-base font-normal text-muted-foreground">
                {isShortTerm ? ' / night' : ' / month'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div className="p-4 bg-muted/50 rounded-lg">
        <h4 className="font-medium mb-2">What happens next?</h4>
        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
          <li>Your property will be created as a draft</li>
          <li>Add photos and virtual tours to attract more buyers</li>
          <li>Set up your availability calendar (for rentals)</li>
          <li>Configure dynamic pricing rules (optional)</li>
          <li>Publish your listing when ready</li>
        </ol>
      </div>
    </div>
  );
}
