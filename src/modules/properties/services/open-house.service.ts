import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PropertyStatus, UserRole } from '@prisma/client';
import { PrismaService } from '@/database';
import {
  CreateOpenHouseDto,
  UpdateOpenHouseDto,
  OpenHouseResponseDto,
  OpenHouseQueryDto,
} from '../dto';

@Injectable()
export class OpenHouseService {
  constructor(private prisma: PrismaService) {}

  async create(
    propertyId: string,
    dto: CreateOpenHouseDto,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<OpenHouseResponseDto> {
    await this.verifyPropertyOwnership(propertyId, requesterId, requesterRole);

    // Validate time format and logic
    const [startHour, startMin] = dto.startTime.split(':').map(Number);
    const [endHour, endMin] = dto.endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (endMinutes <= startMinutes) {
      throw new BadRequestException('End time must be after start time');
    }

    const eventDate = new Date(dto.date);

    // Check for overlapping open house events on the same date
    const existingEvents = await this.prisma.openHouseEvent.findMany({
      where: {
        propertyId,
        date: {
          gte: new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate()),
          lt: new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate() + 1),
        },
      },
    });

    for (const event of existingEvents) {
      const [eventStartHour, eventStartMin] = event.startTime.split(':').map(Number);
      const [eventEndHour, eventEndMin] = event.endTime.split(':').map(Number);
      const eventStartMinutes = eventStartHour * 60 + eventStartMin;
      const eventEndMinutes = eventEndHour * 60 + eventEndMin;

      if (startMinutes < eventEndMinutes && endMinutes > eventStartMinutes) {
        throw new BadRequestException('Open house event overlaps with an existing event');
      }
    }

    const openHouse = await this.prisma.openHouseEvent.create({
      data: {
        propertyId,
        date: new Date(dto.date),
        startTime: dto.startTime,
        endTime: dto.endTime,
        description: dto.description,
        isPublic: dto.isPublic ?? true,
        maxAttendees: dto.maxAttendees,
      },
    });

    return this.mapToResponseDto(openHouse);
  }

  async findAll(
    propertyId: string,
    query: OpenHouseQueryDto,
    requesterId?: string,
    requesterRole?: UserRole,
  ): Promise<OpenHouseResponseDto[]> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property || property.status === PropertyStatus.DELETED) {
      throw new NotFoundException('Property not found');
    }

    const isOwnerOrAdmin =
      property.ownerId === requesterId || requesterRole === UserRole.ADMIN;

    const where: Record<string, unknown> = { propertyId };

    // Non-owners can only see public events
    if (!isOwnerOrAdmin) {
      where.isPublic = true;
    }

    if (query.date) {
      const date = new Date(query.date);
      where.date = {
        gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
        lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
      };
    } else if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) {
        (where.date as Record<string, unknown>).gte = new Date(query.startDate);
      }
      if (query.endDate) {
        (where.date as Record<string, unknown>).lte = new Date(query.endDate);
      }
    } else if (query.upcomingOnly) {
      // Only future events (from today onwards)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      where.date = { gte: today };
    }

    const events = await this.prisma.openHouseEvent.findMany({
      where,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    return events.map((e) => this.mapToResponseDto(e));
  }

  async findOne(
    propertyId: string,
    eventId: string,
    requesterId?: string,
    requesterRole?: UserRole,
  ): Promise<OpenHouseResponseDto> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property || property.status === PropertyStatus.DELETED) {
      throw new NotFoundException('Property not found');
    }

    const event = await this.prisma.openHouseEvent.findFirst({
      where: { id: eventId, propertyId },
    });

    if (!event) {
      throw new NotFoundException('Open house event not found');
    }

    // Non-owners can only see public events
    const isOwnerOrAdmin =
      property.ownerId === requesterId || requesterRole === UserRole.ADMIN;

    if (!event.isPublic && !isOwnerOrAdmin) {
      throw new NotFoundException('Open house event not found');
    }

    return this.mapToResponseDto(event);
  }

  async update(
    propertyId: string,
    eventId: string,
    dto: UpdateOpenHouseDto,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<OpenHouseResponseDto> {
    await this.verifyPropertyOwnership(propertyId, requesterId, requesterRole);

    const event = await this.prisma.openHouseEvent.findFirst({
      where: { id: eventId, propertyId },
    });

    if (!event) {
      throw new NotFoundException('Open house event not found');
    }

    // Validate time if both are provided
    const startTime = dto.startTime ?? event.startTime;
    const endTime = dto.endTime ?? event.endTime;

    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (endMinutes <= startMinutes) {
      throw new BadRequestException('End time must be after start time');
    }

    // Check for overlapping events if date or times are changing
    if (dto.date || dto.startTime || dto.endTime) {
      const eventDate = dto.date ? new Date(dto.date) : event.date;

      const existingEvents = await this.prisma.openHouseEvent.findMany({
        where: {
          propertyId,
          id: { not: eventId },
          date: {
            gte: new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate()),
            lt: new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate() + 1),
          },
        },
      });

      for (const existing of existingEvents) {
        const [existingStartHour, existingStartMin] = existing.startTime.split(':').map(Number);
        const [existingEndHour, existingEndMin] = existing.endTime.split(':').map(Number);
        const existingStartMinutes = existingStartHour * 60 + existingStartMin;
        const existingEndMinutes = existingEndHour * 60 + existingEndMin;

        if (startMinutes < existingEndMinutes && endMinutes > existingStartMinutes) {
          throw new BadRequestException('Open house event overlaps with an existing event');
        }
      }
    }

    const updated = await this.prisma.openHouseEvent.update({
      where: { id: eventId },
      data: {
        date: dto.date ? new Date(dto.date) : undefined,
        startTime: dto.startTime,
        endTime: dto.endTime,
        description: dto.description,
        isPublic: dto.isPublic,
        maxAttendees: dto.maxAttendees,
      },
    });

    return this.mapToResponseDto(updated);
  }

  async delete(
    propertyId: string,
    eventId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<{ message: string }> {
    await this.verifyPropertyOwnership(propertyId, requesterId, requesterRole);

    const event = await this.prisma.openHouseEvent.findFirst({
      where: { id: eventId, propertyId },
    });

    if (!event) {
      throw new NotFoundException('Open house event not found');
    }

    await this.prisma.openHouseEvent.delete({
      where: { id: eventId },
    });

    return { message: 'Open house event deleted successfully' };
  }

  async getUpcomingOpenHouses(
    limit = 10,
  ): Promise<(OpenHouseResponseDto & { property: { id: string; title: string; city: string } })[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const events = await this.prisma.openHouseEvent.findMany({
      where: {
        date: { gte: today },
        isPublic: true,
        property: {
          status: PropertyStatus.ACTIVE,
        },
      },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            city: true,
          },
        },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      take: limit,
    });

    return events.map((e) => ({
      ...this.mapToResponseDto(e),
      property: e.property,
    }));
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
      throw new ForbiddenException('You can only manage open houses for your own properties');
    }

    if (property.status === PropertyStatus.DELETED) {
      throw new BadRequestException('Cannot manage open houses for a deleted property');
    }
  }

  private mapToResponseDto(event: {
    id: string;
    propertyId: string;
    date: Date;
    startTime: string;
    endTime: string;
    description: string | null;
    isPublic: boolean;
    maxAttendees: number | null;
    createdAt: Date;
    updatedAt: Date;
  }): OpenHouseResponseDto {
    return {
      id: event.id,
      propertyId: event.propertyId,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      description: event.description || undefined,
      isPublic: event.isPublic,
      maxAttendees: event.maxAttendees || undefined,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };
  }
}
