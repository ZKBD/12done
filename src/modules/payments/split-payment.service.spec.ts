import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SplitPaymentService } from './split-payment.service';
import { PrismaService } from '@/database';
import { MailService } from '@/mail';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  SplitPaymentStatus,
  ParticipantPaymentStatus,
} from '@prisma/client';

describe('SplitPaymentService', () => {
  let service: SplitPaymentService;
  let prismaService: PrismaService;
  let mailService: MailService;

  const mockUserId = 'user-123';
  const mockSplitPaymentId = 'split-123';
  const mockParticipantId = 'participant-123';
  const mockPaymentToken = 'token-abc-123';

  const mockParticipants = [
    {
      id: 'participant-1',
      splitPaymentId: mockSplitPaymentId,
      email: 'roommate1@example.com',
      name: 'Roommate 1',
      userId: null,
      amount: { toNumber: () => 500 },
      currency: 'EUR',
      paymentToken: 'token-1',
      paymentLinkUrl: null,
      stripeSessionId: null,
      status: ParticipantPaymentStatus.PENDING,
      paidAt: null,
      reminderSentAt: null,
      reminderCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'participant-2',
      splitPaymentId: mockSplitPaymentId,
      email: 'roommate2@example.com',
      name: 'Roommate 2',
      userId: null,
      amount: { toNumber: () => 500 },
      currency: 'EUR',
      paymentToken: 'token-2',
      paymentLinkUrl: null,
      stripeSessionId: null,
      status: ParticipantPaymentStatus.PENDING,
      paidAt: null,
      reminderSentAt: null,
      reminderCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockSplitPayment = {
    id: mockSplitPaymentId,
    rentPaymentId: 'rent-123',
    transactionId: null,
    totalAmount: { toNumber: () => 1000, toString: () => '1000' },
    currency: 'EUR',
    status: SplitPaymentStatus.PENDING,
    paidAmount: { toNumber: () => 0, toString: () => '0' },
    paidCount: 0,
    expiresAt: null,
    createdById: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
    participants: mockParticipants,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SplitPaymentService,
        {
          provide: PrismaService,
          useValue: {
            splitPayment: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            splitPaymentParticipant: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: MailService,
          useValue: {
            sendMail: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('http://localhost:3000'),
          },
        },
      ],
    }).compile();

    service = module.get<SplitPaymentService>(SplitPaymentService);
    prismaService = module.get<PrismaService>(PrismaService);
    mailService = module.get<MailService>(MailService);
  });

  describe('createSplitPayment', () => {
    const createDto = {
      rentPaymentId: 'rent-123',
      totalAmount: 1000,
      currency: 'EUR',
      participants: [
        { email: 'roommate1@example.com', name: 'Roommate 1', amount: 500 },
        { email: 'roommate2@example.com', name: 'Roommate 2', amount: 500 },
      ],
    };

    it('should create a split payment with participants', async () => {
      jest
        .spyOn(prismaService.splitPayment, 'create')
        .mockResolvedValue(mockSplitPayment as any);

      const result = await service.createSplitPayment(mockUserId, createDto);

      expect(prismaService.splitPayment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          rentPaymentId: 'rent-123',
          totalAmount: 1000,
          currency: 'EUR',
          createdById: mockUserId,
        }),
        include: { participants: true },
      });
      expect(result.id).toBe(mockSplitPaymentId);
      expect(result.totalAmount).toBe('1000');
    });

    it('should send payment link emails to all participants', async () => {
      jest
        .spyOn(prismaService.splitPayment, 'create')
        .mockResolvedValue(mockSplitPayment as any);
      jest
        .spyOn(prismaService.splitPaymentParticipant, 'update')
        .mockResolvedValue({} as any);

      await service.createSplitPayment(mockUserId, createDto);

      expect(mailService.sendMail).toHaveBeenCalledTimes(2);
      expect(mailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'roommate1@example.com',
          template: 'split-payment-invite',
        }),
      );
    });

    it('should throw if neither rentPaymentId nor transactionId provided', async () => {
      const invalidDto = {
        totalAmount: 1000,
        participants: [{ email: 'test@example.com', amount: 1000 }],
      };

      await expect(
        service.createSplitPayment(mockUserId, invalidDto as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if participant amounts do not equal total', async () => {
      const invalidDto = {
        rentPaymentId: 'rent-123',
        totalAmount: 1000,
        participants: [
          { email: 'a@test.com', amount: 400 },
          { email: 'b@test.com', amount: 400 },
        ],
      };

      await expect(
        service.createSplitPayment(mockUserId, invalidDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getSplitPayment', () => {
    it('should return split payment for creator', async () => {
      jest
        .spyOn(prismaService.splitPayment, 'findUnique')
        .mockResolvedValue(mockSplitPayment as any);

      const result = await service.getSplitPayment(mockUserId, mockSplitPaymentId);

      expect(result.id).toBe(mockSplitPaymentId);
      expect(result.status).toBe(SplitPaymentStatus.PENDING);
    });

    it('should return split payment for participant', async () => {
      const participantUserId = 'user-participant';
      const splitWithParticipant = {
        ...mockSplitPayment,
        createdById: 'other-user',
        participants: [
          { ...mockParticipants[0], userId: participantUserId },
          mockParticipants[1],
        ],
      };
      jest
        .spyOn(prismaService.splitPayment, 'findUnique')
        .mockResolvedValue(splitWithParticipant as any);

      const result = await service.getSplitPayment(
        participantUserId,
        mockSplitPaymentId,
      );

      expect(result.id).toBe(mockSplitPaymentId);
    });

    it('should throw NotFoundException if not found', async () => {
      jest
        .spyOn(prismaService.splitPayment, 'findUnique')
        .mockResolvedValue(null);

      await expect(
        service.getSplitPayment(mockUserId, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for unauthorized user', async () => {
      jest.spyOn(prismaService.splitPayment, 'findUnique').mockResolvedValue({
        ...mockSplitPayment,
        createdById: 'other-user',
      } as any);

      await expect(
        service.getSplitPayment(mockUserId, mockSplitPaymentId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getPaymentLinks', () => {
    it('should return payment links for creator', async () => {
      jest
        .spyOn(prismaService.splitPayment, 'findUnique')
        .mockResolvedValue(mockSplitPayment as any);

      const result = await service.getPaymentLinks(mockUserId, mockSplitPaymentId);

      expect(result).toHaveLength(2);
      expect(result[0].email).toBe('roommate1@example.com');
      expect(result[0].paymentToken).toBe('token-1');
    });

    it('should throw ForbiddenException for non-creator', async () => {
      jest.spyOn(prismaService.splitPayment, 'findUnique').mockResolvedValue({
        ...mockSplitPayment,
        createdById: 'other-user',
      } as any);

      await expect(
        service.getPaymentLinks(mockUserId, mockSplitPaymentId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getPaymentByToken', () => {
    const mockParticipant = {
      id: mockParticipantId,
      email: 'roommate@example.com',
      name: 'Roommate',
      amount: { toNumber: () => 500, toString: () => '500' },
      currency: 'EUR',
      status: ParticipantPaymentStatus.PENDING,
      splitPaymentId: mockSplitPaymentId,
      splitPayment: {
        totalAmount: { toNumber: () => 1000, toString: () => '1000' },
      },
    };

    it('should return payment details by token', async () => {
      jest
        .spyOn(prismaService.splitPaymentParticipant, 'findUnique')
        .mockResolvedValue(mockParticipant as any);

      const result = await service.getPaymentByToken(mockPaymentToken);

      expect(result.participantId).toBe(mockParticipantId);
      expect(result.amount).toBe('500');
      expect(result.status).toBe(ParticipantPaymentStatus.PENDING);
    });

    it('should throw NotFoundException for invalid token', async () => {
      jest
        .spyOn(prismaService.splitPaymentParticipant, 'findUnique')
        .mockResolvedValue(null);

      await expect(service.getPaymentByToken('invalid-token')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('processPayment', () => {
    const mockParticipant = {
      id: mockParticipantId,
      amount: { toNumber: () => 500 },
      status: ParticipantPaymentStatus.PENDING,
      splitPayment: {
        status: SplitPaymentStatus.PENDING,
      },
    };

    it('should create payment session', async () => {
      jest
        .spyOn(prismaService.splitPaymentParticipant, 'findUnique')
        .mockResolvedValue(mockParticipant as any);
      jest
        .spyOn(prismaService.splitPaymentParticipant, 'update')
        .mockResolvedValue({} as any);

      const result = await service.processPayment({
        paymentToken: mockPaymentToken,
      });

      expect(result.sessionUrl).toContain('/pay/');
      expect(result.sessionUrl).toContain('/checkout');
    });

    it('should throw if already paid', async () => {
      jest.spyOn(prismaService.splitPaymentParticipant, 'findUnique').mockResolvedValue({
        ...mockParticipant,
        status: ParticipantPaymentStatus.PAID,
      } as any);

      await expect(
        service.processPayment({ paymentToken: mockPaymentToken }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if split payment expired', async () => {
      jest.spyOn(prismaService.splitPaymentParticipant, 'findUnique').mockResolvedValue({
        ...mockParticipant,
        splitPayment: { status: SplitPaymentStatus.EXPIRED },
      } as any);

      await expect(
        service.processPayment({ paymentToken: mockPaymentToken }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('completePayment', () => {
    const mockParticipantForComplete = {
      id: mockParticipantId,
      amount: { toNumber: () => 500 },
      status: ParticipantPaymentStatus.PENDING,
      splitPaymentId: mockSplitPaymentId,
      splitPayment: {
        ...mockSplitPayment,
        participants: mockParticipants,
      },
    };

    it('should complete participant payment', async () => {
      jest
        .spyOn(prismaService.splitPaymentParticipant, 'findUnique')
        .mockResolvedValue(mockParticipantForComplete as any);
      jest
        .spyOn(prismaService.splitPaymentParticipant, 'update')
        .mockResolvedValue({} as any);
      jest.spyOn(prismaService.splitPayment, 'update').mockResolvedValue({
        ...mockSplitPayment,
        paidAmount: { toString: () => '500' },
        paidCount: 1,
        status: SplitPaymentStatus.PARTIAL,
        participants: [
          { ...mockParticipants[0], status: ParticipantPaymentStatus.PAID },
          mockParticipants[1],
        ],
      } as any);

      const result = await service.completePayment(mockPaymentToken);

      expect(result.paidCount).toBe(1);
      expect(result.status).toBe(SplitPaymentStatus.PARTIAL);
    });

    it('should return existing payment if already paid', async () => {
      jest.spyOn(prismaService.splitPaymentParticipant, 'findUnique').mockResolvedValue({
        ...mockParticipantForComplete,
        status: ParticipantPaymentStatus.PAID,
      } as any);

      const result = await service.completePayment(mockPaymentToken);

      expect(result).toBeDefined();
    });

    it('should set COMPLETED status when all paid', async () => {
      const allPaidParticipants = mockParticipants.map((p) => ({
        ...p,
        status: ParticipantPaymentStatus.PAID,
      }));

      jest.spyOn(prismaService.splitPaymentParticipant, 'findUnique').mockResolvedValue({
        ...mockParticipantForComplete,
        splitPayment: {
          ...mockSplitPayment,
          participants: [
            { ...mockParticipants[0] },
            { ...mockParticipants[1], status: ParticipantPaymentStatus.PAID },
          ],
        },
      } as any);
      jest
        .spyOn(prismaService.splitPaymentParticipant, 'update')
        .mockResolvedValue({} as any);
      jest
        .spyOn(prismaService.splitPayment, 'update')
        .mockResolvedValueOnce({
          ...mockSplitPayment,
          paidAmount: { toString: () => '1000' },
          paidCount: 2,
          status: SplitPaymentStatus.PARTIAL,
          participants: allPaidParticipants,
        } as any)
        .mockResolvedValueOnce({
          ...mockSplitPayment,
          status: SplitPaymentStatus.COMPLETED,
          participants: allPaidParticipants,
        } as any);

      const result = await service.completePayment(mockPaymentToken);

      expect(result.status).toBe(SplitPaymentStatus.COMPLETED);
    });
  });

  describe('sendReminders', () => {
    it('should send reminders to unpaid participants', async () => {
      jest
        .spyOn(prismaService.splitPayment, 'findUnique')
        .mockResolvedValue(mockSplitPayment as any);
      jest
        .spyOn(prismaService.splitPaymentParticipant, 'update')
        .mockResolvedValue({} as any);

      const count = await service.sendReminders(mockSplitPaymentId, mockUserId);

      expect(count).toBe(2);
      expect(mailService.sendMail).toHaveBeenCalledTimes(2);
    });

    it('should throw ForbiddenException for non-creator', async () => {
      jest.spyOn(prismaService.splitPayment, 'findUnique').mockResolvedValue({
        ...mockSplitPayment,
        createdById: 'other-user',
      } as any);

      await expect(
        service.sendReminders(mockSplitPaymentId, mockUserId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should not send reminders to paid participants', async () => {
      const allPaid = {
        ...mockSplitPayment,
        participants: mockParticipants.map((p) => ({
          ...p,
          status: ParticipantPaymentStatus.PAID,
        })),
      };
      jest
        .spyOn(prismaService.splitPayment, 'findUnique')
        .mockResolvedValue(allPaid as any);

      const count = await service.sendReminders(mockSplitPaymentId, mockUserId);

      expect(count).toBe(0);
    });
  });

  describe('cancelSplitPayment', () => {
    it('should cancel split payment', async () => {
      jest
        .spyOn(prismaService.splitPayment, 'findUnique')
        .mockResolvedValue(mockSplitPayment as any);
      jest.spyOn(prismaService.splitPayment, 'update').mockResolvedValue({
        ...mockSplitPayment,
        status: SplitPaymentStatus.CANCELLED,
      } as any);

      const result = await service.cancelSplitPayment(mockSplitPaymentId, mockUserId);

      expect(result.status).toBe(SplitPaymentStatus.CANCELLED);
    });

    it('should throw ForbiddenException for non-creator', async () => {
      jest.spyOn(prismaService.splitPayment, 'findUnique').mockResolvedValue({
        ...mockSplitPayment,
        createdById: 'other-user',
      } as any);

      await expect(
        service.cancelSplitPayment(mockSplitPaymentId, mockUserId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw if completed', async () => {
      jest.spyOn(prismaService.splitPayment, 'findUnique').mockResolvedValue({
        ...mockSplitPayment,
        status: SplitPaymentStatus.COMPLETED,
      } as any);

      await expect(
        service.cancelSplitPayment(mockSplitPaymentId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if participants have paid', async () => {
      jest.spyOn(prismaService.splitPayment, 'findUnique').mockResolvedValue({
        ...mockSplitPayment,
        participants: [
          { ...mockParticipants[0], status: ParticipantPaymentStatus.PAID },
          mockParticipants[1],
        ],
      } as any);

      await expect(
        service.cancelSplitPayment(mockSplitPaymentId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUserSplitPayments', () => {
    it('should return paginated split payments', async () => {
      jest
        .spyOn(prismaService.splitPayment, 'findMany')
        .mockResolvedValue([mockSplitPayment] as any);
      jest.spyOn(prismaService.splitPayment, 'count').mockResolvedValue(1);

      const result = await service.getUserSplitPayments(mockUserId, 1, 20);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should include both created and participating split payments', async () => {
      jest
        .spyOn(prismaService.splitPayment, 'findMany')
        .mockResolvedValue([mockSplitPayment] as any);
      jest.spyOn(prismaService.splitPayment, 'count').mockResolvedValue(1);

      await service.getUserSplitPayments(mockUserId);

      expect(prismaService.splitPayment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { createdById: mockUserId },
              { participants: { some: { userId: mockUserId } } },
            ],
          },
        }),
      );
    });
  });
});
