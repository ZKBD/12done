import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/database';
import {
  NegotiationStatus,
  NegotiationType,
  OfferStatus,
  TransactionStatus,
  NotificationType,
  Prisma,
} from '@prisma/client';
import {
  CreateNegotiationDto,
  CreateOfferDto,
  RespondToOfferDto,
  NegotiationQueryDto,
  NegotiationResponseDto,
  NegotiationListResponseDto,
  OfferResponseDto,
} from './dto/negotiation.dto';
import { NotificationsService } from '../notifications/notifications.service';

// Platform fee rate (5% MVP default)
const PLATFORM_FEE_RATE = 0.05;

@Injectable()
export class NegotiationsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  // ============================================
  // NEGOTIATION CRUD (PROD-090)
  // ============================================

  /**
   * Start a new negotiation for a property (PROD-090.3)
   */
  async create(
    buyerId: string,
    dto: CreateNegotiationDto,
  ): Promise<NegotiationResponseDto> {
    // Verify property exists and is available
    const property = await this.prisma.property.findUnique({
      where: { id: dto.propertyId },
      include: { owner: true },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.status !== 'ACTIVE') {
      throw new BadRequestException('Property is not available for negotiation');
    }

    // Buyer cannot negotiate on their own property
    if (property.ownerId === buyerId) {
      throw new ForbiddenException('Cannot negotiate on your own property');
    }

    // Check for existing active negotiation
    const existingNegotiation = await this.prisma.negotiation.findFirst({
      where: {
        propertyId: dto.propertyId,
        buyerId,
        status: NegotiationStatus.ACTIVE,
      },
    });

    if (existingNegotiation) {
      throw new ConflictException(
        'You already have an active negotiation for this property',
      );
    }

    // Create negotiation with optional initial offer
    const negotiation = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const negotiation = await tx.negotiation.create({
        data: {
          propertyId: dto.propertyId,
          buyerId,
          sellerId: property.ownerId,
          type: dto.type,
          startDate: dto.startDate ? new Date(dto.startDate) : null,
          endDate: dto.endDate ? new Date(dto.endDate) : null,
          initialMessage: dto.message,
        },
        include: {
          property: {
            select: { id: true, title: true, basePrice: true, city: true },
          },
          buyer: { select: { id: true, firstName: true, lastName: true } },
          seller: { select: { id: true, firstName: true, lastName: true } },
          offers: true,
        },
      });

      // Create initial offer if amount provided
      if (dto.initialOfferAmount !== undefined) {
        await tx.offer.create({
          data: {
            negotiationId: negotiation.id,
            madeById: buyerId,
            amount: dto.initialOfferAmount,
            currency: dto.currency || 'EUR',
            message: dto.message,
          },
        });
      }

      return negotiation;
    });

    // Send notification to seller
    await this.notificationsService.create(
      property.ownerId,
      NotificationType.NEGOTIATION_STARTED,
      'New Negotiation Request',
      `Someone is interested in ${property.title}`,
      {
        negotiationId: negotiation.id,
        propertyId: property.id,
        buyerId,
      },
    );

    // Fetch the full negotiation with offers
    const fullNegotiation = await this.prisma.negotiation.findUnique({
      where: { id: negotiation.id },
      include: {
        property: {
          select: { id: true, title: true, basePrice: true, city: true },
        },
        buyer: { select: { id: true, firstName: true, lastName: true } },
        seller: { select: { id: true, firstName: true, lastName: true } },
        offers: { orderBy: { createdAt: 'asc' } },
      },
    });

    return this.mapToResponseDto(fullNegotiation);
  }

  /**
   * List negotiations for a user (PROD-091)
   */
  async findAll(
    userId: string,
    query: NegotiationQueryDto,
  ): Promise<NegotiationListResponseDto> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.NegotiationWhereInput = {};

    // Role filter
    if (query.role === 'buying') {
      where.buyerId = userId;
    } else if (query.role === 'selling') {
      where.sellerId = userId;
    } else {
      where.OR = [{ buyerId: userId }, { sellerId: userId }];
    }

    // Type filter
    if (query.type) {
      where.type = query.type;
    }

    // Status filter
    if (query.status) {
      where.status = query.status;
    }

    const [negotiations, total] = await Promise.all([
      this.prisma.negotiation.findMany({
        where,
        include: {
          property: {
            select: { id: true, title: true, basePrice: true, city: true },
          },
          buyer: { select: { id: true, firstName: true, lastName: true } },
          seller: { select: { id: true, firstName: true, lastName: true } },
          offers: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.negotiation.count({ where }),
    ]);

    return {
      data: negotiations.map((n) => this.mapToResponseDto(n)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get negotiation details (PROD-091)
   */
  async findOne(id: string, userId: string): Promise<NegotiationResponseDto> {
    const negotiation = await this.prisma.negotiation.findUnique({
      where: { id },
      include: {
        property: {
          select: { id: true, title: true, basePrice: true, city: true },
        },
        buyer: { select: { id: true, firstName: true, lastName: true } },
        seller: { select: { id: true, firstName: true, lastName: true } },
        offers: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!negotiation) {
      throw new NotFoundException('Negotiation not found');
    }

    // Only buyer and seller can view
    if (negotiation.buyerId !== userId && negotiation.sellerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.mapToResponseDto(negotiation);
  }

  /**
   * Cancel/withdraw from negotiation (PROD-090.8)
   */
  async cancel(id: string, userId: string): Promise<NegotiationResponseDto> {
    const negotiation = await this.prisma.negotiation.findUnique({
      where: { id },
      include: {
        property: {
          select: { id: true, title: true, basePrice: true, city: true },
        },
        buyer: { select: { id: true, firstName: true, lastName: true } },
        seller: { select: { id: true, firstName: true, lastName: true } },
        offers: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!negotiation) {
      throw new NotFoundException('Negotiation not found');
    }

    if (negotiation.buyerId !== userId && negotiation.sellerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (negotiation.status !== NegotiationStatus.ACTIVE) {
      throw new BadRequestException('Negotiation is not active');
    }

    const updated = await this.prisma.negotiation.update({
      where: { id },
      data: { status: NegotiationStatus.REJECTED },
      include: {
        property: {
          select: { id: true, title: true, basePrice: true, city: true },
        },
        buyer: { select: { id: true, firstName: true, lastName: true } },
        seller: { select: { id: true, firstName: true, lastName: true } },
        offers: { orderBy: { createdAt: 'asc' } },
      },
    });

    // Notify the other party
    const otherPartyId =
      userId === negotiation.buyerId
        ? negotiation.sellerId
        : negotiation.buyerId;

    await this.notificationsService.create(
      otherPartyId,
      NotificationType.OFFER_REJECTED,
      'Negotiation Cancelled',
      'The other party has cancelled the negotiation',
      { negotiationId: id },
    );

    return this.mapToResponseDto(updated);
  }

  // ============================================
  // OFFER FLOW (PROD-090.5 - PROD-090.7)
  // ============================================

  /**
   * Submit an offer on a negotiation (PROD-090.5)
   */
  async submitOffer(
    negotiationId: string,
    userId: string,
    dto: CreateOfferDto,
  ): Promise<OfferResponseDto> {
    const negotiation = await this.prisma.negotiation.findUnique({
      where: { id: negotiationId },
      include: { offers: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    if (!negotiation) {
      throw new NotFoundException('Negotiation not found');
    }

    // Only buyer and seller can submit offers
    if (negotiation.buyerId !== userId && negotiation.sellerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (negotiation.status !== NegotiationStatus.ACTIVE) {
      throw new BadRequestException('Negotiation is not active');
    }

    // Check if user can make an offer (turn-based)
    const lastOffer = negotiation.offers[0];
    if (lastOffer && lastOffer.madeById === userId && lastOffer.status === OfferStatus.PENDING) {
      throw new BadRequestException('Waiting for response to your previous offer');
    }

    // If countering, verify the counter target
    if (dto.counterToId) {
      const counterTarget = await this.prisma.offer.findUnique({
        where: { id: dto.counterToId },
      });

      if (!counterTarget || counterTarget.negotiationId !== negotiationId) {
        throw new BadRequestException('Invalid counter-offer target');
      }

      if (counterTarget.status !== OfferStatus.PENDING) {
        throw new BadRequestException('Cannot counter a non-pending offer');
      }

      // Mark the countered offer
      await this.prisma.offer.update({
        where: { id: dto.counterToId },
        data: { status: OfferStatus.COUNTERED, respondedAt: new Date() },
      });
    }

    const offer = await this.prisma.offer.create({
      data: {
        negotiationId,
        madeById: userId,
        amount: dto.amount,
        currency: dto.currency || 'EUR',
        terms: dto.terms as Prisma.InputJsonValue,
        message: dto.message,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        counterToId: dto.counterToId,
      },
    });

    // Notify the other party
    const otherPartyId =
      userId === negotiation.buyerId
        ? negotiation.sellerId
        : negotiation.buyerId;

    await this.notificationsService.create(
      otherPartyId,
      dto.counterToId
        ? NotificationType.OFFER_COUNTERED
        : NotificationType.OFFER_RECEIVED,
      dto.counterToId ? 'Counter-Offer Received' : 'New Offer Received',
      `You have a new ${dto.counterToId ? 'counter-' : ''}offer for ${dto.amount} ${dto.currency || 'EUR'}`,
      { negotiationId, offerId: offer.id },
    );

    return this.mapOfferToDto(offer);
  }

  /**
   * Respond to an offer - accept, reject, or counter (PROD-090.6, PROD-090.7)
   */
  async respondToOffer(
    offerId: string,
    userId: string,
    dto: RespondToOfferDto,
  ): Promise<NegotiationResponseDto> {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: { negotiation: true },
    });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    const negotiation = offer.negotiation;

    // Only the other party can respond
    if (offer.madeById === userId) {
      throw new ForbiddenException('Cannot respond to your own offer');
    }

    if (negotiation.buyerId !== userId && negotiation.sellerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (offer.status !== OfferStatus.PENDING) {
      throw new BadRequestException('Offer is not pending');
    }

    if (negotiation.status !== NegotiationStatus.ACTIVE) {
      throw new BadRequestException('Negotiation is not active');
    }

    let updatedNegotiation;

    if (dto.action === 'accept') {
      // Accept the offer (PROD-090.6)
      updatedNegotiation = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Update offer status
        await tx.offer.update({
          where: { id: offerId },
          data: { status: OfferStatus.ACCEPTED, respondedAt: new Date() },
        });

        // Update negotiation status
        const updated = await tx.negotiation.update({
          where: { id: negotiation.id },
          data: { status: NegotiationStatus.ACCEPTED },
          include: {
            property: {
              select: { id: true, title: true, basePrice: true, city: true },
            },
            buyer: { select: { id: true, firstName: true, lastName: true } },
            seller: { select: { id: true, firstName: true, lastName: true } },
            offers: { orderBy: { createdAt: 'asc' } },
          },
        });

        // Create pending transaction
        const amount = Number(offer.amount);
        const platformFee = amount * PLATFORM_FEE_RATE;
        const sellerAmount = amount - platformFee;

        await tx.transaction.create({
          data: {
            negotiationId: negotiation.id,
            amount: offer.amount,
            currency: offer.currency,
            platformFee,
            platformFeeRate: PLATFORM_FEE_RATE,
            sellerAmount,
            payerId: negotiation.buyerId,
            status: TransactionStatus.PENDING,
          },
        });

        return updated;
      });

      // Notify the offer maker
      await this.notificationsService.create(
        offer.madeById,
        NotificationType.OFFER_ACCEPTED,
        'Offer Accepted!',
        'Your offer has been accepted. Proceed to payment.',
        { negotiationId: negotiation.id, offerId },
      );
    } else if (dto.action === 'reject') {
      // Reject the offer (PROD-090.7)
      await this.prisma.offer.update({
        where: { id: offerId },
        data: { status: OfferStatus.REJECTED, respondedAt: new Date() },
      });

      updatedNegotiation = await this.prisma.negotiation.findUnique({
        where: { id: negotiation.id },
        include: {
          property: {
            select: { id: true, title: true, basePrice: true, city: true },
          },
          buyer: { select: { id: true, firstName: true, lastName: true } },
          seller: { select: { id: true, firstName: true, lastName: true } },
          offers: { orderBy: { createdAt: 'asc' } },
        },
      });

      // Notify the offer maker
      await this.notificationsService.create(
        offer.madeById,
        NotificationType.OFFER_REJECTED,
        'Offer Rejected',
        dto.message || 'Your offer has been rejected.',
        { negotiationId: negotiation.id, offerId },
      );
    } else if (dto.action === 'counter') {
      // Counter the offer (creates new offer)
      if (dto.counterAmount === undefined) {
        throw new BadRequestException('Counter amount is required');
      }

      // Mark original offer as countered
      await this.prisma.offer.update({
        where: { id: offerId },
        data: { status: OfferStatus.COUNTERED, respondedAt: new Date() },
      });

      // Create counter-offer
      await this.prisma.offer.create({
        data: {
          negotiationId: negotiation.id,
          madeById: userId,
          amount: dto.counterAmount,
          currency: offer.currency,
          terms: dto.counterTerms as Prisma.InputJsonValue,
          message: dto.message,
          counterToId: offerId,
        },
      });

      updatedNegotiation = await this.prisma.negotiation.findUnique({
        where: { id: negotiation.id },
        include: {
          property: {
            select: { id: true, title: true, basePrice: true, city: true },
          },
          buyer: { select: { id: true, firstName: true, lastName: true } },
          seller: { select: { id: true, firstName: true, lastName: true } },
          offers: { orderBy: { createdAt: 'asc' } },
        },
      });

      // Notify the offer maker
      await this.notificationsService.create(
        offer.madeById,
        NotificationType.OFFER_COUNTERED,
        'Counter-Offer Received',
        `You received a counter-offer for ${dto.counterAmount} ${offer.currency}`,
        { negotiationId: negotiation.id },
      );
    }

    return this.mapToResponseDto(updatedNegotiation);
  }

  // ============================================
  // TRANSACTION TRACKING (PROD-095)
  // ============================================

  /**
   * Get transaction for a negotiation
   */
  async getTransaction(negotiationId: string, userId: string) {
    const negotiation = await this.prisma.negotiation.findUnique({
      where: { id: negotiationId },
    });

    if (!negotiation) {
      throw new NotFoundException('Negotiation not found');
    }

    if (negotiation.buyerId !== userId && negotiation.sellerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const transaction = await this.prisma.transaction.findUnique({
      where: { negotiationId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  /**
   * List user's transactions
   */
  async getTransactionHistory(
    userId: string,
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where: {
          OR: [
            { payerId: userId },
            { negotiation: { sellerId: userId } },
          ],
        },
        include: {
          negotiation: {
            select: {
              id: true,
              property: {
                select: { id: true, title: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.transaction.count({
        where: {
          OR: [
            { payerId: userId },
            { negotiation: { sellerId: userId } },
          ],
        },
      }),
    ]);

    return {
      data: transactions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================
  // HELPERS
  // ============================================

  private mapToResponseDto(negotiation: any): NegotiationResponseDto {
    return {
      id: negotiation.id,
      propertyId: negotiation.propertyId,
      buyerId: negotiation.buyerId,
      sellerId: negotiation.sellerId,
      type: negotiation.type,
      status: negotiation.status,
      startDate: negotiation.startDate,
      endDate: negotiation.endDate,
      initialMessage: negotiation.initialMessage,
      offers: (negotiation.offers || []).map((o: any) => this.mapOfferToDto(o)),
      createdAt: negotiation.createdAt,
      updatedAt: negotiation.updatedAt,
      property: negotiation.property
        ? {
            id: negotiation.property.id,
            title: negotiation.property.title,
            basePrice: negotiation.property.basePrice?.toString(),
            city: negotiation.property.city,
          }
        : undefined,
      buyer: negotiation.buyer
        ? {
            id: negotiation.buyer.id,
            firstName: negotiation.buyer.firstName,
            lastName: negotiation.buyer.lastName,
          }
        : undefined,
      seller: negotiation.seller
        ? {
            id: negotiation.seller.id,
            firstName: negotiation.seller.firstName,
            lastName: negotiation.seller.lastName,
          }
        : undefined,
    };
  }

  private mapOfferToDto(offer: any): OfferResponseDto {
    return {
      id: offer.id,
      negotiationId: offer.negotiationId,
      madeById: offer.madeById,
      amount: offer.amount?.toString(),
      currency: offer.currency,
      terms: offer.terms,
      message: offer.message,
      status: offer.status,
      expiresAt: offer.expiresAt,
      respondedAt: offer.respondedAt,
      counterToId: offer.counterToId,
      createdAt: offer.createdAt,
    };
  }
}
