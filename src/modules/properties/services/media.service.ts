import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PropertyStatus, UserRole } from '@prisma/client';
import { PrismaService } from '@/database';
import {
  CreatePropertyMediaDto,
  UpdatePropertyMediaDto,
  ReorderMediaDto,
  CreateFloorPlanDto,
  UpdateFloorPlanDto,
} from '../dto';
import { PropertyMediaResponseDto, FloorPlanResponseDto } from '../dto/property-response.dto';

@Injectable()
export class MediaService {
  constructor(private prisma: PrismaService) {}

  // ============ PROPERTY MEDIA ============

  async addMedia(
    propertyId: string,
    dto: CreatePropertyMediaDto,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<PropertyMediaResponseDto> {
    await this.verifyPropertyOwnership(propertyId, requesterId, requesterRole);

    // If setting as primary, unset existing primary
    if (dto.isPrimary) {
      await this.prisma.propertyMedia.updateMany({
        where: { propertyId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    // Get next sort order if not specified
    let sortOrder = dto.sortOrder;
    if (sortOrder === undefined) {
      const lastMedia = await this.prisma.propertyMedia.findFirst({
        where: { propertyId },
        orderBy: { sortOrder: 'desc' },
      });
      sortOrder = (lastMedia?.sortOrder ?? -1) + 1;
    }

    const media = await this.prisma.propertyMedia.create({
      data: {
        propertyId,
        type: dto.type,
        url: dto.url,
        thumbnailUrl: dto.thumbnailUrl,
        caption: dto.caption,
        sortOrder,
        isPrimary: dto.isPrimary ?? false,
      },
    });

    return this.mapMediaToResponseDto(media);
  }

  async getMedia(propertyId: string): Promise<PropertyMediaResponseDto[]> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property || property.status === PropertyStatus.DELETED) {
      throw new NotFoundException('Property not found');
    }

    const media = await this.prisma.propertyMedia.findMany({
      where: { propertyId },
      orderBy: { sortOrder: 'asc' },
    });

    return media.map((m) => this.mapMediaToResponseDto(m));
  }

  async updateMedia(
    propertyId: string,
    mediaId: string,
    dto: UpdatePropertyMediaDto,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<PropertyMediaResponseDto> {
    await this.verifyPropertyOwnership(propertyId, requesterId, requesterRole);

    const media = await this.prisma.propertyMedia.findFirst({
      where: { id: mediaId, propertyId },
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    // If setting as primary, unset existing primary
    if (dto.isPrimary) {
      await this.prisma.propertyMedia.updateMany({
        where: { propertyId, isPrimary: true, id: { not: mediaId } },
        data: { isPrimary: false },
      });
    }

    const updatedMedia = await this.prisma.propertyMedia.update({
      where: { id: mediaId },
      data: {
        ...(dto.caption !== undefined && { caption: dto.caption }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.isPrimary !== undefined && { isPrimary: dto.isPrimary }),
      },
    });

    return this.mapMediaToResponseDto(updatedMedia);
  }

  async deleteMedia(
    propertyId: string,
    mediaId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<{ message: string }> {
    await this.verifyPropertyOwnership(propertyId, requesterId, requesterRole);

    const media = await this.prisma.propertyMedia.findFirst({
      where: { id: mediaId, propertyId },
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    await this.prisma.propertyMedia.delete({
      where: { id: mediaId },
    });

    // If deleted media was primary, make the first remaining media primary
    if (media.isPrimary) {
      const firstMedia = await this.prisma.propertyMedia.findFirst({
        where: { propertyId },
        orderBy: { sortOrder: 'asc' },
      });

      if (firstMedia) {
        await this.prisma.propertyMedia.update({
          where: { id: firstMedia.id },
          data: { isPrimary: true },
        });
      }
    }

    return { message: 'Media deleted successfully' };
  }

  async reorderMedia(
    propertyId: string,
    dto: ReorderMediaDto,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<PropertyMediaResponseDto[]> {
    await this.verifyPropertyOwnership(propertyId, requesterId, requesterRole);

    // Update sort order for each media item
    for (let i = 0; i < dto.mediaIds.length; i++) {
      await this.prisma.propertyMedia.updateMany({
        where: { id: dto.mediaIds[i], propertyId },
        data: { sortOrder: i },
      });
    }

    return this.getMedia(propertyId);
  }

  async setPrimaryMedia(
    propertyId: string,
    mediaId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<PropertyMediaResponseDto> {
    await this.verifyPropertyOwnership(propertyId, requesterId, requesterRole);

    const media = await this.prisma.propertyMedia.findFirst({
      where: { id: mediaId, propertyId },
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    // Unset current primary
    await this.prisma.propertyMedia.updateMany({
      where: { propertyId, isPrimary: true },
      data: { isPrimary: false },
    });

    // Set new primary
    const updatedMedia = await this.prisma.propertyMedia.update({
      where: { id: mediaId },
      data: { isPrimary: true },
    });

    return this.mapMediaToResponseDto(updatedMedia);
  }

  // ============ FLOOR PLANS ============

  async addFloorPlan(
    propertyId: string,
    dto: CreateFloorPlanDto,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<FloorPlanResponseDto> {
    await this.verifyPropertyOwnership(propertyId, requesterId, requesterRole);

    // Get next sort order if not specified
    let sortOrder = dto.sortOrder;
    if (sortOrder === undefined) {
      const lastPlan = await this.prisma.floorPlan.findFirst({
        where: { propertyId },
        orderBy: { sortOrder: 'desc' },
      });
      sortOrder = (lastPlan?.sortOrder ?? -1) + 1;
    }

    const floorPlan = await this.prisma.floorPlan.create({
      data: {
        propertyId,
        name: dto.name,
        imageUrl: dto.imageUrl,
        sortOrder,
      },
    });

    return this.mapFloorPlanToResponseDto(floorPlan);
  }

  async getFloorPlans(propertyId: string): Promise<FloorPlanResponseDto[]> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property || property.status === PropertyStatus.DELETED) {
      throw new NotFoundException('Property not found');
    }

    const floorPlans = await this.prisma.floorPlan.findMany({
      where: { propertyId },
      orderBy: { sortOrder: 'asc' },
    });

    return floorPlans.map((f) => this.mapFloorPlanToResponseDto(f));
  }

  async updateFloorPlan(
    propertyId: string,
    floorPlanId: string,
    dto: UpdateFloorPlanDto,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<FloorPlanResponseDto> {
    await this.verifyPropertyOwnership(propertyId, requesterId, requesterRole);

    const floorPlan = await this.prisma.floorPlan.findFirst({
      where: { id: floorPlanId, propertyId },
    });

    if (!floorPlan) {
      throw new NotFoundException('Floor plan not found');
    }

    const updatedPlan = await this.prisma.floorPlan.update({
      where: { id: floorPlanId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });

    return this.mapFloorPlanToResponseDto(updatedPlan);
  }

  async deleteFloorPlan(
    propertyId: string,
    floorPlanId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<{ message: string }> {
    await this.verifyPropertyOwnership(propertyId, requesterId, requesterRole);

    const floorPlan = await this.prisma.floorPlan.findFirst({
      where: { id: floorPlanId, propertyId },
    });

    if (!floorPlan) {
      throw new NotFoundException('Floor plan not found');
    }

    await this.prisma.floorPlan.delete({
      where: { id: floorPlanId },
    });

    return { message: 'Floor plan deleted successfully' };
  }

  // ============ HELPERS ============

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
      throw new ForbiddenException('You can only manage media for your own properties');
    }

    if (property.status === PropertyStatus.DELETED) {
      throw new BadRequestException('Cannot manage media for a deleted property');
    }
  }

  private mapMediaToResponseDto(media: {
    id: string;
    type: string;
    url: string;
    thumbnailUrl: string | null;
    caption: string | null;
    sortOrder: number;
    isPrimary: boolean;
    createdAt: Date;
  }): PropertyMediaResponseDto {
    return {
      id: media.id,
      type: media.type,
      url: media.url,
      thumbnailUrl: media.thumbnailUrl || undefined,
      caption: media.caption || undefined,
      sortOrder: media.sortOrder,
      isPrimary: media.isPrimary,
      createdAt: media.createdAt,
    };
  }

  private mapFloorPlanToResponseDto(floorPlan: {
    id: string;
    name: string;
    imageUrl: string;
    sortOrder: number;
    createdAt: Date;
  }): FloorPlanResponseDto {
    return {
      id: floorPlan.id,
      name: floorPlan.name,
      imageUrl: floorPlan.imageUrl,
      sortOrder: floorPlan.sortOrder,
      createdAt: floorPlan.createdAt,
    };
  }
}
