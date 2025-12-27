import { Test, TestingModule } from '@nestjs/testing';
import { NegotiationsService } from './negotiations.service';
import { PrismaService } from '@/database';
import { NotificationsService } from '../notifications/notifications.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import {
  NegotiationType,
  NegotiationStatus,
  OfferStatus,
  PropertyStatus,
} from '@prisma/client';

describe('NegotiationsService', () => {
  let service: NegotiationsService;
  let prismaService: PrismaService;
  let notificationsService: NotificationsService;

  const mockProperty = {
    id: 'property-123',
    title: 'Test Property',
    ownerId: 'seller-123',
    status: PropertyStatus.ACTIVE,
    basePrice: 250000,
    city: 'Budapest',
    owner: { id: 'seller-123', firstName: 'Seller', lastName: 'User' },
  };

  const mockNegotiation = {
    id: 'negotiation-123',
    propertyId: 'property-123',
    buyerId: 'buyer-123',
    sellerId: 'seller-123',
    type: NegotiationType.BUY,
    status: NegotiationStatus.ACTIVE,
    startDate: null,
    endDate: null,
    initialMessage: 'I am interested',
    createdAt: new Date(),
    updatedAt: new Date(),
    property: { id: 'property-123', title: 'Test Property', basePrice: '250000', city: 'Budapest' },
    buyer: { id: 'buyer-123', firstName: 'Buyer', lastName: 'User' },
    seller: { id: 'seller-123', firstName: 'Seller', lastName: 'User' },
    offers: [],
  };

  const mockOffer = {
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
    updatedAt: new Date(),
    negotiation: mockNegotiation,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NegotiationsService,
        {
          provide: PrismaService,
          useValue: {
            property: {
              findUnique: jest.fn(),
            },
            negotiation: {
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            offer: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            transaction: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              count: jest.fn(),
            },
            $transaction: jest.fn(),
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

    service = module.get<NegotiationsService>(NegotiationsService);
    prismaService = module.get(PrismaService);
    notificationsService = module.get(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a negotiation successfully', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.negotiation.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback({
          negotiation: { create: jest.fn().mockResolvedValue(mockNegotiation) },
          offer: { create: jest.fn().mockResolvedValue(mockOffer) },
        });
      });
      (prismaService.negotiation.findUnique as jest.Mock).mockResolvedValue(mockNegotiation);

      const result = await service.create('buyer-123', {
        propertyId: 'property-123',
        type: NegotiationType.BUY,
        initialOfferAmount: 240000,
        message: 'I am interested',
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('negotiation-123');
      expect(notificationsService.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if property not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.create('buyer-123', {
          propertyId: 'invalid-property',
          type: NegotiationType.BUY,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if property not active', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue({
        ...mockProperty,
        status: PropertyStatus.DRAFT,
      });

      await expect(
        service.create('buyer-123', {
          propertyId: 'property-123',
          type: NegotiationType.BUY,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if buyer is the owner', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);

      await expect(
        service.create('seller-123', {
          propertyId: 'property-123',
          type: NegotiationType.BUY,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if active negotiation exists', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.negotiation.findFirst as jest.Mock).mockResolvedValue(mockNegotiation);

      await expect(
        service.create('buyer-123', {
          propertyId: 'property-123',
          type: NegotiationType.BUY,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return paginated negotiations for user as buyer', async () => {
      (prismaService.negotiation.findMany as jest.Mock).mockResolvedValue([mockNegotiation]);
      (prismaService.negotiation.count as jest.Mock).mockResolvedValue(1);

      const result = await service.findAll('buyer-123', { role: 'buying' });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should return paginated negotiations for user as seller', async () => {
      (prismaService.negotiation.findMany as jest.Mock).mockResolvedValue([mockNegotiation]);
      (prismaService.negotiation.count as jest.Mock).mockResolvedValue(1);

      const result = await service.findAll('seller-123', { role: 'selling' });

      expect(result.data).toHaveLength(1);
    });

    it('should filter by type and status', async () => {
      (prismaService.negotiation.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.negotiation.count as jest.Mock).mockResolvedValue(0);

      const result = await service.findAll('buyer-123', {
        type: NegotiationType.RENT,
        status: NegotiationStatus.ACCEPTED,
      });

      expect(result.data).toHaveLength(0);
    });
  });

  describe('findOne', () => {
    it('should return negotiation details', async () => {
      (prismaService.negotiation.findUnique as jest.Mock).mockResolvedValue(mockNegotiation);

      const result = await service.findOne('negotiation-123', 'buyer-123');

      expect(result.id).toBe('negotiation-123');
    });

    it('should throw NotFoundException if not found', async () => {
      (prismaService.negotiation.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.findOne('invalid-id', 'buyer-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user not a party', async () => {
      (prismaService.negotiation.findUnique as jest.Mock).mockResolvedValue(mockNegotiation);

      await expect(
        service.findOne('negotiation-123', 'other-user'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('cancel', () => {
    it('should cancel an active negotiation', async () => {
      (prismaService.negotiation.findUnique as jest.Mock).mockResolvedValue(mockNegotiation);
      (prismaService.negotiation.update as jest.Mock).mockResolvedValue({
        ...mockNegotiation,
        status: NegotiationStatus.REJECTED,
      });

      const result = await service.cancel('negotiation-123', 'buyer-123');

      expect(result.status).toBe(NegotiationStatus.REJECTED);
      expect(notificationsService.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if not found', async () => {
      (prismaService.negotiation.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.cancel('invalid-id', 'buyer-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user not a party', async () => {
      (prismaService.negotiation.findUnique as jest.Mock).mockResolvedValue(mockNegotiation);

      await expect(
        service.cancel('negotiation-123', 'other-user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if not active', async () => {
      (prismaService.negotiation.findUnique as jest.Mock).mockResolvedValue({
        ...mockNegotiation,
        status: NegotiationStatus.ACCEPTED,
      });

      await expect(
        service.cancel('negotiation-123', 'buyer-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('submitOffer', () => {
    it('should submit a new offer', async () => {
      (prismaService.negotiation.findUnique as jest.Mock).mockResolvedValue({
        ...mockNegotiation,
        offers: [],
      });
      (prismaService.offer.create as jest.Mock).mockResolvedValue(mockOffer);

      const result = await service.submitOffer('negotiation-123', 'buyer-123', {
        amount: 240000,
        currency: 'EUR',
        message: 'My offer',
      });

      expect(result.amount).toBe('240000');
      expect(notificationsService.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if negotiation not found', async () => {
      (prismaService.negotiation.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.submitOffer('invalid-id', 'buyer-123', {
          amount: 240000,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user not a party', async () => {
      (prismaService.negotiation.findUnique as jest.Mock).mockResolvedValue({
        ...mockNegotiation,
        offers: [],
      });

      await expect(
        service.submitOffer('negotiation-123', 'other-user', {
          amount: 240000,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if negotiation not active', async () => {
      (prismaService.negotiation.findUnique as jest.Mock).mockResolvedValue({
        ...mockNegotiation,
        status: NegotiationStatus.ACCEPTED,
        offers: [],
      });

      await expect(
        service.submitOffer('negotiation-123', 'buyer-123', {
          amount: 240000,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if waiting for response', async () => {
      (prismaService.negotiation.findUnique as jest.Mock).mockResolvedValue({
        ...mockNegotiation,
        offers: [{ ...mockOffer, madeById: 'buyer-123', status: OfferStatus.PENDING }],
      });

      await expect(
        service.submitOffer('negotiation-123', 'buyer-123', {
          amount: 245000,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('respondToOffer', () => {
    it('should accept an offer', async () => {
      (prismaService.offer.findUnique as jest.Mock).mockResolvedValue(mockOffer);
      (prismaService.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback({
          offer: { update: jest.fn().mockResolvedValue({ ...mockOffer, status: OfferStatus.ACCEPTED }) },
          negotiation: { update: jest.fn().mockResolvedValue({ ...mockNegotiation, status: NegotiationStatus.ACCEPTED }) },
          transaction: { create: jest.fn().mockResolvedValue({}) },
        });
      });

      const result = await service.respondToOffer('offer-123', 'seller-123', {
        action: 'accept',
      });

      expect(result).toBeDefined();
      expect(notificationsService.create).toHaveBeenCalled();
    });

    it('should reject an offer', async () => {
      (prismaService.offer.findUnique as jest.Mock).mockResolvedValue(mockOffer);
      (prismaService.offer.update as jest.Mock).mockResolvedValue({
        ...mockOffer,
        status: OfferStatus.REJECTED,
      });
      (prismaService.negotiation.findUnique as jest.Mock).mockResolvedValue(mockNegotiation);

      const result = await service.respondToOffer('offer-123', 'seller-123', {
        action: 'reject',
        message: 'Too low',
      });

      expect(result).toBeDefined();
      expect(notificationsService.create).toHaveBeenCalled();
    });

    it('should counter an offer', async () => {
      (prismaService.offer.findUnique as jest.Mock).mockResolvedValue(mockOffer);
      (prismaService.offer.update as jest.Mock).mockResolvedValue({
        ...mockOffer,
        status: OfferStatus.COUNTERED,
      });
      (prismaService.offer.create as jest.Mock).mockResolvedValue({
        ...mockOffer,
        id: 'counter-offer-123',
        madeById: 'seller-123',
        amount: '245000',
      });
      (prismaService.negotiation.findUnique as jest.Mock).mockResolvedValue(mockNegotiation);

      const result = await service.respondToOffer('offer-123', 'seller-123', {
        action: 'counter',
        counterAmount: 245000,
      });

      expect(result).toBeDefined();
      expect(notificationsService.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if offer not found', async () => {
      (prismaService.offer.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.respondToOffer('invalid-id', 'seller-123', { action: 'accept' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if responding to own offer', async () => {
      (prismaService.offer.findUnique as jest.Mock).mockResolvedValue(mockOffer);

      await expect(
        service.respondToOffer('offer-123', 'buyer-123', { action: 'accept' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if user not a party', async () => {
      (prismaService.offer.findUnique as jest.Mock).mockResolvedValue(mockOffer);

      await expect(
        service.respondToOffer('offer-123', 'other-user', { action: 'accept' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if offer not pending', async () => {
      (prismaService.offer.findUnique as jest.Mock).mockResolvedValue({
        ...mockOffer,
        status: OfferStatus.ACCEPTED,
      });

      await expect(
        service.respondToOffer('offer-123', 'seller-123', { action: 'accept' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if counter without amount', async () => {
      (prismaService.offer.findUnique as jest.Mock).mockResolvedValue(mockOffer);

      await expect(
        service.respondToOffer('offer-123', 'seller-123', { action: 'counter' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getTransaction', () => {
    it('should return transaction for negotiation', async () => {
      const mockTransaction = {
        id: 'transaction-123',
        negotiationId: 'negotiation-123',
        amount: '240000',
        currency: 'EUR',
        status: 'PENDING',
      };

      (prismaService.negotiation.findUnique as jest.Mock).mockResolvedValue(mockNegotiation);
      (prismaService.transaction.findUnique as jest.Mock).mockResolvedValue(mockTransaction);

      const result = await service.getTransaction('negotiation-123', 'buyer-123');

      expect(result.id).toBe('transaction-123');
    });

    it('should throw NotFoundException if negotiation not found', async () => {
      (prismaService.negotiation.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getTransaction('invalid-id', 'buyer-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user not a party', async () => {
      (prismaService.negotiation.findUnique as jest.Mock).mockResolvedValue(mockNegotiation);

      await expect(
        service.getTransaction('negotiation-123', 'other-user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if transaction not found', async () => {
      (prismaService.negotiation.findUnique as jest.Mock).mockResolvedValue(mockNegotiation);
      (prismaService.transaction.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getTransaction('negotiation-123', 'buyer-123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTransactionHistory', () => {
    it('should return paginated transaction history', async () => {
      const mockTransaction = {
        id: 'transaction-123',
        negotiationId: 'negotiation-123',
        amount: '240000',
        negotiation: {
          id: 'negotiation-123',
          property: { id: 'property-123', title: 'Test Property' },
        },
      };

      (prismaService.transaction.findMany as jest.Mock).mockResolvedValue([mockTransaction]);
      (prismaService.transaction.count as jest.Mock).mockResolvedValue(1);

      const result = await service.getTransactionHistory('buyer-123', 1, 20);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });
});
