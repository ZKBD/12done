import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { PoiType, Prisma } from '@prisma/client';
import { PoiService } from './poi.service';
import {
  CreateTourDto,
  UpdateTourDto,
  ReorderStopsDto,
  TourStopDto,
  TourResponseDto,
  TourStopResponseDto,
} from './dto';

// Average walking speed: 5 km/h = 83.3 meters per minute
const WALKING_SPEED_METERS_PER_MINUTE = 83.3;

@Injectable()
export class ToursService {
  private readonly logger = new Logger(ToursService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly poiService: PoiService,
  ) {}

  /**
   * Create a custom tour (PROD-131.1)
   */
  async createTour(userId: string, dto: CreateTourDto): Promise<TourResponseDto> {
    if (!dto.stops || dto.stops.length === 0) {
      throw new BadRequestException('Tour must have at least one stop');
    }

    // Calculate route metrics
    const { totalDistance, totalDuration, stopsWithDurations } = this.calculateRouteMetrics(
      dto.stops,
    );

    const tour = await this.prisma.customTour.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description,
        isPublic: dto.isPublic ?? false,
        estimatedDuration: totalDuration,
        totalDistance,
        stops: {
          create: stopsWithDurations.map((stop, index) => ({
            placeId: stop.placeId,
            placeName: stop.placeName,
            placeType: stop.placeType ?? PoiType.OTHER,
            latitude: stop.latitude,
            longitude: stop.longitude,
            address: stop.address,
            orderIndex: index,
            arrivalDuration: stop.arrivalDuration,
            stayDuration: stop.stayDuration ?? 15,
            customNarration: stop.customNarration,
          })),
        },
      },
      include: {
        stops: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    this.logger.log(`User ${userId} created tour ${tour.id}`);
    return this.mapToResponse(tour);
  }

  /**
   * Get user's tours
   */
  async getUserTours(
    userId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<TourResponseDto[]> {
    const tours = await this.prisma.customTour.findMany({
      where: { userId },
      include: {
        stops: {
          orderBy: { orderIndex: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    });

    return tours.map((tour) => this.mapToResponse(tour));
  }

  /**
   * Get public tours
   */
  async getPublicTours(options?: {
    limit?: number;
    offset?: number;
    near?: { latitude: number; longitude: number; radius: number };
  }): Promise<TourResponseDto[]> {
    const where: Prisma.CustomTourWhereInput = { isPublic: true };

    // Note: For geo-filtering, we'd need to filter by first stop location
    // This is a simplified implementation

    const tours = await this.prisma.customTour.findMany({
      where,
      include: {
        stops: {
          orderBy: { orderIndex: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 20,
      skip: options?.offset ?? 0,
    });

    // Filter by proximity if specified
    let filteredTours = tours;
    if (options?.near && tours.length > 0) {
      filteredTours = tours.filter((tour) => {
        if (tour.stops.length === 0) return false;
        const firstStop = tour.stops[0];
        const distance = this.poiService.calculateDistance(
          options.near!.latitude,
          options.near!.longitude,
          firstStop.latitude,
          firstStop.longitude,
        );
        return distance <= options.near!.radius;
      });
    }

    return filteredTours.map((tour) => this.mapToResponse(tour));
  }

  /**
   * Get a specific tour
   */
  async getTour(id: string, userId?: string): Promise<TourResponseDto> {
    const tour = await this.prisma.customTour.findUnique({
      where: { id },
      include: {
        stops: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!tour) {
      throw new NotFoundException('Tour not found');
    }

    // Check access
    if (!tour.isPublic && tour.userId !== userId) {
      throw new ForbiddenException('Access denied to private tour');
    }

    return this.mapToResponse(tour);
  }

  /**
   * Update tour details
   */
  async updateTour(
    userId: string,
    tourId: string,
    dto: UpdateTourDto,
  ): Promise<TourResponseDto> {
    const existing = await this.prisma.customTour.findUnique({
      where: { id: tourId },
    });

    if (!existing) {
      throw new NotFoundException('Tour not found');
    }

    if (existing.userId !== userId) {
      throw new ForbiddenException('Cannot modify tour owned by another user');
    }

    const updated = await this.prisma.customTour.update({
      where: { id: tourId },
      data: {
        name: dto.name,
        description: dto.description,
        isPublic: dto.isPublic,
      },
      include: {
        stops: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    this.logger.log(`User ${userId} updated tour ${tourId}`);
    return this.mapToResponse(updated);
  }

  /**
   * Add a stop to tour (PROD-131.2)
   */
  async addStop(
    userId: string,
    tourId: string,
    stop: TourStopDto,
  ): Promise<TourResponseDto> {
    const tour = await this.prisma.customTour.findUnique({
      where: { id: tourId },
      include: { stops: true },
    });

    if (!tour) {
      throw new NotFoundException('Tour not found');
    }

    if (tour.userId !== userId) {
      throw new ForbiddenException('Cannot modify tour owned by another user');
    }

    // Get the next order index
    const maxIndex = Math.max(-1, ...tour.stops.map((s) => s.orderIndex));
    const newIndex = maxIndex + 1;

    // Calculate arrival duration from previous stop
    let arrivalDuration: number | null = null;
    if (tour.stops.length > 0) {
      const lastStop = tour.stops.reduce((prev, curr) =>
        curr.orderIndex > prev.orderIndex ? curr : prev,
      );
      const distance = this.poiService.calculateDistance(
        lastStop.latitude,
        lastStop.longitude,
        stop.latitude,
        stop.longitude,
      );
      arrivalDuration = Math.ceil(distance / WALKING_SPEED_METERS_PER_MINUTE);
    }

    await this.prisma.tourStop.create({
      data: {
        tourId,
        placeId: stop.placeId,
        placeName: stop.placeName,
        placeType: stop.placeType ?? PoiType.OTHER,
        latitude: stop.latitude,
        longitude: stop.longitude,
        address: stop.address,
        orderIndex: newIndex,
        arrivalDuration,
        stayDuration: stop.stayDuration ?? 15,
        customNarration: stop.customNarration,
      },
    });

    // Recalculate tour metrics
    await this.recalculateTourMetrics(tourId);

    const updated = await this.prisma.customTour.findUnique({
      where: { id: tourId },
      include: {
        stops: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    this.logger.log(`User ${userId} added stop to tour ${tourId}`);
    return this.mapToResponse(updated!);
  }

  /**
   * Remove a stop from tour
   */
  async removeStop(userId: string, tourId: string, stopId: string): Promise<TourResponseDto> {
    const tour = await this.prisma.customTour.findUnique({
      where: { id: tourId },
      include: { stops: true },
    });

    if (!tour) {
      throw new NotFoundException('Tour not found');
    }

    if (tour.userId !== userId) {
      throw new ForbiddenException('Cannot modify tour owned by another user');
    }

    const stopToRemove = tour.stops.find((s) => s.id === stopId);
    if (!stopToRemove) {
      throw new NotFoundException('Stop not found in tour');
    }

    // Delete the stop
    await this.prisma.tourStop.delete({
      where: { id: stopId },
    });

    // Reorder remaining stops
    const remainingStops = tour.stops
      .filter((s) => s.id !== stopId)
      .sort((a, b) => a.orderIndex - b.orderIndex);

    for (let i = 0; i < remainingStops.length; i++) {
      if (remainingStops[i].orderIndex !== i) {
        await this.prisma.tourStop.update({
          where: { id: remainingStops[i].id },
          data: { orderIndex: i },
        });
      }
    }

    // Recalculate tour metrics
    await this.recalculateTourMetrics(tourId);

    const updated = await this.prisma.customTour.findUnique({
      where: { id: tourId },
      include: {
        stops: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    this.logger.log(`User ${userId} removed stop ${stopId} from tour ${tourId}`);
    return this.mapToResponse(updated!);
  }

  /**
   * Reorder tour stops (PROD-131.3)
   */
  async reorderStops(
    userId: string,
    tourId: string,
    dto: ReorderStopsDto,
  ): Promise<TourResponseDto> {
    const tour = await this.prisma.customTour.findUnique({
      where: { id: tourId },
      include: { stops: true },
    });

    if (!tour) {
      throw new NotFoundException('Tour not found');
    }

    if (tour.userId !== userId) {
      throw new ForbiddenException('Cannot modify tour owned by another user');
    }

    // Validate all stop IDs exist
    const stopIds = new Set(tour.stops.map((s) => s.id));
    for (const id of dto.stopIds) {
      if (!stopIds.has(id)) {
        throw new BadRequestException(`Stop ${id} not found in tour`);
      }
    }

    // Update order indices
    await this.prisma.$transaction(
      dto.stopIds.map((stopId, index) =>
        this.prisma.tourStop.update({
          where: { id: stopId },
          data: { orderIndex: index },
        }),
      ),
    );

    // Recalculate tour metrics
    await this.recalculateTourMetrics(tourId);

    const updated = await this.prisma.customTour.findUnique({
      where: { id: tourId },
      include: {
        stops: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    this.logger.log(`User ${userId} reordered stops for tour ${tourId}`);
    return this.mapToResponse(updated!);
  }

  /**
   * Delete a tour
   */
  async deleteTour(userId: string, tourId: string): Promise<void> {
    const tour = await this.prisma.customTour.findUnique({
      where: { id: tourId },
    });

    if (!tour) {
      throw new NotFoundException('Tour not found');
    }

    if (tour.userId !== userId) {
      throw new ForbiddenException('Cannot delete tour owned by another user');
    }

    // Stops will be cascade deleted
    await this.prisma.customTour.delete({
      where: { id: tourId },
    });

    this.logger.log(`User ${userId} deleted tour ${tourId}`);
  }

  /**
   * Calculate route metrics (PROD-131.4, PROD-131.5)
   */
  private calculateRouteMetrics(stops: TourStopDto[]): {
    totalDistance: number;
    totalDuration: number;
    stopsWithDurations: Array<TourStopDto & { arrivalDuration?: number }>;
  } {
    let totalDistance = 0;
    let totalDuration = 0;

    const stopsWithDurations: Array<TourStopDto & { arrivalDuration?: number }> = [];

    for (let i = 0; i < stops.length; i++) {
      const stop = stops[i];
      let arrivalDuration: number | undefined;

      if (i > 0) {
        const prevStop = stops[i - 1];
        const distance = this.poiService.calculateDistance(
          prevStop.latitude,
          prevStop.longitude,
          stop.latitude,
          stop.longitude,
        );
        totalDistance += distance;
        arrivalDuration = Math.ceil(distance / WALKING_SPEED_METERS_PER_MINUTE);
        totalDuration += arrivalDuration;
      }

      totalDuration += stop.stayDuration ?? 15;
      stopsWithDurations.push({ ...stop, arrivalDuration });
    }

    return {
      totalDistance: Math.round(totalDistance),
      totalDuration,
      stopsWithDurations,
    };
  }

  /**
   * Recalculate tour metrics after stop changes
   */
  private async recalculateTourMetrics(tourId: string): Promise<void> {
    const stops = await this.prisma.tourStop.findMany({
      where: { tourId },
      orderBy: { orderIndex: 'asc' },
    });

    let totalDistance = 0;
    let totalDuration = 0;

    for (let i = 0; i < stops.length; i++) {
      const stop = stops[i];
      let arrivalDuration: number | null = null;

      if (i > 0) {
        const prevStop = stops[i - 1];
        const distance = this.poiService.calculateDistance(
          prevStop.latitude,
          prevStop.longitude,
          stop.latitude,
          stop.longitude,
        );
        totalDistance += distance;
        arrivalDuration = Math.ceil(distance / WALKING_SPEED_METERS_PER_MINUTE);
        totalDuration += arrivalDuration;
      }

      totalDuration += stop.stayDuration;

      // Update arrival duration
      await this.prisma.tourStop.update({
        where: { id: stop.id },
        data: { arrivalDuration },
      });
    }

    await this.prisma.customTour.update({
      where: { id: tourId },
      data: {
        totalDistance: Math.round(totalDistance),
        estimatedDuration: totalDuration,
      },
    });
  }

  private mapToResponse(tour: {
    id: string;
    userId: string;
    name: string;
    description: string | null;
    isPublic: boolean;
    estimatedDuration: number | null;
    totalDistance: number | null;
    createdAt: Date;
    updatedAt: Date;
    stops: Array<{
      id: string;
      placeId: string;
      placeName: string;
      placeType: PoiType;
      latitude: number;
      longitude: number;
      address: string | null;
      orderIndex: number;
      arrivalDuration: number | null;
      stayDuration: number;
      customNarration: string | null;
    }>;
  }): TourResponseDto {
    return {
      id: tour.id,
      userId: tour.userId,
      name: tour.name,
      description: tour.description ?? undefined,
      isPublic: tour.isPublic,
      estimatedDuration: tour.estimatedDuration ?? undefined,
      totalDistance: tour.totalDistance ?? undefined,
      createdAt: tour.createdAt,
      updatedAt: tour.updatedAt,
      stops: tour.stops.map((stop): TourStopResponseDto => ({
        id: stop.id,
        placeId: stop.placeId,
        placeName: stop.placeName,
        placeType: stop.placeType,
        latitude: stop.latitude,
        longitude: stop.longitude,
        address: stop.address ?? undefined,
        orderIndex: stop.orderIndex,
        arrivalDuration: stop.arrivalDuration ?? undefined,
        stayDuration: stop.stayDuration,
        customNarration: stop.customNarration ?? undefined,
      })),
    };
  }
}
