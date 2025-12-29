import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ApplicationsService } from './applications.service';
import { JwtAuthGuard } from '@/modules/auth/guards';
import { CurrentUser, CurrentUserData } from '@/common/decorators';
import {
  CreateApplicationDto,
  ReviewApplicationDto,
  ApplicationQueryDto,
  ApplicationResponseDto,
  ApplicationListResponseDto,
} from './dto';

@ApiTags('applications')
@Controller()
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  // ============================================
  // APPLICANT ENDPOINTS
  // ============================================

  /**
   * Submit a rental application for a property (PROD-101.3)
   */
  @Post('properties/:propertyId/apply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Submit rental application (PROD-101.3)',
    description: 'Submit a rental application for a property',
  })
  @ApiParam({
    name: 'propertyId',
    description: 'Property UUID',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Application submitted successfully',
    type: ApplicationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Property is not available for rent',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Cannot apply to own property',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Property not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Already applied for this property',
  })
  async createApplication(
    @Param('propertyId') propertyId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateApplicationDto,
  ): Promise<ApplicationResponseDto> {
    return this.applicationsService.create(propertyId, user.id, dto);
  }

  /**
   * Get current user's applications (PROD-101.4)
   */
  @Get('applications')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get my applications (PROD-101.4)',
    description: 'Get list of rental applications submitted by the current user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of applications',
    type: ApplicationListResponseDto,
  })
  async getMyApplications(
    @CurrentUser() user: CurrentUserData,
    @Query() query: ApplicationQueryDto,
  ): Promise<ApplicationListResponseDto> {
    return this.applicationsService.getMyApplications(user.id, query);
  }

  /**
   * Get single application details
   */
  @Get('applications/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get application details',
    description:
      'Get details of a specific application (accessible by applicant or property owner)',
  })
  @ApiParam({
    name: 'id',
    description: 'Application UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Application details',
    type: ApplicationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Application not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized to view this application',
  })
  async getApplication(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<ApplicationResponseDto> {
    return this.applicationsService.getById(id, user.id);
  }

  /**
   * Withdraw application (applicant only)
   */
  @Patch('applications/:id/withdraw')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Withdraw application',
    description: 'Withdraw a pending or under-review application',
  })
  @ApiParam({
    name: 'id',
    description: 'Application UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Application withdrawn',
    type: ApplicationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot withdraw application with current status',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Application not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized to withdraw this application',
  })
  async withdrawApplication(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<ApplicationResponseDto> {
    return this.applicationsService.withdraw(id, user.id);
  }

  // ============================================
  // PROPERTY OWNER ENDPOINTS
  // ============================================

  /**
   * Get applications for a property (owner only)
   */
  @Get('properties/:propertyId/applications')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get property applications (owner)',
    description: 'Get all applications for a property (property owner only)',
  })
  @ApiParam({
    name: 'propertyId',
    description: 'Property UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of applications',
    type: ApplicationListResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Property not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized to view applications for this property',
  })
  async getPropertyApplications(
    @Param('propertyId') propertyId: string,
    @CurrentUser() user: CurrentUserData,
    @Query() query: ApplicationQueryDto,
  ): Promise<ApplicationListResponseDto> {
    return this.applicationsService.getPropertyApplications(
      propertyId,
      user.id,
      query,
    );
  }

  /**
   * Review application (owner only) - PROD-101.5
   */
  @Patch('applications/:id/review')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Review application (PROD-101.5)',
    description:
      'Update application status (property owner only). Can set to UNDER_REVIEW, APPROVED, or REJECTED.',
  })
  @ApiParam({
    name: 'id',
    description: 'Application UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Application updated',
    type: ApplicationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid status transition or cannot review withdrawn application',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Application not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized to review this application',
  })
  async reviewApplication(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: ReviewApplicationDto,
  ): Promise<ApplicationResponseDto> {
    return this.applicationsService.review(id, user.id, dto);
  }
}
