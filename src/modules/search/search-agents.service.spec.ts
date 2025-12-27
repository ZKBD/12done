import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { UserRole, PropertyStatus, ListingType, Prisma } from '@prisma/client';
import { SearchAgentsService } from './search-agents.service';
import { PrismaService } from '@/database';
import { MailService } from '@/mail';

describe('SearchAgentsService', () => {
  let service: SearchAgentsService;
  let prismaService: jest.Mocked<PrismaService>;
  let mailService: jest.Mocked<MailService>;

  const mockSearchAgent = {
    id: 'agent-123',
    userId: 'user-123',
    name: 'Budapest Apartments',
    criteria: {
      city: 'Budapest',
      listingTypes: [ListingType.FOR_SALE],
      minPrice: 100000,
      maxPrice: 300000,
    },
    emailNotifications: true,
    inAppNotifications: true,
    isActive: true,
    lastTriggeredAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProperty = {
    id: 'property-123',
    country: 'HU',
    city: 'Budapest',
    listingTypes: [ListingType.FOR_SALE],
    basePrice: new Prisma.Decimal('200000'),
    squareMeters: 75,
    bedrooms: 2,
    bathrooms: 1,
    petFriendly: true,
    newlyBuilt: false,
    accessible: false,
    noAgents: false,
    yearBuilt: 2010,
    status: PropertyStatus.ACTIVE,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchAgentsService,
        {
          provide: PrismaService,
          useValue: {
            searchAgent: {
              count: jest.fn(),
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            property: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
            },
            notification: {
              create: jest.fn(),
            },
          },
        },
        {
          provide: MailService,
          useValue: {
            sendSearchAgentMatchEmail: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SearchAgentsService>(SearchAgentsService);
    prismaService = module.get(PrismaService);
    mailService = module.get(MailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      name: 'Budapest Apartments',
      criteria: {
        city: 'Budapest',
        listingTypes: [ListingType.FOR_SALE],
      },
    };

    it('should create a search agent successfully', async () => {
      (prismaService.searchAgent.count as jest.Mock).mockResolvedValue(0);
      (prismaService.searchAgent.create as jest.Mock).mockResolvedValue(mockSearchAgent);

      const result = await service.create(createDto, 'user-123');

      expect(result.id).toBe(mockSearchAgent.id);
      expect(result.name).toBe(mockSearchAgent.name);
      expect(result.isActive).toBe(true);
      expect(prismaService.searchAgent.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException when limit reached', async () => {
      (prismaService.searchAgent.count as jest.Mock).mockResolvedValue(10);

      await expect(service.create(createDto, 'user-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should use default notification settings', async () => {
      (prismaService.searchAgent.count as jest.Mock).mockResolvedValue(0);
      (prismaService.searchAgent.create as jest.Mock).mockResolvedValue(mockSearchAgent);

      await service.create(createDto, 'user-123');

      expect(prismaService.searchAgent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            emailNotifications: true,
            inAppNotifications: true,
            isActive: true,
          }),
        }),
      );
    });

    it('should respect custom notification settings', async () => {
      (prismaService.searchAgent.count as jest.Mock).mockResolvedValue(0);
      (prismaService.searchAgent.create as jest.Mock).mockResolvedValue({
        ...mockSearchAgent,
        emailNotifications: false,
      });

      await service.create(
        { ...createDto, emailNotifications: false },
        'user-123',
      );

      expect(prismaService.searchAgent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            emailNotifications: false,
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return all search agents for user', async () => {
      const agents = [mockSearchAgent];
      (prismaService.searchAgent.findMany as jest.Mock).mockResolvedValue(agents);

      const result = await service.findAll('user-123');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe(mockSearchAgent.name);
    });

    it('should return empty array when no agents', async () => {
      (prismaService.searchAgent.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.findAll('user-123');

      expect(result).toHaveLength(0);
    });

    it('should order by createdAt desc', async () => {
      (prismaService.searchAgent.findMany as jest.Mock).mockResolvedValue([]);

      await service.findAll('user-123');

      expect(prismaService.searchAgent.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException if agent not found', async () => {
      (prismaService.searchAgent.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.findById('agent-123', 'user-123', UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-owner non-admin', async () => {
      (prismaService.searchAgent.findUnique as jest.Mock).mockResolvedValue(mockSearchAgent);

      await expect(
        service.findById('agent-123', 'other-user', UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow owner to view agent', async () => {
      (prismaService.searchAgent.findUnique as jest.Mock).mockResolvedValue(mockSearchAgent);

      const result = await service.findById('agent-123', 'user-123', UserRole.USER);

      expect(result.id).toBe(mockSearchAgent.id);
    });

    it('should allow admin to view any agent', async () => {
      (prismaService.searchAgent.findUnique as jest.Mock).mockResolvedValue(mockSearchAgent);

      const result = await service.findById('agent-123', 'admin-123', UserRole.ADMIN);

      expect(result.id).toBe(mockSearchAgent.id);
    });
  });

  describe('update', () => {
    const updateDto = { name: 'Updated Name' };

    it('should throw NotFoundException if agent not found', async () => {
      (prismaService.searchAgent.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update('agent-123', updateDto, 'user-123', UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-owner non-admin', async () => {
      (prismaService.searchAgent.findUnique as jest.Mock).mockResolvedValue(mockSearchAgent);

      await expect(
        service.update('agent-123', updateDto, 'other-user', UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update agent successfully', async () => {
      (prismaService.searchAgent.findUnique as jest.Mock).mockResolvedValue(mockSearchAgent);
      (prismaService.searchAgent.update as jest.Mock).mockResolvedValue({
        ...mockSearchAgent,
        name: 'Updated Name',
      });

      const result = await service.update(
        'agent-123',
        updateDto,
        'user-123',
        UserRole.USER,
      );

      expect(result.name).toBe('Updated Name');
    });

    it('should update criteria', async () => {
      (prismaService.searchAgent.findUnique as jest.Mock).mockResolvedValue(mockSearchAgent);
      (prismaService.searchAgent.update as jest.Mock).mockResolvedValue({
        ...mockSearchAgent,
        criteria: { city: 'Vienna' },
      });

      const result = await service.update(
        'agent-123',
        { criteria: { city: 'Vienna' } },
        'user-123',
        UserRole.USER,
      );

      expect(result.criteria).toEqual({ city: 'Vienna' });
    });

    it('should allow admin to update any agent', async () => {
      (prismaService.searchAgent.findUnique as jest.Mock).mockResolvedValue(mockSearchAgent);
      (prismaService.searchAgent.update as jest.Mock).mockResolvedValue({
        ...mockSearchAgent,
        name: 'Updated Name',
      });

      const result = await service.update(
        'agent-123',
        updateDto,
        'admin-123',
        UserRole.ADMIN,
      );

      expect(result.name).toBe('Updated Name');
    });
  });

  describe('delete', () => {
    it('should throw NotFoundException if agent not found', async () => {
      (prismaService.searchAgent.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.delete('agent-123', 'user-123', UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-owner non-admin', async () => {
      (prismaService.searchAgent.findUnique as jest.Mock).mockResolvedValue(mockSearchAgent);

      await expect(
        service.delete('agent-123', 'other-user', UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should delete agent successfully', async () => {
      (prismaService.searchAgent.findUnique as jest.Mock).mockResolvedValue(mockSearchAgent);
      (prismaService.searchAgent.delete as jest.Mock).mockResolvedValue(mockSearchAgent);

      const result = await service.delete('agent-123', 'user-123', UserRole.USER);

      expect(result.message).toContain('deleted');
      expect(prismaService.searchAgent.delete).toHaveBeenCalledWith({
        where: { id: 'agent-123' },
      });
    });

    it('should allow admin to delete any agent', async () => {
      (prismaService.searchAgent.findUnique as jest.Mock).mockResolvedValue(mockSearchAgent);
      (prismaService.searchAgent.delete as jest.Mock).mockResolvedValue(mockSearchAgent);

      const result = await service.delete('agent-123', 'admin-123', UserRole.ADMIN);

      expect(result.message).toContain('deleted');
    });
  });

  describe('toggleActive', () => {
    it('should throw NotFoundException if agent not found', async () => {
      (prismaService.searchAgent.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.toggleActive('agent-123', false, 'user-123', UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-owner non-admin', async () => {
      (prismaService.searchAgent.findUnique as jest.Mock).mockResolvedValue(mockSearchAgent);

      await expect(
        service.toggleActive('agent-123', false, 'other-user', UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should deactivate agent', async () => {
      (prismaService.searchAgent.findUnique as jest.Mock).mockResolvedValue(mockSearchAgent);
      (prismaService.searchAgent.update as jest.Mock).mockResolvedValue({
        ...mockSearchAgent,
        isActive: false,
      });

      const result = await service.toggleActive(
        'agent-123',
        false,
        'user-123',
        UserRole.USER,
      );

      expect(result.isActive).toBe(false);
    });

    it('should activate agent', async () => {
      (prismaService.searchAgent.findUnique as jest.Mock).mockResolvedValue({
        ...mockSearchAgent,
        isActive: false,
      });
      (prismaService.searchAgent.update as jest.Mock).mockResolvedValue(mockSearchAgent);

      const result = await service.toggleActive(
        'agent-123',
        true,
        'user-123',
        UserRole.USER,
      );

      expect(result.isActive).toBe(true);
    });
  });

  describe('checkAgainstNewProperty', () => {
    const mockUser = {
      id: 'user-123',
      email: 'user@example.com',
      firstName: 'John',
    };

    it('should do nothing if property not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(null);

      await service.checkAgainstNewProperty('property-123');

      expect(prismaService.searchAgent.findMany).not.toHaveBeenCalled();
    });

    it('should do nothing if property is not active', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue({
        ...mockProperty,
        status: PropertyStatus.DRAFT,
      });

      await service.checkAgainstNewProperty('property-123');

      expect(prismaService.searchAgent.findMany).not.toHaveBeenCalled();
    });

    it('should check all active search agents', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.searchAgent.findMany as jest.Mock).mockResolvedValue([]);

      await service.checkAgainstNewProperty('property-123');

      expect(prismaService.searchAgent.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        include: {
          user: {
            select: { id: true, email: true, firstName: true },
          },
        },
      });
    });

    it('should send email notification for matching property', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.searchAgent.findMany as jest.Mock).mockResolvedValue([
        {
          ...mockSearchAgent,
          user: mockUser,
        },
      ]);
      (prismaService.searchAgent.update as jest.Mock).mockResolvedValue(mockSearchAgent);

      await service.checkAgainstNewProperty('property-123');

      expect(mailService.sendSearchAgentMatchEmail).toHaveBeenCalledWith(
        mockUser.email,
        mockUser.firstName,
        mockSearchAgent.name,
        1,
        expect.any(String),
      );
    });

    it('should create in-app notification for matching property', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.searchAgent.findMany as jest.Mock).mockResolvedValue([
        {
          ...mockSearchAgent,
          user: mockUser,
        },
      ]);
      (prismaService.searchAgent.update as jest.Mock).mockResolvedValue(mockSearchAgent);
      (prismaService.notification.create as jest.Mock).mockResolvedValue({});

      await service.checkAgainstNewProperty('property-123');

      expect(prismaService.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockSearchAgent.userId,
          type: 'SEARCH_AGENT_MATCH',
        }),
      });
    });

    it('should update lastTriggeredAt for matching agent', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.searchAgent.findMany as jest.Mock).mockResolvedValue([
        {
          ...mockSearchAgent,
          user: mockUser,
        },
      ]);
      (prismaService.searchAgent.update as jest.Mock).mockResolvedValue(mockSearchAgent);

      await service.checkAgainstNewProperty('property-123');

      expect(prismaService.searchAgent.update).toHaveBeenCalledWith({
        where: { id: mockSearchAgent.id },
        data: { lastTriggeredAt: expect.any(Date) },
      });
    });

    it('should not send email if emailNotifications disabled', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.searchAgent.findMany as jest.Mock).mockResolvedValue([
        {
          ...mockSearchAgent,
          emailNotifications: false,
          user: mockUser,
        },
      ]);
      (prismaService.searchAgent.update as jest.Mock).mockResolvedValue(mockSearchAgent);

      await service.checkAgainstNewProperty('property-123');

      expect(mailService.sendSearchAgentMatchEmail).not.toHaveBeenCalled();
    });

    it('should not create notification if inAppNotifications disabled', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.searchAgent.findMany as jest.Mock).mockResolvedValue([
        {
          ...mockSearchAgent,
          inAppNotifications: false,
          user: mockUser,
        },
      ]);
      (prismaService.searchAgent.update as jest.Mock).mockResolvedValue(mockSearchAgent);

      await service.checkAgainstNewProperty('property-123');

      expect(prismaService.notification.create).not.toHaveBeenCalled();
    });
  });

  describe('runSearch', () => {
    it('should return matching properties', async () => {
      (prismaService.searchAgent.findUnique as jest.Mock).mockResolvedValue(mockSearchAgent);
      (prismaService.property.findMany as jest.Mock).mockResolvedValue([
        { id: 'property-1' },
        { id: 'property-2' },
      ]);

      const result = await service.runSearch('agent-123', 'user-123', UserRole.USER);

      expect(result.propertyIds).toHaveLength(2);
      expect(result.count).toBe(2);
    });

    it('should only search ACTIVE properties', async () => {
      (prismaService.searchAgent.findUnique as jest.Mock).mockResolvedValue(mockSearchAgent);
      (prismaService.property.findMany as jest.Mock).mockResolvedValue([]);

      await service.runSearch('agent-123', 'user-123', UserRole.USER);

      expect(prismaService.property.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: PropertyStatus.ACTIVE,
          }),
        }),
      );
    });

    it('should limit results to 100', async () => {
      (prismaService.searchAgent.findUnique as jest.Mock).mockResolvedValue(mockSearchAgent);
      (prismaService.property.findMany as jest.Mock).mockResolvedValue([]);

      await service.runSearch('agent-123', 'user-123', UserRole.USER);

      expect(prismaService.property.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        }),
      );
    });

    it('should return empty array when no matches', async () => {
      (prismaService.searchAgent.findUnique as jest.Mock).mockResolvedValue(mockSearchAgent);
      (prismaService.property.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.runSearch('agent-123', 'user-123', UserRole.USER);

      expect(result.propertyIds).toHaveLength(0);
      expect(result.count).toBe(0);
    });
  });

  describe('criteria matching', () => {
    const mockUser = {
      id: 'user-123',
      email: 'user@example.com',
      firstName: 'John',
    };

    it('should match by country', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.searchAgent.findMany as jest.Mock).mockResolvedValue([
        {
          ...mockSearchAgent,
          criteria: { country: 'HU' },
          user: mockUser,
        },
      ]);
      (prismaService.searchAgent.update as jest.Mock).mockResolvedValue(mockSearchAgent);

      await service.checkAgainstNewProperty('property-123');

      expect(prismaService.searchAgent.update).toHaveBeenCalled();
    });

    it('should not match wrong country', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.searchAgent.findMany as jest.Mock).mockResolvedValue([
        {
          ...mockSearchAgent,
          criteria: { country: 'AT' },
          user: mockUser,
        },
      ]);

      await service.checkAgainstNewProperty('property-123');

      expect(prismaService.searchAgent.update).not.toHaveBeenCalled();
    });

    it('should match by price range', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.searchAgent.findMany as jest.Mock).mockResolvedValue([
        {
          ...mockSearchAgent,
          criteria: { minPrice: 100000, maxPrice: 300000 },
          user: mockUser,
        },
      ]);
      (prismaService.searchAgent.update as jest.Mock).mockResolvedValue(mockSearchAgent);

      await service.checkAgainstNewProperty('property-123');

      expect(prismaService.searchAgent.update).toHaveBeenCalled();
    });

    it('should not match price below min', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.searchAgent.findMany as jest.Mock).mockResolvedValue([
        {
          ...mockSearchAgent,
          criteria: { minPrice: 300000 },
          user: mockUser,
        },
      ]);

      await service.checkAgainstNewProperty('property-123');

      expect(prismaService.searchAgent.update).not.toHaveBeenCalled();
    });

    it('should match by listing types', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.searchAgent.findMany as jest.Mock).mockResolvedValue([
        {
          ...mockSearchAgent,
          criteria: { listingTypes: [ListingType.FOR_SALE, ListingType.LONG_TERM_RENT] },
          user: mockUser,
        },
      ]);
      (prismaService.searchAgent.update as jest.Mock).mockResolvedValue(mockSearchAgent);

      await service.checkAgainstNewProperty('property-123');

      expect(prismaService.searchAgent.update).toHaveBeenCalled();
    });

    it('should match by feature flags', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.searchAgent.findMany as jest.Mock).mockResolvedValue([
        {
          ...mockSearchAgent,
          criteria: { petFriendly: true },
          user: mockUser,
        },
      ]);
      (prismaService.searchAgent.update as jest.Mock).mockResolvedValue(mockSearchAgent);

      await service.checkAgainstNewProperty('property-123');

      expect(prismaService.searchAgent.update).toHaveBeenCalled();
    });

    it('should not match when feature flag not met', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.searchAgent.findMany as jest.Mock).mockResolvedValue([
        {
          ...mockSearchAgent,
          criteria: { accessible: true },
          user: mockUser,
        },
      ]);

      await service.checkAgainstNewProperty('property-123');

      expect(prismaService.searchAgent.update).not.toHaveBeenCalled();
    });
  });
});
