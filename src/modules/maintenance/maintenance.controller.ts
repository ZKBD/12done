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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { MaintenanceService } from './maintenance.service';
import { AiMaintenanceService } from './ai-maintenance.service';
import { JwtAuthGuard } from '@/modules/auth/guards';
import { CurrentUser, CurrentUserData } from '@/common/decorators';
import {
  CreateMaintenanceRequestDto,
  UpdateMaintenanceRequestDto,
  RejectRequestDto,
  AssignProviderDto,
  ScheduleRequestDto,
  CompleteRequestDto,
  MaintenanceQueryDto,
  MaintenanceRequestResponseDto,
  MaintenanceListResponseDto,
  AnalyzeMaintenanceRequestDto,
  GetAppointmentSuggestionsDto,
  AiMaintenanceAnalysisResponseDto,
  AiAppointmentSuggestionsResponseDto,
  AiRequestSuggestionsResponseDto,
} from './dto';

@ApiTags('maintenance-requests')
@Controller('maintenance-requests')
export class MaintenanceController {
  constructor(
    private readonly maintenanceService: MaintenanceService,
    private readonly aiMaintenanceService: AiMaintenanceService,
  ) {}

  // ============================================
  // AI ANALYSIS ENDPOINTS (PROD-107)
  // ============================================

  /**
   * Analyze maintenance request before submission (PROD-107.1, PROD-107.2, PROD-107.3)
   */
  @Post('analyze')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Analyze maintenance request (PROD-107.1, PROD-107.2, PROD-107.3)',
    description:
      'Get AI-powered analysis including category suggestion, priority scoring, and DIY solutions before submitting a request',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Analysis completed',
    type: AiMaintenanceAnalysisResponseDto,
  })
  async analyzeRequest(
    @Body() dto: AnalyzeMaintenanceRequestDto,
  ): Promise<AiMaintenanceAnalysisResponseDto> {
    return this.aiMaintenanceService.analyzeRequest(dto.title, dto.description);
  }

  /**
   * Get AI suggestions for an existing maintenance request (PROD-107)
   */
  @Get(':id/suggestions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get AI suggestions for request (PROD-107)',
    description:
      'Get AI-powered suggestions for an existing maintenance request including category, priority, solutions, and appointment recommendations',
  })
  @ApiParam({ name: 'id', description: 'Maintenance request UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'AI suggestions',
    type: AiRequestSuggestionsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Request not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized to view this request',
  })
  async getRequestSuggestions(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<AiRequestSuggestionsResponseDto> {
    // First verify user has access to this request
    await this.maintenanceService.findOne(id, user.id);
    return this.aiMaintenanceService.getRequestSuggestions(id);
  }

  /**
   * Get appointment suggestions (PROD-107.4)
   */
  @Post('appointment-suggestions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get appointment suggestions (PROD-107.4)',
    description:
      'Get optimal appointment time slots based on service provider availability',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Appointment suggestions',
    type: AiAppointmentSuggestionsResponseDto,
  })
  async getAppointmentSuggestions(
    @Body() dto: GetAppointmentSuggestionsDto,
  ): Promise<AiAppointmentSuggestionsResponseDto> {
    return this.aiMaintenanceService.suggestAppointments(
      dto.propertyId,
      dto.type,
    );
  }

  // ============================================
  // CRUD ENDPOINTS
  // ============================================

  /**
   * Create a new maintenance request (PROD-103.2)
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create maintenance request (PROD-103.2)',
    description: 'Submit a new maintenance request for a leased property (tenant only)',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Maintenance request created successfully',
    type: MaintenanceRequestResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request data or lease not active',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only tenant on the lease can create requests',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Lease not found',
  })
  async create(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateMaintenanceRequestDto,
  ): Promise<MaintenanceRequestResponseDto> {
    return this.maintenanceService.create(user.id, dto);
  }

  /**
   * Get all maintenance requests
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get maintenance requests',
    description: 'Get list of maintenance requests with filtering',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of maintenance requests',
    type: MaintenanceListResponseDto,
  })
  async findAll(
    @CurrentUser() user: CurrentUserData,
    @Query() query: MaintenanceQueryDto,
  ): Promise<MaintenanceListResponseDto> {
    return this.maintenanceService.findAll(user.id, query);
  }

  /**
   * Get a single maintenance request
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get maintenance request details',
    description: 'Get details of a specific maintenance request',
  })
  @ApiParam({ name: 'id', description: 'Maintenance request UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Maintenance request details',
    type: MaintenanceRequestResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Request not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized to view this request',
  })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<MaintenanceRequestResponseDto> {
    return this.maintenanceService.findOne(id, user.id);
  }

  /**
   * Update a maintenance request (tenant only, SUBMITTED status)
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update maintenance request',
    description: 'Update a submitted maintenance request (tenant only)',
  })
  @ApiParam({ name: 'id', description: 'Maintenance request UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Request updated',
    type: MaintenanceRequestResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Can only update SUBMITTED requests',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only tenant can update',
  })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: UpdateMaintenanceRequestDto,
  ): Promise<MaintenanceRequestResponseDto> {
    return this.maintenanceService.update(id, user.id, dto);
  }

  // ============================================
  // WORKFLOW ENDPOINTS
  // ============================================

  /**
   * Approve a maintenance request (PROD-103.5)
   */
  @Post(':id/approve')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Approve maintenance request (PROD-103.5)',
    description: 'Approve a submitted maintenance request (landlord only)',
  })
  @ApiParam({ name: 'id', description: 'Maintenance request UUID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Request approved',
    type: MaintenanceRequestResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Can only approve SUBMITTED requests',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only landlord can approve',
  })
  async approve(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<MaintenanceRequestResponseDto> {
    return this.maintenanceService.approve(id, user.id);
  }

  /**
   * Reject a maintenance request (PROD-103.5)
   */
  @Post(':id/reject')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Reject maintenance request (PROD-103.5)',
    description: 'Reject a submitted maintenance request with reason (landlord only)',
  })
  @ApiParam({ name: 'id', description: 'Maintenance request UUID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Request rejected',
    type: MaintenanceRequestResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Can only reject SUBMITTED requests',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only landlord can reject',
  })
  async reject(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: RejectRequestDto,
  ): Promise<MaintenanceRequestResponseDto> {
    return this.maintenanceService.reject(id, user.id, dto);
  }

  /**
   * Assign a service provider (PROD-103.6)
   */
  @Post(':id/assign')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Assign service provider (PROD-103.6)',
    description: 'Assign a service provider to an approved request (landlord only)',
  })
  @ApiParam({ name: 'id', description: 'Maintenance request UUID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Provider assigned',
    type: MaintenanceRequestResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Can only assign to APPROVED requests',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only landlord can assign providers',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Provider not found',
  })
  async assignProvider(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: AssignProviderDto,
  ): Promise<MaintenanceRequestResponseDto> {
    return this.maintenanceService.assignProvider(id, user.id, dto);
  }

  /**
   * Schedule maintenance work (PROD-103.7)
   */
  @Post(':id/schedule')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Schedule maintenance (PROD-103.7)',
    description: 'Schedule date and time for maintenance work (landlord or provider)',
  })
  @ApiParam({ name: 'id', description: 'Maintenance request UUID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Maintenance scheduled',
    type: MaintenanceRequestResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Can only schedule ASSIGNED requests',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only landlord or assigned provider can schedule',
  })
  async schedule(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: ScheduleRequestDto,
  ): Promise<MaintenanceRequestResponseDto> {
    return this.maintenanceService.schedule(id, user.id, dto);
  }

  /**
   * Start work on maintenance request
   */
  @Post(':id/start')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Start maintenance work',
    description: 'Mark maintenance work as started (assigned provider only)',
  })
  @ApiParam({ name: 'id', description: 'Maintenance request UUID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Work started',
    type: MaintenanceRequestResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Can only start SCHEDULED requests',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only assigned provider can start work',
  })
  async startWork(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<MaintenanceRequestResponseDto> {
    return this.maintenanceService.startWork(id, user.id);
  }

  /**
   * Complete maintenance work (PROD-103.8)
   */
  @Post(':id/complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Complete maintenance work (PROD-103.8)',
    description: 'Mark maintenance work as completed (assigned provider only)',
  })
  @ApiParam({ name: 'id', description: 'Maintenance request UUID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Work completed',
    type: MaintenanceRequestResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Can only complete IN_PROGRESS requests',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only assigned provider can complete work',
  })
  async complete(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CompleteRequestDto,
  ): Promise<MaintenanceRequestResponseDto> {
    return this.maintenanceService.complete(id, user.id, dto);
  }

  /**
   * Confirm completion (PROD-103.8)
   */
  @Post(':id/confirm')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Confirm completion (PROD-103.8)',
    description: 'Confirm that maintenance work is satisfactorily completed (tenant or landlord)',
  })
  @ApiParam({ name: 'id', description: 'Maintenance request UUID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Completion confirmed',
    type: MaintenanceRequestResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Can only confirm COMPLETED requests',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only tenant or landlord can confirm',
  })
  async confirmCompletion(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<MaintenanceRequestResponseDto> {
    return this.maintenanceService.confirmCompletion(id, user.id);
  }

  /**
   * Cancel a maintenance request
   */
  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cancel maintenance request',
    description: 'Cancel a maintenance request (tenant for SUBMITTED, landlord for others)',
  })
  @ApiParam({ name: 'id', description: 'Maintenance request UUID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Request cancelled',
    type: MaintenanceRequestResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot cancel requests in this status',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized to cancel',
  })
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<MaintenanceRequestResponseDto> {
    return this.maintenanceService.cancel(id, user.id);
  }
}
