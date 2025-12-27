import { Test, TestingModule } from '@nestjs/testing';
import { NegotiationsController } from './negotiations.controller';
import { NegotiationsService } from './negotiations.service';
import {
  NegotiationType,
  NegotiationStatus,
  OfferStatus,
} from '@prisma/client';
import { CurrentUserData } from '@/common/decorators';

describe('NegotiationsController', () => {
  let controller: NegotiationsController;
  let service: jest.Mocked<NegotiationsService>;

  const mockUser: CurrentUserData = {
    id: 'user-123',
    email: 'user@example.com',
    role: 'USER',
    status: 'ACTIVE',
  };

  const mockNegotiationResponse = {
    id: 'negotiation-123',
    propertyId: 'property-123',
    buyerId: 'buyer-123',
    sellerId: 'seller-123',
    type: NegotiationType.BUY,
    status: NegotiationStatus.ACTIVE,
    startDate: null,
    endDate: null,
    initialMessage: 'I am interested',
    offers: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    property: { id: 'property-123', title: 'Test Property', basePrice: '250000', city: 'Budapest' },
    buyer: { id: 'buyer-123', firstName: 'Buyer', lastName: 'User' },
    seller: { id: 'seller-123', firstName: 'Seller', lastName: 'User' },
  };

  const mockOfferResponse = {
    id: 'offer-123',
    negotiationId: 'negotiation-123',
    madeById: 'buyer-123',
    amount: '240000',
    currency: 'EUR',
    terms: null,
    message: 'My offer',
    status: OfferStatus.PENDING,
    expiresAt: null,
    respondedAt: null,
    counterToId: null,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockNegotiationsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      cancel: jest.fn(),
      submitOffer: jest.fn(),
      respondToOffer: jest.fn(),
      getTransaction: jest.fn(),
      getTransactionHistory: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NegotiationsController],
      providers: [
        { provide: NegotiationsService, useValue: mockNegotiationsService },
      ],
    }).compile();

    controller = module.get<NegotiationsController>(NegotiationsController);
    service = module.get(NegotiationsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a negotiation', async () => {
      service.create.mockResolvedValue(mockNegotiationResponse as any);

      const result = await controller.create(mockUser, {
        propertyId: 'property-123',
        type: NegotiationType.BUY,
      });

      expect(result.id).toBe('negotiation-123');
      expect(service.create).toHaveBeenCalledWith('user-123', {
        propertyId: 'property-123',
        type: NegotiationType.BUY,
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated negotiations', async () => {
      service.findAll.mockResolvedValue({
        data: [mockNegotiationResponse as any],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      });

      const result = await controller.findAll(mockUser, {});

      expect(result.data).toHaveLength(1);
      expect(service.findAll).toHaveBeenCalledWith('user-123', {});
    });
  });

  describe('findOne', () => {
    it('should return negotiation details', async () => {
      service.findOne.mockResolvedValue(mockNegotiationResponse as any);

      const result = await controller.findOne('negotiation-123', mockUser);

      expect(result.id).toBe('negotiation-123');
      expect(service.findOne).toHaveBeenCalledWith('negotiation-123', 'user-123');
    });
  });

  describe('cancel', () => {
    it('should cancel a negotiation', async () => {
      service.cancel.mockResolvedValue({
        ...mockNegotiationResponse,
        status: NegotiationStatus.REJECTED,
      } as any);

      const result = await controller.cancel('negotiation-123', mockUser);

      expect(result.status).toBe(NegotiationStatus.REJECTED);
      expect(service.cancel).toHaveBeenCalledWith('negotiation-123', 'user-123');
    });
  });

  describe('submitOffer', () => {
    it('should submit an offer', async () => {
      service.submitOffer.mockResolvedValue(mockOfferResponse as any);

      const result = await controller.submitOffer('negotiation-123', mockUser, {
        amount: 240000,
        currency: 'EUR',
      });

      expect(result.amount).toBe('240000');
      expect(service.submitOffer).toHaveBeenCalledWith('negotiation-123', 'user-123', {
        amount: 240000,
        currency: 'EUR',
      });
    });
  });

  describe('respondToOffer', () => {
    it('should respond to an offer', async () => {
      service.respondToOffer.mockResolvedValue({
        ...mockNegotiationResponse,
        status: NegotiationStatus.ACCEPTED,
      } as any);

      const result = await controller.respondToOffer('offer-123', mockUser, {
        action: 'accept',
      });

      expect(result.status).toBe(NegotiationStatus.ACCEPTED);
      expect(service.respondToOffer).toHaveBeenCalledWith('offer-123', 'user-123', {
        action: 'accept',
      });
    });
  });

  describe('getTransaction', () => {
    it('should return transaction for negotiation', async () => {
      const mockTransaction = {
        id: 'transaction-123',
        negotiationId: 'negotiation-123',
        amount: '240000',
      };
      service.getTransaction.mockResolvedValue(mockTransaction as any);

      const result = await controller.getTransaction('negotiation-123', mockUser);

      expect(result.id).toBe('transaction-123');
      expect(service.getTransaction).toHaveBeenCalledWith('negotiation-123', 'user-123');
    });
  });

  describe('getTransactionHistory', () => {
    it('should return transaction history', async () => {
      service.getTransactionHistory.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      });

      const result = await controller.getTransactionHistory(mockUser, 1, 20);

      expect(result.data).toHaveLength(0);
      expect(service.getTransactionHistory).toHaveBeenCalledWith('user-123', 1, 20);
    });
  });
});
