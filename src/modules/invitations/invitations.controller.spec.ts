import { Test, TestingModule } from '@nestjs/testing';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';
import { UserRole, InvitationStatus } from '@prisma/client';

describe('InvitationsController', () => {
  let controller: InvitationsController;
  let invitationsService: jest.Mocked<InvitationsService>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: UserRole.USER,
    status: 'ACTIVE',
  };

  const mockAdminUser = {
    id: 'admin-123',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
    status: 'ACTIVE',
  };

  const mockInvitation = {
    id: 'invitation-123',
    email: 'invitee@example.com',
    status: InvitationStatus.PENDING,
    kickbackEligible: true,
    expiresAt: new Date('2025-02-01'),
    createdAt: new Date(),
  };

  const mockAcceptedInvitation = {
    ...mockInvitation,
    id: 'invitation-456',
    status: InvitationStatus.ACCEPTED,
    acceptedAt: new Date(),
    acceptedUserId: 'new-user-123',
    acceptedUser: {
      id: 'new-user-123',
      firstName: 'New',
      lastName: 'User',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvitationsController],
      providers: [
        {
          provide: InvitationsService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            cancel: jest.fn(),
            resend: jest.fn(),
            getStats: jest.fn(),
            getKickbackEligible: jest.fn(),
            markExpiredInvitations: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<InvitationsController>(InvitationsController);
    invitationsService = module.get(InvitationsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      email: 'invitee@example.com',
    };

    it('should call invitationsService.create with dto and userId', async () => {
      invitationsService.create.mockResolvedValue(mockInvitation as any);

      const result = await controller.create(createDto, mockUser);

      expect(invitationsService.create).toHaveBeenCalledWith(createDto, 'user-123');
      expect(result).toEqual(mockInvitation);
    });

    it('should return invitation response on success', async () => {
      invitationsService.create.mockResolvedValue(mockInvitation as any);

      const result = await controller.create(createDto, mockUser);

      expect(result.id).toBe('invitation-123');
      expect(result.email).toBe('invitee@example.com');
      expect(result.status).toBe(InvitationStatus.PENDING);
    });

    it('should propagate service errors', async () => {
      invitationsService.create.mockRejectedValue(new Error('User already exists'));

      await expect(controller.create(createDto, mockUser)).rejects.toThrow(
        'User already exists',
      );
    });
  });

  describe('findAll', () => {
    const query = { page: 1, limit: 20, skip: 0, take: 20 } as any;
    const paginatedResponse = {
      data: [mockInvitation],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    };

    it('should call invitationsService.findAll with userId and query', async () => {
      invitationsService.findAll.mockResolvedValue(paginatedResponse as any);

      const result = await controller.findAll(query as any, mockUser);

      expect(invitationsService.findAll).toHaveBeenCalledWith('user-123', query);
      expect(result).toEqual(paginatedResponse);
    });

    it('should return paginated invitations', async () => {
      invitationsService.findAll.mockResolvedValue(paginatedResponse as any);

      const result = await controller.findAll(query as any, mockUser);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should handle status filter', async () => {
      const queryWithFilter = { ...query, status: InvitationStatus.PENDING };
      invitationsService.findAll.mockResolvedValue(paginatedResponse as any);

      await controller.findAll(queryWithFilter as any, mockUser);

      expect(invitationsService.findAll).toHaveBeenCalledWith('user-123', queryWithFilter);
    });

    it('should propagate service errors', async () => {
      invitationsService.findAll.mockRejectedValue(new Error('Database error'));

      await expect(controller.findAll(query as any, mockUser)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('getStats', () => {
    const mockStats = {
      total: 10,
      pending: 3,
      accepted: 5,
      expired: 2,
      kickbackEligible: 4,
    };

    it('should call invitationsService.getStats with userId', async () => {
      invitationsService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats(mockUser);

      expect(invitationsService.getStats).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(mockStats);
    });

    it('should return all stat values', async () => {
      invitationsService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats(mockUser);

      expect(result.total).toBe(10);
      expect(result.pending).toBe(3);
      expect(result.accepted).toBe(5);
      expect(result.expired).toBe(2);
      expect(result.kickbackEligible).toBe(4);
    });

    it('should propagate service errors', async () => {
      invitationsService.getStats.mockRejectedValue(new Error('Stats error'));

      await expect(controller.getStats(mockUser)).rejects.toThrow('Stats error');
    });
  });

  describe('getKickbackEligible', () => {
    const kickbackInvitations = [mockAcceptedInvitation];

    it('should call invitationsService.getKickbackEligible with userId', async () => {
      invitationsService.getKickbackEligible.mockResolvedValue(kickbackInvitations as any);

      const result = await controller.getKickbackEligible(mockUser);

      expect(invitationsService.getKickbackEligible).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(kickbackInvitations);
    });

    it('should return array of kickback-eligible invitations', async () => {
      invitationsService.getKickbackEligible.mockResolvedValue(kickbackInvitations as any);

      const result = await controller.getKickbackEligible(mockUser);

      expect(result).toHaveLength(1);
      expect(result[0].kickbackEligible).toBe(true);
      expect(result[0].status).toBe(InvitationStatus.ACCEPTED);
    });

    it('should return empty array when no eligible invitations', async () => {
      invitationsService.getKickbackEligible.mockResolvedValue([]);

      const result = await controller.getKickbackEligible(mockUser);

      expect(result).toHaveLength(0);
    });

    it('should propagate service errors', async () => {
      invitationsService.getKickbackEligible.mockRejectedValue(new Error('Service error'));

      await expect(controller.getKickbackEligible(mockUser)).rejects.toThrow(
        'Service error',
      );
    });
  });

  describe('findById', () => {
    it('should call invitationsService.findById with id and user info', async () => {
      invitationsService.findById.mockResolvedValue(mockInvitation as any);

      const result = await controller.findById('invitation-123', mockUser);

      expect(invitationsService.findById).toHaveBeenCalledWith(
        'invitation-123',
        'user-123',
        UserRole.USER,
      );
      expect(result).toEqual(mockInvitation);
    });

    it('should pass admin role when user is admin', async () => {
      invitationsService.findById.mockResolvedValue(mockInvitation as any);

      await controller.findById('invitation-123', mockAdminUser);

      expect(invitationsService.findById).toHaveBeenCalledWith(
        'invitation-123',
        'admin-123',
        UserRole.ADMIN,
      );
    });

    it('should return invitation details', async () => {
      invitationsService.findById.mockResolvedValue(mockAcceptedInvitation as any);

      const result = await controller.findById('invitation-456', mockUser);

      expect(result.id).toBe('invitation-456');
      expect(result.acceptedUser).toBeDefined();
    });

    it('should propagate service errors', async () => {
      invitationsService.findById.mockRejectedValue(new Error('Invitation not found'));

      await expect(controller.findById('invalid-id', mockUser)).rejects.toThrow(
        'Invitation not found',
      );
    });
  });

  describe('resend', () => {
    const resendResponse = {
      ...mockInvitation,
      expiresAt: new Date('2025-02-08'), // Extended expiry
    };

    it('should call invitationsService.resend with id and userId', async () => {
      invitationsService.resend.mockResolvedValue(resendResponse as any);

      const result = await controller.resend('invitation-123', mockUser);

      expect(invitationsService.resend).toHaveBeenCalledWith('invitation-123', 'user-123');
      expect(result).toEqual(resendResponse);
    });

    it('should return updated invitation with new expiry', async () => {
      invitationsService.resend.mockResolvedValue(resendResponse as any);

      const result = await controller.resend('invitation-123', mockUser);

      expect(result.expiresAt).toEqual(new Date('2025-02-08'));
    });

    it('should propagate service errors for non-pending invitations', async () => {
      invitationsService.resend.mockRejectedValue(
        new Error('Cannot resend invitation with status: ACCEPTED'),
      );

      await expect(controller.resend('invitation-123', mockUser)).rejects.toThrow(
        'Cannot resend invitation with status: ACCEPTED',
      );
    });

    it('should propagate forbidden error for other user invitations', async () => {
      invitationsService.resend.mockRejectedValue(
        new Error('You can only resend your own invitations'),
      );

      await expect(controller.resend('invitation-123', mockUser)).rejects.toThrow(
        'You can only resend your own invitations',
      );
    });
  });

  describe('cancel', () => {
    const cancelResponse = { message: 'Invitation cancelled successfully' };

    it('should call invitationsService.cancel with id and user info', async () => {
      invitationsService.cancel.mockResolvedValue(cancelResponse);

      const result = await controller.cancel('invitation-123', mockUser);

      expect(invitationsService.cancel).toHaveBeenCalledWith(
        'invitation-123',
        'user-123',
        UserRole.USER,
      );
      expect(result).toEqual(cancelResponse);
    });

    it('should pass admin role when user is admin', async () => {
      invitationsService.cancel.mockResolvedValue(cancelResponse);

      await controller.cancel('invitation-123', mockAdminUser);

      expect(invitationsService.cancel).toHaveBeenCalledWith(
        'invitation-123',
        'admin-123',
        UserRole.ADMIN,
      );
    });

    it('should return success message', async () => {
      invitationsService.cancel.mockResolvedValue(cancelResponse);

      const result = await controller.cancel('invitation-123', mockUser);

      expect(result.message).toBe('Invitation cancelled successfully');
    });

    it('should propagate service errors for non-pending invitations', async () => {
      invitationsService.cancel.mockRejectedValue(
        new Error('Cannot cancel invitation with status: ACCEPTED'),
      );

      await expect(controller.cancel('invitation-123', mockUser)).rejects.toThrow(
        'Cannot cancel invitation with status: ACCEPTED',
      );
    });

    it('should propagate forbidden error', async () => {
      invitationsService.cancel.mockRejectedValue(
        new Error('You can only cancel your own invitations'),
      );

      await expect(controller.cancel('invitation-123', mockUser)).rejects.toThrow(
        'You can only cancel your own invitations',
      );
    });
  });

  describe('cleanupExpired', () => {
    it('should call invitationsService.markExpiredInvitations', async () => {
      invitationsService.markExpiredInvitations.mockResolvedValue(5);

      const result = await controller.cleanupExpired();

      expect(invitationsService.markExpiredInvitations).toHaveBeenCalled();
      expect(result.count).toBe(5);
    });

    it('should return count and formatted message', async () => {
      invitationsService.markExpiredInvitations.mockResolvedValue(10);

      const result = await controller.cleanupExpired();

      expect(result.count).toBe(10);
      expect(result.message).toBe('Marked 10 invitations as expired');
    });

    it('should handle zero expired invitations', async () => {
      invitationsService.markExpiredInvitations.mockResolvedValue(0);

      const result = await controller.cleanupExpired();

      expect(result.count).toBe(0);
      expect(result.message).toBe('Marked 0 invitations as expired');
    });

    it('should propagate service errors', async () => {
      invitationsService.markExpiredInvitations.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(controller.cleanupExpired()).rejects.toThrow('Database error');
    });
  });

  describe('authorization context passing', () => {
    it('should pass user role to findById', async () => {
      invitationsService.findById.mockResolvedValue(mockInvitation as any);

      await controller.findById('invitation-123', mockUser);

      expect(invitationsService.findById).toHaveBeenCalledWith(
        'invitation-123',
        'user-123',
        UserRole.USER,
      );
    });

    it('should pass admin role to findById', async () => {
      invitationsService.findById.mockResolvedValue(mockInvitation as any);

      await controller.findById('invitation-123', mockAdminUser);

      expect(invitationsService.findById).toHaveBeenCalledWith(
        'invitation-123',
        'admin-123',
        UserRole.ADMIN,
      );
    });

    it('should pass user role to cancel', async () => {
      invitationsService.cancel.mockResolvedValue({ message: 'Cancelled' });

      await controller.cancel('invitation-123', mockUser);

      expect(invitationsService.cancel).toHaveBeenCalledWith(
        'invitation-123',
        'user-123',
        UserRole.USER,
      );
    });

    it('should pass admin role to cancel', async () => {
      invitationsService.cancel.mockResolvedValue({ message: 'Cancelled' });

      await controller.cancel('invitation-123', mockAdminUser);

      expect(invitationsService.cancel).toHaveBeenCalledWith(
        'invitation-123',
        'admin-123',
        UserRole.ADMIN,
      );
    });
  });

  describe('invitation status transitions', () => {
    it('should handle pending invitation operations', async () => {
      const pendingInvitation = { ...mockInvitation, status: InvitationStatus.PENDING };
      invitationsService.findById.mockResolvedValue(pendingInvitation as any);

      const result = await controller.findById('invitation-123', mockUser);

      expect(result.status).toBe(InvitationStatus.PENDING);
    });

    it('should handle accepted invitation lookup', async () => {
      invitationsService.findById.mockResolvedValue(mockAcceptedInvitation as any);

      const result = await controller.findById('invitation-456', mockUser);

      expect(result.status).toBe(InvitationStatus.ACCEPTED);
      expect(result.acceptedUser).toBeDefined();
      expect(result.acceptedAt).toBeDefined();
    });

    it('should handle expired invitation lookup', async () => {
      const expiredInvitation = {
        ...mockInvitation,
        status: InvitationStatus.EXPIRED,
      };
      invitationsService.findById.mockResolvedValue(expiredInvitation as any);

      const result = await controller.findById('invitation-123', mockUser);

      expect(result.status).toBe(InvitationStatus.EXPIRED);
    });

    it('should handle cancelled invitation lookup', async () => {
      const cancelledInvitation = {
        ...mockInvitation,
        status: InvitationStatus.CANCELLED,
      };
      invitationsService.findById.mockResolvedValue(cancelledInvitation as any);

      const result = await controller.findById('invitation-123', mockUser);

      expect(result.status).toBe(InvitationStatus.CANCELLED);
    });
  });

  describe('edge cases', () => {
    it('should handle empty invitation list', async () => {
      const emptyResponse = {
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
      };
      invitationsService.findAll.mockResolvedValue(emptyResponse as any);

      const result = await controller.findAll({} as any, mockUser);

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });

    it('should handle stats with all zeros', async () => {
      const zeroStats = {
        total: 0,
        pending: 0,
        accepted: 0,
        expired: 0,
        kickbackEligible: 0,
      };
      invitationsService.getStats.mockResolvedValue(zeroStats);

      const result = await controller.getStats(mockUser);

      expect(result.total).toBe(0);
      expect(result.pending).toBe(0);
    });

    it('should handle invitation with no accepted user', async () => {
      invitationsService.findById.mockResolvedValue(mockInvitation as any);

      const result = await controller.findById('invitation-123', mockUser);

      expect(result.acceptedUser).toBeUndefined();
      expect(result.acceptedUserId).toBeUndefined();
    });
  });
});
