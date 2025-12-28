import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/database';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import Stripe from 'stripe';
import {
  CreateCheckoutDto,
  RefundRequestDto,
  CheckoutSessionResponseDto,
  PaymentStatusResponseDto,
  PaymentStatsResponseDto,
  TransactionResponseDto,
  TransactionListResponseDto,
} from './dto';
import { TransactionStatus, NegotiationStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private stripe: Stripe;
  private readonly platformFeePercent = 5; // 5% platform fee

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (stripeKey && stripeKey !== 'sk_test_your_stripe_secret_key') {
      this.stripe = new Stripe(stripeKey, {
        apiVersion: '2025-01-27.acacia',
      });
    } else {
      this.logger.warn('Stripe is not configured - using mock mode');
    }
  }

  /**
   * Create a Stripe checkout session for a negotiation
   */
  async createCheckout(
    userId: string,
    dto: CreateCheckoutDto,
  ): Promise<CheckoutSessionResponseDto> {
    // Get negotiation with related data
    const negotiation = await this.prisma.negotiation.findUnique({
      where: { id: dto.negotiationId },
      include: {
        property: true,
        buyer: true,
        seller: true,
        offers: {
          where: { status: 'ACCEPTED' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!negotiation) {
      throw new NotFoundException('Negotiation not found');
    }

    // Only buyer can pay
    if (negotiation.buyerId !== userId) {
      throw new ForbiddenException('Only the buyer can proceed to payment');
    }

    // Check negotiation is in accepted state
    if (negotiation.status !== NegotiationStatus.ACCEPTED) {
      throw new BadRequestException('Negotiation must be accepted to proceed to payment');
    }

    // Get accepted offer amount
    const acceptedOffer = negotiation.offers[0];
    if (!acceptedOffer) {
      throw new BadRequestException('No accepted offer found');
    }

    const amount = parseFloat(acceptedOffer.amount.toString());
    const currency = acceptedOffer.currency.toLowerCase();
    const platformFee = Math.round(amount * (this.platformFeePercent / 100) * 100); // in cents
    const amountInCents = Math.round(amount * 100);

    // Check if transaction already exists
    let transaction = await this.prisma.transaction.findFirst({
      where: {
        negotiationId: dto.negotiationId,
        status: { in: [TransactionStatus.PENDING, TransactionStatus.PROCESSING] },
      },
    });

    if (!transaction) {
      // Create transaction record
      transaction = await this.prisma.transaction.create({
        data: {
          negotiationId: dto.negotiationId,
          amount: amount,
          currency: acceptedOffer.currency,
          platformFee: amount * (this.platformFeePercent / 100),
          sellerAmount: amount * (1 - this.platformFeePercent / 100),
          status: TransactionStatus.PENDING,
        },
      });
    }

    // If Stripe is not configured, return mock response
    if (!this.stripe) {
      const mockSessionId = `mock_session_${transaction.id}`;
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: { stripeCheckoutSessionId: mockSessionId },
      });

      return {
        sessionId: mockSessionId,
        url: `${dto.successUrl || 'http://localhost:3000/dashboard/negotiations/' + dto.negotiationId}?session_id=${mockSessionId}&mock=true`,
      };
    }

    // Create Stripe checkout session
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: negotiation.property.title,
              description: `Purchase of property at ${negotiation.property.address}, ${negotiation.property.city}`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        negotiationId: dto.negotiationId,
        transactionId: transaction.id,
        buyerId: userId,
        sellerId: negotiation.sellerId,
      },
      success_url: dto.successUrl || `${this.configService.get('FRONTEND_URL')}/dashboard/negotiations/${dto.negotiationId}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: dto.cancelUrl || `${this.configService.get('FRONTEND_URL')}/dashboard/negotiations/${dto.negotiationId}?payment=cancelled`,
      customer_email: negotiation.buyer.email,
    });

    // Update transaction with Stripe session ID
    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        stripeCheckoutSessionId: session.id,
        status: TransactionStatus.PROCESSING,
      },
    });

    return {
      sessionId: session.id,
      url: session.url!,
    };
  }

  /**
   * Get payment status by session ID
   */
  async getPaymentStatus(
    userId: string,
    sessionId: string,
  ): Promise<PaymentStatusResponseDto> {
    // Handle mock sessions
    if (sessionId.startsWith('mock_session_')) {
      const transactionId = sessionId.replace('mock_session_', '');
      const transaction = await this.prisma.transaction.findUnique({
        where: { id: transactionId },
        include: { negotiation: true },
      });

      if (!transaction) {
        throw new NotFoundException('Transaction not found');
      }

      // Verify user access
      if (
        transaction.negotiation.buyerId !== userId &&
        transaction.negotiation.sellerId !== userId
      ) {
        throw new ForbiddenException('Access denied');
      }

      return {
        status: transaction.status,
        transactionId: transaction.id,
        amount: transaction.amount.toString(),
        currency: transaction.currency,
      };
    }

    // Find transaction by session ID
    const transaction = await this.prisma.transaction.findFirst({
      where: { stripeCheckoutSessionId: sessionId },
      include: { negotiation: true },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Verify user access
    if (
      transaction.negotiation.buyerId !== userId &&
      transaction.negotiation.sellerId !== userId
    ) {
      throw new ForbiddenException('Access denied');
    }

    // If Stripe not configured, return current status
    if (!this.stripe) {
      return {
        status: transaction.status,
        transactionId: transaction.id,
        amount: transaction.amount.toString(),
        currency: transaction.currency,
      };
    }

    // Get status from Stripe
    const session = await this.stripe.checkout.sessions.retrieve(sessionId);

    return {
      status: session.payment_status === 'paid' ? 'COMPLETED' : transaction.status,
      transactionId: transaction.id,
      amount: transaction.amount.toString(),
      currency: transaction.currency,
    };
  }

  /**
   * Complete a mock payment (for testing without Stripe)
   */
  async completeMockPayment(
    userId: string,
    sessionId: string,
  ): Promise<TransactionResponseDto> {
    if (!sessionId.startsWith('mock_session_')) {
      throw new BadRequestException('Not a mock session');
    }

    const transactionId = sessionId.replace('mock_session_', '');
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        negotiation: {
          include: {
            property: true,
            buyer: true,
            seller: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.negotiation.buyerId !== userId) {
      throw new ForbiddenException('Only the buyer can complete payment');
    }

    if (transaction.status === TransactionStatus.COMPLETED) {
      return this.mapTransactionToDto(transaction);
    }

    // Complete the transaction
    const updated = await this.prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: TransactionStatus.COMPLETED,
        paidAt: new Date(),
        stripePaymentIntentId: `mock_pi_${Date.now()}`,
      },
      include: {
        negotiation: {
          include: {
            property: true,
            buyer: true,
            seller: true,
          },
        },
      },
    });

    // Update negotiation status
    await this.prisma.negotiation.update({
      where: { id: transaction.negotiationId },
      data: { status: NegotiationStatus.COMPLETED },
    });

    // Send notifications
    await this.notificationsService.create(
      transaction.negotiation.sellerId,
      'PAYMENT_RECEIVED',
      'Payment Received!',
      `You received a payment of ${transaction.currency} ${transaction.sellerAmount} for ${transaction.negotiation.property.title}`,
      { transactionId: transaction.id, negotiationId: transaction.negotiationId },
    );

    await this.notificationsService.create(
      transaction.negotiation.buyerId,
      'PAYMENT_CONFIRMED',
      'Payment Confirmed',
      `Your payment of ${transaction.currency} ${transaction.amount} has been processed successfully`,
      { transactionId: transaction.id, negotiationId: transaction.negotiationId },
    );

    return this.mapTransactionToDto(updated);
  }

  /**
   * Get all transactions for a user
   */
  async getTransactions(
    userId: string,
    page = 1,
    limit = 20,
    status?: TransactionStatus,
  ): Promise<TransactionListResponseDto> {
    const skip = (page - 1) * limit;

    const where = {
      negotiation: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
      ...(status && { status }),
    };

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: {
          negotiation: {
            include: {
              property: {
                select: {
                  id: true,
                  title: true,
                  address: true,
                  city: true,
                },
              },
              buyer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
              seller: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      data: transactions.map((t) => this.mapTransactionToDto(t)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single transaction
   */
  async getTransaction(
    userId: string,
    transactionId: string,
  ): Promise<TransactionResponseDto> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        negotiation: {
          include: {
            property: {
              select: {
                id: true,
                title: true,
                address: true,
                city: true,
              },
            },
            buyer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            seller: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Verify access
    if (
      transaction.negotiation.buyerId !== userId &&
      transaction.negotiation.sellerId !== userId
    ) {
      throw new ForbiddenException('Access denied');
    }

    return this.mapTransactionToDto(transaction);
  }

  /**
   * Get payment statistics for a user
   */
  async getStats(userId: string): Promise<PaymentStatsResponseDto> {
    // Get transactions where user is buyer (spent) or seller (earned)
    const [buyerTransactions, sellerTransactions] = await Promise.all([
      this.prisma.transaction.findMany({
        where: {
          negotiation: { buyerId: userId },
          status: TransactionStatus.COMPLETED,
        },
      }),
      this.prisma.transaction.findMany({
        where: {
          negotiation: { sellerId: userId },
          status: TransactionStatus.COMPLETED,
        },
      }),
    ]);

    const totalSpent = buyerTransactions.reduce(
      (sum, t) => sum + parseFloat(t.amount.toString()),
      0,
    );

    const totalEarnings = sellerTransactions.reduce(
      (sum, t) => sum + parseFloat(t.sellerAmount.toString()),
      0,
    );

    // Get pending payouts (seller transactions that are completed but not yet paid out)
    const pendingPayouts = await this.prisma.transaction.aggregate({
      where: {
        negotiation: { sellerId: userId },
        status: TransactionStatus.COMPLETED,
        // In a real implementation, you'd track payout status
      },
      _sum: { sellerAmount: true },
    });

    return {
      totalEarnings: totalEarnings.toFixed(2),
      totalSpent: totalSpent.toFixed(2),
      pendingPayouts: (pendingPayouts._sum.sellerAmount || 0).toString(),
      completedTransactions: buyerTransactions.length + sellerTransactions.length,
      currency: 'USD', // Default currency
    };
  }

  /**
   * Request a refund
   */
  async requestRefund(
    userId: string,
    dto: RefundRequestDto,
  ): Promise<TransactionResponseDto> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: dto.transactionId },
      include: {
        negotiation: {
          include: {
            property: true,
            buyer: true,
            seller: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Only buyer can request refund
    if (transaction.negotiation.buyerId !== userId) {
      throw new ForbiddenException('Only the buyer can request a refund');
    }

    // Can only refund completed transactions
    if (transaction.status !== TransactionStatus.COMPLETED) {
      throw new BadRequestException('Can only refund completed transactions');
    }

    // For mock transactions or if Stripe not configured
    if (!this.stripe || !transaction.stripePaymentIntentId?.startsWith('pi_')) {
      const updated = await this.prisma.transaction.update({
        where: { id: dto.transactionId },
        data: { status: TransactionStatus.REFUNDED },
        include: {
          negotiation: {
            include: {
              property: true,
              buyer: true,
              seller: true,
            },
          },
        },
      });

      // Send notifications
      await this.notificationsService.create(
        transaction.negotiation.sellerId,
        'REFUND_PROCESSED',
        'Refund Processed',
        `A refund has been processed for ${transaction.negotiation.property.title}. Reason: ${dto.reason}`,
        { transactionId: transaction.id },
      );

      await this.notificationsService.create(
        transaction.negotiation.buyerId,
        'REFUND_CONFIRMED',
        'Refund Confirmed',
        `Your refund of ${transaction.currency} ${transaction.amount} has been processed`,
        { transactionId: transaction.id },
      );

      return this.mapTransactionToDto(updated);
    }

    // Process refund through Stripe
    const refundAmount = dto.amount
      ? Math.round(dto.amount * 100)
      : Math.round(parseFloat(transaction.amount.toString()) * 100);

    await this.stripe.refunds.create({
      payment_intent: transaction.stripePaymentIntentId,
      amount: refundAmount,
      reason: 'requested_by_customer',
    });

    const updated = await this.prisma.transaction.update({
      where: { id: dto.transactionId },
      data: { status: TransactionStatus.REFUNDED },
      include: {
        negotiation: {
          include: {
            property: true,
            buyer: true,
            seller: true,
          },
        },
      },
    });

    return this.mapTransactionToDto(updated);
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(signature: string, payload: Buffer): Promise<void> {
    if (!this.stripe) {
      this.logger.warn('Stripe not configured, ignoring webhook');
      return;
    }

    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new BadRequestException('Webhook secret not configured');
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`Processing webhook event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
        break;
      case 'payment_intent.succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      default:
        this.logger.log(`Unhandled event type: ${event.type}`);
    }
  }

  private async handleCheckoutComplete(session: Stripe.Checkout.Session): Promise<void> {
    const transactionId = session.metadata?.transactionId;
    if (!transactionId) {
      this.logger.error('No transaction ID in checkout session metadata');
      return;
    }

    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        negotiation: {
          include: {
            property: true,
            buyer: true,
            seller: true,
          },
        },
      },
    });

    if (!transaction) {
      this.logger.error(`Transaction not found: ${transactionId}`);
      return;
    }

    // Update transaction status
    await this.prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: TransactionStatus.COMPLETED,
        stripePaymentIntentId: session.payment_intent as string,
        paidAt: new Date(),
      },
    });

    // Update negotiation status
    await this.prisma.negotiation.update({
      where: { id: transaction.negotiationId },
      data: { status: NegotiationStatus.COMPLETED },
    });

    // Send notifications
    await this.notificationsService.create(
      transaction.negotiation.sellerId,
      'PAYMENT_RECEIVED',
      'Payment Received!',
      `You received a payment of ${transaction.currency} ${transaction.sellerAmount} for ${transaction.negotiation.property.title}`,
      { transactionId: transaction.id, negotiationId: transaction.negotiationId },
    );

    await this.notificationsService.create(
      transaction.negotiation.buyerId,
      'PAYMENT_CONFIRMED',
      'Payment Confirmed',
      `Your payment of ${transaction.currency} ${transaction.amount} has been processed successfully`,
      { transactionId: transaction.id, negotiationId: transaction.negotiationId },
    );
  }

  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    this.logger.log(`Payment succeeded: ${paymentIntent.id}`);
    // Additional handling if needed
  }

  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    this.logger.log(`Payment failed: ${paymentIntent.id}`);

    // Find and update transaction
    const transaction = await this.prisma.transaction.findFirst({
      where: { stripePaymentIntentId: paymentIntent.id },
    });

    if (transaction) {
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: TransactionStatus.FAILED },
      });
    }
  }

  private mapTransactionToDto(transaction: any): TransactionResponseDto {
    return {
      id: transaction.id,
      negotiationId: transaction.negotiationId,
      amount: transaction.amount.toString(),
      currency: transaction.currency,
      platformFee: transaction.platformFee.toString(),
      sellerAmount: transaction.sellerAmount.toString(),
      status: transaction.status,
      stripePaymentIntentId: transaction.stripePaymentIntentId,
      stripeCheckoutSessionId: transaction.stripeCheckoutSessionId,
      paidAt: transaction.paidAt,
      createdAt: transaction.createdAt,
      negotiation: transaction.negotiation
        ? {
            id: transaction.negotiation.id,
            property: {
              id: transaction.negotiation.property.id,
              title: transaction.negotiation.property.title,
              address: transaction.negotiation.property.address,
              city: transaction.negotiation.property.city,
            },
            buyer: {
              id: transaction.negotiation.buyer.id,
              firstName: transaction.negotiation.buyer.firstName,
              lastName: transaction.negotiation.buyer.lastName,
            },
            seller: {
              id: transaction.negotiation.seller.id,
              firstName: transaction.negotiation.seller.firstName,
              lastName: transaction.negotiation.seller.lastName,
            },
          }
        : undefined,
    };
  }
}
