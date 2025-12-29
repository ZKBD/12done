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
import { LeasesService } from './leases.service';
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
} from './dto';

@ApiTags('leases')
@Controller('leases')
export class LeasesController {
  constructor(private readonly leasesService: LeasesService) {}

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
    return this.leasesService.terminate(id, user.id, dto.reason);
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
}
