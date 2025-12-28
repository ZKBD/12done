'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ImageCarouselProps {
  images: {
    url: string;
    alt?: string;
  }[];
  aspectRatio?: 'square' | 'video' | 'wide';
  showControls?: boolean;
  showIndicators?: boolean;
  className?: string;
}

export function ImageCarousel({
  images,
  aspectRatio = 'video',
  showControls = true,
  showIndicators = true,
  className,
}: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  const goToPrevious = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    },
    [images.length]
  );

  const goToNext = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    },
    [images.length]
  );

  const goToSlide = useCallback((e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex(index);
  }, []);

  const aspectRatioClass = {
    square: 'aspect-square',
    video: 'aspect-video',
    wide: 'aspect-[4/3]',
  }[aspectRatio];

  if (!images.length) {
    return (
      <div
        className={cn(
          'relative overflow-hidden rounded-xl bg-slate-200',
          aspectRatioClass,
          className
        )}
      >
        <div className="absolute inset-0 flex items-center justify-center text-slate-400">
          No images
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('relative overflow-hidden rounded-xl group', className)}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className={cn('relative', aspectRatioClass)}>
        {images.map((image, index) => (
          <div
            key={index}
            className={cn(
              'absolute inset-0 transition-opacity duration-300',
              index === currentIndex ? 'opacity-100' : 'opacity-0'
            )}
          >
            <Image
              src={image.url}
              alt={image.alt || `Image ${index + 1}`}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              priority={index === 0}
            />
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      {showControls && images.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/90 shadow-md hover:bg-white transition-opacity',
              isHovering ? 'opacity-100' : 'opacity-0'
            )}
            onClick={goToPrevious}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/90 shadow-md hover:bg-white transition-opacity',
              isHovering ? 'opacity-100' : 'opacity-0'
            )}
            onClick={goToNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </>
      )}

      {/* Indicators */}
      {showIndicators && images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={(e) => goToSlide(e, index)}
              className={cn(
                'h-1.5 rounded-full transition-all',
                index === currentIndex
                  ? 'w-4 bg-white'
                  : 'w-1.5 bg-white/60 hover:bg-white/80'
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
