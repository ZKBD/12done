import { Test, TestingModule } from '@nestjs/testing';
import { ToursService } from './tours.service';
import { PoiService } from './poi.service';
import { PrismaService } from '@/database/prisma.service';
import { PoiType } from '@prisma/client';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

describe('ToursService', () => {
  let service: ToursService;
  let prismaService: jest.Mocked<PrismaService>;
  let poiService: jest.Mocked<PoiService>;

  const mockPrismaService = {
    customTour: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    tourStop: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockPoiService = {
    calculateDistance: jest.fn().mockReturnValue(500),
  };

  const mockStop = {
    id: 'stop-1',
    tourId: 'tour-123',
    placeId: 'place-1',
    placeName: 'Stop 1',
    placeType: PoiType.LANDMARK,
    latitude: 47.4979,
    longitude: 19.0402,
    address: '123 Test St',
    orderIndex: 0,
    arrivalDuration: null,
    stayDuration: 15,
    customNarration: null,
    createdAt: new Date(),
  };

  const mockTour = {
    id: 'tour-123',
    userId: 'user-123',
    name: 'Test Tour',
    description: 'A test tour',
    isPublic: false,
    estimatedDuration: 60,
    totalDistance: 2000,
    createdAt: new Date(),
    updatedAt: new Date(),
    stops: [mockStop],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ToursService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: PoiService,
          useValue: mockPoiService,
        },
      ],
    }).compile();

    service = module.get<ToursService>(ToursService);
    prismaService = module.get(PrismaService);
    poiService = module.get(PoiService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTour', () => {
    it('should create a new tour with stops', async () => {
      mockPrismaService.customTour.create.mockResolvedValue(mockTour);

      const result = await service.createTour('user-123', {
        name: 'Test Tour',
        description: 'A test tour',
        stops: [
          {
            placeId: 'place-1',
            placeName: 'Stop 1',
            latitude: 47.4979,
            longitude: 19.0402,
          },
        ],
      });

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Tour');
      expect(mockPrismaService.customTour.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException for empty stops', async () => {
      await expect(
        service.createTour('user-123', {
          name: 'Test Tour',
          stops: [],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUserTours', () => {
    it('should return user tours', async () => {
      mockPrismaService.customTour.findMany.mockResolvedValue([mockTour]);

      const result = await service.getUserTours('user-123');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Tour');
    });

    it('should apply limit and offset', async () => {
      mockPrismaService.customTour.findMany.mockResolvedValue([]);

      await service.getUserTours('user-123', { limit: 10, offset: 5 });

      expect(mockPrismaService.customTour.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 5,
        }),
      );
    });
  });

  describe('getPublicTours', () => {
    it('should return public tours', async () => {
      mockPrismaService.customTour.findMany.mockResolvedValue([
        { ...mockTour, isPublic: true },
      ]);

      const result = await service.getPublicTours();

      expect(result).toHaveLength(1);
      expect(result[0].isPublic).toBe(true);
    });
  });

  describe('getTour', () => {
    it('should return a tour by ID', async () => {
      mockPrismaService.customTour.findUnique.mockResolvedValue(mockTour);

      const result = await service.getTour('tour-123', 'user-123');

      expect(result.id).toBe('tour-123');
    });

    it('should throw NotFoundException if tour not found', async () => {
      mockPrismaService.customTour.findUnique.mockResolvedValue(null);

      await expect(
        service.getTour('non-existent', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for private tour accessed by non-owner', async () => {
      mockPrismaService.customTour.findUnique.mockResolvedValue({
        ...mockTour,
        isPublic: false,
        userId: 'other-user',
      });

      await expect(
        service.getTour('tour-123', 'user-123'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow access to public tours by non-owner', async () => {
      mockPrismaService.customTour.findUnique.mockResolvedValue({
        ...mockTour,
        isPublic: true,
        userId: 'other-user',
      });

      const result = await service.getTour('tour-123', 'user-123');

      expect(result).toBeDefined();
    });
  });

  describe('updateTour', () => {
    it('should update tour details', async () => {
      mockPrismaService.customTour.findUnique.mockResolvedValue(mockTour);
      mockPrismaService.customTour.update.mockResolvedValue({
        ...mockTour,
        name: 'Updated Tour',
      });

      const result = await service.updateTour('user-123', 'tour-123', {
        name: 'Updated Tour',
      });

      expect(result.name).toBe('Updated Tour');
    });

    it('should throw ForbiddenException if not owner', async () => {
      mockPrismaService.customTour.findUnique.mockResolvedValue({
        ...mockTour,
        userId: 'other-user',
      });

      await expect(
        service.updateTour('user-123', 'tour-123', { name: 'New Name' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('addStop', () => {
    it('should add a stop to tour', async () => {
      mockPrismaService.customTour.findUnique
        .mockResolvedValueOnce({ ...mockTour, stops: [mockStop] })
        .mockResolvedValueOnce({ ...mockTour, stops: [mockStop, { ...mockStop, id: 'stop-2' }] });
      mockPrismaService.tourStop.create.mockResolvedValue({ ...mockStop, id: 'stop-2' });
      mockPrismaService.tourStop.findMany.mockResolvedValue([mockStop, { ...mockStop, id: 'stop-2' }]);
      mockPrismaService.tourStop.update.mockResolvedValue({});
      mockPrismaService.customTour.update.mockResolvedValue(mockTour);

      const result = await service.addStop('user-123', 'tour-123', {
        placeId: 'place-2',
        placeName: 'Stop 2',
        latitude: 47.5,
        longitude: 19.05,
      });

      expect(mockPrismaService.tourStop.create).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if not owner', async () => {
      mockPrismaService.customTour.findUnique.mockResolvedValue({
        ...mockTour,
        userId: 'other-user',
      });

      await expect(
        service.addStop('user-123', 'tour-123', {
          placeId: 'place-2',
          placeName: 'Stop 2',
          latitude: 47.5,
          longitude: 19.05,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('removeStop', () => {
    it('should remove a stop from tour', async () => {
      mockPrismaService.customTour.findUnique
        .mockResolvedValueOnce({ ...mockTour, stops: [mockStop] })
        .mockResolvedValueOnce({ ...mockTour, stops: [] });
      mockPrismaService.tourStop.delete.mockResolvedValue(mockStop);
      mockPrismaService.tourStop.findMany.mockResolvedValue([]);
      mockPrismaService.customTour.update.mockResolvedValue({ ...mockTour, stops: [] });

      const result = await service.removeStop('user-123', 'tour-123', 'stop-1');

      expect(mockPrismaService.tourStop.delete).toHaveBeenCalled();
    });

    it('should throw NotFoundException if stop not in tour', async () => {
      mockPrismaService.customTour.findUnique.mockResolvedValue({
        ...mockTour,
        stops: [],
      });

      await expect(
        service.removeStop('user-123', 'tour-123', 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('reorderStops', () => {
    it('should reorder tour stops', async () => {
      const stops = [
        { ...mockStop, id: 'stop-1', orderIndex: 0 },
        { ...mockStop, id: 'stop-2', orderIndex: 1 },
      ];
      mockPrismaService.customTour.findUnique
        .mockResolvedValueOnce({ ...mockTour, stops })
        .mockResolvedValueOnce({ ...mockTour, stops: stops.reverse() });
      mockPrismaService.$transaction.mockResolvedValue([]);
      mockPrismaService.tourStop.findMany.mockResolvedValue(stops);
      mockPrismaService.tourStop.update.mockResolvedValue({});
      mockPrismaService.customTour.update.mockResolvedValue(mockTour);

      const result = await service.reorderStops('user-123', 'tour-123', {
        stopIds: ['stop-2', 'stop-1'],
      });

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid stop ID', async () => {
      mockPrismaService.customTour.findUnique.mockResolvedValue({
        ...mockTour,
        stops: [mockStop],
      });

      await expect(
        service.reorderStops('user-123', 'tour-123', {
          stopIds: ['non-existent'],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteTour', () => {
    it('should delete a tour', async () => {
      mockPrismaService.customTour.findUnique.mockResolvedValue(mockTour);
      mockPrismaService.customTour.delete.mockResolvedValue(mockTour);

      await expect(
        service.deleteTour('user-123', 'tour-123'),
      ).resolves.not.toThrow();

      expect(mockPrismaService.customTour.delete).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if not owner', async () => {
      mockPrismaService.customTour.findUnique.mockResolvedValue({
        ...mockTour,
        userId: 'other-user',
      });

      await expect(
        service.deleteTour('user-123', 'tour-123'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
