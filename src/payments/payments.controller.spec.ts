import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { StripeService } from './stripe.service';
import { TransactionStatus } from '@prisma/client';
import { CurrentUserData } from '@/common/decorators';
import { BadRequestException } from '@nestjs/common';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let paymentsService: jest.Mocked<PaymentsService>;
  let stripeService: jest.Mocked<StripeService>;

  const mockUser: CurrentUserData = {
    id: 'user-123',
    email: 'user@example.com',
    role: 'USER',
    status: 'ACTIVE',
  };

  const mockCheckoutResult = {
    sessionId: 'cs_xxx',
    url: 'https://checkout.stripe.com/xxx',
  };

  const mockPaymentResponse = {
    id: 'tx-123',
    negotiationId: 'neg-123',
    status: TransactionStatus.PENDING,
    amount: '250000',
    currency: 'EUR',
    platformFee: '12500',
    platformFeeRate: '0.05',
    sellerAmount: '237500',
    stripeSessionId: undefined as string | undefined,
    stripePaymentIntentId: undefined as string | undefined,
    paidAt: undefined as Date | undefined,
    failedAt: undefined as Date | undefined,
    refundedAt: undefined as Date | undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRefundResponse = {
    transaction: { ...mockPaymentResponse, status: TransactionStatus.REFUNDED },
    refundId: 're_xxx',
    refundStatus: 'succeeded',
  };

  beforeEach(async () => {
    const mockPaymentsService = {
      createCheckoutSession: jest.fn(),
      getPaymentStatus: jest.fn(),
      processRefund: jest.fn(),
      handleWebhookEvent: jest.fn(),
    };

    const mockStripeService = {
      constructWebhookEvent: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        { provide: PaymentsService, useValue: mockPaymentsService },
        { provide: StripeService, useValue: mockStripeService },
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
    paymentsService = module.get(PaymentsService);
    stripeService = module.get(StripeService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createCheckoutSession', () => {
    it('should call paymentsService.createCheckoutSession with correct params', async () => {
      paymentsService.createCheckoutSession.mockResolvedValue(mockCheckoutResult);

      const result = await controller.createCheckoutSession('tx-123', mockUser, {});

      expect(result).toEqual(mockCheckoutResult);
      expect(paymentsService.createCheckoutSession).toHaveBeenCalledWith(
        'tx-123',
        'user-123',
        {},
      );
    });

    it('should pass custom success and cancel URLs', async () => {
      paymentsService.createCheckoutSession.mockResolvedValue(mockCheckoutResult);

      const dto = {
        successUrl: 'https://custom.com/success',
        cancelUrl: 'https://custom.com/cancel',
      };

      await controller.createCheckoutSession('tx-123', mockUser, dto);

      expect(paymentsService.createCheckoutSession).toHaveBeenCalledWith(
        'tx-123',
        'user-123',
        dto,
      );
    });
  });

  describe('getPaymentStatus', () => {
    it('should call paymentsService.getPaymentStatus with correct params', async () => {
      paymentsService.getPaymentStatus.mockResolvedValue(mockPaymentResponse);

      const result = await controller.getPaymentStatus('tx-123', mockUser);

      expect(result).toEqual(mockPaymentResponse);
      expect(paymentsService.getPaymentStatus).toHaveBeenCalledWith(
        'tx-123',
        'user-123',
      );
    });
  });

  describe('processRefund', () => {
    it('should call paymentsService.processRefund with correct params', async () => {
      paymentsService.processRefund.mockResolvedValue(mockRefundResponse);

      const result = await controller.processRefund('tx-123', mockUser, {});

      expect(result).toEqual(mockRefundResponse);
      expect(paymentsService.processRefund).toHaveBeenCalledWith(
        'tx-123',
        'user-123',
        undefined,
        undefined,
      );
    });

    it('should pass amount and reason for partial refund', async () => {
      paymentsService.processRefund.mockResolvedValue(mockRefundResponse);

      const dto = { amount: 10000, reason: 'Customer request' };

      await controller.processRefund('tx-123', mockUser, dto);

      expect(paymentsService.processRefund).toHaveBeenCalledWith(
        'tx-123',
        'user-123',
        10000,
        'Customer request',
      );
    });
  });

  describe('handleWebhook', () => {
    it('should throw BadRequestException if signature is missing', async () => {
      const mockRequest = {
        rawBody: Buffer.from('{}'),
      } as any;

      await expect(
        controller.handleWebhook('', mockRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if raw body is missing', async () => {
      const mockRequest = {
        rawBody: undefined,
      } as any;

      await expect(
        controller.handleWebhook('sig_xxx', mockRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should process valid webhook event', async () => {
      const mockEvent = { type: 'checkout.session.completed', data: {} };
      const mockRequest = {
        rawBody: Buffer.from('{}'),
      } as any;

      stripeService.constructWebhookEvent.mockReturnValue(mockEvent as any);
      paymentsService.handleWebhookEvent.mockResolvedValue(undefined);

      const result = await controller.handleWebhook('sig_xxx', mockRequest);

      expect(result).toEqual({ received: true });
      expect(stripeService.constructWebhookEvent).toHaveBeenCalledWith(
        mockRequest.rawBody,
        'sig_xxx',
      );
      expect(paymentsService.handleWebhookEvent).toHaveBeenCalledWith(mockEvent);
    });

    it('should throw BadRequestException on invalid signature', async () => {
      const mockRequest = {
        rawBody: Buffer.from('{}'),
      } as any;

      stripeService.constructWebhookEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      await expect(
        controller.handleWebhook('invalid_sig', mockRequest),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
