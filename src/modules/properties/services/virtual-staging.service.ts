import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import {
  RoomType,
  StagingStyle,
  StagingStatus,
  UserRole,
} from '@prisma/client';
import {
  CreateStagingRequestDto,
  StagingRequestResponseDto,
  StagedMediaResponseDto,
} from '../dto/virtual-staging.dto';

@Injectable()
export class VirtualStagingService {
  private readonly logger = new Logger(VirtualStagingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Submit a room photo for virtual staging (PROD-030.1)
   */
  async createStagingRequest(
    propertyId: string,
    userId: string,
    userRole: UserRole,
    dto: CreateStagingRequestDto,
  ): Promise<StagingRequestResponseDto> {
    // Verify property exists and user has access
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.ownerId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only property owner can create staging requests');
    }

    // Verify the media exists and belongs to this property
    const media = await this.prisma.propertyMedia.findUnique({
      where: { id: dto.mediaId },
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    if (media.propertyId !== propertyId) {
      throw new BadRequestException('Media does not belong to this property');
    }

    if (media.type !== 'photo') {
      throw new BadRequestException('Only photos can be virtually staged');
    }

    // Check if there's already a pending staging request for this media
    const existingRequest = await this.prisma.virtualStagingRequest.findFirst({
      where: {
        originalMediaId: dto.mediaId,
        status: { in: [StagingStatus.PENDING, StagingStatus.PROCESSING] },
      },
    });

    if (existingRequest) {
      throw new BadRequestException('A staging request is already in progress for this media');
    }

    // Create the staging request
    const request = await this.prisma.virtualStagingRequest.create({
      data: {
        propertyId,
        originalMediaId: dto.mediaId,
        roomType: dto.roomType,
        style: dto.style,
        status: StagingStatus.PENDING,
        requestedById: userId,
        providerName: 'MockProvider', // In production, would use actual provider
      },
    });

    this.logger.log(
      `Created staging request ${request.id} for media ${dto.mediaId} with style ${dto.style}`,
    );

    // Process immediately in mock mode (in production, would queue for async processing)
    const processed = await this.processStaging(request.id);

    return this.mapRequestToResponse(processed);
  }

  /**
   * Process staging request (mock implementation)
   */
  private async processStaging(requestId: string): Promise<any> {
    const request = await this.prisma.virtualStagingRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Staging request not found');
    }

    // Update to processing
    await this.prisma.virtualStagingRequest.update({
      where: { id: requestId },
      data: { status: StagingStatus.PROCESSING },
    });

    // Get original media
    const originalMedia = await this.prisma.propertyMedia.findUnique({
      where: { id: request.originalMediaId },
    });

    if (!originalMedia) {
      await this.prisma.virtualStagingRequest.update({
        where: { id: requestId },
        data: {
          status: StagingStatus.FAILED,
          errorMessage: 'Original media not found',
        },
      });
      throw new NotFoundException('Original media not found');
    }

    // Mock: Generate a staged URL (in production, call external API)
    const stagedUrl = this.generateMockStagedUrl(
      originalMedia.url,
      request.roomType,
      request.style,
    );

    // Create new PropertyMedia for the staged image
    const stagedMedia = await this.prisma.propertyMedia.create({
      data: {
        propertyId: request.propertyId,
        type: 'photo',
        url: stagedUrl,
        thumbnailUrl: stagedUrl,
        caption: `Virtually staged ${request.roomType.toLowerCase().replace('_', ' ')} - ${request.style.toLowerCase()} style`,
        sortOrder: originalMedia.sortOrder + 1,
        isVirtuallyStaged: true,
        roomType: request.roomType,
        stagingStyle: request.style,
        originalMediaId: request.originalMediaId,
      },
    });

    // Update request as completed
    const updatedRequest = await this.prisma.virtualStagingRequest.update({
      where: { id: requestId },
      data: {
        status: StagingStatus.COMPLETED,
        stagedMediaId: stagedMedia.id,
        stagedUrl: stagedUrl,
        completedAt: new Date(),
      },
    });

    this.logger.log(
      `Completed staging request ${requestId}, created media ${stagedMedia.id}`,
    );

    return updatedRequest;
  }

  /**
   * Generate mock staged URL (PROD-030.4)
   */
  private generateMockStagedUrl(
    originalUrl: string,
    roomType: RoomType,
    style: StagingStyle,
  ): string {
    // In production, this would call an external API like REimagine, RoOomy, etc.
    // For mock mode, we append staging parameters to the URL
    const timestamp = Date.now();
    const styleParam = style.toLowerCase();
    const roomParam = roomType.toLowerCase().replace('_', '-');
    return `${originalUrl}?staged=true&style=${styleParam}&room=${roomParam}&v=${timestamp}`;
  }

  /**
   * Get staging request status (PROD-030.5)
   */
  async getStagingRequest(
    propertyId: string,
    requestId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<StagingRequestResponseDto> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.ownerId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Access denied');
    }

    const request = await this.prisma.virtualStagingRequest.findUnique({
      where: { id: requestId },
    });

    if (!request || request.propertyId !== propertyId) {
      throw new NotFoundException('Staging request not found');
    }

    return this.mapRequestToResponse(request);
  }

  /**
   * Get all staging requests for a property
   */
  async getStagingRequests(
    propertyId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<StagingRequestResponseDto[]> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.ownerId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Access denied');
    }

    const requests = await this.prisma.virtualStagingRequest.findMany({
      where: { propertyId },
      orderBy: { createdAt: 'desc' },
    });

    return requests.map((r) => this.mapRequestToResponse(r));
  }

  /**
   * Get all virtually staged media for a property (PROD-030.6)
   */
  async getStagedMedia(
    propertyId: string,
  ): Promise<StagedMediaResponseDto[]> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    const media = await this.prisma.propertyMedia.findMany({
      where: {
        propertyId,
        isVirtuallyStaged: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return media.map((m) => this.mapMediaToResponse(m));
  }

  /**
   * Delete staged media
   */
  async deleteStagedMedia(
    propertyId: string,
    mediaId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<{ message: string }> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.ownerId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only property owner can delete staged media');
    }

    const media = await this.prisma.propertyMedia.findUnique({
      where: { id: mediaId },
    });

    if (!media || media.propertyId !== propertyId) {
      throw new NotFoundException('Media not found');
    }

    if (!media.isVirtuallyStaged) {
      throw new BadRequestException('This is not a virtually staged image');
    }

    await this.prisma.propertyMedia.delete({
      where: { id: mediaId },
    });

    this.logger.log(`Deleted staged media ${mediaId} from property ${propertyId}`);

    return { message: 'Staged media deleted successfully' };
  }

  /**
   * Compare original and staged images
   */
  async compareImages(
    propertyId: string,
    stagedMediaId: string,
  ): Promise<{
    original: StagedMediaResponseDto;
    staged: StagedMediaResponseDto;
  }> {
    const stagedMedia = await this.prisma.propertyMedia.findUnique({
      where: { id: stagedMediaId },
    });

    if (!stagedMedia || stagedMedia.propertyId !== propertyId) {
      throw new NotFoundException('Staged media not found');
    }

    if (!stagedMedia.isVirtuallyStaged || !stagedMedia.originalMediaId) {
      throw new BadRequestException('This media is not virtually staged or has no original');
    }

    const originalMedia = await this.prisma.propertyMedia.findUnique({
      where: { id: stagedMedia.originalMediaId },
    });

    if (!originalMedia) {
      throw new NotFoundException('Original media not found');
    }

    return {
      original: this.mapMediaToResponse(originalMedia),
      staged: this.mapMediaToResponse(stagedMedia),
    };
  }

  private mapRequestToResponse(request: any): StagingRequestResponseDto {
    return {
      id: request.id,
      propertyId: request.propertyId,
      originalMediaId: request.originalMediaId,
      roomType: request.roomType,
      style: request.style,
      status: request.status,
      stagedMediaId: request.stagedMediaId,
      stagedUrl: request.stagedUrl,
      errorMessage: request.errorMessage,
      createdAt: request.createdAt,
      completedAt: request.completedAt,
    };
  }

  private mapMediaToResponse(media: any): StagedMediaResponseDto {
    return {
      id: media.id,
      propertyId: media.propertyId,
      url: media.url,
      thumbnailUrl: media.thumbnailUrl,
      isVirtuallyStaged: media.isVirtuallyStaged,
      roomType: media.roomType,
      stagingStyle: media.stagingStyle,
      originalMediaId: media.originalMediaId,
      caption: media.caption,
      createdAt: media.createdAt,
    };
  }
}
