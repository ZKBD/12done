import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PropertyStatus, UserRole, NotificationType } from '@prisma/client';
import { PrismaService } from '@/database';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import {
  CreateInspectionSlotDto,
  BulkInspectionSlotsDto,
  InspectionSlotResponseDto,
  InspectionQueryDto,
} from '../dto';

@Injectable()
export class InspectionService {
  private readonly logger = new Logger(InspectionService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async createSlot(
    propertyId: string,
    dto: CreateInspectionSlotDto,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<InspectionSlotResponseDto> {
    await this.verifyPropertyOwnership(propertyId, requesterId, requesterRole);

    const date = new Date(dto.date);

    // Validate time format and logic
    const [startHour, startMin] = dto.startTime.split(':').map(Number);
    const [endHour, endMin] = dto.endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (endMinutes <= startMinutes) {
      throw new BadRequestException('End time must be after start time');
    }

    // Check for overlapping slots on the same date
    const existingSlots = await this.prisma.inspectionSlot.findMany({
      where: {
        propertyId,
        date: {
          gte: new Date(date.setHours(0, 0, 0, 0)),
          lt: new Date(date.setHours(23, 59, 59, 999)),
        },
      },
    });

    for (const slot of existingSlots) {
      const [slotStartHour, slotStartMin] = slot.startTime.split(':').map(Number);
      const [slotEndHour, slotEndMin] = slot.endTime.split(':').map(Number);
      const slotStartMinutes = slotStartHour * 60 + slotStartMin;
      const slotEndMinutes = slotEndHour * 60 + slotEndMin;

      if (startMinutes < slotEndMinutes && endMinutes > slotStartMinutes) {
        throw new BadRequestException('Inspection slot overlaps with an existing slot');
      }
    }

    const inspectionSlot = await this.prisma.inspectionSlot.create({
      data: {
        propertyId,
        date: new Date(dto.date),
        startTime: dto.startTime,
        endTime: dto.endTime,
      },
      include: {
        bookedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });

    return this.mapToResponseDto(inspectionSlot);
  }

  async createBulkSlots(
    propertyId: string,
    dto: BulkInspectionSlotsDto,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<InspectionSlotResponseDto[]> {
    await this.verifyPropertyOwnership(propertyId, requesterId, requesterRole);

    const results: InspectionSlotResponseDto[] = [];

    for (const slotDto of dto.slots) {
      const slot = await this.createSlot(propertyId, slotDto, requesterId, requesterRole);
      results.push(slot);
    }

    return results;
  }

  async getSlots(
    propertyId: string,
    query: InspectionQueryDto,
    requesterId?: string,
    requesterRole?: UserRole,
  ): Promise<InspectionSlotResponseDto[]> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property || property.status === PropertyStatus.DELETED) {
      throw new NotFoundException('Property not found');
    }

    const isOwnerOrAdmin =
      property.ownerId === requesterId || requesterRole === UserRole.ADMIN;

    const where: Record<string, unknown> = { propertyId };

    if (query.date) {
      const date = new Date(query.date);
      where.date = {
        gte: new Date(date.setHours(0, 0, 0, 0)),
        lt: new Date(new Date(query.date).setHours(23, 59, 59, 999)),
      };
    } else if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) {
        (where.date as Record<string, unknown>).gte = new Date(query.startDate);
      }
      if (query.endDate) {
        (where.date as Record<string, unknown>).lte = new Date(query.endDate);
      }
    } else {
      // Default to future slots only
      where.date = { gte: new Date() };
    }

    // Non-owners can only see available (unbooked) slots
    if (!isOwnerOrAdmin) {
      where.isBooked = false;
    }

    const slots = await this.prisma.inspectionSlot.findMany({
      where,
      include: isOwnerOrAdmin
        ? {
            bookedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          }
        : undefined,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    return slots.map((s) => this.mapToResponseDto(s, !isOwnerOrAdmin));
  }

  async bookSlot(
    propertyId: string,
    slotId: string,
    userId: string,
  ): Promise<InspectionSlotResponseDto> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property || property.status === PropertyStatus.DELETED) {
      throw new NotFoundException('Property not found');
    }

    if (property.status !== PropertyStatus.ACTIVE) {
      throw new BadRequestException('Cannot book inspection for inactive property');
    }

    // Property owner cannot book their own inspection
    if (property.ownerId === userId) {
      throw new BadRequestException('You cannot book an inspection for your own property');
    }

    const slot = await this.prisma.inspectionSlot.findFirst({
      where: { id: slotId, propertyId },
    });

    if (!slot) {
      throw new NotFoundException('Inspection slot not found');
    }

    if (slot.isBooked) {
      throw new BadRequestException('This inspection slot is already booked');
    }

    // Check if slot date is in the past
    if (new Date(slot.date) < new Date()) {
      throw new BadRequestException('Cannot book a past inspection slot');
    }

    const updatedSlot = await this.prisma.inspectionSlot.update({
      where: { id: slotId },
      data: {
        isBooked: true,
        bookedById: userId,
        bookedAt: new Date(),
      },
      include: {
        bookedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });

    // Send notification to property owner
    try {
      const bookerName = updatedSlot.bookedBy
        ? `${updatedSlot.bookedBy.firstName} ${updatedSlot.bookedBy.lastName}`
        : 'A user';
      const formattedDate = new Date(updatedSlot.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      await this.notifications.create(
        property.ownerId,
        NotificationType.INSPECTION_BOOKED,
        'Inspection Booked',
        `${bookerName} has booked an inspection for your property on ${formattedDate} at ${updatedSlot.startTime}.`,
        {
          propertyId,
          slotId: updatedSlot.id,
          bookedById: userId,
          date: updatedSlot.date.toISOString(),
          startTime: updatedSlot.startTime,
          endTime: updatedSlot.endTime,
        },
      );
    } catch (error) {
      this.logger.error(`Failed to send inspection booking notification: ${error}`);
    }

    return this.mapToResponseDto(updatedSlot);
  }

  async cancelBooking(
    propertyId: string,
    slotId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<InspectionSlotResponseDto> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    const slot = await this.prisma.inspectionSlot.findFirst({
      where: { id: slotId, propertyId },
      include: {
        bookedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!slot) {
      throw new NotFoundException('Inspection slot not found');
    }

    if (!slot.isBooked) {
      throw new BadRequestException('This slot is not booked');
    }

    // Only the booker, property owner, or admin can cancel
    const canCancel =
      slot.bookedById === requesterId ||
      property.ownerId === requesterId ||
      requesterRole === UserRole.ADMIN;

    if (!canCancel) {
      throw new ForbiddenException('You cannot cancel this booking');
    }

    // Store booker info before clearing
    const originalBookerId = slot.bookedById;
    const bookerName = slot.bookedBy
      ? `${slot.bookedBy.firstName} ${slot.bookedBy.lastName}`
      : 'The user';

    const updatedSlot = await this.prisma.inspectionSlot.update({
      where: { id: slotId },
      data: {
        isBooked: false,
        bookedById: null,
        bookedAt: null,
      },
    });

    // Send cancellation notifications
    try {
      const formattedDate = new Date(slot.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const isCancelledByOwner = requesterId === property.ownerId;
      const isCancelledByBooker = requesterId === originalBookerId;

      // Notify property owner if booker cancelled
      if (isCancelledByBooker && originalBookerId !== property.ownerId) {
        await this.notifications.create(
          property.ownerId,
          NotificationType.INSPECTION_CANCELLED,
          'Inspection Cancelled',
          `${bookerName} has cancelled their inspection on ${formattedDate} at ${slot.startTime}.`,
          {
            propertyId,
            slotId: slot.id,
            cancelledById: requesterId,
            date: slot.date.toISOString(),
            startTime: slot.startTime,
            endTime: slot.endTime,
          },
        );
      }

      // Notify booker if owner or admin cancelled
      if ((isCancelledByOwner || requesterRole === UserRole.ADMIN) && originalBookerId) {
        await this.notifications.create(
          originalBookerId,
          NotificationType.INSPECTION_CANCELLED,
          'Inspection Cancelled',
          `Your inspection scheduled for ${formattedDate} at ${slot.startTime} has been cancelled by the property owner.`,
          {
            propertyId,
            slotId: slot.id,
            cancelledById: requesterId,
            date: slot.date.toISOString(),
            startTime: slot.startTime,
            endTime: slot.endTime,
          },
        );
      }
    } catch (error) {
      this.logger.error(`Failed to send inspection cancellation notification: ${error}`);
    }

    return this.mapToResponseDto(updatedSlot);
  }

  async deleteSlot(
    propertyId: string,
    slotId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<{ message: string }> {
    await this.verifyPropertyOwnership(propertyId, requesterId, requesterRole);

    const slot = await this.prisma.inspectionSlot.findFirst({
      where: { id: slotId, propertyId },
    });

    if (!slot) {
      throw new NotFoundException('Inspection slot not found');
    }

    if (slot.isBooked) {
      throw new BadRequestException('Cannot delete a booked inspection slot. Cancel the booking first.');
    }

    await this.prisma.inspectionSlot.delete({
      where: { id: slotId },
    });

    return { message: 'Inspection slot deleted successfully' };
  }

  async getMyBookings(userId: string): Promise<InspectionSlotResponseDto[]> {
    const slots = await this.prisma.inspectionSlot.findMany({
      where: {
        bookedById: userId,
      },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            address: true,
            city: true,
          },
        },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    return slots.map((s) => this.mapToResponseDto(s));
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
      throw new ForbiddenException('You can only manage inspections for your own properties');
    }

    if (property.status === PropertyStatus.DELETED) {
      throw new BadRequestException('Cannot manage inspections for a deleted property');
    }
  }

  private mapToResponseDto(
    slot: {
      id: string;
      propertyId: string;
      date: Date;
      startTime: string;
      endTime: string;
      isBooked: boolean;
      bookedById: string | null;
      bookedAt: Date | null;
      createdAt: Date;
      bookedBy?: {
        id: string;
        firstName: string;
        lastName: string;
        phone: string | null;
      } | null;
    },
    hideBookerInfo = false,
  ): InspectionSlotResponseDto {
    return {
      id: slot.id,
      propertyId: slot.propertyId,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      isBooked: slot.isBooked,
      bookedById: hideBookerInfo ? undefined : slot.bookedById || undefined,
      bookedBy:
        !hideBookerInfo && slot.bookedBy
          ? {
              id: slot.bookedBy.id,
              firstName: slot.bookedBy.firstName,
              lastName: slot.bookedBy.lastName,
              phone: slot.bookedBy.phone || undefined,
            }
          : undefined,
      bookedAt: slot.bookedAt || undefined,
      createdAt: slot.createdAt,
    };
  }
}
