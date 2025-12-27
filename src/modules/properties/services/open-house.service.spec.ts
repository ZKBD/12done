import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PropertyStatus, UserRole } from '@prisma/client';
import { OpenHouseService } from './open-house.service';
import { PrismaService } from '@/database';

describe('OpenHouseService', () => {
  let service: OpenHouseService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockProperty = {
    id: 'property-123',
    ownerId: 'owner-123',
    status: PropertyStatus.ACTIVE,
    title: 'Beautiful Apartment',
    address: '123 Main St',
    city: 'Budapest',
  };

  const mockOpenHouse = {
    id: 'openhouse-123',
    propertyId: 'property-123',
    date: new Date('2025-03-15'),
    startTime: '10:00',
    endTime: '14:00',
    description: 'Refreshments provided',
    isPublic: true,
    maxAttendees: 20,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrivateOpenHouse = {
    ...mockOpenHouse,
    id: 'openhouse-456',
    isPublic: false,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenHouseService,
        {
          provide: PrismaService,
          useValue: {
            property: {
              findUnique: jest.fn(),
            },
            openHouseEvent: {
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

    service = module.get<OpenHouseService>(OpenHouseService);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      date: '2025-03-15',
      startTime: '10:00',
      endTime: '14:00',
      description: 'Refreshments provided',
      isPublic: true,
      maxAttendees: 20,
    };

    it('should throw NotFoundException if property not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.create('property-123', createDto, 'owner-123', UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-owner non-admin', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);

      await expect(
        service.create('property-123', createDto, 'other-user', UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to create open house for any property', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.openHouseEvent.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.openHouseEvent.create as jest.Mock).mockResolvedValue(mockOpenHouse);

      const result = await service.create(
        'property-123',
        createDto,
        'admin-user',
        UserRole.ADMIN,
      );

      expect(result.id).toBe(mockOpenHouse.id);
    });

    it('should throw BadRequestException if end time is before start time', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);

      const invalidDto = {
        date: '2025-03-15',
        startTime: '14:00',
        endTime: '10:00',
      };

      await expect(
        service.create('property-123', invalidDto, 'owner-123', UserRole.USER),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if end time equals start time', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);

      const invalidDto = {
        date: '2025-03-15',
        startTime: '10:00',
        endTime: '10:00',
      };

      await expect(
        service.create('property-123', invalidDto, 'owner-123', UserRole.USER),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for overlapping events', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.openHouseEvent.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'existing-event',
          startTime: '09:00',
          endTime: '12:00',
        },
      ]);

      await expect(
        service.create('property-123', createDto, 'owner-123', UserRole.USER),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create open house successfully when no overlap', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.openHouseEvent.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'existing-event',
          startTime: '08:00',
          endTime: '09:00',
        },
      ]);
      (prismaService.openHouseEvent.create as jest.Mock).mockResolvedValue(mockOpenHouse);

      const result = await service.create(
        'property-123',
        createDto,
        'owner-123',
        UserRole.USER,
      );

      expect(result.id).toBe(mockOpenHouse.id);
      expect(result.startTime).toBe('10:00');
      expect(result.endTime).toBe('14:00');
    });

    it('should throw BadRequestException for deleted property', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue({
        ...mockProperty,
        status: PropertyStatus.DELETED,
      });

      await expect(
        service.create('property-123', createDto, 'owner-123', UserRole.USER),
      ).rejects.toThrow(BadRequestException);
    });

    it('should default isPublic to true if not provided', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.openHouseEvent.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.openHouseEvent.create as jest.Mock).mockResolvedValue(mockOpenHouse);

      await service.create(
        'property-123',
        { date: '2025-03-15', startTime: '10:00', endTime: '14:00' },
        'owner-123',
        UserRole.USER,
      );

      expect(prismaService.openHouseEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isPublic: true,
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should throw NotFoundException if property not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findAll('property-123', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for deleted property', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue({
        ...mockProperty,
        status: PropertyStatus.DELETED,
      });

      await expect(service.findAll('property-123', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return only public events for non-owner', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.openHouseEvent.findMany as jest.Mock).mockResolvedValue([mockOpenHouse]);

      const result = await service.findAll(
        'property-123',
        {},
        'other-user',
        UserRole.USER,
      );

      expect(result).toHaveLength(1);
      expect(prismaService.openHouseEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isPublic: true,
          }),
        }),
      );
    });

    it('should return all events for owner', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.openHouseEvent.findMany as jest.Mock).mockResolvedValue([
        mockOpenHouse,
        mockPrivateOpenHouse,
      ]);

      const result = await service.findAll(
        'property-123',
        {},
        'owner-123',
        UserRole.USER,
      );

      expect(result).toHaveLength(2);
    });

    it('should return all events for admin', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.openHouseEvent.findMany as jest.Mock).mockResolvedValue([
        mockOpenHouse,
        mockPrivateOpenHouse,
      ]);

      const result = await service.findAll(
        'property-123',
        {},
        'admin-user',
        UserRole.ADMIN,
      );

      expect(result).toHaveLength(2);
    });

    it('should filter by specific date', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.openHouseEvent.findMany as jest.Mock).mockResolvedValue([mockOpenHouse]);

      await service.findAll('property-123', { date: '2025-03-15' }, 'owner-123', UserRole.USER);

      expect(prismaService.openHouseEvent.findMany).toHaveBeenCalledWith(
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
      (prismaService.openHouseEvent.findMany as jest.Mock).mockResolvedValue([mockOpenHouse]);

      await service.findAll(
        'property-123',
        { startDate: '2025-03-01', endDate: '2025-03-31' },
        'owner-123',
        UserRole.USER,
      );

      expect(prismaService.openHouseEvent.findMany).toHaveBeenCalledWith(
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

    it('should filter upcoming events only when upcomingOnly is true', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.openHouseEvent.findMany as jest.Mock).mockResolvedValue([]);

      await service.findAll('property-123', { upcomingOnly: true }, 'owner-123', UserRole.USER);

      expect(prismaService.openHouseEvent.findMany).toHaveBeenCalledWith(
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
      (prismaService.openHouseEvent.findMany as jest.Mock).mockResolvedValue([]);

      await service.findAll('property-123', {}, 'owner-123', UserRole.USER);

      expect(prismaService.openHouseEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if property not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.findOne('property-123', 'openhouse-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if event not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.openHouseEvent.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.findOne('property-123', 'openhouse-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for private event when accessed by non-owner', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.openHouseEvent.findFirst as jest.Mock).mockResolvedValue(mockPrivateOpenHouse);

      await expect(
        service.findOne('property-123', 'openhouse-456', 'other-user', UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return private event for owner', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.openHouseEvent.findFirst as jest.Mock).mockResolvedValue(mockPrivateOpenHouse);

      const result = await service.findOne('property-123', 'openhouse-456', 'owner-123', UserRole.USER);

      expect(result.id).toBe(mockPrivateOpenHouse.id);
    });

    it('should return private event for admin', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.openHouseEvent.findFirst as jest.Mock).mockResolvedValue(mockPrivateOpenHouse);

      const result = await service.findOne('property-123', 'openhouse-456', 'admin-user', UserRole.ADMIN);

      expect(result.id).toBe(mockPrivateOpenHouse.id);
    });

    it('should return public event for any user', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.openHouseEvent.findFirst as jest.Mock).mockResolvedValue(mockOpenHouse);

      const result = await service.findOne('property-123', 'openhouse-123', 'other-user', UserRole.USER);

      expect(result.id).toBe(mockOpenHouse.id);
    });
  });

  describe('update', () => {
    const updateDto = {
      description: 'Updated description',
      maxAttendees: 30,
    };

    it('should throw NotFoundException if property not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update('property-123', 'openhouse-123', updateDto, 'owner-123', UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-owner non-admin', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);

      await expect(
        service.update('property-123', 'openhouse-123', updateDto, 'other-user', UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if event not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.openHouseEvent.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update('property-123', 'openhouse-123', updateDto, 'owner-123', UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if end time is before start time', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.openHouseEvent.findFirst as jest.Mock).mockResolvedValue(mockOpenHouse);

      await expect(
        service.update(
          'property-123',
          'openhouse-123',
          { startTime: '14:00', endTime: '10:00' },
          'owner-123',
          UserRole.USER,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update event successfully', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.openHouseEvent.findFirst as jest.Mock).mockResolvedValue(mockOpenHouse);
      (prismaService.openHouseEvent.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.openHouseEvent.update as jest.Mock).mockResolvedValue({
        ...mockOpenHouse,
        description: 'Updated description',
        maxAttendees: 30,
      });

      const result = await service.update(
        'property-123',
        'openhouse-123',
        updateDto,
        'owner-123',
        UserRole.USER,
      );

      expect(result.description).toBe('Updated description');
      expect(result.maxAttendees).toBe(30);
    });

    it('should allow admin to update any event', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.openHouseEvent.findFirst as jest.Mock).mockResolvedValue(mockOpenHouse);
      (prismaService.openHouseEvent.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.openHouseEvent.update as jest.Mock).mockResolvedValue({
        ...mockOpenHouse,
        ...updateDto,
      });

      const result = await service.update(
        'property-123',
        'openhouse-123',
        updateDto,
        'admin-user',
        UserRole.ADMIN,
      );

      expect(result.id).toBe(mockOpenHouse.id);
    });

    it('should check for overlap when date or times are changed', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.openHouseEvent.findFirst as jest.Mock).mockResolvedValue(mockOpenHouse);
      (prismaService.openHouseEvent.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'other-event',
          startTime: '11:00',
          endTime: '15:00',
        },
      ]);

      await expect(
        service.update(
          'property-123',
          'openhouse-123',
          { startTime: '12:00', endTime: '16:00' },
          'owner-123',
          UserRole.USER,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    it('should throw NotFoundException if property not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.delete('property-123', 'openhouse-123', 'owner-123', UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-owner non-admin', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);

      await expect(
        service.delete('property-123', 'openhouse-123', 'other-user', UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if event not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.openHouseEvent.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.delete('property-123', 'openhouse-123', 'owner-123', UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should delete event successfully', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.openHouseEvent.findFirst as jest.Mock).mockResolvedValue(mockOpenHouse);
      (prismaService.openHouseEvent.delete as jest.Mock).mockResolvedValue(mockOpenHouse);

      const result = await service.delete(
        'property-123',
        'openhouse-123',
        'owner-123',
        UserRole.USER,
      );

      expect(result.message).toContain('deleted');
      expect(prismaService.openHouseEvent.delete).toHaveBeenCalledWith({
        where: { id: 'openhouse-123' },
      });
    });

    it('should allow admin to delete any event', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.openHouseEvent.findFirst as jest.Mock).mockResolvedValue(mockOpenHouse);
      (prismaService.openHouseEvent.delete as jest.Mock).mockResolvedValue(mockOpenHouse);

      const result = await service.delete(
        'property-123',
        'openhouse-123',
        'admin-user',
        UserRole.ADMIN,
      );

      expect(result.message).toContain('deleted');
    });
  });

  describe('getUpcomingOpenHouses', () => {
    it('should return upcoming public open houses from active properties', async () => {
      (prismaService.openHouseEvent.findMany as jest.Mock).mockResolvedValue([
        {
          ...mockOpenHouse,
          property: { id: 'property-123', title: 'Test Property', city: 'Budapest' },
        },
      ]);

      const result = await service.getUpcomingOpenHouses();

      expect(result).toHaveLength(1);
      expect(result[0].property.title).toBe('Test Property');
      expect(prismaService.openHouseEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isPublic: true,
            property: { status: PropertyStatus.ACTIVE },
          }),
        }),
      );
    });

    it('should respect the limit parameter', async () => {
      (prismaService.openHouseEvent.findMany as jest.Mock).mockResolvedValue([]);

      await service.getUpcomingOpenHouses(5);

      expect(prismaService.openHouseEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        }),
      );
    });

    it('should order by date and start time', async () => {
      (prismaService.openHouseEvent.findMany as jest.Mock).mockResolvedValue([]);

      await service.getUpcomingOpenHouses();

      expect(prismaService.openHouseEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        }),
      );
    });
  });

  describe('response mapping', () => {
    it('should correctly map event to response DTO', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.openHouseEvent.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.openHouseEvent.create as jest.Mock).mockResolvedValue(mockOpenHouse);

      const result = await service.create(
        'property-123',
        { date: '2025-03-15', startTime: '10:00', endTime: '14:00' },
        'owner-123',
        UserRole.USER,
      );

      expect(result.id).toBe(mockOpenHouse.id);
      expect(result.propertyId).toBe(mockOpenHouse.propertyId);
      expect(result.date).toEqual(mockOpenHouse.date);
      expect(result.startTime).toBe(mockOpenHouse.startTime);
      expect(result.endTime).toBe(mockOpenHouse.endTime);
      expect(result.isPublic).toBe(true);
    });

    it('should handle null description', async () => {
      const eventWithNullDesc = { ...mockOpenHouse, description: null };
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.openHouseEvent.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.openHouseEvent.create as jest.Mock).mockResolvedValue(eventWithNullDesc);

      const result = await service.create(
        'property-123',
        { date: '2025-03-15', startTime: '10:00', endTime: '14:00' },
        'owner-123',
        UserRole.USER,
      );

      expect(result.description).toBeUndefined();
    });

    it('should handle null maxAttendees', async () => {
      const eventWithNullMax = { ...mockOpenHouse, maxAttendees: null };
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.openHouseEvent.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.openHouseEvent.create as jest.Mock).mockResolvedValue(eventWithNullMax);

      const result = await service.create(
        'property-123',
        { date: '2025-03-15', startTime: '10:00', endTime: '14:00' },
        'owner-123',
        UserRole.USER,
      );

      expect(result.maxAttendees).toBeUndefined();
    });
  });

  describe('time overlap detection', () => {
    const createDto = {
      date: '2025-03-15',
      startTime: '10:00',
      endTime: '14:00',
    };

    beforeEach(() => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
    });

    it('should detect overlap when new event starts during existing event', async () => {
      (prismaService.openHouseEvent.findMany as jest.Mock).mockResolvedValue([
        { startTime: '09:00', endTime: '12:00' },
      ]);

      await expect(
        service.create('property-123', createDto, 'owner-123', UserRole.USER),
      ).rejects.toThrow(BadRequestException);
    });

    it('should detect overlap when new event ends during existing event', async () => {
      (prismaService.openHouseEvent.findMany as jest.Mock).mockResolvedValue([
        { startTime: '12:00', endTime: '16:00' },
      ]);

      await expect(
        service.create('property-123', createDto, 'owner-123', UserRole.USER),
      ).rejects.toThrow(BadRequestException);
    });

    it('should detect overlap when new event contains existing event', async () => {
      (prismaService.openHouseEvent.findMany as jest.Mock).mockResolvedValue([
        { startTime: '11:00', endTime: '13:00' },
      ]);

      await expect(
        service.create('property-123', createDto, 'owner-123', UserRole.USER),
      ).rejects.toThrow(BadRequestException);
    });

    it('should detect overlap when existing event contains new event', async () => {
      (prismaService.openHouseEvent.findMany as jest.Mock).mockResolvedValue([
        { startTime: '08:00', endTime: '16:00' },
      ]);

      await expect(
        service.create('property-123', createDto, 'owner-123', UserRole.USER),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow adjacent events (no gap)', async () => {
      (prismaService.openHouseEvent.findMany as jest.Mock).mockResolvedValue([
        { startTime: '08:00', endTime: '10:00' },
      ]);
      (prismaService.openHouseEvent.create as jest.Mock).mockResolvedValue(mockOpenHouse);

      const result = await service.create(
        'property-123',
        createDto,
        'owner-123',
        UserRole.USER,
      );

      expect(result.id).toBe(mockOpenHouse.id);
    });

    it('should allow events with gap between them', async () => {
      (prismaService.openHouseEvent.findMany as jest.Mock).mockResolvedValue([
        { startTime: '06:00', endTime: '08:00' },
      ]);
      (prismaService.openHouseEvent.create as jest.Mock).mockResolvedValue(mockOpenHouse);

      const result = await service.create(
        'property-123',
        createDto,
        'owner-123',
        UserRole.USER,
      );

      expect(result.id).toBe(mockOpenHouse.id);
    });
  });
});
