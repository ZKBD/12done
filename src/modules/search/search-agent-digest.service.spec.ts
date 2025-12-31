import { Test, TestingModule } from '@nestjs/testing';
import { NotificationFrequency, Prisma } from '@prisma/client';
import { SearchAgentDigestService } from './search-agent-digest.service';
import { PrismaService } from '@/database';
import { MailService } from '@/mail';

describe('SearchAgentDigestService', () => {
  let service: SearchAgentDigestService;
  let prismaService: jest.Mocked<PrismaService>;
  let mailService: jest.Mocked<MailService>;

  const mockUser = {
    id: 'user-123',
    email: 'user@example.com',
    firstName: 'John',
  };

  const mockProperty = {
    id: 'property-123',
    title: 'Beautiful Apartment',
    city: 'Budapest',
    basePrice: new Prisma.Decimal('200000'),
    currency: 'EUR',
    bedrooms: 2,
    bathrooms: 1,
    squareMeters: 75,
    media: [{ url: 'https://example.com/image.jpg' }],
  };

  const mockSearchAgentWithMatches = {
    id: 'agent-123',
    userId: 'user-123',
    name: 'Budapest Apartments',
    isActive: true,
    emailNotifications: true,
    notificationFrequency: NotificationFrequency.DAILY_DIGEST,
    unsubscribeToken: 'token-abc-123',
    user: mockUser,
    pendingMatches: [
      {
        id: 'match-1',
        searchAgentId: 'agent-123',
        propertyId: 'property-123',
        matchedAt: new Date(),
        notifiedAt: null,
        property: mockProperty,
      },
      {
        id: 'match-2',
        searchAgentId: 'agent-123',
        propertyId: 'property-456',
        matchedAt: new Date(),
        notifiedAt: null,
        property: {
          ...mockProperty,
          id: 'property-456',
          title: 'Cozy Studio',
        },
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchAgentDigestService,
        {
          provide: PrismaService,
          useValue: {
            searchAgent: {
              findMany: jest.fn(),
            },
            searchAgentMatch: {
              updateMany: jest.fn(),
              deleteMany: jest.fn(),
            },
          },
        },
        {
          provide: MailService,
          useValue: {
            sendSearchAgentDigestEmail: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SearchAgentDigestService>(SearchAgentDigestService);
    prismaService = module.get(PrismaService);
    mailService = module.get(MailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendDailyDigests', () => {
    it('should call sendDigests with DAILY_DIGEST frequency', async () => {
      (prismaService.searchAgent.findMany as jest.Mock).mockResolvedValue([]);

      await service.sendDailyDigests();

      expect(prismaService.searchAgent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            notificationFrequency: NotificationFrequency.DAILY_DIGEST,
          }),
        }),
      );
    });
  });

  describe('sendWeeklyDigests', () => {
    it('should call sendDigests with WEEKLY_DIGEST frequency', async () => {
      (prismaService.searchAgent.findMany as jest.Mock).mockResolvedValue([]);

      await service.sendWeeklyDigests();

      expect(prismaService.searchAgent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            notificationFrequency: NotificationFrequency.WEEKLY_DIGEST,
          }),
        }),
      );
    });
  });

  describe('sendDigests', () => {
    it('should find active agents with pending matches', async () => {
      (prismaService.searchAgent.findMany as jest.Mock).mockResolvedValue([]);

      await service.sendDigests(NotificationFrequency.DAILY_DIGEST);

      expect(prismaService.searchAgent.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          emailNotifications: true,
          notificationFrequency: NotificationFrequency.DAILY_DIGEST,
          pendingMatches: {
            some: {
              notifiedAt: null,
            },
          },
        },
        include: expect.objectContaining({
          user: expect.any(Object),
          pendingMatches: expect.any(Object),
        }),
      });
    });

    it('should send digest email with correct properties', async () => {
      (prismaService.searchAgent.findMany as jest.Mock).mockResolvedValue([mockSearchAgentWithMatches]);
      (prismaService.searchAgentMatch.updateMany as jest.Mock).mockResolvedValue({ count: 2 });

      await service.sendDigests(NotificationFrequency.DAILY_DIGEST);

      expect(mailService.sendSearchAgentDigestEmail).toHaveBeenCalledWith(
        mockUser.email,
        mockUser.firstName,
        mockSearchAgentWithMatches.name,
        2, // matchCount
        expect.arrayContaining([
          expect.objectContaining({
            id: 'property-123',
            title: 'Beautiful Apartment',
            city: 'Budapest',
          }),
        ]),
        expect.stringContaining('/search?agentId='),
        expect.stringContaining('/search-agents/unsubscribe?token='),
      );
    });

    it('should mark matches as notified after sending', async () => {
      (prismaService.searchAgent.findMany as jest.Mock).mockResolvedValue([mockSearchAgentWithMatches]);
      (prismaService.searchAgentMatch.updateMany as jest.Mock).mockResolvedValue({ count: 2 });

      await service.sendDigests(NotificationFrequency.DAILY_DIGEST);

      expect(prismaService.searchAgentMatch.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['match-1', 'match-2'] } },
        data: { notifiedAt: expect.any(Date) },
      });
    });

    it('should return count of digests sent', async () => {
      (prismaService.searchAgent.findMany as jest.Mock).mockResolvedValue([
        mockSearchAgentWithMatches,
        { ...mockSearchAgentWithMatches, id: 'agent-456' },
      ]);
      (prismaService.searchAgentMatch.updateMany as jest.Mock).mockResolvedValue({ count: 2 });

      const result = await service.sendDigests(NotificationFrequency.DAILY_DIGEST);

      expect(result).toBe(2);
    });

    it('should not send if no agents with pending matches', async () => {
      (prismaService.searchAgent.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.sendDigests(NotificationFrequency.DAILY_DIGEST);

      expect(result).toBe(0);
      expect(mailService.sendSearchAgentDigestEmail).not.toHaveBeenCalled();
    });

    it('should continue processing other agents if one fails', async () => {
      const failingAgent = {
        ...mockSearchAgentWithMatches,
        id: 'agent-failing',
        user: { ...mockUser, email: 'fail@example.com' },
      };
      const successAgent = {
        ...mockSearchAgentWithMatches,
        id: 'agent-success',
        user: { ...mockUser, email: 'success@example.com' },
      };

      (prismaService.searchAgent.findMany as jest.Mock).mockResolvedValue([failingAgent, successAgent]);
      (mailService.sendSearchAgentDigestEmail as jest.Mock)
        .mockRejectedValueOnce(new Error('Email failed'))
        .mockResolvedValueOnce(undefined);
      (prismaService.searchAgentMatch.updateMany as jest.Mock).mockResolvedValue({ count: 2 });

      const result = await service.sendDigests(NotificationFrequency.DAILY_DIGEST);

      expect(result).toBe(1); // Only successful one counts
      expect(mailService.sendSearchAgentDigestEmail).toHaveBeenCalledTimes(2);
    });

    it('should format property prices correctly', async () => {
      (prismaService.searchAgent.findMany as jest.Mock).mockResolvedValue([mockSearchAgentWithMatches]);
      (prismaService.searchAgentMatch.updateMany as jest.Mock).mockResolvedValue({ count: 2 });

      await service.sendDigests(NotificationFrequency.DAILY_DIGEST);

      expect(mailService.sendSearchAgentDigestEmail).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(Number),
        expect.arrayContaining([
          expect.objectContaining({
            price: '200000 EUR',
          }),
        ]),
        expect.any(String),
        expect.any(String),
      );
    });
  });

  describe('cleanupOldMatches', () => {
    it('should delete matches notified more than 30 days ago', async () => {
      (prismaService.searchAgentMatch.deleteMany as jest.Mock).mockResolvedValue({ count: 5 });

      await service.cleanupOldMatches();

      expect(prismaService.searchAgentMatch.deleteMany).toHaveBeenCalledWith({
        where: {
          notifiedAt: {
            not: null,
            lt: expect.any(Date),
          },
        },
      });

      // Verify the date is approximately 30 days ago
      const call = (prismaService.searchAgentMatch.deleteMany as jest.Mock).mock.calls[0][0];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const ltDate = call.where.notifiedAt.lt as Date;

      // Allow 1 minute tolerance for test execution time
      expect(Math.abs(ltDate.getTime() - thirtyDaysAgo.getTime())).toBeLessThan(60000);
    });

    it('should not delete unnotified matches', async () => {
      (prismaService.searchAgentMatch.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });

      await service.cleanupOldMatches();

      expect(prismaService.searchAgentMatch.deleteMany).toHaveBeenCalledWith({
        where: {
          notifiedAt: {
            not: null,
            lt: expect.any(Date),
          },
        },
      });
    });
  });
});
