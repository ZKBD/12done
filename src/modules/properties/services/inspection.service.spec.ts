import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PropertyStatus, UserRole, NotificationType } from '@prisma/client';
import { InspectionService } from './inspection.service';
import { PrismaService } from '@/database';
import { NotificationsService } from '@/modules/notifications/notifications.service';

describe('InspectionService', () => {
  let service: InspectionService;
  let prismaService: jest.Mocked<PrismaService>;
  let notificationsService: jest.Mocked<NotificationsService>;

  const mockProperty = {
    id: 'property-123',
    ownerId: 'owner-123',
    status: PropertyStatus.ACTIVE,
    title: 'Beautiful Apartment',
    address: '123 Main St',
    city: 'Budapest',
  };

  const mockSlot = {
    id: 'slot-123',
    propertyId: 'property-123',
    date: new Date('2025-02-15'),
    startTime: '10:00',
    endTime: '11:00',
    isBooked: false,
    bookedById: null,
    bookedAt: null,
    createdAt: new Date(),
    bookedBy: null,
  };

  const mockBookedSlot = {
    ...mockSlot,
    id: 'slot-456',
    isBooked: true,
    bookedById: 'booker-123',
    bookedAt: new Date(),
    bookedBy: {
      id: 'booker-123',
      firstName: 'Jane',
      lastName: 'Doe',
      phone: '+36201234567',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InspectionService,
        {
          provide: PrismaService,
          useValue: {
            property: {
              findUnique: jest.fn(),
            },
            inspectionSlot: {
              create: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            create: jest.fn().mockResolvedValue({}),
          },
        },
      ],
    }).compile();

    service = module.get<InspectionService>(InspectionService);
    prismaService = module.get(PrismaService);
    notificationsService = module.get(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSlot', () => {
    const createDto = {
      date: '2025-02-15',
      startTime: '10:00',
      endTime: '11:00',
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

    it('should allow admin to create slot for any property', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.inspectionSlot.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.inspectionSlot.create as jest.Mock).mockResolvedValue(mockSlot);

      const result = await service.createSlot(
        'property-123',
        createDto,
        'admin-user',
        UserRole.ADMIN,
      );

      expect(result.id).toBe(mockSlot.id);
    });

    it('should throw BadRequestException if end time is before start time', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);

      const invalidDto = {
        date: '2025-02-15',
        startTime: '14:00',
        endTime: '10:00',
      };

      await expect(
        service.createSlot('property-123', invalidDto, 'owner-123', UserRole.USER),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if end time equals start time', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);

      const invalidDto = {
        date: '2025-02-15',
        startTime: '10:00',
        endTime: '10:00',
      };

      await expect(
        service.createSlot('property-123', invalidDto, 'owner-123', UserRole.USER),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for overlapping slots', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.inspectionSlot.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'existing-slot',
          startTime: '09:30',
          endTime: '10:30',
        },
      ]);

      await expect(
        service.createSlot('property-123', createDto, 'owner-123', UserRole.USER),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create slot successfully when no overlap', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.inspectionSlot.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'existing-slot',
          startTime: '08:00',
          endTime: '09:00',
        },
      ]);
      (prismaService.inspectionSlot.create as jest.Mock).mockResolvedValue(mockSlot);

      const result = await service.createSlot(
        'property-123',
        createDto,
        'owner-123',
        UserRole.USER,
      );

      expect(result.id).toBe(mockSlot.id);
      expect(result.startTime).toBe('10:00');
      expect(result.endTime).toBe('11:00');
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

    it('should include bookedBy in response when available', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.inspectionSlot.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.inspectionSlot.create as jest.Mock).mockResolvedValue(mockBookedSlot);

      const result = await service.createSlot(
        'property-123',
        createDto,
        'owner-123',
        UserRole.USER,
      );

      expect(result.bookedBy).toBeDefined();
      expect(result.bookedBy?.firstName).toBe('Jane');
    });
  });

  describe('createBulkSlots', () => {
    const bulkDto = {
      slots: [
        { date: '2025-02-15', startTime: '10:00', endTime: '11:00' },
        { date: '2025-02-15', startTime: '14:00', endTime: '15:00' },
      ],
    };

    it('should create multiple slots successfully', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.inspectionSlot.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.inspectionSlot.create as jest.Mock)
        .mockResolvedValueOnce({ ...mockSlot, id: 'slot-1' })
        .mockResolvedValueOnce({ ...mockSlot, id: 'slot-2', startTime: '14:00', endTime: '15:00' });

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

    it('should throw if any slot creation fails', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.inspectionSlot.findMany as jest.Mock).mockResolvedValue([
        { id: 'existing', startTime: '10:00', endTime: '11:00' },
      ]);

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

    it('should return available slots for non-owner', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.inspectionSlot.findMany as jest.Mock).mockResolvedValue([mockSlot]);

      const result = await service.getSlots(
        'property-123',
        {},
        'other-user',
        UserRole.USER,
      );

      expect(result).toHaveLength(1);
      expect(prismaService.inspectionSlot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isBooked: false,
          }),
        }),
      );
    });

    it('should return all slots for owner', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.inspectionSlot.findMany as jest.Mock).mockResolvedValue([
        mockSlot,
        mockBookedSlot,
      ]);

      const result = await service.getSlots(
        'property-123',
        {},
        'owner-123',
        UserRole.USER,
      );

      expect(result).toHaveLength(2);
      expect(prismaService.inspectionSlot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            bookedBy: expect.any(Object),
          }),
        }),
      );
    });

    it('should return all slots for admin', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.inspectionSlot.findMany as jest.Mock).mockResolvedValue([
        mockSlot,
        mockBookedSlot,
      ]);

      const result = await service.getSlots(
        'property-123',
        {},
        'admin-user',
        UserRole.ADMIN,
      );

      expect(result).toHaveLength(2);
    });

    it('should filter by specific date', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.inspectionSlot.findMany as jest.Mock).mockResolvedValue([mockSlot]);

      await service.getSlots('property-123', { date: '2025-02-15' }, 'owner-123', UserRole.USER);

      expect(prismaService.inspectionSlot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: expect.objectContaining({
              gte: expect.any(Date),
              lt: expect.any(Date),
            }),
          }),
        }),
      );
    });

    it('should filter by date range', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.inspectionSlot.findMany as jest.Mock).mockResolvedValue([mockSlot]);

      await service.getSlots(
        'property-123',
        { startDate: '2025-02-01', endDate: '2025-02-28' },
        'owner-123',
        UserRole.USER,
      );

      expect(prismaService.inspectionSlot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });

    it('should filter future slots by default', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.inspectionSlot.findMany as jest.Mock).mockResolvedValue([]);

      await service.getSlots('property-123', {}, 'owner-123', UserRole.USER);

      expect(prismaService.inspectionSlot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: expect.objectContaining({
              gte: expect.any(Date),
            }),
          }),
        }),
      );
    });

    it('should order by date and start time', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.inspectionSlot.findMany as jest.Mock).mockResolvedValue([]);

      await service.getSlots('property-123', {}, 'owner-123', UserRole.USER);

      expect(prismaService.inspectionSlot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        }),
      );
    });

    it('should hide booker info for non-owners', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.inspectionSlot.findMany as jest.Mock).mockResolvedValue([mockBookedSlot]);

      const result = await service.getSlots(
        'property-123',
        {},
        'other-user',
        UserRole.USER,
      );

      expect(result[0].bookedBy).toBeUndefined();
      expect(result[0].bookedById).toBeUndefined();
    });
  });

  describe('bookSlot', () => {
    it('should throw NotFoundException if property not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.bookSlot('property-123', 'slot-123', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for deleted property', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue({
        ...mockProperty,
        status: PropertyStatus.DELETED,
      });

      await expect(
        service.bookSlot('property-123', 'slot-123', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for paused property', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue({
        ...mockProperty,
        status: PropertyStatus.PAUSED,
      });

      await expect(
        service.bookSlot('property-123', 'slot-123', 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if owner tries to book own property', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);

      await expect(
        service.bookSlot('property-123', 'slot-123', 'owner-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if slot not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.inspectionSlot.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.bookSlot('property-123', 'slot-123', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if slot already booked', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.inspectionSlot.findFirst as jest.Mock).mockResolvedValue(mockBookedSlot);

      await expect(
        service.bookSlot('property-123', 'slot-456', 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for past slot', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.inspectionSlot.findFirst as jest.Mock).mockResolvedValue({
        ...mockSlot,
        date: new Date('2020-01-01'),
      });

      await expect(
        service.bookSlot('property-123', 'slot-123', 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should book slot successfully', async () => {
      const futureSlot = {
        ...mockSlot,
        date: new Date('2030-01-01'),
      };
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.inspectionSlot.findFirst as jest.Mock).mockResolvedValue(futureSlot);
      (prismaService.inspectionSlot.update as jest.Mock).mockResolvedValue({
        ...futureSlot,
        isBooked: true,
        bookedById: 'user-123',
        bookedAt: new Date(),
        bookedBy: {
          id: 'user-123',
          firstName: 'John',
          lastName: 'Doe',
          phone: '+36201234567',
        },
      });

      const result = await service.bookSlot('property-123', 'slot-123', 'user-123');

      expect(result.isBooked).toBe(true);
      expect(prismaService.inspectionSlot.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isBooked: true,
            bookedById: 'user-123',
            bookedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should send notification to property owner when slot is booked', async () => {
      const futureSlot = {
        ...mockSlot,
        date: new Date('2030-01-01'),
      };
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.inspectionSlot.findFirst as jest.Mock).mockResolvedValue(futureSlot);
      (prismaService.inspectionSlot.update as jest.Mock).mockResolvedValue({
        ...futureSlot,
        isBooked: true,
        bookedById: 'user-123',
        bookedAt: new Date(),
        bookedBy: {
          id: 'user-123',
          firstName: 'John',
          lastName: 'Doe',
          phone: '+36201234567',
        },
      });

      await service.bookSlot('property-123', 'slot-123', 'user-123');

      expect(notificationsService.create).toHaveBeenCalledWith(
        'owner-123',
        NotificationType.INSPECTION_BOOKED,
        'Inspection Booked',
        expect.stringContaining('John Doe has booked an inspection'),
        expect.objectContaining({
          propertyId: 'property-123',
          bookedById: 'user-123',
        }),
      );
    });

    it('should not fail if notification fails', async () => {
      const futureSlot = {
        ...mockSlot,
        date: new Date('2030-01-01'),
      };
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.inspectionSlot.findFirst as jest.Mock).mockResolvedValue(futureSlot);
      (prismaService.inspectionSlot.update as jest.Mock).mockResolvedValue({
        ...futureSlot,
        isBooked: true,
        bookedById: 'user-123',
        bookedAt: new Date(),
        bookedBy: null,
      });
      (notificationsService.create as jest.Mock).mockRejectedValue(new Error('Notification failed'));

      // Should not throw despite notification failure
      const result = await service.bookSlot('property-123', 'slot-123', 'user-123');
      expect(result.isBooked).toBe(true);
    });
  });

  describe('cancelBooking', () => {
    it('should throw NotFoundException if property not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.cancelBooking('property-123', 'slot-123', 'user-123', UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if slot not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.inspectionSlot.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.cancelBooking('property-123', 'slot-123', 'user-123', UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if slot not booked', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.inspectionSlot.findFirst as jest.Mock).mockResolvedValue(mockSlot);

      await expect(
        service.cancelBooking('property-123', 'slot-123', 'user-123', UserRole.USER),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException for unauthorized cancellation', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.inspectionSlot.findFirst as jest.Mock).mockResolvedValue(mockBookedSlot);

      await expect(
        service.cancelBooking('property-123', 'slot-456', 'random-user', UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow booker to cancel', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.inspectionSlot.findFirst as jest.Mock).mockResolvedValue(mockBookedSlot);
      (prismaService.inspectionSlot.update as jest.Mock).mockResolvedValue({
        ...mockSlot,
        isBooked: false,
        bookedById: null,
        bookedAt: null,
      });

      const result = await service.cancelBooking(
        'property-123',
        'slot-456',
        'booker-123',
        UserRole.USER,
      );

      expect(result.isBooked).toBe(false);
    });

    it('should allow property owner to cancel', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.inspectionSlot.findFirst as jest.Mock).mockResolvedValue(mockBookedSlot);
      (prismaService.inspectionSlot.update as jest.Mock).mockResolvedValue({
        ...mockSlot,
        isBooked: false,
        bookedById: null,
        bookedAt: null,
      });

      const result = await service.cancelBooking(
        'property-123',
        'slot-456',
        'owner-123',
        UserRole.USER,
      );

      expect(result.isBooked).toBe(false);
    });

    it('should allow admin to cancel any booking', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.inspectionSlot.findFirst as jest.Mock).mockResolvedValue(mockBookedSlot);
      (prismaService.inspectionSlot.update as jest.Mock).mockResolvedValue({
        ...mockSlot,
        isBooked: false,
        bookedById: null,
        bookedAt: null,
      });

      const result = await service.cancelBooking(
        'property-123',
        'slot-456',
        'admin-user',
        UserRole.ADMIN,
      );

      expect(result.isBooked).toBe(false);
      expect(prismaService.inspectionSlot.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            isBooked: false,
            bookedById: null,
            bookedAt: null,
          },
        }),
      );
    });

    it('should send notification to property owner when booker cancels', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.inspectionSlot.findFirst as jest.Mock).mockResolvedValue(mockBookedSlot);
      (prismaService.inspectionSlot.update as jest.Mock).mockResolvedValue({
        ...mockSlot,
        isBooked: false,
        bookedById: null,
        bookedAt: null,
      });

      await service.cancelBooking(
        'property-123',
        'slot-456',
        'booker-123',
        UserRole.USER,
      );

      expect(notificationsService.create).toHaveBeenCalledWith(
        'owner-123',
        NotificationType.INSPECTION_CANCELLED,
        'Inspection Cancelled',
        expect.stringContaining('Jane Doe has cancelled'),
        expect.objectContaining({
          propertyId: 'property-123',
          cancelledById: 'booker-123',
        }),
      );
    });

    it('should send notification to booker when owner cancels', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.inspectionSlot.findFirst as jest.Mock).mockResolvedValue(mockBookedSlot);
      (prismaService.inspectionSlot.update as jest.Mock).mockResolvedValue({
        ...mockSlot,
        isBooked: false,
        bookedById: null,
        bookedAt: null,
      });

      await service.cancelBooking(
        'property-123',
        'slot-456',
        'owner-123',
        UserRole.USER,
      );

      expect(notificationsService.create).toHaveBeenCalledWith(
        'booker-123',
        NotificationType.INSPECTION_CANCELLED,
        'Inspection Cancelled',
        expect.stringContaining('has been cancelled by the property owner'),
        expect.objectContaining({
          propertyId: 'property-123',
          cancelledById: 'owner-123',
        }),
      );
    });

    it('should not fail if cancellation notification fails', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.inspectionSlot.findFirst as jest.Mock).mockResolvedValue(mockBookedSlot);
      (prismaService.inspectionSlot.update as jest.Mock).mockResolvedValue({
        ...mockSlot,
        isBooked: false,
        bookedById: null,
        bookedAt: null,
      });
      (notificationsService.create as jest.Mock).mockRejectedValue(new Error('Notification failed'));

      // Should not throw despite notification failure
      const result = await service.cancelBooking(
        'property-123',
        'slot-456',
        'booker-123',
        UserRole.USER,
      );
      expect(result.isBooked).toBe(false);
    });
  });

  describe('deleteSlot', () => {
    it('should throw NotFoundException if property not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.deleteSlot('property-123', 'slot-123', 'owner-123', UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-owner non-admin', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);

      await expect(
        service.deleteSlot('property-123', 'slot-123', 'other-user', UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if slot not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.inspectionSlot.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.deleteSlot('property-123', 'slot-123', 'owner-123', UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if slot is booked', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.inspectionSlot.findFirst as jest.Mock).mockResolvedValue(mockBookedSlot);

      await expect(
        service.deleteSlot('property-123', 'slot-456', 'owner-123', UserRole.USER),
      ).rejects.toThrow(BadRequestException);
    });

    it('should delete slot successfully', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.inspectionSlot.findFirst as jest.Mock).mockResolvedValue(mockSlot);
      (prismaService.inspectionSlot.delete as jest.Mock).mockResolvedValue(mockSlot);

      const result = await service.deleteSlot(
        'property-123',
        'slot-123',
        'owner-123',
        UserRole.USER,
      );

      expect(result.message).toContain('deleted');
      expect(prismaService.inspectionSlot.delete).toHaveBeenCalledWith({
        where: { id: 'slot-123' },
      });
    });

    it('should allow admin to delete slot', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.inspectionSlot.findFirst as jest.Mock).mockResolvedValue(mockSlot);
      (prismaService.inspectionSlot.delete as jest.Mock).mockResolvedValue(mockSlot);

      const result = await service.deleteSlot(
        'property-123',
        'slot-123',
        'admin-user',
        UserRole.ADMIN,
      );

      expect(result.message).toContain('deleted');
    });
  });

  describe('getMyBookings', () => {
    it('should return bookings for user', async () => {
      (prismaService.inspectionSlot.findMany as jest.Mock).mockResolvedValue([
        {
          ...mockBookedSlot,
          property: {
            id: 'property-123',
            title: 'Beautiful Apartment',
            address: '123 Main St',
            city: 'Budapest',
          },
        },
      ]);

      const result = await service.getMyBookings('booker-123');

      expect(result).toHaveLength(1);
      expect(result[0].isBooked).toBe(true);
      expect(prismaService.inspectionSlot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { bookedById: 'booker-123' },
          orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        }),
      );
    });

    it('should return empty array when no bookings', async () => {
      (prismaService.inspectionSlot.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getMyBookings('user-123');

      expect(result).toHaveLength(0);
    });

    it('should include property details in response', async () => {
      (prismaService.inspectionSlot.findMany as jest.Mock).mockResolvedValue([
        {
          ...mockBookedSlot,
          property: {
            id: 'property-123',
            title: 'Beautiful Apartment',
            address: '123 Main St',
            city: 'Budapest',
          },
        },
      ]);

      await service.getMyBookings('booker-123');

      expect(prismaService.inspectionSlot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            property: expect.any(Object),
          }),
        }),
      );
    });
  });

  describe('response mapping', () => {
    it('should correctly map slot to response DTO', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.inspectionSlot.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.inspectionSlot.create as jest.Mock).mockResolvedValue(mockSlot);

      const result = await service.createSlot(
        'property-123',
        { date: '2025-02-15', startTime: '10:00', endTime: '11:00' },
        'owner-123',
        UserRole.USER,
      );

      expect(result.id).toBe(mockSlot.id);
      expect(result.propertyId).toBe(mockSlot.propertyId);
      expect(result.date).toEqual(mockSlot.date);
      expect(result.startTime).toBe(mockSlot.startTime);
      expect(result.endTime).toBe(mockSlot.endTime);
      expect(result.isBooked).toBe(false);
    });

    it('should handle null bookedBy', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.inspectionSlot.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.inspectionSlot.create as jest.Mock).mockResolvedValue(mockSlot);

      const result = await service.createSlot(
        'property-123',
        { date: '2025-02-15', startTime: '10:00', endTime: '11:00' },
        'owner-123',
        UserRole.USER,
      );

      expect(result.bookedBy).toBeUndefined();
      expect(result.bookedById).toBeUndefined();
      expect(result.bookedAt).toBeUndefined();
    });

    it('should include booker info when booked', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.inspectionSlot.findMany as jest.Mock).mockResolvedValue([mockBookedSlot]);

      const result = await service.getSlots('property-123', {}, 'owner-123', UserRole.USER);

      expect(result[0].bookedBy).toBeDefined();
      expect(result[0].bookedBy?.firstName).toBe('Jane');
      expect(result[0].bookedBy?.lastName).toBe('Doe');
      expect(result[0].bookedBy?.phone).toBe('+36201234567');
    });

    it('should handle null phone in booker info', async () => {
      const slotWithNullPhone = {
        ...mockBookedSlot,
        bookedBy: {
          ...mockBookedSlot.bookedBy,
          phone: null,
        },
      };
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.inspectionSlot.findMany as jest.Mock).mockResolvedValue([slotWithNullPhone]);

      const result = await service.getSlots('property-123', {}, 'owner-123', UserRole.USER);

      expect(result[0].bookedBy?.phone).toBeUndefined();
    });
  });

  describe('time overlap detection', () => {
    const createDto = {
      date: '2025-02-15',
      startTime: '10:00',
      endTime: '11:00',
    };

    beforeEach(() => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
    });

    it('should detect overlap when new slot starts during existing slot', async () => {
      (prismaService.inspectionSlot.findMany as jest.Mock).mockResolvedValue([
        { startTime: '09:00', endTime: '10:30' },
      ]);

      await expect(
        service.createSlot('property-123', createDto, 'owner-123', UserRole.USER),
      ).rejects.toThrow(BadRequestException);
    });

    it('should detect overlap when new slot ends during existing slot', async () => {
      (prismaService.inspectionSlot.findMany as jest.Mock).mockResolvedValue([
        { startTime: '10:30', endTime: '12:00' },
      ]);

      await expect(
        service.createSlot('property-123', createDto, 'owner-123', UserRole.USER),
      ).rejects.toThrow(BadRequestException);
    });

    it('should detect overlap when new slot contains existing slot', async () => {
      (prismaService.inspectionSlot.findMany as jest.Mock).mockResolvedValue([
        { startTime: '10:15', endTime: '10:45' },
      ]);

      await expect(
        service.createSlot('property-123', createDto, 'owner-123', UserRole.USER),
      ).rejects.toThrow(BadRequestException);
    });

    it('should detect overlap when existing slot contains new slot', async () => {
      (prismaService.inspectionSlot.findMany as jest.Mock).mockResolvedValue([
        { startTime: '09:00', endTime: '12:00' },
      ]);

      await expect(
        service.createSlot('property-123', createDto, 'owner-123', UserRole.USER),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow adjacent slots (no gap)', async () => {
      (prismaService.inspectionSlot.findMany as jest.Mock).mockResolvedValue([
        { startTime: '09:00', endTime: '10:00' },
      ]);
      (prismaService.inspectionSlot.create as jest.Mock).mockResolvedValue(mockSlot);

      const result = await service.createSlot(
        'property-123',
        createDto,
        'owner-123',
        UserRole.USER,
      );

      expect(result.id).toBe(mockSlot.id);
    });

    it('should allow slots with gap between them', async () => {
      (prismaService.inspectionSlot.findMany as jest.Mock).mockResolvedValue([
        { startTime: '08:00', endTime: '09:00' },
      ]);
      (prismaService.inspectionSlot.create as jest.Mock).mockResolvedValue(mockSlot);

      const result = await service.createSlot(
        'property-123',
        createDto,
        'owner-123',
        UserRole.USER,
      );

      expect(result.id).toBe(mockSlot.id);
    });
  });
});
