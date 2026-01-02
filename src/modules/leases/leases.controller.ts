import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  Ip,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { LeasesService } from './leases.service';
import { LeaseRenewalService } from './lease-renewal.service';
import { JwtAuthGuard } from '@/modules/auth/guards';
import { CurrentUser, CurrentUserData } from '@/common/decorators';
import {
  CreateLeaseDto,
  UpdateLeaseDto,
  LeaseQueryDto,
  RecordPaymentDto,
  WaivePaymentDto,
  PaymentQueryDto,
  LeaseResponseDto,
  LeaseListResponseDto,
  RentPaymentResponseDto,
  PaymentListResponseDto,
  CreateRenewalOfferDto,
  DeclineRenewalDto,
  RenewalQueryDto,
  LeaseSignatureStatusDto,
  PaymentLinkDto,
} from './dto';

@ApiTags('leases')
@Controller('leases')
export class LeasesController {
  constructor(
    private readonly leasesService: LeasesService,
    private readonly renewalService: LeaseRenewalService,
  ) {}

  // ============================================
  // LEASE MANAGEMENT ENDPOINTS
  // ============================================

  /**
   * Create a new lease (PROD-102.1)
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create lease (PROD-102.1)',
    description: 'Create a new lease agreement for a property (landlord only)',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Lease created successfully',
    type: LeaseResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid lease data or dates',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only property owner can create a lease',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Property or tenant not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Property already has an active lease',
  })
  async createLease(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateLeaseDto,
  ): Promise<LeaseResponseDto> {
    return this.leasesService.create(user.id, dto);
  }

  /**
   * Get user's leases
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get my leases',
    description:
      'Get list of leases where user is tenant or landlord',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of leases',
    type: LeaseListResponseDto,
  })
  async getMyLeases(
    @CurrentUser() user: CurrentUserData,
    @Query() query: LeaseQueryDto,
  ): Promise<LeaseListResponseDto> {
    return this.leasesService.findAll(user.id, query);
  }

  /**
   * Get single lease details
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get lease details',
    description:
      'Get details of a specific lease (accessible by tenant or landlord)',
  })
  @ApiParam({
    name: 'id',
    description: 'Lease UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lease details',
    type: LeaseResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Lease not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized to view this lease',
  })
  async getLease(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<LeaseResponseDto> {
    return this.leasesService.findOne(id, user.id);
  }

  /**
   * Update a draft lease (landlord only)
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update draft lease',
    description: 'Update a draft lease (landlord only)',
  })
  @ApiParam({
    name: 'id',
    description: 'Lease UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lease updated',
    type: LeaseResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Only draft leases can be modified',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Lease not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only landlord can update the lease',
  })
  async updateLease(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: UpdateLeaseDto,
  ): Promise<LeaseResponseDto> {
    return this.leasesService.update(id, user.id, dto);
  }

  /**
   * Activate a lease (landlord only)
   */
  @Post(':id/activate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Activate lease',
    description:
      'Activate a draft lease and generate payment schedule (landlord only)',
  })
  @ApiParam({
    name: 'id',
    description: 'Lease UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lease activated',
    type: LeaseResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Only draft leases can be activated',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Lease not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only landlord can activate the lease',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Property already has an active lease',
  })
  async activateLease(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<LeaseResponseDto> {
    return this.leasesService.activate(id, user.id);
  }

  /**
   * Terminate a lease (landlord only)
   */
  @Post(':id/terminate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Terminate lease',
    description: 'Terminate an active lease early (landlord only)',
  })
  @ApiParam({
    name: 'id',
    description: 'Lease UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lease terminated',
    type: LeaseResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Only active leases can be terminated',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Lease not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only landlord can terminate the lease',
  })
  async terminateLease(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: { reason?: string },
  ): Promise<LeaseResponseDto> {
    return this.leasesService.terminate(id, user.id, dto?.reason);
  }

  // ============================================
  // PAYMENT ENDPOINTS
  // ============================================

  /**
   * Get payment history for a lease (PROD-102.2)
   */
  @Get(':id/payments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get payment history (PROD-102.2)',
    description: 'Get payment history for a lease (tenant or landlord)',
  })
  @ApiParam({
    name: 'id',
    description: 'Lease UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment history',
    type: PaymentListResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Lease not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized to view payments',
  })
  async getPayments(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
    @Query() query: PaymentQueryDto,
  ): Promise<PaymentListResponseDto> {
    return this.leasesService.getPayments(id, user.id, query);
  }

  /**
   * Record a rent payment (PROD-102.4)
   */
  @Post(':leaseId/payments/:paymentId/record')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Record payment (PROD-102.4)',
    description: 'Record a rent payment as received (landlord only)',
  })
  @ApiParam({
    name: 'leaseId',
    description: 'Lease UUID',
  })
  @ApiParam({
    name: 'paymentId',
    description: 'Payment UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment recorded',
    type: RentPaymentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Payment already recorded or waived',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Lease or payment not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only landlord can record payments',
  })
  async recordPayment(
    @Param('leaseId') leaseId: string,
    @Param('paymentId') paymentId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: RecordPaymentDto,
  ): Promise<RentPaymentResponseDto> {
    return this.leasesService.recordPayment(leaseId, paymentId, user.id, dto);
  }

  /**
   * Waive a rent payment
   */
  @Post(':leaseId/payments/:paymentId/waive')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Waive payment',
    description: 'Waive a rent payment (landlord only)',
  })
  @ApiParam({
    name: 'leaseId',
    description: 'Lease UUID',
  })
  @ApiParam({
    name: 'paymentId',
    description: 'Payment UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment waived',
    type: RentPaymentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Payment already paid or waived',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Lease or payment not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only landlord can waive payments',
  })
  async waivePayment(
    @Param('leaseId') leaseId: string,
    @Param('paymentId') paymentId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: WaivePaymentDto,
  ): Promise<RentPaymentResponseDto> {
    return this.leasesService.waivePayment(leaseId, paymentId, user.id, dto);
  }

  /**
   * Get payment link for tenant (PROD-106.3)
   */
  @Get(':leaseId/payments/:paymentId/pay-link')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get payment link (PROD-106.3)',
    description: 'Get payment link for a specific rent payment (tenant only)',
  })
  @ApiParam({
    name: 'leaseId',
    description: 'Lease UUID',
  })
  @ApiParam({
    name: 'paymentId',
    description: 'Payment UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment link details',
    type: PaymentLinkDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Payment already completed or waived',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only tenant can access payment link',
  })
  async getPaymentLink(
    @Param('leaseId') leaseId: string,
    @Param('paymentId') paymentId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<PaymentLinkDto> {
    return this.leasesService.getPaymentLink(leaseId, paymentId, user.id);
  }

  // ============================================
  // E-SIGNATURE ENDPOINTS (PROD-106.6)
  // ============================================

  /**
   * Sign lease (PROD-106.6)
   */
  @Post(':id/sign')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Sign lease (PROD-106.6)',
    description:
      'E-sign a lease. Landlord must sign first, then tenant. Lease auto-activates when both sign.',
  })
  @ApiParam({
    name: 'id',
    description: 'Lease UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lease signed successfully',
    type: LeaseSignatureStatusDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Already signed or wrong signing order',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Lease not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized to sign this lease',
  })
  async signLease(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
    @Ip() ipAddress: string,
  ): Promise<LeaseSignatureStatusDto> {
    return this.leasesService.signLease(id, user.id, ipAddress);
  }

  /**
   * Get signature status (PROD-106.6)
   */
  @Get(':id/signature-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get signature status (PROD-106.6)',
    description: 'Get the current signature status of a lease',
  })
  @ApiParam({
    name: 'id',
    description: 'Lease UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Signature status',
    type: LeaseSignatureStatusDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Lease not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized to view this lease',
  })
  async getSignatureStatus(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<LeaseSignatureStatusDto> {
    return this.leasesService.getSignatureStatus(id, user.id);
  }

  // ============================================
  // RENEWAL ENDPOINTS (PROD-105)
  // ============================================

  /**
   * Get pending renewals for landlord (PROD-105)
   */
  @Get('renewals/pending')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get pending renewals (PROD-105)',
    description: 'Get list of pending and offered lease renewals (landlord)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of renewals',
  })
  async getPendingRenewals(
    @CurrentUser() user: CurrentUserData,
    @Query() query: RenewalQueryDto,
  ) {
    return this.renewalService.findPendingRenewals(user.id, query);
  }

  /**
   * Get renewal status for a lease (PROD-105)
   */
  @Get(':id/renewal')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get renewal status (PROD-105)',
    description:
      'Get current renewal status for a lease (tenant or landlord)',
  })
  @ApiParam({
    name: 'id',
    description: 'Lease UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Renewal details or null if no active renewal',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Lease not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized to view this lease',
  })
  async getRenewalStatus(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.renewalService.findRenewalForLease(id, user.id);
  }

  /**
   * Create renewal offer (PROD-105.3)
   */
  @Post(':id/renewal/offer')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create renewal offer (PROD-105.3)',
    description: 'Create a renewal offer with proposed terms (landlord only)',
  })
  @ApiParam({
    name: 'id',
    description: 'Lease UUID',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Renewal offer created',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid offer data or lease not active',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Lease not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only landlord can create renewal offer',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'An offer already exists for this lease',
  })
  async createRenewalOffer(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateRenewalOfferDto,
  ) {
    return this.renewalService.createOffer(id, user.id, dto);
  }

  /**
   * Accept renewal offer (PROD-105.5)
   */
  @Post(':id/renewal/accept')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Accept renewal offer (PROD-105.5)',
    description:
      'Accept a renewal offer and generate new lease (tenant only)',
  })
  @ApiParam({
    name: 'id',
    description: 'Lease UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Renewal accepted, new lease created',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Offer has expired',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No active renewal offer found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only tenant can accept renewal offer',
  })
  async acceptRenewalOffer(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.renewalService.acceptOffer(id, user.id);
  }

  /**
   * Decline renewal offer (PROD-105.5)
   */
  @Post(':id/renewal/decline')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Decline renewal offer (PROD-105.5)',
    description:
      'Decline a renewal offer with optional reason (tenant only)',
  })
  @ApiParam({
    name: 'id',
    description: 'Lease UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Renewal declined',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No active renewal offer found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only tenant can decline renewal offer',
  })
  async declineRenewalOffer(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: DeclineRenewalDto,
  ) {
    return this.renewalService.declineOffer(id, user.id, dto);
  }

  /**
   * Cancel renewal (landlord only)
   */
  @Delete(':id/renewal')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel renewal',
    description: 'Cancel an active renewal or offer (landlord only)',
  })
  @ApiParam({
    name: 'id',
    description: 'Lease UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Renewal cancelled',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No active renewal found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only landlord can cancel renewal',
  })
  async cancelRenewal(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.renewalService.cancelOffer(id, user.id);
  }
}
