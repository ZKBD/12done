import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { SplitPaymentService } from './split-payment.service';
import { EscrowService } from './escrow.service';
import { TransactionStatus } from '@prisma/client';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let paymentsService: PaymentsService;

  const mockUser = { id: 'user-123', email: 'user@test.com', role: 'USER', status: 'ACTIVE' };

  const mockCheckoutResponse = {
    sessionId: 'mock_session_123',
    url: 'http://localhost:3000/checkout?mock=true',
  };

  const mockPaymentStatus = {
    status: 'PENDING',
    transactionId: 'tx-123',
    amount: '250000',
    currency: 'EUR',
  };

  const mockTransaction = {
    id: 'tx-123',
    negotiationId: 'neg-123',
    amount: '250000',
    currency: 'EUR',
    platformFee: '12500',
    sellerAmount: '237500',
    status: 'PENDING',
    createdAt: new Date(),
  };

  const mockTransactionList = {
    data: [mockTransaction],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  const mockStats = {
    totalEarnings: '500000.00',
    totalSpent: '250000.00',
    pendingPayouts: '50000.00',
    completedTransactions: 5,
    currency: 'USD',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: {
            createCheckout: jest.fn().mockResolvedValue(mockCheckoutResponse),
            getPaymentStatus: jest.fn().mockResolvedValue(mockPaymentStatus),
            completeMockPayment: jest.fn().mockResolvedValue(mockTransaction),
            getTransactions: jest.fn().mockResolvedValue(mockTransactionList),
            getTransaction: jest.fn().mockResolvedValue(mockTransaction),
            getStats: jest.fn().mockResolvedValue(mockStats),
            requestRefund: jest.fn().mockResolvedValue({ ...mockTransaction, status: 'REFUNDED' }),
            handleWebhook: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: SplitPaymentService,
          useValue: {
            createSplitPayment: jest.fn(),
            getSplitPayment: jest.fn(),
            getPaymentLinks: jest.fn(),
            getPaymentByToken: jest.fn(),
            processPayment: jest.fn(),
            completePayment: jest.fn(),
            sendReminders: jest.fn(),
            cancelSplitPayment: jest.fn(),
            getUserSplitPayments: jest.fn(),
          },
        },
        {
          provide: EscrowService,
          useValue: {
            createEscrow: jest.fn(),
            getEscrow: jest.fn(),
            getEscrowByTransaction: jest.fn(),
            fundEscrow: jest.fn(),
            completeFunding: jest.fn(),
            completeMilestone: jest.fn(),
            approveMilestoneRelease: jest.fn(),
            releaseFullEscrow: jest.fn(),
            raiseDispute: jest.fn(),
            getDisputes: jest.fn(),
            resolveDispute: jest.fn(),
            cancelEscrow: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
    paymentsService = module.get<PaymentsService>(PaymentsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createCheckout', () => {
    it('should create a checkout session', async () => {
      const dto = { negotiationId: 'neg-123' };

      const result = await controller.createCheckout(mockUser, dto);

      expect(paymentsService.createCheckout).toHaveBeenCalledWith('user-123', dto);
      expect(result.sessionId).toBe('mock_session_123');
      expect(result.url).toContain('mock=true');
    });

    it('should pass custom success and cancel URLs', async () => {
      const dto = {
        negotiationId: 'neg-123',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      };

      await controller.createCheckout(mockUser, dto);

      expect(paymentsService.createCheckout).toHaveBeenCalledWith('user-123', dto);
    });
  });

  describe('getPaymentStatus', () => {
    it('should return payment status', async () => {
      const result = await controller.getPaymentStatus(mockUser, 'session_123');

      expect(paymentsService.getPaymentStatus).toHaveBeenCalledWith('user-123', 'session_123');
      expect(result.status).toBe('PENDING');
      expect(result.transactionId).toBe('tx-123');
    });
  });

  describe('completeMockPayment', () => {
    it('should complete a mock payment', async () => {
      const result = await controller.completeMockPayment(mockUser, 'mock_session_123');

      expect(paymentsService.completeMockPayment).toHaveBeenCalledWith('user-123', 'mock_session_123');
      expect(result.id).toBe('tx-123');
    });
  });

  describe('getTransactions', () => {
    it('should return paginated transactions', async () => {
      const result = await controller.getTransactions(mockUser);

      expect(paymentsService.getTransactions).toHaveBeenCalledWith('user-123', 1, 20, undefined);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should pass pagination parameters', async () => {
      await controller.getTransactions(mockUser, 2, 10);

      expect(paymentsService.getTransactions).toHaveBeenCalledWith('user-123', 2, 10, undefined);
    });

    it('should pass status filter', async () => {
      await controller.getTransactions(mockUser, 1, 20, TransactionStatus.COMPLETED);

      expect(paymentsService.getTransactions).toHaveBeenCalledWith(
        'user-123',
        1,
        20,
        TransactionStatus.COMPLETED,
      );
    });
  });

  describe('getTransaction', () => {
    it('should return a single transaction', async () => {
      const result = await controller.getTransaction(mockUser, 'tx-123');

      expect(paymentsService.getTransaction).toHaveBeenCalledWith('user-123', 'tx-123');
      expect(result.id).toBe('tx-123');
    });
  });

  describe('getStats', () => {
    it('should return payment statistics', async () => {
      const result = await controller.getStats(mockUser);

      expect(paymentsService.getStats).toHaveBeenCalledWith('user-123');
      expect(result.totalEarnings).toBe('500000.00');
      expect(result.completedTransactions).toBe(5);
    });
  });

  describe('requestRefund', () => {
    it('should process a refund request', async () => {
      const dto = {
        transactionId: 'tx-123',
        reason: 'Changed my mind',
      };

      const result = await controller.requestRefund(mockUser, dto);

      expect(paymentsService.requestRefund).toHaveBeenCalledWith('user-123', dto);
      expect(result.status).toBe('REFUNDED');
    });

    it('should handle partial refund', async () => {
      const dto = {
        transactionId: 'tx-123',
        reason: 'Partial refund',
        amount: 50000,
      };

      await controller.requestRefund(mockUser, dto);

      expect(paymentsService.requestRefund).toHaveBeenCalledWith('user-123', dto);
    });
  });

  describe('handleWebhook', () => {
    it('should handle webhook and return received confirmation', async () => {
      const mockReq = {
        rawBody: Buffer.from('webhook payload'),
      };

      const result = await controller.handleWebhook('stripe_signature', mockReq as any);

      expect(paymentsService.handleWebhook).toHaveBeenCalledWith(
        'stripe_signature',
        Buffer.from('webhook payload'),
      );
      expect(result).toEqual({ received: true });
    });
  });
});
