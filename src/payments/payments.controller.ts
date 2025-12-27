import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  Req,
  UseGuards,
  HttpStatus,
  HttpCode,
  BadRequestException,
  Logger,
  RawBodyRequest,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { StripeService } from './stripe.service';
import { JwtAuthGuard } from '@/modules/auth/guards';
import { CurrentUser, CurrentUserData, Public } from '@/common/decorators';
import {
  CreateCheckoutDto,
  PaymentResponseDto,
  CheckoutSessionResponseDto,
  RefundResponseDto,
  RefundDto,
} from './dto';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly stripeService: StripeService,
  ) {}

  @Post(':transactionId/checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create Stripe checkout session (PROD-094)',
    description: 'Creates a Stripe checkout session and returns the URL to redirect the user to',
  })
  @ApiParam({ name: 'transactionId', description: 'Transaction ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Checkout session created successfully',
    type: CheckoutSessionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Transaction not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized to pay this transaction',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Transaction not in PENDING status',
  })
  async createCheckoutSession(
    @Param('transactionId') transactionId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateCheckoutDto,
  ): Promise<CheckoutSessionResponseDto> {
    return this.paymentsService.createCheckoutSession(transactionId, user.id, dto);
  }

  @Get(':transactionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get payment status (PROD-095)',
    description: 'Retrieve the current status of a transaction',
  })
  @ApiParam({ name: 'transactionId', description: 'Transaction ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment status retrieved successfully',
    type: PaymentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Transaction not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  async getPaymentStatus(
    @Param('transactionId') transactionId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.getPaymentStatus(transactionId, user.id);
  }

  @Post(':transactionId/refund')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Process refund (PROD-093)',
    description: 'Process a full or partial refund for a completed transaction',
  })
  @ApiParam({ name: 'transactionId', description: 'Transaction ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Refund processed successfully',
    type: RefundResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Transaction not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized to refund',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Transaction not refundable',
  })
  async processRefund(
    @Param('transactionId') transactionId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: RefundDto,
  ): Promise<RefundResponseDto> {
    return this.paymentsService.processRefund(
      transactionId,
      user.id,
      dto.amount,
      dto.reason,
    );
  }

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  @ApiOperation({
    summary: 'Stripe webhook handler (PROD-094)',
    description: 'Handles Stripe webhook events for payment status updates',
  })
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: RawBodyRequest<Request>,
  ): Promise<{ received: boolean }> {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    const rawBody = request.rawBody;
    if (!rawBody) {
      throw new BadRequestException('Missing request body');
    }

    try {
      const event = this.stripeService.constructWebhookEvent(rawBody, signature);
      await this.paymentsService.handleWebhookEvent(event);
      return { received: true };
    } catch (error) {
      this.logger.error(`Webhook error: ${error.message}`);
      throw new BadRequestException(`Webhook error: ${error.message}`);
    }
  }
}
