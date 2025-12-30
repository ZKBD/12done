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
    const where: Prisma.AttractionWhereInput = {
      isActive: true,
    };

    if (dto.categories?.length) {
      where.category = { in: dto.categories };
    }

    if (dto.minRating) {
      where.rating = { gte: dto.minRating };
    }

    if (dto.maxPriceLevel) {
      where.priceLevel = { lte: dto.maxPriceLevel };
    }

    if (dto.bookableOnly) {
      where.isBookable = true;
    }

    if (dto.query) {
      where.OR = [
        { name: { contains: dto.query, mode: 'insensitive' } },
        { description: { contains: dto.query, mode: 'insensitive' } },
        { tags: { hasSome: [dto.query.toLowerCase()] } },
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
      isActive: true,
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
        address: dto.address,
        city: dto.city,
        country: dto.country,
        latitude: dto.latitude,
        longitude: dto.longitude,
        website: dto.website,
        phone: dto.phone,
        openingHours: dto.openingHours,
        imageUrls: dto.imageUrls || [],
        priceLevel: dto.priceLevel,
        durationMinutes: dto.durationMinutes,
        tags: dto.tags || [],
        externalSource: dto.externalSource,
        externalId: dto.externalId,
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
      data: dto,
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
      const existing = await this.prisma.attraction.findFirst({
        where: {
          externalSource: source,
          externalId: item.externalId,
        },
      });

      if (existing) {
        await this.prisma.attraction.update({
          where: { id: existing.id },
          data: item,
        });
        updated++;
      } else {
        await this.prisma.attraction.create({
          data: {
            ...item,
            externalSource: source,
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

    if (!attraction.isBookable) {
      throw new BadRequestException('This attraction is not bookable');
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
        timeSlot: dto.timeSlot,
        numberOfGuests: dto.numberOfGuests,
        adults: dto.adults || dto.numberOfGuests,
        children: dto.children || 0,
        ticketType: dto.ticketType,
        specialRequests: dto.specialRequests,
        tripDayId: dto.tripDayId,
        contactName: dto.contactName,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
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
        timeSlot: dto.timeSlot,
        numberOfGuests: dto.numberOfGuests,
        specialRequests: dto.specialRequests,
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
        cancellationReason: reason,
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
        totalPrice,
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
      imageUrls: attraction.imageUrls,
      rating: attraction.rating ? Number(attraction.rating) : undefined,
      reviewCount: attraction.reviewCount,
      priceLevel: attraction.priceLevel,
      durationMinutes: attraction.durationMinutes,
      tags: attraction.tags,
      isBookable: attraction.isBookable,
      bookingUrl: attraction.bookingUrl,
      externalSource: attraction.externalSource,
      externalId: attraction.externalId,
      isActive: attraction.isActive,
      createdAt: attraction.createdAt,
      updatedAt: attraction.updatedAt,
    };
  }

  private mapBookingToResponse(booking: any): BookingResponseDto {
    return {
      id: booking.id,
      userId: booking.userId,
      attractionId: booking.attractionId,
      attraction: booking.attraction
        ? this.mapAttractionToResponse(booking.attraction)
        : undefined,
      bookingDate: booking.bookingDate,
      timeSlot: booking.timeSlot,
      numberOfGuests: booking.numberOfGuests,
      adults: booking.adults,
      children: booking.children,
      ticketType: booking.ticketType,
      specialRequests: booking.specialRequests,
      tripDayId: booking.tripDayId,
      totalPrice: booking.totalPrice ? Number(booking.totalPrice) : undefined,
      currency: booking.currency,
      status: booking.status,
      confirmationCode: booking.confirmationCode,
      externalBookingId: booking.externalBookingId,
      contactName: booking.contactName,
      contactEmail: booking.contactEmail,
      contactPhone: booking.contactPhone,
      confirmedAt: booking.confirmedAt,
      cancelledAt: booking.cancelledAt,
      cancellationReason: booking.cancellationReason,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    };
  }
}
