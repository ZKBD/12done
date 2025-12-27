import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/database';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { MailService } from '@/mail/mail.service';
import { StripeService, CheckoutSessionResult } from './stripe.service';
import {
  CreateCheckoutDto,
  PaymentResponseDto,
  RefundResponseDto,
} from './dto';
import { TransactionStatus, NotificationType, NegotiationStatus } from '@prisma/client';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly frontendUrl: string;

  constructor(
    private prisma: PrismaService,
    private stripeService: StripeService,
    private notificationsService: NotificationsService,
    private mailService: MailService,
    private configService: ConfigService,
  ) {
    this.frontendUrl = this.configService.get<string>('app.frontendUrl') || 'http://localhost:3000';
  }

  async createCheckoutSession(
    transactionId: string,
    userId: string,
    dto: CreateCheckoutDto,
  ): Promise<CheckoutSessionResult> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        negotiation: {
          include: {
            property: { select: { id: true, title: true } },
            buyer: { select: { id: true, email: true, firstName: true, lastName: true } },
            seller: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
        },
        payer: { select: { id: true, email: true, firstName: true } },
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.payerId !== userId) {
      throw new ForbiddenException('Only the payer can initiate payment');
    }

    if (transaction.status !== TransactionStatus.PENDING) {
      throw new BadRequestException(
        `Cannot create checkout for transaction with status: ${transaction.status}`,
      );
    }

    const amountInCents = Math.round(Number(transaction.amount) * 100);

    const successUrl = dto.successUrl || `${this.frontendUrl}/payments/success?transaction_id=${transactionId}`;
    const cancelUrl = dto.cancelUrl || `${this.frontendUrl}/payments/cancel?transaction_id=${transactionId}`;

    const result = await this.stripeService.createCheckoutSession({
      transactionId,
      amount: amountInCents,
      currency: transaction.currency,
      customerEmail: transaction.payer.email,
      propertyTitle: transaction.negotiation.property.title,
      successUrl,
      cancelUrl,
      metadata: {
        negotiationId: transaction.negotiationId,
        propertyId: transaction.negotiation.property.id,
        buyerId: transaction.negotiation.buyerId,
        sellerId: transaction.negotiation.sellerId,
      },
    });

    await this.prisma.transaction.update({
      where: { id: transactionId },
      data: {
        stripeSessionId: result.sessionId,
        status: TransactionStatus.PROCESSING,
      },
    });

    this.logger.log(`Checkout session created for transaction ${transactionId}`);

    return result;
  }

  async getPaymentStatus(transactionId: string, userId: string): Promise<PaymentResponseDto> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        negotiation: {
          select: {
            buyerId: true,
            sellerId: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    const isBuyer = transaction.negotiation.buyerId === userId;
    const isSeller = transaction.negotiation.sellerId === userId;

    if (!isBuyer && !isSeller) {
      throw new ForbiddenException('Access denied');
    }

    return this.mapToPaymentResponse(transaction);
  }

  async processRefund(
    transactionId: string,
    userId: string,
    amount?: number,
    reason?: string,
  ): Promise<RefundResponseDto> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        negotiation: {
          include: {
            property: { select: { id: true, title: true } },
            buyer: { select: { id: true, email: true, firstName: true, lastName: true } },
            seller: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
        },
        payer: { select: { id: true, email: true, firstName: true } },
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    const isSeller = transaction.negotiation.sellerId === userId;
    if (!isSeller) {
      throw new ForbiddenException('Only the seller can process refunds');
    }

    if (transaction.status !== TransactionStatus.COMPLETED) {
      throw new BadRequestException(
        `Cannot refund transaction with status: ${transaction.status}`,
      );
    }

    if (!transaction.stripePaymentIntentId) {
      throw new BadRequestException('Transaction has no payment intent to refund');
    }

    const refund = await this.stripeService.createRefund(
      transaction.stripePaymentIntentId,
      amount,
      reason,
    );

    const updatedTransaction = await this.prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: TransactionStatus.REFUNDED,
        refundedAt: new Date(),
      },
    });

    await this.notificationsService.create(
      transaction.payerId,
      NotificationType.PAYMENT_RECEIVED,
      'Refund Processed',
      `Your payment for "${transaction.negotiation.property.title}" has been refunded.`,
      { transactionId, refundId: refund.id },
    );

    this.logger.log(`Refund processed for transaction ${transactionId}`);

    return {
      transaction: this.mapToPaymentResponse(updatedTransaction),
      refundId: refund.id,
      refundStatus: refund.status,
    };
  }

  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    this.logger.log(`Processing webhook event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'checkout.session.expired':
        await this.handleCheckoutExpired(event.data.object as Stripe.Checkout.Session);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      case 'charge.refunded':
        await this.handleChargeRefunded(event.data.object as Stripe.Charge);
        break;
      default:
        this.logger.debug(`Unhandled webhook event type: ${event.type}`);
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const transactionId = session.metadata?.transactionId;
    if (!transactionId) {
      this.logger.warn('Checkout completed without transactionId in metadata');
      return;
    }

    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        negotiation: {
          include: {
            property: { select: { id: true, title: true } },
            buyer: { select: { id: true, email: true, firstName: true, lastName: true } },
            seller: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!transaction) {
      this.logger.warn(`Transaction not found for checkout: ${transactionId}`);
      return;
    }

    const paymentIntentId = typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id;

    await this.prisma.$transaction(async (tx) => {
      await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: TransactionStatus.COMPLETED,
          stripePaymentIntentId: paymentIntentId,
          paidAt: new Date(),
        },
      });

      await tx.negotiation.update({
        where: { id: transaction.negotiationId },
        data: { status: NegotiationStatus.COMPLETED },
      });
    });

    await this.notificationsService.create(
      transaction.negotiation.sellerId,
      NotificationType.PAYMENT_RECEIVED,
      'Payment Received',
      `Payment of ${transaction.amount} ${transaction.currency} received for "${transaction.negotiation.property.title}".`,
      { transactionId, propertyId: transaction.negotiation.property.id },
    );

    await this.notificationsService.create(
      transaction.negotiation.buyerId,
      NotificationType.PAYMENT_RECEIVED,
      'Payment Successful',
      `Your payment for "${transaction.negotiation.property.title}" was successful.`,
      { transactionId, propertyId: transaction.negotiation.property.id },
    );

    this.logger.log(`Payment completed for transaction ${transactionId}`);
  }

  private async handleCheckoutExpired(session: Stripe.Checkout.Session): Promise<void> {
    const transactionId = session.metadata?.transactionId;
    if (!transactionId) {
      return;
    }

    await this.prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: TransactionStatus.CANCELLED,
        stripeSessionId: null,
      },
    });

    this.logger.log(`Checkout expired for transaction ${transactionId}`);
  }

  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const transaction = await this.prisma.transaction.findFirst({
      where: { stripePaymentIntentId: paymentIntent.id },
      include: {
        negotiation: {
          include: {
            property: { select: { id: true, title: true } },
          },
        },
      },
    });

    if (!transaction) {
      this.logger.warn(`Transaction not found for payment intent: ${paymentIntent.id}`);
      return;
    }

    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: TransactionStatus.FAILED,
        failedAt: new Date(),
      },
    });

    await this.notificationsService.create(
      transaction.payerId,
      NotificationType.PAYMENT_FAILED,
      'Payment Failed',
      `Your payment for "${transaction.negotiation.property.title}" failed. Please try again.`,
      { transactionId: transaction.id },
    );

    this.logger.log(`Payment failed for transaction ${transaction.id}`);
  }

  private async handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
    const paymentIntentId = typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : charge.payment_intent?.id;

    if (!paymentIntentId) {
      return;
    }

    const transaction = await this.prisma.transaction.findFirst({
      where: { stripePaymentIntentId: paymentIntentId },
    });

    if (!transaction) {
      return;
    }

    if (transaction.status !== TransactionStatus.REFUNDED) {
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: TransactionStatus.REFUNDED,
          refundedAt: new Date(),
        },
      });
    }

    this.logger.log(`Charge refunded for transaction ${transaction.id}`);
  }

  private mapToPaymentResponse(transaction: any): PaymentResponseDto {
    return {
      id: transaction.id,
      negotiationId: transaction.negotiationId,
      status: transaction.status,
      amount: transaction.amount.toString(),
      currency: transaction.currency,
      platformFee: transaction.platformFee.toString(),
      platformFeeRate: transaction.platformFeeRate.toString(),
      sellerAmount: transaction.sellerAmount.toString(),
      stripeSessionId: transaction.stripeSessionId,
      stripePaymentIntentId: transaction.stripePaymentIntentId,
      paidAt: transaction.paidAt,
      failedAt: transaction.failedAt,
      refundedAt: transaction.refundedAt,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    };
  }
}
