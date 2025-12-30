import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  SearchAttractionsDto,
  CreateAttractionDto,
  UpdateAttractionDto,
  AttractionResponseDto,
  CreateBookingDto,
  UpdateBookingDto,
  BookingResponseDto,
  AttractionBookingStatus,
} from '../dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class AttractionService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // ATTRACTION METHODS (PROD-142)
  // ============================================

  /**
   * Search for attractions near a location
   */
  async searchAttractions(
    dto: SearchAttractionsDto,
  ): Promise<{ attractions: AttractionResponseDto[]; total: number }> {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    // Get center coordinates
    let latitude = dto.latitude;
    let longitude = dto.longitude;

    if (dto.propertyId && !latitude) {
      const property = await this.prisma.property.findUnique({
        where: { id: dto.propertyId },
      });
      if (property) {
        latitude = property.latitude ?? undefined;
        longitude = property.longitude ?? undefined;
      }
    }

    // Build where clause
    const where: Prisma.AttractionWhereInput = {};

    if (dto.categories?.length) {
      where.category = { in: dto.categories };
    }

    if (dto.minRating) {
      where.rating = { gte: dto.minRating };
    }

    if (dto.maxPriceLevel) {
      where.priceLevel = { lte: dto.maxPriceLevel };
    }

    if (dto.query) {
      where.OR = [
        { name: { contains: dto.query, mode: 'insensitive' } },
        { description: { contains: dto.query, mode: 'insensitive' } },
        { features: { hasSome: [dto.query.toLowerCase()] } },
      ];
    }

    // Get all matching attractions
    const [attractions, total] = await Promise.all([
      this.prisma.attraction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { rating: 'desc' },
      }),
      this.prisma.attraction.count({ where }),
    ]);

    // Calculate distances if coordinates provided
    const radiusKm = dto.radiusKm || 10;
    let results = attractions.map((a) => {
      const response = this.mapAttractionToResponse(a);
      if (latitude !== undefined && longitude !== undefined) {
        response.distance = this.calculateDistance(
          latitude,
          longitude,
          a.latitude,
          a.longitude,
        );
      }
      return response;
    });

    // Filter by radius if coordinates provided
    if (latitude !== undefined && longitude !== undefined) {
      results = results.filter(
        (r) => r.distance === undefined || r.distance <= radiusKm,
      );
      results.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    }

    return { attractions: results, total };
  }

  /**
   * Get attraction by ID
   */
  async getAttraction(attractionId: string): Promise<AttractionResponseDto> {
    const attraction = await this.prisma.attraction.findUnique({
      where: { id: attractionId },
    });

    if (!attraction) {
      throw new NotFoundException('Attraction not found');
    }

    return this.mapAttractionToResponse(attraction);
  }

  /**
   * Get attractions by category
   */
  async getAttractionsByCategory(
    category: string,
    options?: { city?: string; country?: string; limit?: number },
  ): Promise<AttractionResponseDto[]> {
    const where: Prisma.AttractionWhereInput = {
      category: category as any,
    };

    if (options?.city) {
      where.city = { contains: options.city, mode: 'insensitive' };
    }
    if (options?.country) {
      where.country = options.country;
    }

    const attractions = await this.prisma.attraction.findMany({
      where,
      take: options?.limit || 20,
      orderBy: { rating: 'desc' },
    });

    return attractions.map((a) => this.mapAttractionToResponse(a));
  }

  /**
   * Create attraction (admin/integration)
   */
  async createAttraction(
    dto: CreateAttractionDto,
  ): Promise<AttractionResponseDto> {
    const attraction = await this.prisma.attraction.create({
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category,
        address: dto.address!,
        city: dto.city!,
        country: dto.country!,
        latitude: dto.latitude!,
        longitude: dto.longitude!,
        website: dto.website,
        phone: dto.phone,
        openingHours: dto.openingHours,
        imageUrl: dto.imageUrls?.[0],
        imageUrls: dto.imageUrls || [],
        priceLevel: dto.priceLevel,
        estimatedDuration: dto.durationMinutes,
        features: dto.tags || [],
        googlePlaceId: dto.externalSource === 'google' ? dto.externalId : undefined,
        tripAdvisorId: dto.externalSource === 'tripadvisor' ? dto.externalId : undefined,
      },
    });

    return this.mapAttractionToResponse(attraction);
  }

  /**
   * Update attraction
   */
  async updateAttraction(
    attractionId: string,
    dto: UpdateAttractionDto,
  ): Promise<AttractionResponseDto> {
    const attraction = await this.prisma.attraction.findUnique({
      where: { id: attractionId },
    });

    if (!attraction) {
      throw new NotFoundException('Attraction not found');
    }

    const updated = await this.prisma.attraction.update({
      where: { id: attractionId },
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category,
        address: dto.address,
        city: dto.city,
        country: dto.country,
        latitude: dto.latitude,
        longitude: dto.longitude,
        website: dto.website,
        phone: dto.phone,
        openingHours: dto.openingHours,
        imageUrl: dto.imageUrls?.[0],
        imageUrls: dto.imageUrls,
        priceLevel: dto.priceLevel,
        estimatedDuration: dto.durationMinutes,
        features: dto.tags,
        lastSyncedAt: new Date(),
      },
    });

    return this.mapAttractionToResponse(updated);
  }

  /**
   * Sync attractions from external source (TripAdvisor, Google Places, etc.)
   */
  async syncFromExternalSource(
    source: string,
    data: CreateAttractionDto[],
  ): Promise<{ created: number; updated: number }> {
    let created = 0;
    let updated = 0;

    for (const item of data) {
      let existing: any = null;

      if (source === 'google' && item.externalId) {
        existing = await this.prisma.attraction.findFirst({
          where: { googlePlaceId: item.externalId },
        });
      } else if (source === 'tripadvisor' && item.externalId) {
        existing = await this.prisma.attraction.findFirst({
          where: { tripAdvisorId: item.externalId },
        });
      }

      if (existing) {
        await this.prisma.attraction.update({
          where: { id: existing.id },
          data: {
            name: item.name,
            description: item.description,
            category: item.category,
            address: item.address,
            city: item.city,
            country: item.country,
            latitude: item.latitude,
            longitude: item.longitude,
            lastSyncedAt: new Date(),
          },
        });
        updated++;
      } else {
        await this.prisma.attraction.create({
          data: {
            name: item.name,
            description: item.description,
            category: item.category,
            address: item.address!,
            city: item.city!,
            country: item.country!,
            latitude: item.latitude!,
            longitude: item.longitude!,
            googlePlaceId: source === 'google' ? item.externalId : undefined,
            tripAdvisorId: source === 'tripadvisor' ? item.externalId : undefined,
          },
        });
        created++;
      }
    }

    return { created, updated };
  }

  // ============================================
  // BOOKING METHODS (PROD-143)
  // ============================================

  /**
   * Create a booking
   */
  async createBooking(
    userId: string,
    dto: CreateBookingDto,
  ): Promise<BookingResponseDto> {
    const attraction = await this.prisma.attraction.findUnique({
      where: { id: dto.attractionId },
    });

    if (!attraction) {
      throw new NotFoundException('Attraction not found');
    }

    // Validate booking date
    const bookingDate = new Date(dto.bookingDate);
    if (bookingDate < new Date()) {
      throw new BadRequestException('Booking date must be in the future');
    }

    const booking = await this.prisma.attractionBooking.create({
      data: {
        userId,
        attractionId: dto.attractionId,
        bookingDate,
        bookingTime: dto.timeSlot ? new Date(`1970-01-01T${dto.timeSlot}:00`) : undefined,
        numberOfGuests: dto.numberOfGuests,
        ticketType: dto.ticketType,
        notes: dto.specialRequests,
        totalPrice: 0, // Will be set when confirmed
        currency: 'EUR',
      },
      include: {
        attraction: true,
      },
    });

    return this.mapBookingToResponse(booking);
  }

  /**
   * Get booking by ID
   */
  async getBooking(userId: string, bookingId: string): Promise<BookingResponseDto> {
    const booking = await this.prisma.attractionBooking.findFirst({
      where: { id: bookingId, userId },
      include: { attraction: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return this.mapBookingToResponse(booking);
  }

  /**
   * Get user's bookings
   */
  async getUserBookings(
    userId: string,
    options?: {
      status?: AttractionBookingStatus;
      upcoming?: boolean;
    },
  ): Promise<BookingResponseDto[]> {
    const where: Prisma.AttractionBookingWhereInput = { userId };

    if (options?.status) {
      where.status = options.status;
    }
    if (options?.upcoming) {
      where.bookingDate = { gte: new Date() };
    }

    const bookings = await this.prisma.attractionBooking.findMany({
      where,
      include: { attraction: true },
      orderBy: { bookingDate: 'asc' },
    });

    return bookings.map((b) => this.mapBookingToResponse(b));
  }

  /**
   * Update booking
   */
  async updateBooking(
    userId: string,
    bookingId: string,
    dto: UpdateBookingDto,
  ): Promise<BookingResponseDto> {
    const booking = await this.prisma.attractionBooking.findFirst({
      where: { id: bookingId, userId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status !== 'PENDING') {
      throw new BadRequestException(
        'Only pending bookings can be modified',
      );
    }

    const updated = await this.prisma.attractionBooking.update({
      where: { id: bookingId },
      data: {
        bookingDate: dto.bookingDate ? new Date(dto.bookingDate) : undefined,
        bookingTime: dto.timeSlot ? new Date(`1970-01-01T${dto.timeSlot}:00`) : undefined,
        numberOfGuests: dto.numberOfGuests,
        notes: dto.specialRequests,
      },
      include: { attraction: true },
    });

    return this.mapBookingToResponse(updated);
  }

  /**
   * Cancel booking
   */
  async cancelBooking(
    userId: string,
    bookingId: string,
    reason?: string,
  ): Promise<BookingResponseDto> {
    const booking = await this.prisma.attractionBooking.findFirst({
      where: { id: bookingId, userId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (['CANCELLED', 'COMPLETED', 'REFUNDED'].includes(booking.status)) {
      throw new BadRequestException('Booking cannot be cancelled');
    }

    const updated = await this.prisma.attractionBooking.update({
      where: { id: bookingId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        notes: reason ? `${booking.notes || ''}\nCancellation: ${reason}` : booking.notes,
      },
      include: { attraction: true },
    });

    return this.mapBookingToResponse(updated);
  }

  /**
   * Confirm booking (called by provider integration)
   */
  async confirmBooking(
    bookingId: string,
    confirmationCode: string,
    externalBookingId?: string,
    totalPrice?: number,
  ): Promise<BookingResponseDto> {
    const booking = await this.prisma.attractionBooking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const updated = await this.prisma.attractionBooking.update({
      where: { id: bookingId },
      data: {
        status: 'CONFIRMED',
        confirmationCode,
        externalBookingId,
        totalPrice: totalPrice || booking.totalPrice,
        confirmedAt: new Date(),
      },
      include: { attraction: true },
    });

    return this.mapBookingToResponse(updated);
  }

  /**
   * Get available time slots for an attraction on a date
   */
  async getAvailableTimeSlots(
    attractionId: string,
    date: string,
  ): Promise<string[]> {
    const attraction = await this.prisma.attraction.findUnique({
      where: { id: attractionId },
    });

    if (!attraction) {
      throw new NotFoundException('Attraction not found');
    }

    // In production, this would query the external booking provider
    // For now, return sample time slots
    const dayOfWeek = new Date(date).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (isWeekend) {
      return [
        '09:00',
        '10:00',
        '11:00',
        '12:00',
        '13:00',
        '14:00',
        '15:00',
        '16:00',
        '17:00',
      ];
    }

    return ['10:00', '11:00', '14:00', '15:00', '16:00'];
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10; // Round to 1 decimal place
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private mapAttractionToResponse(attraction: any): AttractionResponseDto {
    // Determine external source from IDs
    let externalSource: string | undefined;
    let externalId: string | undefined;
    if (attraction.googlePlaceId) {
      externalSource = 'google';
      externalId = attraction.googlePlaceId;
    } else if (attraction.tripAdvisorId) {
      externalSource = 'tripadvisor';
      externalId = attraction.tripAdvisorId;
    }

    return {
      id: attraction.id,
      name: attraction.name,
      description: attraction.description,
      category: attraction.category,
      address: attraction.address,
      city: attraction.city,
      country: attraction.country,
      latitude: attraction.latitude,
      longitude: attraction.longitude,
      website: attraction.website,
      phone: attraction.phone,
      openingHours: attraction.openingHours,
      imageUrls: attraction.imageUrls || [],
      rating: attraction.rating ? Number(attraction.rating) : undefined,
      reviewCount: attraction.reviewCount,
      priceLevel: attraction.priceLevel,
      durationMinutes: attraction.estimatedDuration,
      tags: attraction.features || [],
      isBookable: false, // Not in schema
      bookingUrl: undefined, // Not in schema
      externalSource,
      externalId,
      isActive: true, // Not in schema
      createdAt: attraction.createdAt,
      updatedAt: attraction.updatedAt,
    };
  }

  private mapBookingToResponse(booking: any): BookingResponseDto {
    // Format time slot from DateTime
    const formatTimeSlot = (time: Date | null) => {
      if (!time) return undefined;
      const d = new Date(time);
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    };

    return {
      id: booking.id,
      userId: booking.userId,
      attractionId: booking.attractionId,
      attraction: booking.attraction
        ? this.mapAttractionToResponse(booking.attraction)
        : undefined,
      bookingDate: booking.bookingDate,
      timeSlot: formatTimeSlot(booking.bookingTime),
      numberOfGuests: booking.numberOfGuests,
      adults: booking.numberOfGuests, // Not in schema separately
      children: 0, // Not in schema
      ticketType: booking.ticketType,
      specialRequests: booking.notes,
      tripDayId: undefined, // Not in schema
      totalPrice: booking.totalPrice ? Number(booking.totalPrice) : undefined,
      currency: booking.currency,
      status: booking.status,
      confirmationCode: booking.confirmationCode,
      externalBookingId: booking.externalBookingId,
      contactName: undefined, // Not in schema
      contactEmail: undefined, // Not in schema
      contactPhone: undefined, // Not in schema
      confirmedAt: booking.confirmedAt,
      cancelledAt: booking.cancelledAt,
      cancellationReason: undefined, // Not in schema
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    };
  }
}
