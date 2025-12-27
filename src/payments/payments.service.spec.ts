import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { StripeService } from './stripe.service';
import { PrismaService } from '@/database';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { MailService } from '@/mail/mail.service';
import { TransactionStatus, NegotiationStatus, NotificationType } from '@prisma/client';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prismaService: jest.Mocked<PrismaService>;
  let stripeService: jest.Mocked<StripeService>;
  let notificationsService: jest.Mocked<NotificationsService>;
  let mailService: jest.Mocked<MailService>;

  const mockTransaction = {
    id: 'tx-123',
    negotiationId: 'neg-123',
    amount: 250000,
    currency: 'EUR',
    platformFee: 12500,
    platformFeeRate: 0.05,
    sellerAmount: 237500,
    status: TransactionStatus.PENDING,
    payerId: 'buyer-123',
    stripeSessionId: null,
    stripePaymentIntentId: null,
    paidAt: null,
    failedAt: null,
    refundedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    negotiation: {
      id: 'neg-123',
      buyerId: 'buyer-123',
      sellerId: 'seller-123',
      property: { id: 'prop-123', title: 'Test Property' },
      buyer: { id: 'buyer-123', email: 'buyer@test.com', firstName: 'Buyer', lastName: 'User' },
      seller: { id: 'seller-123', email: 'seller@test.com', firstName: 'Seller', lastName: 'User' },
    },
    payer: { id: 'buyer-123', email: 'buyer@test.com', firstName: 'Buyer' },
  };

  const mockCheckoutResult = {
    sessionId: 'cs_xxx',
    url: 'https://checkout.stripe.com/xxx',
  };

  beforeEach(async () => {
    const mockPrismaTransactionModel = {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    };

    const mockPrismaNegotiationModel = {
      update: jest.fn(),
    };

    const mockPrismaService = {
      transaction: mockPrismaTransactionModel,
      negotiation: mockPrismaNegotiationModel,
      $transaction: jest.fn((callback: (tx: any) => Promise<any>) =>
        callback({
          transaction: mockPrismaTransactionModel,
          negotiation: mockPrismaNegotiationModel,
        }),
      ),
    };

    const mockStripeService = {
      createCheckoutSession: jest.fn(),
      retrieveSession: jest.fn(),
      retrievePaymentIntent: jest.fn(),
      createRefund: jest.fn(),
      constructWebhookEvent: jest.fn(),
      isConfigured: jest.fn().mockReturnValue(true),
    };

    const mockNotificationsService = {
      create: jest.fn(),
    };

    const mockMailService = {
      sendPaymentSuccessEmail: jest.fn(),
      sendPaymentFailedEmail: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue('http://localhost:3000'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StripeService, useValue: mockStripeService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: MailService, useValue: mockMailService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    prismaService = module.get(PrismaService);
    stripeService = module.get(StripeService);
    notificationsService = module.get(NotificationsService);
    mailService = module.get(MailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCheckoutSession', () => {
    it('should throw NotFoundException if transaction not found', async () => {
      (prismaService.transaction.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createCheckoutSession('tx-999', 'buyer-123', {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not the payer', async () => {
      (prismaService.transaction.findUnique as jest.Mock).mockResolvedValue(mockTransaction);

      await expect(
        service.createCheckoutSession('tx-123', 'wrong-user', {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if transaction is not PENDING', async () => {
      (prismaService.transaction.findUnique as jest.Mock).mockResolvedValue({
        ...mockTransaction,
        status: TransactionStatus.COMPLETED,
      });

      await expect(
        service.createCheckoutSession('tx-123', 'buyer-123', {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create checkout session and update transaction', async () => {
      (prismaService.transaction.findUnique as jest.Mock).mockResolvedValue(mockTransaction);
      (stripeService.createCheckoutSession as jest.Mock).mockResolvedValue(mockCheckoutResult);
      (prismaService.transaction.update as jest.Mock).mockResolvedValue({
        ...mockTransaction,
        stripeSessionId: mockCheckoutResult.sessionId,
        status: TransactionStatus.PROCESSING,
      });

      const result = await service.createCheckoutSession('tx-123', 'buyer-123', {});

      expect(result.sessionId).toBe('cs_xxx');
      expect(result.url).toBe('https://checkout.stripe.com/xxx');
      expect(prismaService.transaction.update).toHaveBeenCalledWith({
        where: { id: 'tx-123' },
        data: {
          stripeSessionId: 'cs_xxx',
          status: TransactionStatus.PROCESSING,
        },
      });
    });
  });

  describe('getPaymentStatus', () => {
    it('should throw NotFoundException if transaction not found', async () => {
      (prismaService.transaction.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getPaymentStatus('tx-999', 'buyer-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not buyer or seller', async () => {
      (prismaService.transaction.findUnique as jest.Mock).mockResolvedValue({
        ...mockTransaction,
        negotiation: { buyerId: 'buyer-123', sellerId: 'seller-123' },
      });

      await expect(
        service.getPaymentStatus('tx-123', 'stranger-123'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return payment status for buyer', async () => {
      (prismaService.transaction.findUnique as jest.Mock).mockResolvedValue({
        ...mockTransaction,
        negotiation: { buyerId: 'buyer-123', sellerId: 'seller-123' },
      });

      const result = await service.getPaymentStatus('tx-123', 'buyer-123');

      expect(result.id).toBe('tx-123');
      expect(result.status).toBe(TransactionStatus.PENDING);
    });

    it('should return payment status for seller', async () => {
      (prismaService.transaction.findUnique as jest.Mock).mockResolvedValue({
        ...mockTransaction,
        negotiation: { buyerId: 'buyer-123', sellerId: 'seller-123' },
      });

      const result = await service.getPaymentStatus('tx-123', 'seller-123');

      expect(result.id).toBe('tx-123');
    });
  });

  describe('processRefund', () => {
    const completedTransaction = {
      ...mockTransaction,
      status: TransactionStatus.COMPLETED,
      stripePaymentIntentId: 'pi_xxx',
    };

    it('should throw NotFoundException if transaction not found', async () => {
      (prismaService.transaction.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.processRefund('tx-999', 'seller-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not the seller', async () => {
      (prismaService.transaction.findUnique as jest.Mock).mockResolvedValue(completedTransaction);

      await expect(
        service.processRefund('tx-123', 'buyer-123'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if transaction is not COMPLETED', async () => {
      (prismaService.transaction.findUnique as jest.Mock).mockResolvedValue({
        ...mockTransaction,
        status: TransactionStatus.PENDING,
      });

      await expect(
        service.processRefund('tx-123', 'seller-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should process refund and update transaction', async () => {
      (prismaService.transaction.findUnique as jest.Mock).mockResolvedValue(completedTransaction);
      (stripeService.createRefund as jest.Mock).mockResolvedValue({
        id: 're_xxx',
        status: 'succeeded',
      });
      (prismaService.transaction.update as jest.Mock).mockResolvedValue({
        ...completedTransaction,
        status: TransactionStatus.REFUNDED,
        refundedAt: new Date(),
      });

      const result = await service.processRefund('tx-123', 'seller-123');

      expect(result.refundId).toBe('re_xxx');
      expect(result.transaction.status).toBe(TransactionStatus.REFUNDED);
      expect(notificationsService.create).toHaveBeenCalled();
    });
  });

  describe('handleWebhookEvent', () => {
    describe('checkout.session.completed', () => {
      it('should update transaction to COMPLETED', async () => {
        const mockSession = {
          id: 'cs_xxx',
          payment_intent: 'pi_xxx',
          metadata: { transactionId: 'tx-123' },
        };

        (prismaService.transaction.findUnique as jest.Mock).mockResolvedValue(mockTransaction);
        (prismaService.transaction.update as jest.Mock).mockResolvedValue({
          ...mockTransaction,
          status: TransactionStatus.COMPLETED,
        });
        (prismaService.negotiation.update as jest.Mock).mockResolvedValue({});

        await service.handleWebhookEvent({
          type: 'checkout.session.completed',
          data: { object: mockSession },
        } as any);

        expect(prismaService.transaction.update).toHaveBeenCalled();
        expect(notificationsService.create).toHaveBeenCalledTimes(2); // buyer and seller
      });

      it('should skip if transactionId not in metadata', async () => {
        const mockSession = {
          id: 'cs_xxx',
          metadata: {},
        };

        await service.handleWebhookEvent({
          type: 'checkout.session.completed',
          data: { object: mockSession },
        } as any);

        expect(prismaService.transaction.update).not.toHaveBeenCalled();
      });
    });

    describe('checkout.session.expired', () => {
      it('should update transaction to CANCELLED', async () => {
        const mockSession = {
          id: 'cs_xxx',
          metadata: { transactionId: 'tx-123' },
        };

        (prismaService.transaction.update as jest.Mock).mockResolvedValue({
          ...mockTransaction,
          status: TransactionStatus.CANCELLED,
        });

        await service.handleWebhookEvent({
          type: 'checkout.session.expired',
          data: { object: mockSession },
        } as any);

        expect(prismaService.transaction.update).toHaveBeenCalledWith({
          where: { id: 'tx-123' },
          data: {
            status: TransactionStatus.CANCELLED,
            stripeSessionId: null,
          },
        });
      });
    });

    describe('payment_intent.payment_failed', () => {
      it('should update transaction to FAILED', async () => {
        const mockPaymentIntent = {
          id: 'pi_xxx',
        };

        (prismaService.transaction.findFirst as jest.Mock).mockResolvedValue(mockTransaction);
        (prismaService.transaction.update as jest.Mock).mockResolvedValue({
          ...mockTransaction,
          status: TransactionStatus.FAILED,
        });

        await service.handleWebhookEvent({
          type: 'payment_intent.payment_failed',
          data: { object: mockPaymentIntent },
        } as any);

        expect(prismaService.transaction.update).toHaveBeenCalled();
        expect(notificationsService.create).toHaveBeenCalledWith(
          'buyer-123',
          NotificationType.PAYMENT_FAILED,
          'Payment Failed',
          expect.any(String),
          expect.any(Object),
        );
      });
    });

    describe('charge.refunded', () => {
      it('should update transaction to REFUNDED', async () => {
        const mockCharge = {
          id: 'ch_xxx',
          payment_intent: 'pi_xxx',
        };

        (prismaService.transaction.findFirst as jest.Mock).mockResolvedValue({
          ...mockTransaction,
          status: TransactionStatus.COMPLETED,
          stripePaymentIntentId: 'pi_xxx',
        });
        (prismaService.transaction.update as jest.Mock).mockResolvedValue({
          ...mockTransaction,
          status: TransactionStatus.REFUNDED,
        });

        await service.handleWebhookEvent({
          type: 'charge.refunded',
          data: { object: mockCharge },
        } as any);

        expect(prismaService.transaction.update).toHaveBeenCalled();
      });
    });

    it('should handle unknown event types gracefully', async () => {
      await expect(
        service.handleWebhookEvent({
          type: 'unknown.event',
          data: { object: {} },
        } as any),
      ).resolves.not.toThrow();
    });
  });
});
