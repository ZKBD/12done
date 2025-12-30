import { Test, TestingModule } from '@nestjs/testing';
import { EscrowService } from './escrow.service';
import { PrismaService } from '@/database';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EscrowStatus, EscrowMilestoneStatus } from '@prisma/client';

describe('EscrowService', () => {
  let service: EscrowService;
  let prismaService: PrismaService;

  const mockBuyerId = 'buyer-123';
  const mockSellerId = 'seller-123';
  const mockEscrowId = 'escrow-123';
  const mockTransactionId = 'transaction-123';
  const mockMilestoneId = 'milestone-1';
  const mockDisputeId = 'dispute-123';

  const mockMilestones = [
    {
      id: 'milestone-1',
      escrowId: mockEscrowId,
      title: 'Inspection',
      description: 'Property inspection',
      amount: { toNumber: () => 5000, toString: () => '5000' },
      orderIndex: 0,
      conditions: null,
      status: EscrowMilestoneStatus.PENDING,
      evidence: null,
      approvalNotes: null,
      completedAt: null,
      approvedAt: null,
      releasedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'milestone-2',
      escrowId: mockEscrowId,
      title: 'Final Transfer',
      description: 'Property transfer',
      amount: { toNumber: () => 5000, toString: () => '5000' },
      orderIndex: 1,
      conditions: null,
      status: EscrowMilestoneStatus.PENDING,
      evidence: null,
      approvalNotes: null,
      completedAt: null,
      approvedAt: null,
      releasedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockEscrow = {
    id: mockEscrowId,
    transactionId: mockTransactionId,
    totalAmount: { toNumber: () => 10000, toString: () => '10000' },
    heldAmount: { toNumber: () => 10000, toString: () => '10000' },
    releasedAmount: { toNumber: () => 0, toString: () => '0' },
    currency: 'EUR',
    status: EscrowStatus.FUNDED,
    thresholdAmount: null,
    buyerId: mockBuyerId,
    sellerId: mockSellerId,
    providerName: null,
    stripeSessionId: null,
    fundedAt: new Date(),
    releasedAt: null,
    disputedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    milestones: mockMilestones,
    disputes: [],
  };

  const mockTransaction = {
    id: mockTransactionId,
    amount: { toNumber: () => 10000 },
    currency: 'EUR',
    negotiation: {
      buyerId: mockBuyerId,
      sellerId: mockSellerId,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EscrowService,
        {
          provide: PrismaService,
          useValue: {
            escrow: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            escrowMilestone: {
              update: jest.fn(),
            },
            escrowDispute: {
              create: jest.fn(),
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
            },
            transaction: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<EscrowService>(EscrowService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('createEscrow', () => {
    const createDto = {
      transactionId: mockTransactionId,
      milestones: [
        { title: 'Inspection', amount: 5000 },
        { title: 'Final Transfer', amount: 5000 },
      ],
    };

    it('should create escrow with milestones', async () => {
      jest
        .spyOn(prismaService.transaction, 'findUnique')
        .mockResolvedValue(mockTransaction as any);
      jest.spyOn(prismaService.escrow, 'findUnique').mockResolvedValue(null);
      jest
        .spyOn(prismaService.escrow, 'create')
        .mockResolvedValue(mockEscrow as any);

      const result = await service.createEscrow(mockBuyerId, createDto);

      expect(result.id).toBe(mockEscrowId);
      expect(result.totalAmount).toBe('10000');
      expect(result.milestones).toHaveLength(2);
    });

    it('should throw NotFoundException if transaction not found', async () => {
      jest.spyOn(prismaService.transaction, 'findUnique').mockResolvedValue(null);

      await expect(
        service.createEscrow(mockBuyerId, createDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if escrow already exists', async () => {
      jest
        .spyOn(prismaService.transaction, 'findUnique')
        .mockResolvedValue(mockTransaction as any);
      jest
        .spyOn(prismaService.escrow, 'findUnique')
        .mockResolvedValue(mockEscrow as any);

      await expect(
        service.createEscrow(mockBuyerId, createDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException for non-party user', async () => {
      jest
        .spyOn(prismaService.transaction, 'findUnique')
        .mockResolvedValue(mockTransaction as any);
      jest.spyOn(prismaService.escrow, 'findUnique').mockResolvedValue(null);

      await expect(
        service.createEscrow('random-user', createDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw if milestone amounts do not equal total', async () => {
      jest
        .spyOn(prismaService.transaction, 'findUnique')
        .mockResolvedValue(mockTransaction as any);
      jest.spyOn(prismaService.escrow, 'findUnique').mockResolvedValue(null);

      const invalidDto = {
        transactionId: mockTransactionId,
        milestones: [
          { title: 'Inspection', amount: 3000 },
          { title: 'Final', amount: 3000 },
        ],
      };

      await expect(
        service.createEscrow(mockBuyerId, invalidDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if amount is below threshold', async () => {
      jest.spyOn(prismaService.transaction, 'findUnique').mockResolvedValue({
        ...mockTransaction,
        amount: { toNumber: () => 5000 },
      } as any);
      jest.spyOn(prismaService.escrow, 'findUnique').mockResolvedValue(null);

      const dtoWithThreshold = {
        transactionId: mockTransactionId,
        thresholdAmount: 10000,
      };

      await expect(
        service.createEscrow(mockBuyerId, dtoWithThreshold),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getEscrow', () => {
    it('should return escrow for buyer', async () => {
      jest
        .spyOn(prismaService.escrow, 'findUnique')
        .mockResolvedValue(mockEscrow as any);

      const result = await service.getEscrow(mockBuyerId, mockEscrowId);

      expect(result.id).toBe(mockEscrowId);
      expect(result.status).toBe(EscrowStatus.FUNDED);
    });

    it('should return escrow for seller', async () => {
      jest
        .spyOn(prismaService.escrow, 'findUnique')
        .mockResolvedValue(mockEscrow as any);

      const result = await service.getEscrow(mockSellerId, mockEscrowId);

      expect(result.id).toBe(mockEscrowId);
    });

    it('should throw NotFoundException if not found', async () => {
      jest.spyOn(prismaService.escrow, 'findUnique').mockResolvedValue(null);

      await expect(
        service.getEscrow(mockBuyerId, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for unauthorized user', async () => {
      jest
        .spyOn(prismaService.escrow, 'findUnique')
        .mockResolvedValue(mockEscrow as any);

      await expect(
        service.getEscrow('random-user', mockEscrowId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('fundEscrow', () => {
    const pendingEscrow = {
      ...mockEscrow,
      status: EscrowStatus.PENDING,
    };

    it('should create funding session for buyer', async () => {
      jest
        .spyOn(prismaService.escrow, 'findUnique')
        .mockResolvedValue(pendingEscrow as any);
      jest.spyOn(prismaService.escrow, 'update').mockResolvedValue({} as any);

      const result = await service.fundEscrow(mockBuyerId, mockEscrowId);

      expect(result.sessionUrl).toContain('/escrow/');
      expect(result.sessionUrl).toContain('/checkout');
    });

    it('should throw ForbiddenException for seller', async () => {
      jest
        .spyOn(prismaService.escrow, 'findUnique')
        .mockResolvedValue(pendingEscrow as any);

      await expect(
        service.fundEscrow(mockSellerId, mockEscrowId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw if already funded', async () => {
      jest
        .spyOn(prismaService.escrow, 'findUnique')
        .mockResolvedValue(mockEscrow as any);

      await expect(
        service.fundEscrow(mockBuyerId, mockEscrowId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('completeFunding', () => {
    it('should complete funding', async () => {
      const pendingEscrow = { ...mockEscrow, status: EscrowStatus.PENDING };
      jest
        .spyOn(prismaService.escrow, 'findUnique')
        .mockResolvedValue(pendingEscrow as any);
      jest.spyOn(prismaService.escrow, 'update').mockResolvedValue({
        ...mockEscrow,
        status: EscrowStatus.FUNDED,
      } as any);

      const result = await service.completeFunding(mockEscrowId);

      expect(result.status).toBe(EscrowStatus.FUNDED);
    });

    it('should return existing if already funded', async () => {
      jest
        .spyOn(prismaService.escrow, 'findUnique')
        .mockResolvedValue(mockEscrow as any);

      const result = await service.completeFunding(mockEscrowId);

      expect(result.status).toBe(EscrowStatus.FUNDED);
      expect(prismaService.escrow.update).not.toHaveBeenCalled();
    });
  });

  describe('completeMilestone', () => {
    it('should complete milestone by seller', async () => {
      jest
        .spyOn(prismaService.escrow, 'findUnique')
        .mockResolvedValueOnce(mockEscrow as any)
        .mockResolvedValueOnce({
          ...mockEscrow,
          milestones: [
            { ...mockMilestones[0], status: EscrowMilestoneStatus.COMPLETED },
            mockMilestones[1],
          ],
        } as any);
      jest
        .spyOn(prismaService.escrowMilestone, 'update')
        .mockResolvedValue({} as any);

      const result = await service.completeMilestone(
        mockSellerId,
        mockEscrowId,
        mockMilestoneId,
        { evidence: 'https://example.com/report.pdf' },
      );

      expect(result).toBeDefined();
      expect(prismaService.escrowMilestone.update).toHaveBeenCalled();
    });

    it('should throw ForbiddenException for buyer', async () => {
      jest
        .spyOn(prismaService.escrow, 'findUnique')
        .mockResolvedValue(mockEscrow as any);

      await expect(
        service.completeMilestone(mockBuyerId, mockEscrowId, mockMilestoneId, {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw if escrow not funded', async () => {
      jest.spyOn(prismaService.escrow, 'findUnique').mockResolvedValue({
        ...mockEscrow,
        status: EscrowStatus.PENDING,
      } as any);

      await expect(
        service.completeMilestone(mockSellerId, mockEscrowId, mockMilestoneId, {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if milestone not found', async () => {
      jest
        .spyOn(prismaService.escrow, 'findUnique')
        .mockResolvedValue(mockEscrow as any);

      await expect(
        service.completeMilestone(mockSellerId, mockEscrowId, 'nonexistent', {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if previous milestone not completed', async () => {
      jest
        .spyOn(prismaService.escrow, 'findUnique')
        .mockResolvedValue(mockEscrow as any);

      await expect(
        service.completeMilestone(mockSellerId, mockEscrowId, 'milestone-2', {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('approveMilestoneRelease', () => {
    const escrowWithCompletedMilestone = {
      ...mockEscrow,
      milestones: [
        { ...mockMilestones[0], status: EscrowMilestoneStatus.COMPLETED },
        mockMilestones[1],
      ],
    };

    it('should approve and release milestone by buyer', async () => {
      jest
        .spyOn(prismaService.escrow, 'findUnique')
        .mockResolvedValue(escrowWithCompletedMilestone as any);
      jest
        .spyOn(prismaService.escrowMilestone, 'update')
        .mockResolvedValue({} as any);
      jest.spyOn(prismaService.escrow, 'update').mockResolvedValue({
        ...mockEscrow,
        status: EscrowStatus.PARTIAL_RELEASE,
        releasedAmount: { toString: () => '5000' },
        heldAmount: { toString: () => '5000' },
        milestones: [
          { ...mockMilestones[0], status: EscrowMilestoneStatus.RELEASED },
          mockMilestones[1],
        ],
      } as any);

      const result = await service.approveMilestoneRelease(
        mockBuyerId,
        mockEscrowId,
        mockMilestoneId,
        { notes: 'Approved' },
      );

      expect(result.status).toBe(EscrowStatus.PARTIAL_RELEASE);
    });

    it('should throw ForbiddenException for seller', async () => {
      jest
        .spyOn(prismaService.escrow, 'findUnique')
        .mockResolvedValue(escrowWithCompletedMilestone as any);

      await expect(
        service.approveMilestoneRelease(
          mockSellerId,
          mockEscrowId,
          mockMilestoneId,
          {},
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw if milestone not completed', async () => {
      jest
        .spyOn(prismaService.escrow, 'findUnique')
        .mockResolvedValue(mockEscrow as any);

      await expect(
        service.approveMilestoneRelease(
          mockBuyerId,
          mockEscrowId,
          mockMilestoneId,
          {},
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should set RELEASED status when all milestones released', async () => {
      const escrowWithAllButOneReleased = {
        ...mockEscrow,
        milestones: [
          { ...mockMilestones[0], status: EscrowMilestoneStatus.RELEASED },
          { ...mockMilestones[1], status: EscrowMilestoneStatus.COMPLETED },
        ],
      };

      jest
        .spyOn(prismaService.escrow, 'findUnique')
        .mockResolvedValue(escrowWithAllButOneReleased as any);
      jest
        .spyOn(prismaService.escrowMilestone, 'update')
        .mockResolvedValue({} as any);
      jest.spyOn(prismaService.escrow, 'update').mockResolvedValue({
        ...mockEscrow,
        status: EscrowStatus.RELEASED,
        releasedAmount: { toString: () => '10000' },
        heldAmount: { toString: () => '0' },
        milestones: mockMilestones.map((m) => ({
          ...m,
          status: EscrowMilestoneStatus.RELEASED,
        })),
      } as any);

      const result = await service.approveMilestoneRelease(
        mockBuyerId,
        mockEscrowId,
        'milestone-2',
        {},
      );

      expect(result.status).toBe(EscrowStatus.RELEASED);
    });
  });

  describe('raiseDispute', () => {
    it('should raise dispute for buyer', async () => {
      jest
        .spyOn(prismaService.escrow, 'findUnique')
        .mockResolvedValue(mockEscrow as any);
      jest.spyOn(prismaService.escrowDispute, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prismaService.escrowDispute, 'create').mockResolvedValue({
        id: mockDisputeId,
        escrowId: mockEscrowId,
        raisedById: mockBuyerId,
        reason: 'Property condition issues',
        evidence: null,
        status: 'OPEN',
        resolution: null,
        resolvedAt: null,
        createdAt: new Date(),
      } as any);
      jest.spyOn(prismaService.escrow, 'update').mockResolvedValue({} as any);

      const result = await service.raiseDispute(mockBuyerId, mockEscrowId, {
        reason: 'Property condition issues',
      });

      expect(result.id).toBe(mockDisputeId);
      expect(result.status).toBe('OPEN');
    });

    it('should raise dispute for seller', async () => {
      jest
        .spyOn(prismaService.escrow, 'findUnique')
        .mockResolvedValue(mockEscrow as any);
      jest.spyOn(prismaService.escrowDispute, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prismaService.escrowDispute, 'create').mockResolvedValue({
        id: mockDisputeId,
        escrowId: mockEscrowId,
        raisedById: mockSellerId,
        reason: 'Buyer not releasing funds',
        status: 'OPEN',
        createdAt: new Date(),
      } as any);
      jest.spyOn(prismaService.escrow, 'update').mockResolvedValue({} as any);

      const result = await service.raiseDispute(mockSellerId, mockEscrowId, {
        reason: 'Buyer not releasing funds',
      });

      expect(result.raisedById).toBe(mockSellerId);
    });

    it('should throw ForbiddenException for non-party', async () => {
      jest
        .spyOn(prismaService.escrow, 'findUnique')
        .mockResolvedValue(mockEscrow as any);

      await expect(
        service.raiseDispute('random-user', mockEscrowId, {
          reason: 'Test reason',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw if dispute already exists', async () => {
      jest
        .spyOn(prismaService.escrow, 'findUnique')
        .mockResolvedValue(mockEscrow as any);
      jest
        .spyOn(prismaService.escrowDispute, 'findFirst')
        .mockResolvedValue({ id: 'existing' } as any);

      await expect(
        service.raiseDispute(mockBuyerId, mockEscrowId, {
          reason: 'Test reason',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if escrow not funded', async () => {
      jest.spyOn(prismaService.escrow, 'findUnique').mockResolvedValue({
        ...mockEscrow,
        status: EscrowStatus.PENDING,
      } as any);

      await expect(
        service.raiseDispute(mockBuyerId, mockEscrowId, {
          reason: 'Test reason',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('resolveDispute', () => {
    const mockDispute = {
      id: mockDisputeId,
      escrowId: mockEscrowId,
      status: 'OPEN',
      escrow: mockEscrow,
    };

    it('should resolve dispute with full release to seller', async () => {
      jest
        .spyOn(prismaService.escrowDispute, 'findUnique')
        .mockResolvedValue(mockDispute as any);
      jest
        .spyOn(prismaService.escrowDispute, 'update')
        .mockResolvedValue({} as any);
      jest.spyOn(prismaService.escrow, 'update').mockResolvedValue({
        ...mockEscrow,
        status: EscrowStatus.RELEASED,
        releasedAmount: { toString: () => '10000' },
        heldAmount: { toString: () => '0' },
      } as any);

      const result = await service.resolveDispute(mockDisputeId, {
        resolution: 'Seller provided evidence',
        action: 'RELEASE_TO_SELLER',
      });

      expect(result.status).toBe(EscrowStatus.RELEASED);
    });

    it('should resolve dispute with refund to buyer', async () => {
      jest
        .spyOn(prismaService.escrowDispute, 'findUnique')
        .mockResolvedValue(mockDispute as any);
      jest
        .spyOn(prismaService.escrowDispute, 'update')
        .mockResolvedValue({} as any);
      jest.spyOn(prismaService.escrow, 'update').mockResolvedValue({
        ...mockEscrow,
        status: EscrowStatus.REFUNDED,
        heldAmount: { toString: () => '0' },
      } as any);

      const result = await service.resolveDispute(mockDisputeId, {
        resolution: 'Property misrepresented',
        action: 'REFUND_TO_BUYER',
      });

      expect(result.status).toBe(EscrowStatus.REFUNDED);
    });

    it('should resolve dispute with partial release', async () => {
      jest
        .spyOn(prismaService.escrowDispute, 'findUnique')
        .mockResolvedValue(mockDispute as any);
      jest
        .spyOn(prismaService.escrowDispute, 'update')
        .mockResolvedValue({} as any);
      jest.spyOn(prismaService.escrow, 'update').mockResolvedValue({
        ...mockEscrow,
        status: EscrowStatus.PARTIAL_RELEASE,
        releasedAmount: { toString: () => '5000' },
        heldAmount: { toString: () => '5000' },
      } as any);

      const result = await service.resolveDispute(mockDisputeId, {
        resolution: 'Split agreed',
        action: 'PARTIAL_RELEASE',
        partialAmount: 5000,
      });

      expect(result.status).toBe(EscrowStatus.PARTIAL_RELEASE);
    });

    it('should throw NotFoundException if dispute not found', async () => {
      jest.spyOn(prismaService.escrowDispute, 'findUnique').mockResolvedValue(null);

      await expect(
        service.resolveDispute('nonexistent', {
          resolution: 'Test',
          action: 'RELEASE_TO_SELLER',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if dispute not open', async () => {
      jest.spyOn(prismaService.escrowDispute, 'findUnique').mockResolvedValue({
        ...mockDispute,
        status: 'RESOLVED',
      } as any);

      await expect(
        service.resolveDispute(mockDisputeId, {
          resolution: 'Test',
          action: 'RELEASE_TO_SELLER',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw for invalid partial amount', async () => {
      jest
        .spyOn(prismaService.escrowDispute, 'findUnique')
        .mockResolvedValue(mockDispute as any);

      await expect(
        service.resolveDispute(mockDisputeId, {
          resolution: 'Test',
          action: 'PARTIAL_RELEASE',
          partialAmount: 50000, // More than held
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('releaseFullEscrow', () => {
    const escrowNoMilestones = {
      ...mockEscrow,
      milestones: [],
    };

    it('should release full escrow by buyer', async () => {
      jest
        .spyOn(prismaService.escrow, 'findUnique')
        .mockResolvedValue(escrowNoMilestones as any);
      jest.spyOn(prismaService.escrow, 'update').mockResolvedValue({
        ...escrowNoMilestones,
        status: EscrowStatus.RELEASED,
        releasedAmount: { toString: () => '10000' },
        heldAmount: { toString: () => '0' },
      } as any);

      const result = await service.releaseFullEscrow(mockBuyerId, mockEscrowId);

      expect(result.status).toBe(EscrowStatus.RELEASED);
    });

    it('should throw ForbiddenException for seller', async () => {
      jest
        .spyOn(prismaService.escrow, 'findUnique')
        .mockResolvedValue(escrowNoMilestones as any);

      await expect(
        service.releaseFullEscrow(mockSellerId, mockEscrowId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw if escrow has milestones', async () => {
      jest
        .spyOn(prismaService.escrow, 'findUnique')
        .mockResolvedValue(mockEscrow as any);

      await expect(
        service.releaseFullEscrow(mockBuyerId, mockEscrowId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if not funded', async () => {
      jest.spyOn(prismaService.escrow, 'findUnique').mockResolvedValue({
        ...escrowNoMilestones,
        status: EscrowStatus.PENDING,
      } as any);

      await expect(
        service.releaseFullEscrow(mockBuyerId, mockEscrowId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelEscrow', () => {
    const pendingEscrow = {
      ...mockEscrow,
      status: EscrowStatus.PENDING,
      releasedAmount: { toNumber: () => 0, toString: () => '0' },
    };

    it('should cancel escrow by buyer', async () => {
      jest
        .spyOn(prismaService.escrow, 'findUnique')
        .mockResolvedValue(pendingEscrow as any);
      jest.spyOn(prismaService.escrow, 'update').mockResolvedValue({
        ...pendingEscrow,
        status: EscrowStatus.CANCELLED,
        heldAmount: { toString: () => '0' },
      } as any);

      const result = await service.cancelEscrow(mockBuyerId, mockEscrowId);

      expect(result.status).toBe(EscrowStatus.CANCELLED);
    });

    it('should cancel escrow by seller', async () => {
      jest
        .spyOn(prismaService.escrow, 'findUnique')
        .mockResolvedValue(pendingEscrow as any);
      jest.spyOn(prismaService.escrow, 'update').mockResolvedValue({
        ...pendingEscrow,
        status: EscrowStatus.CANCELLED,
      } as any);

      const result = await service.cancelEscrow(mockSellerId, mockEscrowId);

      expect(result.status).toBe(EscrowStatus.CANCELLED);
    });

    it('should throw ForbiddenException for non-party', async () => {
      jest
        .spyOn(prismaService.escrow, 'findUnique')
        .mockResolvedValue(pendingEscrow as any);

      await expect(
        service.cancelEscrow('random-user', mockEscrowId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw if released', async () => {
      jest.spyOn(prismaService.escrow, 'findUnique').mockResolvedValue({
        ...mockEscrow,
        status: EscrowStatus.RELEASED,
      } as any);

      await expect(
        service.cancelEscrow(mockBuyerId, mockEscrowId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if disputed', async () => {
      jest.spyOn(prismaService.escrow, 'findUnique').mockResolvedValue({
        ...mockEscrow,
        status: EscrowStatus.DISPUTED,
      } as any);

      await expect(
        service.cancelEscrow(mockBuyerId, mockEscrowId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if partial releases made', async () => {
      jest.spyOn(prismaService.escrow, 'findUnique').mockResolvedValue({
        ...mockEscrow,
        status: EscrowStatus.FUNDED,
        releasedAmount: { toNumber: () => 5000 },
      } as any);

      await expect(
        service.cancelEscrow(mockBuyerId, mockEscrowId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getDisputes', () => {
    it('should return disputes for buyer', async () => {
      jest
        .spyOn(prismaService.escrow, 'findUnique')
        .mockResolvedValue(mockEscrow as any);
      jest.spyOn(prismaService.escrowDispute, 'findMany').mockResolvedValue([
        {
          id: mockDisputeId,
          escrowId: mockEscrowId,
          raisedById: mockBuyerId,
          reason: 'Test',
          status: 'OPEN',
          createdAt: new Date(),
        },
      ] as any);

      const result = await service.getDisputes(mockBuyerId, mockEscrowId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockDisputeId);
    });

    it('should throw ForbiddenException for non-party', async () => {
      jest
        .spyOn(prismaService.escrow, 'findUnique')
        .mockResolvedValue(mockEscrow as any);

      await expect(
        service.getDisputes('random-user', mockEscrowId),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
