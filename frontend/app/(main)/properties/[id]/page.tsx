'use client';

import { useEffect, useState } from 'react';
import { useParams, notFound } from 'next/navigation';
import Link from 'next/link';
import {
  Heart,
  Share2,
  MapPin,
  Bed,
  Bath,
  Square,
  Calendar,
  Building2,
  PawPrint,
  ArrowLeft,
  User,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageGallery } from '@/components/properties/image-gallery';
import { PropertyCard } from '@/components/properties/property-card';
import { MakeOfferModal } from '@/components/negotiations/make-offer-modal';
import { useProperty, useSimilarProperties } from '@/hooks/use-properties';
import { useFavoriteIds, useToggleFavorite } from '@/hooks/use-favorites';
import { propertiesApi } from '@/lib/api/properties';
import { useAuth } from '@/providers';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import type { ListingType } from '@/lib/types';

const listingTypeLabels: Record<ListingType, string> = {
  FOR_SALE: 'For Sale',
  SHORT_TERM_RENT: 'Short-term Rent',
  LONG_TERM_RENT: 'Long-term Rent',
  EVENTS: 'Events',
  BARTER: 'Barter',
};

export default function PropertyDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: property, isLoading, error } = useProperty(id);
  const { data: similarProperties = [] } = useSimilarProperties(id);
  const { data: favoriteIds = [] } = useFavoriteIds();
  const toggleFavorite = useToggleFavorite();
  const { user } = useAuth();
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);

  const isFavorite = favoriteIds.includes(id);
  const isOwner = user?.id === property?.owner?.id;

  // Track view on mount
  useEffect(() => {
    if (id) {
      propertiesApi.trackView(id).catch(() => {
        // Ignore tracking errors
      });
    }
  }, [id]);

  if (isLoading) {
    return <PropertyDetailSkeleton />;
  }

  if (error || !property) {
    notFound();
  }

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

  const handleShare = async () => {
    const url = window.location.href;

    // Try native share on mobile/touch devices
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile && navigator.share) {
      try {
        await navigator.share({
          title: property.title,
          text: property.description || `Check out this property: ${property.title}`,
          url,
        });
        return; // Success - native share handled it
      } catch (error) {
        // User cancelled - don't show anything
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        // Other errors - fall through to clipboard
      }
    }

    // Use clipboard for desktop or as fallback
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: 'Link copied',
        description: 'Property link copied to clipboard',
      });
    } catch {
      toast({
        title: 'Share failed',
        description: 'Could not copy the link to clipboard',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back button */}
      <div className="mb-6">
        <Link href="/properties">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to listings
          </Button>
        </Link>
      </div>

      {/* Image Gallery */}
      <ImageGallery media={property.media} title={property.title} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Header */}
          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              {property.listingTypes.map((type) => (
                <Badge key={type} variant="secondary">
                  {listingTypeLabels[type]}
                </Badge>
              ))}
              {property.petFriendly && (
                <Badge variant="outline" className="gap-1">
                  <PawPrint className="h-3 w-3" />
                  Pet friendly
                </Badge>
              )}
            </div>

            <h1 className="text-3xl font-bold mb-2">{property.title}</h1>

            <div className="flex items-center gap-1 text-muted-foreground mb-4">
              <MapPin className="h-4 w-4" />
              <span>
                {property.address}, {property.city}, {property.country}
              </span>
            </div>

            {/* Quick Stats */}
            <div className="flex flex-wrap gap-6 text-lg">
              {property.bedrooms !== undefined && (
                <div className="flex items-center gap-2">
                  <Bed className="h-5 w-5 text-muted-foreground" />
                  <span>
                    {property.bedrooms} {property.bedrooms === 1 ? 'bedroom' : 'bedrooms'}
                  </span>
                </div>
              )}
              {property.bathrooms !== undefined && (
                <div className="flex items-center gap-2">
                  <Bath className="h-5 w-5 text-muted-foreground" />
                  <span>
                    {property.bathrooms} {property.bathrooms === 1 ? 'bathroom' : 'bathrooms'}
                  </span>
                </div>
              )}
              {property.squareMeters !== undefined && (
                <div className="flex items-center gap-2">
                  <Square className="h-5 w-5 text-muted-foreground" />
                  <span>{property.squareMeters} m²</span>
                </div>
              )}
              {property.floors !== undefined && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <span>
                    {property.floors} {property.floors === 1 ? 'floor' : 'floors'}
                  </span>
                </div>
              )}
              {property.yearBuilt && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <span>Built {property.yearBuilt}</span>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <h2 className="text-xl font-semibold mb-4">About this property</h2>
            <div className="prose prose-slate max-w-none">
              {property.description ? (
                <p className="whitespace-pre-wrap">{property.description}</p>
              ) : (
                <p className="text-muted-foreground italic">
                  No description available for this property.
                </p>
              )}
            </div>
          </div>

          {/* Owner Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Listed by</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">
                    {property.owner.firstName} {property.owner.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">Property Owner</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Price Card */}
          <Card className="sticky top-20">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold mb-1">
                {formatPrice(property.basePrice, property.currency)}
                {isRental && (
                  <span className="text-lg font-normal text-muted-foreground">
                    {primaryListingType === 'SHORT_TERM_RENT' ? ' / night' : ' / month'}
                  </span>
                )}
              </div>

              <div className="space-y-3 mt-6">
                {!isOwner && (
                  <Button
                    className="w-full gap-2"
                    size="lg"
                    onClick={() => setIsOfferModalOpen(true)}
                  >
                    <MessageSquare className="h-5 w-5" />
                    Contact Owner
                  </Button>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => toggleFavorite.mutate(id)}
                  >
                    <Heart
                      className={cn(
                        'h-5 w-5',
                        isFavorite && 'fill-red-500 text-red-500'
                      )}
                    />
                    {isFavorite ? 'Saved' : 'Save'}
                  </Button>
                  <Button variant="outline" className="flex-1 gap-2" onClick={handleShare}>
                    <Share2 className="h-5 w-5" />
                    Share
                  </Button>
                </div>

                {property.noAgents && (
                  <p className="text-sm text-muted-foreground text-center mt-4">
                    This property prefers direct contact - no agent inquiries
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Similar Properties */}
      {similarProperties.length > 0 && (
        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-6">Similar properties</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {similarProperties.map((prop) => (
              <PropertyCard
                key={prop.id}
                property={prop}
                isFavorite={favoriteIds.includes(prop.id)}
                onToggleFavorite={(propId) => toggleFavorite.mutate(propId)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Make Offer Modal */}
      <MakeOfferModal
        open={isOfferModalOpen}
        onOpenChange={setIsOfferModalOpen}
        property={property}
      />
    </div>
  );
}

function PropertyDetailSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Skeleton className="h-10 w-32 mb-6" />
      <Skeleton className="aspect-[16/9] w-full rounded-xl mb-8" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <Skeleton className="h-6 w-48 mb-3" />
            <Skeleton className="h-10 w-full mb-2" />
            <Skeleton className="h-5 w-72 mb-4" />
            <div className="flex gap-6">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
          <div>
            <Skeleton className="h-8 w-48 mb-4" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
        <div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
