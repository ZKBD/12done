import { Test, TestingModule } from '@nestjs/testing';
import { AttractionService } from './attraction.service';
import { PrismaService } from '../../../database/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AttractionCategory, AttractionBookingStatus } from '../dto';

describe('AttractionService', () => {
  let service: AttractionService;
  let prisma: PrismaService;

  const mockUserId = 'user-123';
  const mockAttractionId = 'attraction-123';
  const mockBookingId = 'booking-123';

  // Mock data matches Prisma schema field names
  const mockAttraction = {
    id: mockAttractionId,
    name: 'Sagrada Familia',
    description: 'Famous basilica designed by Gaudi',
    category: AttractionCategory.MONUMENT, // Uses AttractionCategory
    address: 'Carrer de Mallorca, 401',
    city: 'Barcelona',
    country: 'ES',
    latitude: 41.4036,
    longitude: 2.1744,
    website: 'https://sagradafamilia.org',
    phone: '+34 932 08 04 14',
    openingHours: { mon: '09:00-20:00' },
    imageUrl: 'https://example.com/image.jpg',
    imageUrls: ['https://example.com/image.jpg'],
    rating: 4.8,
    reviewCount: 15000,
    priceLevel: 3,
    estimatedDuration: 120, // Prisma field (not durationMinutes)
    features: ['architecture', 'gaudi', 'modernism'], // Prisma field (not tags)
    // No isBookable in schema
    // No bookingUrl in schema
    googlePlaceId: null,
    tripAdvisorId: 'ta-123', // Prisma field (not externalSource/externalId)
    // No isActive in schema
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Future date for testing (30 days from now)
  const futureBookingDate = new Date();
  futureBookingDate.setDate(futureBookingDate.getDate() + 30);
  const futureBookingDateString = futureBookingDate.toISOString().split('T')[0];

  const mockBooking = {
    id: mockBookingId,
    userId: mockUserId,
    attractionId: mockAttractionId,
    bookingDate: futureBookingDate,
    bookingTime: new Date('1970-01-01T10:00:00'), // Prisma field (DateTime, not timeSlot string)
    numberOfGuests: 2,
    // No adults/children in schema
    ticketType: 'standard',
    notes: null, // Prisma field (not specialRequests)
    // No tripDayId in schema
    totalPrice: 52,
    currency: 'EUR',
    status: AttractionBookingStatus.PENDING,
    confirmationCode: null,
    externalBookingId: null,
    // No contactName/contactEmail/contactPhone in schema
    confirmedAt: null,
    cancelledAt: null,
    // No cancellationReason in schema
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    attraction: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    attractionBooking: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    property: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttractionService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AttractionService>(AttractionService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('searchAttractions', () => {
    it('should search attractions', async () => {
      mockPrismaService.attraction.findMany.mockResolvedValue([mockAttraction]);
      mockPrismaService.attraction.count.mockResolvedValue(1);

      const result = await service.searchAttractions({});

      expect(result.attractions).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by categories', async () => {
      mockPrismaService.attraction.findMany.mockResolvedValue([mockAttraction]);
      mockPrismaService.attraction.count.mockResolvedValue(1);

      await service.searchAttractions({
        categories: [AttractionCategory.MONUMENT],
      });

      expect(mockPrismaService.attraction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: { in: [AttractionCategory.MONUMENT] },
          }),
        }),
      );
    });

    it('should filter by minimum rating', async () => {
      mockPrismaService.attraction.findMany.mockResolvedValue([mockAttraction]);
      mockPrismaService.attraction.count.mockResolvedValue(1);

      await service.searchAttractions({ minRating: 4.5 });

      expect(mockPrismaService.attraction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            rating: { gte: 4.5 },
          }),
        }),
      );
    });

    it('should filter by maximum price level', async () => {
      mockPrismaService.attraction.findMany.mockResolvedValue([mockAttraction]);
      mockPrismaService.attraction.count.mockResolvedValue(1);

      await service.searchAttractions({ maxPriceLevel: 3 });

      expect(mockPrismaService.attraction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            priceLevel: { lte: 3 },
          }),
        }),
      );
    });

    it('should search by query text', async () => {
      mockPrismaService.attraction.findMany.mockResolvedValue([mockAttraction]);
      mockPrismaService.attraction.count.mockResolvedValue(1);

      await service.searchAttractions({ query: 'sagrada' });

      expect(mockPrismaService.attraction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        }),
      );
    });

    it('should calculate distance when coordinates provided', async () => {
      mockPrismaService.attraction.findMany.mockResolvedValue([mockAttraction]);
      mockPrismaService.attraction.count.mockResolvedValue(1);

      const result = await service.searchAttractions({
        latitude: 41.4,
        longitude: 2.17,
        radiusKm: 10,
      });

      expect(result.attractions[0].distance).toBeDefined();
    });

    it('should use property coordinates if provided', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue({
        id: 'prop-1',
        latitude: 41.4,
        longitude: 2.17,
      });
      mockPrismaService.attraction.findMany.mockResolvedValue([mockAttraction]);
      mockPrismaService.attraction.count.mockResolvedValue(1);

      const result = await service.searchAttractions({
        propertyId: 'prop-1',
      });

      expect(result.attractions[0].distance).toBeDefined();
    });
  });

  describe('getAttraction', () => {
    it('should return attraction by ID', async () => {
      mockPrismaService.attraction.findUnique.mockResolvedValue(mockAttraction);

      const result = await service.getAttraction(mockAttractionId);

      expect(result.name).toBe('Sagrada Familia');
    });

    it('should throw NotFoundException for invalid attraction', async () => {
      mockPrismaService.attraction.findUnique.mockResolvedValue(null);

      await expect(
        service.getAttraction('invalid'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAttractionsByCategory', () => {
    it('should return attractions by category', async () => {
      mockPrismaService.attraction.findMany.mockResolvedValue([mockAttraction]);

      const result = await service.getAttractionsByCategory('MONUMENT');

      expect(result).toHaveLength(1);
    });

    it('should filter by city', async () => {
      mockPrismaService.attraction.findMany.mockResolvedValue([]);

      await service.getAttractionsByCategory('MONUMENT', { city: 'Barcelona' });

      expect(mockPrismaService.attraction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            city: { contains: 'Barcelona', mode: 'insensitive' },
          }),
        }),
      );
    });
  });

  describe('createAttraction', () => {
    it('should create attraction', async () => {
      mockPrismaService.attraction.create.mockResolvedValue(mockAttraction);

      const result = await service.createAttraction({
        name: 'Sagrada Familia',
        category: AttractionCategory.MONUMENT,
        address: 'Carrer de Mallorca, 401',
        city: 'Barcelona',
        country: 'ES',
        latitude: 41.4036,
        longitude: 2.1744,
      });

      expect(result.name).toBe('Sagrada Familia');
    });
  });

  describe('updateAttraction', () => {
    it('should update attraction', async () => {
      mockPrismaService.attraction.findUnique.mockResolvedValue(mockAttraction);
      mockPrismaService.attraction.update.mockResolvedValue({
        ...mockAttraction,
        name: 'Updated Name',
      });

      const result = await service.updateAttraction(mockAttractionId, {
        name: 'Updated Name',
      });

      expect(result.name).toBe('Updated Name');
    });

    it('should throw NotFoundException for invalid attraction', async () => {
      mockPrismaService.attraction.findUnique.mockResolvedValue(null);

      await expect(
        service.updateAttraction('invalid', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('syncFromExternalSource', () => {
    it('should create new attractions', async () => {
      mockPrismaService.attraction.findFirst.mockResolvedValue(null);
      mockPrismaService.attraction.create.mockResolvedValue(mockAttraction);

      const result = await service.syncFromExternalSource('tripadvisor', [
        {
          name: 'Sagrada Familia',
          category: AttractionCategory.MONUMENT,
          address: 'Carrer de Mallorca, 401',
          city: 'Barcelona',
          country: 'ES',
          latitude: 41.4036,
          longitude: 2.1744,
          externalId: 'ta-123',
        },
      ]);

      expect(result.created).toBe(1);
      expect(result.updated).toBe(0);
    });

    it('should update existing attractions', async () => {
      mockPrismaService.attraction.findFirst.mockResolvedValue(mockAttraction);
      mockPrismaService.attraction.update.mockResolvedValue(mockAttraction);

      const result = await service.syncFromExternalSource('tripadvisor', [
        {
          name: 'Sagrada Familia Updated',
          category: AttractionCategory.MONUMENT,
          address: 'Carrer de Mallorca, 401',
          city: 'Barcelona',
          country: 'ES',
          latitude: 41.4036,
          longitude: 2.1744,
          externalId: 'ta-123',
        },
      ]);

      expect(result.created).toBe(0);
      expect(result.updated).toBe(1);
    });
  });

  describe('createBooking', () => {
    it('should create booking', async () => {
      mockPrismaService.attraction.findUnique.mockResolvedValue(mockAttraction);
      mockPrismaService.attractionBooking.create.mockResolvedValue({
        ...mockBooking,
        attraction: mockAttraction,
      });

      const result = await service.createBooking(mockUserId, {
        attractionId: mockAttractionId,
        bookingDate: futureBookingDateString,
        numberOfGuests: 2,
      });

      expect(result.numberOfGuests).toBe(2);
    });

    it('should throw NotFoundException for invalid attraction', async () => {
      mockPrismaService.attraction.findUnique.mockResolvedValue(null);

      await expect(
        service.createBooking(mockUserId, {
          attractionId: 'invalid',
          bookingDate: futureBookingDateString,
          numberOfGuests: 2,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for past date', async () => {
      mockPrismaService.attraction.findUnique.mockResolvedValue(mockAttraction);

      await expect(
        service.createBooking(mockUserId, {
          attractionId: mockAttractionId,
          bookingDate: '2020-01-01',
          numberOfGuests: 2,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getBooking', () => {
    it('should return booking by ID', async () => {
      mockPrismaService.attractionBooking.findFirst.mockResolvedValue({
        ...mockBooking,
        attraction: mockAttraction,
      });

      const result = await service.getBooking(mockUserId, mockBookingId);

      expect(result.id).toBe(mockBookingId);
    });

    it('should throw NotFoundException for invalid booking', async () => {
      mockPrismaService.attractionBooking.findFirst.mockResolvedValue(null);

      await expect(
        service.getBooking(mockUserId, 'invalid'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserBookings', () => {
    it('should return user bookings', async () => {
      mockPrismaService.attractionBooking.findMany.mockResolvedValue([
        { ...mockBooking, attraction: mockAttraction },
      ]);

      const result = await service.getUserBookings(mockUserId);

      expect(result).toHaveLength(1);
    });

    it('should filter by status', async () => {
      mockPrismaService.attractionBooking.findMany.mockResolvedValue([]);

      await service.getUserBookings(mockUserId, {
        status: AttractionBookingStatus.CONFIRMED,
      });

      expect(mockPrismaService.attractionBooking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: AttractionBookingStatus.CONFIRMED,
          }),
        }),
      );
    });
  });

  describe('updateBooking', () => {
    it('should update booking', async () => {
      mockPrismaService.attractionBooking.findFirst.mockResolvedValue(mockBooking);
      mockPrismaService.attractionBooking.update.mockResolvedValue({
        ...mockBooking,
        numberOfGuests: 4,
        attraction: mockAttraction,
      });

      const result = await service.updateBooking(mockUserId, mockBookingId, {
        numberOfGuests: 4,
      });

      expect(result.numberOfGuests).toBe(4);
    });

    it('should throw BadRequestException for non-pending booking', async () => {
      mockPrismaService.attractionBooking.findFirst.mockResolvedValue({
        ...mockBooking,
        status: AttractionBookingStatus.CONFIRMED,
      });

      await expect(
        service.updateBooking(mockUserId, mockBookingId, { numberOfGuests: 4 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelBooking', () => {
    it('should cancel booking', async () => {
      mockPrismaService.attractionBooking.findFirst.mockResolvedValue(mockBooking);
      mockPrismaService.attractionBooking.update.mockResolvedValue({
        ...mockBooking,
        status: AttractionBookingStatus.CANCELLED,
        cancelledAt: new Date(),
        attraction: mockAttraction,
      });

      const result = await service.cancelBooking(
        mockUserId,
        mockBookingId,
        'Changed plans',
      );

      expect(result.status).toBe(AttractionBookingStatus.CANCELLED);
    });

    it('should throw BadRequestException for completed booking', async () => {
      mockPrismaService.attractionBooking.findFirst.mockResolvedValue({
        ...mockBooking,
        status: AttractionBookingStatus.COMPLETED,
      });

      await expect(
        service.cancelBooking(mockUserId, mockBookingId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('confirmBooking', () => {
    it('should confirm booking', async () => {
      mockPrismaService.attractionBooking.findUnique.mockResolvedValue(mockBooking);
      mockPrismaService.attractionBooking.update.mockResolvedValue({
        ...mockBooking,
        status: AttractionBookingStatus.CONFIRMED,
        confirmationCode: 'CONF-123',
        attraction: mockAttraction,
      });

      const result = await service.confirmBooking(
        mockBookingId,
        'CONF-123',
        'EXT-456',
        52,
      );

      expect(result.status).toBe(AttractionBookingStatus.CONFIRMED);
      expect(result.confirmationCode).toBe('CONF-123');
    });
  });

  describe('getAvailableTimeSlots', () => {
    it('should return time slots', async () => {
      mockPrismaService.attraction.findUnique.mockResolvedValue(mockAttraction);

      const result = await service.getAvailableTimeSlots(
        mockAttractionId,
        '2024-12-15',
      );

      expect(result.length).toBeGreaterThan(0);
    });

    it('should return more slots on weekends', async () => {
      mockPrismaService.attraction.findUnique.mockResolvedValue(mockAttraction);

      // Sunday
      const weekendSlots = await service.getAvailableTimeSlots(
        mockAttractionId,
        '2024-12-15',
      );

      // Weekday
      const weekdaySlots = await service.getAvailableTimeSlots(
        mockAttractionId,
        '2024-12-16',
      );

      expect(weekendSlots.length).toBeGreaterThan(weekdaySlots.length);
    });

    it('should throw NotFoundException for invalid attraction', async () => {
      mockPrismaService.attraction.findUnique.mockResolvedValue(null);

      await expect(
        service.getAvailableTimeSlots('invalid', '2024-12-15'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
