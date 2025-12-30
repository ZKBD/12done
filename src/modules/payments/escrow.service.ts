import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/database';
import {
  EscrowStatus,
  EscrowMilestoneStatus,
} from '@prisma/client';
import {
  CreateEscrowDto,
  EscrowResponseDto,
  CompleteMilestoneDto,
  ApproveMilestoneDto,
  RaiseDisputeDto,
  ResolveDisputeDto,
  EscrowDisputeResponseDto,
} from './dto';

@Injectable()
export class EscrowService {
  private readonly logger = new Logger(EscrowService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create an escrow for a transaction (PROD-097.1)
   */
  async createEscrow(
    userId: string,
    dto: CreateEscrowDto,
  ): Promise<EscrowResponseDto> {
    // Verify transaction exists and get negotiation for buyer/seller info
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: dto.transactionId },
      include: { negotiation: true },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Check if escrow already exists
    const existingEscrow = await this.prisma.escrow.findUnique({
      where: { transactionId: dto.transactionId },
    });

    if (existingEscrow) {
      throw new BadRequestException('Escrow already exists for this transaction');
    }

    // Get buyer and seller from negotiation
    const buyerId = transaction.negotiation.buyerId;
    const sellerId = transaction.negotiation.sellerId;

    // Verify user is buyer or seller
    if (buyerId !== userId && sellerId !== userId) {
      throw new ForbiddenException('Only buyer or seller can create escrow');
    }

    // Check threshold - only require escrow for amounts above threshold
    if (dto.thresholdAmount && transaction.amount.toNumber() < dto.thresholdAmount) {
      throw new BadRequestException(
        `Transaction amount (${transaction.amount}) is below escrow threshold (${dto.thresholdAmount})`,
      );
    }

    // Validate milestones sum equals total if provided
    if (dto.milestones && dto.milestones.length > 0) {
      const milestoneSum = dto.milestones.reduce((sum, m) => sum + m.amount, 0);
      if (Math.abs(milestoneSum - transaction.amount.toNumber()) > 0.01) {
        throw new BadRequestException(
          `Milestone amounts (${milestoneSum}) must equal transaction amount (${transaction.amount})`,
        );
      }
    }

    // Create escrow with milestones
    const escrow = await this.prisma.escrow.create({
      data: {
        transactionId: dto.transactionId,
        totalAmount: transaction.amount,
        currency: transaction.currency,
        buyerId,
        sellerId,
        thresholdAmount: dto.thresholdAmount,
        milestones: dto.milestones
          ? {
              create: dto.milestones.map((m, index) => ({
                title: m.title,
                description: m.description,
                amount: m.amount,
                conditions: m.conditions,
                orderIndex: index,
              })),
            }
          : undefined,
      },
      include: {
        milestones: { orderBy: { orderIndex: 'asc' } },
        disputes: true,
      },
    });

    this.logger.log(
      `Created escrow ${escrow.id} for transaction ${dto.transactionId}`,
    );

    return this.mapToResponse(escrow);
  }

  /**
   * Get escrow by ID (PROD-097.3)
   */
  async getEscrow(userId: string, escrowId: string): Promise<EscrowResponseDto> {
    const escrow = await this.prisma.escrow.findUnique({
      where: { id: escrowId },
      include: {
        milestones: { orderBy: { orderIndex: 'asc' } },
        disputes: true,
      },
    });

    if (!escrow) {
      throw new NotFoundException('Escrow not found');
    }

    // Check access (buyer or seller)
    if (escrow.buyerId !== userId && escrow.sellerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.mapToResponse(escrow);
  }

  /**
   * Get escrow by transaction ID
   */
  async getEscrowByTransaction(
    userId: string,
    transactionId: string,
  ): Promise<EscrowResponseDto> {
    const escrow = await this.prisma.escrow.findUnique({
      where: { transactionId },
      include: {
        milestones: { orderBy: { orderIndex: 'asc' } },
        disputes: true,
      },
    });

    if (!escrow) {
      throw new NotFoundException('Escrow not found for this transaction');
    }

    // Check access
    if (escrow.buyerId !== userId && escrow.sellerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.mapToResponse(escrow);
  }

  /**
   * Fund escrow (PROD-097.3)
   */
  async fundEscrow(
    userId: string,
    escrowId: string,
  ): Promise<{ sessionUrl: string }> {
    const escrow = await this.prisma.escrow.findUnique({
      where: { id: escrowId },
    });

    if (!escrow) {
      throw new NotFoundException('Escrow not found');
    }

    // Only buyer can fund
    if (escrow.buyerId !== userId) {
      throw new ForbiddenException('Only buyer can fund escrow');
    }

    if (escrow.status !== EscrowStatus.PENDING) {
      throw new BadRequestException('Escrow is not in pending status');
    }

    // In production, create Stripe checkout session
    // For now, return mock URL
    const mockSessionId = `mock_escrow_${escrowId}_${Date.now()}`;

    // Store session ID in providerReference field
    await this.prisma.escrow.update({
      where: { id: escrowId },
      data: { providerReference: mockSessionId },
    });

    return {
      sessionUrl: `/escrow/${escrowId}/checkout?session=${mockSessionId}`,
    };
  }

  /**
   * Complete escrow funding (for mock/testing)
   */
  async completeFunding(escrowId: string): Promise<EscrowResponseDto> {
    const escrow = await this.prisma.escrow.findUnique({
      where: { id: escrowId },
      include: {
        milestones: { orderBy: { orderIndex: 'asc' } },
        disputes: true,
      },
    });

    if (!escrow) {
      throw new NotFoundException('Escrow not found');
    }

    if (escrow.status === EscrowStatus.FUNDED) {
      return this.mapToResponse(escrow);
    }

    const updated = await this.prisma.escrow.update({
      where: { id: escrowId },
      data: {
        status: EscrowStatus.FUNDED,
        heldAmount: escrow.totalAmount,
        fundedAt: new Date(),
      },
      include: {
        milestones: { orderBy: { orderIndex: 'asc' } },
        disputes: true,
      },
    });

    this.logger.log(`Escrow ${escrowId} funded`);

    return this.mapToResponse(updated);
  }

  /**
   * Complete a milestone (PROD-097.4) - seller marks work done
   */
  async completeMilestone(
    userId: string,
    escrowId: string,
    milestoneId: string,
    dto: CompleteMilestoneDto,
  ): Promise<EscrowResponseDto> {
    const escrow = await this.prisma.escrow.findUnique({
      where: { id: escrowId },
      include: {
        milestones: { orderBy: { orderIndex: 'asc' } },
        disputes: true,
      },
    });

    if (!escrow) {
      throw new NotFoundException('Escrow not found');
    }

    // Only seller can mark milestone as completed
    if (escrow.sellerId !== userId) {
      throw new ForbiddenException('Only seller can complete milestones');
    }

    if (escrow.status !== EscrowStatus.FUNDED && escrow.status !== EscrowStatus.PARTIAL_RELEASE) {
      throw new BadRequestException('Escrow must be funded first');
    }

    const milestone = escrow.milestones.find((m) => m.id === milestoneId);
    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    if (milestone.status !== EscrowMilestoneStatus.PENDING) {
      throw new BadRequestException('Milestone is not in pending status');
    }

    // Check previous milestones are completed
    const previousIncomplete = escrow.milestones.find(
      (m) => m.orderIndex < milestone.orderIndex && m.status === EscrowMilestoneStatus.PENDING,
    );
    if (previousIncomplete) {
      throw new BadRequestException('Previous milestones must be completed first');
    }

    await this.prisma.escrowMilestone.update({
      where: { id: milestoneId },
      data: {
        status: EscrowMilestoneStatus.COMPLETED,
        completedAt: new Date(),
        evidence: dto.evidence,
      },
    });

    // Refresh escrow
    const updated = await this.prisma.escrow.findUnique({
      where: { id: escrowId },
      include: {
        milestones: { orderBy: { orderIndex: 'asc' } },
        disputes: true,
      },
    });

    this.logger.log(`Milestone ${milestoneId} completed for escrow ${escrowId}`);

    return this.mapToResponse(updated!);
  }

  /**
   * Approve milestone release (PROD-097.4) - buyer approves payment
   */
  async approveMilestoneRelease(
    userId: string,
    escrowId: string,
    milestoneId: string,
    dto: ApproveMilestoneDto,
  ): Promise<EscrowResponseDto> {
    const escrow = await this.prisma.escrow.findUnique({
      where: { id: escrowId },
      include: {
        milestones: { orderBy: { orderIndex: 'asc' } },
        disputes: true,
      },
    });

    if (!escrow) {
      throw new NotFoundException('Escrow not found');
    }

    // Only buyer can approve release
    if (escrow.buyerId !== userId) {
      throw new ForbiddenException('Only buyer can approve milestone release');
    }

    const milestone = escrow.milestones.find((m) => m.id === milestoneId);
    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    if (milestone.status !== EscrowMilestoneStatus.COMPLETED) {
      throw new BadRequestException('Milestone must be completed first');
    }

    // Update milestone status
    await this.prisma.escrowMilestone.update({
      where: { id: milestoneId },
      data: {
        status: EscrowMilestoneStatus.RELEASED,
        approvedAt: new Date(),
        releasedAt: new Date(),
        approvalNotes: dto.notes,
      },
    });

    // Update escrow amounts
    const newReleasedAmount = escrow.releasedAmount.toNumber() + milestone.amount.toNumber();
    const newHeldAmount = escrow.heldAmount.toNumber() - milestone.amount.toNumber();

    // Check if all milestones are released
    const allReleased = escrow.milestones.every(
      (m) => m.id === milestoneId || m.status === EscrowMilestoneStatus.RELEASED,
    );

    const updated = await this.prisma.escrow.update({
      where: { id: escrowId },
      data: {
        releasedAmount: newReleasedAmount,
        heldAmount: newHeldAmount,
        status: allReleased ? EscrowStatus.RELEASED : EscrowStatus.PARTIAL_RELEASE,
        releasedAt: allReleased ? new Date() : undefined,
      },
      include: {
        milestones: { orderBy: { orderIndex: 'asc' } },
        disputes: true,
      },
    });

    this.logger.log(
      `Milestone ${milestoneId} released for escrow ${escrowId}, amount: ${milestone.amount}`,
    );

    return this.mapToResponse(updated);
  }

  /**
   * Raise a dispute (PROD-097.3)
   */
  async raiseDispute(
    userId: string,
    escrowId: string,
    dto: RaiseDisputeDto,
  ): Promise<EscrowDisputeResponseDto> {
    const escrow = await this.prisma.escrow.findUnique({
      where: { id: escrowId },
    });

    if (!escrow) {
      throw new NotFoundException('Escrow not found');
    }

    // Only buyer or seller can raise dispute
    if (escrow.buyerId !== userId && escrow.sellerId !== userId) {
      throw new ForbiddenException('Only buyer or seller can raise dispute');
    }

    if (
      escrow.status !== EscrowStatus.FUNDED &&
      escrow.status !== EscrowStatus.PARTIAL_RELEASE
    ) {
      throw new BadRequestException('Cannot dispute unfunded escrow');
    }

    // Check for existing open dispute
    const existingDispute = await this.prisma.escrowDispute.findFirst({
      where: { escrowId, status: 'OPEN' },
    });

    if (existingDispute) {
      throw new BadRequestException('An open dispute already exists');
    }

    // Create dispute
    const dispute = await this.prisma.escrowDispute.create({
      data: {
        escrowId,
        raisedById: userId,
        reason: dto.reason,
        evidence: dto.evidence,
        status: 'OPEN',
      },
    });

    // Update escrow status
    await this.prisma.escrow.update({
      where: { id: escrowId },
      data: {
        status: EscrowStatus.DISPUTED,
        disputedAt: new Date(),
      },
    });

    this.logger.log(`Dispute ${dispute.id} raised for escrow ${escrowId}`);

    return this.mapDisputeToResponse(dispute);
  }

  /**
   * Resolve a dispute (admin only in production)
   */
  async resolveDispute(
    disputeId: string,
    dto: ResolveDisputeDto,
  ): Promise<EscrowResponseDto> {
    const dispute = await this.prisma.escrowDispute.findUnique({
      where: { id: disputeId },
      include: { escrow: true },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    if (dispute.status !== 'OPEN') {
      throw new BadRequestException('Dispute is not open');
    }

    // Update dispute
    await this.prisma.escrowDispute.update({
      where: { id: disputeId },
      data: {
        status: 'RESOLVED',
        resolution: dto.resolution,
        resolvedAt: new Date(),
      },
    });

    // Apply resolution
    let newStatus: EscrowStatus;
    let releasedAmount = dispute.escrow.releasedAmount.toNumber();
    let heldAmount = dispute.escrow.heldAmount.toNumber();

    switch (dto.action) {
      case 'RELEASE_TO_SELLER':
        releasedAmount += heldAmount;
        heldAmount = 0;
        newStatus = EscrowStatus.RELEASED;
        break;
      case 'REFUND_TO_BUYER':
        heldAmount = 0;
        newStatus = EscrowStatus.REFUNDED;
        break;
      case 'PARTIAL_RELEASE':
        if (!dto.partialAmount || dto.partialAmount > heldAmount) {
          throw new BadRequestException('Invalid partial amount');
        }
        releasedAmount += dto.partialAmount;
        heldAmount -= dto.partialAmount;
        newStatus = heldAmount > 0 ? EscrowStatus.PARTIAL_RELEASE : EscrowStatus.RELEASED;
        break;
      default:
        throw new BadRequestException('Invalid action');
    }

    const updated = await this.prisma.escrow.update({
      where: { id: dispute.escrowId },
      data: {
        status: newStatus,
        releasedAmount,
        heldAmount,
        releasedAt: newStatus === EscrowStatus.RELEASED ? new Date() : undefined,
      },
      include: {
        milestones: { orderBy: { orderIndex: 'asc' } },
        disputes: true,
      },
    });

    this.logger.log(
      `Dispute ${disputeId} resolved with action ${dto.action} for escrow ${dispute.escrowId}`,
    );

    return this.mapToResponse(updated);
  }

  /**
   * Get disputes for an escrow
   */
  async getDisputes(
    userId: string,
    escrowId: string,
  ): Promise<EscrowDisputeResponseDto[]> {
    const escrow = await this.prisma.escrow.findUnique({
      where: { id: escrowId },
    });

    if (!escrow) {
      throw new NotFoundException('Escrow not found');
    }

    if (escrow.buyerId !== userId && escrow.sellerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const disputes = await this.prisma.escrowDispute.findMany({
      where: { escrowId },
      orderBy: { createdAt: 'desc' },
    });

    return disputes.map((d) => this.mapDisputeToResponse(d));
  }

  /**
   * Release all remaining funds to seller (no milestones)
   */
  async releaseFullEscrow(
    userId: string,
    escrowId: string,
  ): Promise<EscrowResponseDto> {
    const escrow = await this.prisma.escrow.findUnique({
      where: { id: escrowId },
      include: {
        milestones: { orderBy: { orderIndex: 'asc' } },
        disputes: true,
      },
    });

    if (!escrow) {
      throw new NotFoundException('Escrow not found');
    }

    // Only buyer can release
    if (escrow.buyerId !== userId) {
      throw new ForbiddenException('Only buyer can release escrow');
    }

    if (escrow.status !== EscrowStatus.FUNDED) {
      throw new BadRequestException('Escrow must be funded and not disputed');
    }

    // If milestones exist, must use milestone approval
    if (escrow.milestones.length > 0) {
      throw new BadRequestException(
        'Use milestone approval for milestone-based escrow',
      );
    }

    const updated = await this.prisma.escrow.update({
      where: { id: escrowId },
      data: {
        status: EscrowStatus.RELEASED,
        releasedAmount: escrow.totalAmount,
        heldAmount: 0,
        releasedAt: new Date(),
      },
      include: {
        milestones: { orderBy: { orderIndex: 'asc' } },
        disputes: true,
      },
    });

    this.logger.log(`Full escrow ${escrowId} released to seller`);

    return this.mapToResponse(updated);
  }

  /**
   * Cancel escrow (refund to buyer)
   */
  async cancelEscrow(
    userId: string,
    escrowId: string,
  ): Promise<EscrowResponseDto> {
    const escrow = await this.prisma.escrow.findUnique({
      where: { id: escrowId },
      include: {
        milestones: { orderBy: { orderIndex: 'asc' } },
        disputes: true,
      },
    });

    if (!escrow) {
      throw new NotFoundException('Escrow not found');
    }

    // Both parties must agree or escrow must be pending
    if (escrow.buyerId !== userId && escrow.sellerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (escrow.status === EscrowStatus.RELEASED) {
      throw new BadRequestException('Cannot cancel released escrow');
    }

    if (escrow.status === EscrowStatus.DISPUTED) {
      throw new BadRequestException('Cannot cancel disputed escrow');
    }

    // If funds released partially, cannot cancel
    if (escrow.releasedAmount.toNumber() > 0) {
      throw new BadRequestException(
        'Cannot cancel escrow with partial releases',
      );
    }

    const updated = await this.prisma.escrow.update({
      where: { id: escrowId },
      data: {
        status: EscrowStatus.CANCELLED,
        heldAmount: 0,
      },
      include: {
        milestones: { orderBy: { orderIndex: 'asc' } },
        disputes: true,
      },
    });

    this.logger.log(`Escrow ${escrowId} cancelled`);

    return this.mapToResponse(updated);
  }

  private mapToResponse(escrow: any): EscrowResponseDto {
    return {
      id: escrow.id,
      transactionId: escrow.transactionId,
      totalAmount: escrow.totalAmount.toString(),
      heldAmount: escrow.heldAmount.toString(),
      releasedAmount: escrow.releasedAmount.toString(),
      currency: escrow.currency,
      status: escrow.status,
      thresholdAmount: escrow.thresholdAmount?.toString() || null,
      buyerId: escrow.buyerId,
      sellerId: escrow.sellerId,
      providerName: escrow.providerName,
      fundedAt: escrow.fundedAt,
      releasedAt: escrow.releasedAt,
      disputedAt: escrow.disputedAt,
      milestones: escrow.milestones.map((m: any) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        amount: m.amount.toString(),
        orderIndex: m.orderIndex,
        conditions: m.conditions,
        status: m.status,
        completedAt: m.completedAt,
        approvedAt: m.approvedAt,
        releasedAt: m.releasedAt,
      })),
      createdAt: escrow.createdAt,
    };
  }

  private mapDisputeToResponse(dispute: any): EscrowDisputeResponseDto {
    return {
      id: dispute.id,
      escrowId: dispute.escrowId,
      raisedById: dispute.raisedById,
      reason: dispute.reason,
      evidence: dispute.evidence,
      status: dispute.status,
      resolution: dispute.resolution,
      resolvedAt: dispute.resolvedAt,
      createdAt: dispute.createdAt,
    };
  }
}
