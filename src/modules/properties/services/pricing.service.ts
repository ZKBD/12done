import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PropertyStatus, UserRole, Prisma } from '@prisma/client';
import { PrismaService } from '@/database';
import {
  CreateDynamicPricingRuleDto,
  UpdateDynamicPricingRuleDto,
  DynamicPricingRuleResponseDto,
} from '../dto';

@Injectable()
export class PricingService {
  constructor(private prisma: PrismaService) {}

  async createRule(
    propertyId: string,
    dto: CreateDynamicPricingRuleDto,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<DynamicPricingRuleResponseDto> {
    const property = await this.verifyPropertyOwnership(propertyId, requesterId, requesterRole);

    // Validate rule logic
    if (!dto.startDate && !dto.endDate && dto.dayOfWeek === undefined) {
      throw new BadRequestException('Rule must have either a date range or day of week');
    }

    if ((dto.startDate && !dto.endDate) || (!dto.startDate && dto.endDate)) {
      throw new BadRequestException('Both start and end date must be provided for date-based rules');
    }

    if (dto.startDate && dto.endDate) {
      if (new Date(dto.endDate) <= new Date(dto.startDate)) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    const multiplier = parseFloat(dto.priceMultiplier);
    if (isNaN(multiplier) || multiplier <= 0) {
      throw new BadRequestException('Price multiplier must be a positive number');
    }

    const rule = await this.prisma.dynamicPricingRule.create({
      data: {
        propertyId,
        name: dto.name,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        dayOfWeek: dto.dayOfWeek,
        priceMultiplier: new Prisma.Decimal(dto.priceMultiplier),
        isActive: dto.isActive ?? true,
        priority: dto.priority ?? 0,
      },
    });

    // Enable dynamic pricing on property if not already
    if (!property.dynamicPricingEnabled) {
      await this.prisma.property.update({
        where: { id: propertyId },
        data: { dynamicPricingEnabled: true },
      });
    }

    return this.mapToResponseDto(rule);
  }

  async getRules(
    propertyId: string,
    requesterId?: string,
    requesterRole?: UserRole,
  ): Promise<DynamicPricingRuleResponseDto[]> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property || property.status === PropertyStatus.DELETED) {
      throw new NotFoundException('Property not found');
    }

    // Only owner or admin can see pricing rules
    if (property.ownerId !== requesterId && requesterRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only view pricing rules for your own properties');
    }

    const rules = await this.prisma.dynamicPricingRule.findMany({
      where: { propertyId },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    return rules.map((r) => this.mapToResponseDto(r));
  }

  async getRule(
    propertyId: string,
    ruleId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<DynamicPricingRuleResponseDto> {
    await this.verifyPropertyOwnership(propertyId, requesterId, requesterRole);

    const rule = await this.prisma.dynamicPricingRule.findFirst({
      where: { id: ruleId, propertyId },
    });

    if (!rule) {
      throw new NotFoundException('Pricing rule not found');
    }

    return this.mapToResponseDto(rule);
  }

  async updateRule(
    propertyId: string,
    ruleId: string,
    dto: UpdateDynamicPricingRuleDto,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<DynamicPricingRuleResponseDto> {
    await this.verifyPropertyOwnership(propertyId, requesterId, requesterRole);

    const rule = await this.prisma.dynamicPricingRule.findFirst({
      where: { id: ruleId, propertyId },
    });

    if (!rule) {
      throw new NotFoundException('Pricing rule not found');
    }

    const updateData: Prisma.DynamicPricingRuleUpdateInput = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.startDate !== undefined) updateData.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) updateData.endDate = new Date(dto.endDate);
    if (dto.dayOfWeek !== undefined) updateData.dayOfWeek = dto.dayOfWeek;
    if (dto.priceMultiplier !== undefined) {
      const multiplier = parseFloat(dto.priceMultiplier);
      if (isNaN(multiplier) || multiplier <= 0) {
        throw new BadRequestException('Price multiplier must be a positive number');
      }
      updateData.priceMultiplier = new Prisma.Decimal(dto.priceMultiplier);
    }
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.priority !== undefined) updateData.priority = dto.priority;

    const updatedRule = await this.prisma.dynamicPricingRule.update({
      where: { id: ruleId },
      data: updateData,
    });

    return this.mapToResponseDto(updatedRule);
  }

  async deleteRule(
    propertyId: string,
    ruleId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<{ message: string }> {
    await this.verifyPropertyOwnership(propertyId, requesterId, requesterRole);

    const rule = await this.prisma.dynamicPricingRule.findFirst({
      where: { id: ruleId, propertyId },
    });

    if (!rule) {
      throw new NotFoundException('Pricing rule not found');
    }

    await this.prisma.dynamicPricingRule.delete({
      where: { id: ruleId },
    });

    // Check if there are any remaining rules
    const remainingRules = await this.prisma.dynamicPricingRule.count({
      where: { propertyId },
    });

    // Disable dynamic pricing if no rules left
    if (remainingRules === 0) {
      await this.prisma.property.update({
        where: { id: propertyId },
        data: { dynamicPricingEnabled: false },
      });
    }

    return { message: 'Pricing rule deleted successfully' };
  }

  async toggleRuleActive(
    propertyId: string,
    ruleId: string,
    isActive: boolean,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<DynamicPricingRuleResponseDto> {
    await this.verifyPropertyOwnership(propertyId, requesterId, requesterRole);

    const rule = await this.prisma.dynamicPricingRule.findFirst({
      where: { id: ruleId, propertyId },
    });

    if (!rule) {
      throw new NotFoundException('Pricing rule not found');
    }

    const updatedRule = await this.prisma.dynamicPricingRule.update({
      where: { id: ruleId },
      data: { isActive },
    });

    return this.mapToResponseDto(updatedRule);
  }

  private async verifyPropertyOwnership(
    propertyId: string,
    requesterId: string,
    requesterRole: UserRole,
  ) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.ownerId !== requesterId && requesterRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only manage pricing for your own properties');
    }

    if (property.status === PropertyStatus.DELETED) {
      throw new BadRequestException('Cannot manage pricing for a deleted property');
    }

    return property;
  }

  private mapToResponseDto(rule: {
    id: string;
    propertyId: string;
    name: string;
    startDate: Date | null;
    endDate: Date | null;
    dayOfWeek: number | null;
    priceMultiplier: Prisma.Decimal;
    isActive: boolean;
    priority: number;
    createdAt: Date;
  }): DynamicPricingRuleResponseDto {
    return {
      id: rule.id,
      propertyId: rule.propertyId,
      name: rule.name,
      startDate: rule.startDate || undefined,
      endDate: rule.endDate || undefined,
      dayOfWeek: rule.dayOfWeek ?? undefined,
      priceMultiplier: rule.priceMultiplier.toString(),
      isActive: rule.isActive,
      priority: rule.priority,
      createdAt: rule.createdAt,
    };
  }
}
