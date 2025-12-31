import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  SessionService,
  TripPlanService,
  AttractionService,
  CateringService,
} from './services';
import {
  CreateSessionDto,
  UpdateWizardStepDto,
  SelectProposalDto,
  SessionResponseDto,
  ProposalResponseDto,
  CreateTripPlanDto,
  UpdateTripPlanDto,
  CreateTripDayDto,
  UpdateTripDayDto,
  CreateActivityDto,
  UpdateActivityDto,
  TripPlanResponseDto,
  TripDayResponseDto,
  TripActivityResponseDto,
  TripPlanStatus,
  SearchAttractionsDto,
  CreateAttractionDto,
  UpdateAttractionDto,
  AttractionResponseDto,
  CreateBookingDto,
  UpdateBookingDto,
  BookingResponseDto,
  AttractionBookingStatus,
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
} from './dto';

@ApiTags('Stay Planning')
@ApiBearerAuth()
@Controller('stay-planning')
export class StayPlanningController {
  constructor(
    private readonly sessionService: SessionService,
    private readonly tripPlanService: TripPlanService,
    private readonly attractionService: AttractionService,
    private readonly cateringService: CateringService,
  ) {}

  // ============================================
  // SESSION ENDPOINTS (PROD-140)
  // ============================================

  @Post('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new planning session' })
  @ApiResponse({ status: 201, type: SessionResponseDto })
  async createSession(
    @Request() req: any,
    @Body() dto: CreateSessionDto,
  ): Promise<SessionResponseDto> {
    return this.sessionService.createSession(req.user.id, dto);
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get user sessions' })
  @ApiQuery({ name: 'completed', required: false, type: Boolean })
  @ApiQuery({ name: 'propertyId', required: false })
  @ApiResponse({ status: 200, type: [SessionResponseDto] })
  async getUserSessions(
    @Request() req: any,
    @Query('completed') completed?: string,
    @Query('propertyId') propertyId?: string,
  ): Promise<SessionResponseDto[]> {
    return this.sessionService.getUserSessions(req.user.id, {
      completed: completed === 'true' ? true : completed === 'false' ? false : undefined,
      propertyId,
    });
  }

  @Get('sessions/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get session by ID' })
  @ApiResponse({ status: 200, type: SessionResponseDto })
  async getSession(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SessionResponseDto> {
    return this.sessionService.getSession(req.user.id, id);
  }

  @Patch('sessions/:id/wizard')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update wizard step answers' })
  @ApiResponse({ status: 200, type: SessionResponseDto })
  async updateWizardStep(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWizardStepDto,
  ): Promise<SessionResponseDto> {
    return this.sessionService.updateWizardStep(req.user.id, id, dto);
  }

  @Post('sessions/:id/proposals')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Generate AI proposals' })
  @ApiResponse({ status: 201, type: [ProposalResponseDto] })
  async generateProposals(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProposalResponseDto[]> {
    return this.sessionService.generateProposals(req.user.id, id);
  }

  @Post('sessions/:id/select-proposal')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Select a proposal' })
  @ApiResponse({ status: 200, type: SessionResponseDto })
  async selectProposal(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SelectProposalDto,
  ): Promise<SessionResponseDto> {
    return this.sessionService.selectProposal(req.user.id, id, dto);
  }

  @Post('sessions/:id/complete')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Complete a session' })
  @ApiResponse({ status: 200, type: SessionResponseDto })
  async completeSession(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SessionResponseDto> {
    return this.sessionService.completeSession(req.user.id, id);
  }

  @Delete('sessions/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a session' })
  @ApiResponse({ status: 204 })
  async deleteSession(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.sessionService.deleteSession(req.user.id, id);
  }

  // ============================================
  // TRIP PLAN ENDPOINTS (PROD-141)
  // ============================================

  @Post('trip-plans')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a trip plan' })
  @ApiResponse({ status: 201, type: TripPlanResponseDto })
  async createTripPlan(
    @Request() req: any,
    @Body() dto: CreateTripPlanDto,
  ): Promise<TripPlanResponseDto> {
    return this.tripPlanService.createTripPlan(req.user.id, dto);
  }

  @Get('trip-plans')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get user trip plans' })
  @ApiQuery({ name: 'propertyId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: TripPlanStatus })
  @ApiQuery({ name: 'upcoming', required: false, type: Boolean })
  @ApiResponse({ status: 200, type: [TripPlanResponseDto] })
  async getUserTripPlans(
    @Request() req: any,
    @Query('propertyId') propertyId?: string,
    @Query('status') status?: TripPlanStatus,
    @Query('upcoming') upcoming?: string,
  ): Promise<TripPlanResponseDto[]> {
    return this.tripPlanService.getUserTripPlans(req.user.id, {
      propertyId,
      status,
      upcoming: upcoming === 'true',
    });
  }

  @Get('trip-plans/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get trip plan by ID' })
  @ApiResponse({ status: 200, type: TripPlanResponseDto })
  async getTripPlan(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TripPlanResponseDto> {
    return this.tripPlanService.getTripPlan(req.user.id, id);
  }

  @Patch('trip-plans/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update trip plan' })
  @ApiResponse({ status: 200, type: TripPlanResponseDto })
  async updateTripPlan(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTripPlanDto,
  ): Promise<TripPlanResponseDto> {
    return this.tripPlanService.updateTripPlan(req.user.id, id, dto);
  }

  @Delete('trip-plans/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete trip plan' })
  @ApiResponse({ status: 204 })
  async deleteTripPlan(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.tripPlanService.deleteTripPlan(req.user.id, id);
  }

  @Get('trip-plans/:id/stats')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get trip plan statistics' })
  @ApiResponse({ status: 200 })
  async getTripPlanStats(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tripPlanService.getTripPlanStats(req.user.id, id);
  }

  // Trip Days
  @Post('trip-plans/:tripPlanId/days')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Add day to trip plan' })
  @ApiResponse({ status: 201, type: TripDayResponseDto })
  async addDay(
    @Request() req: any,
    @Param('tripPlanId', ParseUUIDPipe) tripPlanId: string,
    @Body() dto: CreateTripDayDto,
  ): Promise<TripDayResponseDto> {
    return this.tripPlanService.addDay(req.user.id, tripPlanId, dto);
  }

  @Patch('days/:dayId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update day' })
  @ApiResponse({ status: 200, type: TripDayResponseDto })
  async updateDay(
    @Request() req: any,
    @Param('dayId', ParseUUIDPipe) dayId: string,
    @Body() dto: UpdateTripDayDto,
  ): Promise<TripDayResponseDto> {
    return this.tripPlanService.updateDay(req.user.id, dayId, dto);
  }

  @Delete('days/:dayId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete day' })
  @ApiResponse({ status: 204 })
  async deleteDay(
    @Request() req: any,
    @Param('dayId', ParseUUIDPipe) dayId: string,
  ): Promise<void> {
    return this.tripPlanService.deleteDay(req.user.id, dayId);
  }

  // Activities
  @Post('days/:dayId/activities')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Add activity to day' })
  @ApiResponse({ status: 201, type: TripActivityResponseDto })
  async addActivity(
    @Request() req: any,
    @Param('dayId', ParseUUIDPipe) dayId: string,
    @Body() dto: CreateActivityDto,
  ): Promise<TripActivityResponseDto> {
    return this.tripPlanService.addActivity(req.user.id, dayId, dto);
  }

  @Patch('activities/:activityId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update activity' })
  @ApiResponse({ status: 200, type: TripActivityResponseDto })
  async updateActivity(
    @Request() req: any,
    @Param('activityId', ParseUUIDPipe) activityId: string,
    @Body() dto: UpdateActivityDto,
  ): Promise<TripActivityResponseDto> {
    return this.tripPlanService.updateActivity(req.user.id, activityId, dto);
  }

  @Delete('activities/:activityId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete activity' })
  @ApiResponse({ status: 204 })
  async deleteActivity(
    @Request() req: any,
    @Param('activityId', ParseUUIDPipe) activityId: string,
  ): Promise<void> {
    return this.tripPlanService.deleteActivity(req.user.id, activityId);
  }

  @Put('days/:dayId/activities/reorder')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Reorder activities in a day' })
  @ApiResponse({ status: 200, type: TripDayResponseDto })
  async reorderActivities(
    @Request() req: any,
    @Param('dayId', ParseUUIDPipe) dayId: string,
    @Body() body: { activityIds: string[] },
  ): Promise<TripDayResponseDto> {
    return this.tripPlanService.reorderActivities(
      req.user.id,
      dayId,
      body.activityIds,
    );
  }

  // ============================================
  // ATTRACTION ENDPOINTS (PROD-142)
  // ============================================

  @Get('attractions')
  @ApiOperation({ summary: 'Search attractions' })
  @ApiResponse({ status: 200 })
  async searchAttractions(
    @Query() dto: SearchAttractionsDto,
  ): Promise<{ attractions: AttractionResponseDto[]; total: number }> {
    return this.attractionService.searchAttractions(dto);
  }

  @Get('attractions/:id')
  @ApiOperation({ summary: 'Get attraction by ID' })
  @ApiResponse({ status: 200, type: AttractionResponseDto })
  async getAttraction(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AttractionResponseDto> {
    return this.attractionService.getAttraction(id);
  }

  @Get('attractions/category/:category')
  @ApiOperation({ summary: 'Get attractions by category' })
  @ApiQuery({ name: 'city', required: false })
  @ApiQuery({ name: 'country', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, type: [AttractionResponseDto] })
  async getAttractionsByCategory(
    @Param('category') category: string,
    @Query('city') city?: string,
    @Query('country') country?: string,
    @Query('limit') limit?: string,
  ): Promise<AttractionResponseDto[]> {
    return this.attractionService.getAttractionsByCategory(category, {
      city,
      country,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('attractions/:id/time-slots')
  @ApiOperation({ summary: 'Get available time slots for attraction' })
  @ApiQuery({ name: 'date', required: true })
  @ApiResponse({ status: 200, type: [String] })
  async getAvailableTimeSlots(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('date') date: string,
  ): Promise<string[]> {
    return this.attractionService.getAvailableTimeSlots(id, date);
  }

  @Post('attractions')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create attraction (admin)' })
  @ApiResponse({ status: 201, type: AttractionResponseDto })
  async createAttraction(
    @Body() dto: CreateAttractionDto,
  ): Promise<AttractionResponseDto> {
    return this.attractionService.createAttraction(dto);
  }

  @Patch('attractions/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update attraction (admin)' })
  @ApiResponse({ status: 200, type: AttractionResponseDto })
  async updateAttraction(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAttractionDto,
  ): Promise<AttractionResponseDto> {
    return this.attractionService.updateAttraction(id, dto);
  }

  // ============================================
  // BOOKING ENDPOINTS (PROD-143)
  // ============================================

  @Post('bookings')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create attraction booking' })
  @ApiResponse({ status: 201, type: BookingResponseDto })
  async createBooking(
    @Request() req: any,
    @Body() dto: CreateBookingDto,
  ): Promise<BookingResponseDto> {
    return this.attractionService.createBooking(req.user.id, dto);
  }

  @Get('bookings')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get user bookings' })
  @ApiQuery({ name: 'status', required: false, enum: AttractionBookingStatus })
  @ApiQuery({ name: 'upcoming', required: false, type: Boolean })
  @ApiResponse({ status: 200, type: [BookingResponseDto] })
  async getUserBookings(
    @Request() req: any,
    @Query('status') status?: AttractionBookingStatus,
    @Query('upcoming') upcoming?: string,
  ): Promise<BookingResponseDto[]> {
    return this.attractionService.getUserBookings(req.user.id, {
      status,
      upcoming: upcoming === 'true',
    });
  }

  @Get('bookings/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get booking by ID' })
  @ApiResponse({ status: 200, type: BookingResponseDto })
  async getBooking(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BookingResponseDto> {
    return this.attractionService.getBooking(req.user.id, id);
  }

  @Patch('bookings/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update booking' })
  @ApiResponse({ status: 200, type: BookingResponseDto })
  async updateBooking(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBookingDto,
  ): Promise<BookingResponseDto> {
    return this.attractionService.updateBooking(req.user.id, id, dto);
  }

  @Post('bookings/:id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cancel booking' })
  @ApiResponse({ status: 200, type: BookingResponseDto })
  async cancelBooking(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason?: string },
  ): Promise<BookingResponseDto> {
    return this.attractionService.cancelBooking(req.user.id, id, body.reason);
  }

  // ============================================
  // CATERING PROVIDER ENDPOINTS (PROD-144)
  // ============================================

  @Get('catering/providers')
  @ApiOperation({ summary: 'Search catering providers' })
  @ApiResponse({ status: 200 })
  async searchCateringProviders(
    @Query() dto: SearchCateringProvidersDto,
  ): Promise<{ providers: CateringProviderResponseDto[]; total: number }> {
    return this.cateringService.searchProviders(dto);
  }

  @Get('catering/providers/:id')
  @ApiOperation({ summary: 'Get catering provider by ID' })
  @ApiResponse({ status: 200, type: CateringProviderResponseDto })
  async getCateringProvider(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CateringProviderResponseDto> {
    return this.cateringService.getProvider(id);
  }

  @Post('catering/providers')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create catering provider' })
  @ApiResponse({ status: 201, type: CateringProviderResponseDto })
  async createCateringProvider(
    @Body() dto: CreateCateringProviderDto,
  ): Promise<CateringProviderResponseDto> {
    return this.cateringService.createProvider(dto);
  }

  @Patch('catering/providers/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update catering provider' })
  @ApiResponse({ status: 200, type: CateringProviderResponseDto })
  async updateCateringProvider(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCateringProviderDto,
  ): Promise<CateringProviderResponseDto> {
    return this.cateringService.updateProvider(id, dto);
  }

  // Menus
  @Get('catering/providers/:providerId/menus')
  @ApiOperation({ summary: 'Get provider menus' })
  @ApiResponse({ status: 200, type: [CateringMenuResponseDto] })
  async getProviderMenus(
    @Param('providerId', ParseUUIDPipe) providerId: string,
  ): Promise<CateringMenuResponseDto[]> {
    return this.cateringService.getProviderMenus(providerId);
  }

  @Post('catering/providers/:providerId/menus')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create menu for provider' })
  @ApiResponse({ status: 201, type: CateringMenuResponseDto })
  async createMenu(
    @Param('providerId', ParseUUIDPipe) providerId: string,
    @Body() dto: CreateCateringMenuDto,
  ): Promise<CateringMenuResponseDto> {
    return this.cateringService.createMenu(providerId, dto);
  }

  @Patch('catering/menus/:menuId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update menu' })
  @ApiResponse({ status: 200, type: CateringMenuResponseDto })
  async updateMenu(
    @Param('menuId', ParseUUIDPipe) menuId: string,
    @Body() dto: UpdateCateringMenuDto,
  ): Promise<CateringMenuResponseDto> {
    return this.cateringService.updateMenu(menuId, dto);
  }

  @Delete('catering/menus/:menuId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete menu' })
  @ApiResponse({ status: 204 })
  async deleteMenu(
    @Param('menuId', ParseUUIDPipe) menuId: string,
  ): Promise<void> {
    return this.cateringService.deleteMenu(menuId);
  }

  // ============================================
  // CATERING QUOTE ENDPOINTS (PROD-144)
  // ============================================

  @Post('catering/quotes')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Request a catering quote' })
  @ApiResponse({ status: 201, type: CateringQuoteResponseDto })
  async requestQuote(
    @Request() req: any,
    @Body() dto: RequestCateringQuoteDto,
  ): Promise<CateringQuoteResponseDto> {
    return this.cateringService.requestQuote(req.user.id, dto);
  }

  @Get('catering/quotes')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get user quotes' })
  @ApiQuery({ name: 'status', required: false, enum: CateringQuoteStatus })
  @ApiQuery({ name: 'providerId', required: false })
  @ApiResponse({ status: 200, type: [CateringQuoteResponseDto] })
  async getUserQuotes(
    @Request() req: any,
    @Query('status') status?: CateringQuoteStatus,
    @Query('providerId') providerId?: string,
  ): Promise<CateringQuoteResponseDto[]> {
    return this.cateringService.getUserQuotes(req.user.id, {
      status,
      providerId,
    });
  }

  @Get('catering/quotes/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get quote by ID' })
  @ApiResponse({ status: 200, type: CateringQuoteResponseDto })
  async getQuote(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CateringQuoteResponseDto> {
    return this.cateringService.getQuote(req.user.id, id);
  }

  @Get('catering/providers/:providerId/quotes')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get quotes for provider (provider view)' })
  @ApiQuery({ name: 'status', required: false, enum: CateringQuoteStatus })
  @ApiResponse({ status: 200, type: [CateringQuoteResponseDto] })
  async getProviderQuotes(
    @Param('providerId', ParseUUIDPipe) providerId: string,
    @Query('status') status?: CateringQuoteStatus,
  ): Promise<CateringQuoteResponseDto[]> {
    return this.cateringService.getProviderQuotes(providerId, { status });
  }

  @Post('catering/quotes/:id/respond')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Respond to quote (provider)' })
  @ApiResponse({ status: 200, type: CateringQuoteResponseDto })
  async respondToQuote(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RespondToQuoteDto,
    @Query('providerId', ParseUUIDPipe) providerId: string,
  ): Promise<CateringQuoteResponseDto> {
    return this.cateringService.respondToQuote(providerId, id, dto);
  }

  @Post('catering/quotes/:id/accept')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Accept quote' })
  @ApiResponse({ status: 200, type: CateringQuoteResponseDto })
  async acceptQuote(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CateringQuoteResponseDto> {
    return this.cateringService.acceptQuote(req.user.id, id);
  }

  @Post('catering/quotes/:id/reject')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Reject quote' })
  @ApiResponse({ status: 200, type: CateringQuoteResponseDto })
  async rejectQuote(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason?: string },
  ): Promise<CateringQuoteResponseDto> {
    return this.cateringService.rejectQuote(req.user.id, id, body.reason);
  }

  @Post('catering/quotes/:id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cancel quote request' })
  @ApiResponse({ status: 200, type: CateringQuoteResponseDto })
  async cancelQuote(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CateringQuoteResponseDto> {
    return this.cateringService.cancelQuote(req.user.id, id);
  }
}
