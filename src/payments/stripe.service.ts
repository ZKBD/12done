import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export interface CreateCheckoutSessionOptions {
  transactionId: string;
  amount: number; // in cents
  currency: string;
  customerEmail: string;
  propertyTitle: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

export interface CheckoutSessionResult {
  sessionId: string;
  url: string;
}

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe | null = null;

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get<string>('stripe.secretKey');
    if (secretKey) {
      this.stripe = new Stripe(secretKey);
      this.logger.log('Stripe client initialized');
    } else {
      this.logger.warn('Stripe secret key not configured - payment features disabled');
    }
  }

  private ensureStripeConfigured(): Stripe {
    if (!this.stripe) {
      throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY environment variable.');
    }
    return this.stripe;
  }

  async createCheckoutSession(
    options: CreateCheckoutSessionOptions,
  ): Promise<CheckoutSessionResult> {
    const stripe = this.ensureStripeConfigured();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: options.customerEmail,
      line_items: [
        {
          price_data: {
            currency: options.currency.toLowerCase(),
            product_data: {
              name: `Property: ${options.propertyTitle}`,
              description: `Transaction ID: ${options.transactionId}`,
            },
            unit_amount: options.amount,
          },
          quantity: 1,
        },
      ],
      success_url: options.successUrl,
      cancel_url: options.cancelUrl,
      metadata: {
        transactionId: options.transactionId,
        ...options.metadata,
      },
    });

    this.logger.log(`Checkout session created: ${session.id} for transaction ${options.transactionId}`);

    if (!session.url) {
      throw new Error('Stripe session created without URL');
    }

    return {
      sessionId: session.id,
      url: session.url,
    };
  }

  async retrieveSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    const stripe = this.ensureStripeConfigured();
    return stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent'],
    });
  }

  async retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    const stripe = this.ensureStripeConfigured();
    return stripe.paymentIntents.retrieve(paymentIntentId);
  }

  async createRefund(
    paymentIntentId: string,
    amount?: number,
    reason?: string,
  ): Promise<Stripe.Refund> {
    const stripe = this.ensureStripeConfigured();

    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
    };

    if (amount !== undefined) {
      refundParams.amount = amount;
    }

    if (reason) {
      refundParams.reason = 'requested_by_customer';
      refundParams.metadata = { reason };
    }

    const refund = await stripe.refunds.create(refundParams);
    this.logger.log(`Refund created: ${refund.id} for payment intent ${paymentIntentId}`);

    return refund;
  }

  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    const stripe = this.ensureStripeConfigured();
    const webhookSecret = this.configService.get<string>('stripe.webhookSecret');

    if (!webhookSecret) {
      throw new Error('Stripe webhook secret not configured');
    }

    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }

  isConfigured(): boolean {
    return this.stripe !== null;
  }
}
