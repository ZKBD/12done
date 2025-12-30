import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  Headers,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { SplitPaymentService } from './split-payment.service';
import { EscrowService } from './escrow.service';
import { JwtAuthGuard } from '@/modules/auth/guards';
import { CurrentUser, CurrentUserData } from '@/common/decorators';
import {
  CreateCheckoutDto,
  RefundRequestDto,
  CheckoutSessionResponseDto,
  PaymentStatusResponseDto,
  PaymentStatsResponseDto,
  TransactionResponseDto,
  TransactionListResponseDto,
  // Split Payment DTOs
  CreateSplitPaymentDto,
  SplitPaymentResponseDto,
  ParticipantPaymentLinkDto,
  ProcessParticipantPaymentDto,
  // Escrow DTOs
  CreateEscrowDto,
  EscrowResponseDto,
  CompleteMilestoneDto,
  ApproveMilestoneDto,
  RaiseDisputeDto,
  ResolveDisputeDto,
  EscrowDisputeResponseDto,
} from './dto';
import { TransactionStatus } from '@prisma/client';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly splitPaymentService: SplitPaymentService,
    private readonly escrowService: EscrowService,
  ) {}

  // ============================================
  // CHECKOUT ENDPOINTS
  // ============================================

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create checkout session',
    description: 'Create a Stripe checkout session for payment',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Checkout session created',
    type: CheckoutSessionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Negotiation not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid negotiation state',
  })
  async createCheckout(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateCheckoutDto,
  ): Promise<CheckoutSessionResponseDto> {
    return this.paymentsService.createCheckout(user.id, dto);
  }

  @Get('status/:sessionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get payment status',
    description: 'Get the status of a payment by session ID',
  })
  @ApiParam({ name: 'sessionId', description: 'Stripe checkout session ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment status retrieved',
    type: PaymentStatusResponseDto,
  })
  async getPaymentStatus(
    @CurrentUser() user: CurrentUserData,
    @Param('sessionId') sessionId: string,
  ): Promise<PaymentStatusResponseDto> {
    return this.paymentsService.getPaymentStatus(user.id, sessionId);
  }

  @Post('complete-mock/:sessionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Complete mock payment',
    description: 'Complete a mock payment session (for testing without Stripe)',
  })
  @ApiParam({ name: 'sessionId', description: 'Mock session ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment completed',
    type: TransactionResponseDto,
  })
  async completeMockPayment(
    @CurrentUser() user: CurrentUserData,
    @Param('sessionId') sessionId: string,
  ): Promise<TransactionResponseDto> {
    return this.paymentsService.completeMockPayment(user.id, sessionId);
  }

  // ============================================
  // TRANSACTION ENDPOINTS
  // ============================================

  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user transactions',
    description: 'Get all transactions for the current user',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: TransactionStatus })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transactions retrieved',
    type: TransactionListResponseDto,
  })
  async getTransactions(
    @CurrentUser() user: CurrentUserData,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: TransactionStatus,
  ): Promise<TransactionListResponseDto> {
    return this.paymentsService.getTransactions(
      user.id,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
      status,
    );
  }

  @Get('transactions/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get transaction details',
    description: 'Get details of a specific transaction',
  })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transaction retrieved',
    type: TransactionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Transaction not found',
  })
  async getTransaction(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ): Promise<TransactionResponseDto> {
    return this.paymentsService.getTransaction(user.id, id);
  }

  // ============================================
  // STATS ENDPOINTS
  // ============================================

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get payment statistics',
    description: 'Get payment statistics for the current user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistics retrieved',
    type: PaymentStatsResponseDto,
  })
  async getStats(
    @CurrentUser() user: CurrentUserData,
  ): Promise<PaymentStatsResponseDto> {
    return this.paymentsService.getStats(user.id);
  }

  // ============================================
  // REFUND ENDPOINTS
  // ============================================

  @Post('refund')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request refund',
    description: 'Request a refund for a completed transaction',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Refund processed',
    type: TransactionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Transaction not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid transaction state',
  })
  async requestRefund(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: RefundRequestDto,
  ): Promise<TransactionResponseDto> {
    return this.paymentsService.requestRefund(user.id, dto);
  }

  // ============================================
  // WEBHOOK ENDPOINTS
  // ============================================

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Stripe webhook',
    description: 'Handle Stripe webhook events',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Webhook processed',
  })
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<{ received: boolean }> {
    await this.paymentsService.handleWebhook(signature, req.rawBody!);
    return { received: true };
  }

  // ============================================
  // SPLIT PAYMENT ENDPOINTS (PROD-096)
  // ============================================

  @Post('split')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create split payment',
    description: 'Create a split payment for rent or transaction (PROD-096.1)',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Split payment created',
    type: SplitPaymentResponseDto,
  })
  async createSplitPayment(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateSplitPaymentDto,
  ): Promise<SplitPaymentResponseDto> {
    return this.splitPaymentService.createSplitPayment(user.id, dto);
  }

  @Get('split')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user split payments',
    description: 'Get all split payments for the current user',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Split payments retrieved',
  })
  async getUserSplitPayments(
    @CurrentUser() user: CurrentUserData,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.splitPaymentService.getUserSplitPayments(
      user.id,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Get('split/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get split payment details',
    description: 'Get details of a specific split payment',
  })
  @ApiParam({ name: 'id', description: 'Split payment ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Split payment retrieved',
    type: SplitPaymentResponseDto,
  })
  async getSplitPayment(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ): Promise<SplitPaymentResponseDto> {
    return this.splitPaymentService.getSplitPayment(user.id, id);
  }

  @Get('split/:id/links')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get participant payment links',
    description: 'Get payment links for all participants (PROD-096.3)',
  })
  @ApiParam({ name: 'id', description: 'Split payment ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment links retrieved',
    type: [ParticipantPaymentLinkDto],
  })
  async getPaymentLinks(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ): Promise<ParticipantPaymentLinkDto[]> {
    return this.splitPaymentService.getPaymentLinks(user.id, id);
  }

  @Get('split/pay/:token')
  @ApiOperation({
    summary: 'Get payment by token',
    description: 'Get payment details for participant payment page (no auth required)',
  })
  @ApiParam({ name: 'token', description: 'Payment token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment details retrieved',
  })
  async getPaymentByToken(@Param('token') token: string) {
    return this.splitPaymentService.getPaymentByToken(token);
  }

  @Post('split/pay')
  @ApiOperation({
    summary: 'Process participant payment',
    description: 'Process payment for a split payment participant',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment session created',
  })
  async processParticipantPayment(
    @Body() dto: ProcessParticipantPaymentDto,
  ): Promise<{ sessionUrl: string }> {
    return this.splitPaymentService.processPayment(dto);
  }

  @Post('split/complete/:token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Complete participant payment',
    description: 'Complete a participant payment (for mock/testing)',
  })
  @ApiParam({ name: 'token', description: 'Payment token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment completed',
    type: SplitPaymentResponseDto,
  })
  async completeParticipantPayment(
    @Param('token') token: string,
  ): Promise<SplitPaymentResponseDto> {
    return this.splitPaymentService.completePayment(token);
  }

  @Post('split/:id/remind')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send payment reminders',
    description: 'Send reminders to unpaid participants',
  })
  @ApiParam({ name: 'id', description: 'Split payment ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reminders sent',
  })
  async sendReminders(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ): Promise<{ remindersSent: number }> {
    const count = await this.splitPaymentService.sendReminders(id, user.id);
    return { remindersSent: count };
  }

  @Delete('split/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel split payment',
    description: 'Cancel a split payment (only if no payments made)',
  })
  @ApiParam({ name: 'id', description: 'Split payment ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Split payment cancelled',
    type: SplitPaymentResponseDto,
  })
  async cancelSplitPayment(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ): Promise<SplitPaymentResponseDto> {
    return this.splitPaymentService.cancelSplitPayment(id, user.id);
  }

  // ============================================
  // ESCROW ENDPOINTS (PROD-097)
  // ============================================

  @Post('escrow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create escrow',
    description: 'Create an escrow for a transaction (PROD-097.1)',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Escrow created',
    type: EscrowResponseDto,
  })
  async createEscrow(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateEscrowDto,
  ): Promise<EscrowResponseDto> {
    return this.escrowService.createEscrow(user.id, dto);
  }

  @Get('escrow/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get escrow details',
    description: 'Get details of a specific escrow (PROD-097.3)',
  })
  @ApiParam({ name: 'id', description: 'Escrow ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Escrow retrieved',
    type: EscrowResponseDto,
  })
  async getEscrow(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ): Promise<EscrowResponseDto> {
    return this.escrowService.getEscrow(user.id, id);
  }

  @Get('escrow/transaction/:transactionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get escrow by transaction',
    description: 'Get escrow details by transaction ID',
  })
  @ApiParam({ name: 'transactionId', description: 'Transaction ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Escrow retrieved',
    type: EscrowResponseDto,
  })
  async getEscrowByTransaction(
    @CurrentUser() user: CurrentUserData,
    @Param('transactionId') transactionId: string,
  ): Promise<EscrowResponseDto> {
    return this.escrowService.getEscrowByTransaction(user.id, transactionId);
  }

  @Post('escrow/:id/fund')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Fund escrow',
    description: 'Fund an escrow (buyer only) (PROD-097.3)',
  })
  @ApiParam({ name: 'id', description: 'Escrow ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Funding session created',
  })
  async fundEscrow(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ): Promise<{ sessionUrl: string }> {
    return this.escrowService.fundEscrow(user.id, id);
  }

  @Post('escrow/:id/complete-funding')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Complete escrow funding',
    description: 'Complete escrow funding (for mock/testing)',
  })
  @ApiParam({ name: 'id', description: 'Escrow ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Escrow funded',
    type: EscrowResponseDto,
  })
  async completeFunding(
    @Param('id') id: string,
  ): Promise<EscrowResponseDto> {
    return this.escrowService.completeFunding(id);
  }

  @Post('escrow/:id/milestones/:milestoneId/complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Complete milestone',
    description: 'Mark a milestone as completed (seller only) (PROD-097.4)',
  })
  @ApiParam({ name: 'id', description: 'Escrow ID' })
  @ApiParam({ name: 'milestoneId', description: 'Milestone ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Milestone completed',
    type: EscrowResponseDto,
  })
  async completeMilestone(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Param('milestoneId') milestoneId: string,
    @Body() dto: CompleteMilestoneDto,
  ): Promise<EscrowResponseDto> {
    return this.escrowService.completeMilestone(user.id, id, milestoneId, dto);
  }

  @Post('escrow/:id/milestones/:milestoneId/approve')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approve milestone release',
    description: 'Approve funds release for a milestone (buyer only) (PROD-097.4)',
  })
  @ApiParam({ name: 'id', description: 'Escrow ID' })
  @ApiParam({ name: 'milestoneId', description: 'Milestone ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Milestone approved and released',
    type: EscrowResponseDto,
  })
  async approveMilestoneRelease(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Param('milestoneId') milestoneId: string,
    @Body() dto: ApproveMilestoneDto,
  ): Promise<EscrowResponseDto> {
    return this.escrowService.approveMilestoneRelease(user.id, id, milestoneId, dto);
  }

  @Post('escrow/:id/release')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Release full escrow',
    description: 'Release all funds to seller (buyer only, no milestones)',
  })
  @ApiParam({ name: 'id', description: 'Escrow ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Escrow released',
    type: EscrowResponseDto,
  })
  async releaseFullEscrow(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ): Promise<EscrowResponseDto> {
    return this.escrowService.releaseFullEscrow(user.id, id);
  }

  @Post('escrow/:id/dispute')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Raise dispute',
    description: 'Raise a dispute for an escrow (PROD-097.3)',
  })
  @ApiParam({ name: 'id', description: 'Escrow ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dispute raised',
    type: EscrowDisputeResponseDto,
  })
  async raiseDispute(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() dto: RaiseDisputeDto,
  ): Promise<EscrowDisputeResponseDto> {
    return this.escrowService.raiseDispute(user.id, id, dto);
  }

  @Get('escrow/:id/disputes')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get escrow disputes',
    description: 'Get all disputes for an escrow',
  })
  @ApiParam({ name: 'id', description: 'Escrow ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Disputes retrieved',
    type: [EscrowDisputeResponseDto],
  })
  async getDisputes(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ): Promise<EscrowDisputeResponseDto[]> {
    return this.escrowService.getDisputes(user.id, id);
  }

  @Post('escrow/disputes/:disputeId/resolve')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resolve dispute',
    description: 'Resolve an escrow dispute (admin only in production)',
  })
  @ApiParam({ name: 'disputeId', description: 'Dispute ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dispute resolved',
    type: EscrowResponseDto,
  })
  async resolveDispute(
    @Param('disputeId') disputeId: string,
    @Body() dto: ResolveDisputeDto,
  ): Promise<EscrowResponseDto> {
    return this.escrowService.resolveDispute(disputeId, dto);
  }

  @Delete('escrow/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel escrow',
    description: 'Cancel an escrow (refund to buyer)',
  })
  @ApiParam({ name: 'id', description: 'Escrow ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Escrow cancelled',
    type: EscrowResponseDto,
  })
  async cancelEscrow(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ): Promise<EscrowResponseDto> {
    return this.escrowService.cancelEscrow(user.id, id);
  }
}
