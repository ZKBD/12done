import {
  Injectable,
  NotFoundException,
  BadRequestException,
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

    const results = providers.map((p) => this.mapProviderToResponse(p));

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
        cuisineTypes: dto.cuisineTypes || [],
        city: dto.city,
        country: dto.country,
        address: dto.address!,
        email: dto.email!,
        phone: dto.phone,
        website: dto.website,
        minGuests: dto.minGuests,
        maxGuests: dto.maxGuests,
        pricePerPerson: dto.pricePerPersonMin,
        currency: dto.currency || 'EUR',
        eventTypes: dto.eventTypes || [],
        serviceRadius: dto.serviceRadiusKm,
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
      data: {
        name: dto.name,
        description: dto.description,
        cuisineTypes: dto.cuisineTypes,
        city: dto.city,
        country: dto.country,
        address: dto.address,
        email: dto.email,
        phone: dto.phone,
        website: dto.website,
        minGuests: dto.minGuests,
        maxGuests: dto.maxGuests,
        pricePerPerson: dto.pricePerPersonMin,
        currency: dto.currency,
        eventTypes: dto.eventTypes,
        serviceRadius: dto.serviceRadiusKm,
        isActive: dto.isActive,
      },
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
        minimumGuests: dto.minGuests,
        items: dto.items || [],
        vegetarianOptions: dto.dietaryOptions?.includes('vegetarian') || false,
        veganOptions: dto.dietaryOptions?.includes('vegan') || false,
        glutenFreeOptions: dto.dietaryOptions?.includes('gluten-free') || false,
        halalOptions: dto.dietaryOptions?.includes('halal') || false,
        kosherOptions: dto.dietaryOptions?.includes('kosher') || false,
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
      data: {
        name: dto.name,
        description: dto.description,
        menuType: dto.menuType,
        pricePerPerson: dto.pricePerPerson,
        currency: dto.currency,
        minimumGuests: dto.minGuests,
        items: dto.items,
        isActive: dto.isActive,
      },
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

    // Validate event date (at least 3 days in advance)
    const eventDate = new Date(dto.eventDate);
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 3);

    if (eventDate < minDate) {
      throw new BadRequestException('Event must be at least 3 days in advance');
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
        status: 'DECLINED',
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

  private mapProviderToResponse(provider: any): CateringProviderResponseDto {
    return {
      id: provider.id,
      name: provider.name,
      description: provider.description,
      cuisineTypes: provider.cuisineTypes,
      city: provider.city,
      country: provider.country,
      address: provider.address,
      latitude: undefined, // Not in schema
      longitude: undefined, // Not in schema
      email: provider.email,
      phone: provider.phone,
      website: provider.website,
      minGuests: provider.minGuests,
      maxGuests: provider.maxGuests,
      pricePerPersonMin: provider.pricePerPerson
        ? Number(provider.pricePerPerson)
        : undefined,
      pricePerPersonMax: undefined, // Not in schema
      currency: provider.currency,
      eventTypes: provider.eventTypes,
      dietaryOptions: [], // Not in schema
      serviceRadiusKm: provider.serviceRadius,
      leadTimeDays: undefined, // Not in schema
      imageUrls: [], // Not in schema
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
    // Build dietary options from individual flags
    const dietaryOptions: string[] = [];
    if (menu.vegetarianOptions) dietaryOptions.push('vegetarian');
    if (menu.veganOptions) dietaryOptions.push('vegan');
    if (menu.glutenFreeOptions) dietaryOptions.push('gluten-free');
    if (menu.halalOptions) dietaryOptions.push('halal');
    if (menu.kosherOptions) dietaryOptions.push('kosher');

    return {
      id: menu.id,
      providerId: menu.providerId,
      name: menu.name,
      description: menu.description,
      menuType: menu.menuType,
      pricePerPerson: Number(menu.pricePerPerson),
      currency: menu.currency,
      minGuests: menu.minimumGuests,
      maxGuests: undefined, // Not in schema
      items: menu.items,
      dietaryOptions,
      imageUrls: [], // Not in schema
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
