import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards';
import { NeighborhoodService } from './services';
import {
  LocationQueryDto,
  GetSchoolsDto,
  GetAmenitiesDto,
  NeighborhoodDataResponseDto,
  SchoolsResponseDto,
  AmenitiesResponseDto,
  ClimateRiskResponseDto,
  WalkabilityResponseDto,
  FutureDevelopmentsResponseDto,
  PropertyNeighborhoodProfileDto,
} from './dto';

@ApiTags('Neighborhood')
@Controller('neighborhood')
export class NeighborhoodController {
  constructor(private readonly neighborhoodService: NeighborhoodService) {}

  /**
   * Get comprehensive neighborhood data for a location (PROD-150)
   */
  @Get('data')
  @ApiOperation({ summary: 'Get neighborhood data for a location' })
  @ApiResponse({ status: 200, type: NeighborhoodDataResponseDto })
  async getNeighborhoodData(
    @Query() dto: LocationQueryDto,
  ): Promise<NeighborhoodDataResponseDto> {
    return this.neighborhoodService.getNeighborhoodData(dto);
  }

  /**
   * Get nearby schools (PROD-151)
   */
  @Get('schools')
  @ApiOperation({ summary: 'Get nearby schools with ratings' })
  @ApiResponse({ status: 200, type: SchoolsResponseDto })
  async getSchools(
    @Query() dto: GetSchoolsDto,
  ): Promise<SchoolsResponseDto> {
    return this.neighborhoodService.getSchools(dto);
  }

  /**
   * Get nearby amenities (PROD-150.3, PROD-158)
   */
  @Get('amenities')
  @ApiOperation({ summary: 'Get nearby amenities by category' })
  @ApiResponse({ status: 200, type: AmenitiesResponseDto })
  async getAmenities(
    @Query() dto: GetAmenitiesDto,
  ): Promise<AmenitiesResponseDto> {
    return this.neighborhoodService.getAmenities(dto);
  }

  /**
   * Get climate risk data (PROD-156)
   */
  @Get('climate-risk')
  @ApiOperation({ summary: 'Get climate and natural disaster risk data' })
  @ApiResponse({ status: 200, type: ClimateRiskResponseDto })
  async getClimateRisk(
    @Query() dto: LocationQueryDto,
  ): Promise<ClimateRiskResponseDto> {
    return this.neighborhoodService.getClimateRisk(dto);
  }

  /**
   * Get walkability data (PROD-158)
   */
  @Get('walkability')
  @ApiOperation({ summary: 'Get walking times to nearby amenities' })
  @ApiResponse({ status: 200, type: WalkabilityResponseDto })
  async getWalkability(
    @Query() dto: LocationQueryDto,
  ): Promise<WalkabilityResponseDto> {
    return this.neighborhoodService.getWalkability(dto);
  }

  /**
   * Get future development projects nearby (PROD-157)
   */
  @Get('developments')
  @ApiOperation({ summary: 'Get future development projects nearby' })
  @ApiResponse({ status: 200, type: FutureDevelopmentsResponseDto })
  async getFutureDevelopments(
    @Query() dto: LocationQueryDto,
  ): Promise<FutureDevelopmentsResponseDto> {
    return this.neighborhoodService.getFutureDevelopments(dto);
  }

  /**
   * Get complete neighborhood profile for a property
   */
  @Get('property/:propertyId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get complete neighborhood profile for a property' })
  @ApiResponse({ status: 200, type: PropertyNeighborhoodProfileDto })
  async getPropertyNeighborhoodProfile(
    @Param('propertyId') propertyId: string,
  ): Promise<PropertyNeighborhoodProfileDto> {
    return this.neighborhoodService.getPropertyNeighborhoodProfile(propertyId);
  }
}
