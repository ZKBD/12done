import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PropertyStatus, UserRole, Prisma } from '@prisma/client';
import { AvailabilityService } from './availability.service';
import { PrismaService } from '@/database';

describe('AvailabilityService', () => {
  let service: AvailabilityService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockProperty = {
    id: 'property-123',
    ownerId: 'owner-123',
    status: PropertyStatus.ACTIVE,
    basePrice: new Prisma.Decimal('100'),
    currency: 'EUR',
    dynamicPricingEnabled: false,
  };

  const mockSlot = {
    id: 'slot-123',
    propertyId: 'property-123',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-01-07'),
    isAvailable: true,
    pricePerNight: new Prisma.Decimal('120'),
    notes: 'Holiday rates',
    createdAt: new Date(),
  };

  const mockDynamicPricingRule = {
    id: 'rule-123',
    propertyId: 'property-123',
    name: 'Weekend Premium',
    priceMultiplier: new Prisma.Decimal('1.5'),
    dayOfWeek: 6, // Saturday
    startDate: null,
    endDate: null,
    isActive: true,
    priority: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilityService,
        {
          provide: PrismaService,
          useValue: {
            property: {
              findUnique: jest.fn(),
            },
            availabilitySlot: {
              create: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<AvailabilityService>(AvailabilityService);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSlot', () => {
    const createDto = {
      startDate: '2025-02-01',
      endDate: '2025-02-07',
      isAvailable: true,
      pricePerNight: '150',
    };

    it('should throw NotFoundException if property not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createSlot('property-123', createDto, 'owner-123', UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-owner non-admin', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);

      await expect(
        service.createSlot('property-123', createDto, 'other-user', UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for deleted property', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue({
        ...mockProperty,
        status: PropertyStatus.DELETED,
      });

      await expect(
        service.createSlot('property-123', createDto, 'owner-123', UserRole.USER),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if end date is before start date', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);

      await expect(
        service.createSlot(
          'property-123',
          { ...createDto, startDate: '2025-02-07', endDate: '2025-02-01' },
          'owner-123',
          UserRole.USER,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for overlapping slots', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.availabilitySlot.findFirst as jest.Mock).mockResolvedValue(mockSlot);

      await expect(
        service.createSlot('property-123', createDto, 'owner-123', UserRole.USER),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create slot successfully', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.availabilitySlot.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.availabilitySlot.create as jest.Mock).mockResolvedValue(mockSlot);

      const result = await service.createSlot(
        'property-123',
        createDto,
        'owner-123',
        UserRole.USER,
      );

      expect(result.id).toBe(mockSlot.id);
      expect(result.isAvailable).toBe(true);
      expect(prismaService.availabilitySlot.create).toHaveBeenCalled();
    });

    it('should allow admin to create slot for any property', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.availabilitySlot.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.availabilitySlot.create as jest.Mock).mockResolvedValue(mockSlot);

      const result = await service.createSlot(
        'property-123',
        createDto,
        'admin-123',
        UserRole.ADMIN,
      );

      expect(result.id).toBe(mockSlot.id);
    });

    it('should use default isAvailable when not provided', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.availabilitySlot.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.availabilitySlot.create as jest.Mock).mockResolvedValue(mockSlot);

      await service.createSlot(
        'property-123',
        { startDate: '2025-02-01', endDate: '2025-02-07' },
        'owner-123',
        UserRole.USER,
      );

      expect(prismaService.availabilitySlot.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isAvailable: true,
          }),
        }),
      );
    });
  });

  describe('createBulkSlots', () => {
    const bulkDto = {
      slots: [
        { startDate: '2025-02-01', endDate: '2025-02-07' },
        { startDate: '2025-02-08', endDate: '2025-02-14' },
      ],
    };

    it('should create multiple slots', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.availabilitySlot.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.availabilitySlot.create as jest.Mock)
        .mockResolvedValueOnce({ ...mockSlot, id: 'slot-1' })
        .mockResolvedValueOnce({ ...mockSlot, id: 'slot-2' });

      const result = await service.createBulkSlots(
        'property-123',
        bulkDto,
        'owner-123',
        UserRole.USER,
      );

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('slot-1');
      expect(result[1].id).toBe('slot-2');
    });

    it('should throw on first invalid slot', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.availabilitySlot.findFirst as jest.Mock).mockResolvedValue(mockSlot);

      await expect(
        service.createBulkSlots('property-123', bulkDto, 'owner-123', UserRole.USER),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getSlots', () => {
    it('should throw NotFoundException if property not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getSlots('property-123', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for deleted property', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue({
        ...mockProperty,
        status: PropertyStatus.DELETED,
      });

      await expect(service.getSlots('property-123', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return all slots for property', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.availabilitySlot.findMany as jest.Mock).mockResolvedValue([mockSlot]);

      const result = await service.getSlots('property-123', {});

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockSlot.id);
    });

    it('should filter by startDate', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.availabilitySlot.findMany as jest.Mock).mockResolvedValue([]);

      await service.getSlots('property-123', { startDate: '2025-01-01' });

      expect(prismaService.availabilitySlot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            endDate: { gte: expect.any(Date) },
          }),
        }),
      );
    });

    it('should filter by endDate', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.availabilitySlot.findMany as jest.Mock).mockResolvedValue([]);

      await service.getSlots('property-123', { endDate: '2025-12-31' });

      expect(prismaService.availabilitySlot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            startDate: { lte: expect.any(Date) },
          }),
        }),
      );
    });

    it('should order slots by startDate ascending', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.availabilitySlot.findMany as jest.Mock).mockResolvedValue([]);

      await service.getSlots('property-123', {});

      expect(prismaService.availabilitySlot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { startDate: 'asc' },
        }),
      );
    });
  });

  describe('updateSlot', () => {
    const updateDto = { isAvailable: false, pricePerNight: '200' };

    it('should throw NotFoundException if property not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateSlot('property-123', 'slot-123', updateDto, 'owner-123', UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-owner', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);

      await expect(
        service.updateSlot('property-123', 'slot-123', updateDto, 'other-user', UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if slot not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.availabilitySlot.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateSlot('property-123', 'slot-123', updateDto, 'owner-123', UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update slot successfully', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.availabilitySlot.findFirst as jest.Mock).mockResolvedValue(mockSlot);
      (prismaService.availabilitySlot.update as jest.Mock).mockResolvedValue({
        ...mockSlot,
        isAvailable: false,
        pricePerNight: new Prisma.Decimal('200'),
      });

      const result = await service.updateSlot(
        'property-123',
        'slot-123',
        updateDto,
        'owner-123',
        UserRole.USER,
      );

      expect(result.isAvailable).toBe(false);
      expect(result.pricePerNight).toBe('200');
    });

    it('should update only provided fields', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.availabilitySlot.findFirst as jest.Mock).mockResolvedValue(mockSlot);
      (prismaService.availabilitySlot.update as jest.Mock).mockResolvedValue(mockSlot);

      await service.updateSlot(
        'property-123',
        'slot-123',
        { notes: 'Updated notes' },
        'owner-123',
        UserRole.USER,
      );

      expect(prismaService.availabilitySlot.update).toHaveBeenCalledWith({
        where: { id: 'slot-123' },
        data: { notes: 'Updated notes' },
      });
    });
  });

  describe('deleteSlot', () => {
    it('should throw NotFoundException if property not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.deleteSlot('property-123', 'slot-123', 'owner-123', UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-owner', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);

      await expect(
        service.deleteSlot('property-123', 'slot-123', 'other-user', UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if slot not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.availabilitySlot.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.deleteSlot('property-123', 'slot-123', 'owner-123', UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should delete slot successfully', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.availabilitySlot.findFirst as jest.Mock).mockResolvedValue(mockSlot);
      (prismaService.availabilitySlot.delete as jest.Mock).mockResolvedValue(mockSlot);

      const result = await service.deleteSlot(
        'property-123',
        'slot-123',
        'owner-123',
        UserRole.USER,
      );

      expect(result.message).toContain('deleted');
      expect(prismaService.availabilitySlot.delete).toHaveBeenCalledWith({
        where: { id: 'slot-123' },
      });
    });

    it('should allow admin to delete slot', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.availabilitySlot.findFirst as jest.Mock).mockResolvedValue(mockSlot);
      (prismaService.availabilitySlot.delete as jest.Mock).mockResolvedValue(mockSlot);

      const result = await service.deleteSlot(
        'property-123',
        'slot-123',
        'admin-123',
        UserRole.ADMIN,
      );

      expect(result.message).toContain('deleted');
    });
  });

  describe('calculateCost', () => {
    const calculateDto = {
      checkIn: '2025-01-01',
      checkOut: '2025-01-03',
    };

    it('should throw NotFoundException if property not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.calculateCost('property-123', calculateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for deleted property', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue({
        ...mockProperty,
        status: PropertyStatus.DELETED,
        dynamicPricingRules: [],
        availabilitySlots: [],
      });

      await expect(
        service.calculateCost('property-123', calculateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if checkout before checkin', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue({
        ...mockProperty,
        dynamicPricingRules: [],
        availabilitySlots: [],
      });

      await expect(
        service.calculateCost('property-123', {
          checkIn: '2025-01-05',
          checkOut: '2025-01-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should calculate cost for 2 nights', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue({
        ...mockProperty,
        dynamicPricingRules: [],
        availabilitySlots: [],
      });

      const result = await service.calculateCost('property-123', calculateDto);

      expect(result.nights).toBe(2);
      expect(result.subtotal).toBe('200.00');
      expect(result.currency).toBe('EUR');
      expect(result.breakdown).toHaveLength(2);
    });

    it('should use slot pricing when available', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue({
        ...mockProperty,
        dynamicPricingRules: [],
        availabilitySlots: [
          {
            ...mockSlot,
            pricePerNight: new Prisma.Decimal('150'),
          },
        ],
      });

      const result = await service.calculateCost('property-123', calculateDto);

      expect(result.breakdown[0].basePrice).toBe('150');
    });

    it('should apply dynamic pricing rules', async () => {
      // Saturday is day 6 - let's use a date range that includes Saturday
      const saturdayDto = {
        checkIn: '2025-01-04', // Saturday
        checkOut: '2025-01-05', // Sunday
      };

      (prismaService.property.findUnique as jest.Mock).mockResolvedValue({
        ...mockProperty,
        dynamicPricingEnabled: true,
        dynamicPricingRules: [mockDynamicPricingRule],
        availabilitySlots: [],
      });

      const result = await service.calculateCost('property-123', saturdayDto);

      expect(result.breakdown[0].multiplier).toBe('1.5');
      expect(result.breakdown[0].appliedRule).toBe('Weekend Premium');
      expect(result.breakdown[0].finalPrice).toBe('150.00');
    });

    it('should apply date-based dynamic pricing rules', async () => {
      const holidayRule = {
        id: 'rule-holiday',
        propertyId: 'property-123',
        name: 'Holiday Season',
        priceMultiplier: new Prisma.Decimal('2'),
        dayOfWeek: null,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-10'),
        isActive: true,
        priority: 2,
      };

      (prismaService.property.findUnique as jest.Mock).mockResolvedValue({
        ...mockProperty,
        dynamicPricingEnabled: true,
        dynamicPricingRules: [holidayRule],
        availabilitySlots: [],
      });

      const result = await service.calculateCost('property-123', calculateDto);

      expect(result.breakdown[0].multiplier).toBe('2');
      expect(result.breakdown[0].appliedRule).toBe('Holiday Season');
    });

    it('should not apply dynamic pricing when disabled', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue({
        ...mockProperty,
        dynamicPricingEnabled: false,
        dynamicPricingRules: [mockDynamicPricingRule],
        availabilitySlots: [],
      });

      const result = await service.calculateCost('property-123', {
        checkIn: '2025-01-04',
        checkOut: '2025-01-05',
      });

      expect(result.breakdown[0].multiplier).toBe('1');
      expect(result.breakdown[0].appliedRule).toBeUndefined();
    });

    it('should return correct dates in response', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue({
        ...mockProperty,
        dynamicPricingRules: [],
        availabilitySlots: [],
      });

      const result = await service.calculateCost('property-123', calculateDto);

      expect(result.checkIn).toEqual(new Date('2025-01-01'));
      expect(result.checkOut).toEqual(new Date('2025-01-03'));
    });

    it('should include base price per night in response', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue({
        ...mockProperty,
        dynamicPricingRules: [],
        availabilitySlots: [],
      });

      const result = await service.calculateCost('property-123', calculateDto);

      expect(result.basePricePerNight).toBe('100');
    });
  });

  describe('response mapping', () => {
    it('should correctly map slot to response DTO', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.availabilitySlot.findMany as jest.Mock).mockResolvedValue([mockSlot]);

      const result = await service.getSlots('property-123', {});

      expect(result[0].id).toBe(mockSlot.id);
      expect(result[0].propertyId).toBe(mockSlot.propertyId);
      expect(result[0].startDate).toEqual(mockSlot.startDate);
      expect(result[0].endDate).toEqual(mockSlot.endDate);
      expect(result[0].isAvailable).toBe(mockSlot.isAvailable);
      expect(result[0].pricePerNight).toBe('120');
      expect(result[0].notes).toBe('Holiday rates');
    });

    it('should handle null pricePerNight', async () => {
      const slotWithoutPrice = { ...mockSlot, pricePerNight: null };
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.availabilitySlot.findMany as jest.Mock).mockResolvedValue([slotWithoutPrice]);

      const result = await service.getSlots('property-123', {});

      expect(result[0].pricePerNight).toBeUndefined();
    });

    it('should handle null notes', async () => {
      const slotWithoutNotes = { ...mockSlot, notes: null };
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.availabilitySlot.findMany as jest.Mock).mockResolvedValue([slotWithoutNotes]);

      const result = await service.getSlots('property-123', {});

      expect(result[0].notes).toBeUndefined();
    });
  });
});
