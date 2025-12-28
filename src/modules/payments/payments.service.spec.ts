import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PrismaService } from '@/database';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { TransactionStatus, NegotiationStatus } from '@prisma/client';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prismaService: PrismaService;
  let notificationsService: NotificationsService;

  const mockProperty = {
    id: 'property-123',
    title: 'Test Property',
    address: '123 Test Street',
    city: 'Budapest',
  };

  const mockBuyer = {
    id: 'buyer-123',
    email: 'buyer@test.com',
    firstName: 'Buyer',
    lastName: 'User',
  };

  const mockSeller = {
    id: 'seller-123',
    email: 'seller@test.com',
    firstName: 'Seller',
    lastName: 'User',
  };

  const mockAcceptedOffer = {
    id: 'offer-123',
    amount: '250000',
    currency: 'EUR',
    status: 'ACCEPTED',
    createdAt: new Date(),
  };

  const mockNegotiation = {
    id: 'negotiation-123',
    propertyId: 'property-123',
    buyerId: 'buyer-123',
    sellerId: 'seller-123',
    status: NegotiationStatus.ACCEPTED,
    property: mockProperty,
    buyer: mockBuyer,
    seller: mockSeller,
    offers: [mockAcceptedOffer],
  };

  const mockTransaction = {
    id: 'transaction-123',
    negotiationId: 'negotiation-123',
    amount: '250000',
    currency: 'EUR',
    platformFee: '12500',
    sellerAmount: '237500',
    status: TransactionStatus.PENDING,
    stripeCheckoutSessionId: null,
    stripePaymentIntentId: null,
    paidAt: null,
    createdAt: new Date(),
    negotiation: mockNegotiation,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: PrismaService,
          useValue: {
            negotiation: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            transaction: {
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
              aggregate: jest.fn(),
            },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'STRIPE_SECRET_KEY') return null; // Mock mode
              if (key === 'FRONTEND_URL') return 'http://localhost:3000';
              return null;
            }),
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            create: jest.fn().mockResolvedValue({}),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    prismaService = module.get(PrismaService);
    notificationsService = module.get(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCheckout', () => {
    it('should throw NotFoundException if negotiation not found', async () => {
      (prismaService.negotiation.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createCheckout('buyer-123', { negotiationId: 'invalid-id' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not the buyer', async () => {
      (prismaService.negotiation.findUnique as jest.Mock).mockResolvedValue(mockNegotiation);

      await expect(
        service.createCheckout('wrong-user', { negotiationId: 'negotiation-123' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if negotiation is not accepted', async () => {
      (prismaService.negotiation.findUnique as jest.Mock).mockResolvedValue({
        ...mockNegotiation,
        status: NegotiationStatus.ACTIVE,
      });

      await expect(
        service.createCheckout('buyer-123', { negotiationId: 'negotiation-123' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if no accepted offer found', async () => {
      (prismaService.negotiation.findUnique as jest.Mock).mockResolvedValue({
        ...mockNegotiation,
        offers: [],
      });

      await expect(
        service.createCheckout('buyer-123', { negotiationId: 'negotiation-123' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create mock checkout session when Stripe is not configured', async () => {
      (prismaService.negotiation.findUnique as jest.Mock).mockResolvedValue(mockNegotiation);
      (prismaService.transaction.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.transaction.create as jest.Mock).mockResolvedValue(mockTransaction);
      (prismaService.transaction.update as jest.Mock).mockResolvedValue({
        ...mockTransaction,
        stripeCheckoutSessionId: 'mock_session_transaction-123',
      });

      const result = await service.createCheckout('buyer-123', {
        negotiationId: 'negotiation-123',
      });

      expect(result.sessionId).toContain('mock_session_');
      expect(result.url).toContain('mock=true');
    });

    it('should use existing pending transaction if one exists', async () => {
      (prismaService.negotiation.findUnique as jest.Mock).mockResolvedValue(mockNegotiation);
      (prismaService.transaction.findFirst as jest.Mock).mockResolvedValue(mockTransaction);
      (prismaService.transaction.update as jest.Mock).mockResolvedValue({
        ...mockTransaction,
        stripeCheckoutSessionId: 'mock_session_transaction-123',
      });

      const result = await service.createCheckout('buyer-123', {
        negotiationId: 'negotiation-123',
      });

      expect(prismaService.transaction.create).not.toHaveBeenCalled();
      expect(result.sessionId).toBeDefined();
    });
  });

  describe('getPaymentStatus', () => {
    it('should throw NotFoundException for invalid mock session', async () => {
      (prismaService.transaction.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getPaymentStatus('buyer-123', 'mock_session_invalid'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if transaction not found', async () => {
      (prismaService.transaction.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getPaymentStatus('buyer-123', 'cs_123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not buyer or seller', async () => {
      (prismaService.transaction.findFirst as jest.Mock).mockResolvedValue({
        ...mockTransaction,
        negotiation: mockNegotiation,
      });

      await expect(
        service.getPaymentStatus('stranger-123', 'cs_123'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return payment status for buyer', async () => {
      (prismaService.transaction.findFirst as jest.Mock).mockResolvedValue({
        ...mockTransaction,
        negotiation: mockNegotiation,
      });

      const result = await service.getPaymentStatus('buyer-123', 'cs_123');

      expect(result.transactionId).toBe('transaction-123');
      expect(result.status).toBe(TransactionStatus.PENDING);
    });

    it('should return payment status for seller', async () => {
      (prismaService.transaction.findFirst as jest.Mock).mockResolvedValue({
        ...mockTransaction,
        negotiation: mockNegotiation,
      });

      const result = await service.getPaymentStatus('seller-123', 'cs_123');

      expect(result.transactionId).toBe('transaction-123');
    });
  });

  describe('completeMockPayment', () => {
    it('should throw BadRequestException for non-mock session', async () => {
      await expect(
        service.completeMockPayment('buyer-123', 'cs_123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if transaction not found', async () => {
      (prismaService.transaction.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.completeMockPayment('buyer-123', 'mock_session_invalid'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not the buyer', async () => {
      (prismaService.transaction.findUnique as jest.Mock).mockResolvedValue({
        ...mockTransaction,
        negotiation: mockNegotiation,
      });

      await expect(
        service.completeMockPayment('wrong-user', 'mock_session_transaction-123'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return existing transaction if already completed', async () => {
      const completedTransaction = {
        ...mockTransaction,
        status: TransactionStatus.COMPLETED,
        negotiation: mockNegotiation,
      };
      (prismaService.transaction.findUnique as jest.Mock).mockResolvedValue(completedTransaction);

      const result = await service.completeMockPayment(
        'buyer-123',
        'mock_session_transaction-123',
      );

      expect(result.status).toBe('COMPLETED');
      expect(prismaService.transaction.update).not.toHaveBeenCalled();
    });

    it('should complete mock payment successfully', async () => {
      (prismaService.transaction.findUnique as jest.Mock).mockResolvedValue({
        ...mockTransaction,
        negotiation: mockNegotiation,
      });
      (prismaService.transaction.update as jest.Mock).mockResolvedValue({
        ...mockTransaction,
        status: TransactionStatus.COMPLETED,
        paidAt: new Date(),
        negotiation: mockNegotiation,
      });
      (prismaService.negotiation.update as jest.Mock).mockResolvedValue({});

      const result = await service.completeMockPayment(
        'buyer-123',
        'mock_session_transaction-123',
      );

      expect(result.status).toBe('COMPLETED');
      expect(prismaService.negotiation.update).toHaveBeenCalledWith({
        where: { id: 'negotiation-123' },
        data: { status: NegotiationStatus.COMPLETED },
      });
      expect(notificationsService.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('getTransactions', () => {
    it('should return paginated transactions for user', async () => {
      const transactions = [mockTransaction];
      (prismaService.transaction.findMany as jest.Mock).mockResolvedValue(transactions);
      (prismaService.transaction.count as jest.Mock).mockResolvedValue(1);

      const result = await service.getTransactions('buyer-123', 1, 20);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by status when provided', async () => {
      (prismaService.transaction.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.transaction.count as jest.Mock).mockResolvedValue(0);

      await service.getTransactions('buyer-123', 1, 20, TransactionStatus.COMPLETED);

      expect(prismaService.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: TransactionStatus.COMPLETED,
          }),
        }),
      );
    });
  });

  describe('getTransaction', () => {
    it('should throw NotFoundException if transaction not found', async () => {
      (prismaService.transaction.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getTransaction('buyer-123', 'invalid-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not buyer or seller', async () => {
      (prismaService.transaction.findUnique as jest.Mock).mockResolvedValue({
        ...mockTransaction,
        negotiation: mockNegotiation,
      });

      await expect(
        service.getTransaction('stranger-123', 'transaction-123'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return transaction for authorized user', async () => {
      (prismaService.transaction.findUnique as jest.Mock).mockResolvedValue({
        ...mockTransaction,
        negotiation: mockNegotiation,
      });

      const result = await service.getTransaction('buyer-123', 'transaction-123');

      expect(result.id).toBe('transaction-123');
      expect(result.amount).toBe('250000');
    });
  });

  describe('getStats', () => {
    it('should return payment statistics for user', async () => {
      const buyerTransactions = [
        { ...mockTransaction, amount: '100000' },
        { ...mockTransaction, amount: '150000' },
      ];
      const sellerTransactions = [
        { ...mockTransaction, sellerAmount: '95000' },
      ];

      (prismaService.transaction.findMany as jest.Mock)
        .mockResolvedValueOnce(buyerTransactions)
        .mockResolvedValueOnce(sellerTransactions);
      (prismaService.transaction.aggregate as jest.Mock).mockResolvedValue({
        _sum: { sellerAmount: 95000 },
      });

      const result = await service.getStats('buyer-123');

      expect(result.totalSpent).toBe('250000.00');
      expect(result.totalEarnings).toBe('95000.00');
      expect(result.completedTransactions).toBe(3);
      expect(result.currency).toBe('USD');
    });
  });

  describe('requestRefund', () => {
    const completedTransaction = {
      ...mockTransaction,
      status: TransactionStatus.COMPLETED,
      stripePaymentIntentId: 'mock_pi_123',
      negotiation: mockNegotiation,
    };

    it('should throw NotFoundException if transaction not found', async () => {
      (prismaService.transaction.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.requestRefund('buyer-123', {
          transactionId: 'invalid-id',
          reason: 'Changed mind',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not the buyer', async () => {
      (prismaService.transaction.findUnique as jest.Mock).mockResolvedValue(completedTransaction);

      await expect(
        service.requestRefund('seller-123', {
          transactionId: 'transaction-123',
          reason: 'Changed mind',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if transaction is not completed', async () => {
      (prismaService.transaction.findUnique as jest.Mock).mockResolvedValue({
        ...mockTransaction,
        status: TransactionStatus.PENDING,
        negotiation: mockNegotiation,
      });

      await expect(
        service.requestRefund('buyer-123', {
          transactionId: 'transaction-123',
          reason: 'Changed mind',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should process refund for mock payment', async () => {
      (prismaService.transaction.findUnique as jest.Mock).mockResolvedValue(completedTransaction);
      (prismaService.transaction.update as jest.Mock).mockResolvedValue({
        ...completedTransaction,
        status: TransactionStatus.REFUNDED,
      });

      const result = await service.requestRefund('buyer-123', {
        transactionId: 'transaction-123',
        reason: 'Changed mind',
      });

      expect(result.status).toBe('REFUNDED');
      expect(notificationsService.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('handleWebhook', () => {
    it('should log warning when Stripe is not configured', async () => {
      // In mock mode, webhook should be handled gracefully
      await expect(
        service.handleWebhook('sig_123', Buffer.from('payload')),
      ).resolves.not.toThrow();
    });
  });
});
