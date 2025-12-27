import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PropertyStatus, UserRole, Prisma } from '@prisma/client';
import { PricingService } from './pricing.service';
import { PrismaService } from '@/database';

describe('PricingService', () => {
  let service: PricingService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockProperty = {
    id: 'property-123',
    ownerId: 'owner-123',
    status: PropertyStatus.ACTIVE,
    dynamicPricingEnabled: false,
  };

  const mockRule = {
    id: 'rule-123',
    propertyId: 'property-123',
    name: 'Weekend Premium',
    startDate: null,
    endDate: null,
    dayOfWeek: 6,
    priceMultiplier: new Prisma.Decimal('1.5'),
    isActive: true,
    priority: 1,
    createdAt: new Date(),
  };

  const mockDateRule = {
    id: 'rule-456',
    propertyId: 'property-123',
    name: 'Holiday Season',
    startDate: new Date('2025-12-20'),
    endDate: new Date('2025-01-05'),
    dayOfWeek: null,
    priceMultiplier: new Prisma.Decimal('2.0'),
    isActive: true,
    priority: 2,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingService,
        {
          provide: PrismaService,
          useValue: {
            property: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            dynamicPricingRule: {
              create: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<PricingService>(PricingService);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRule', () => {
    const dayOfWeekDto = {
      name: 'Weekend Premium',
      dayOfWeek: 6,
      priceMultiplier: '1.5',
    };

    const dateRangeDto = {
      name: 'Holiday Season',
      startDate: '2025-12-20',
      endDate: '2026-01-05',
      priceMultiplier: '2.0',
    };

    it('should throw NotFoundException if property not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createRule('property-123', dayOfWeekDto, 'owner-123', UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-owner non-admin', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);

      await expect(
        service.createRule('property-123', dayOfWeekDto, 'other-user', UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to create rule for any property', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.dynamicPricingRule.create as jest.Mock).mockResolvedValue(mockRule);
      (prismaService.property.update as jest.Mock).mockResolvedValue({
        ...mockProperty,
        dynamicPricingEnabled: true,
      });

      const result = await service.createRule(
        'property-123',
        dayOfWeekDto,
        'admin-user',
        UserRole.ADMIN,
      );

      expect(result.id).toBe(mockRule.id);
    });

    it('should throw BadRequestException if no date range or day of week', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);

      const invalidDto = {
        name: 'Invalid Rule',
        priceMultiplier: '1.5',
      };

      await expect(
        service.createRule('property-123', invalidDto, 'owner-123', UserRole.USER),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if only startDate provided', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);

      const invalidDto = {
        name: 'Invalid Rule',
        startDate: '2025-12-20',
        priceMultiplier: '1.5',
      };

      await expect(
        service.createRule('property-123', invalidDto, 'owner-123', UserRole.USER),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if only endDate provided', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);

      const invalidDto = {
        name: 'Invalid Rule',
        endDate: '2025-12-25',
        priceMultiplier: '1.5',
      };

      await expect(
        service.createRule('property-123', invalidDto, 'owner-123', UserRole.USER),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if endDate is before startDate', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);

      const invalidDto = {
        name: 'Invalid Rule',
        startDate: '2025-12-25',
        endDate: '2025-12-20',
        priceMultiplier: '1.5',
      };

      await expect(
        service.createRule('property-123', invalidDto, 'owner-123', UserRole.USER),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if endDate equals startDate', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);

      const invalidDto = {
        name: 'Invalid Rule',
        startDate: '2025-12-25',
        endDate: '2025-12-25',
        priceMultiplier: '1.5',
      };

      await expect(
        service.createRule('property-123', invalidDto, 'owner-123', UserRole.USER),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid price multiplier', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);

      const invalidDto = {
        name: 'Invalid Rule',
        dayOfWeek: 6,
        priceMultiplier: 'invalid',
      };

      await expect(
        service.createRule('property-123', invalidDto, 'owner-123', UserRole.USER),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for zero price multiplier', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);

      const invalidDto = {
        name: 'Invalid Rule',
        dayOfWeek: 6,
        priceMultiplier: '0',
      };

      await expect(
        service.createRule('property-123', invalidDto, 'owner-123', UserRole.USER),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for negative price multiplier', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);

      const invalidDto = {
        name: 'Invalid Rule',
        dayOfWeek: 6,
        priceMultiplier: '-1.5',
      };

      await expect(
        service.createRule('property-123', invalidDto, 'owner-123', UserRole.USER),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create day-of-week rule successfully', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.dynamicPricingRule.create as jest.Mock).mockResolvedValue(mockRule);
      (prismaService.property.update as jest.Mock).mockResolvedValue({
        ...mockProperty,
        dynamicPricingEnabled: true,
      });

      const result = await service.createRule(
        'property-123',
        dayOfWeekDto,
        'owner-123',
        UserRole.USER,
      );

      expect(result.id).toBe(mockRule.id);
      expect(result.dayOfWeek).toBe(6);
      expect(prismaService.dynamicPricingRule.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dayOfWeek: 6,
            priceMultiplier: expect.any(Prisma.Decimal),
          }),
        }),
      );
    });

    it('should create date-range rule successfully', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.dynamicPricingRule.create as jest.Mock).mockResolvedValue(mockDateRule);
      (prismaService.property.update as jest.Mock).mockResolvedValue({
        ...mockProperty,
        dynamicPricingEnabled: true,
      });

      const result = await service.createRule(
        'property-123',
        dateRangeDto,
        'owner-123',
        UserRole.USER,
      );

      expect(result.id).toBe(mockDateRule.id);
      expect(result.startDate).toBeDefined();
      expect(result.endDate).toBeDefined();
    });

    it('should enable dynamic pricing on property if not already enabled', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.dynamicPricingRule.create as jest.Mock).mockResolvedValue(mockRule);
      (prismaService.property.update as jest.Mock).mockResolvedValue({
        ...mockProperty,
        dynamicPricingEnabled: true,
      });

      await service.createRule('property-123', dayOfWeekDto, 'owner-123', UserRole.USER);

      expect(prismaService.property.update).toHaveBeenCalledWith({
        where: { id: 'property-123' },
        data: { dynamicPricingEnabled: true },
      });
    });

    it('should not update property if dynamic pricing already enabled', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue({
        ...mockProperty,
        dynamicPricingEnabled: true,
      });
      (prismaService.dynamicPricingRule.create as jest.Mock).mockResolvedValue(mockRule);

      await service.createRule('property-123', dayOfWeekDto, 'owner-123', UserRole.USER);

      expect(prismaService.property.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for deleted property', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue({
        ...mockProperty,
        status: PropertyStatus.DELETED,
      });

      await expect(
        service.createRule('property-123', dayOfWeekDto, 'owner-123', UserRole.USER),
      ).rejects.toThrow(BadRequestException);
    });

    it('should use default values for isActive and priority', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.dynamicPricingRule.create as jest.Mock).mockResolvedValue(mockRule);
      (prismaService.property.update as jest.Mock).mockResolvedValue({
        ...mockProperty,
        dynamicPricingEnabled: true,
      });

      await service.createRule('property-123', dayOfWeekDto, 'owner-123', UserRole.USER);

      expect(prismaService.dynamicPricingRule.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isActive: true,
            priority: 0,
          }),
        }),
      );
    });
  });

  describe('getRules', () => {
    it('should throw NotFoundException if property not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getRules('property-123', 'owner-123', UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for deleted property', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue({
        ...mockProperty,
        status: PropertyStatus.DELETED,
      });

      await expect(
        service.getRules('property-123', 'owner-123', UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-owner non-admin', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);

      await expect(
        service.getRules('property-123', 'other-user', UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return rules for property owner', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.dynamicPricingRule.findMany as jest.Mock).mockResolvedValue([
        mockRule,
        mockDateRule,
      ]);

      const result = await service.getRules('property-123', 'owner-123', UserRole.USER);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(mockRule.id);
      expect(result[1].id).toBe(mockDateRule.id);
    });

    it('should return rules for admin', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.dynamicPricingRule.findMany as jest.Mock).mockResolvedValue([mockRule]);

      const result = await service.getRules('property-123', 'admin-user', UserRole.ADMIN);

      expect(result).toHaveLength(1);
    });

    it('should order by priority desc and createdAt asc', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.dynamicPricingRule.findMany as jest.Mock).mockResolvedValue([]);

      await service.getRules('property-123', 'owner-123', UserRole.USER);

      expect(prismaService.dynamicPricingRule.findMany).toHaveBeenCalledWith({
        where: { propertyId: 'property-123' },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      });
    });

    it('should return empty array when no rules', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.dynamicPricingRule.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getRules('property-123', 'owner-123', UserRole.USER);

      expect(result).toHaveLength(0);
    });
  });

  describe('getRule', () => {
    it('should throw NotFoundException if property not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getRule('property-123', 'rule-123', 'owner-123', UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-owner non-admin', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);

      await expect(
        service.getRule('property-123', 'rule-123', 'other-user', UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if rule not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.dynamicPricingRule.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getRule('property-123', 'rule-123', 'owner-123', UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return rule for property owner', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.dynamicPricingRule.findFirst as jest.Mock).mockResolvedValue(mockRule);

      const result = await service.getRule(
        'property-123',
        'rule-123',
        'owner-123',
        UserRole.USER,
      );

      expect(result.id).toBe(mockRule.id);
      expect(result.name).toBe(mockRule.name);
    });

    it('should return rule for admin', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.dynamicPricingRule.findFirst as jest.Mock).mockResolvedValue(mockRule);

      const result = await service.getRule(
        'property-123',
        'rule-123',
        'admin-user',
        UserRole.ADMIN,
      );

      expect(result.id).toBe(mockRule.id);
    });
  });

  describe('updateRule', () => {
    it('should throw NotFoundException if property not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateRule(
          'property-123',
          'rule-123',
          { name: 'Updated' },
          'owner-123',
          UserRole.USER,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-owner non-admin', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);

      await expect(
        service.updateRule(
          'property-123',
          'rule-123',
          { name: 'Updated' },
          'other-user',
          UserRole.USER,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if rule not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.dynamicPricingRule.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateRule(
          'property-123',
          'rule-123',
          { name: 'Updated' },
          'owner-123',
          UserRole.USER,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid price multiplier', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.dynamicPricingRule.findFirst as jest.Mock).mockResolvedValue(mockRule);

      await expect(
        service.updateRule(
          'property-123',
          'rule-123',
          { priceMultiplier: 'invalid' },
          'owner-123',
          UserRole.USER,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for zero price multiplier', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.dynamicPricingRule.findFirst as jest.Mock).mockResolvedValue(mockRule);

      await expect(
        service.updateRule(
          'property-123',
          'rule-123',
          { priceMultiplier: '0' },
          'owner-123',
          UserRole.USER,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update name only', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.dynamicPricingRule.findFirst as jest.Mock).mockResolvedValue(mockRule);
      (prismaService.dynamicPricingRule.update as jest.Mock).mockResolvedValue({
        ...mockRule,
        name: 'Updated Name',
      });

      const result = await service.updateRule(
        'property-123',
        'rule-123',
        { name: 'Updated Name' },
        'owner-123',
        UserRole.USER,
      );

      expect(result.name).toBe('Updated Name');
      expect(prismaService.dynamicPricingRule.update).toHaveBeenCalledWith({
        where: { id: 'rule-123' },
        data: { name: 'Updated Name' },
      });
    });

    it('should update price multiplier', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.dynamicPricingRule.findFirst as jest.Mock).mockResolvedValue(mockRule);
      (prismaService.dynamicPricingRule.update as jest.Mock).mockResolvedValue({
        ...mockRule,
        priceMultiplier: new Prisma.Decimal('2.0'),
      });

      const result = await service.updateRule(
        'property-123',
        'rule-123',
        { priceMultiplier: '2.0' },
        'owner-123',
        UserRole.USER,
      );

      expect(result.priceMultiplier).toBe('2');
    });

    it('should update multiple fields', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.dynamicPricingRule.findFirst as jest.Mock).mockResolvedValue(mockRule);
      (prismaService.dynamicPricingRule.update as jest.Mock).mockResolvedValue({
        ...mockRule,
        name: 'Updated',
        isActive: false,
        priority: 5,
      });

      await service.updateRule(
        'property-123',
        'rule-123',
        { name: 'Updated', isActive: false, priority: 5 },
        'owner-123',
        UserRole.USER,
      );

      expect(prismaService.dynamicPricingRule.update).toHaveBeenCalledWith({
        where: { id: 'rule-123' },
        data: { name: 'Updated', isActive: false, priority: 5 },
      });
    });

    it('should update dates', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.dynamicPricingRule.findFirst as jest.Mock).mockResolvedValue(mockDateRule);
      (prismaService.dynamicPricingRule.update as jest.Mock).mockResolvedValue({
        ...mockDateRule,
        startDate: new Date('2025-12-25'),
        endDate: new Date('2026-01-10'),
      });

      await service.updateRule(
        'property-123',
        'rule-456',
        { startDate: '2025-12-25', endDate: '2026-01-10' },
        'owner-123',
        UserRole.USER,
      );

      expect(prismaService.dynamicPricingRule.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            startDate: expect.any(Date),
            endDate: expect.any(Date),
          }),
        }),
      );
    });

    it('should update day of week', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.dynamicPricingRule.findFirst as jest.Mock).mockResolvedValue(mockRule);
      (prismaService.dynamicPricingRule.update as jest.Mock).mockResolvedValue({
        ...mockRule,
        dayOfWeek: 0,
      });

      await service.updateRule(
        'property-123',
        'rule-123',
        { dayOfWeek: 0 },
        'owner-123',
        UserRole.USER,
      );

      expect(prismaService.dynamicPricingRule.update).toHaveBeenCalledWith({
        where: { id: 'rule-123' },
        data: { dayOfWeek: 0 },
      });
    });
  });

  describe('deleteRule', () => {
    it('should throw NotFoundException if property not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.deleteRule('property-123', 'rule-123', 'owner-123', UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-owner non-admin', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);

      await expect(
        service.deleteRule('property-123', 'rule-123', 'other-user', UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if rule not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.dynamicPricingRule.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.deleteRule('property-123', 'rule-123', 'owner-123', UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should delete rule successfully', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.dynamicPricingRule.findFirst as jest.Mock).mockResolvedValue(mockRule);
      (prismaService.dynamicPricingRule.delete as jest.Mock).mockResolvedValue(mockRule);
      (prismaService.dynamicPricingRule.count as jest.Mock).mockResolvedValue(1);

      const result = await service.deleteRule(
        'property-123',
        'rule-123',
        'owner-123',
        UserRole.USER,
      );

      expect(result.message).toContain('deleted');
      expect(prismaService.dynamicPricingRule.delete).toHaveBeenCalledWith({
        where: { id: 'rule-123' },
      });
    });

    it('should disable dynamic pricing when last rule deleted', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.dynamicPricingRule.findFirst as jest.Mock).mockResolvedValue(mockRule);
      (prismaService.dynamicPricingRule.delete as jest.Mock).mockResolvedValue(mockRule);
      (prismaService.dynamicPricingRule.count as jest.Mock).mockResolvedValue(0);
      (prismaService.property.update as jest.Mock).mockResolvedValue({
        ...mockProperty,
        dynamicPricingEnabled: false,
      });

      await service.deleteRule('property-123', 'rule-123', 'owner-123', UserRole.USER);

      expect(prismaService.property.update).toHaveBeenCalledWith({
        where: { id: 'property-123' },
        data: { dynamicPricingEnabled: false },
      });
    });

    it('should not disable dynamic pricing when rules remain', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.dynamicPricingRule.findFirst as jest.Mock).mockResolvedValue(mockRule);
      (prismaService.dynamicPricingRule.delete as jest.Mock).mockResolvedValue(mockRule);
      (prismaService.dynamicPricingRule.count as jest.Mock).mockResolvedValue(2);

      await service.deleteRule('property-123', 'rule-123', 'owner-123', UserRole.USER);

      expect(prismaService.property.update).not.toHaveBeenCalled();
    });

    it('should allow admin to delete rule', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.dynamicPricingRule.findFirst as jest.Mock).mockResolvedValue(mockRule);
      (prismaService.dynamicPricingRule.delete as jest.Mock).mockResolvedValue(mockRule);
      (prismaService.dynamicPricingRule.count as jest.Mock).mockResolvedValue(1);

      const result = await service.deleteRule(
        'property-123',
        'rule-123',
        'admin-user',
        UserRole.ADMIN,
      );

      expect(result.message).toContain('deleted');
    });
  });

  describe('toggleRuleActive', () => {
    it('should throw NotFoundException if property not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.toggleRuleActive('property-123', 'rule-123', false, 'owner-123', UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-owner non-admin', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);

      await expect(
        service.toggleRuleActive('property-123', 'rule-123', false, 'other-user', UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if rule not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.dynamicPricingRule.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.toggleRuleActive('property-123', 'rule-123', false, 'owner-123', UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should deactivate rule', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.dynamicPricingRule.findFirst as jest.Mock).mockResolvedValue(mockRule);
      (prismaService.dynamicPricingRule.update as jest.Mock).mockResolvedValue({
        ...mockRule,
        isActive: false,
      });

      const result = await service.toggleRuleActive(
        'property-123',
        'rule-123',
        false,
        'owner-123',
        UserRole.USER,
      );

      expect(result.isActive).toBe(false);
      expect(prismaService.dynamicPricingRule.update).toHaveBeenCalledWith({
        where: { id: 'rule-123' },
        data: { isActive: false },
      });
    });

    it('should activate rule', async () => {
      const inactiveRule = { ...mockRule, isActive: false };
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.dynamicPricingRule.findFirst as jest.Mock).mockResolvedValue(inactiveRule);
      (prismaService.dynamicPricingRule.update as jest.Mock).mockResolvedValue({
        ...mockRule,
        isActive: true,
      });

      const result = await service.toggleRuleActive(
        'property-123',
        'rule-123',
        true,
        'owner-123',
        UserRole.USER,
      );

      expect(result.isActive).toBe(true);
      expect(prismaService.dynamicPricingRule.update).toHaveBeenCalledWith({
        where: { id: 'rule-123' },
        data: { isActive: true },
      });
    });
  });

  describe('response mapping', () => {
    it('should correctly map rule to response DTO', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.dynamicPricingRule.findFirst as jest.Mock).mockResolvedValue(mockRule);

      const result = await service.getRule(
        'property-123',
        'rule-123',
        'owner-123',
        UserRole.USER,
      );

      expect(result.id).toBe(mockRule.id);
      expect(result.propertyId).toBe(mockRule.propertyId);
      expect(result.name).toBe(mockRule.name);
      expect(result.dayOfWeek).toBe(mockRule.dayOfWeek);
      expect(result.priceMultiplier).toBe('1.5');
      expect(result.isActive).toBe(true);
      expect(result.priority).toBe(1);
    });

    it('should handle null dates in response', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.dynamicPricingRule.findFirst as jest.Mock).mockResolvedValue(mockRule);

      const result = await service.getRule(
        'property-123',
        'rule-123',
        'owner-123',
        UserRole.USER,
      );

      expect(result.startDate).toBeUndefined();
      expect(result.endDate).toBeUndefined();
    });

    it('should include dates when present', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.dynamicPricingRule.findFirst as jest.Mock).mockResolvedValue(mockDateRule);

      const result = await service.getRule(
        'property-123',
        'rule-456',
        'owner-123',
        UserRole.USER,
      );

      expect(result.startDate).toBeDefined();
      expect(result.endDate).toBeDefined();
      expect(result.dayOfWeek).toBeUndefined();
    });

    it('should convert Decimal to string for priceMultiplier', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.dynamicPricingRule.findMany as jest.Mock).mockResolvedValue([
        mockRule,
        { ...mockRule, id: 'rule-2', priceMultiplier: new Prisma.Decimal('0.75') },
      ]);

      const result = await service.getRules('property-123', 'owner-123', UserRole.USER);

      expect(result[0].priceMultiplier).toBe('1.5');
      expect(result[1].priceMultiplier).toBe('0.75');
    });
  });
});
