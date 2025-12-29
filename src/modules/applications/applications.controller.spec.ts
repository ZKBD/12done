import { Test, TestingModule } from '@nestjs/testing';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { ApplicationStatus } from '@prisma/client';

describe('ApplicationsController', () => {
  let controller: ApplicationsController;

  const mockApplicationsService = {
    create: jest.fn(),
    getMyApplications: jest.fn(),
    getById: jest.fn(),
    getPropertyApplications: jest.fn(),
    review: jest.fn(),
    withdraw: jest.fn(),
  };

  const mockUser = { id: 'user-123', email: 'test@example.com' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApplicationsController],
      providers: [
        {
          provide: ApplicationsService,
          useValue: mockApplicationsService,
        },
      ],
    }).compile();

    controller = module.get<ApplicationsController>(ApplicationsController);

    jest.clearAllMocks();
  });

  describe('createApplication', () => {
    it('should call service.create with correct parameters', async () => {
      const propertyId = 'property-123';
      const dto = {
        employmentStatus: 'employed',
        employer: 'Tech Corp',
        monthlyIncome: 5000,
      };
      const expectedResult = {
        id: 'app-123',
        propertyId,
        applicantId: mockUser.id,
        status: ApplicationStatus.PENDING,
      };

      mockApplicationsService.create.mockResolvedValue(expectedResult);

      const result = await controller.createApplication(
        propertyId,
        mockUser as any,
        dto,
      );

      expect(result).toEqual(expectedResult);
      expect(mockApplicationsService.create).toHaveBeenCalledWith(
        propertyId,
        mockUser.id,
        dto,
      );
    });
  });

  describe('getMyApplications', () => {
    it('should return user applications', async () => {
      const query = { page: 1, limit: 20 };
      const expectedResult = {
        data: [{ id: 'app-1' }],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };

      mockApplicationsService.getMyApplications.mockResolvedValue(expectedResult);

      const result = await controller.getMyApplications(mockUser as any, query);

      expect(result).toEqual(expectedResult);
      expect(mockApplicationsService.getMyApplications).toHaveBeenCalledWith(
        mockUser.id,
        query,
      );
    });
  });

  describe('getApplication', () => {
    it('should return application details', async () => {
      const appId = 'app-123';
      const expectedResult = {
        id: appId,
        status: ApplicationStatus.PENDING,
      };

      mockApplicationsService.getById.mockResolvedValue(expectedResult);

      const result = await controller.getApplication(appId, mockUser as any);

      expect(result).toEqual(expectedResult);
      expect(mockApplicationsService.getById).toHaveBeenCalledWith(
        appId,
        mockUser.id,
      );
    });
  });

  describe('withdrawApplication', () => {
    it('should withdraw application', async () => {
      const appId = 'app-123';
      const expectedResult = {
        id: appId,
        status: ApplicationStatus.WITHDRAWN,
      };

      mockApplicationsService.withdraw.mockResolvedValue(expectedResult);

      const result = await controller.withdrawApplication(appId, mockUser as any);

      expect(result).toEqual(expectedResult);
      expect(mockApplicationsService.withdraw).toHaveBeenCalledWith(
        appId,
        mockUser.id,
      );
    });
  });

  describe('getPropertyApplications', () => {
    it('should return property applications', async () => {
      const propertyId = 'property-123';
      const query = { page: 1, limit: 20 };
      const expectedResult = {
        data: [{ id: 'app-1' }],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };

      mockApplicationsService.getPropertyApplications.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.getPropertyApplications(
        propertyId,
        mockUser as any,
        query,
      );

      expect(result).toEqual(expectedResult);
      expect(mockApplicationsService.getPropertyApplications).toHaveBeenCalledWith(
        propertyId,
        mockUser.id,
        query,
      );
    });
  });

  describe('reviewApplication', () => {
    it('should review application', async () => {
      const appId = 'app-123';
      const dto = {
        status: 'APPROVED' as const,
        ownerNotes: 'Welcome!',
      };
      const expectedResult = {
        id: appId,
        status: ApplicationStatus.APPROVED,
        ownerNotes: dto.ownerNotes,
      };

      mockApplicationsService.review.mockResolvedValue(expectedResult);

      const result = await controller.reviewApplication(
        appId,
        mockUser as any,
        dto,
      );

      expect(result).toEqual(expectedResult);
      expect(mockApplicationsService.review).toHaveBeenCalledWith(
        appId,
        mockUser.id,
        dto,
      );
    });
  });
});
