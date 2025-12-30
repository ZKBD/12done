import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { RevenueShareService } from './revenue-share.service';
import { PrismaService } from '@/database/prisma.service';
import { RevenueShareStatus, PayoutStatus, UserStatus, Prisma } from '@prisma/client';

describe('RevenueShareService', () => {
  let service: RevenueShareService;
  let prisma: PrismaService;

  const mockPrismaService = {
    platformConfiguration: {
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    userWallet: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    walletTransaction: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    revenueDistribution: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn(),
    },
    revenueShare: {
      createMany: jest.fn(),
      update: jest.fn(),
    },
    transaction: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    payoutRequest: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  const mockDefaultConfig = {
    id: 'config-1',
    platformOwnerPercent: 30,
    userNetworkTotalPercent: 50,
    allUsersSharePercent: 20,
    buyerRewardPercent: 10,
    directInviterPercent: 20,
    upstreamNetworkPercent: 20,
    maxUpstreamLevels: 10,
    upstreamLevelWeights: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
    minPayoutAmount: new Prisma.Decimal(50),
    isActive: true,
    activatedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockWallet = {
    id: 'wallet-1',
    userId: 'user-1',
    balance: new Prisma.Decimal(100),
    currency: 'EUR',
    totalEarnings: new Prisma.Decimal(200),
    buyerRewardsEarned: new Prisma.Decimal(50),
    inviterCommissionsEarned: new Prisma.Decimal(80),
    networkSharesEarned: new Prisma.Decimal(50),
    allUsersShareEarned: new Prisma.Decimal(20),
    totalPaidOut: new Prisma.Decimal(100),
    lastPayoutAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTransaction = {
    id: 'txn-1',
    negotiationId: 'neg-1',
    amount: new Prisma.Decimal(10000),
    currency: 'EUR',
    platformFee: new Prisma.Decimal(250),
    platformFeeRate: new Prisma.Decimal(0.025),
    sellerAmount: new Prisma.Decimal(9750),
    status: 'COMPLETED',
    payerId: 'buyer-1',
    payer: {
      id: 'buyer-1',
      name: 'Buyer User',
      email: 'buyer@example.com',
      invitedById: 'inviter-1',
      invitedBy: {
        id: 'inviter-1',
        invitedById: 'upstream-1',
      },
    },
    negotiation: {
      property: { id: 'prop-1' },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RevenueShareService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<RevenueShareService>(RevenueShareService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('Platform Configuration', () => {
    describe('getActiveConfig', () => {
      it('should return active config if exists', async () => {
        mockPrismaService.platformConfiguration.findFirst.mockResolvedValue(mockDefaultConfig);

        const result = await service.getActiveConfig();

        expect(result.platformOwnerPercent).toBe(30);
        expect(result.userNetworkTotalPercent).toBe(50);
        expect(result.allUsersSharePercent).toBe(20);
        expect(result.isActive).toBe(true);
      });

      it('should create default config if none exists', async () => {
        mockPrismaService.platformConfiguration.findFirst.mockResolvedValue(null);
        mockPrismaService.platformConfiguration.create.mockResolvedValue(mockDefaultConfig);

        const result = await service.getActiveConfig();

        expect(mockPrismaService.platformConfiguration.create).toHaveBeenCalled();
        expect(result.platformOwnerPercent).toBe(30);
      });
    });

    describe('updateConfig', () => {
      it('should update config with valid percentages', async () => {
        mockPrismaService.platformConfiguration.findFirst.mockResolvedValue(mockDefaultConfig);
        mockPrismaService.platformConfiguration.updateMany.mockResolvedValue({ count: 1 });
        mockPrismaService.platformConfiguration.create.mockResolvedValue({
          ...mockDefaultConfig,
          platformOwnerPercent: 25,
          allUsersSharePercent: 25,
        });

        const result = await service.updateConfig(
          { platformOwnerPercent: 25, allUsersSharePercent: 25 },
          'admin-1',
        );

        expect(result.platformOwnerPercent).toBe(25);
      });

      it('should throw error if %A + %B + %C != 100', async () => {
        mockPrismaService.platformConfiguration.findFirst.mockResolvedValue(mockDefaultConfig);

        await expect(
          service.updateConfig({ platformOwnerPercent: 40 }, 'admin-1'),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw error if %D + %E + %F != %B', async () => {
        mockPrismaService.platformConfiguration.findFirst.mockResolvedValue(mockDefaultConfig);

        await expect(
          service.updateConfig({ buyerRewardPercent: 30 }, 'admin-1'),
        ).rejects.toThrow(BadRequestException);
      });

      it('should validate network breakdown equals user network total', async () => {
        mockPrismaService.platformConfiguration.findFirst.mockResolvedValue(mockDefaultConfig);
        mockPrismaService.platformConfiguration.updateMany.mockResolvedValue({ count: 1 });
        mockPrismaService.platformConfiguration.create.mockResolvedValue({
          ...mockDefaultConfig,
          buyerRewardPercent: 15,
          directInviterPercent: 20,
          upstreamNetworkPercent: 15,
        });

        // 15 + 20 + 15 = 50 = userNetworkTotalPercent, should work
        const result = await service.updateConfig(
          {
            buyerRewardPercent: 15,
            directInviterPercent: 20,
            upstreamNetworkPercent: 15,
          },
          'admin-1',
        );

        expect(result).toBeDefined();
      });
    });
  });

  describe('Wallet Management', () => {
    describe('getOrCreateWallet', () => {
      it('should return existing wallet', async () => {
        mockPrismaService.userWallet.findUnique.mockResolvedValue(mockWallet);

        const result = await service.getOrCreateWallet('user-1');

        expect(result.userId).toBe('user-1');
        expect(result.balance).toBe(100);
      });

      it('should create wallet if none exists', async () => {
        mockPrismaService.userWallet.findUnique.mockResolvedValue(null);
        mockPrismaService.userWallet.create.mockResolvedValue({
          ...mockWallet,
          balance: new Prisma.Decimal(0),
          totalEarnings: new Prisma.Decimal(0),
        });

        const result = await service.getOrCreateWallet('user-1');

        expect(mockPrismaService.userWallet.create).toHaveBeenCalled();
        expect(result.balance).toBe(0);
      });
    });

    describe('getWalletTransactions', () => {
      it('should return transaction history', async () => {
        mockPrismaService.userWallet.findUnique.mockResolvedValue(mockWallet);
        mockPrismaService.walletTransaction.findMany.mockResolvedValue([
          {
            id: 'wtx-1',
            type: 'CREDIT',
            amount: new Prisma.Decimal(50),
            currency: 'EUR',
            balanceAfter: new Prisma.Decimal(150),
            referenceType: 'REVENUE_SHARE',
            referenceId: 'share-1',
            description: 'Buyer reward',
            createdAt: new Date(),
          },
        ]);

        const result = await service.getWalletTransactions('user-1');

        expect(result).toHaveLength(1);
        expect(result[0].type).toBe('CREDIT');
        expect(result[0].amount).toBe(50);
      });

      it('should return empty array if no wallet', async () => {
        mockPrismaService.userWallet.findUnique.mockResolvedValue(null);

        const result = await service.getWalletTransactions('user-1');

        expect(result).toEqual([]);
      });
    });
  });

  describe('Revenue Distribution', () => {
    describe('distributeRevenue', () => {
      it('should throw error if already distributed', async () => {
        mockPrismaService.revenueDistribution.findUnique.mockResolvedValue({
          id: 'dist-1',
        });

        await expect(service.distributeRevenue('txn-1')).rejects.toThrow(
          BadRequestException,
        );
      });

      it('should throw error if transaction not found', async () => {
        mockPrismaService.revenueDistribution.findUnique.mockResolvedValue(null);
        mockPrismaService.transaction.findUnique.mockResolvedValue(null);

        await expect(service.distributeRevenue('txn-1')).rejects.toThrow(
          NotFoundException,
        );
      });

      it('should throw error if transaction not completed', async () => {
        mockPrismaService.revenueDistribution.findUnique.mockResolvedValue(null);
        mockPrismaService.transaction.findUnique.mockResolvedValue({
          ...mockTransaction,
          status: 'PENDING',
        });

        await expect(service.distributeRevenue('txn-1')).rejects.toThrow(
          BadRequestException,
        );
      });

      it('should create distribution with correct amounts', async () => {
        mockPrismaService.revenueDistribution.findUnique
          .mockResolvedValueOnce(null) // First call - check existing
          .mockResolvedValueOnce({ // Second call - after creation
            id: 'dist-1',
            transactionId: 'txn-1',
            totalRevenue: new Prisma.Decimal(250),
            currency: 'EUR',
            platformAmount: new Prisma.Decimal(75),
            buyerRewardAmount: new Prisma.Decimal(25),
            directInviterAmount: new Prisma.Decimal(50),
            upstreamNetworkAmount: new Prisma.Decimal(50),
            allUsersShareAmount: new Prisma.Decimal(50),
            status: 'PROCESSED',
            processedAt: new Date(),
            shares: [],
            createdAt: new Date(),
          });
        mockPrismaService.transaction.findUnique.mockResolvedValue(mockTransaction);
        mockPrismaService.platformConfiguration.findFirst.mockResolvedValue(mockDefaultConfig);
        mockPrismaService.revenueDistribution.create.mockResolvedValue({
          id: 'dist-1',
          transactionId: 'txn-1',
        });
        mockPrismaService.userWallet.findUnique.mockResolvedValue(null);
        mockPrismaService.userWallet.create.mockResolvedValue({
          id: 'wallet-new',
          userId: 'buyer-1',
        });
        mockPrismaService.user.findUnique.mockResolvedValue({ invitedById: null });
        mockPrismaService.user.findMany.mockResolvedValue([]);
        mockPrismaService.revenueShare.createMany.mockResolvedValue({ count: 1 });
        mockPrismaService.revenueDistribution.update.mockResolvedValue({});

        const result = await service.distributeRevenue('txn-1');

        expect(mockPrismaService.revenueDistribution.create).toHaveBeenCalled();
        expect(result.transactionId).toBe('txn-1');
      });
    });

    describe('getDistributionById', () => {
      it('should return distribution with shares', async () => {
        mockPrismaService.revenueDistribution.findUnique.mockResolvedValue({
          id: 'dist-1',
          transactionId: 'txn-1',
          totalRevenue: new Prisma.Decimal(250),
          currency: 'EUR',
          platformAmount: new Prisma.Decimal(75),
          buyerRewardAmount: new Prisma.Decimal(25),
          directInviterAmount: new Prisma.Decimal(50),
          upstreamNetworkAmount: new Prisma.Decimal(50),
          allUsersShareAmount: new Prisma.Decimal(50),
          status: 'PROCESSED',
          processedAt: new Date(),
          createdAt: new Date(),
          shares: [
            {
              id: 'share-1',
              recipientId: 'wallet-1',
              shareType: 'BUYER_REWARD',
              amount: new Prisma.Decimal(25),
              currency: 'EUR',
              status: 'PROCESSED',
              createdAt: new Date(),
              wallet: {
                user: { name: 'Test User', email: 'test@example.com' },
              },
            },
          ],
        });

        const result = await service.getDistributionById('dist-1');

        expect(result.totalRevenue).toBe(250);
        expect(result.shares).toHaveLength(1);
      });

      it('should throw error if distribution not found', async () => {
        mockPrismaService.revenueDistribution.findUnique.mockResolvedValue(null);

        await expect(service.getDistributionById('non-existent')).rejects.toThrow(
          NotFoundException,
        );
      });
    });
  });

  describe('Payout Management', () => {
    describe('requestPayout', () => {
      it('should create payout request with valid amount', async () => {
        mockPrismaService.userWallet.findUnique.mockResolvedValue(mockWallet);
        mockPrismaService.platformConfiguration.findFirst.mockResolvedValue(mockDefaultConfig);
        mockPrismaService.payoutRequest.findFirst.mockResolvedValue(null);
        mockPrismaService.payoutRequest.create.mockResolvedValue({
          id: 'payout-1',
          walletId: 'wallet-1',
          amount: new Prisma.Decimal(50),
          currency: 'EUR',
          payoutMethod: 'BANK_TRANSFER',
          status: 'PENDING',
          createdAt: new Date(),
        });
        mockPrismaService.userWallet.update.mockResolvedValue({});
        mockPrismaService.walletTransaction.create.mockResolvedValue({});

        const result = await service.requestPayout('user-1', {
          amount: 50,
          payoutMethod: 'BANK_TRANSFER',
          payoutDetails: { iban: 'DE89...', accountHolderName: 'Test' },
        });

        expect(result.amount).toBe(50);
        expect(result.status).toBe('PENDING');
      });

      it('should throw error if wallet not found', async () => {
        mockPrismaService.userWallet.findUnique.mockResolvedValue(null);

        await expect(
          service.requestPayout('user-1', {
            amount: 50,
            payoutMethod: 'BANK_TRANSFER',
            payoutDetails: {},
          }),
        ).rejects.toThrow(NotFoundException);
      });

      it('should throw error if insufficient balance', async () => {
        mockPrismaService.userWallet.findUnique.mockResolvedValue(mockWallet);
        mockPrismaService.platformConfiguration.findFirst.mockResolvedValue(mockDefaultConfig);

        await expect(
          service.requestPayout('user-1', {
            amount: 500, // More than 100 balance
            payoutMethod: 'BANK_TRANSFER',
            payoutDetails: {},
          }),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw error if below minimum payout amount', async () => {
        mockPrismaService.userWallet.findUnique.mockResolvedValue(mockWallet);
        mockPrismaService.platformConfiguration.findFirst.mockResolvedValue(mockDefaultConfig);

        await expect(
          service.requestPayout('user-1', {
            amount: 10, // Less than 50 minimum
            payoutMethod: 'BANK_TRANSFER',
            payoutDetails: {},
          }),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw error if pending payout exists', async () => {
        mockPrismaService.userWallet.findUnique.mockResolvedValue(mockWallet);
        mockPrismaService.platformConfiguration.findFirst.mockResolvedValue(mockDefaultConfig);
        mockPrismaService.payoutRequest.findFirst.mockResolvedValue({
          id: 'existing-payout',
          status: 'PENDING',
        });

        await expect(
          service.requestPayout('user-1', {
            amount: 50,
            payoutMethod: 'BANK_TRANSFER',
            payoutDetails: {},
          }),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('processPayout', () => {
      it('should process pending payout', async () => {
        mockPrismaService.payoutRequest.findUnique.mockResolvedValue({
          id: 'payout-1',
          walletId: 'wallet-1',
          amount: new Prisma.Decimal(50),
          status: 'PENDING',
          wallet: { userId: 'user-1' },
        });
        mockPrismaService.payoutRequest.update.mockResolvedValue({
          id: 'payout-1',
          walletId: 'wallet-1',
          amount: new Prisma.Decimal(50),
          currency: 'EUR',
          payoutMethod: 'BANK_TRANSFER',
          status: 'COMPLETED',
          processedAt: new Date(),
          createdAt: new Date(),
        });
        mockPrismaService.userWallet.update.mockResolvedValue({});

        const result = await service.processPayout('payout-1', 'admin-1', 'REF123');

        expect(result.status).toBe('COMPLETED');
      });

      it('should throw error if payout not found', async () => {
        mockPrismaService.payoutRequest.findUnique.mockResolvedValue(null);

        await expect(
          service.processPayout('non-existent', 'admin-1'),
        ).rejects.toThrow(NotFoundException);
      });

      it('should throw error if payout not pending', async () => {
        mockPrismaService.payoutRequest.findUnique.mockResolvedValue({
          id: 'payout-1',
          status: 'COMPLETED',
        });

        await expect(
          service.processPayout('payout-1', 'admin-1'),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('cancelPayout', () => {
      it('should cancel own pending payout and refund', async () => {
        mockPrismaService.payoutRequest.findUnique
          .mockResolvedValueOnce({
            id: 'payout-1',
            walletId: 'wallet-1',
            amount: new Prisma.Decimal(50),
            currency: 'EUR',
            status: 'PENDING',
            wallet: { userId: 'user-1', balance: new Prisma.Decimal(50) },
          })
          .mockResolvedValueOnce({
            id: 'payout-1',
            walletId: 'wallet-1',
            amount: new Prisma.Decimal(50),
            currency: 'EUR',
            payoutMethod: 'BANK_TRANSFER',
            status: 'CANCELLED',
            notes: 'Cancelled by user',
            createdAt: new Date(),
          });
        mockPrismaService.$transaction.mockResolvedValue([]);

        const result = await service.cancelPayout('payout-1', 'user-1');

        expect(result.status).toBe('CANCELLED');
      });

      it('should throw error if not owner', async () => {
        mockPrismaService.payoutRequest.findUnique.mockResolvedValue({
          id: 'payout-1',
          status: 'PENDING',
          wallet: { userId: 'other-user' },
        });

        await expect(
          service.cancelPayout('payout-1', 'user-1'),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should throw error if payout not pending', async () => {
        mockPrismaService.payoutRequest.findUnique.mockResolvedValue({
          id: 'payout-1',
          status: 'COMPLETED',
          wallet: { userId: 'user-1' },
        });

        await expect(
          service.cancelPayout('payout-1', 'user-1'),
        ).rejects.toThrow(BadRequestException);
      });
    });
  });

  describe('Statistics', () => {
    describe('getRevenueStats', () => {
      it('should return aggregated revenue stats', async () => {
        mockPrismaService.revenueDistribution.aggregate.mockResolvedValue({
          _sum: {
            totalRevenue: new Prisma.Decimal(10000),
            platformAmount: new Prisma.Decimal(3000),
            buyerRewardAmount: new Prisma.Decimal(1000),
            directInviterAmount: new Prisma.Decimal(2000),
            upstreamNetworkAmount: new Prisma.Decimal(2000),
            allUsersShareAmount: new Prisma.Decimal(2000),
          },
        });
        mockPrismaService.payoutRequest.aggregate
          .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal(5000) } })
          .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal(1000) } });
        mockPrismaService.userWallet.count.mockResolvedValue(50);

        const result = await service.getRevenueStats();

        expect(result.totalRevenue).toBe(10000);
        expect(result.platformEarnings).toBe(3000);
        expect(result.totalUserPayouts).toBe(5000);
        expect(result.pendingPayouts).toBe(1000);
        expect(result.activeWallets).toBe(50);
      });
    });

    describe('getUserEarningsStats', () => {
      it('should return user earnings breakdown', async () => {
        mockPrismaService.userWallet.findUnique.mockResolvedValue(mockWallet);
        mockPrismaService.payoutRequest.aggregate.mockResolvedValue({
          _sum: { amount: new Prisma.Decimal(25) },
        });
        mockPrismaService.user.count.mockResolvedValue(5);

        const result = await service.getUserEarningsStats('user-1');

        expect(result.totalEarnings).toBe(200);
        expect(result.currentBalance).toBe(100);
        expect(result.breakdown.buyerRewards).toBe(50);
        expect(result.referralCount).toBe(5);
      });

      it('should return zeros if no wallet', async () => {
        mockPrismaService.userWallet.findUnique.mockResolvedValue(null);

        const result = await service.getUserEarningsStats('user-1');

        expect(result.totalEarnings).toBe(0);
        expect(result.currentBalance).toBe(0);
      });
    });
  });

  describe('Upstream Network Calculation', () => {
    it('should distribute to multiple upstream levels', async () => {
      // This tests the private method indirectly through distributeRevenue
      mockPrismaService.revenueDistribution.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'dist-1',
          transactionId: 'txn-1',
          totalRevenue: new Prisma.Decimal(250),
          currency: 'EUR',
          platformAmount: new Prisma.Decimal(75),
          buyerRewardAmount: new Prisma.Decimal(25),
          directInviterAmount: new Prisma.Decimal(50),
          upstreamNetworkAmount: new Prisma.Decimal(50),
          allUsersShareAmount: new Prisma.Decimal(50),
          status: 'PROCESSED',
          processedAt: new Date(),
          shares: [],
          createdAt: new Date(),
        });
      mockPrismaService.transaction.findUnique.mockResolvedValue(mockTransaction);
      mockPrismaService.platformConfiguration.findFirst.mockResolvedValue(mockDefaultConfig);
      mockPrismaService.revenueDistribution.create.mockResolvedValue({ id: 'dist-1' });

      // Mock upstream chain: inviter-1 -> upstream-1 -> upstream-2
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce({ invitedById: 'upstream-1' }) // inviter-1's inviter
        .mockResolvedValueOnce({ invitedById: 'upstream-2' }) // upstream-1's inviter
        .mockResolvedValueOnce({ invitedById: null }); // upstream-2 has no inviter

      mockPrismaService.userWallet.findUnique.mockResolvedValue(null);
      mockPrismaService.userWallet.create.mockResolvedValue({ id: 'wallet-new' });
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.revenueShare.createMany.mockResolvedValue({ count: 4 });
      mockPrismaService.revenueDistribution.update.mockResolvedValue({});

      const result = await service.distributeRevenue('txn-1');

      expect(mockPrismaService.revenueShare.createMany).toHaveBeenCalled();
    });
  });
});
