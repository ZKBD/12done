import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
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
  ApiQuery,
} from '@nestjs/swagger';
import { ServiceProvidersService } from './service-providers.service';
import { JwtAuthGuard } from '@/modules/auth/guards';
import { RolesGuard } from '@/common/guards';
import { CurrentUser, CurrentUserData, Roles } from '@/common/decorators';
import { UserRole } from '@prisma/client';
import {
  CreateServiceProviderDto,
  UpdateServiceProviderDto,
  SetWeeklyAvailabilityDto,
  CreateAvailabilityExceptionDto,
  CreateServiceRequestDto,
  RespondToRequestDto,
  CompleteRequestDto,
  ServiceProviderQueryDto,
  ServiceRequestQueryDto,
  AdminReviewDto,
  AdminProviderQueryDto,
  ServiceProviderResponseDto,
  ServiceProviderListResponseDto,
  ServiceRequestResponseDto,
  ServiceRequestListResponseDto,
  CreateReviewDto,
  UpdateReviewDto,
  ReviewQueryDto,
  ReviewResponseDto,
  ReviewListResponseDto,
} from './dto/service-provider.dto';
import { ServiceType } from '@prisma/client';

@ApiTags('service-providers')
@Controller('service-providers')
export class ServiceProvidersController {
  constructor(private readonly serviceProvidersService: ServiceProvidersService) {}

  // ============================================
  // PROVIDER APPLICATION & PROFILE (PROD-060, PROD-061)
  // ============================================

  @Post('apply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Apply to become a service provider (PROD-060.1)',
    description: 'Submit an application to become a service provider',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Application submitted successfully',
    type: ServiceProviderResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Already applied for this service type',
  })
  async apply(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateServiceProviderDto,
  ): Promise<ServiceProviderResponseDto> {
    return this.serviceProvidersService.apply(user.id, dto);
  }

  @Get('my-profiles')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get my provider profiles',
    description: 'Retrieve all service provider profiles for current user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profiles retrieved successfully',
    type: [ServiceProviderResponseDto],
  })
  async getMyProfiles(
    @CurrentUser() user: CurrentUserData,
  ): Promise<ServiceProviderResponseDto[]> {
    return this.serviceProvidersService.getMyProfiles(user.id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get provider profile (PROD-067)',
    description: 'Retrieve a service provider profile by ID',
  })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profile retrieved successfully',
    type: ServiceProviderResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Provider not found',
  })
  async getProfile(
    @Param('id') id: string,
  ): Promise<ServiceProviderResponseDto> {
    return this.serviceProvidersService.getProfile(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update provider profile (PROD-061)',
    description: 'Update service provider profile information',
  })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profile updated successfully',
    type: ServiceProviderResponseDto,
  })
  async updateProfile(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: UpdateServiceProviderDto,
  ): Promise<ServiceProviderResponseDto> {
    return this.serviceProvidersService.updateProfile(id, user.id, dto);
  }

  @Post(':id/deactivate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Deactivate provider profile',
    description: 'Deactivate a service provider profile',
  })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profile deactivated successfully',
    type: ServiceProviderResponseDto,
  })
  async deactivate(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<ServiceProviderResponseDto> {
    return this.serviceProvidersService.deactivate(id, user.id);
  }

  // ============================================
  // AVAILABILITY (PROD-062)
  // ============================================

  @Put(':id/availability')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Set weekly availability (PROD-062.1)',
    description: 'Configure weekly availability schedule',
  })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Availability updated successfully',
  })
  async setWeeklyAvailability(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: SetWeeklyAvailabilityDto,
  ): Promise<void> {
    return this.serviceProvidersService.setWeeklyAvailability(id, user.id, dto);
  }

  @Get(':id/availability')
  @ApiOperation({
    summary: 'Get weekly availability',
    description: 'Retrieve provider weekly availability schedule',
  })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Availability retrieved successfully',
  })
  async getWeeklyAvailability(@Param('id') id: string) {
    return this.serviceProvidersService.getWeeklyAvailability(id);
  }

  @Post(':id/availability/exceptions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Add availability exception (PROD-062.3)',
    description: 'Add a date exception to availability',
  })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Exception added successfully',
  })
  async addException(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateAvailabilityExceptionDto,
  ) {
    return this.serviceProvidersService.addException(id, user.id, dto);
  }

  @Get(':id/availability/exceptions')
  @ApiOperation({
    summary: 'Get availability exceptions',
    description: 'Retrieve provider availability exceptions',
  })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Exceptions retrieved successfully',
  })
  async getExceptions(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.serviceProvidersService.getExceptions(id, startDate, endDate);
  }

  @Delete('availability/exceptions/:exceptionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete availability exception',
    description: 'Remove an availability exception',
  })
  @ApiParam({ name: 'exceptionId', description: 'Exception ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Exception deleted successfully',
  })
  async deleteException(
    @Param('exceptionId') exceptionId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<void> {
    return this.serviceProvidersService.deleteException(exceptionId, user.id);
  }

  @Get(':id/availability/check')
  @ApiOperation({
    summary: 'Check availability (PROD-062.4)',
    description: 'Check if provider is available on a specific date',
  })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  @ApiQuery({ name: 'date', required: true, description: 'Date to check (YYYY-MM-DD)' })
  @ApiQuery({ name: 'timeSlot', required: false, description: 'Time slot (HH:mm-HH:mm)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Availability check result',
  })
  async checkAvailability(
    @Param('id') id: string,
    @Query('date') date: string,
    @Query('timeSlot') timeSlot?: string,
  ) {
    return this.serviceProvidersService.checkAvailability(id, date, timeSlot);
  }

  // ============================================
  // SEARCH (PROD-065)
  // ============================================

  @Get()
  @ApiOperation({
    summary: 'Search service providers (PROD-065)',
    description: 'Search for approved service providers',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Search results retrieved successfully',
    type: ServiceProviderListResponseDto,
  })
  async search(
    @Query() query: ServiceProviderQueryDto,
  ): Promise<ServiceProviderListResponseDto> {
    return this.serviceProvidersService.search(query);
  }

  @Get('match')
  @ApiOperation({
    summary: 'Find matching providers (PROD-063.2)',
    description: 'Find providers matching specific criteria',
  })
  @ApiQuery({ name: 'serviceType', enum: ServiceType, required: true })
  @ApiQuery({ name: 'city', required: false })
  @ApiQuery({ name: 'country', required: false })
  @ApiQuery({ name: 'preferredDate', required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Matching providers retrieved',
    type: [ServiceProviderResponseDto],
  })
  async findMatchingProviders(
    @Query('serviceType') serviceType: ServiceType,
    @Query('city') city?: string,
    @Query('country') country?: string,
    @Query('preferredDate') preferredDate?: string,
  ): Promise<ServiceProviderResponseDto[]> {
    return this.serviceProvidersService.findMatchingProviders(
      serviceType,
      city,
      country,
      preferredDate,
    );
  }

  // ============================================
  // SERVICE REQUESTS (PROD-063, PROD-064)
  // ============================================

  @Post('requests')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create service request (PROD-063.1)',
    description: 'Create a new service request',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Request created successfully',
    type: ServiceRequestResponseDto,
  })
  async createRequest(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateServiceRequestDto,
  ): Promise<ServiceRequestResponseDto> {
    return this.serviceProvidersService.createRequest(user.id, dto);
  }

  @Get('requests/my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get my service requests',
    description: 'Retrieve service requests made by current user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Requests retrieved successfully',
    type: ServiceRequestListResponseDto,
  })
  async getMyRequests(
    @CurrentUser() user: CurrentUserData,
    @Query() query: ServiceRequestQueryDto,
  ): Promise<ServiceRequestListResponseDto> {
    return this.serviceProvidersService.getMyRequests(user.id, query);
  }

  @Get(':id/requests')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get received requests',
    description: 'Retrieve service requests received by provider',
  })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Requests retrieved successfully',
    type: ServiceRequestListResponseDto,
  })
  async getReceivedRequests(
    @Param('id') providerId: string,
    @CurrentUser() user: CurrentUserData,
    @Query() query: ServiceRequestQueryDto,
  ): Promise<ServiceRequestListResponseDto> {
    return this.serviceProvidersService.getReceivedRequests(providerId, user.id, query);
  }

  @Get('requests/:requestId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get service request',
    description: 'Retrieve a specific service request',
  })
  @ApiParam({ name: 'requestId', description: 'Request ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Request retrieved successfully',
    type: ServiceRequestResponseDto,
  })
  async getRequest(
    @Param('requestId') requestId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<ServiceRequestResponseDto> {
    return this.serviceProvidersService.getRequest(requestId, user.id);
  }

  @Post('requests/:requestId/respond')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Respond to service request (PROD-064.2)',
    description: 'Accept or reject a service request',
  })
  @ApiParam({ name: 'requestId', description: 'Request ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Response recorded successfully',
    type: ServiceRequestResponseDto,
  })
  async respondToRequest(
    @Param('requestId') requestId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: RespondToRequestDto,
  ): Promise<ServiceRequestResponseDto> {
    return this.serviceProvidersService.respondToRequest(requestId, user.id, dto);
  }

  @Post('requests/:requestId/start')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Start service request (PROD-064.3)',
    description: 'Mark service request as in progress',
  })
  @ApiParam({ name: 'requestId', description: 'Request ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Request started successfully',
    type: ServiceRequestResponseDto,
  })
  async startRequest(
    @Param('requestId') requestId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<ServiceRequestResponseDto> {
    return this.serviceProvidersService.startRequest(requestId, user.id);
  }

  @Post('requests/:requestId/complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Complete service request (PROD-064.4)',
    description: 'Mark service request as completed',
  })
  @ApiParam({ name: 'requestId', description: 'Request ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Request completed successfully',
    type: ServiceRequestResponseDto,
  })
  async completeRequest(
    @Param('requestId') requestId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CompleteRequestDto,
  ): Promise<ServiceRequestResponseDto> {
    return this.serviceProvidersService.completeRequest(requestId, user.id, dto);
  }

  @Post('requests/:requestId/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel service request (PROD-064.5)',
    description: 'Cancel a service request',
  })
  @ApiParam({ name: 'requestId', description: 'Request ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Request cancelled successfully',
    type: ServiceRequestResponseDto,
  })
  async cancelRequest(
    @Param('requestId') requestId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<ServiceRequestResponseDto> {
    return this.serviceProvidersService.cancelRequest(requestId, user.id);
  }

  // ============================================
  // ADMIN ENDPOINTS (PROD-066)
  // ============================================

  @Get('admin/list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Admin: List providers (PROD-066.1)',
    description: 'List all service providers for admin review',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Providers retrieved successfully',
    type: ServiceProviderListResponseDto,
  })
  async adminList(
    @Query() query: AdminProviderQueryDto,
  ): Promise<ServiceProviderListResponseDto> {
    return this.serviceProvidersService.adminList(query);
  }

  @Post('admin/:id/review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin: Review provider (PROD-066.2)',
    description: 'Approve or reject a provider application',
  })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Review recorded successfully',
    type: ServiceProviderResponseDto,
  })
  async adminReview(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: AdminReviewDto,
  ): Promise<ServiceProviderResponseDto> {
    return this.serviceProvidersService.adminReview(id, user.id, dto);
  }

  @Post('admin/:id/suspend')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin: Suspend provider (PROD-066.3)',
    description: 'Suspend a service provider',
  })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Provider suspended successfully',
    type: ServiceProviderResponseDto,
  })
  async adminSuspend(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() body: { reason: string },
  ): Promise<ServiceProviderResponseDto> {
    return this.serviceProvidersService.adminSuspend(id, user.id, body.reason);
  }

  // ============================================
  // REVIEWS (PROD-068)
  // ============================================

  @Post('reviews')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a review (PROD-068.1)',
    description: 'Create a review for a completed service request',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Review created successfully',
    type: ReviewResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Review already exists for this request',
  })
  async createReview(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateReviewDto,
  ): Promise<ReviewResponseDto> {
    return this.serviceProvidersService.createReview(user.id, dto);
  }

  @Get('reviews/my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get my reviews',
    description: 'Retrieve reviews written by current user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reviews retrieved successfully',
    type: ReviewListResponseDto,
  })
  async getMyReviews(
    @CurrentUser() user: CurrentUserData,
    @Query() query: ReviewQueryDto,
  ): Promise<ReviewListResponseDto> {
    return this.serviceProvidersService.getMyReviews(user.id, query);
  }

  @Get(':id/reviews')
  @ApiOperation({
    summary: 'Get provider reviews (PROD-068.3)',
    description: 'Retrieve public reviews for a provider',
  })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reviews retrieved successfully',
    type: ReviewListResponseDto,
  })
  async getProviderReviews(
    @Param('id') providerId: string,
    @Query() query: ReviewQueryDto,
  ): Promise<ReviewListResponseDto> {
    return this.serviceProvidersService.getProviderReviews(providerId, query);
  }

  @Get('reviews/:reviewId')
  @ApiOperation({
    summary: 'Get a review',
    description: 'Retrieve a specific review',
  })
  @ApiParam({ name: 'reviewId', description: 'Review ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Review retrieved successfully',
    type: ReviewResponseDto,
  })
  async getReview(
    @Param('reviewId') reviewId: string,
  ): Promise<ReviewResponseDto> {
    return this.serviceProvidersService.getReview(reviewId);
  }

  @Put('reviews/:reviewId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a review (PROD-068.2)',
    description: 'Update your own review',
  })
  @ApiParam({ name: 'reviewId', description: 'Review ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Review updated successfully',
    type: ReviewResponseDto,
  })
  async updateReview(
    @Param('reviewId') reviewId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: UpdateReviewDto,
  ): Promise<ReviewResponseDto> {
    return this.serviceProvidersService.updateReview(reviewId, user.id, dto);
  }

  @Delete('reviews/:reviewId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a review',
    description: 'Delete your own review',
  })
  @ApiParam({ name: 'reviewId', description: 'Review ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Review deleted successfully',
  })
  async deleteReview(
    @Param('reviewId') reviewId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<void> {
    return this.serviceProvidersService.deleteReview(reviewId, user.id);
  }

  @Post('reviews/:reviewId/helpful')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark review as helpful (PROD-068.5)',
    description: 'Increment the helpful count for a review',
  })
  @ApiParam({ name: 'reviewId', description: 'Review ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Review marked as helpful',
    type: ReviewResponseDto,
  })
  async markReviewHelpful(
    @Param('reviewId') reviewId: string,
  ): Promise<ReviewResponseDto> {
    return this.serviceProvidersService.markReviewHelpful(reviewId);
  }
}
