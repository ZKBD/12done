import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as sharp from 'sharp';
import { PrismaService } from '@/database';
import { ListingType, PropertyStatus } from '@prisma/client';
import {
  VisualSearchQueryDto,
  VisualSearchResponseDto,
  VisualSearchResultDto,
  ImageFeaturesDto,
  IndexPropertyImagesResponseDto,
} from './dto/visual-search.dto';
import { PropertySummaryDto } from './dto/recommendations.dto';

/**
 * VisualSearchService (PROD-045)
 *
 * Provides visual similarity search for properties using perceptual hashing.
 * Uses Sharp for image processing and implements:
 * - Perceptual Hash (pHash) for structural similarity
 * - Color histogram for color palette matching
 * - Aspect ratio for composition matching
 */
@Injectable()
export class VisualSearchService {
  private readonly logger = new Logger(VisualSearchService.name);

  // Scoring weights for similarity calculation
  private readonly PHASH_WEIGHT = 0.6; // Structural similarity (most important)
  private readonly COLOR_WEIGHT = 0.25; // Color palette similarity
  private readonly ASPECT_WEIGHT = 0.15; // Composition similarity

  // Supported image formats
  private readonly SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  // Maximum image size for processing (10MB)
  private readonly MAX_IMAGE_SIZE = 10 * 1024 * 1024;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find properties with visually similar images
   */
  async findSimilarProperties(
    imageBuffer: Buffer,
    query: VisualSearchQueryDto,
  ): Promise<VisualSearchResponseDto> {
    const startTime = Date.now();

    // Extract features from uploaded image
    const uploadedFeatures = await this.extractImageFeatures(imageBuffer);

    // Build property filter conditions
    const propertyFilters = this.buildPropertyFilters(query);

    // Get all indexed images with their properties
    const indexedImages = await this.prisma.imageHash.findMany({
      include: {
        media: {
          include: {
            property: {
              select: {
                id: true,
                title: true,
                city: true,
                country: true,
                listingTypes: true,
                basePrice: true,
                currency: true,
                squareMeters: true,
                bedrooms: true,
                bathrooms: true,
                status: true,
              },
            },
          },
        },
      },
      where: {
        media: {
          property: propertyFilters,
        },
      },
    });

    // Calculate similarity for each indexed image
    const scoredResults: {
      image: (typeof indexedImages)[0];
      similarity: number;
      structural: number;
      colorPalette: number;
      composition: number;
    }[] = [];

    for (const indexedImage of indexedImages) {
      const structural = this.calculatePHashSimilarity(
        uploadedFeatures.pHash,
        indexedImage.pHash,
      );
      const colorPalette = this.calculateColorSimilarity(
        uploadedFeatures.dominantColors,
        indexedImage.dominantColors,
      );
      const composition = this.calculateAspectRatioSimilarity(
        uploadedFeatures.aspectRatio,
        indexedImage.aspectRatio,
      );

      const similarity =
        structural * this.PHASH_WEIGHT +
        colorPalette * this.COLOR_WEIGHT +
        composition * this.ASPECT_WEIGHT;

      scoredResults.push({
        image: indexedImage,
        similarity,
        structural,
        colorPalette,
        composition,
      });
    }

    // Filter by minimum similarity and sort by score
    const minSimilarity = query.minSimilarity ?? 0.3;
    const limit = query.limit ?? 10;

    const filteredResults = scoredResults
      .filter((r) => r.similarity >= minSimilarity)
      .sort((a, b) => b.similarity - a.similarity);

    // Group by property (take best match per property)
    const propertyBestMatches = new Map<
      string,
      (typeof filteredResults)[0]
    >();
    for (const result of filteredResults) {
      const propertyId = result.image.media.property.id;
      const existing = propertyBestMatches.get(propertyId);
      if (!existing || result.similarity > existing.similarity) {
        propertyBestMatches.set(propertyId, result);
      }
    }

    // Take top N results
    const topResults = Array.from(propertyBestMatches.values())
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    // Map to response DTOs
    const results: VisualSearchResultDto[] = topResults.map((r) => {
      const property = r.image.media.property;
      return {
        property: this.mapToPropertySummary(property),
        similarity: Math.round(r.similarity * 1000) / 1000,
        visualMatch: {
          structural: Math.round(r.structural * 1000) / 1000,
          colorPalette: Math.round(r.colorPalette * 1000) / 1000,
          composition: Math.round(r.composition * 1000) / 1000,
        },
        matchedImage: {
          url: r.image.media.url,
          thumbnailUrl: r.image.media.thumbnailUrl ?? undefined,
          mediaId: r.image.mediaId,
        },
        explanation: this.generateExplanation(r.structural, r.colorPalette, r.composition),
      };
    });

    const processingTimeMs = Date.now() - startTime;

    return {
      results,
      total: results.length,
      uploadedImageFeatures: uploadedFeatures,
      processingTimeMs,
    };
  }

  /**
   * Extract visual features from an image buffer
   */
  async extractImageFeatures(imageBuffer: Buffer): Promise<ImageFeaturesDto> {
    try {
      // Get image metadata
      const metadata = await sharp(imageBuffer).metadata();
      const width = metadata.width || 1;
      const height = metadata.height || 1;
      const aspectRatio = width / height;

      // Generate perceptual hash
      const pHash = await this.generatePHash(imageBuffer);

      // Extract dominant colors
      const dominantColors = await this.extractDominantColors(imageBuffer);

      // Calculate average brightness
      const brightness = await this.calculateBrightness(imageBuffer);

      return {
        pHash,
        dominantColors,
        aspectRatio: Math.round(aspectRatio * 1000) / 1000,
        brightness: Math.round(brightness * 10) / 10,
      };
    } catch (error) {
      this.logger.error(`Failed to extract image features: ${error.message}`);
      throw new BadRequestException('Failed to process image. Please ensure it is a valid image file.');
    }
  }

  /**
   * Generate perceptual hash for an image
   * Uses a simplified pHash algorithm:
   * 1. Resize to 32x32
   * 2. Convert to grayscale
   * 3. Apply DCT-like transformation (simplified)
   * 4. Generate 64-bit hash based on mean comparison
   */
  async generatePHash(imageBuffer: Buffer): Promise<string> {
    // Resize to 32x32 and convert to grayscale
    const resizedBuffer = await sharp(imageBuffer)
      .resize(32, 32, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer();

    // Calculate pixel values (0-255)
    const pixels = Array.from(resizedBuffer);

    // Apply simplified DCT by using 8x8 grid of averaged blocks
    const blockSize = 4; // 32/8 = 4
    const dctValues: number[] = [];

    for (let by = 0; by < 8; by++) {
      for (let bx = 0; bx < 8; bx++) {
        let sum = 0;
        for (let py = 0; py < blockSize; py++) {
          for (let px = 0; px < blockSize; px++) {
            const x = bx * blockSize + px;
            const y = by * blockSize + py;
            sum += pixels[y * 32 + x];
          }
        }
        dctValues.push(sum / (blockSize * blockSize));
      }
    }

    // Calculate median (excluding first value which is DC component)
    const sortedValues = [...dctValues.slice(1)].sort((a, b) => a - b);
    const median = sortedValues[Math.floor(sortedValues.length / 2)];

    // Generate 64-bit hash based on comparison to median
    let hash = '';
    for (let i = 0; i < 64; i++) {
      hash += dctValues[i] > median ? '1' : '0';
    }

    // Convert binary to hex (16 chars)
    let hexHash = '';
    for (let i = 0; i < 64; i += 4) {
      const nibble = hash.slice(i, i + 4);
      hexHash += parseInt(nibble, 2).toString(16);
    }

    return hexHash;
  }

  /**
   * Extract top 5 dominant colors from an image
   */
  async extractDominantColors(imageBuffer: Buffer): Promise<string[]> {
    // Resize for speed and get raw RGB data
    const { data, info: _info } = await sharp(imageBuffer)
      .resize(100, 100, { fit: 'fill' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Quantize colors to 64 bins (4 bits per channel)
    const colorCounts = new Map<string, number>();

    for (let i = 0; i < data.length; i += 3) {
      const r = Math.floor(data[i] / 64) * 64;
      const g = Math.floor(data[i + 1] / 64) * 64;
      const b = Math.floor(data[i + 2] / 64) * 64;

      const colorKey = `${r},${g},${b}`;
      colorCounts.set(colorKey, (colorCounts.get(colorKey) || 0) + 1);
    }

    // Sort by frequency and take top 5
    const sortedColors = Array.from(colorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Convert to hex
    return sortedColors.map(([colorKey]) => {
      const [r, g, b] = colorKey.split(',').map(Number);
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
    });
  }

  /**
   * Calculate average brightness of an image
   */
  async calculateBrightness(imageBuffer: Buffer): Promise<number> {
    const { data } = await sharp(imageBuffer)
      .resize(50, 50, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const sum = Array.from(data).reduce((acc, val) => acc + val, 0);
    return sum / data.length;
  }

  /**
   * Calculate similarity between two perceptual hashes (0-1)
   * Uses Hamming distance
   */
  calculatePHashSimilarity(hash1: string, hash2: string): number {
    if (hash1.length !== hash2.length) {
      return 0;
    }

    // Convert hex to binary
    const bin1 = hash1.split('').map((h) => parseInt(h, 16).toString(2).padStart(4, '0')).join('');
    const bin2 = hash2.split('').map((h) => parseInt(h, 16).toString(2).padStart(4, '0')).join('');

    // Calculate Hamming distance
    let distance = 0;
    for (let i = 0; i < bin1.length; i++) {
      if (bin1[i] !== bin2[i]) {
        distance++;
      }
    }

    // Convert to similarity (0 distance = 1.0 similarity, 64 distance = 0.0)
    return 1 - distance / 64;
  }

  /**
   * Calculate similarity between two color palettes (0-1)
   */
  calculateColorSimilarity(colors1: string[], colors2: string[]): number {
    if (colors1.length === 0 || colors2.length === 0) {
      return 0;
    }

    // Calculate color distances and find best matches
    let totalSimilarity = 0;
    let matchCount = 0;

    for (const c1 of colors1) {
      let bestMatch = 0;
      for (const c2 of colors2) {
        const similarity = this.colorDistance(c1, c2);
        bestMatch = Math.max(bestMatch, similarity);
      }
      totalSimilarity += bestMatch;
      matchCount++;
    }

    return matchCount > 0 ? totalSimilarity / matchCount : 0;
  }

  /**
   * Calculate similarity between two colors (0-1)
   */
  private colorDistance(hex1: string, hex2: string): number {
    const rgb1 = this.hexToRgb(hex1);
    const rgb2 = this.hexToRgb(hex2);

    if (!rgb1 || !rgb2) return 0;

    // Euclidean distance in RGB space, normalized
    const dr = rgb1.r - rgb2.r;
    const dg = rgb1.g - rgb2.g;
    const db = rgb1.b - rgb2.b;

    const distance = Math.sqrt(dr * dr + dg * dg + db * db);
    const maxDistance = Math.sqrt(255 * 255 * 3); // Max possible distance

    return 1 - distance / maxDistance;
  }

  /**
   * Convert hex color to RGB
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }

  /**
   * Calculate similarity between two aspect ratios (0-1)
   */
  calculateAspectRatioSimilarity(ratio1: number, ratio2: number): number {
    const minRatio = Math.min(ratio1, ratio2);
    const maxRatio = Math.max(ratio1, ratio2);

    if (maxRatio === 0) return 1;

    // Similarity based on ratio difference
    return minRatio / maxRatio;
  }

  /**
   * Index all images for a property
   */
  async indexPropertyImages(propertyId: string): Promise<IndexPropertyImagesResponseDto> {
    const media = await this.prisma.propertyMedia.findMany({
      where: {
        propertyId,
        type: 'photo',
      },
      select: {
        id: true,
        url: true,
        imageHash: true,
      },
    });

    const indexedMediaIds: string[] = [];
    const failures: { mediaId: string; error: string }[] = [];

    for (const item of media) {
      // Skip if already indexed
      if (item.imageHash) {
        indexedMediaIds.push(item.id);
        continue;
      }

      try {
        // Fetch image from URL
        const imageBuffer = await this.fetchImage(item.url);

        // Extract features
        const features = await this.extractImageFeatures(imageBuffer);

        // Store in database
        await this.prisma.imageHash.create({
          data: {
            mediaId: item.id,
            pHash: features.pHash,
            dominantColors: features.dominantColors,
            aspectRatio: features.aspectRatio,
            brightness: features.brightness,
          },
        });

        indexedMediaIds.push(item.id);
      } catch (error) {
        failures.push({
          mediaId: item.id,
          error: error.message || 'Unknown error',
        });
      }
    }

    return {
      propertyId,
      indexedCount: indexedMediaIds.length,
      failedCount: failures.length,
      indexedMediaIds,
      failures,
    };
  }

  /**
   * Fetch image from URL
   */
  private async fetchImage(url: string): Promise<Buffer> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Generate human-readable explanation for visual match
   */
  private generateExplanation(structural: number, colorPalette: number, composition: number): string {
    const aspects: string[] = [];

    if (structural >= 0.8) {
      aspects.push('very similar layout and structure');
    } else if (structural >= 0.6) {
      aspects.push('similar room layout');
    }

    if (colorPalette >= 0.8) {
      aspects.push('matching color scheme');
    } else if (colorPalette >= 0.6) {
      aspects.push('similar color palette');
    }

    if (composition >= 0.9) {
      aspects.push('same perspective');
    } else if (composition >= 0.7) {
      aspects.push('similar composition');
    }

    if (aspects.length === 0) {
      return 'Some visual similarities found';
    }

    return `Similar property with ${aspects.join(' and ')}`;
  }

  /**
   * Build property filter conditions from query
   */
  private buildPropertyFilters(query: VisualSearchQueryDto) {
    const filters: Record<string, unknown> = {
      status: PropertyStatus.ACTIVE,
    };

    if (query.listingTypes && query.listingTypes.length > 0) {
      filters.listingTypes = { hasSome: query.listingTypes };
    }

    if (query.city) {
      filters.city = { contains: query.city, mode: 'insensitive' };
    }

    if (query.country) {
      filters.country = { contains: query.country, mode: 'insensitive' };
    }

    return filters;
  }

  /**
   * Map property data to PropertySummaryDto
   */
  private mapToPropertySummary(property: {
    id: string;
    title: string;
    city: string;
    country: string;
    listingTypes: ListingType[];
    basePrice: unknown;
    currency: string;
    squareMeters: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    status: PropertyStatus;
  }): PropertySummaryDto {
    return {
      id: property.id,
      title: property.title,
      city: property.city,
      country: property.country,
      listingTypes: property.listingTypes,
      basePrice: property.basePrice?.toString() || '0',
      currency: property.currency,
      squareMeters: property.squareMeters ?? undefined,
      bedrooms: property.bedrooms ?? undefined,
      bathrooms: property.bathrooms ?? undefined,
      status: property.status,
    };
  }

  /**
   * Validate uploaded image file
   */
  validateImageFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    if (!this.SUPPORTED_FORMATS.includes(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported image format. Supported formats: ${this.SUPPORTED_FORMATS.join(', ')}`,
      );
    }

    if (file.size > this.MAX_IMAGE_SIZE) {
      throw new BadRequestException(
        `Image size exceeds maximum allowed size of ${this.MAX_IMAGE_SIZE / 1024 / 1024}MB`,
      );
    }
  }

  /**
   * Check if an image is already indexed
   */
  async isImageIndexed(mediaId: string): Promise<boolean> {
    const hash = await this.prisma.imageHash.findUnique({
      where: { mediaId },
    });
    return !!hash;
  }

  /**
   * Get indexing statistics
   */
  async getIndexingStats(): Promise<{
    totalMedia: number;
    indexedMedia: number;
    unindexedMedia: number;
    indexedPercentage: number;
  }> {
    const [totalMedia, indexedMedia] = await Promise.all([
      this.prisma.propertyMedia.count({ where: { type: 'photo' } }),
      this.prisma.imageHash.count(),
    ]);

    return {
      totalMedia,
      indexedMedia,
      unindexedMedia: totalMedia - indexedMedia,
      indexedPercentage: totalMedia > 0 ? Math.round((indexedMedia / totalMedia) * 100) : 0,
    };
  }
}
