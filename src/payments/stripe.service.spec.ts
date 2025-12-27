import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StripeService, CreateCheckoutSessionOptions } from './stripe.service';

describe('StripeService', () => {
  let service: StripeService;
  let configService: jest.Mocked<ConfigService>;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Default: Stripe is not configured
    mockConfigService.get.mockReturnValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<StripeService>(StripeService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isConfigured', () => {
    it('should return false when Stripe is not configured', () => {
      expect(service.isConfigured()).toBe(false);
    });

    it('should return true when Stripe is configured', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'stripe.secretKey') return 'sk_test_xxx';
        return undefined;
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          StripeService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      const configuredService = module.get<StripeService>(StripeService);
      expect(configuredService.isConfigured()).toBe(true);
    });
  });

  describe('createCheckoutSession', () => {
    it('should throw error when Stripe is not configured', async () => {
      const options: CreateCheckoutSessionOptions = {
        transactionId: 'tx-123',
        amount: 25000000,
        currency: 'EUR',
        customerEmail: 'buyer@example.com',
        propertyTitle: 'Test Property',
        successUrl: 'http://localhost/success',
        cancelUrl: 'http://localhost/cancel',
      };

      await expect(service.createCheckoutSession(options)).rejects.toThrow(
        'Stripe is not configured',
      );
    });
  });

  describe('retrieveSession', () => {
    it('should throw error when Stripe is not configured', async () => {
      await expect(service.retrieveSession('cs_xxx')).rejects.toThrow(
        'Stripe is not configured',
      );
    });
  });

  describe('retrievePaymentIntent', () => {
    it('should throw error when Stripe is not configured', async () => {
      await expect(service.retrievePaymentIntent('pi_xxx')).rejects.toThrow(
        'Stripe is not configured',
      );
    });
  });

  describe('createRefund', () => {
    it('should throw error when Stripe is not configured', async () => {
      await expect(service.createRefund('pi_xxx')).rejects.toThrow(
        'Stripe is not configured',
      );
    });
  });

  describe('constructWebhookEvent', () => {
    it('should throw error when Stripe is not configured', () => {
      expect(() =>
        service.constructWebhookEvent(Buffer.from('{}'), 'sig'),
      ).toThrow('Stripe is not configured');
    });
  });
});
