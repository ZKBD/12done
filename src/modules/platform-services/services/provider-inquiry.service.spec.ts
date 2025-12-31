import { Test, TestingModule } from '@nestjs/testing';
import { ProviderInquiryService } from './provider-inquiry.service';
import { InsuranceProviderService } from './insurance-provider.service';
import { MortgageProviderService } from './mortgage-provider.service';
import { PrismaService } from '@/database/prisma.service';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InquiryStatus, PlatformProviderStatus, InsuranceType, MortgageProductType } from '@prisma/client';

describe('ProviderInquiryService', () => {
  let service: ProviderInquiryService;
  let prismaService: PrismaService;

  const mockUserId = 'user-123';
  const mockProviderUserId = 'provider-user-123';
  const mockInsuranceProviderId = 'insurance-provider-123';
  const mockMortgageProviderId = 'mortgage-provider-123';
  const mockInquiryId = 'inquiry-123';
  const mockPropertyId = 'property-123';

  const mockInsuranceProvider = {
    id: mockInsuranceProviderId,
    userId: mockProviderUserId,
    companyName: 'Test Insurance Co',
    companyLogo: 'https://example.com/logo.png',
    status: PlatformProviderStatus.APPROVED,
  };

  const mockMortgageProvider = {
    id: mockMortgageProviderId,
    userId: mockProviderUserId,
    companyName: 'Test Mortgage Co',
    companyLogo: 'https://example.com/logo.png',
    status: PlatformProviderStatus.APPROVED,
  };

  const mockInquiry = {
    id: mockInquiryId,
    userId: mockUserId,
    insuranceProviderId: mockInsuranceProviderId,
    mortgageProviderId: null,
    providerType: 'insurance',
    propertyId: mockPropertyId,
    subject: 'Insurance Quote Request',
    message: 'I would like to get a quote for home insurance.',
    phoneNumber: '+1-555-123-4567',
    insuranceType: InsuranceType.HOME,
    mortgageType: null,
    loanAmount: null,
    downPayment: null,
    creditScore: null,
    status: InquiryStatus.PENDING,
    viewedAt: null,
    respondedAt: null,
    response: null,
    responseBy: null,
    rating: null,
    feedback: null,
    feedbackAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    insuranceProvider: mockInsuranceProvider,
    mortgageProvider: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProviderInquiryService,
        {
          provide: InsuranceProviderService,
          useValue: {
            updateProviderMetrics: jest.fn(),
          },
        },
        {
          provide: MortgageProviderService,
          useValue: {
            updateProviderMetrics: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            insuranceProvider: {
              findUnique: jest.fn(),
            },
            mortgageProvider: {
              findUnique: jest.fn(),
            },
            property: {
              findUnique: jest.fn(),
            },
            providerInquiry: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ProviderInquiryService>(ProviderInquiryService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('createInsuranceInquiry', () => {
    it('should create an insurance inquiry (PROD-082.3)', async () => {
      jest.spyOn(prismaService.insuranceProvider, 'findUnique').mockResolvedValue(mockInsuranceProvider as any);
      jest.spyOn(prismaService.property, 'findUnique').mockResolvedValue({ id: mockPropertyId } as any);
      jest.spyOn(prismaService.providerInquiry, 'create').mockResolvedValue(mockInquiry as any);

      const result = await service.createInsuranceInquiry(mockUserId, {
        providerId: mockInsuranceProviderId,
        propertyId: mockPropertyId,
        subject: 'Insurance Quote Request',
        message: 'I would like to get a quote for home insurance.',
        insuranceType: InsuranceType.HOME,
      });

      expect(result.id).toBe(mockInquiryId);
      expect(result.providerType).toBe('insurance');
      expect(result.insuranceType).toBe(InsuranceType.HOME);
    });

    it('should throw NotFoundException if provider not found', async () => {
      jest.spyOn(prismaService.insuranceProvider, 'findUnique').mockResolvedValue(null);

      await expect(
        service.createInsuranceInquiry(mockUserId, {
          providerId: 'non-existent',
          subject: 'Test',
          message: 'Test message at least 20 chars',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if provider is not approved', async () => {
      jest.spyOn(prismaService.insuranceProvider, 'findUnique').mockResolvedValue({
        ...mockInsuranceProvider,
        status: PlatformProviderStatus.PENDING,
      } as any);

      await expect(
        service.createInsuranceInquiry(mockUserId, {
          providerId: mockInsuranceProviderId,
          subject: 'Test',
          message: 'Test message at least 20 chars',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createMortgageInquiry', () => {
    it('should create a mortgage inquiry (PROD-082.3)', async () => {
      const mortgageInquiry = {
        ...mockInquiry,
        insuranceProviderId: null,
        mortgageProviderId: mockMortgageProviderId,
        providerType: 'mortgage',
        insuranceType: null,
        mortgageType: MortgageProductType.FIXED_30,
        loanAmount: 40000000,
        downPayment: 10000000,
        creditScore: 750,
        insuranceProvider: null,
        mortgageProvider: mockMortgageProvider,
      };

      jest.spyOn(prismaService.mortgageProvider, 'findUnique').mockResolvedValue(mockMortgageProvider as any);
      jest.spyOn(prismaService.providerInquiry, 'create').mockResolvedValue(mortgageInquiry as any);

      const result = await service.createMortgageInquiry(mockUserId, {
        providerId: mockMortgageProviderId,
        subject: 'Mortgage Pre-Approval',
        message: 'I would like to get pre-approved for a mortgage.',
        mortgageType: MortgageProductType.FIXED_30,
        loanAmount: 40000000,
        downPayment: 10000000,
        creditScore: 750,
      });

      expect(result.providerType).toBe('mortgage');
      expect(result.mortgageType).toBe(MortgageProductType.FIXED_30);
    });
  });

  describe('getInquiryById', () => {
    it('should return inquiry for the inquirer', async () => {
      jest.spyOn(prismaService.providerInquiry, 'findUnique').mockResolvedValue(mockInquiry as any);

      const result = await service.getInquiryById(mockInquiryId, mockUserId);

      expect(result.id).toBe(mockInquiryId);
    });

    it('should mark as viewed when provider views', async () => {
      jest.spyOn(prismaService.providerInquiry, 'findUnique').mockResolvedValue({
        ...mockInquiry,
        insuranceProvider: { ...mockInsuranceProvider, userId: mockProviderUserId },
      } as any);
      jest.spyOn(prismaService.providerInquiry, 'update').mockResolvedValue({
        ...mockInquiry,
        status: InquiryStatus.VIEWED,
        viewedAt: new Date(),
      } as any);

      await service.getInquiryById(mockInquiryId, mockProviderUserId);

      expect(prismaService.providerInquiry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: InquiryStatus.VIEWED,
          }),
        }),
      );
    });

    it('should throw ForbiddenException for unauthorized user', async () => {
      jest.spyOn(prismaService.providerInquiry, 'findUnique').mockResolvedValue({
        ...mockInquiry,
        insuranceProvider: { ...mockInsuranceProvider, userId: mockProviderUserId },
      } as any);

      await expect(service.getInquiryById(mockInquiryId, 'other-user')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('respondToInquiry', () => {
    it('should allow provider to respond (PROD-082.4)', async () => {
      jest.spyOn(prismaService.providerInquiry, 'findUnique').mockResolvedValue({
        ...mockInquiry,
        insuranceProvider: { userId: mockProviderUserId },
        mortgageProvider: null,
      } as any);
      jest.spyOn(prismaService.providerInquiry, 'update').mockResolvedValue({
        ...mockInquiry,
        response: 'Thank you for your inquiry. Here is your quote...',
        status: InquiryStatus.RESPONDED,
        respondedAt: new Date(),
      } as any);
      jest.spyOn(prismaService.providerInquiry, 'findMany').mockResolvedValue([]);

      const result = await service.respondToInquiry(mockInquiryId, mockProviderUserId, {
        response: 'Thank you for your inquiry. Here is your quote...',
      });

      expect(result.response).toBe('Thank you for your inquiry. Here is your quote...');
      expect(result.status).toBe(InquiryStatus.RESPONDED);
    });

    it('should throw ForbiddenException if not the provider', async () => {
      jest.spyOn(prismaService.providerInquiry, 'findUnique').mockResolvedValue({
        ...mockInquiry,
        insuranceProvider: { userId: mockProviderUserId },
        mortgageProvider: null,
      } as any);

      await expect(
        service.respondToInquiry(mockInquiryId, 'other-user', {
          response: 'Test response with enough chars here',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if already responded', async () => {
      jest.spyOn(prismaService.providerInquiry, 'findUnique').mockResolvedValue({
        ...mockInquiry,
        status: InquiryStatus.RESPONDED,
        insuranceProvider: { userId: mockProviderUserId },
        mortgageProvider: null,
      } as any);

      await expect(
        service.respondToInquiry(mockInquiryId, mockProviderUserId, {
          response: 'Test response with enough chars here',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('submitFeedback', () => {
    it('should allow user to submit feedback (PROD-082.5)', async () => {
      const respondedInquiry = {
        ...mockInquiry,
        status: InquiryStatus.RESPONDED,
        response: 'Provider response',
        respondedAt: new Date(),
      };

      jest.spyOn(prismaService.providerInquiry, 'findUnique').mockResolvedValue(respondedInquiry as any);
      jest.spyOn(prismaService.providerInquiry, 'update').mockResolvedValue({
        ...respondedInquiry,
        rating: 5,
        feedback: 'Great service!',
        status: InquiryStatus.CLOSED,
        feedbackAt: new Date(),
      } as any);
      jest.spyOn(prismaService.providerInquiry, 'findMany').mockResolvedValue([{ rating: 5 }] as any);

      const result = await service.submitFeedback(mockInquiryId, mockUserId, {
        rating: 5,
        feedback: 'Great service!',
      });

      expect(result.rating).toBe(5);
      expect(result.feedback).toBe('Great service!');
      expect(result.status).toBe(InquiryStatus.CLOSED);
    });

    it('should throw ForbiddenException if not the inquirer', async () => {
      const respondedInquiry = {
        ...mockInquiry,
        status: InquiryStatus.RESPONDED,
      };

      jest.spyOn(prismaService.providerInquiry, 'findUnique').mockResolvedValue(respondedInquiry as any);

      await expect(
        service.submitFeedback(mockInquiryId, 'other-user', {
          rating: 5,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if not yet responded', async () => {
      jest.spyOn(prismaService.providerInquiry, 'findUnique').mockResolvedValue(mockInquiry as any);

      await expect(
        service.submitFeedback(mockInquiryId, mockUserId, {
          rating: 5,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if feedback already submitted', async () => {
      jest.spyOn(prismaService.providerInquiry, 'findUnique').mockResolvedValue({
        ...mockInquiry,
        status: InquiryStatus.RESPONDED,
        rating: 4,
      } as any);

      await expect(
        service.submitFeedback(mockInquiryId, mockUserId, {
          rating: 5,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('listUserInquiries', () => {
    it('should list user inquiries', async () => {
      jest.spyOn(prismaService.providerInquiry, 'findMany').mockResolvedValue([mockInquiry] as any);
      jest.spyOn(prismaService.providerInquiry, 'count').mockResolvedValue(1);

      const result = await service.listUserInquiries(mockUserId, { page: 1, limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(prismaService.providerInquiry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: mockUserId,
          }),
        }),
      );
    });

    it('should filter by provider type', async () => {
      jest.spyOn(prismaService.providerInquiry, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.providerInquiry, 'count').mockResolvedValue(0);

      await service.listUserInquiries(mockUserId, { providerType: 'insurance' });

      expect(prismaService.providerInquiry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            providerType: 'insurance',
          }),
        }),
      );
    });
  });

  describe('listProviderInquiries', () => {
    it('should list provider received inquiries', async () => {
      jest.spyOn(prismaService.insuranceProvider, 'findUnique').mockResolvedValue({ id: mockInsuranceProviderId } as any);
      jest.spyOn(prismaService.providerInquiry, 'findMany').mockResolvedValue([mockInquiry] as any);
      jest.spyOn(prismaService.providerInquiry, 'count').mockResolvedValue(1);

      const result = await service.listProviderInquiries(mockProviderUserId, 'insurance', { page: 1, limit: 20 });

      expect(result.items).toHaveLength(1);
    });

    it('should throw NotFoundException if provider profile not found', async () => {
      jest.spyOn(prismaService.insuranceProvider, 'findUnique').mockResolvedValue(null);

      await expect(
        service.listProviderInquiries(mockUserId, 'insurance', {}),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
