import { Test, TestingModule } from '@nestjs/testing';
import { VerificationService } from './verification.service';
import { PrismaService } from '@/database/prisma.service';
import { MailService } from '@/mail';
import {
  VerificationStatus,
  DocumentType,
  BackgroundCheckType,
} from '@prisma/client';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('VerificationService', () => {
  let service: VerificationService;

  const mockPrismaService = {
    verificationRequest: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    backgroundCheck: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockMailService = {
    sendMail: jest.fn(),
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    idVerificationStatus: VerificationStatus.NOT_STARTED,
    idVerifiedAt: null,
    backgroundCheckStatus: VerificationStatus.NOT_STARTED,
    backgroundCheckAt: null,
  };

  const mockVerificationRequest = {
    id: 'request-123',
    userId: 'user-123',
    documentType: DocumentType.PASSPORT,
    documentUrl: 'https://storage.example.com/doc.jpg',
    selfieUrl: null,
    status: VerificationStatus.PENDING,
    reviewedById: null,
    reviewedAt: null,
    rejectionReason: null,
    submittedAt: new Date(),
    expiresAt: null,
  };

  const mockBackgroundCheck = {
    id: 'check-123',
    userId: 'user-123',
    type: BackgroundCheckType.STANDARD,
    status: VerificationStatus.PENDING,
    reportUrl: null,
    providerName: 'Internal',
    providerReference: 'internal-123',
    consentGivenAt: new Date(),
    consentIpAddress: '192.168.1.1',
    resultSummary: null,
    requestedAt: new Date(),
    completedAt: null,
    expiresAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerificationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: MailService,
          useValue: mockMailService,
        },
      ],
    }).compile();

    service = module.get<VerificationService>(VerificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('submitVerification', () => {
    it('should submit verification request successfully', async () => {
      mockPrismaService.verificationRequest.findFirst.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.verificationRequest.create.mockResolvedValue(mockVerificationRequest);
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      const result = await service.submitVerification('user-123', {
        documentType: DocumentType.PASSPORT,
        documentUrl: 'https://storage.example.com/doc.jpg',
      });

      expect(result.id).toBe('request-123');
      expect(result.documentType).toBe(DocumentType.PASSPORT);
      expect(result.status).toBe(VerificationStatus.PENDING);
    });

    it('should throw if user already has pending verification', async () => {
      mockPrismaService.verificationRequest.findFirst.mockResolvedValue(mockVerificationRequest);

      await expect(
        service.submitVerification('user-123', {
          documentType: DocumentType.PASSPORT,
          documentUrl: 'https://storage.example.com/doc.jpg',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if user is already verified', async () => {
      mockPrismaService.verificationRequest.findFirst.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        idVerificationStatus: VerificationStatus.VERIFIED,
      });

      await expect(
        service.submitVerification('user-123', {
          documentType: DocumentType.PASSPORT,
          documentUrl: 'https://storage.example.com/doc.jpg',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if user not found', async () => {
      mockPrismaService.verificationRequest.findFirst.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.submitVerification('user-123', {
          documentType: DocumentType.PASSPORT,
          documentUrl: 'https://storage.example.com/doc.jpg',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getVerificationStatus', () => {
    it('should return verification status for user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.verificationRequest.findFirst.mockResolvedValue(mockVerificationRequest);
      mockPrismaService.backgroundCheck.findFirst.mockResolvedValue(null);

      const result = await service.getVerificationStatus('user-123');

      expect(result.userId).toBe('user-123');
      expect(result.idVerificationStatus).toBe(VerificationStatus.NOT_STARTED);
      expect(result.hasVerifiedBadge).toBe(false);
      expect(result.latestVerificationRequest).toBeDefined();
    });

    it('should throw if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getVerificationStatus('user-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return hasVerifiedBadge true when verified', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        idVerificationStatus: VerificationStatus.VERIFIED,
        idVerifiedAt: new Date(),
      });
      mockPrismaService.verificationRequest.findFirst.mockResolvedValue(null);
      mockPrismaService.backgroundCheck.findFirst.mockResolvedValue(null);

      const result = await service.getVerificationStatus('user-123');

      expect(result.hasVerifiedBadge).toBe(true);
    });
  });

  describe('getPendingVerifications', () => {
    it('should return paginated pending verifications', async () => {
      const pendingRequest = {
        ...mockVerificationRequest,
        user: {
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
        },
      };
      mockPrismaService.verificationRequest.findMany.mockResolvedValue([pendingRequest]);
      mockPrismaService.verificationRequest.count.mockResolvedValue(1);

      const result = await service.getPendingVerifications({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.data[0].userEmail).toBe('test@example.com');
    });
  });

  describe('reviewVerification', () => {
    it('should approve verification request', async () => {
      mockPrismaService.verificationRequest.findUnique.mockResolvedValue({
        ...mockVerificationRequest,
        user: mockUser,
      });
      mockPrismaService.verificationRequest.update.mockResolvedValue({
        ...mockVerificationRequest,
        status: VerificationStatus.VERIFIED,
        reviewedAt: new Date(),
      });
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockMailService.sendMail.mockResolvedValue(undefined);

      const result = await service.reviewVerification('request-123', 'admin-123', {
        approved: true,
      });

      expect(result.status).toBe(VerificationStatus.VERIFIED);
      expect(mockMailService.sendMail).toHaveBeenCalled();
    });

    it('should reject verification request with reason', async () => {
      mockPrismaService.verificationRequest.findUnique.mockResolvedValue({
        ...mockVerificationRequest,
        user: mockUser,
      });
      mockPrismaService.verificationRequest.update.mockResolvedValue({
        ...mockVerificationRequest,
        status: VerificationStatus.REJECTED,
        rejectionReason: 'Document is blurry',
        reviewedAt: new Date(),
      });
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockMailService.sendMail.mockResolvedValue(undefined);

      const result = await service.reviewVerification('request-123', 'admin-123', {
        approved: false,
        rejectionReason: 'Document is blurry',
      });

      expect(result.status).toBe(VerificationStatus.REJECTED);
    });

    it('should throw if request not found', async () => {
      mockPrismaService.verificationRequest.findUnique.mockResolvedValue(null);

      await expect(
        service.reviewVerification('request-123', 'admin-123', { approved: true }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if request already reviewed', async () => {
      mockPrismaService.verificationRequest.findUnique.mockResolvedValue({
        ...mockVerificationRequest,
        status: VerificationStatus.VERIFIED,
        user: mockUser,
      });

      await expect(
        service.reviewVerification('request-123', 'admin-123', { approved: true }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if rejecting without reason', async () => {
      mockPrismaService.verificationRequest.findUnique.mockResolvedValue({
        ...mockVerificationRequest,
        user: mockUser,
      });

      await expect(
        service.reviewVerification('request-123', 'admin-123', { approved: false }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('requestBackgroundCheck', () => {
    it('should create background check request with consent', async () => {
      mockPrismaService.backgroundCheck.findFirst.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.backgroundCheck.create.mockResolvedValue(mockBackgroundCheck);
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      const result = await service.requestBackgroundCheck('user-123', {
        type: BackgroundCheckType.STANDARD,
        consent: true,
        consentIpAddress: '192.168.1.1',
      });

      expect(result.id).toBe('check-123');
      expect(result.type).toBe(BackgroundCheckType.STANDARD);
      expect(result.status).toBe(VerificationStatus.PENDING);
    });

    it('should throw if consent not given', async () => {
      await expect(
        service.requestBackgroundCheck('user-123', {
          type: BackgroundCheckType.STANDARD,
          consent: false,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if user already has pending check', async () => {
      mockPrismaService.backgroundCheck.findFirst.mockResolvedValue(mockBackgroundCheck);

      await expect(
        service.requestBackgroundCheck('user-123', {
          type: BackgroundCheckType.STANDARD,
          consent: true,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if user not found', async () => {
      mockPrismaService.backgroundCheck.findFirst.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.requestBackgroundCheck('user-123', {
          type: BackgroundCheckType.STANDARD,
          consent: true,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getBackgroundChecks', () => {
    it('should return user background check history', async () => {
      mockPrismaService.backgroundCheck.findMany.mockResolvedValue([mockBackgroundCheck]);

      const result = await service.getBackgroundChecks('user-123');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('check-123');
    });
  });

  describe('processBackgroundCheckWebhook', () => {
    it('should update background check on webhook completion', async () => {
      mockPrismaService.backgroundCheck.findFirst.mockResolvedValue({
        ...mockBackgroundCheck,
        user: mockUser,
      });
      mockPrismaService.backgroundCheck.update.mockResolvedValue({
        ...mockBackgroundCheck,
        status: VerificationStatus.VERIFIED,
      });
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      await service.processBackgroundCheckWebhook(
        'internal-123',
        'completed',
        'CLEAR',
        'https://report.url',
      );

      expect(mockPrismaService.backgroundCheck.update).toHaveBeenCalled();
      expect(mockPrismaService.user.update).toHaveBeenCalled();
    });

    it('should not throw if check not found (webhook idempotency)', async () => {
      mockPrismaService.backgroundCheck.findFirst.mockResolvedValue(null);

      await expect(
        service.processBackgroundCheckWebhook('unknown-ref', 'completed', 'CLEAR'),
      ).resolves.not.toThrow();
    });
  });

  describe('hasVerifiedBadge', () => {
    it('should return true for verified status', () => {
      expect(service.hasVerifiedBadge(VerificationStatus.VERIFIED)).toBe(true);
    });

    it('should return false for pending status', () => {
      expect(service.hasVerifiedBadge(VerificationStatus.PENDING)).toBe(false);
    });

    it('should return false for not started status', () => {
      expect(service.hasVerifiedBadge(VerificationStatus.NOT_STARTED)).toBe(false);
    });

    it('should return false for rejected status', () => {
      expect(service.hasVerifiedBadge(VerificationStatus.REJECTED)).toBe(false);
    });
  });

  describe('getVerifiedUsers', () => {
    it('should return verified user IDs', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([
        { id: 'user-1' },
        { id: 'user-2' },
      ]);

      const result = await service.getVerifiedUsers(true);

      expect(result).toEqual(['user-1', 'user-2']);
    });
  });
});
