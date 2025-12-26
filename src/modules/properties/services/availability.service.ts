import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PropertyStatus, UserRole, Prisma } from '@prisma/client';
import { PrismaService } from '@/database';
import {
  CreateAvailabilitySlotDto,
  UpdateAvailabilitySlotDto,
  BulkAvailabilityDto,
  AvailabilitySlotResponseDto,
  AvailabilityQueryDto,
  CalculateCostDto,
  CostCalculationResponseDto,
} from '../dto';

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) {}

  async createSlot(
    propertyId: string,
    dto: CreateAvailabilitySlotDto,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<AvailabilitySlotResponseDto> {
    await this.verifyPropertyOwnership(propertyId, requesterId, requesterRole);

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // Check for overlapping slots
    const overlapping = await this.prisma.availabilitySlot.findFirst({
      where: {
        propertyId,
        OR: [
          { startDate: { lte: endDate }, endDate: { gte: startDate } },
        ],
      },
    });

    if (overlapping) {
      throw new BadRequestException('Availability slot overlaps with an existing slot');
    }

    const slot = await this.prisma.availabilitySlot.create({
      data: {
        propertyId,
        startDate,
        endDate,
        isAvailable: dto.isAvailable ?? true,
        pricePerNight: dto.pricePerNight ? new Prisma.Decimal(dto.pricePerNight) : null,
        notes: dto.notes,
      },
    });

    return this.mapToResponseDto(slot);
  }

  async createBulkSlots(
    propertyId: string,
    dto: BulkAvailabilityDto,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<AvailabilitySlotResponseDto[]> {
    await this.verifyPropertyOwnership(propertyId, requesterId, requesterRole);

    const results: AvailabilitySlotResponseDto[] = [];

    for (const slotDto of dto.slots) {
      const slot = await this.createSlot(propertyId, slotDto, requesterId, requesterRole);
      results.push(slot);
    }

    return results;
  }

  async getSlots(
    propertyId: string,
    query: AvailabilityQueryDto,
  ): Promise<AvailabilitySlotResponseDto[]> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property || property.status === PropertyStatus.DELETED) {
      throw new NotFoundException('Property not found');
    }

    const where: Prisma.AvailabilitySlotWhereInput = { propertyId };

    if (query.startDate) {
      where.endDate = { gte: new Date(query.startDate) };
    }

    if (query.endDate) {
      where.startDate = { lte: new Date(query.endDate) };
    }

    const slots = await this.prisma.availabilitySlot.findMany({
      where,
      orderBy: { startDate: 'asc' },
    });

    return slots.map((s) => this.mapToResponseDto(s));
  }

  async updateSlot(
    propertyId: string,
    slotId: string,
    dto: UpdateAvailabilitySlotDto,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<AvailabilitySlotResponseDto> {
    await this.verifyPropertyOwnership(propertyId, requesterId, requesterRole);

    const slot = await this.prisma.availabilitySlot.findFirst({
      where: { id: slotId, propertyId },
    });

    if (!slot) {
      throw new NotFoundException('Availability slot not found');
    }

    const updatedSlot = await this.prisma.availabilitySlot.update({
      where: { id: slotId },
      data: {
        ...(dto.isAvailable !== undefined && { isAvailable: dto.isAvailable }),
        ...(dto.pricePerNight !== undefined && {
          pricePerNight: new Prisma.Decimal(dto.pricePerNight),
        }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });

    return this.mapToResponseDto(updatedSlot);
  }

  async deleteSlot(
    propertyId: string,
    slotId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<{ message: string }> {
    await this.verifyPropertyOwnership(propertyId, requesterId, requesterRole);

    const slot = await this.prisma.availabilitySlot.findFirst({
      where: { id: slotId, propertyId },
    });

    if (!slot) {
      throw new NotFoundException('Availability slot not found');
    }

    await this.prisma.availabilitySlot.delete({
      where: { id: slotId },
    });

    return { message: 'Availability slot deleted successfully' };
  }

  async calculateCost(
    propertyId: string,
    dto: CalculateCostDto,
  ): Promise<CostCalculationResponseDto> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        dynamicPricingRules: {
          where: { isActive: true },
          orderBy: { priority: 'desc' },
        },
        availabilitySlots: {
          where: {
            isAvailable: true,
          },
        },
      },
    });

    if (!property || property.status === PropertyStatus.DELETED) {
      throw new NotFoundException('Property not found');
    }

    const checkIn = new Date(dto.checkIn);
    const checkOut = new Date(dto.checkOut);

    if (checkOut <= checkIn) {
      throw new BadRequestException('Check-out must be after check-in');
    }

    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

    // Get base price from property or availability slots
    const basePrice = property.basePrice;
    const breakdown: CostCalculationResponseDto['breakdown'] = [];
    let subtotal = new Prisma.Decimal(0);

    // Calculate price for each night
    for (let i = 0; i < nights; i++) {
      const date = new Date(checkIn);
      date.setDate(date.getDate() + i);

      // Check if there's a specific availability slot with custom pricing
      const slot = property.availabilitySlots.find(
        (s) => date >= s.startDate && date < s.endDate,
      );

      const nightBasePrice = slot?.pricePerNight || basePrice;
      let multiplier = new Prisma.Decimal(1);
      let appliedRule: string | undefined;

      // Apply dynamic pricing rules
      if (property.dynamicPricingEnabled) {
        for (const rule of property.dynamicPricingRules) {
          // Check date-based rule
          if (rule.startDate && rule.endDate) {
            if (date >= rule.startDate && date <= rule.endDate) {
              multiplier = rule.priceMultiplier;
              appliedRule = rule.name;
              break;
            }
          }
          // Check day-of-week rule
          if (rule.dayOfWeek !== null && rule.dayOfWeek === date.getDay()) {
            multiplier = rule.priceMultiplier;
            appliedRule = rule.name;
            break;
          }
        }
      }

      const finalPrice = nightBasePrice.mul(multiplier);
      subtotal = subtotal.add(finalPrice);

      breakdown.push({
        date: date.toISOString().split('T')[0],
        basePrice: nightBasePrice.toString(),
        multiplier: multiplier.toString(),
        finalPrice: finalPrice.toFixed(2),
        appliedRule,
      });
    }

    return {
      checkIn,
      checkOut,
      nights,
      basePricePerNight: basePrice.toString(),
      breakdown,
      subtotal: subtotal.toFixed(2),
      total: subtotal.toFixed(2), // Add fees here in the future
      currency: property.currency,
    };
  }

  private async verifyPropertyOwnership(
    propertyId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<void> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.ownerId !== requesterId && requesterRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only manage availability for your own properties');
    }

    if (property.status === PropertyStatus.DELETED) {
      throw new BadRequestException('Cannot manage availability for a deleted property');
    }
  }

  private mapToResponseDto(slot: {
    id: string;
    propertyId: string;
    startDate: Date;
    endDate: Date;
    isAvailable: boolean;
    pricePerNight: Prisma.Decimal | null;
    notes: string | null;
    createdAt: Date;
  }): AvailabilitySlotResponseDto {
    return {
      id: slot.id,
      propertyId: slot.propertyId,
      startDate: slot.startDate,
      endDate: slot.endDate,
      isAvailable: slot.isAvailable,
      pricePerNight: slot.pricePerNight?.toString(),
      notes: slot.notes || undefined,
      createdAt: slot.createdAt,
    };
  }
}
