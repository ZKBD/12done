import { Test, TestingModule } from '@nestjs/testing';
import { ApplicationsService } from './applications.service';
import { PrismaService } from '@/database';
import { NotificationsService } from '../notifications/notifications.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ApplicationStatus, ListingType } from '@prisma/client';

describe('ApplicationsService', () => {
  let service: ApplicationsService;

  const mockPrismaService: any = {
    property: {
      findUnique: jest.fn(),
    },
    rentalApplication: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockNotificationsService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    service = module.get<ApplicationsService>(ApplicationsService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('create', () => {
    const applicantId = 'applicant-123';
    const propertyId = 'property-123';
    const ownerId = 'owner-123';
    const dto = {
      employmentStatus: 'employed',
      employer: 'Tech Corp',
      monthlyIncome: 5000,
    };

    const mockProperty = {
      id: propertyId,
      ownerId,
      title: 'Nice Apartment',
      listingTypes: [ListingType.LONG_TERM_RENT],
      owner: {
        id: ownerId,
        firstName: 'Owner',
        lastName: 'User',
      },
    };

    const mockCreatedApplication = {
      id: 'application-123',
      applicantId,
      propertyId,
      status: ApplicationStatus.PENDING,
      employmentStatus: dto.employmentStatus,
      employer: dto.employer,
      monthlyIncome: dto.monthlyIncome,
      incomeCurrency: 'EUR',
      hasPets: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      property: {
        id: propertyId,
        title: 'Nice Apartment',
        address: '123 Main St',
        city: 'Budapest',
        country: 'HU',
      },
      applicant: {
        id: applicantId,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      },
    };

    it('should create a rental application successfully', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue(mockProperty);
      mockPrismaService.rentalApplication.findUnique.mockResolvedValue(null);
      mockPrismaService.rentalApplication.create.mockResolvedValue(
        mockCreatedApplication,
      );
      mockNotificationsService.create.mockResolvedValue({});

      const result = await service.create(propertyId, applicantId, dto);

      expect(result.id).toBe('application-123');
      expect(result.status).toBe(ApplicationStatus.PENDING);
      expect(mockPrismaService.rentalApplication.create).toHaveBeenCalled();
      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        ownerId,
        'APPLICATION_RECEIVED',
        'New Rental Application',
        expect.stringContaining('John Doe'),
        expect.objectContaining({ applicationId: 'application-123' }),
      );
    });

    it('should throw NotFoundException if property not found', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue(null);

      await expect(
        service.create(propertyId, applicantId, dto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when applying to own property', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue({
        ...mockProperty,
        ownerId: applicantId, // Same as applicant
      });

      await expect(
        service.create(propertyId, applicantId, dto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if property is not for rent', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue({
        ...mockProperty,
        listingTypes: [ListingType.FOR_SALE], // Not a rental
      });

      await expect(
        service.create(propertyId, applicantId, dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if already applied', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue(mockProperty);
      mockPrismaService.rentalApplication.findUnique.mockResolvedValue({
        id: 'existing-application',
      });

      await expect(
        service.create(propertyId, applicantId, dto),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getMyApplications', () => {
    const userId = 'user-123';

    it('should return paginated applications', async () => {
      const mockApplications = [
        {
          id: 'app-1',
          applicantId: userId,
          propertyId: 'prop-1',
          status: ApplicationStatus.PENDING,
          hasPets: false,
          incomeCurrency: 'EUR',
          createdAt: new Date(),
          updatedAt: new Date(),
          property: {
            id: 'prop-1',
            title: 'Apartment 1',
            address: '123 Main',
            city: 'Budapest',
            country: 'HU',
          },
        },
      ];

      mockPrismaService.rentalApplication.findMany.mockResolvedValue(
        mockApplications,
      );
      mockPrismaService.rentalApplication.count.mockResolvedValue(1);

      const result = await service.getMyApplications(userId, {
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('should filter by status', async () => {
      mockPrismaService.rentalApplication.findMany.mockResolvedValue([]);
      mockPrismaService.rentalApplication.count.mockResolvedValue(0);

      await service.getMyApplications(userId, {
        status: 'PENDING',
      });

      expect(mockPrismaService.rentalApplication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: ApplicationStatus.PENDING,
          }),
        }),
      );
    });
  });

  describe('getById', () => {
    const applicationId = 'app-123';
    const applicantId = 'applicant-123';
    const ownerId = 'owner-123';

    const mockApplication = {
      id: applicationId,
      applicantId,
      propertyId: 'prop-123',
      status: ApplicationStatus.PENDING,
      hasPets: false,
      incomeCurrency: 'EUR',
      createdAt: new Date(),
      updatedAt: new Date(),
      property: {
        id: 'prop-123',
        title: 'Apartment',
        address: '123 Main',
        city: 'Budapest',
        country: 'HU',
        ownerId,
      },
      applicant: {
        id: applicantId,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      },
    };

    it('should return application for applicant', async () => {
      mockPrismaService.rentalApplication.findUnique.mockResolvedValue(
        mockApplication,
      );

      const result = await service.getById(applicationId, applicantId);

      expect(result.id).toBe(applicationId);
    });

    it('should return application for property owner', async () => {
      mockPrismaService.rentalApplication.findUnique.mockResolvedValue(
        mockApplication,
      );

      const result = await service.getById(applicationId, ownerId);

      expect(result.id).toBe(applicationId);
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.rentalApplication.findUnique.mockResolvedValue(null);

      await expect(
        service.getById(applicationId, applicantId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for unauthorized user', async () => {
      mockPrismaService.rentalApplication.findUnique.mockResolvedValue(
        mockApplication,
      );

      await expect(
        service.getById(applicationId, 'other-user'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getPropertyApplications', () => {
    const propertyId = 'prop-123';
    const ownerId = 'owner-123';

    it('should return applications for property owner', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue({
        id: propertyId,
        ownerId,
      });
      mockPrismaService.rentalApplication.findMany.mockResolvedValue([]);
      mockPrismaService.rentalApplication.count.mockResolvedValue(0);

      const result = await service.getPropertyApplications(propertyId, ownerId, {});

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it('should throw NotFoundException if property not found', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue(null);

      await expect(
        service.getPropertyApplications(propertyId, ownerId, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-owner', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue({
        id: propertyId,
        ownerId: 'different-owner',
      });

      await expect(
        service.getPropertyApplications(propertyId, ownerId, {}),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('review', () => {
    const applicationId = 'app-123';
    const ownerId = 'owner-123';
    const applicantId = 'applicant-123';

    const mockApplication = {
      id: applicationId,
      applicantId,
      propertyId: 'prop-123',
      status: ApplicationStatus.PENDING,
      hasPets: false,
      incomeCurrency: 'EUR',
      createdAt: new Date(),
      updatedAt: new Date(),
      property: {
        id: 'prop-123',
        title: 'Apartment',
        ownerId,
      },
      applicant: {
        id: applicantId,
        firstName: 'John',
        lastName: 'Doe',
      },
    };

    it('should update application status', async () => {
      mockPrismaService.rentalApplication.findUnique.mockResolvedValue(
        mockApplication,
      );
      mockPrismaService.rentalApplication.update.mockResolvedValue({
        ...mockApplication,
        status: ApplicationStatus.APPROVED,
        reviewedAt: new Date(),
        property: {
          id: 'prop-123',
          title: 'Apartment',
          address: '123 Main',
          city: 'Budapest',
          country: 'HU',
        },
        applicant: {
          id: applicantId,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        },
      });
      mockNotificationsService.create.mockResolvedValue({});

      const result = await service.review(applicationId, ownerId, {
        status: 'APPROVED',
        ownerNotes: 'Welcome!',
      });

      expect(result.status).toBe(ApplicationStatus.APPROVED);
      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        applicantId,
        'APPLICATION_STATUS_CHANGED',
        'Application approved',
        expect.stringContaining('approved'),
        expect.any(Object),
      );
    });

    it('should throw NotFoundException if application not found', async () => {
      mockPrismaService.rentalApplication.findUnique.mockResolvedValue(null);

      await expect(
        service.review(applicationId, ownerId, { status: 'APPROVED' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-owner', async () => {
      mockPrismaService.rentalApplication.findUnique.mockResolvedValue(
        mockApplication,
      );

      await expect(
        service.review(applicationId, 'other-user', { status: 'APPROVED' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for withdrawn applications', async () => {
      mockPrismaService.rentalApplication.findUnique.mockResolvedValue({
        ...mockApplication,
        status: ApplicationStatus.WITHDRAWN,
      });

      await expect(
        service.review(applicationId, ownerId, { status: 'APPROVED' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('withdraw', () => {
    const applicationId = 'app-123';
    const applicantId = 'applicant-123';
    const ownerId = 'owner-123';

    const mockApplication = {
      id: applicationId,
      applicantId,
      propertyId: 'prop-123',
      status: ApplicationStatus.PENDING,
      hasPets: false,
      incomeCurrency: 'EUR',
      createdAt: new Date(),
      updatedAt: new Date(),
      property: {
        id: 'prop-123',
        title: 'Apartment',
        ownerId,
      },
    };

    it('should withdraw application successfully', async () => {
      mockPrismaService.rentalApplication.findUnique.mockResolvedValue(
        mockApplication,
      );
      mockPrismaService.rentalApplication.update.mockResolvedValue({
        ...mockApplication,
        status: ApplicationStatus.WITHDRAWN,
        property: {
          id: 'prop-123',
          title: 'Apartment',
          address: '123 Main',
          city: 'Budapest',
          country: 'HU',
        },
        applicant: {
          id: applicantId,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        },
      });
      mockNotificationsService.create.mockResolvedValue({});

      const result = await service.withdraw(applicationId, applicantId);

      expect(result.status).toBe(ApplicationStatus.WITHDRAWN);
      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        ownerId,
        'APPLICATION_WITHDRAWN',
        'Application Withdrawn',
        expect.any(String),
        expect.any(Object),
      );
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.rentalApplication.findUnique.mockResolvedValue(null);

      await expect(
        service.withdraw(applicationId, applicantId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-applicant', async () => {
      mockPrismaService.rentalApplication.findUnique.mockResolvedValue(
        mockApplication,
      );

      await expect(
        service.withdraw(applicationId, 'other-user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for non-withdrawable status', async () => {
      mockPrismaService.rentalApplication.findUnique.mockResolvedValue({
        ...mockApplication,
        status: ApplicationStatus.APPROVED,
      });

      await expect(
        service.withdraw(applicationId, applicantId),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
