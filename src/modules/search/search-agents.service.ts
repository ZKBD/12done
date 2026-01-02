import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { UserRole, Prisma, PropertyStatus, ListingType, NotificationFrequency } from '@prisma/client';
import { PrismaService } from '@/database';
import { MailService } from '@/mail';
import { PushNotificationService } from '@/modules/notifications';
import { generateSecureToken, isPointInPolygon, haversineDistance, GeoPoint } from '@/common/utils';
import {
  CreateSearchAgentDto,
  UpdateSearchAgentDto,
  SearchAgentResponseDto,
  SearchCriteriaDto,
} from './dto';

@Injectable()
export class SearchAgentsService {
  private readonly MAX_SEARCH_AGENTS = 10;
  private readonly logger = new Logger(SearchAgentsService.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private pushNotificationService: PushNotificationService,
  ) {}

  async create(
    dto: CreateSearchAgentDto,
    userId: string,
  ): Promise<SearchAgentResponseDto> {
    // Check limit
    const existingCount = await this.prisma.searchAgent.count({
      where: { userId },
    });

    if (existingCount >= this.MAX_SEARCH_AGENTS) {
      throw new BadRequestException(
        `Maximum of ${this.MAX_SEARCH_AGENTS} search agents allowed`,
      );
    }

    const searchAgent = await this.prisma.searchAgent.create({
      data: {
        userId,
        name: dto.name,
        criteria: dto.criteria as Prisma.InputJsonValue,
        emailNotifications: dto.emailNotifications ?? true,
        inAppNotifications: dto.inAppNotifications ?? true,
        notificationFrequency: dto.notificationFrequency ?? NotificationFrequency.INSTANT,
        unsubscribeToken: generateSecureToken(),
        isActive: true,
      },
    });

    return this.mapToResponseDto(searchAgent);
  }

  async findAll(userId: string): Promise<SearchAgentResponseDto[]> {
    const agents = await this.prisma.searchAgent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return agents.map((a) => this.mapToResponseDto(a));
  }

  async findById(
    id: string,
    userId: string,
    userRole: UserRole,
  ): Promise<SearchAgentResponseDto> {
    const agent = await this.prisma.searchAgent.findUnique({
      where: { id },
    });

    if (!agent) {
      throw new NotFoundException('Search agent not found');
    }

    if (agent.userId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only view your own search agents');
    }

    return this.mapToResponseDto(agent);
  }

  async update(
    id: string,
    dto: UpdateSearchAgentDto,
    userId: string,
    userRole: UserRole,
  ): Promise<SearchAgentResponseDto> {
    const agent = await this.prisma.searchAgent.findUnique({
      where: { id },
    });

    if (!agent) {
      throw new NotFoundException('Search agent not found');
    }

    if (agent.userId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only update your own search agents');
    }

    const updatedAgent = await this.prisma.searchAgent.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.criteria !== undefined && {
          criteria: dto.criteria as Prisma.InputJsonValue,
        }),
        ...(dto.emailNotifications !== undefined && {
          emailNotifications: dto.emailNotifications,
        }),
        ...(dto.inAppNotifications !== undefined && {
          inAppNotifications: dto.inAppNotifications,
        }),
        ...(dto.notificationFrequency !== undefined && {
          notificationFrequency: dto.notificationFrequency,
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    return this.mapToResponseDto(updatedAgent);
  }

  async delete(
    id: string,
    userId: string,
    userRole: UserRole,
  ): Promise<{ message: string }> {
    const agent = await this.prisma.searchAgent.findUnique({
      where: { id },
    });

    if (!agent) {
      throw new NotFoundException('Search agent not found');
    }

    if (agent.userId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only delete your own search agents');
    }

    await this.prisma.searchAgent.delete({
      where: { id },
    });

    return { message: 'Search agent deleted successfully' };
  }

  async toggleActive(
    id: string,
    isActive: boolean,
    userId: string,
    userRole: UserRole,
  ): Promise<SearchAgentResponseDto> {
    const agent = await this.prisma.searchAgent.findUnique({
      where: { id },
    });

    if (!agent) {
      throw new NotFoundException('Search agent not found');
    }

    if (agent.userId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only update your own search agents');
    }

    const updatedAgent = await this.prisma.searchAgent.update({
      where: { id },
      data: { isActive },
    });

    return this.mapToResponseDto(updatedAgent);
  }

  /**
   * Check all active search agents against a new property
   * Called when a property is published
   */
  async checkAgainstNewProperty(propertyId: string): Promise<void> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property || property.status !== PropertyStatus.ACTIVE) {
      return;
    }

    // Find all active search agents
    const agents = await this.prisma.searchAgent.findMany({
      where: { isActive: true },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
          },
        },
      },
    });

    for (const agent of agents) {
      if (this.propertyMatchesCriteria(property, agent.criteria as SearchCriteriaDto)) {
        // Update last triggered
        await this.prisma.searchAgent.update({
          where: { id: agent.id },
          data: { lastTriggeredAt: new Date() },
        });

        // Handle email notification based on frequency
        if (agent.emailNotifications) {
          if (agent.notificationFrequency === NotificationFrequency.INSTANT) {
            // Send immediate email notification
            await this.sendInstantNotification(agent, property);
          } else {
            // Queue for digest (DAILY_DIGEST or WEEKLY_DIGEST)
            await this.queueForDigest(agent.id, propertyId);
          }
        }

        // Create in-app notification (always immediate, regardless of frequency)
        if (agent.inAppNotifications) {
          await this.createInAppNotification(agent, property);

          // PROD-041.4: Send push notification alongside in-app notification
          await this.sendPushNotification(agent, property);
        }
      }
    }
  }

  /**
   * Send instant email notification for a matched property
   */
  private async sendInstantNotification(
    agent: { id: string; name: string; unsubscribeToken: string | null; user: { email: string; firstName: string } },
    _property: { id: string },
  ): Promise<void> {
    try {
      const searchUrl = `/search?agentId=${agent.id}`;
      const unsubscribeUrl = agent.unsubscribeToken
        ? `/search-agents/unsubscribe?token=${agent.unsubscribeToken}`
        : undefined;

      await this.mailService.sendSearchAgentMatchEmail(
        agent.user.email,
        agent.user.firstName,
        agent.name,
        1,
        searchUrl,
        unsubscribeUrl,
      );
    } catch (error) {
      this.logger.error(`Failed to send search agent match email to ${agent.user.email}:`, error);
    }
  }

  /**
   * Queue a property match for digest notification
   */
  private async queueForDigest(searchAgentId: string, propertyId: string): Promise<void> {
    try {
      await this.prisma.searchAgentMatch.upsert({
        where: {
          searchAgentId_propertyId: { searchAgentId, propertyId },
        },
        create: {
          searchAgentId,
          propertyId,
          matchedAt: new Date(),
        },
        update: {}, // No update if already exists
      });
    } catch (error) {
      this.logger.error(`Failed to queue digest match for agent ${searchAgentId}:`, error);
    }
  }

  /**
   * Create in-app notification for a matched property
   */
  private async createInAppNotification(
    agent: { id: string; userId: string; name: string },
    property: { id: string },
  ): Promise<void> {
    try {
      await this.prisma.notification.create({
        data: {
          userId: agent.userId,
          type: 'SEARCH_AGENT_MATCH',
          title: `New match for "${agent.name}"`,
          message: `A new property matching your saved search has been listed.`,
          data: {
            searchAgentId: agent.id,
            propertyId: property.id,
          },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create in-app notification for user ${agent.userId}:`, error);
    }
  }

  /**
   * Send push notification for a matched property (PROD-041.4)
   */
  private async sendPushNotification(
    agent: { id: string; userId: string; name: string },
    property: { id: string },
  ): Promise<void> {
    try {
      await this.pushNotificationService.sendToUser(agent.userId, {
        title: `New match for "${agent.name}"`,
        body: 'A new property matching your saved search has been listed.',
        data: {
          type: 'SEARCH_AGENT_MATCH',
          searchAgentId: agent.id,
          propertyId: property.id,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to send push notification for user ${agent.userId}:`, error);
    }
  }

  /**
   * Unsubscribe from email notifications via token (PROD-041.7)
   */
  async unsubscribe(token: string): Promise<{ message: string; searchAgentName: string }> {
    const agent = await this.prisma.searchAgent.findUnique({
      where: { unsubscribeToken: token },
    });

    if (!agent) {
      throw new NotFoundException('Invalid or expired unsubscribe token');
    }

    await this.prisma.searchAgent.update({
      where: { id: agent.id },
      data: { emailNotifications: false },
    });

    return {
      message: 'Successfully unsubscribed from email notifications',
      searchAgentName: agent.name,
    };
  }

  /**
   * Run a search agent's criteria and return matching properties
   */
  async runSearch(
    id: string,
    userId: string,
    userRole: UserRole,
  ): Promise<{ propertyIds: string[]; count: number }> {
    const agent = await this.findById(id, userId, userRole);

    const where = this.buildPropertyWhereFromCriteria(agent.criteria);
    where.status = PropertyStatus.ACTIVE;

    const properties = await this.prisma.property.findMany({
      where,
      select: { id: true },
      take: 100,
    });

    return {
      propertyIds: properties.map((p) => p.id),
      count: properties.length,
    };
  }

  private propertyMatchesCriteria(
    property: {
      country: string;
      city: string;
      listingTypes: ListingType[];
      basePrice: Prisma.Decimal;
      squareMeters: number | null;
      bedrooms: number | null;
      bathrooms: number | null;
      petFriendly: boolean;
      newlyBuilt: boolean;
      accessible: boolean;
      noAgents: boolean;
      yearBuilt: number | null;
      latitude: number | null;
      longitude: number | null;
    },
    criteria: SearchCriteriaDto,
  ): boolean {
    // Country filter
    if (criteria.country && property.country !== criteria.country.toUpperCase()) {
      return false;
    }

    // City filter (partial match)
    if (
      criteria.city &&
      !property.city.toLowerCase().includes(criteria.city.toLowerCase())
    ) {
      return false;
    }

    // Listing types filter
    if (criteria.listingTypes && criteria.listingTypes.length > 0) {
      const hasMatchingType = property.listingTypes.some((t) =>
        criteria.listingTypes!.includes(t),
      );
      if (!hasMatchingType) return false;
    }

    // Price range
    const price = property.basePrice.toNumber();
    if (criteria.minPrice !== undefined && price < criteria.minPrice) {
      return false;
    }
    if (criteria.maxPrice !== undefined && price > criteria.maxPrice) {
      return false;
    }

    // Square meters
    if (
      criteria.minSquareMeters !== undefined &&
      (property.squareMeters === null || property.squareMeters < criteria.minSquareMeters)
    ) {
      return false;
    }
    if (
      criteria.maxSquareMeters !== undefined &&
      property.squareMeters !== null &&
      property.squareMeters > criteria.maxSquareMeters
    ) {
      return false;
    }

    // Bedrooms
    if (
      criteria.minBedrooms !== undefined &&
      (property.bedrooms === null || property.bedrooms < criteria.minBedrooms)
    ) {
      return false;
    }
    if (
      criteria.maxBedrooms !== undefined &&
      property.bedrooms !== null &&
      property.bedrooms > criteria.maxBedrooms
    ) {
      return false;
    }

    // Bathrooms
    if (
      criteria.minBathrooms !== undefined &&
      (property.bathrooms === null || property.bathrooms < criteria.minBathrooms)
    ) {
      return false;
    }

    // Boolean filters
    if (criteria.petFriendly === true && !property.petFriendly) return false;
    if (criteria.newlyBuilt === true && !property.newlyBuilt) return false;
    if (criteria.accessible === true && !property.accessible) return false;
    if (criteria.noAgents === true && !property.noAgents) return false;

    // Year built
    if (
      criteria.minYearBuilt !== undefined &&
      (property.yearBuilt === null || property.yearBuilt < criteria.minYearBuilt)
    ) {
      return false;
    }
    if (
      criteria.maxYearBuilt !== undefined &&
      property.yearBuilt !== null &&
      property.yearBuilt > criteria.maxYearBuilt
    ) {
      return false;
    }

    // PROD-043.9: Geo filters (saved polygon/radius in search agents)
    // Polygon filter - property must be inside the saved polygon
    if (criteria.polygon && criteria.polygon.length >= 3) {
      if (property.latitude === null || property.longitude === null) {
        return false; // Properties without coordinates can't match polygon criteria
      }
      const polygon: GeoPoint[] = criteria.polygon.map((p) => ({ lat: p.lat, lng: p.lng }));
      if (!isPointInPolygon({ lat: property.latitude, lng: property.longitude }, polygon)) {
        return false;
      }
    }

    // Radius filter - property must be within radiusKm of center point
    if (
      criteria.centerLat !== undefined &&
      criteria.centerLng !== undefined &&
      criteria.radiusKm !== undefined
    ) {
      if (property.latitude === null || property.longitude === null) {
        return false; // Properties without coordinates can't match radius criteria
      }
      const center: GeoPoint = { lat: criteria.centerLat, lng: criteria.centerLng };
      const distance = haversineDistance(center, { lat: property.latitude, lng: property.longitude });
      if (distance > criteria.radiusKm) {
        return false;
      }
    }

    return true;
  }

  private buildPropertyWhereFromCriteria(
    criteria: SearchCriteriaDto,
  ): Prisma.PropertyWhereInput {
    const where: Prisma.PropertyWhereInput = {};

    if (criteria.search) {
      where.OR = [
        { title: { contains: criteria.search, mode: 'insensitive' } },
        { description: { contains: criteria.search, mode: 'insensitive' } },
        { city: { contains: criteria.search, mode: 'insensitive' } },
        { address: { contains: criteria.search, mode: 'insensitive' } },
      ];
    }

    if (criteria.country) where.country = criteria.country.toUpperCase();
    if (criteria.city) where.city = { contains: criteria.city, mode: 'insensitive' };

    if (criteria.listingTypes && criteria.listingTypes.length > 0) {
      where.listingTypes = {
        hasSome: criteria.listingTypes as ListingType[],
      };
    }

    if (criteria.minPrice !== undefined || criteria.maxPrice !== undefined) {
      where.basePrice = {};
      if (criteria.minPrice !== undefined) {
        where.basePrice.gte = new Prisma.Decimal(criteria.minPrice);
      }
      if (criteria.maxPrice !== undefined) {
        where.basePrice.lte = new Prisma.Decimal(criteria.maxPrice);
      }
    }

    if (criteria.minSquareMeters !== undefined || criteria.maxSquareMeters !== undefined) {
      where.squareMeters = {};
      if (criteria.minSquareMeters !== undefined) {
        where.squareMeters.gte = criteria.minSquareMeters;
      }
      if (criteria.maxSquareMeters !== undefined) {
        where.squareMeters.lte = criteria.maxSquareMeters;
      }
    }

    if (criteria.minBedrooms !== undefined || criteria.maxBedrooms !== undefined) {
      where.bedrooms = {};
      if (criteria.minBedrooms !== undefined) {
        where.bedrooms.gte = criteria.minBedrooms;
      }
      if (criteria.maxBedrooms !== undefined) {
        where.bedrooms.lte = criteria.maxBedrooms;
      }
    }

    if (criteria.minBathrooms !== undefined) {
      where.bathrooms = { gte: criteria.minBathrooms };
    }

    if (criteria.petFriendly !== undefined) where.petFriendly = criteria.petFriendly;
    if (criteria.newlyBuilt !== undefined) where.newlyBuilt = criteria.newlyBuilt;
    if (criteria.accessible !== undefined) where.accessible = criteria.accessible;
    if (criteria.noAgents !== undefined) where.noAgents = criteria.noAgents;

    if (criteria.minYearBuilt !== undefined || criteria.maxYearBuilt !== undefined) {
      where.yearBuilt = {};
      if (criteria.minYearBuilt !== undefined) {
        where.yearBuilt.gte = criteria.minYearBuilt;
      }
      if (criteria.maxYearBuilt !== undefined) {
        where.yearBuilt.lte = criteria.maxYearBuilt;
      }
    }

    // PROD-043.9: Geo filters (bounding box for initial DB filtering)
    // Note: Accurate filtering is done in propertyMatchesCriteria for checkAgainstNewProperty
    if (criteria.polygon && criteria.polygon.length >= 3) {
      const lats = criteria.polygon.map((p) => p.lat);
      const lngs = criteria.polygon.map((p) => p.lng);
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        { latitude: { gte: Math.min(...lats), lte: Math.max(...lats) } },
        { longitude: { gte: Math.min(...lngs), lte: Math.max(...lngs) } },
      ];
    }

    if (
      criteria.centerLat !== undefined &&
      criteria.centerLng !== undefined &&
      criteria.radiusKm !== undefined
    ) {
      const latDelta = criteria.radiusKm / 111;
      const lngDelta = criteria.radiusKm / (111 * Math.cos((criteria.centerLat * Math.PI) / 180));
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        { latitude: { gte: criteria.centerLat - latDelta, lte: criteria.centerLat + latDelta } },
        { longitude: { gte: criteria.centerLng - lngDelta, lte: criteria.centerLng + lngDelta } },
      ];
    }

    return where;
  }

  private mapToResponseDto(agent: {
    id: string;
    userId: string;
    name: string;
    criteria: Prisma.JsonValue;
    emailNotifications: boolean;
    inAppNotifications: boolean;
    notificationFrequency: NotificationFrequency;
    isActive: boolean;
    lastTriggeredAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): SearchAgentResponseDto {
    return {
      id: agent.id,
      userId: agent.userId,
      name: agent.name,
      criteria: agent.criteria as SearchCriteriaDto,
      emailNotifications: agent.emailNotifications,
      inAppNotifications: agent.inAppNotifications,
      notificationFrequency: agent.notificationFrequency,
      isActive: agent.isActive,
      lastTriggeredAt: agent.lastTriggeredAt || undefined,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
    };
  }
}
