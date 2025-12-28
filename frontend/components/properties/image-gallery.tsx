'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight, Grid3X3 } from 'lucide-react';
import { cn, getImageUrl } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { PropertyMedia } from '@/lib/types';

interface ImageGalleryProps {
  media: PropertyMedia[];
  title: string;
}

export function ImageGallery({ media, title }: ImageGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const photos = media
    .filter((m) => m.type === 'photo')
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const primaryPhoto = photos.find((p) => p.isPrimary) || photos[0];
  const secondaryPhotos = photos.filter((p) => p.id !== primaryPhoto?.id).slice(0, 4);

  const openLightbox = useCallback((index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
    document.body.style.overflow = 'hidden';
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    document.body.style.overflow = '';
  }, []);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  }, [photos.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  }, [photos.length]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'ArrowRight') goToNext();
    },
    [closeLightbox, goToPrevious, goToNext]
  );

  if (!primaryPhoto) {
    return (
      <div className="aspect-[16/9] bg-slate-200 rounded-xl flex items-center justify-center">
        <span className="text-muted-foreground">No images available</span>
      </div>
    );
  }

  return (
    <>
      {/* Gallery Grid */}
      <div className="relative">
        <div className="grid grid-cols-4 gap-2 rounded-xl overflow-hidden">
          {/* Primary Image */}
          <div
            className="col-span-2 row-span-2 relative aspect-[4/3] cursor-pointer"
            onClick={() => openLightbox(0)}
          >
            <Image
              src={getImageUrl(primaryPhoto.url)}
              alt={primaryPhoto.caption || title}
              fill
              className="object-cover hover:brightness-95 transition-all"
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>

          {/* Secondary Images */}
          {secondaryPhotos.map((photo, index) => (
            <div
              key={photo.id}
              className="relative aspect-[4/3] cursor-pointer"
              onClick={() => openLightbox(index + 1)}
            >
              <Image
                src={getImageUrl(photo.url)}
                alt={photo.caption || `${title} - ${index + 2}`}
                fill
                className="object-cover hover:brightness-95 transition-all"
                sizes="(max-width: 768px) 50vw, 25vw"
              />
            </div>
          ))}

          {/* Show all photos button */}
          {photos.length > 5 && (
            <Button
              variant="secondary"
              size="sm"
              className="absolute bottom-4 right-4 gap-2 shadow-lg"
              onClick={() => openLightbox(0)}
            >
              <Grid3X3 className="h-4 w-4" />
              Show all {photos.length} photos
            </Button>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={closeLightbox}
          >
            <X className="h-6 w-6" />
          </Button>

          {/* Counter */}
          <div className="absolute top-4 left-4 text-white text-sm">
            {currentIndex + 1} / {photos.length}
          </div>

          {/* Previous button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12"
            onClick={goToPrevious}
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>

          {/* Current image */}
          <div className="relative w-full h-full max-w-5xl max-h-[80vh] mx-16">
            <Image
              src={getImageUrl(photos[currentIndex].url)}
              alt={photos[currentIndex].caption || `${title} - ${currentIndex + 1}`}
              fill
              className="object-contain"
              sizes="100vw"
              priority
            />
          </div>

          {/* Next button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12"
            onClick={goToNext}
          >
            <ChevronRight className="h-8 w-8" />
          </Button>

          {/* Thumbnails */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 max-w-full px-4 overflow-x-auto">
            {photos.map((photo, index) => (
              <button
                key={photo.id}
                className={cn(
                  'relative w-16 h-12 rounded overflow-hidden flex-shrink-0 transition-all',
                  index === currentIndex
                    ? 'ring-2 ring-white'
                    : 'opacity-60 hover:opacity-100'
                )}
                onClick={() => setCurrentIndex(index)}
              >
                <Image
                  src={getImageUrl(photo.thumbnailUrl || photo.url)}
                  alt={photo.caption || `Thumbnail ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </button>
            ))}
          </div>

          {/* Caption */}
          {photos[currentIndex].caption && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white text-center max-w-md px-4">
              {photos[currentIndex].caption}
            </div>
          )}
        </div>
      )}
    </>
  );
}
