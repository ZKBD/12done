import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PropertyStatus, UserRole, ListingType, EnergyEfficiencyRating, Prisma } from '@prisma/client';
import { PrismaService } from '@/database';
import { PaginatedResponseDto } from '@/common/dto';
import {
  CreatePropertyDto,
  UpdatePropertyDto,
  PropertyResponseDto,
  PropertyListResponseDto,
  PropertyQueryDto,
} from './dto';

@Injectable()
export class PropertiesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePropertyDto, ownerId: string): Promise<PropertyResponseDto> {
    const property = await this.prisma.property.create({
      data: {
        ownerId,
        address: dto.address,
        postalCode: dto.postalCode,
        city: dto.city,
        country: dto.country.toUpperCase(),
        latitude: dto.latitude,
        longitude: dto.longitude,
        title: dto.title,
        description: dto.description,
        listingTypes: dto.listingTypes,
        basePrice: new Prisma.Decimal(dto.basePrice),
        currency: dto.currency || 'EUR',
        priceNegotiable: dto.priceNegotiable ?? false,
        negotiabilityRange: dto.negotiabilityRange
          ? new Prisma.Decimal(dto.negotiabilityRange)
          : null,
        dynamicPricingEnabled: dto.dynamicPricingEnabled ?? false,
        squareMeters: dto.squareMeters,
        lotSize: dto.lotSize,
        bedrooms: dto.bedrooms,
        bathrooms: dto.bathrooms,
        floors: dto.floors,
        yearBuilt: dto.yearBuilt,
        energyEfficiency: dto.energyEfficiency || EnergyEfficiencyRating.NOT_RATED,
        energyCertificateUrl: dto.energyCertificateUrl,
        hoaFees: dto.hoaFees ? new Prisma.Decimal(dto.hoaFees) : null,
        hoaInfo: dto.hoaInfo,
        petFriendly: dto.petFriendly ?? false,
        newlyBuilt: dto.newlyBuilt ?? false,
        accessible: dto.accessible ?? false,
        noAgents: dto.noAgents ?? false,
        status: PropertyStatus.DRAFT,
      },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            emailVerified: true,
            idVerificationStatus: true,
          },
        },
        media: {
          orderBy: { sortOrder: 'asc' },
        },
        floorPlans: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return this.mapToResponseDto(property);
  }

  async findAll(
    query: PropertyQueryDto,
    requesterId?: string,
    requesterRole?: UserRole,
  ): Promise<PaginatedResponseDto<PropertyListResponseDto>> {
    const where = this.buildWhereClause(query, requesterId, requesterRole);

    const [properties, total] = await Promise.all([
      this.prisma.property.findMany({
        where,
        include: {
          media: {
            where: { isPrimary: true },
            take: 1,
          },
        },
        orderBy: { [query.sortBy || 'createdAt']: query.sortOrder || 'desc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.property.count({ where }),
    ]);

    const data = properties.map((p) => this.mapToListResponseDto(p));

    return new PaginatedResponseDto(data, total, query.page || 1, query.limit || 20);
  }

  async findById(
    id: string,
    requesterId?: string,
    requesterRole?: UserRole,
  ): Promise<PropertyResponseDto> {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            emailVerified: true,
            idVerificationStatus: true,
          },
        },
        media: {
          orderBy: { sortOrder: 'asc' },
        },
        floorPlans: {
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: {
            favoritedBy: true,
          },
        },
      },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    // Check visibility
    if (property.status === PropertyStatus.DELETED) {
      throw new NotFoundException('Property not found');
    }

    // Draft properties only visible to owner or admin
    if (property.status === PropertyStatus.DRAFT) {
      if (property.ownerId !== requesterId && requesterRole !== UserRole.ADMIN) {
        throw new ForbiddenException('Property not accessible');
      }
    }

    return this.mapToResponseDto(property);
  }

  async update(
    id: string,
    dto: UpdatePropertyDto,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<PropertyResponseDto> {
    const property = await this.prisma.property.findUnique({
      where: { id },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    // Only owner or admin can update
    if (property.ownerId !== requesterId && requesterRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only update your own properties');
    }

    if (property.status === PropertyStatus.DELETED) {
      throw new BadRequestException('Cannot update a deleted property');
    }

    const updateData: Prisma.PropertyUpdateInput = {};

    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.postalCode !== undefined) updateData.postalCode = dto.postalCode;
    if (dto.city !== undefined) updateData.city = dto.city;
    if (dto.country !== undefined) updateData.country = dto.country.toUpperCase();
    if (dto.latitude !== undefined) updateData.latitude = dto.latitude;
    if (dto.longitude !== undefined) updateData.longitude = dto.longitude;
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.basePrice !== undefined) updateData.basePrice = new Prisma.Decimal(dto.basePrice);
    if (dto.currency !== undefined) updateData.currency = dto.currency;
    if (dto.priceNegotiable !== undefined) updateData.priceNegotiable = dto.priceNegotiable;
    if (dto.negotiabilityRange !== undefined) {
      updateData.negotiabilityRange = new Prisma.Decimal(dto.negotiabilityRange);
    }
    if (dto.dynamicPricingEnabled !== undefined) {
      updateData.dynamicPricingEnabled = dto.dynamicPricingEnabled;
    }
    if (dto.squareMeters !== undefined) updateData.squareMeters = dto.squareMeters;
    if (dto.lotSize !== undefined) updateData.lotSize = dto.lotSize;
    if (dto.bedrooms !== undefined) updateData.bedrooms = dto.bedrooms;
    if (dto.bathrooms !== undefined) updateData.bathrooms = dto.bathrooms;
    if (dto.floors !== undefined) updateData.floors = dto.floors;
    if (dto.yearBuilt !== undefined) updateData.yearBuilt = dto.yearBuilt;
    if (dto.energyEfficiency !== undefined) updateData.energyEfficiency = dto.energyEfficiency;
    if (dto.energyCertificateUrl !== undefined) {
      updateData.energyCertificateUrl = dto.energyCertificateUrl;
    }
    if (dto.hoaFees !== undefined) updateData.hoaFees = new Prisma.Decimal(dto.hoaFees);
    if (dto.hoaInfo !== undefined) updateData.hoaInfo = dto.hoaInfo;
    if (dto.petFriendly !== undefined) updateData.petFriendly = dto.petFriendly;
    if (dto.newlyBuilt !== undefined) updateData.newlyBuilt = dto.newlyBuilt;
    if (dto.accessible !== undefined) updateData.accessible = dto.accessible;
    if (dto.noAgents !== undefined) updateData.noAgents = dto.noAgents;

    const updatedProperty = await this.prisma.property.update({
      where: { id },
      data: updateData,
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            emailVerified: true,
            idVerificationStatus: true,
          },
        },
        media: {
          orderBy: { sortOrder: 'asc' },
        },
        floorPlans: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return this.mapToResponseDto(updatedProperty);
  }

  async updateListingTypes(
    id: string,
    listingTypes: ListingType[],
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<PropertyResponseDto> {
    const property = await this.prisma.property.findUnique({
      where: { id },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.ownerId !== requesterId && requesterRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only update your own properties');
    }

    if (listingTypes.length === 0) {
      throw new BadRequestException('At least one listing type is required');
    }

    const updatedProperty = await this.prisma.property.update({
      where: { id },
      data: { listingTypes },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            emailVerified: true,
            idVerificationStatus: true,
          },
        },
        media: {
          orderBy: { sortOrder: 'asc' },
        },
        floorPlans: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return this.mapToResponseDto(updatedProperty);
  }

  async updateStatus(
    id: string,
    status: PropertyStatus,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<PropertyResponseDto> {
    const property = await this.prisma.property.findUnique({
      where: { id },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.ownerId !== requesterId && requesterRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only update your own properties');
    }

    // Validate status transitions
    if (property.status === PropertyStatus.DELETED) {
      throw new BadRequestException('Cannot change status of a deleted property');
    }

    const updateData: Prisma.PropertyUpdateInput = { status };

    // Set publishedAt when first published
    if (status === PropertyStatus.ACTIVE && !property.publishedAt) {
      updateData.publishedAt = new Date();
    }

    const updatedProperty = await this.prisma.property.update({
      where: { id },
      data: updateData,
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            emailVerified: true,
            idVerificationStatus: true,
          },
        },
        media: {
          orderBy: { sortOrder: 'asc' },
        },
        floorPlans: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return this.mapToResponseDto(updatedProperty);
  }

  async softDelete(
    id: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<{ message: string }> {
    const property = await this.prisma.property.findUnique({
      where: { id },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.ownerId !== requesterId && requesterRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only delete your own properties');
    }

    if (property.status === PropertyStatus.DELETED) {
      throw new BadRequestException('Property is already deleted');
    }

    await this.prisma.property.update({
      where: { id },
      data: { status: PropertyStatus.DELETED },
    });

    return { message: 'Property deleted successfully' };
  }

  async getMyProperties(
    ownerId: string,
    query: PropertyQueryDto,
  ): Promise<PaginatedResponseDto<PropertyListResponseDto>> {
    const queryWithOwner = { ...query, ownerId };
    return this.findAll(queryWithOwner, ownerId, UserRole.USER);
  }

  private buildWhereClause(
    query: PropertyQueryDto,
    requesterId?: string,
    requesterRole?: UserRole,
  ): Prisma.PropertyWhereInput {
    const where: Prisma.PropertyWhereInput = {};

    // Text search
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { city: { contains: query.search, mode: 'insensitive' } },
        { address: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Location filters
    if (query.country) where.country = query.country;
    if (query.city) where.city = { contains: query.city, mode: 'insensitive' };
    if (query.postalCode) where.postalCode = query.postalCode;

    // Listing type filter
    if (query.listingTypes && query.listingTypes.length > 0) {
      where.listingTypes = { hasSome: query.listingTypes };
    }

    // Status filter
    if (query.status) {
      where.status = query.status;
    } else {
      // By default, only show active properties unless owner/admin
      if (query.ownerId && (query.ownerId === requesterId || requesterRole === UserRole.ADMIN)) {
        // Owner or admin can see all their properties
        where.ownerId = query.ownerId;
      } else {
        where.status = PropertyStatus.ACTIVE;
      }
    }

    // Owner filter
    if (query.ownerId) {
      where.ownerId = query.ownerId;
    }

    // Price range
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.basePrice = {};
      if (query.minPrice !== undefined) {
        where.basePrice.gte = new Prisma.Decimal(query.minPrice);
      }
      if (query.maxPrice !== undefined) {
        where.basePrice.lte = new Prisma.Decimal(query.maxPrice);
      }
    }

    // Size filters
    if (query.minSquareMeters !== undefined || query.maxSquareMeters !== undefined) {
      where.squareMeters = {};
      if (query.minSquareMeters !== undefined) {
        where.squareMeters.gte = query.minSquareMeters;
      }
      if (query.maxSquareMeters !== undefined) {
        where.squareMeters.lte = query.maxSquareMeters;
      }
    }

    // Room filters
    if (query.minBedrooms !== undefined || query.maxBedrooms !== undefined) {
      where.bedrooms = {};
      if (query.minBedrooms !== undefined) {
        where.bedrooms.gte = query.minBedrooms;
      }
      if (query.maxBedrooms !== undefined) {
        where.bedrooms.lte = query.maxBedrooms;
      }
    }

    if (query.minBathrooms !== undefined) {
      where.bathrooms = { gte: query.minBathrooms };
    }

    // Year built range
    if (query.minYearBuilt !== undefined || query.maxYearBuilt !== undefined) {
      where.yearBuilt = {};
      if (query.minYearBuilt !== undefined) {
        where.yearBuilt.gte = query.minYearBuilt;
      }
      if (query.maxYearBuilt !== undefined) {
        where.yearBuilt.lte = query.maxYearBuilt;
      }
    }

    // Feature filters
    if (query.petFriendly !== undefined) where.petFriendly = query.petFriendly;
    if (query.newlyBuilt !== undefined) where.newlyBuilt = query.newlyBuilt;
    if (query.accessible !== undefined) where.accessible = query.accessible;
    if (query.noAgents !== undefined) where.noAgents = query.noAgents;

    // Geo bounding box
    if (
      query.swLat !== undefined &&
      query.swLng !== undefined &&
      query.neLat !== undefined &&
      query.neLng !== undefined
    ) {
      where.AND = [
        { latitude: { gte: query.swLat, lte: query.neLat } },
        { longitude: { gte: query.swLng, lte: query.neLng } },
      ];
    }

    return where;
  }

  private mapToResponseDto(property: {
    id: string;
    ownerId: string;
    owner?: {
      id: string;
      firstName: string;
      lastName: string;
      phone: string | null;
      emailVerified: boolean;
      idVerificationStatus: string;
    };
    address: string;
    postalCode: string;
    city: string;
    country: string;
    latitude: number | null;
    longitude: number | null;
    title: string;
    description: string | null;
    aiGeneratedDescription: string | null;
    descriptionTone: string | null;
    listingTypes: ListingType[];
    basePrice: Prisma.Decimal;
    currency: string;
    priceNegotiable: boolean;
    negotiabilityRange: Prisma.Decimal | null;
    dynamicPricingEnabled: boolean;
    squareMeters: number | null;
    lotSize: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    floors: number | null;
    yearBuilt: number | null;
    energyEfficiency: EnergyEfficiencyRating;
    energyCertificateUrl: string | null;
    hoaFees: Prisma.Decimal | null;
    hoaInfo: string | null;
    petFriendly: boolean;
    newlyBuilt: boolean;
    accessible: boolean;
    noAgents: boolean;
    status: PropertyStatus;
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    media?: Array<{
      id: string;
      type: string;
      url: string;
      thumbnailUrl: string | null;
      caption: string | null;
      sortOrder: number;
      isPrimary: boolean;
      createdAt: Date;
    }>;
    floorPlans?: Array<{
      id: string;
      name: string;
      imageUrl: string;
      sortOrder: number;
      createdAt: Date;
    }>;
    _count?: {
      favoritedBy: number;
    };
  }): PropertyResponseDto {
    return {
      id: property.id,
      ownerId: property.ownerId,
      owner: property.owner
        ? {
            id: property.owner.id,
            firstName: property.owner.firstName,
            lastName: property.owner.lastName,
            phone: property.owner.phone || undefined,
            emailVerified: property.owner.emailVerified,
            idVerificationStatus: property.owner.idVerificationStatus,
          }
        : undefined,
      address: property.address,
      postalCode: property.postalCode,
      city: property.city,
      country: property.country,
      latitude: property.latitude || undefined,
      longitude: property.longitude || undefined,
      title: property.title,
      description: property.description || undefined,
      aiGeneratedDescription: property.aiGeneratedDescription || undefined,
      descriptionTone: property.descriptionTone || undefined,
      listingTypes: property.listingTypes,
      basePrice: property.basePrice.toString(),
      currency: property.currency,
      priceNegotiable: property.priceNegotiable,
      negotiabilityRange: property.negotiabilityRange?.toString(),
      dynamicPricingEnabled: property.dynamicPricingEnabled,
      squareMeters: property.squareMeters || undefined,
      lotSize: property.lotSize || undefined,
      bedrooms: property.bedrooms || undefined,
      bathrooms: property.bathrooms || undefined,
      floors: property.floors || undefined,
      yearBuilt: property.yearBuilt || undefined,
      energyEfficiency: property.energyEfficiency,
      energyCertificateUrl: property.energyCertificateUrl || undefined,
      hoaFees: property.hoaFees?.toString(),
      hoaInfo: property.hoaInfo || undefined,
      petFriendly: property.petFriendly,
      newlyBuilt: property.newlyBuilt,
      accessible: property.accessible,
      noAgents: property.noAgents,
      status: property.status,
      publishedAt: property.publishedAt || undefined,
      media: property.media?.map((m) => ({
        id: m.id,
        type: m.type,
        url: m.url,
        thumbnailUrl: m.thumbnailUrl || undefined,
        caption: m.caption || undefined,
        sortOrder: m.sortOrder,
        isPrimary: m.isPrimary,
        createdAt: m.createdAt,
      })),
      floorPlans: property.floorPlans?.map((f) => ({
        id: f.id,
        name: f.name,
        imageUrl: f.imageUrl,
        sortOrder: f.sortOrder,
        createdAt: f.createdAt,
      })),
      favoriteCount: property._count?.favoritedBy,
      createdAt: property.createdAt,
      updatedAt: property.updatedAt,
    };
  }

  private mapToListResponseDto(property: {
    id: string;
    title: string;
    city: string;
    country: string;
    listingTypes: ListingType[];
    basePrice: Prisma.Decimal;
    currency: string;
    squareMeters: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    status: PropertyStatus;
    noAgents: boolean;
    createdAt: Date;
    media?: Array<{
      url: string;
    }>;
  }): PropertyListResponseDto {
    return {
      id: property.id,
      title: property.title,
      city: property.city,
      country: property.country,
      listingTypes: property.listingTypes,
      basePrice: property.basePrice.toString(),
      currency: property.currency,
      squareMeters: property.squareMeters || undefined,
      bedrooms: property.bedrooms || undefined,
      bathrooms: property.bathrooms || undefined,
      status: property.status,
      primaryImageUrl: property.media?.[0]?.url,
      noAgents: property.noAgents,
      createdAt: property.createdAt,
    };
  }
}
