import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  SearchCateringProvidersDto,
  CreateCateringProviderDto,
  UpdateCateringProviderDto,
  CreateCateringMenuDto,
  UpdateCateringMenuDto,
  RequestCateringQuoteDto,
  RespondToQuoteDto,
  CateringProviderResponseDto,
  CateringMenuResponseDto,
  CateringQuoteResponseDto,
  CateringQuoteStatus,
} from '../dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CateringService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // PROVIDER METHODS (PROD-144)
  // ============================================

  /**
   * Search for catering providers
   */
  async searchProviders(
    dto: SearchCateringProvidersDto,
  ): Promise<{ providers: CateringProviderResponseDto[]; total: number }> {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.CateringProviderWhereInput = {
      isActive: true,
    };

    if (dto.city) {
      where.city = { contains: dto.city, mode: 'insensitive' };
    }

    if (dto.country) {
      where.country = dto.country;
    }

    if (dto.cuisineTypes?.length) {
      where.cuisineTypes = { hasSome: dto.cuisineTypes };
    }

    if (dto.minRating) {
      where.rating = { gte: dto.minRating };
    }

    if (dto.minGuests) {
      where.OR = [
        { minGuests: null },
        { minGuests: { lte: dto.minGuests } },
      ];
    }

    if (dto.maxGuests) {
      where.AND = [
        ...(where.AND as any[] || []),
        {
          OR: [{ maxGuests: null }, { maxGuests: { gte: dto.maxGuests } }],
        },
      ];
    }

    if (dto.eventTypes?.length) {
      where.eventTypes = { hasSome: dto.eventTypes };
    }

    const [providers, total] = await Promise.all([
      this.prisma.cateringProvider.findMany({
        where,
        skip,
        take: limit,
        include: {
          menus: {
            where: { isActive: true },
          },
        },
        orderBy: [{ isVerified: 'desc' }, { rating: 'desc' }],
      }),
      this.prisma.cateringProvider.count({ where }),
    ]);

    // Calculate distances if coordinates provided
    let results = providers.map((p) => {
      const response = this.mapProviderToResponse(p);
      if (
        dto.latitude !== undefined &&
        dto.longitude !== undefined &&
        p.latitude &&
        p.longitude
      ) {
        response.distance = this.calculateDistance(
          dto.latitude,
          dto.longitude,
          p.latitude,
          p.longitude,
        );
      }
      return response;
    });

    // Filter by radius if coordinates provided
    if (dto.latitude !== undefined && dto.longitude !== undefined) {
      const radiusKm = dto.radiusKm || 25;
      results = results.filter(
        (r) => r.distance === undefined || r.distance <= radiusKm,
      );
      results.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    }

    return { providers: results, total };
  }

  /**
   * Get provider by ID
   */
  async getProvider(providerId: string): Promise<CateringProviderResponseDto> {
    const provider = await this.prisma.cateringProvider.findUnique({
      where: { id: providerId },
      include: {
        menus: {
          where: { isActive: true },
        },
      },
    });

    if (!provider) {
      throw new NotFoundException('Catering provider not found');
    }

    return this.mapProviderToResponse(provider);
  }

  /**
   * Create catering provider
   */
  async createProvider(
    dto: CreateCateringProviderDto,
  ): Promise<CateringProviderResponseDto> {
    const provider = await this.prisma.cateringProvider.create({
      data: {
        name: dto.name,
        description: dto.description,
        cuisineTypes: dto.cuisineTypes,
        city: dto.city,
        country: dto.country,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
        email: dto.email,
        phone: dto.phone,
        website: dto.website,
        minGuests: dto.minGuests,
        maxGuests: dto.maxGuests,
        pricePerPersonMin: dto.pricePerPersonMin,
        pricePerPersonMax: dto.pricePerPersonMax,
        currency: dto.currency || 'EUR',
        eventTypes: dto.eventTypes || [],
        dietaryOptions: dto.dietaryOptions || [],
        serviceRadiusKm: dto.serviceRadiusKm,
        leadTimeDays: dto.leadTimeDays,
        imageUrls: dto.imageUrls || [],
      },
      include: {
        menus: true,
      },
    });

    return this.mapProviderToResponse(provider);
  }

  /**
   * Update catering provider
   */
  async updateProvider(
    providerId: string,
    dto: UpdateCateringProviderDto,
  ): Promise<CateringProviderResponseDto> {
    const provider = await this.prisma.cateringProvider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new NotFoundException('Catering provider not found');
    }

    const updated = await this.prisma.cateringProvider.update({
      where: { id: providerId },
      data: dto,
      include: {
        menus: {
          where: { isActive: true },
        },
      },
    });

    return this.mapProviderToResponse(updated);
  }

  // ============================================
  // MENU METHODS (PROD-144)
  // ============================================

  /**
   * Create menu for provider
   */
  async createMenu(
    providerId: string,
    dto: CreateCateringMenuDto,
  ): Promise<CateringMenuResponseDto> {
    const provider = await this.prisma.cateringProvider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new NotFoundException('Catering provider not found');
    }

    const menu = await this.prisma.cateringMenu.create({
      data: {
        providerId,
        name: dto.name,
        description: dto.description,
        menuType: dto.menuType,
        pricePerPerson: dto.pricePerPerson,
        currency: dto.currency || provider.currency,
        minGuests: dto.minGuests,
        maxGuests: dto.maxGuests,
        items: dto.items,
        dietaryOptions: dto.dietaryOptions || [],
        imageUrls: dto.imageUrls || [],
      },
    });

    return this.mapMenuToResponse(menu);
  }

  /**
   * Get provider's menus
   */
  async getProviderMenus(providerId: string): Promise<CateringMenuResponseDto[]> {
    const menus = await this.prisma.cateringMenu.findMany({
      where: { providerId, isActive: true },
      orderBy: { pricePerPerson: 'asc' },
    });

    return menus.map((m) => this.mapMenuToResponse(m));
  }

  /**
   * Update menu
   */
  async updateMenu(
    menuId: string,
    dto: UpdateCateringMenuDto,
  ): Promise<CateringMenuResponseDto> {
    const menu = await this.prisma.cateringMenu.findUnique({
      where: { id: menuId },
    });

    if (!menu) {
      throw new NotFoundException('Menu not found');
    }

    const updated = await this.prisma.cateringMenu.update({
      where: { id: menuId },
      data: dto,
    });

    return this.mapMenuToResponse(updated);
  }

  /**
   * Delete menu
   */
  async deleteMenu(menuId: string): Promise<void> {
    const menu = await this.prisma.cateringMenu.findUnique({
      where: { id: menuId },
    });

    if (!menu) {
      throw new NotFoundException('Menu not found');
    }

    await this.prisma.cateringMenu.update({
      where: { id: menuId },
      data: { isActive: false },
    });
  }

  // ============================================
  // QUOTE METHODS (PROD-144)
  // ============================================

  /**
   * Request a catering quote
   */
  async requestQuote(
    userId: string,
    dto: RequestCateringQuoteDto,
  ): Promise<CateringQuoteResponseDto> {
    const provider = await this.prisma.cateringProvider.findUnique({
      where: { id: dto.providerId },
    });

    if (!provider) {
      throw new NotFoundException('Catering provider not found');
    }

    if (!provider.isActive) {
      throw new BadRequestException('Provider is not currently accepting quotes');
    }

    // Validate event date
    const eventDate = new Date(dto.eventDate);
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + (provider.leadTimeDays || 3));

    if (eventDate < minDate) {
      throw new BadRequestException(
        `Event must be at least ${provider.leadTimeDays || 3} days in advance`,
      );
    }

    // Validate guest count
    if (provider.minGuests && dto.numberOfGuests < provider.minGuests) {
      throw new BadRequestException(
        `Minimum ${provider.minGuests} guests required`,
      );
    }
    if (provider.maxGuests && dto.numberOfGuests > provider.maxGuests) {
      throw new BadRequestException(
        `Maximum ${provider.maxGuests} guests allowed`,
      );
    }

    // Verify property if provided
    if (dto.propertyId) {
      const property = await this.prisma.property.findUnique({
        where: { id: dto.propertyId },
      });
      if (!property) {
        throw new NotFoundException('Property not found');
      }
    }

    const quote = await this.prisma.cateringQuote.create({
      data: {
        userId,
        providerId: dto.providerId,
        eventDate,
        eventType: dto.eventType,
        numberOfGuests: dto.numberOfGuests,
        venue: dto.venue,
        venueAddress: dto.venueAddress,
        propertyId: dto.propertyId,
        cuisinePreferences: dto.cuisinePreferences || [],
        dietaryRequirements: dto.dietaryRequirements || [],
        budgetMin: dto.budgetMin,
        budgetMax: dto.budgetMax,
        currency: dto.currency || provider.currency,
        additionalNotes: dto.additionalNotes,
      },
      include: {
        provider: {
          include: { menus: { where: { isActive: true } } },
        },
      },
    });

    return this.mapQuoteToResponse(quote);
  }

  /**
   * Get quote by ID
   */
  async getQuote(userId: string, quoteId: string): Promise<CateringQuoteResponseDto> {
    const quote = await this.prisma.cateringQuote.findFirst({
      where: { id: quoteId, userId },
      include: {
        provider: {
          include: { menus: { where: { isActive: true } } },
        },
      },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    return this.mapQuoteToResponse(quote);
  }

  /**
   * Get user's quotes
   */
  async getUserQuotes(
    userId: string,
    options?: {
      status?: CateringQuoteStatus;
      providerId?: string;
    },
  ): Promise<CateringQuoteResponseDto[]> {
    const where: Prisma.CateringQuoteWhereInput = { userId };

    if (options?.status) {
      where.status = options.status;
    }
    if (options?.providerId) {
      where.providerId = options.providerId;
    }

    const quotes = await this.prisma.cateringQuote.findMany({
      where,
      include: {
        provider: {
          include: { menus: { where: { isActive: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return quotes.map((q) => this.mapQuoteToResponse(q));
  }

  /**
   * Get quotes for provider (provider view)
   */
  async getProviderQuotes(
    providerId: string,
    options?: {
      status?: CateringQuoteStatus;
    },
  ): Promise<CateringQuoteResponseDto[]> {
    const where: Prisma.CateringQuoteWhereInput = { providerId };

    if (options?.status) {
      where.status = options.status;
    }

    const quotes = await this.prisma.cateringQuote.findMany({
      where,
      include: {
        provider: {
          include: { menus: { where: { isActive: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return quotes.map((q) => this.mapQuoteToResponse(q));
  }

  /**
   * Respond to a quote (provider action)
   */
  async respondToQuote(
    providerId: string,
    quoteId: string,
    dto: RespondToQuoteDto,
  ): Promise<CateringQuoteResponseDto> {
    const quote = await this.prisma.cateringQuote.findFirst({
      where: { id: quoteId, providerId },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (quote.status !== 'REQUESTED') {
      throw new BadRequestException('Quote has already been responded to');
    }

    const updated = await this.prisma.cateringQuote.update({
      where: { id: quoteId },
      data: {
        status: 'QUOTED',
        quotedAmount: dto.quotedAmount,
        quotedDetails: dto.quotedDetails,
        quotedMenuId: dto.quotedMenuId,
        quotedAt: new Date(),
        expiresAt: dto.expiresAt
          ? new Date(dto.expiresAt)
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days default
        respondedAt: new Date(),
        responseNotes: dto.responseNotes,
      },
      include: {
        provider: {
          include: { menus: { where: { isActive: true } } },
        },
      },
    });

    return this.mapQuoteToResponse(updated);
  }

  /**
   * Accept a quote (user action)
   */
  async acceptQuote(
    userId: string,
    quoteId: string,
  ): Promise<CateringQuoteResponseDto> {
    const quote = await this.prisma.cateringQuote.findFirst({
      where: { id: quoteId, userId },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (quote.status !== 'QUOTED') {
      throw new BadRequestException('Quote cannot be accepted');
    }

    if (quote.expiresAt && quote.expiresAt < new Date()) {
      throw new BadRequestException('Quote has expired');
    }

    const updated = await this.prisma.cateringQuote.update({
      where: { id: quoteId },
      data: {
        status: 'ACCEPTED',
        respondedAt: new Date(),
      },
      include: {
        provider: {
          include: { menus: { where: { isActive: true } } },
        },
      },
    });

    return this.mapQuoteToResponse(updated);
  }

  /**
   * Reject a quote (user action)
   */
  async rejectQuote(
    userId: string,
    quoteId: string,
    reason?: string,
  ): Promise<CateringQuoteResponseDto> {
    const quote = await this.prisma.cateringQuote.findFirst({
      where: { id: quoteId, userId },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (quote.status !== 'QUOTED') {
      throw new BadRequestException('Quote cannot be rejected');
    }

    const updated = await this.prisma.cateringQuote.update({
      where: { id: quoteId },
      data: {
        status: 'REJECTED',
        respondedAt: new Date(),
        responseNotes: reason,
      },
      include: {
        provider: {
          include: { menus: { where: { isActive: true } } },
        },
      },
    });

    return this.mapQuoteToResponse(updated);
  }

  /**
   * Cancel a quote (user action)
   */
  async cancelQuote(
    userId: string,
    quoteId: string,
  ): Promise<CateringQuoteResponseDto> {
    const quote = await this.prisma.cateringQuote.findFirst({
      where: { id: quoteId, userId },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (!['REQUESTED', 'QUOTED'].includes(quote.status)) {
      throw new BadRequestException('Quote cannot be cancelled');
    }

    const updated = await this.prisma.cateringQuote.update({
      where: { id: quoteId },
      data: {
        status: 'CANCELLED',
      },
      include: {
        provider: {
          include: { menus: { where: { isActive: true } } },
        },
      },
    });

    return this.mapQuoteToResponse(updated);
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
    const R = 6371;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private mapProviderToResponse(provider: any): CateringProviderResponseDto {
    return {
      id: provider.id,
      name: provider.name,
      description: provider.description,
      cuisineTypes: provider.cuisineTypes,
      city: provider.city,
      country: provider.country,
      address: provider.address,
      latitude: provider.latitude,
      longitude: provider.longitude,
      email: provider.email,
      phone: provider.phone,
      website: provider.website,
      minGuests: provider.minGuests,
      maxGuests: provider.maxGuests,
      pricePerPersonMin: provider.pricePerPersonMin
        ? Number(provider.pricePerPersonMin)
        : undefined,
      pricePerPersonMax: provider.pricePerPersonMax
        ? Number(provider.pricePerPersonMax)
        : undefined,
      currency: provider.currency,
      eventTypes: provider.eventTypes,
      dietaryOptions: provider.dietaryOptions,
      serviceRadiusKm: provider.serviceRadiusKm,
      leadTimeDays: provider.leadTimeDays,
      imageUrls: provider.imageUrls,
      rating: provider.rating ? Number(provider.rating) : undefined,
      reviewCount: provider.reviewCount,
      isActive: provider.isActive,
      isVerified: provider.isVerified,
      menus:
        provider.menus?.map((m: any) => this.mapMenuToResponse(m)) || [],
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
    };
  }

  private mapMenuToResponse(menu: any): CateringMenuResponseDto {
    return {
      id: menu.id,
      providerId: menu.providerId,
      name: menu.name,
      description: menu.description,
      menuType: menu.menuType,
      pricePerPerson: Number(menu.pricePerPerson),
      currency: menu.currency,
      minGuests: menu.minGuests,
      maxGuests: menu.maxGuests,
      items: menu.items,
      dietaryOptions: menu.dietaryOptions,
      imageUrls: menu.imageUrls,
      isActive: menu.isActive,
      createdAt: menu.createdAt,
      updatedAt: menu.updatedAt,
    };
  }

  private mapQuoteToResponse(quote: any): CateringQuoteResponseDto {
    return {
      id: quote.id,
      userId: quote.userId,
      providerId: quote.providerId,
      provider: quote.provider
        ? this.mapProviderToResponse(quote.provider)
        : undefined,
      eventDate: quote.eventDate,
      eventType: quote.eventType,
      numberOfGuests: quote.numberOfGuests,
      venue: quote.venue,
      venueAddress: quote.venueAddress,
      propertyId: quote.propertyId,
      cuisinePreferences: quote.cuisinePreferences,
      dietaryRequirements: quote.dietaryRequirements,
      budgetMin: quote.budgetMin ? Number(quote.budgetMin) : undefined,
      budgetMax: quote.budgetMax ? Number(quote.budgetMax) : undefined,
      currency: quote.currency,
      additionalNotes: quote.additionalNotes,
      status: quote.status,
      quotedAmount: quote.quotedAmount ? Number(quote.quotedAmount) : undefined,
      quotedDetails: quote.quotedDetails,
      quotedMenuId: quote.quotedMenuId,
      quotedAt: quote.quotedAt,
      expiresAt: quote.expiresAt,
      respondedAt: quote.respondedAt,
      responseNotes: quote.responseNotes,
      createdAt: quote.createdAt,
      updatedAt: quote.updatedAt,
    };
  }
}
