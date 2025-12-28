import {
  Controller,
  Get,
  Post,
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
} from './dto';
import { TransactionStatus } from '@prisma/client';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

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
}
