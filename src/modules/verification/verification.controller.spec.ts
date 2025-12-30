import { Test, TestingModule } from '@nestjs/testing';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';
import {
  VerificationStatus,
  DocumentType,
  BackgroundCheckType,
  UserRole,
} from '@prisma/client';

describe('VerificationController', () => {
  let controller: VerificationController;
  let service: jest.Mocked<VerificationService>;

  const mockVerificationService = {
    submitVerification: jest.fn(),
    getVerificationStatus: jest.fn(),
    getPendingVerifications: jest.fn(),
    reviewVerification: jest.fn(),
    requestBackgroundCheck: jest.fn(),
    getBackgroundChecks: jest.fn(),
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: UserRole.USER,
  };

  const mockAdmin = {
    id: 'admin-123',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
  };

  const mockVerificationResponse = {
    id: 'request-123',
    userId: 'user-123',
    documentType: DocumentType.PASSPORT,
    status: VerificationStatus.PENDING,
    rejectionReason: null,
    submittedAt: new Date(),
    reviewedAt: null,
    expiresAt: null,
  };

  const mockStatusResponse = {
    userId: 'user-123',
    idVerificationStatus: VerificationStatus.NOT_STARTED,
    idVerifiedAt: null,
    backgroundCheckStatus: VerificationStatus.NOT_STARTED,
    backgroundCheckAt: null,
    hasVerifiedBadge: false,
    latestVerificationRequest: null,
    latestBackgroundCheck: null,
  };

  const mockBackgroundCheckResponse = {
    id: 'check-123',
    userId: 'user-123',
    type: BackgroundCheckType.STANDARD,
    status: VerificationStatus.PENDING,
    resultSummary: null,
    requestedAt: new Date(),
    completedAt: null,
    expiresAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VerificationController],
      providers: [
        {
          provide: VerificationService,
          useValue: mockVerificationService,
        },
      ],
    }).compile();

    controller = module.get<VerificationController>(VerificationController);
    service = module.get(VerificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('submitVerification', () => {
    it('should submit verification request', async () => {
      mockVerificationService.submitVerification.mockResolvedValue(mockVerificationResponse);

      const result = await controller.submitVerification(
        {
          documentType: DocumentType.PASSPORT,
          documentUrl: 'https://storage.example.com/doc.jpg',
        },
        mockUser as any,
      );

      expect(result).toEqual(mockVerificationResponse);
      expect(mockVerificationService.submitVerification).toHaveBeenCalledWith(
        'user-123',
        expect.any(Object),
      );
    });
  });

  describe('getStatus', () => {
    it('should return current user verification status', async () => {
      mockVerificationService.getVerificationStatus.mockResolvedValue(mockStatusResponse);

      const result = await controller.getStatus(mockUser as any);

      expect(result).toEqual(mockStatusResponse);
      expect(mockVerificationService.getVerificationStatus).toHaveBeenCalledWith('user-123');
    });
  });

  describe('getStatusByUserId', () => {
    it('should return verification status for specified user', async () => {
      mockVerificationService.getVerificationStatus.mockResolvedValue(mockStatusResponse);

      const result = await controller.getStatusByUserId('user-123');

      expect(result).toEqual(mockStatusResponse);
      expect(mockVerificationService.getVerificationStatus).toHaveBeenCalledWith('user-123');
    });
  });

  describe('requestBackgroundCheck', () => {
    it('should request background check with consent', async () => {
      mockVerificationService.requestBackgroundCheck.mockResolvedValue(mockBackgroundCheckResponse);

      const result = await controller.requestBackgroundCheck(
        {
          type: BackgroundCheckType.STANDARD,
          consent: true,
          consentIpAddress: '192.168.1.1',
        },
        mockUser as any,
      );

      expect(result).toEqual(mockBackgroundCheckResponse);
      expect(mockVerificationService.requestBackgroundCheck).toHaveBeenCalledWith(
        'user-123',
        expect.any(Object),
      );
    });
  });

  describe('getBackgroundChecks', () => {
    it('should return user background check history', async () => {
      mockVerificationService.getBackgroundChecks.mockResolvedValue([mockBackgroundCheckResponse]);

      const result = await controller.getBackgroundChecks(mockUser as any);

      expect(result).toEqual([mockBackgroundCheckResponse]);
      expect(mockVerificationService.getBackgroundChecks).toHaveBeenCalledWith('user-123');
    });
  });

  describe('getPendingVerifications', () => {
    it('should return pending verifications for admin', async () => {
      const paginatedResult = {
        data: [mockVerificationResponse],
        meta: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
      mockVerificationService.getPendingVerifications.mockResolvedValue(paginatedResult);

      const result = await controller.getPendingVerifications({ page: 1, limit: 20 });

      expect(result).toEqual(paginatedResult);
    });
  });

  describe('reviewVerification', () => {
    it('should approve verification request', async () => {
      const approvedResponse = {
        ...mockVerificationResponse,
        status: VerificationStatus.VERIFIED,
      };
      mockVerificationService.reviewVerification.mockResolvedValue(approvedResponse);

      const result = await controller.reviewVerification(
        'request-123',
        { approved: true },
        mockAdmin as any,
      );

      expect(result.status).toBe(VerificationStatus.VERIFIED);
      expect(mockVerificationService.reviewVerification).toHaveBeenCalledWith(
        'request-123',
        'admin-123',
        { approved: true },
      );
    });

    it('should reject verification request with reason', async () => {
      const rejectedResponse = {
        ...mockVerificationResponse,
        status: VerificationStatus.REJECTED,
        rejectionReason: 'Document is blurry',
      };
      mockVerificationService.reviewVerification.mockResolvedValue(rejectedResponse);

      const result = await controller.reviewVerification(
        'request-123',
        { approved: false, rejectionReason: 'Document is blurry' },
        mockAdmin as any,
      );

      expect(result.status).toBe(VerificationStatus.REJECTED);
      expect(result.rejectionReason).toBe('Document is blurry');
    });
  });
});
