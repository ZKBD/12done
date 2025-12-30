import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { existsSync, mkdirSync } from 'fs';
import type { Request } from 'express';

// Multer file type (from @types/multer)
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { PropertyStatus, UserRole, ListingType } from '@prisma/client';
import { PropertiesService } from './properties.service';
import {
  AvailabilityService,
  InspectionService,
  PricingService,
  MediaService,
  OpenHouseService,
} from './services';
import {
  BrowsingHistoryService,
  TrackViewDto,
  BrowsingHistoryResponseDto,
} from '@/modules/search';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '@/modules/auth/guards';
import { RolesGuard } from '@/common/guards';
import { CurrentUser, CurrentUserData } from '@/common/decorators';
import { PaginatedResponseDto } from '@/common/dto';
import {
  CreatePropertyDto,
  UpdatePropertyDto,
  PropertyResponseDto,
  PropertyListResponseDto,
  PropertyQueryDto,
  CreateAvailabilitySlotDto,
  UpdateAvailabilitySlotDto,
  BulkAvailabilityDto,
  AvailabilitySlotResponseDto,
  AvailabilityQueryDto,
  CalculateCostDto,
  CostCalculationResponseDto,
  CreateInspectionSlotDto,
  BulkInspectionSlotsDto,
  InspectionSlotResponseDto,
  InspectionQueryDto,
  CreateDynamicPricingRuleDto,
  UpdateDynamicPricingRuleDto,
  DynamicPricingRuleResponseDto,
  CreatePropertyMediaDto,
  UpdatePropertyMediaDto,
  ReorderMediaDto,
  CreateFloorPlanDto,
  UpdateFloorPlanDto,
  CreateOpenHouseDto,
  UpdateOpenHouseDto,
  OpenHouseResponseDto,
  OpenHouseQueryDto,
  MediaType,
} from './dto';
import { PropertyMediaResponseDto, FloorPlanResponseDto } from './dto/property-response.dto';

@ApiTags('properties')
@Controller('properties')
export class PropertiesController {
  constructor(
    private readonly propertiesService: PropertiesService,
    private readonly availabilityService: AvailabilityService,
    private readonly inspectionService: InspectionService,
    private readonly pricingService: PricingService,
    private readonly mediaService: MediaService,
    private readonly openHouseService: OpenHouseService,
    private readonly browsingHistoryService: BrowsingHistoryService,
  ) {}

  // ============ PROPERTY CRUD ============

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new property listing (PROD-020, PROD-021)' })
  @ApiResponse({
    status: 201,
    description: 'Property created successfully',
    type: PropertyResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @Body() dto: CreatePropertyDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<PropertyResponseDto> {
    return this.propertiesService.create(dto, user.id);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'List properties with filters (PROD-042)' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of properties',
  })
  async findAll(
    @Query() query: PropertyQueryDto,
    @CurrentUser() user?: CurrentUserData,
  ): Promise<PaginatedResponseDto<PropertyListResponseDto>> {
    return this.propertiesService.findAll(
      query,
      user?.id,
      user?.role as UserRole,
    );
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List current user\'s properties' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of user\'s properties',
  })
  async getMyProperties(
    @Query() query: PropertyQueryDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<PaginatedResponseDto<PropertyListResponseDto>> {
    return this.propertiesService.getMyProperties(user.id, query);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get property by ID (PROD-027)' })
  @ApiParam({ name: 'id', description: 'Property ID' })
  @ApiResponse({
    status: 200,
    description: 'Property details',
    type: PropertyResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Property not found' })
  async findById(
    @Param('id') id: string,
    @CurrentUser() user?: CurrentUserData,
  ): Promise<PropertyResponseDto> {
    return this.propertiesService.findById(id, user?.id, user?.role as UserRole);
  }

  @Post(':id/view')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Track property view for recommendations (PROD-050)' })
  @ApiParam({ name: 'id', description: 'Property ID' })
  @ApiResponse({
    status: 200,
    description: 'View tracked successfully',
    type: BrowsingHistoryResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Property not found' })
  async trackView(
    @Param('id') propertyId: string,
    @Body() dto: TrackViewDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<BrowsingHistoryResponseDto> {
    return this.browsingHistoryService.trackView(user.id, propertyId, dto.duration);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update property' })
  @ApiParam({ name: 'id', description: 'Property ID' })
  @ApiResponse({
    status: 200,
    description: 'Property updated successfully',
    type: PropertyResponseDto,
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePropertyDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<PropertyResponseDto> {
    return this.propertiesService.update(id, dto, user.id, user.role as UserRole);
  }

  @Patch(':id/listing-types')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update property listing types (PROD-022)' })
  @ApiParam({ name: 'id', description: 'Property ID' })
  @ApiResponse({
    status: 200,
    description: 'Listing types updated',
    type: PropertyResponseDto,
  })
  async updateListingTypes(
    @Param('id') id: string,
    @Body('listingTypes') listingTypes: ListingType[],
    @CurrentUser() user: CurrentUserData,
  ): Promise<PropertyResponseDto> {
    return this.propertiesService.updateListingTypes(
      id,
      listingTypes,
      user.id,
      user.role as UserRole,
    );
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update property status (publish, pause, etc.)' })
  @ApiParam({ name: 'id', description: 'Property ID' })
  @ApiResponse({
    status: 200,
    description: 'Status updated',
    type: PropertyResponseDto,
  })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: PropertyStatus,
    @CurrentUser() user: CurrentUserData,
  ): Promise<PropertyResponseDto> {
    return this.propertiesService.updateStatus(
      id,
      status,
      user.id,
      user.role as UserRole,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete property (soft delete)' })
  @ApiParam({ name: 'id', description: 'Property ID' })
  @ApiResponse({ status: 200, description: 'Property deleted' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<{ message: string }> {
    return this.propertiesService.softDelete(id, user.id, user.role as UserRole);
  }

  // ============ AVAILABILITY (PROD-024) ============

  @Post(':id/availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add availability slot' })
  @ApiParam({ name: 'id', description: 'Property ID' })
  async createAvailabilitySlot(
    @Param('id') propertyId: string,
    @Body() dto: CreateAvailabilitySlotDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<AvailabilitySlotResponseDto> {
    return this.availabilityService.createSlot(
      propertyId,
      dto,
      user.id,
      user.role as UserRole,
    );
  }

  @Post(':id/availability/bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add multiple availability slots' })
  @ApiParam({ name: 'id', description: 'Property ID' })
  async createBulkAvailabilitySlots(
    @Param('id') propertyId: string,
    @Body() dto: BulkAvailabilityDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<AvailabilitySlotResponseDto[]> {
    return this.availabilityService.createBulkSlots(
      propertyId,
      dto,
      user.id,
      user.role as UserRole,
    );
  }

  @Get(':id/availability')
  @ApiOperation({ summary: 'Get availability calendar (PROD-024)' })
  @ApiParam({ name: 'id', description: 'Property ID' })
  async getAvailabilitySlots(
    @Param('id') propertyId: string,
    @Query() query: AvailabilityQueryDto,
  ): Promise<AvailabilitySlotResponseDto[]> {
    return this.availabilityService.getSlots(propertyId, query);
  }

  @Patch(':id/availability/:slotId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update availability slot' })
  async updateAvailabilitySlot(
    @Param('id') propertyId: string,
    @Param('slotId') slotId: string,
    @Body() dto: UpdateAvailabilitySlotDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<AvailabilitySlotResponseDto> {
    return this.availabilityService.updateSlot(
      propertyId,
      slotId,
      dto,
      user.id,
      user.role as UserRole,
    );
  }

  @Delete(':id/availability/:slotId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete availability slot' })
  async deleteAvailabilitySlot(
    @Param('id') propertyId: string,
    @Param('slotId') slotId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<{ message: string }> {
    return this.availabilityService.deleteSlot(
      propertyId,
      slotId,
      user.id,
      user.role as UserRole,
    );
  }

  @Post(':id/availability/calculate-cost')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calculate rental cost for date range' })
  @ApiParam({ name: 'id', description: 'Property ID' })
  async calculateCost(
    @Param('id') propertyId: string,
    @Body() dto: CalculateCostDto,
  ): Promise<CostCalculationResponseDto> {
    return this.availabilityService.calculateCost(propertyId, dto);
  }

  // ============ INSPECTIONS (PROD-025) ============

  @Post(':id/inspections')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create inspection slot (PROD-025)' })
  @ApiParam({ name: 'id', description: 'Property ID' })
  async createInspectionSlot(
    @Param('id') propertyId: string,
    @Body() dto: CreateInspectionSlotDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<InspectionSlotResponseDto> {
    return this.inspectionService.createSlot(
      propertyId,
      dto,
      user.id,
      user.role as UserRole,
    );
  }

  @Post(':id/inspections/bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create multiple inspection slots' })
  @ApiParam({ name: 'id', description: 'Property ID' })
  async createBulkInspectionSlots(
    @Param('id') propertyId: string,
    @Body() dto: BulkInspectionSlotsDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<InspectionSlotResponseDto[]> {
    return this.inspectionService.createBulkSlots(
      propertyId,
      dto,
      user.id,
      user.role as UserRole,
    );
  }

  @Get(':id/inspections')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get inspection slots' })
  @ApiParam({ name: 'id', description: 'Property ID' })
  async getInspectionSlots(
    @Param('id') propertyId: string,
    @Query() query: InspectionQueryDto,
    @CurrentUser() user?: CurrentUserData,
  ): Promise<InspectionSlotResponseDto[]> {
    return this.inspectionService.getSlots(
      propertyId,
      query,
      user?.id,
      user?.role as UserRole,
    );
  }

  @Post(':id/inspections/:slotId/book')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Book an inspection slot' })
  async bookInspection(
    @Param('id') propertyId: string,
    @Param('slotId') slotId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<InspectionSlotResponseDto> {
    return this.inspectionService.bookSlot(propertyId, slotId, user.id);
  }

  @Post(':id/inspections/:slotId/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an inspection booking' })
  async cancelInspection(
    @Param('id') propertyId: string,
    @Param('slotId') slotId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<InspectionSlotResponseDto> {
    return this.inspectionService.cancelBooking(
      propertyId,
      slotId,
      user.id,
      user.role as UserRole,
    );
  }

  @Delete(':id/inspections/:slotId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete inspection slot' })
  async deleteInspectionSlot(
    @Param('id') propertyId: string,
    @Param('slotId') slotId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<{ message: string }> {
    return this.inspectionService.deleteSlot(
      propertyId,
      slotId,
      user.id,
      user.role as UserRole,
    );
  }

  // ============ DYNAMIC PRICING (PROD-023) ============

  @Post(':id/pricing/rules')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create dynamic pricing rule (PROD-023)' })
  @ApiParam({ name: 'id', description: 'Property ID' })
  async createPricingRule(
    @Param('id') propertyId: string,
    @Body() dto: CreateDynamicPricingRuleDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<DynamicPricingRuleResponseDto> {
    return this.pricingService.createRule(
      propertyId,
      dto,
      user.id,
      user.role as UserRole,
    );
  }

  @Get(':id/pricing/rules')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all pricing rules for property' })
  @ApiParam({ name: 'id', description: 'Property ID' })
  async getPricingRules(
    @Param('id') propertyId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<DynamicPricingRuleResponseDto[]> {
    return this.pricingService.getRules(propertyId, user.id, user.role as UserRole);
  }

  @Patch(':id/pricing/rules/:ruleId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update pricing rule' })
  async updatePricingRule(
    @Param('id') propertyId: string,
    @Param('ruleId') ruleId: string,
    @Body() dto: UpdateDynamicPricingRuleDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<DynamicPricingRuleResponseDto> {
    return this.pricingService.updateRule(
      propertyId,
      ruleId,
      dto,
      user.id,
      user.role as UserRole,
    );
  }

  @Delete(':id/pricing/rules/:ruleId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete pricing rule' })
  async deletePricingRule(
    @Param('id') propertyId: string,
    @Param('ruleId') ruleId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<{ message: string }> {
    return this.pricingService.deleteRule(
      propertyId,
      ruleId,
      user.id,
      user.role as UserRole,
    );
  }

  // ============ MEDIA (PROD-028) ============

  @Post(':id/media/upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload property media files' })
  @ApiParam({ name: 'id', description: 'Property ID' })
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: (
          req: Request,
          file: MulterFile,
          cb: (error: Error | null, destination: string) => void,
        ) => {
          const uploadPath = join(process.cwd(), 'uploads', 'properties');
          if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (
          req: Request,
          file: MulterFile,
          cb: (error: Error | null, filename: string) => void,
        ) => {
          const uniqueSuffix = uuidv4();
          const ext = extname(file.originalname);
          cb(null, `${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (
        req: Request,
        file: MulterFile,
        cb: (error: Error | null, acceptFile: boolean) => void,
      ) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only JPG, PNG, and WebP images are allowed'), false);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  async uploadMedia(
    @Param('id') propertyId: string,
    @UploadedFiles() files: MulterFile[],
    @CurrentUser() user: CurrentUserData,
    @Body('type') type: string = 'photo',
  ): Promise<PropertyMediaResponseDto[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    const results: PropertyMediaResponseDto[] = [];

    for (const file of files) {
      const baseUrl = process.env.API_URL || 'http://localhost:3002';
      const url = `${baseUrl}/uploads/properties/${file.filename}`;

      const mediaType =
        type === 'video'
          ? MediaType.VIDEO
          : type === 'tour_360'
            ? MediaType.TOUR_360
            : type === 'tour_3d'
              ? MediaType.TOUR_3D
              : MediaType.PHOTO;

      const mediaDto: CreatePropertyMediaDto = {
        type: mediaType,
        url,
        isPrimary: results.length === 0, // First uploaded image is primary
      };

      const media = await this.mediaService.addMedia(
        propertyId,
        mediaDto,
        user.id,
        user.role as UserRole,
      );

      results.push(media);
    }

    return results;
  }

  @Post(':id/media')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add property media (PROD-028)' })
  @ApiParam({ name: 'id', description: 'Property ID' })
  async addMedia(
    @Param('id') propertyId: string,
    @Body() dto: CreatePropertyMediaDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<PropertyMediaResponseDto> {
    return this.mediaService.addMedia(
      propertyId,
      dto,
      user.id,
      user.role as UserRole,
    );
  }

  @Get(':id/media')
  @ApiOperation({ summary: 'Get property media' })
  @ApiParam({ name: 'id', description: 'Property ID' })
  async getMedia(
    @Param('id') propertyId: string,
  ): Promise<PropertyMediaResponseDto[]> {
    return this.mediaService.getMedia(propertyId);
  }

  @Patch(':id/media/:mediaId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update property media' })
  async updateMedia(
    @Param('id') propertyId: string,
    @Param('mediaId') mediaId: string,
    @Body() dto: UpdatePropertyMediaDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<PropertyMediaResponseDto> {
    return this.mediaService.updateMedia(
      propertyId,
      mediaId,
      dto,
      user.id,
      user.role as UserRole,
    );
  }

  @Delete(':id/media/:mediaId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete property media' })
  async deleteMedia(
    @Param('id') propertyId: string,
    @Param('mediaId') mediaId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<{ message: string }> {
    return this.mediaService.deleteMedia(
      propertyId,
      mediaId,
      user.id,
      user.role as UserRole,
    );
  }

  @Post(':id/media/reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reorder property media' })
  async reorderMedia(
    @Param('id') propertyId: string,
    @Body() dto: ReorderMediaDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<PropertyMediaResponseDto[]> {
    return this.mediaService.reorderMedia(
      propertyId,
      dto,
      user.id,
      user.role as UserRole,
    );
  }

  @Post(':id/media/:mediaId/set-primary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set media as primary/featured image' })
  async setPrimaryMedia(
    @Param('id') propertyId: string,
    @Param('mediaId') mediaId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<PropertyMediaResponseDto> {
    return this.mediaService.setPrimaryMedia(
      propertyId,
      mediaId,
      user.id,
      user.role as UserRole,
    );
  }

  // ============ FLOOR PLANS (PROD-027) ============

  @Post(':id/floor-plans')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add floor plan (PROD-027)' })
  @ApiParam({ name: 'id', description: 'Property ID' })
  async addFloorPlan(
    @Param('id') propertyId: string,
    @Body() dto: CreateFloorPlanDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<FloorPlanResponseDto> {
    return this.mediaService.addFloorPlan(
      propertyId,
      dto,
      user.id,
      user.role as UserRole,
    );
  }

  @Get(':id/floor-plans')
  @ApiOperation({ summary: 'Get property floor plans' })
  @ApiParam({ name: 'id', description: 'Property ID' })
  async getFloorPlans(
    @Param('id') propertyId: string,
  ): Promise<FloorPlanResponseDto[]> {
    return this.mediaService.getFloorPlans(propertyId);
  }

  @Patch(':id/floor-plans/:floorPlanId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update floor plan' })
  async updateFloorPlan(
    @Param('id') propertyId: string,
    @Param('floorPlanId') floorPlanId: string,
    @Body() dto: UpdateFloorPlanDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<FloorPlanResponseDto> {
    return this.mediaService.updateFloorPlan(
      propertyId,
      floorPlanId,
      dto,
      user.id,
      user.role as UserRole,
    );
  }

  @Delete(':id/floor-plans/:floorPlanId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete floor plan' })
  async deleteFloorPlan(
    @Param('id') propertyId: string,
    @Param('floorPlanId') floorPlanId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<{ message: string }> {
    return this.mediaService.deleteFloorPlan(
      propertyId,
      floorPlanId,
      user.id,
      user.role as UserRole,
    );
  }

  // ============ OPEN HOUSE EVENTS (PROD-048) ============

  @Post(':id/open-houses')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create open house event (PROD-048)' })
  @ApiParam({ name: 'id', description: 'Property ID' })
  @ApiResponse({
    status: 201,
    description: 'Open house event created',
    type: OpenHouseResponseDto,
  })
  async createOpenHouse(
    @Param('id') propertyId: string,
    @Body() dto: CreateOpenHouseDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<OpenHouseResponseDto> {
    return this.openHouseService.create(
      propertyId,
      dto,
      user.id,
      user.role as UserRole,
    );
  }

  @Get(':id/open-houses')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get open house events for property (PROD-048)' })
  @ApiParam({ name: 'id', description: 'Property ID' })
  @ApiResponse({
    status: 200,
    description: 'List of open house events',
    type: [OpenHouseResponseDto],
  })
  async getOpenHouses(
    @Param('id') propertyId: string,
    @Query() query: OpenHouseQueryDto,
    @CurrentUser() user?: CurrentUserData,
  ): Promise<OpenHouseResponseDto[]> {
    return this.openHouseService.findAll(
      propertyId,
      query,
      user?.id,
      user?.role as UserRole,
    );
  }

  @Get(':id/open-houses/:eventId')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get open house event by ID' })
  @ApiParam({ name: 'id', description: 'Property ID' })
  @ApiParam({ name: 'eventId', description: 'Open house event ID' })
  @ApiResponse({
    status: 200,
    description: 'Open house event details',
    type: OpenHouseResponseDto,
  })
  async getOpenHouse(
    @Param('id') propertyId: string,
    @Param('eventId') eventId: string,
    @CurrentUser() user?: CurrentUserData,
  ): Promise<OpenHouseResponseDto> {
    return this.openHouseService.findOne(
      propertyId,
      eventId,
      user?.id,
      user?.role as UserRole,
    );
  }

  @Patch(':id/open-houses/:eventId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update open house event' })
  @ApiParam({ name: 'id', description: 'Property ID' })
  @ApiParam({ name: 'eventId', description: 'Open house event ID' })
  @ApiResponse({
    status: 200,
    description: 'Open house event updated',
    type: OpenHouseResponseDto,
  })
  async updateOpenHouse(
    @Param('id') propertyId: string,
    @Param('eventId') eventId: string,
    @Body() dto: UpdateOpenHouseDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<OpenHouseResponseDto> {
    return this.openHouseService.update(
      propertyId,
      eventId,
      dto,
      user.id,
      user.role as UserRole,
    );
  }

  @Delete(':id/open-houses/:eventId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete open house event' })
  @ApiParam({ name: 'id', description: 'Property ID' })
  @ApiParam({ name: 'eventId', description: 'Open house event ID' })
  @ApiResponse({ status: 200, description: 'Open house event deleted' })
  async deleteOpenHouse(
    @Param('id') propertyId: string,
    @Param('eventId') eventId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<{ message: string }> {
    return this.openHouseService.delete(
      propertyId,
      eventId,
      user.id,
      user.role as UserRole,
    );
  }
}
