import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  CreateTripPlanDto,
  UpdateTripPlanDto,
  CreateTripDayDto,
  UpdateTripDayDto,
  CreateActivityDto,
  UpdateActivityDto,
  TripPlanResponseDto,
  TripDayResponseDto,
  TripActivityResponseDto,
  TripPlanStatus,
} from '../dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class TripPlanService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new trip plan
   */
  async createTripPlan(
    userId: string,
    dto: CreateTripPlanDto,
  ): Promise<TripPlanResponseDto> {
    // Verify property exists
    const property = await this.prisma.property.findUnique({
      where: { id: dto.propertyId },
    });
    if (!property) {
      throw new NotFoundException('Property not found');
    }

    // Validate dates
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // Create trip plan with days
    const tripPlan = await this.prisma.tripPlan.create({
      data: {
        userId,
        propertyId: dto.propertyId,
        sessionId: dto.sessionId,
        title: dto.title,
        description: dto.description,
        startDate,
        endDate,
        totalBudget: dto.totalBudget,
        currency: dto.currency || 'EUR',
        days: dto.days
          ? {
              create: dto.days.map((day, index) => ({
                date: new Date(day.date),
                dayNumber: day.dayNumber || index + 1,
                title: day.title,
                notes: day.notes,
                activities: day.activities
                  ? {
                      create: day.activities.map((act, actIndex) => ({
                        title: act.title,
                        description: act.description,
                        startTime: act.startTime,
                        endTime: act.endTime,
                        location: act.location,
                        address: act.address,
                        latitude: act.latitude,
                        longitude: act.longitude,
                        estimatedCost: act.estimatedCost,
                        category: act.category,
                        attractionId: act.attractionId,
                        bookingId: act.bookingId,
                        notes: act.notes,
                        order: act.order ?? actIndex,
                      })),
                    }
                  : undefined,
              })),
            }
          : undefined,
      },
      include: {
        days: {
          include: {
            activities: {
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { dayNumber: 'asc' },
        },
      },
    });

    // Link to session if provided
    if (dto.sessionId) {
      await this.prisma.stayPlanningSession.update({
        where: { id: dto.sessionId },
        data: { isCompleted: true },
      });
    }

    return this.mapToResponse(tripPlan);
  }

  /**
   * Get trip plan by ID
   */
  async getTripPlan(
    userId: string,
    tripPlanId: string,
  ): Promise<TripPlanResponseDto> {
    const tripPlan = await this.prisma.tripPlan.findFirst({
      where: { id: tripPlanId, userId },
      include: {
        days: {
          include: {
            activities: {
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { dayNumber: 'asc' },
        },
      },
    });

    if (!tripPlan) {
      throw new NotFoundException('Trip plan not found');
    }

    return this.mapToResponse(tripPlan);
  }

  /**
   * Get all trip plans for a user
   */
  async getUserTripPlans(
    userId: string,
    options?: {
      propertyId?: string;
      status?: TripPlanStatus;
      upcoming?: boolean;
    },
  ): Promise<TripPlanResponseDto[]> {
    const where: Prisma.TripPlanWhereInput = { userId };

    if (options?.propertyId) {
      where.propertyId = options.propertyId;
    }
    if (options?.status) {
      where.status = options.status;
    }
    if (options?.upcoming) {
      where.startDate = { gte: new Date() };
    }

    const tripPlans = await this.prisma.tripPlan.findMany({
      where,
      include: {
        days: {
          include: {
            activities: {
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { dayNumber: 'asc' },
        },
      },
      orderBy: { startDate: 'asc' },
    });

    return tripPlans.map((tp) => this.mapToResponse(tp));
  }

  /**
   * Update trip plan
   */
  async updateTripPlan(
    userId: string,
    tripPlanId: string,
    dto: UpdateTripPlanDto,
  ): Promise<TripPlanResponseDto> {
    const tripPlan = await this.prisma.tripPlan.findFirst({
      where: { id: tripPlanId, userId },
    });

    if (!tripPlan) {
      throw new NotFoundException('Trip plan not found');
    }

    // Validate dates if provided
    if (dto.startDate && dto.endDate) {
      const startDate = new Date(dto.startDate);
      const endDate = new Date(dto.endDate);
      if (endDate <= startDate) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    const updated = await this.prisma.tripPlan.update({
      where: { id: tripPlanId },
      data: {
        title: dto.title,
        description: dto.description,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        totalBudget: dto.totalBudget,
        currency: dto.currency,
        status: dto.status,
      },
      include: {
        days: {
          include: {
            activities: {
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { dayNumber: 'asc' },
        },
      },
    });

    return this.mapToResponse(updated);
  }

  /**
   * Delete trip plan
   */
  async deleteTripPlan(userId: string, tripPlanId: string): Promise<void> {
    const tripPlan = await this.prisma.tripPlan.findFirst({
      where: { id: tripPlanId, userId },
    });

    if (!tripPlan) {
      throw new NotFoundException('Trip plan not found');
    }

    await this.prisma.tripPlan.delete({
      where: { id: tripPlanId },
    });
  }

  /**
   * Add a day to trip plan
   */
  async addDay(
    userId: string,
    tripPlanId: string,
    dto: CreateTripDayDto,
  ): Promise<TripDayResponseDto> {
    const tripPlan = await this.prisma.tripPlan.findFirst({
      where: { id: tripPlanId, userId },
      include: { days: true },
    });

    if (!tripPlan) {
      throw new NotFoundException('Trip plan not found');
    }

    const dayNumber = dto.dayNumber || tripPlan.days.length + 1;

    const day = await this.prisma.tripDay.create({
      data: {
        tripPlanId,
        date: new Date(dto.date),
        dayNumber,
        title: dto.title,
        notes: dto.notes,
        activities: dto.activities
          ? {
              create: dto.activities.map((act, index) => ({
                title: act.title,
                description: act.description,
                startTime: act.startTime,
                endTime: act.endTime,
                location: act.location,
                address: act.address,
                latitude: act.latitude,
                longitude: act.longitude,
                estimatedCost: act.estimatedCost,
                category: act.category,
                attractionId: act.attractionId,
                bookingId: act.bookingId,
                notes: act.notes,
                order: act.order ?? index,
              })),
            }
          : undefined,
      },
      include: {
        activities: {
          orderBy: { order: 'asc' },
        },
      },
    });

    return this.mapDayToResponse(day);
  }

  /**
   * Update a day
   */
  async updateDay(
    userId: string,
    dayId: string,
    dto: UpdateTripDayDto,
  ): Promise<TripDayResponseDto> {
    const day = await this.prisma.tripDay.findUnique({
      where: { id: dayId },
      include: { tripPlan: true },
    });

    if (!day || day.tripPlan.userId !== userId) {
      throw new NotFoundException('Day not found');
    }

    const updated = await this.prisma.tripDay.update({
      where: { id: dayId },
      data: {
        date: dto.date ? new Date(dto.date) : undefined,
        dayNumber: dto.dayNumber,
        title: dto.title,
        notes: dto.notes,
      },
      include: {
        activities: {
          orderBy: { order: 'asc' },
        },
      },
    });

    return this.mapDayToResponse(updated);
  }

  /**
   * Delete a day
   */
  async deleteDay(userId: string, dayId: string): Promise<void> {
    const day = await this.prisma.tripDay.findUnique({
      where: { id: dayId },
      include: { tripPlan: true },
    });

    if (!day || day.tripPlan.userId !== userId) {
      throw new NotFoundException('Day not found');
    }

    await this.prisma.tripDay.delete({
      where: { id: dayId },
    });
  }

  /**
   * Add activity to a day
   */
  async addActivity(
    userId: string,
    dayId: string,
    dto: CreateActivityDto,
  ): Promise<TripActivityResponseDto> {
    const day = await this.prisma.tripDay.findUnique({
      where: { id: dayId },
      include: {
        tripPlan: true,
        activities: true,
      },
    });

    if (!day || day.tripPlan.userId !== userId) {
      throw new NotFoundException('Day not found');
    }

    const order = dto.order ?? day.activities.length;

    const activity = await this.prisma.tripActivity.create({
      data: {
        dayId,
        title: dto.title,
        description: dto.description,
        startTime: dto.startTime,
        endTime: dto.endTime,
        location: dto.location,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
        estimatedCost: dto.estimatedCost,
        category: dto.category,
        attractionId: dto.attractionId,
        bookingId: dto.bookingId,
        notes: dto.notes,
        order,
      },
    });

    return this.mapActivityToResponse(activity);
  }

  /**
   * Update an activity
   */
  async updateActivity(
    userId: string,
    activityId: string,
    dto: UpdateActivityDto,
  ): Promise<TripActivityResponseDto> {
    const activity = await this.prisma.tripActivity.findUnique({
      where: { id: activityId },
      include: {
        day: {
          include: { tripPlan: true },
        },
      },
    });

    if (!activity || activity.day.tripPlan.userId !== userId) {
      throw new NotFoundException('Activity not found');
    }

    const updated = await this.prisma.tripActivity.update({
      where: { id: activityId },
      data: {
        title: dto.title,
        description: dto.description,
        startTime: dto.startTime,
        endTime: dto.endTime,
        location: dto.location,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
        estimatedCost: dto.estimatedCost,
        category: dto.category,
        attractionId: dto.attractionId,
        bookingId: dto.bookingId,
        notes: dto.notes,
        order: dto.order,
        isCompleted: dto.isCompleted,
      },
    });

    return this.mapActivityToResponse(updated);
  }

  /**
   * Delete an activity
   */
  async deleteActivity(userId: string, activityId: string): Promise<void> {
    const activity = await this.prisma.tripActivity.findUnique({
      where: { id: activityId },
      include: {
        day: {
          include: { tripPlan: true },
        },
      },
    });

    if (!activity || activity.day.tripPlan.userId !== userId) {
      throw new NotFoundException('Activity not found');
    }

    await this.prisma.tripActivity.delete({
      where: { id: activityId },
    });
  }

  /**
   * Reorder activities within a day
   */
  async reorderActivities(
    userId: string,
    dayId: string,
    activityIds: string[],
  ): Promise<TripDayResponseDto> {
    const day = await this.prisma.tripDay.findUnique({
      where: { id: dayId },
      include: {
        tripPlan: true,
        activities: true,
      },
    });

    if (!day || day.tripPlan.userId !== userId) {
      throw new NotFoundException('Day not found');
    }

    // Update order for each activity
    await Promise.all(
      activityIds.map((id, index) =>
        this.prisma.tripActivity.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );

    const updated = await this.prisma.tripDay.findUnique({
      where: { id: dayId },
      include: {
        activities: {
          orderBy: { order: 'asc' },
        },
      },
    });

    return this.mapDayToResponse(updated!);
  }

  /**
   * Get trip plan statistics
   */
  async getTripPlanStats(
    userId: string,
    tripPlanId: string,
  ): Promise<{
    totalDays: number;
    totalActivities: number;
    completedActivities: number;
    estimatedTotalCost: number;
    currency: string;
  }> {
    const tripPlan = await this.prisma.tripPlan.findFirst({
      where: { id: tripPlanId, userId },
      include: {
        days: {
          include: {
            activities: true,
          },
        },
      },
    });

    if (!tripPlan) {
      throw new NotFoundException('Trip plan not found');
    }

    const allActivities = tripPlan.days.flatMap((d) => d.activities);
    const estimatedTotalCost = allActivities.reduce(
      (sum, act) => sum + (act.estimatedCost ? Number(act.estimatedCost) : 0),
      0,
    );

    return {
      totalDays: tripPlan.days.length,
      totalActivities: allActivities.length,
      completedActivities: allActivities.filter((a) => a.isCompleted).length,
      estimatedTotalCost,
      currency: tripPlan.currency,
    };
  }

  private mapToResponse(tripPlan: any): TripPlanResponseDto {
    return {
      id: tripPlan.id,
      userId: tripPlan.userId,
      propertyId: tripPlan.propertyId,
      sessionId: tripPlan.sessionId,
      title: tripPlan.title,
      description: tripPlan.description,
      startDate: tripPlan.startDate,
      endDate: tripPlan.endDate,
      totalBudget: tripPlan.totalBudget
        ? Number(tripPlan.totalBudget)
        : undefined,
      currency: tripPlan.currency,
      status: tripPlan.status,
      days: tripPlan.days?.map((d: any) => this.mapDayToResponse(d)) || [],
      createdAt: tripPlan.createdAt,
      updatedAt: tripPlan.updatedAt,
    };
  }

  private mapDayToResponse(day: any): TripDayResponseDto {
    return {
      id: day.id,
      tripPlanId: day.tripPlanId,
      date: day.date,
      dayNumber: day.dayNumber,
      title: day.title,
      notes: day.notes,
      activities:
        day.activities?.map((a: any) => this.mapActivityToResponse(a)) || [],
      createdAt: day.createdAt,
    };
  }

  private mapActivityToResponse(activity: any): TripActivityResponseDto {
    return {
      id: activity.id,
      dayId: activity.dayId,
      title: activity.title,
      description: activity.description,
      startTime: activity.startTime,
      endTime: activity.endTime,
      location: activity.location,
      address: activity.address,
      latitude: activity.latitude,
      longitude: activity.longitude,
      estimatedCost: activity.estimatedCost
        ? Number(activity.estimatedCost)
        : undefined,
      category: activity.category,
      attractionId: activity.attractionId,
      bookingId: activity.bookingId,
      notes: activity.notes,
      order: activity.order,
      isCompleted: activity.isCompleted,
      createdAt: activity.createdAt,
    };
  }
}
