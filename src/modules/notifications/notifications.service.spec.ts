import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '@/database';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockNotification = {
    id: 'notif-123',
    userId: 'user-123',
    type: NotificationType.SEARCH_AGENT_MATCH,
    title: 'New matches found',
    message: 'Your search agent found 5 new properties',
    data: { matchCount: 5, searchAgentId: 'agent-123' },
    isRead: false,
    readAt: null,
    createdAt: new Date(),
  };

  const mockReadNotification = {
    ...mockNotification,
    id: 'notif-456',
    type: NotificationType.PROPERTY_INQUIRY,
    title: 'Property inquiry',
    message: 'You received an inquiry about your property',
    isRead: true,
    readAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: PrismaService,
          useValue: {
            notification: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
              delete: jest.fn(),
              deleteMany: jest.fn(),
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all notifications for user', async () => {
      (prismaService.notification.findMany as jest.Mock).mockResolvedValue([
        mockNotification,
        mockReadNotification,
      ]);

      const result = await service.findAll('user-123');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(mockNotification.id);
      expect(result[1].id).toBe(mockReadNotification.id);
    });

    it('should order by createdAt desc', async () => {
      (prismaService.notification.findMany as jest.Mock).mockResolvedValue([]);

      await service.findAll('user-123');

      expect(prismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should use default limit of 50', async () => {
      (prismaService.notification.findMany as jest.Mock).mockResolvedValue([]);

      await service.findAll('user-123');

      expect(prismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        }),
      );
    });

    it('should use custom limit when provided', async () => {
      (prismaService.notification.findMany as jest.Mock).mockResolvedValue([]);

      await service.findAll('user-123', { limit: 10 });

      expect(prismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        }),
      );
    });

    it('should filter unread only when specified', async () => {
      (prismaService.notification.findMany as jest.Mock).mockResolvedValue([mockNotification]);

      await service.findAll('user-123', { unreadOnly: true });

      expect(prismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-123', isRead: false },
        }),
      );
    });

    it('should return all when unreadOnly is false', async () => {
      (prismaService.notification.findMany as jest.Mock).mockResolvedValue([
        mockNotification,
        mockReadNotification,
      ]);

      await service.findAll('user-123', { unreadOnly: false });

      expect(prismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-123' },
        }),
      );
    });

    it('should return empty array when no notifications', async () => {
      (prismaService.notification.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.findAll('user-123');

      expect(result).toHaveLength(0);
    });

    it('should combine unreadOnly and limit options', async () => {
      (prismaService.notification.findMany as jest.Mock).mockResolvedValue([mockNotification]);

      await service.findAll('user-123', { unreadOnly: true, limit: 5 });

      expect(prismaService.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', isRead: false },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });
    });
  });

  describe('getStats', () => {
    it('should return notification statistics', async () => {
      (prismaService.notification.count as jest.Mock)
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(3); // unread

      const result = await service.getStats('user-123');

      expect(result.total).toBe(10);
      expect(result.unread).toBe(3);
    });

    it('should return zero stats when no notifications', async () => {
      (prismaService.notification.count as jest.Mock)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await service.getStats('user-123');

      expect(result.total).toBe(0);
      expect(result.unread).toBe(0);
    });

    it('should query with correct filters', async () => {
      (prismaService.notification.count as jest.Mock)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(2);

      await service.getStats('user-123');

      expect(prismaService.notification.count).toHaveBeenNthCalledWith(1, {
        where: { userId: 'user-123' },
      });
      expect(prismaService.notification.count).toHaveBeenNthCalledWith(2, {
        where: { userId: 'user-123', isRead: false },
      });
    });

    it('should handle all read notifications', async () => {
      (prismaService.notification.count as jest.Mock)
        .mockResolvedValueOnce(15)
        .mockResolvedValueOnce(0);

      const result = await service.getStats('user-123');

      expect(result.total).toBe(15);
      expect(result.unread).toBe(0);
    });
  });

  describe('markAsRead', () => {
    it('should throw NotFoundException if notification not found', async () => {
      (prismaService.notification.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.markAsRead('notif-123', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for wrong user', async () => {
      (prismaService.notification.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.markAsRead('notif-123', 'other-user'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should mark notification as read', async () => {
      (prismaService.notification.findFirst as jest.Mock).mockResolvedValue(mockNotification);
      (prismaService.notification.update as jest.Mock).mockResolvedValue({
        ...mockNotification,
        isRead: true,
        readAt: new Date(),
      });

      const result = await service.markAsRead('notif-123', 'user-123');

      expect(result.isRead).toBe(true);
      expect(result.readAt).toBeDefined();
      expect(prismaService.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-123' },
        data: {
          isRead: true,
          readAt: expect.any(Date),
        },
      });
    });

    it('should query with userId for security', async () => {
      (prismaService.notification.findFirst as jest.Mock).mockResolvedValue(mockNotification);
      (prismaService.notification.update as jest.Mock).mockResolvedValue({
        ...mockNotification,
        isRead: true,
        readAt: new Date(),
      });

      await service.markAsRead('notif-123', 'user-123');

      expect(prismaService.notification.findFirst).toHaveBeenCalledWith({
        where: { id: 'notif-123', userId: 'user-123' },
      });
    });

    it('should update already read notification without error', async () => {
      (prismaService.notification.findFirst as jest.Mock).mockResolvedValue(mockReadNotification);
      (prismaService.notification.update as jest.Mock).mockResolvedValue(mockReadNotification);

      const result = await service.markAsRead('notif-456', 'user-123');

      expect(result.isRead).toBe(true);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read', async () => {
      (prismaService.notification.updateMany as jest.Mock).mockResolvedValue({ count: 5 });

      const result = await service.markAllAsRead('user-123');

      expect(result.count).toBe(5);
      expect(prismaService.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', isRead: false },
        data: {
          isRead: true,
          readAt: expect.any(Date),
        },
      });
    });

    it('should return zero count when no unread notifications', async () => {
      (prismaService.notification.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      const result = await service.markAllAsRead('user-123');

      expect(result.count).toBe(0);
    });

    it('should only update unread notifications', async () => {
      (prismaService.notification.updateMany as jest.Mock).mockResolvedValue({ count: 3 });

      await service.markAllAsRead('user-123');

      expect(prismaService.notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isRead: false,
          }),
        }),
      );
    });
  });

  describe('delete', () => {
    it('should throw NotFoundException if notification not found', async () => {
      (prismaService.notification.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.delete('notif-123', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for wrong user', async () => {
      (prismaService.notification.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.delete('notif-123', 'other-user'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should delete notification successfully', async () => {
      (prismaService.notification.findFirst as jest.Mock).mockResolvedValue(mockNotification);
      (prismaService.notification.delete as jest.Mock).mockResolvedValue(mockNotification);

      const result = await service.delete('notif-123', 'user-123');

      expect(result.message).toContain('deleted');
      expect(prismaService.notification.delete).toHaveBeenCalledWith({
        where: { id: 'notif-123' },
      });
    });

    it('should query with userId for security', async () => {
      (prismaService.notification.findFirst as jest.Mock).mockResolvedValue(mockNotification);
      (prismaService.notification.delete as jest.Mock).mockResolvedValue(mockNotification);

      await service.delete('notif-123', 'user-123');

      expect(prismaService.notification.findFirst).toHaveBeenCalledWith({
        where: { id: 'notif-123', userId: 'user-123' },
      });
    });
  });

  describe('deleteAll', () => {
    it('should delete all notifications for user', async () => {
      (prismaService.notification.deleteMany as jest.Mock).mockResolvedValue({ count: 10 });

      const result = await service.deleteAll('user-123');

      expect(result.count).toBe(10);
      expect(prismaService.notification.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
    });

    it('should return zero count when no notifications', async () => {
      (prismaService.notification.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });

      const result = await service.deleteAll('user-123');

      expect(result.count).toBe(0);
    });
  });

  describe('create', () => {
    it('should create notification successfully', async () => {
      (prismaService.notification.create as jest.Mock).mockResolvedValue(mockNotification);

      const result = await service.create(
        'user-123',
        NotificationType.SEARCH_AGENT_MATCH,
        'New matches found',
        'Your search agent found 5 new properties',
        { matchCount: 5, searchAgentId: 'agent-123' },
      );

      expect(result.id).toBe(mockNotification.id);
      expect(result.type).toBe(NotificationType.SEARCH_AGENT_MATCH);
      expect(result.title).toBe('New matches found');
    });

    it('should create notification without data', async () => {
      const notificationWithoutData = {
        ...mockNotification,
        data: null,
      };
      (prismaService.notification.create as jest.Mock).mockResolvedValue(notificationWithoutData);

      const result = await service.create(
        'user-123',
        NotificationType.PROPERTY_INQUIRY,
        'Inquiry',
        'Property inquiry received',
      );

      expect(result.id).toBeDefined();
    });

    it('should pass correct data to prisma', async () => {
      (prismaService.notification.create as jest.Mock).mockResolvedValue(mockNotification);

      await service.create(
        'user-123',
        NotificationType.INVITATION_ACCEPTED,
        'Invitation accepted',
        'Your invitation was accepted',
        { inviteeId: 'invitee-123' },
      );

      expect(prismaService.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          type: NotificationType.INVITATION_ACCEPTED,
          title: 'Invitation accepted',
          message: 'Your invitation was accepted',
          data: { inviteeId: 'invitee-123' },
        },
      });
    });

    it('should handle different notification types', async () => {
      const types = [
        NotificationType.SEARCH_AGENT_MATCH,
        NotificationType.PROPERTY_INQUIRY,
        NotificationType.INVITATION_ACCEPTED,
        NotificationType.INSPECTION_BOOKED,
        NotificationType.INSPECTION_REMINDER,
      ];

      for (const type of types) {
        (prismaService.notification.create as jest.Mock).mockResolvedValue({
          ...mockNotification,
          type,
        });

        const result = await service.create('user-123', type, 'Title', 'Message');

        expect(result.type).toBe(type);
      }
    });
  });

  describe('response mapping', () => {
    it('should correctly map notification to response DTO', async () => {
      (prismaService.notification.findMany as jest.Mock).mockResolvedValue([mockNotification]);

      const result = await service.findAll('user-123');

      expect(result[0].id).toBe(mockNotification.id);
      expect(result[0].type).toBe(mockNotification.type);
      expect(result[0].title).toBe(mockNotification.title);
      expect(result[0].message).toBe(mockNotification.message);
      expect(result[0].data).toEqual(mockNotification.data);
      expect(result[0].isRead).toBe(false);
      expect(result[0].createdAt).toBe(mockNotification.createdAt);
    });

    it('should handle null readAt', async () => {
      (prismaService.notification.findMany as jest.Mock).mockResolvedValue([mockNotification]);

      const result = await service.findAll('user-123');

      expect(result[0].readAt).toBeUndefined();
    });

    it('should include readAt when present', async () => {
      (prismaService.notification.findMany as jest.Mock).mockResolvedValue([mockReadNotification]);

      const result = await service.findAll('user-123');

      expect(result[0].readAt).toBeDefined();
      expect(result[0].isRead).toBe(true);
    });

    it('should handle null data', async () => {
      const notificationWithNullData = {
        ...mockNotification,
        data: null,
      };
      (prismaService.notification.findMany as jest.Mock).mockResolvedValue([
        notificationWithNullData,
      ]);

      const result = await service.findAll('user-123');

      expect(result[0].data).toBeNull();
    });

    it('should preserve complex data objects', async () => {
      const complexData = {
        propertyId: 'prop-123',
        changes: ['price', 'description'],
        previousValues: { price: 100000 },
        newValues: { price: 95000 },
      };
      const notificationWithComplexData = {
        ...mockNotification,
        data: complexData,
      };
      (prismaService.notification.findMany as jest.Mock).mockResolvedValue([
        notificationWithComplexData,
      ]);

      const result = await service.findAll('user-123');

      expect(result[0].data).toEqual(complexData);
    });
  });
});
