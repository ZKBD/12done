import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserRole, UserStatus } from '@prisma/client';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<UsersService>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    createdAt: new Date(),
  };

  const mockPublicUser = {
    id: 'user-123',
    firstName: 'John',
    lastName: 'Doe',
    createdAt: new Date(),
  };

  const mockCurrentUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: UserRole.USER,
  };

  const mockAdminUser = {
    id: 'admin-123',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            findByIdPublic: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
            getSocialProfiles: jest.fn(),
            updateSocialProfiles: jest.fn(),
            getInvitationNetwork: jest.fn(),
            updateRole: jest.fn(),
            updateStatus: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    const query = { page: 1, limit: 20 };
    const paginatedResponse = {
      items: [mockUser],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    };

    it('should call usersService.findAll with query', async () => {
      usersService.findAll.mockResolvedValue(paginatedResponse);

      const result = await controller.findAll(query);

      expect(usersService.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(paginatedResponse);
    });

    it('should return paginated users', async () => {
      usersService.findAll.mockResolvedValue(paginatedResponse);

      const result = await controller.findAll(query);

      expect(result.items).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should propagate service errors', async () => {
      usersService.findAll.mockRejectedValue(new Error('Database error'));

      await expect(controller.findAll(query)).rejects.toThrow('Database error');
    });
  });

  describe('findById', () => {
    it('should call usersService.findById with id and current user info', async () => {
      usersService.findById.mockResolvedValue(mockUser);

      const result = await controller.findById('user-123', mockCurrentUser);

      expect(usersService.findById).toHaveBeenCalledWith(
        'user-123',
        'user-123',
        UserRole.USER,
      );
      expect(result).toEqual(mockUser);
    });

    it('should return user details', async () => {
      usersService.findById.mockResolvedValue(mockUser);

      const result = await controller.findById('user-123', mockCurrentUser);

      expect(result.id).toBe('user-123');
      expect(result.email).toBe('test@example.com');
    });

    it('should propagate service errors', async () => {
      usersService.findById.mockRejectedValue(new Error('User not found'));

      await expect(controller.findById('user-123', mockCurrentUser)).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('findByIdPublic', () => {
    it('should call usersService.findByIdPublic with id', async () => {
      usersService.findByIdPublic.mockResolvedValue(mockPublicUser);

      const result = await controller.findByIdPublic('user-123');

      expect(usersService.findByIdPublic).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(mockPublicUser);
    });

    it('should return public user profile', async () => {
      usersService.findByIdPublic.mockResolvedValue(mockPublicUser);

      const result = await controller.findByIdPublic('user-123');

      expect(result.id).toBe('user-123');
      expect(result.firstName).toBe('John');
      expect(result).not.toHaveProperty('email');
    });

    it('should propagate service errors', async () => {
      usersService.findByIdPublic.mockRejectedValue(new Error('User not found'));

      await expect(controller.findByIdPublic('user-123')).rejects.toThrow('User not found');
    });
  });

  describe('update', () => {
    const updateDto = {
      firstName: 'Jane',
      lastName: 'Smith',
    };

    it('should call usersService.update with id, dto, and current user info', async () => {
      usersService.update.mockResolvedValue({ ...mockUser, ...updateDto });

      const result = await controller.update('user-123', updateDto, mockCurrentUser);

      expect(usersService.update).toHaveBeenCalledWith(
        'user-123',
        updateDto,
        'user-123',
        UserRole.USER,
      );
      expect(result.firstName).toBe('Jane');
    });

    it('should return updated user', async () => {
      usersService.update.mockResolvedValue({ ...mockUser, firstName: 'Updated' });

      const result = await controller.update('user-123', updateDto, mockCurrentUser);

      expect(result.firstName).toBe('Updated');
    });

    it('should propagate service errors', async () => {
      usersService.update.mockRejectedValue(new Error('Forbidden'));

      await expect(controller.update('user-123', updateDto, mockCurrentUser)).rejects.toThrow(
        'Forbidden',
      );
    });
  });

  describe('delete', () => {
    it('should call usersService.softDelete with id and current user info', async () => {
      usersService.softDelete.mockResolvedValue({ message: 'Account deleted' });

      const result = await controller.delete('user-123', mockCurrentUser);

      expect(usersService.softDelete).toHaveBeenCalledWith(
        'user-123',
        'user-123',
        UserRole.USER,
      );
      expect(result.message).toBe('Account deleted');
    });

    it('should return success message', async () => {
      usersService.softDelete.mockResolvedValue({ message: 'Deleted successfully' });

      const result = await controller.delete('user-123', mockCurrentUser);

      expect(result.message).toBeDefined();
    });

    it('should propagate service errors', async () => {
      usersService.softDelete.mockRejectedValue(new Error('Cannot delete'));

      await expect(controller.delete('user-123', mockCurrentUser)).rejects.toThrow(
        'Cannot delete',
      );
    });
  });

  describe('getSocialProfiles', () => {
    const mockProfiles = [
      { platform: 'LINKEDIN', url: 'https://linkedin.com/in/johndoe' },
      { platform: 'TWITTER', url: 'https://twitter.com/johndoe' },
    ];

    it('should call usersService.getSocialProfiles with id and current user info', async () => {
      usersService.getSocialProfiles.mockResolvedValue(mockProfiles);

      const result = await controller.getSocialProfiles('user-123', mockCurrentUser);

      expect(usersService.getSocialProfiles).toHaveBeenCalledWith(
        'user-123',
        'user-123',
        UserRole.USER,
      );
      expect(result).toEqual(mockProfiles);
    });

    it('should return social profiles array', async () => {
      usersService.getSocialProfiles.mockResolvedValue(mockProfiles);

      const result = await controller.getSocialProfiles('user-123', mockCurrentUser);

      expect(result).toHaveLength(2);
      expect(result[0].platform).toBe('LINKEDIN');
    });

    it('should return empty array when no profiles', async () => {
      usersService.getSocialProfiles.mockResolvedValue([]);

      const result = await controller.getSocialProfiles('user-123', mockCurrentUser);

      expect(result).toHaveLength(0);
    });

    it('should propagate service errors', async () => {
      usersService.getSocialProfiles.mockRejectedValue(new Error('User not found'));

      await expect(
        controller.getSocialProfiles('user-123', mockCurrentUser),
      ).rejects.toThrow('User not found');
    });
  });

  describe('updateSocialProfiles', () => {
    const updateDto = {
      profiles: [
        { platform: 'LINKEDIN', url: 'https://linkedin.com/in/janedoe' },
      ],
    };
    const updatedProfiles = [
      { platform: 'LINKEDIN', url: 'https://linkedin.com/in/janedoe' },
    ];

    it('should call usersService.updateSocialProfiles with id, dto, and current user info', async () => {
      usersService.updateSocialProfiles.mockResolvedValue(updatedProfiles);

      const result = await controller.updateSocialProfiles(
        'user-123',
        updateDto,
        mockCurrentUser,
      );

      expect(usersService.updateSocialProfiles).toHaveBeenCalledWith(
        'user-123',
        updateDto,
        'user-123',
        UserRole.USER,
      );
      expect(result).toEqual(updatedProfiles);
    });

    it('should return updated profiles', async () => {
      usersService.updateSocialProfiles.mockResolvedValue(updatedProfiles);

      const result = await controller.updateSocialProfiles(
        'user-123',
        updateDto,
        mockCurrentUser,
      );

      expect(result).toHaveLength(1);
    });

    it('should propagate service errors', async () => {
      usersService.updateSocialProfiles.mockRejectedValue(new Error('Forbidden'));

      await expect(
        controller.updateSocialProfiles('user-123', updateDto, mockCurrentUser),
      ).rejects.toThrow('Forbidden');
    });
  });

  describe('getInvitationNetwork', () => {
    const mockNetwork = {
      upstreamChain: [
        { id: 'inviter-1', firstName: 'Parent', lastName: 'User' },
      ],
      directInvitees: [
        { id: 'invitee-1', firstName: 'Child', lastName: 'User' },
      ],
    };

    it('should call usersService.getInvitationNetwork with id and current user info', async () => {
      usersService.getInvitationNetwork.mockResolvedValue(mockNetwork);

      const result = await controller.getInvitationNetwork('user-123', mockCurrentUser);

      expect(usersService.getInvitationNetwork).toHaveBeenCalledWith(
        'user-123',
        'user-123',
        UserRole.USER,
      );
      expect(result).toEqual(mockNetwork);
    });

    it('should return network data', async () => {
      usersService.getInvitationNetwork.mockResolvedValue(mockNetwork);

      const result = await controller.getInvitationNetwork('user-123', mockCurrentUser);

      expect(result.upstreamChain).toHaveLength(1);
      expect(result.directInvitees).toHaveLength(1);
    });

    it('should propagate service errors', async () => {
      usersService.getInvitationNetwork.mockRejectedValue(new Error('Forbidden'));

      await expect(
        controller.getInvitationNetwork('user-123', mockCurrentUser),
      ).rejects.toThrow('Forbidden');
    });
  });

  describe('updateRole', () => {
    it('should call usersService.updateRole with id, role, and admin id', async () => {
      usersService.updateRole.mockResolvedValue({ ...mockUser, role: UserRole.ADMIN });

      const result = await controller.updateRole('user-123', UserRole.ADMIN, mockAdminUser);

      expect(usersService.updateRole).toHaveBeenCalledWith(
        'user-123',
        UserRole.ADMIN,
        'admin-123',
      );
      expect(result.role).toBe(UserRole.ADMIN);
    });

    it('should return user with updated role', async () => {
      usersService.updateRole.mockResolvedValue({ ...mockUser, role: UserRole.ADMIN });

      const result = await controller.updateRole('user-123', UserRole.ADMIN, mockAdminUser);

      expect(result.role).toBe(UserRole.ADMIN);
    });

    it('should propagate service errors', async () => {
      usersService.updateRole.mockRejectedValue(new Error('Cannot update own role'));

      await expect(
        controller.updateRole('admin-123', UserRole.USER, mockAdminUser),
      ).rejects.toThrow('Cannot update own role');
    });
  });

  describe('updateStatus', () => {
    it('should call usersService.updateStatus with id and status', async () => {
      usersService.updateStatus.mockResolvedValue({ ...mockUser, status: UserStatus.SUSPENDED });

      const result = await controller.updateStatus('user-123', UserStatus.SUSPENDED);

      expect(usersService.updateStatus).toHaveBeenCalledWith('user-123', UserStatus.SUSPENDED);
      expect(result.status).toBe(UserStatus.SUSPENDED);
    });

    it('should return user with updated status', async () => {
      usersService.updateStatus.mockResolvedValue({ ...mockUser, status: UserStatus.SUSPENDED });

      const result = await controller.updateStatus('user-123', UserStatus.SUSPENDED);

      expect(result.status).toBe(UserStatus.SUSPENDED);
    });

    it('should handle different status values', async () => {
      const statuses = [
        UserStatus.ACTIVE,
        UserStatus.SUSPENDED,
        UserStatus.PENDING_VERIFICATION,
      ];

      for (const status of statuses) {
        usersService.updateStatus.mockResolvedValue({ ...mockUser, status });

        const result = await controller.updateStatus('user-123', status);

        expect(result.status).toBe(status);
      }
    });

    it('should propagate service errors', async () => {
      usersService.updateStatus.mockRejectedValue(new Error('User not found'));

      await expect(
        controller.updateStatus('user-123', UserStatus.SUSPENDED),
      ).rejects.toThrow('User not found');
    });
  });

  describe('authorization context passing', () => {
    it('should pass user role to findById', async () => {
      usersService.findById.mockResolvedValue(mockUser);

      await controller.findById('other-user', mockAdminUser);

      expect(usersService.findById).toHaveBeenCalledWith(
        'other-user',
        'admin-123',
        UserRole.ADMIN,
      );
    });

    it('should pass user role to update', async () => {
      usersService.update.mockResolvedValue(mockUser);

      await controller.update('other-user', { firstName: 'Test' }, mockAdminUser);

      expect(usersService.update).toHaveBeenCalledWith(
        'other-user',
        { firstName: 'Test' },
        'admin-123',
        UserRole.ADMIN,
      );
    });

    it('should pass user role to softDelete', async () => {
      usersService.softDelete.mockResolvedValue({ message: 'Deleted' });

      await controller.delete('other-user', mockAdminUser);

      expect(usersService.softDelete).toHaveBeenCalledWith(
        'other-user',
        'admin-123',
        UserRole.ADMIN,
      );
    });

    it('should pass user role to getSocialProfiles', async () => {
      usersService.getSocialProfiles.mockResolvedValue([]);

      await controller.getSocialProfiles('other-user', mockAdminUser);

      expect(usersService.getSocialProfiles).toHaveBeenCalledWith(
        'other-user',
        'admin-123',
        UserRole.ADMIN,
      );
    });

    it('should pass user role to updateSocialProfiles', async () => {
      usersService.updateSocialProfiles.mockResolvedValue([]);

      await controller.updateSocialProfiles('other-user', { profiles: [] }, mockAdminUser);

      expect(usersService.updateSocialProfiles).toHaveBeenCalledWith(
        'other-user',
        { profiles: [] },
        'admin-123',
        UserRole.ADMIN,
      );
    });

    it('should pass user role to getInvitationNetwork', async () => {
      usersService.getInvitationNetwork.mockResolvedValue({
        upstreamChain: [],
        directInvitees: [],
      });

      await controller.getInvitationNetwork('other-user', mockAdminUser);

      expect(usersService.getInvitationNetwork).toHaveBeenCalledWith(
        'other-user',
        'admin-123',
        UserRole.ADMIN,
      );
    });
  });
});
