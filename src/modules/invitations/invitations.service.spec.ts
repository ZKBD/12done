import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InvitationStatus, UserRole } from '@prisma/client';
import { InvitationsService } from './invitations.service';
import { PrismaService } from '@/database';
import { MailService } from '@/mail';

describe('InvitationsService', () => {
  let service: InvitationsService;
  let prismaService: jest.Mocked<PrismaService>;
  let mailService: jest.Mocked<MailService>;

  const mockUser = {
    id: 'user-123',
    email: 'inviter@example.com',
    firstName: 'John',
    lastName: 'Doe',
  };

  const mockInvitation = {
    id: 'invitation-123',
    email: 'invitee@example.com',
    inviterId: 'user-123',
    status: InvitationStatus.PENDING,
    token: 'test-token',
    kickbackEligible: true,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    acceptedAt: null,
    acceptedUserId: null,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationsService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
            },
            invitation: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
              count: jest.fn(),
            },
          },
        },
        {
          provide: MailService,
          useValue: {
            sendInvitationEmail: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<InvitationsService>(InvitationsService);
    prismaService = module.get(PrismaService);
    mailService = module.get(MailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = { email: 'invitee@example.com' };

    it('should throw NotFoundException if inviter not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.create(createDto, 'user-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for self-invitation', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        service.create({ email: 'inviter@example.com' }, 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if user already exists', async () => {
      (prismaService.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockUser) // inviter lookup
        .mockResolvedValueOnce({ id: 'existing-user' }); // existing user lookup

      await expect(service.create(createDto, 'user-123')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException if active invitation exists', async () => {
      (prismaService.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(null);
      (prismaService.invitation.findFirst as jest.Mock).mockResolvedValue(
        mockInvitation,
      );

      await expect(service.create(createDto, 'user-123')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should create invitation successfully', async () => {
      (prismaService.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(null);
      (prismaService.invitation.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.invitation.create as jest.Mock).mockResolvedValue(
        mockInvitation,
      );

      const result = await service.create(createDto, 'user-123');

      expect(result.id).toBe(mockInvitation.id);
      expect(result.email).toBe(mockInvitation.email);
      expect(result.status).toBe(InvitationStatus.PENDING);
      expect(prismaService.invitation.create).toHaveBeenCalled();
      expect(mailService.sendInvitationEmail).toHaveBeenCalled();
    });

    it('should normalize email to lowercase', async () => {
      (prismaService.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(null);
      (prismaService.invitation.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.invitation.create as jest.Mock).mockResolvedValue(
        mockInvitation,
      );

      await service.create({ email: 'INVITEE@EXAMPLE.COM' }, 'user-123');

      expect(prismaService.invitation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'invitee@example.com',
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    const createQueryDto = (overrides = {}) => {
      const dto = {
        page: 1,
        limit: 20,
        get skip() { return (this.page - 1) * this.limit; },
        get take() { return this.limit; },
        ...overrides,
      };
      return dto;
    };

    it('should return paginated invitations', async () => {
      const invitations = [mockInvitation];
      (prismaService.invitation.findMany as jest.Mock).mockResolvedValue(
        invitations,
      );
      (prismaService.invitation.count as jest.Mock).mockResolvedValue(1);

      const result = await service.findAll('user-123', createQueryDto());

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by status', async () => {
      (prismaService.invitation.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.invitation.count as jest.Mock).mockResolvedValue(0);

      await service.findAll('user-123', createQueryDto({ status: InvitationStatus.ACCEPTED }));

      expect(prismaService.invitation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: InvitationStatus.ACCEPTED,
          }),
        }),
      );
    });

    it('should filter by search term', async () => {
      (prismaService.invitation.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.invitation.count as jest.Mock).mockResolvedValue(0);

      await service.findAll('user-123', createQueryDto({ search: 'test' }));

      expect(prismaService.invitation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            email: { contains: 'test', mode: 'insensitive' },
          }),
        }),
      );
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException if invitation not found', async () => {
      (prismaService.invitation.findUnique as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.findById('inv-123', 'user-123', UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-owner non-admin', async () => {
      (prismaService.invitation.findUnique as jest.Mock).mockResolvedValue({
        ...mockInvitation,
        inviterId: 'other-user',
      });

      await expect(
        service.findById('inv-123', 'user-123', UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow owner to view invitation', async () => {
      (prismaService.invitation.findUnique as jest.Mock).mockResolvedValue(
        mockInvitation,
      );

      const result = await service.findById('inv-123', 'user-123', UserRole.USER);

      expect(result.id).toBe(mockInvitation.id);
    });

    it('should allow admin to view any invitation', async () => {
      (prismaService.invitation.findUnique as jest.Mock).mockResolvedValue({
        ...mockInvitation,
        inviterId: 'other-user',
      });

      const result = await service.findById('inv-123', 'admin-123', UserRole.ADMIN);

      expect(result.id).toBe(mockInvitation.id);
    });
  });

  describe('cancel', () => {
    it('should throw NotFoundException if invitation not found', async () => {
      (prismaService.invitation.findUnique as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.cancel('inv-123', 'user-123', UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-owner non-admin', async () => {
      (prismaService.invitation.findUnique as jest.Mock).mockResolvedValue({
        ...mockInvitation,
        inviterId: 'other-user',
      });

      await expect(
        service.cancel('inv-123', 'user-123', UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for non-pending invitation', async () => {
      (prismaService.invitation.findUnique as jest.Mock).mockResolvedValue({
        ...mockInvitation,
        status: InvitationStatus.ACCEPTED,
      });

      await expect(
        service.cancel('inv-123', 'user-123', UserRole.USER),
      ).rejects.toThrow(BadRequestException);
    });

    it('should cancel invitation successfully', async () => {
      (prismaService.invitation.findUnique as jest.Mock).mockResolvedValue(
        mockInvitation,
      );
      (prismaService.invitation.update as jest.Mock).mockResolvedValue({
        ...mockInvitation,
        status: InvitationStatus.CANCELLED,
      });

      const result = await service.cancel('inv-123', 'user-123', UserRole.USER);

      expect(result.message).toContain('cancelled');
      expect(prismaService.invitation.update).toHaveBeenCalledWith({
        where: { id: 'inv-123' },
        data: { status: InvitationStatus.CANCELLED },
      });
    });

    it('should allow admin to cancel any invitation', async () => {
      (prismaService.invitation.findUnique as jest.Mock).mockResolvedValue({
        ...mockInvitation,
        inviterId: 'other-user',
      });
      (prismaService.invitation.update as jest.Mock).mockResolvedValue({
        ...mockInvitation,
        status: InvitationStatus.CANCELLED,
      });

      const result = await service.cancel('inv-123', 'admin-123', UserRole.ADMIN);

      expect(result.message).toContain('cancelled');
    });
  });

  describe('resend', () => {
    const mockInvitationWithInviter = {
      ...mockInvitation,
      inviter: {
        id: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
      },
    };

    it('should throw NotFoundException if invitation not found', async () => {
      (prismaService.invitation.findUnique as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(service.resend('inv-123', 'user-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException for non-owner', async () => {
      (prismaService.invitation.findUnique as jest.Mock).mockResolvedValue({
        ...mockInvitationWithInviter,
        inviterId: 'other-user',
      });

      await expect(service.resend('inv-123', 'user-123')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException for non-pending invitation', async () => {
      (prismaService.invitation.findUnique as jest.Mock).mockResolvedValue({
        ...mockInvitationWithInviter,
        status: InvitationStatus.ACCEPTED,
      });

      await expect(service.resend('inv-123', 'user-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should resend invitation successfully', async () => {
      (prismaService.invitation.findUnique as jest.Mock).mockResolvedValue(
        mockInvitationWithInviter,
      );
      (prismaService.invitation.update as jest.Mock).mockResolvedValue(
        mockInvitation,
      );

      const result = await service.resend('inv-123', 'user-123');

      expect(result.id).toBe(mockInvitation.id);
      expect(prismaService.invitation.update).toHaveBeenCalled();
      expect(mailService.sendInvitationEmail).toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return invitation statistics', async () => {
      (prismaService.invitation.count as jest.Mock)
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(5) // pending
        .mockResolvedValueOnce(3) // accepted
        .mockResolvedValueOnce(2) // expired
        .mockResolvedValueOnce(2); // kickbackEligible

      const result = await service.getStats('user-123');

      expect(result.total).toBe(10);
      expect(result.pending).toBe(5);
      expect(result.accepted).toBe(3);
      expect(result.expired).toBe(2);
      expect(result.kickbackEligible).toBe(2);
    });

    it('should return zero stats for user with no invitations', async () => {
      (prismaService.invitation.count as jest.Mock).mockResolvedValue(0);

      const result = await service.getStats('user-123');

      expect(result.total).toBe(0);
      expect(result.pending).toBe(0);
      expect(result.accepted).toBe(0);
    });
  });

  describe('getKickbackEligible', () => {
    it('should return kickback-eligible invitations', async () => {
      const acceptedInvitations = [
        {
          ...mockInvitation,
          status: InvitationStatus.ACCEPTED,
          acceptedUser: { id: 'new-user', firstName: 'Jane', lastName: 'Doe' },
        },
      ];
      (prismaService.invitation.findMany as jest.Mock).mockResolvedValue(
        acceptedInvitations,
      );

      const result = await service.getKickbackEligible('user-123');

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(InvitationStatus.ACCEPTED);
      expect(prismaService.invitation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            inviterId: 'user-123',
            status: InvitationStatus.ACCEPTED,
            kickbackEligible: true,
          },
        }),
      );
    });

    it('should return empty array when no kickback-eligible invitations', async () => {
      (prismaService.invitation.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getKickbackEligible('user-123');

      expect(result).toHaveLength(0);
    });
  });

  describe('markExpiredInvitations', () => {
    it('should mark expired invitations', async () => {
      (prismaService.invitation.updateMany as jest.Mock).mockResolvedValue({
        count: 5,
      });

      const result = await service.markExpiredInvitations();

      expect(result).toBe(5);
      expect(prismaService.invitation.updateMany).toHaveBeenCalledWith({
        where: {
          status: InvitationStatus.PENDING,
          expiresAt: { lt: expect.any(Date) },
        },
        data: {
          status: InvitationStatus.EXPIRED,
        },
      });
    });

    it('should return 0 when no invitations to expire', async () => {
      (prismaService.invitation.updateMany as jest.Mock).mockResolvedValue({
        count: 0,
      });

      const result = await service.markExpiredInvitations();

      expect(result).toBe(0);
    });
  });
});
