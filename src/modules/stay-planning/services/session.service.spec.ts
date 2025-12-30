import { Test, TestingModule } from '@nestjs/testing';
import { SessionService } from './session.service';
import { PrismaService } from '../../../database/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Season, InterestCategory } from '../dto';

describe('SessionService', () => {
  let service: SessionService;
  let prisma: PrismaService;

  const mockUserId = 'user-123';
  const mockSessionId = 'session-123';
  const mockPropertyId = 'property-123';

  const mockSession = {
    id: mockSessionId,
    userId: mockUserId,
    propertyId: mockPropertyId,
    season: null,
    startDate: null,
    endDate: null,
    budgetMin: null,
    budgetMax: null,
    currency: 'EUR',
    interests: [],
    numberOfGuests: null,
    hasChildren: null,
    childrenAges: [],
    mobilityNeeds: false,
    preferredPace: null,
    proposals: null,
    selectedProposalIndex: null,
    currentStep: 1,
    isCompleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    stayPlanningSession: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    property: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create a new planning session', async () => {
      mockPrismaService.stayPlanningSession.create.mockResolvedValue(mockSession);

      const result = await service.createSession(mockUserId, {});

      expect(result.id).toBe(mockSessionId);
      expect(result.userId).toBe(mockUserId);
      expect(result.currentStep).toBe(1);
    });

    it('should create session with property link', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue({ id: mockPropertyId });
      mockPrismaService.stayPlanningSession.create.mockResolvedValue({
        ...mockSession,
        propertyId: mockPropertyId,
      });

      const result = await service.createSession(mockUserId, {
        propertyId: mockPropertyId,
      });

      expect(result.propertyId).toBe(mockPropertyId);
    });

    it('should throw NotFoundException for invalid property', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue(null);

      await expect(
        service.createSession(mockUserId, { propertyId: 'invalid' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSession', () => {
    it('should return session by ID', async () => {
      mockPrismaService.stayPlanningSession.findFirst.mockResolvedValue(mockSession);

      const result = await service.getSession(mockUserId, mockSessionId);

      expect(result.id).toBe(mockSessionId);
    });

    it('should throw NotFoundException for invalid session', async () => {
      mockPrismaService.stayPlanningSession.findFirst.mockResolvedValue(null);

      await expect(
        service.getSession(mockUserId, 'invalid'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserSessions', () => {
    it('should return all user sessions', async () => {
      mockPrismaService.stayPlanningSession.findMany.mockResolvedValue([mockSession]);

      const result = await service.getUserSessions(mockUserId);

      expect(result).toHaveLength(1);
    });

    it('should filter by completed status', async () => {
      mockPrismaService.stayPlanningSession.findMany.mockResolvedValue([]);

      await service.getUserSessions(mockUserId, { completed: true });

      expect(mockPrismaService.stayPlanningSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isCompleted: true }),
        }),
      );
    });

    it('should filter by property ID', async () => {
      mockPrismaService.stayPlanningSession.findMany.mockResolvedValue([]);

      await service.getUserSessions(mockUserId, { propertyId: mockPropertyId });

      expect(mockPrismaService.stayPlanningSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ propertyId: mockPropertyId }),
        }),
      );
    });
  });

  describe('updateWizardStep', () => {
    it('should update wizard step with answers', async () => {
      mockPrismaService.stayPlanningSession.findFirst.mockResolvedValue(mockSession);
      mockPrismaService.stayPlanningSession.update.mockResolvedValue({
        ...mockSession,
        season: Season.SUMMER,
        interests: [InterestCategory.CULTURE, InterestCategory.FOOD],
        currentStep: 2,
      });

      const result = await service.updateWizardStep(mockUserId, mockSessionId, {
        season: Season.SUMMER,
        interests: [InterestCategory.CULTURE, InterestCategory.FOOD],
        currentStep: 2,
      });

      expect(result.season).toBe(Season.SUMMER);
      expect(result.interests).toHaveLength(2);
      expect(result.currentStep).toBe(2);
    });

    it('should throw NotFoundException for invalid session', async () => {
      mockPrismaService.stayPlanningSession.findFirst.mockResolvedValue(null);

      await expect(
        service.updateWizardStep(mockUserId, 'invalid', {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for completed session', async () => {
      mockPrismaService.stayPlanningSession.findFirst.mockResolvedValue({
        ...mockSession,
        isCompleted: true,
      });

      await expect(
        service.updateWizardStep(mockUserId, mockSessionId, {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate date range', async () => {
      mockPrismaService.stayPlanningSession.findFirst.mockResolvedValue(mockSession);

      await expect(
        service.updateWizardStep(mockUserId, mockSessionId, {
          startDate: '2024-12-15',
          endDate: '2024-12-10',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate budget range', async () => {
      mockPrismaService.stayPlanningSession.findFirst.mockResolvedValue(mockSession);

      await expect(
        service.updateWizardStep(mockUserId, mockSessionId, {
          budgetMin: 1000,
          budgetMax: 500,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('generateProposals', () => {
    it('should generate AI proposals', async () => {
      const sessionWithDates = {
        ...mockSession,
        startDate: new Date('2024-12-15'),
        endDate: new Date('2024-12-20'),
        interests: [InterestCategory.CULTURE],
      };
      mockPrismaService.stayPlanningSession.findFirst.mockResolvedValue(sessionWithDates);
      mockPrismaService.stayPlanningSession.update.mockResolvedValue(sessionWithDates);

      const result = await service.generateProposals(mockUserId, mockSessionId);

      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('estimatedCost');
      expect(result[0]).toHaveProperty('dailyBreakdown');
    });

    it('should throw NotFoundException for invalid session', async () => {
      mockPrismaService.stayPlanningSession.findFirst.mockResolvedValue(null);

      await expect(
        service.generateProposals(mockUserId, 'invalid'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException without dates', async () => {
      mockPrismaService.stayPlanningSession.findFirst.mockResolvedValue(mockSession);

      await expect(
        service.generateProposals(mockUserId, mockSessionId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('selectProposal', () => {
    it('should select a proposal', async () => {
      const sessionWithProposals = {
        ...mockSession,
        proposals: [
          { index: 0, title: 'Proposal 1' },
          { index: 1, title: 'Proposal 2' },
        ],
      };
      mockPrismaService.stayPlanningSession.findFirst.mockResolvedValue(sessionWithProposals);
      mockPrismaService.stayPlanningSession.update.mockResolvedValue({
        ...sessionWithProposals,
        selectedProposalIndex: 1,
      });

      const result = await service.selectProposal(mockUserId, mockSessionId, {
        proposalIndex: 1,
      });

      expect(result.selectedProposalIndex).toBe(1);
    });

    it('should throw BadRequestException for invalid proposal index', async () => {
      mockPrismaService.stayPlanningSession.findFirst.mockResolvedValue({
        ...mockSession,
        proposals: [{ index: 0 }],
      });

      await expect(
        service.selectProposal(mockUserId, mockSessionId, { proposalIndex: 5 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('completeSession', () => {
    it('should complete a session', async () => {
      mockPrismaService.stayPlanningSession.findFirst.mockResolvedValue(mockSession);
      mockPrismaService.stayPlanningSession.update.mockResolvedValue({
        ...mockSession,
        isCompleted: true,
      });

      const result = await service.completeSession(mockUserId, mockSessionId);

      expect(result.isCompleted).toBe(true);
    });

    it('should throw NotFoundException for invalid session', async () => {
      mockPrismaService.stayPlanningSession.findFirst.mockResolvedValue(null);

      await expect(
        service.completeSession(mockUserId, 'invalid'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteSession', () => {
    it('should delete a session', async () => {
      mockPrismaService.stayPlanningSession.findFirst.mockResolvedValue(mockSession);
      mockPrismaService.stayPlanningSession.delete.mockResolvedValue(mockSession);

      await expect(
        service.deleteSession(mockUserId, mockSessionId),
      ).resolves.not.toThrow();
    });

    it('should throw NotFoundException for invalid session', async () => {
      mockPrismaService.stayPlanningSession.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteSession(mockUserId, 'invalid'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
