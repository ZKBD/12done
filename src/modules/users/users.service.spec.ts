import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import { UsersService } from './users.service';
import { PrismaService } from '@/database';

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+36201234567',
    address: '123 Test Street',
    postalCode: '1051',
    city: 'Budapest',
    country: 'HU',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    emailVerified: true,
    idVerificationStatus: 'NOT_STARTED',
    backgroundCheckStatus: 'NOT_STARTED',
    invitedById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    socialProfiles: [],
  };

  const mockSocialProfile = {
    id: 'profile-123',
    userId: 'user-123',
    platform: 'linkedin',
    profileUrl: 'https://linkedin.com/in/johndoe',
    createdAt: new Date(),
  };

  const createQueryDto = (overrides = {}) => {
    const dto = {
      page: 1,
      limit: 20,
      get skip() {
        return (this.page - 1) * this.limit;
      },
      get take() {
        return this.limit;
      },
      ...overrides,
    };
    return dto;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            socialProfile: {
              findMany: jest.fn(),
              deleteMany: jest.fn(),
              createMany: jest.fn(),
            },
            refreshToken: {
              updateMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const users = [mockUser];
      (prismaService.user.findMany as jest.Mock).mockResolvedValue(users);
      (prismaService.user.count as jest.Mock).mockResolvedValue(1);

      const result = await service.findAll(createQueryDto());

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('should filter by search term', async () => {
      (prismaService.user.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.user.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(createQueryDto({ search: 'john' }));

      expect(prismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { email: { contains: 'john', mode: 'insensitive' } },
              { firstName: { contains: 'john', mode: 'insensitive' } },
              { lastName: { contains: 'john', mode: 'insensitive' } },
            ]),
          }),
        }),
      );
    });

    it('should filter by role', async () => {
      (prismaService.user.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.user.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(createQueryDto({ role: UserRole.ADMIN }));

      expect(prismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: UserRole.ADMIN,
          }),
        }),
      );
    });

    it('should filter by status', async () => {
      (prismaService.user.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.user.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(createQueryDto({ status: UserStatus.ACTIVE }));

      expect(prismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: UserStatus.ACTIVE,
          }),
        }),
      );
    });

    it('should filter by country (uppercase)', async () => {
      (prismaService.user.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.user.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(createQueryDto({ country: 'hu' }));

      expect(prismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            country: 'HU',
          }),
        }),
      );
    });

    it('should filter by city', async () => {
      (prismaService.user.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.user.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(createQueryDto({ city: 'Budapest' }));

      expect(prismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            city: { contains: 'Budapest', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('should filter by invitedBy', async () => {
      (prismaService.user.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.user.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(createQueryDto({ invitedBy: 'inviter-123' }));

      expect(prismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            invitedById: 'inviter-123',
          }),
        }),
      );
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException if user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.findById('user-123', 'user-123', UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-owner non-admin', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        service.findById('user-123', 'other-user', UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow owner to view their profile', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.findById('user-123', 'user-123', UserRole.USER);

      expect(result.id).toBe(mockUser.id);
      expect(result.email).toBe(mockUser.email);
    });

    it('should allow admin to view any profile', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.findById('user-123', 'admin-123', UserRole.ADMIN);

      expect(result.id).toBe(mockUser.id);
    });
  });

  describe('findByIdPublic', () => {
    it('should throw NotFoundException if user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findByIdPublic('user-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for deleted user', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        status: UserStatus.DELETED,
      });

      await expect(service.findByIdPublic('user-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return public user info', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.findByIdPublic('user-123');

      expect(result.id).toBe(mockUser.id);
      expect(result.firstName).toBe(mockUser.firstName);
      expect(result.lastName).toBe(mockUser.lastName);
      // Should not include private fields
      expect(result).not.toHaveProperty('email');
      expect(result).not.toHaveProperty('phone');
      expect(result).not.toHaveProperty('address');
    });
  });

  describe('update', () => {
    const updateDto = { firstName: 'Jane' };

    it('should throw ForbiddenException for non-owner non-admin', async () => {
      await expect(
        service.update('user-123', updateDto, 'other-user', UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update('user-123', updateDto, 'user-123', UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for deleted user', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        status: UserStatus.DELETED,
      });

      await expect(
        service.update('user-123', updateDto, 'user-123', UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update user profile successfully', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        firstName: 'Jane',
      });

      const result = await service.update(
        'user-123',
        updateDto,
        'user-123',
        UserRole.USER,
      );

      expect(result.firstName).toBe('Jane');
      expect(prismaService.user.update).toHaveBeenCalled();
    });

    it('should allow admin to update any user', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        firstName: 'Jane',
      });

      const result = await service.update(
        'user-123',
        updateDto,
        'admin-123',
        UserRole.ADMIN,
      );

      expect(result.firstName).toBe('Jane');
    });

    it('should normalize country to uppercase', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        country: 'AT',
      });

      await service.update(
        'user-123',
        { country: 'at' },
        'user-123',
        UserRole.USER,
      );

      expect(prismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            country: 'AT',
          }),
        }),
      );
    });
  });

  describe('softDelete', () => {
    it('should throw ForbiddenException for non-owner non-admin', async () => {
      await expect(
        service.softDelete('user-123', 'other-user', UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.softDelete('user-123', 'user-123', UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if already deleted', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        status: UserStatus.DELETED,
      });

      await expect(
        service.softDelete('user-123', 'user-123', UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should soft delete user successfully', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        status: UserStatus.DELETED,
      });
      (prismaService.refreshToken.updateMany as jest.Mock).mockResolvedValue({
        count: 1,
      });

      const result = await service.softDelete('user-123', 'user-123', UserRole.USER);

      expect(result.message).toContain('deleted');
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { status: UserStatus.DELETED },
      });
      expect(prismaService.refreshToken.updateMany).toHaveBeenCalled();
    });

    it('should allow admin to delete any user', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        status: UserStatus.DELETED,
      });
      (prismaService.refreshToken.updateMany as jest.Mock).mockResolvedValue({
        count: 0,
      });

      const result = await service.softDelete('user-123', 'admin-123', UserRole.ADMIN);

      expect(result.message).toContain('deleted');
    });
  });

  describe('getSocialProfiles', () => {
    it('should throw NotFoundException if user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getSocialProfiles('user-123', 'requester-123', UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return social profiles', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.socialProfile.findMany as jest.Mock).mockResolvedValue([
        mockSocialProfile,
      ]);

      const result = await service.getSocialProfiles(
        'user-123',
        'other-user',
        UserRole.USER,
      );

      expect(result).toHaveLength(1);
      expect(result[0].platform).toBe('linkedin');
      expect(result[0].profileUrl).toBe('https://linkedin.com/in/johndoe');
    });

    it('should return empty array when no profiles', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.socialProfile.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getSocialProfiles(
        'user-123',
        'other-user',
        UserRole.USER,
      );

      expect(result).toHaveLength(0);
    });
  });

  describe('updateSocialProfiles', () => {
    const updateDto = {
      profiles: [{ platform: 'twitter', profileUrl: 'https://twitter.com/johndoe' }],
    };

    it('should throw ForbiddenException for non-owner non-admin', async () => {
      await expect(
        service.updateSocialProfiles('user-123', updateDto, 'other-user', UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateSocialProfiles('user-123', updateDto, 'user-123', UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update social profiles successfully', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.socialProfile.deleteMany as jest.Mock).mockResolvedValue({
        count: 1,
      });
      (prismaService.socialProfile.createMany as jest.Mock).mockResolvedValue({
        count: 1,
      });
      (prismaService.socialProfile.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'profile-456',
          platform: 'twitter',
          profileUrl: 'https://twitter.com/johndoe',
          createdAt: new Date(),
        },
      ]);

      const result = await service.updateSocialProfiles(
        'user-123',
        updateDto,
        'user-123',
        UserRole.USER,
      );

      expect(result).toHaveLength(1);
      expect(result[0].platform).toBe('twitter');
      expect(prismaService.socialProfile.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
      expect(prismaService.socialProfile.createMany).toHaveBeenCalled();
    });

    it('should handle empty profiles array', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.socialProfile.deleteMany as jest.Mock).mockResolvedValue({
        count: 1,
      });
      (prismaService.socialProfile.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.updateSocialProfiles(
        'user-123',
        { profiles: [] },
        'user-123',
        UserRole.USER,
      );

      expect(result).toHaveLength(0);
      expect(prismaService.socialProfile.createMany).not.toHaveBeenCalled();
    });

    it('should allow admin to update any user profiles', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.socialProfile.deleteMany as jest.Mock).mockResolvedValue({
        count: 0,
      });
      (prismaService.socialProfile.createMany as jest.Mock).mockResolvedValue({
        count: 1,
      });
      (prismaService.socialProfile.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'profile-456',
          platform: 'twitter',
          profileUrl: 'https://twitter.com/johndoe',
          createdAt: new Date(),
        },
      ]);

      const result = await service.updateSocialProfiles(
        'user-123',
        updateDto,
        'admin-123',
        UserRole.ADMIN,
      );

      expect(result).toHaveLength(1);
    });
  });

  describe('getInvitationNetwork', () => {
    it('should throw ForbiddenException for non-owner non-admin', async () => {
      await expect(
        service.getInvitationNetwork('user-123', 'other-user', UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getInvitationNetwork('user-123', 'user-123', UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return invitation network for user with no network', async () => {
      (prismaService.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockUser) // Initial user lookup
        .mockResolvedValueOnce({ invitedById: null, invitedBy: null }); // getUpstreamChain
      (prismaService.user.findMany as jest.Mock)
        .mockResolvedValueOnce([]) // directInvitees
        .mockResolvedValueOnce([]); // countDownstream

      const result = await service.getInvitationNetwork(
        'user-123',
        'user-123',
        UserRole.USER,
      );

      expect(result.userId).toBe('user-123');
      expect(result.upstream).toHaveLength(0);
      expect(result.directInvitees).toHaveLength(0);
      expect(result.totalDownstreamCount).toBe(0);
    });

    it('should return invitation network with upstream and downstream', async () => {
      const inviter = {
        id: 'inviter-123',
        firstName: 'Inviter',
        lastName: 'User',
        createdAt: new Date(),
      };

      const invitee = {
        id: 'invitee-123',
        firstName: 'Invitee',
        lastName: 'User',
        createdAt: new Date(),
      };

      (prismaService.user.findUnique as jest.Mock)
        .mockResolvedValueOnce({ ...mockUser, invitedById: 'inviter-123' }) // Initial lookup
        .mockResolvedValueOnce({ invitedById: 'inviter-123', invitedBy: inviter }) // getUpstreamChain - first
        .mockResolvedValueOnce({ invitedById: null, invitedBy: null }); // getUpstreamChain - end

      (prismaService.user.findMany as jest.Mock)
        .mockResolvedValueOnce([invitee]) // directInvitees
        .mockResolvedValueOnce([]) // countDownstream - first
        .mockResolvedValueOnce([]); // countDownstream - invitee's downstream

      const result = await service.getInvitationNetwork(
        'user-123',
        'user-123',
        UserRole.USER,
      );

      expect(result.userId).toBe('user-123');
      expect(result.upstream).toHaveLength(1);
      expect(result.upstream[0].firstName).toBe('Inviter');
      expect(result.directInvitees).toHaveLength(1);
      expect(result.directInvitees[0].firstName).toBe('Invitee');
    });

    it('should allow admin to view any user network', async () => {
      (prismaService.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce({ invitedById: null, invitedBy: null });
      (prismaService.user.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getInvitationNetwork(
        'user-123',
        'admin-123',
        UserRole.ADMIN,
      );

      expect(result.userId).toBe('user-123');
    });
  });

  describe('updateRole', () => {
    it('should throw NotFoundException if user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateRole('user-123', UserRole.ADMIN, 'admin-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when admin tries to remove own admin role', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        role: UserRole.ADMIN,
      });

      await expect(
        service.updateRole('admin-123', UserRole.USER, 'admin-123'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update user role successfully', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        role: UserRole.ADMIN,
      });

      const result = await service.updateRole('user-123', UserRole.ADMIN, 'admin-123');

      expect(result.role).toBe(UserRole.ADMIN);
      expect(prismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { role: UserRole.ADMIN },
        }),
      );
    });

    it('should allow admin to keep their admin role', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        id: 'admin-123',
        role: UserRole.ADMIN,
      });
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        id: 'admin-123',
        role: UserRole.ADMIN,
      });

      const result = await service.updateRole('admin-123', UserRole.ADMIN, 'admin-123');

      expect(result.role).toBe(UserRole.ADMIN);
    });
  });

  describe('updateStatus', () => {
    it('should throw NotFoundException if user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateStatus('user-123', UserStatus.SUSPENDED),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update user status successfully', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        status: UserStatus.ACTIVE,
      });

      const result = await service.updateStatus('user-123', UserStatus.ACTIVE);

      expect(result.status).toBe(UserStatus.ACTIVE);
    });

    it('should revoke refresh tokens when suspending user', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        status: UserStatus.SUSPENDED,
      });
      (prismaService.refreshToken.updateMany as jest.Mock).mockResolvedValue({
        count: 2,
      });

      await service.updateStatus('user-123', UserStatus.SUSPENDED);

      expect(prismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('should revoke refresh tokens when deleting user', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        status: UserStatus.DELETED,
      });
      (prismaService.refreshToken.updateMany as jest.Mock).mockResolvedValue({
        count: 1,
      });

      await service.updateStatus('user-123', UserStatus.DELETED);

      expect(prismaService.refreshToken.updateMany).toHaveBeenCalled();
    });

    it('should not revoke tokens when activating user', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        status: UserStatus.SUSPENDED,
      });
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        status: UserStatus.ACTIVE,
      });

      await service.updateStatus('user-123', UserStatus.ACTIVE);

      expect(prismaService.refreshToken.updateMany).not.toHaveBeenCalled();
    });
  });
});
