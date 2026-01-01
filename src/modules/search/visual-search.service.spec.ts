import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/database';
import { ListingType, PropertyStatus } from '@prisma/client';
import { VisualSearchService } from './visual-search.service';
import * as sharp from 'sharp';

describe('VisualSearchService', () => {
  let service: VisualSearchService;
  let prisma: jest.Mocked<PrismaService>;

  // Create a simple test image buffer (100x100 red square)
  const createTestImage = async (
    width = 100,
    height = 100,
    color: { r: number; g: number; b: number } = { r: 255, g: 0, b: 0 },
  ): Promise<Buffer> => {
    return sharp({
      create: {
        width,
        height,
        channels: 3,
        background: color,
      },
    })
      .jpeg()
      .toBuffer();
  };

  // Create grayscale gradient image
  const createGradientImage = async (width = 100, height = 100): Promise<Buffer> => {
    const pixels = Buffer.alloc(width * height * 3);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const value = Math.floor((x / width) * 255);
        const idx = (y * width + x) * 3;
        pixels[idx] = value;
        pixels[idx + 1] = value;
        pixels[idx + 2] = value;
      }
    }
    return sharp(pixels, { raw: { width, height, channels: 3 } })
      .jpeg()
      .toBuffer();
  };

  beforeEach(async () => {
    const mockPrismaService = {
      imageHash: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
      },
      propertyMedia: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisualSearchService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<VisualSearchService>(VisualSearchService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================
  // PERCEPTUAL HASH TESTS
  // ============================================

  describe('generatePHash', () => {
    it('should generate consistent hash for same image', async () => {
      const image = await createTestImage();
      const hash1 = await service.generatePHash(image);
      const hash2 = await service.generatePHash(image);
      expect(hash1).toBe(hash2);
    });

    it('should generate 16 character hex hash', async () => {
      const image = await createTestImage();
      const hash = await service.generatePHash(image);
      expect(hash).toMatch(/^[0-9a-f]{16}$/);
    });

    it('should generate different hashes for structurally different images', async () => {
      // Use gradient image which has structure vs solid image
      const gradientImage = await createGradientImage(100, 100);
      const solidImage = await createTestImage(100, 100, { r: 128, g: 128, b: 128 });
      const gradientHash = await service.generatePHash(gradientImage);
      const solidHash = await service.generatePHash(solidImage);
      // The hashes should be different due to structural differences
      expect(gradientHash).not.toBe(solidHash);
    });

    it('should generate similar hashes for similar images', async () => {
      const image1 = await createTestImage(100, 100, { r: 255, g: 0, b: 0 });
      const image2 = await createTestImage(100, 100, { r: 250, g: 5, b: 5 });
      const hash1 = await service.generatePHash(image1);
      const hash2 = await service.generatePHash(image2);
      const similarity = service.calculatePHashSimilarity(hash1, hash2);
      expect(similarity).toBeGreaterThan(0.8);
    });

    it('should handle different image sizes', async () => {
      const small = await createTestImage(50, 50);
      const large = await createTestImage(500, 500);
      const smallHash = await service.generatePHash(small);
      const largeHash = await service.generatePHash(large);
      expect(smallHash).toMatch(/^[0-9a-f]{16}$/);
      expect(largeHash).toMatch(/^[0-9a-f]{16}$/);
    });

    it('should handle non-square images', async () => {
      const wide = await createTestImage(200, 100);
      const tall = await createTestImage(100, 200);
      const wideHash = await service.generatePHash(wide);
      const tallHash = await service.generatePHash(tall);
      expect(wideHash).toMatch(/^[0-9a-f]{16}$/);
      expect(tallHash).toMatch(/^[0-9a-f]{16}$/);
    });
  });

  // ============================================
  // PHASH SIMILARITY TESTS
  // ============================================

  describe('calculatePHashSimilarity', () => {
    it('should return 1.0 for identical hashes', () => {
      const hash = 'a1b2c3d4e5f67890';
      expect(service.calculatePHashSimilarity(hash, hash)).toBe(1);
    });

    it('should return 0.0 for completely different hashes', () => {
      const hash1 = '0000000000000000';
      const hash2 = 'ffffffffffffffff';
      expect(service.calculatePHashSimilarity(hash1, hash2)).toBe(0);
    });

    it('should return value between 0 and 1 for partially similar hashes', () => {
      const hash1 = 'a1b2c3d4e5f67890';
      const hash2 = 'a1b2c3d400000000';
      const similarity = service.calculatePHashSimilarity(hash1, hash2);
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThan(1);
    });

    it('should return 0 for hashes of different lengths', () => {
      const hash1 = 'a1b2c3d4';
      const hash2 = 'a1b2c3d4e5f67890';
      expect(service.calculatePHashSimilarity(hash1, hash2)).toBe(0);
    });

    it('should be symmetric (a,b = b,a)', () => {
      const hash1 = 'a1b2c3d4e5f67890';
      const hash2 = 'f1e2d3c4b5a69780';
      const sim1 = service.calculatePHashSimilarity(hash1, hash2);
      const sim2 = service.calculatePHashSimilarity(hash2, hash1);
      expect(sim1).toBe(sim2);
    });
  });

  // ============================================
  // COLOR EXTRACTION TESTS
  // ============================================

  describe('extractDominantColors', () => {
    it('should extract colors from solid color image', async () => {
      const redImage = await createTestImage(100, 100, { r: 255, g: 0, b: 0 });
      const colors = await service.extractDominantColors(redImage);
      expect(colors.length).toBeGreaterThan(0);
      expect(colors.length).toBeLessThanOrEqual(5);
    });

    it('should return hex color format', async () => {
      const image = await createTestImage();
      const colors = await service.extractDominantColors(image);
      colors.forEach((color) => {
        expect(color).toMatch(/^#[0-9A-F]{6}$/);
      });
    });

    it('should extract up to 5 colors', async () => {
      const image = await createGradientImage();
      const colors = await service.extractDominantColors(image);
      expect(colors.length).toBeLessThanOrEqual(5);
    });

    it('should detect red as dominant in red image', async () => {
      const redImage = await createTestImage(100, 100, { r: 192, g: 0, b: 0 });
      const colors = await service.extractDominantColors(redImage);
      // First color should be in the red range (quantized)
      expect(colors[0]).toMatch(/^#[C-F][0-9A-F]0{4}$/);
    });
  });

  // ============================================
  // COLOR SIMILARITY TESTS
  // ============================================

  describe('calculateColorSimilarity', () => {
    it('should return 1.0 for identical color arrays', () => {
      const colors = ['#FF0000', '#00FF00', '#0000FF'];
      const similarity = service.calculateColorSimilarity(colors, colors);
      expect(similarity).toBe(1);
    });

    it('should return low similarity for completely different colors', () => {
      const colors1 = ['#FF0000', '#FF0000', '#FF0000'];
      const colors2 = ['#00FFFF', '#00FFFF', '#00FFFF'];
      const similarity = service.calculateColorSimilarity(colors1, colors2);
      expect(similarity).toBeLessThan(0.5);
    });

    it('should return high similarity for similar colors', () => {
      const colors1 = ['#FF0000', '#00FF00'];
      const colors2 = ['#FF0505', '#00FF05'];
      const similarity = service.calculateColorSimilarity(colors1, colors2);
      expect(similarity).toBeGreaterThan(0.9);
    });

    it('should return 0 for empty color arrays', () => {
      expect(service.calculateColorSimilarity([], ['#FF0000'])).toBe(0);
      expect(service.calculateColorSimilarity(['#FF0000'], [])).toBe(0);
      expect(service.calculateColorSimilarity([], [])).toBe(0);
    });

    it('should handle different array lengths', () => {
      const colors1 = ['#FF0000'];
      const colors2 = ['#FF0000', '#00FF00', '#0000FF'];
      const similarity = service.calculateColorSimilarity(colors1, colors2);
      expect(similarity).toBeGreaterThan(0);
    });
  });

  // ============================================
  // ASPECT RATIO SIMILARITY TESTS
  // ============================================

  describe('calculateAspectRatioSimilarity', () => {
    it('should return 1.0 for identical aspect ratios', () => {
      expect(service.calculateAspectRatioSimilarity(1.5, 1.5)).toBe(1);
    });

    it('should return high similarity for similar ratios', () => {
      const similarity = service.calculateAspectRatioSimilarity(1.5, 1.6);
      expect(similarity).toBeGreaterThan(0.9);
    });

    it('should return lower similarity for different ratios', () => {
      const similarity = service.calculateAspectRatioSimilarity(1.0, 2.0);
      expect(similarity).toBe(0.5);
    });

    it('should be symmetric', () => {
      const sim1 = service.calculateAspectRatioSimilarity(1.5, 2.0);
      const sim2 = service.calculateAspectRatioSimilarity(2.0, 1.5);
      expect(sim1).toBe(sim2);
    });

    it('should handle zero ratio', () => {
      expect(service.calculateAspectRatioSimilarity(0, 0)).toBe(1);
      expect(service.calculateAspectRatioSimilarity(1.5, 0)).toBe(0);
    });
  });

  // ============================================
  // BRIGHTNESS CALCULATION TESTS
  // ============================================

  describe('calculateBrightness', () => {
    it('should return high brightness for white image', async () => {
      const whiteImage = await createTestImage(100, 100, { r: 255, g: 255, b: 255 });
      const brightness = await service.calculateBrightness(whiteImage);
      expect(brightness).toBeGreaterThan(200);
    });

    it('should return low brightness for black image', async () => {
      const blackImage = await createTestImage(100, 100, { r: 0, g: 0, b: 0 });
      const brightness = await service.calculateBrightness(blackImage);
      expect(brightness).toBeLessThan(50);
    });

    it('should return mid brightness for gray image', async () => {
      const grayImage = await createTestImage(100, 100, { r: 128, g: 128, b: 128 });
      const brightness = await service.calculateBrightness(grayImage);
      expect(brightness).toBeGreaterThan(100);
      expect(brightness).toBeLessThan(150);
    });

    it('should return value between 0 and 255', async () => {
      const image = await createTestImage();
      const brightness = await service.calculateBrightness(image);
      expect(brightness).toBeGreaterThanOrEqual(0);
      expect(brightness).toBeLessThanOrEqual(255);
    });
  });

  // ============================================
  // IMAGE FEATURE EXTRACTION TESTS
  // ============================================

  describe('extractImageFeatures', () => {
    it('should extract all features from an image', async () => {
      const image = await createTestImage();
      const features = await service.extractImageFeatures(image);

      expect(features.pHash).toBeDefined();
      expect(features.pHash).toMatch(/^[0-9a-f]{16}$/);
      expect(features.dominantColors).toBeDefined();
      expect(Array.isArray(features.dominantColors)).toBe(true);
      expect(features.aspectRatio).toBeDefined();
      expect(typeof features.aspectRatio).toBe('number');
      expect(features.brightness).toBeDefined();
      expect(typeof features.brightness).toBe('number');
    });

    it('should calculate correct aspect ratio', async () => {
      const wideImage = await createTestImage(200, 100);
      const features = await service.extractImageFeatures(wideImage);
      expect(features.aspectRatio).toBeCloseTo(2.0, 1);
    });

    it('should throw BadRequestException for invalid image', async () => {
      const invalidBuffer = Buffer.from('not an image');
      await expect(service.extractImageFeatures(invalidBuffer)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ============================================
  // IMAGE VALIDATION TESTS
  // ============================================

  describe('validateImageFile', () => {
    it('should throw for missing file', () => {
      expect(() => service.validateImageFile(null as any)).toThrow(BadRequestException);
      expect(() => service.validateImageFile(undefined as any)).toThrow(BadRequestException);
    });

    it('should throw for unsupported format', () => {
      const file = {
        buffer: Buffer.from('test'),
        mimetype: 'image/tiff',
        size: 1000,
      } as Express.Multer.File;
      expect(() => service.validateImageFile(file)).toThrow(BadRequestException);
    });

    it('should throw for file too large', () => {
      const file = {
        buffer: Buffer.alloc(11 * 1024 * 1024),
        mimetype: 'image/jpeg',
        size: 11 * 1024 * 1024,
      } as Express.Multer.File;
      expect(() => service.validateImageFile(file)).toThrow(BadRequestException);
    });

    it('should accept valid JPEG file', () => {
      const file = {
        buffer: Buffer.from('test'),
        mimetype: 'image/jpeg',
        size: 1000,
      } as Express.Multer.File;
      expect(() => service.validateImageFile(file)).not.toThrow();
    });

    it('should accept valid PNG file', () => {
      const file = {
        buffer: Buffer.from('test'),
        mimetype: 'image/png',
        size: 1000,
      } as Express.Multer.File;
      expect(() => service.validateImageFile(file)).not.toThrow();
    });

    it('should accept valid WebP file', () => {
      const file = {
        buffer: Buffer.from('test'),
        mimetype: 'image/webp',
        size: 1000,
      } as Express.Multer.File;
      expect(() => service.validateImageFile(file)).not.toThrow();
    });

    it('should accept valid GIF file', () => {
      const file = {
        buffer: Buffer.from('test'),
        mimetype: 'image/gif',
        size: 1000,
      } as Express.Multer.File;
      expect(() => service.validateImageFile(file)).not.toThrow();
    });
  });

  // ============================================
  // FIND SIMILAR PROPERTIES TESTS
  // ============================================

  describe('findSimilarProperties', () => {
    it('should return empty results when no indexed images', async () => {
      (prisma.imageHash.findMany as jest.Mock).mockResolvedValue([]);

      const image = await createTestImage();
      const result = await service.findSimilarProperties(image, {});

      expect(result.results).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.uploadedImageFeatures).toBeDefined();
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should find similar properties with matching images', async () => {
      const testImage = await createTestImage();
      const testFeatures = await service.extractImageFeatures(testImage);

      (prisma.imageHash.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'hash-1',
          mediaId: 'media-1',
          pHash: testFeatures.pHash, // Same hash = identical
          dominantColors: testFeatures.dominantColors,
          aspectRatio: testFeatures.aspectRatio,
          brightness: testFeatures.brightness,
          media: {
            id: 'media-1',
            url: 'https://example.com/image1.jpg',
            thumbnailUrl: 'https://example.com/thumb1.jpg',
            property: {
              id: 'prop-1',
              title: 'Test Property',
              city: 'Budapest',
              country: 'Hungary',
              listingTypes: [ListingType.FOR_SALE],
              basePrice: { toNumber: () => 100000 },
              currency: 'EUR',
              squareMeters: 100,
              bedrooms: 3,
              bathrooms: 2,
              status: PropertyStatus.ACTIVE,
            },
          },
        },
      ]);

      const result = await service.findSimilarProperties(testImage, {});

      expect(result.results.length).toBeGreaterThan(0);
      expect(result.results[0].similarity).toBeCloseTo(1, 1);
      expect(result.results[0].property.id).toBe('prop-1');
    });

    it('should filter by minimum similarity', async () => {
      const testImage = await createTestImage();

      (prisma.imageHash.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'hash-1',
          mediaId: 'media-1',
          pHash: 'ffffffffffffffff', // Very different
          dominantColors: ['#00FFFF'],
          aspectRatio: 5.0,
          brightness: 0,
          media: {
            id: 'media-1',
            url: 'https://example.com/image1.jpg',
            property: {
              id: 'prop-1',
              title: 'Different Property',
              city: 'Vienna',
              country: 'Austria',
              listingTypes: [ListingType.LONG_TERM_RENT],
              basePrice: { toNumber: () => 50000 },
              currency: 'EUR',
              squareMeters: 50,
              bedrooms: 1,
              bathrooms: 1,
              status: PropertyStatus.ACTIVE,
            },
          },
        },
      ]);

      const result = await service.findSimilarProperties(testImage, {
        minSimilarity: 0.9,
      });

      expect(result.results).toHaveLength(0);
    });

    it('should respect limit parameter', async () => {
      const testImage = await createTestImage();
      const testFeatures = await service.extractImageFeatures(testImage);

      const mockImages = Array.from({ length: 20 }, (_, i) => ({
        id: `hash-${i}`,
        mediaId: `media-${i}`,
        pHash: testFeatures.pHash,
        dominantColors: testFeatures.dominantColors,
        aspectRatio: testFeatures.aspectRatio,
        brightness: testFeatures.brightness,
        media: {
          id: `media-${i}`,
          url: `https://example.com/image${i}.jpg`,
          property: {
            id: `prop-${i}`,
            title: `Property ${i}`,
            city: 'Budapest',
            country: 'Hungary',
            listingTypes: [ListingType.FOR_SALE],
            basePrice: { toNumber: () => 100000 + i * 1000 },
            currency: 'EUR',
            squareMeters: 100,
            bedrooms: 3,
            bathrooms: 2,
            status: PropertyStatus.ACTIVE,
          },
        },
      }));

      (prisma.imageHash.findMany as jest.Mock).mockResolvedValue(mockImages);

      const result = await service.findSimilarProperties(testImage, { limit: 5 });

      expect(result.results.length).toBeLessThanOrEqual(5);
    });

    it('should include visual match details in response', async () => {
      const testImage = await createTestImage();
      const testFeatures = await service.extractImageFeatures(testImage);

      (prisma.imageHash.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'hash-1',
          mediaId: 'media-1',
          pHash: testFeatures.pHash,
          dominantColors: testFeatures.dominantColors,
          aspectRatio: testFeatures.aspectRatio,
          brightness: testFeatures.brightness,
          media: {
            id: 'media-1',
            url: 'https://example.com/image1.jpg',
            property: {
              id: 'prop-1',
              title: 'Test Property',
              city: 'Budapest',
              country: 'Hungary',
              listingTypes: [ListingType.FOR_SALE],
              basePrice: { toNumber: () => 100000 },
              currency: 'EUR',
              squareMeters: 100,
              bedrooms: 3,
              bathrooms: 2,
              status: PropertyStatus.ACTIVE,
            },
          },
        },
      ]);

      const result = await service.findSimilarProperties(testImage, {});

      expect(result.results[0].visualMatch).toBeDefined();
      expect(result.results[0].visualMatch.structural).toBeDefined();
      expect(result.results[0].visualMatch.colorPalette).toBeDefined();
      expect(result.results[0].visualMatch.composition).toBeDefined();
    });

    it('should include explanation in response', async () => {
      const testImage = await createTestImage();
      const testFeatures = await service.extractImageFeatures(testImage);

      (prisma.imageHash.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'hash-1',
          mediaId: 'media-1',
          pHash: testFeatures.pHash,
          dominantColors: testFeatures.dominantColors,
          aspectRatio: testFeatures.aspectRatio,
          brightness: testFeatures.brightness,
          media: {
            id: 'media-1',
            url: 'https://example.com/image1.jpg',
            property: {
              id: 'prop-1',
              title: 'Test Property',
              city: 'Budapest',
              country: 'Hungary',
              listingTypes: [ListingType.FOR_SALE],
              basePrice: { toNumber: () => 100000 },
              currency: 'EUR',
              squareMeters: 100,
              bedrooms: 3,
              bathrooms: 2,
              status: PropertyStatus.ACTIVE,
            },
          },
        },
      ]);

      const result = await service.findSimilarProperties(testImage, {});

      expect(result.results[0].explanation).toBeDefined();
      expect(typeof result.results[0].explanation).toBe('string');
    });
  });

  // ============================================
  // INDEX PROPERTY IMAGES TESTS
  // ============================================

  describe('indexPropertyImages', () => {
    it('should skip already indexed images', async () => {
      (prisma.propertyMedia.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'media-1',
          url: 'https://example.com/image1.jpg',
          imageHash: { id: 'existing-hash' },
        },
      ]);

      const result = await service.indexPropertyImages('prop-1');

      expect(result.indexedCount).toBe(1);
      expect(result.failedCount).toBe(0);
      expect(prisma.imageHash.create).not.toHaveBeenCalled();
    });

    it('should return empty result for property with no photos', async () => {
      (prisma.propertyMedia.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.indexPropertyImages('prop-1');

      expect(result.indexedCount).toBe(0);
      expect(result.failedCount).toBe(0);
      expect(result.indexedMediaIds).toHaveLength(0);
    });
  });

  // ============================================
  // GET INDEXING STATS TESTS
  // ============================================

  describe('getIndexingStats', () => {
    it('should return correct statistics', async () => {
      (prisma.propertyMedia.count as jest.Mock).mockResolvedValue(100);
      (prisma.imageHash.count as jest.Mock).mockResolvedValue(75);

      const stats = await service.getIndexingStats();

      expect(stats.totalMedia).toBe(100);
      expect(stats.indexedMedia).toBe(75);
      expect(stats.unindexedMedia).toBe(25);
      expect(stats.indexedPercentage).toBe(75);
    });

    it('should handle zero media', async () => {
      (prisma.propertyMedia.count as jest.Mock).mockResolvedValue(0);
      (prisma.imageHash.count as jest.Mock).mockResolvedValue(0);

      const stats = await service.getIndexingStats();

      expect(stats.totalMedia).toBe(0);
      expect(stats.indexedPercentage).toBe(0);
    });
  });

  // ============================================
  // IS IMAGE INDEXED TESTS
  // ============================================

  describe('isImageIndexed', () => {
    it('should return true for indexed image', async () => {
      (prisma.imageHash.findUnique as jest.Mock).mockResolvedValue({
        id: 'hash-1',
        mediaId: 'media-1',
      });

      const result = await service.isImageIndexed('media-1');
      expect(result).toBe(true);
    });

    it('should return false for non-indexed image', async () => {
      (prisma.imageHash.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.isImageIndexed('media-1');
      expect(result).toBe(false);
    });
  });
});
