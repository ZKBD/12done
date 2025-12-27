import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '@/database';
import { PaginatedResponseDto } from '@/common/dto';
import {
  UpdateUserDto,
  UpdateSocialProfilesDto,
  UserResponseDto,
  UserPublicResponseDto,
  UserQueryDto,
  SocialProfileResponseDto,
  InvitationNetworkResponseDto,
  InvitationNetworkNodeDto,
} from './dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    query: UserQueryDto,
  ): Promise<PaginatedResponseDto<UserResponseDto>> {
    const where: Record<string, unknown> = {};

    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.role) {
      where.role = query.role;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.country) {
      where.country = query.country.toUpperCase();
    }

    if (query.city) {
      where.city = { contains: query.city, mode: 'insensitive' };
    }

    if (query.invitedBy) {
      where.invitedById = query.invitedBy;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          socialProfiles: true,
        },
        orderBy: { [query.sortBy || 'createdAt']: query.sortOrder || 'desc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.user.count({ where }),
    ]);

    const data = users.map((user) => this.mapToUserResponseDto(user));

    return new PaginatedResponseDto(data, total, query.page || 1, query.limit || 20);
  }

  async findById(id: string, requesterId: string, requesterRole: UserRole): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        socialProfiles: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Users can only view their own full profile unless they're admin
    if (id !== requesterId && requesterRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only view your own profile');
    }

    return this.mapToUserResponseDto(user);
  }

  async findByIdPublic(id: string): Promise<UserPublicResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        socialProfiles: true,
      },
    });

    if (!user || user.status === UserStatus.DELETED) {
      throw new NotFoundException('User not found');
    }

    return this.mapToUserPublicResponseDto(user);
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<UserResponseDto> {
    // Users can only update their own profile unless they're admin
    if (id !== requesterId && requesterRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only update your own profile');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status === UserStatus.DELETED) {
      throw new ForbiddenException('Cannot update a deleted user');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.firstName && { firstName: dto.firstName }),
        ...(dto.lastName && { lastName: dto.lastName }),
        ...(dto.phone && { phone: dto.phone }),
        ...(dto.address && { address: dto.address }),
        ...(dto.postalCode && { postalCode: dto.postalCode }),
        ...(dto.city && { city: dto.city }),
        ...(dto.country && { country: dto.country.toUpperCase() }),
      },
      include: {
        socialProfiles: true,
      },
    });

    return this.mapToUserResponseDto(updatedUser);
  }

  async softDelete(
    id: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<{ message: string }> {
    // Users can only delete their own account unless they're admin
    if (id !== requesterId && requesterRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only delete your own account');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status === UserStatus.DELETED) {
      throw new ForbiddenException('User is already deleted');
    }

    // Soft delete - mark as deleted instead of actually removing
    await this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.DELETED },
    });

    // Revoke all refresh tokens
    await this.prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { message: 'Account deleted successfully' };
  }

  async getSocialProfiles(
    userId: string,
    _requesterId: string,
    _requesterRole: UserRole,
  ): Promise<SocialProfileResponseDto[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Anyone can view social profiles (they're public)
    const profiles = await this.prisma.socialProfile.findMany({
      where: { userId },
      orderBy: { platform: 'asc' },
    });

    return profiles.map((p) => ({
      id: p.id,
      platform: p.platform,
      profileUrl: p.profileUrl,
      createdAt: p.createdAt,
    }));
  }

  async updateSocialProfiles(
    userId: string,
    dto: UpdateSocialProfilesDto,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<SocialProfileResponseDto[]> {
    // Users can only update their own social profiles unless admin
    if (userId !== requesterId && requesterRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only update your own social profiles');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Delete all existing and create new ones (replace strategy)
    await this.prisma.socialProfile.deleteMany({
      where: { userId },
    });

    if (dto.profiles.length > 0) {
      await this.prisma.socialProfile.createMany({
        data: dto.profiles.map((p) => ({
          userId,
          platform: p.platform,
          profileUrl: p.profileUrl,
        })),
      });
    }

    const profiles = await this.prisma.socialProfile.findMany({
      where: { userId },
      orderBy: { platform: 'asc' },
    });

    return profiles.map((p) => ({
      id: p.id,
      platform: p.platform,
      profileUrl: p.profileUrl,
      createdAt: p.createdAt,
    }));
  }

  async getInvitationNetwork(
    userId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<InvitationNetworkResponseDto> {
    // Users can only view their own network unless admin
    if (userId !== requesterId && requesterRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only view your own invitation network');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get upstream chain (who invited this user, and who invited them, etc.)
    const upstream = await this.getUpstreamChain(userId);

    // Get direct invitees
    const directInvitees = await this.prisma.user.findMany({
      where: { invitedById: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Count total downstream (all users in the tree below this user)
    const totalDownstreamCount = await this.countDownstream(userId);

    return {
      userId,
      upstream,
      directInvitees: directInvitees.map((u) => ({
        userId: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        level: 1,
        joinedAt: u.createdAt,
      })),
      totalDownstreamCount,
    };
  }

  private async getUpstreamChain(userId: string): Promise<InvitationNetworkNodeDto[]> {
    const chain: InvitationNetworkNodeDto[] = [];
    let currentUserId = userId;
    let level = 0;

    while (level < 10) { // Limit to prevent infinite loops
      const user = await this.prisma.user.findUnique({
        where: { id: currentUserId },
        select: {
          invitedById: true,
          invitedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              createdAt: true,
            },
          },
        },
      });

      if (!user || !user.invitedById || !user.invitedBy) {
        break;
      }

      level++;
      chain.push({
        userId: user.invitedBy.id,
        firstName: user.invitedBy.firstName,
        lastName: user.invitedBy.lastName,
        level,
        joinedAt: user.invitedBy.createdAt,
      });

      currentUserId = user.invitedById;
    }

    return chain;
  }

  private async countDownstream(userId: string): Promise<number> {
    // Count all users who were invited by this user or their invitees (recursive)
    // Using a recursive CTE would be more efficient, but for simplicity:
    const directInvitees = await this.prisma.user.findMany({
      where: { invitedById: userId },
      select: { id: true },
    });

    let count = directInvitees.length;

    for (const invitee of directInvitees) {
      count += await this.countDownstream(invitee.id);
    }

    return count;
  }

  // Admin-only: Change user role
  async updateRole(
    userId: string,
    newRole: UserRole,
    adminId: string,
  ): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent admin from removing their own admin role
    if (userId === adminId && newRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You cannot remove your own admin role');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
      include: { socialProfiles: true },
    });

    return this.mapToUserResponseDto(updatedUser);
  }

  // Admin-only: Change user status (suspend/activate)
  async updateStatus(
    userId: string,
    newStatus: UserStatus,
  ): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { status: newStatus },
      include: { socialProfiles: true },
    });

    // If suspending or deleting, revoke all refresh tokens
    if (newStatus === UserStatus.SUSPENDED || newStatus === UserStatus.DELETED) {
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    return this.mapToUserResponseDto(updatedUser);
  }

  private mapToUserResponseDto(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    address: string | null;
    postalCode: string | null;
    city: string | null;
    country: string | null;
    role: UserRole;
    status: UserStatus;
    emailVerified: boolean;
    idVerificationStatus: string;
    backgroundCheckStatus: string;
    invitedById: string | null;
    createdAt: Date;
    updatedAt: Date;
    socialProfiles?: Array<{
      id: string;
      platform: string;
      profileUrl: string;
      createdAt: Date;
    }>;
  }): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone || undefined,
      address: user.address || undefined,
      postalCode: user.postalCode || undefined,
      city: user.city || undefined,
      country: user.country || undefined,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      idVerificationStatus: user.idVerificationStatus as UserResponseDto['idVerificationStatus'],
      backgroundCheckStatus: user.backgroundCheckStatus as UserResponseDto['backgroundCheckStatus'],
      invitedById: user.invitedById || undefined,
      socialProfiles: user.socialProfiles?.map((p) => ({
        id: p.id,
        platform: p.platform,
        profileUrl: p.profileUrl,
        createdAt: p.createdAt,
      })),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private mapToUserPublicResponseDto(user: {
    id: string;
    firstName: string;
    lastName: string;
    city: string | null;
    country: string | null;
    emailVerified: boolean;
    idVerificationStatus: string;
    createdAt: Date;
    socialProfiles?: Array<{
      id: string;
      platform: string;
      profileUrl: string;
      createdAt: Date;
    }>;
  }): UserPublicResponseDto {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      city: user.city || undefined,
      country: user.country || undefined,
      emailVerified: user.emailVerified,
      idVerificationStatus: user.idVerificationStatus as UserPublicResponseDto['idVerificationStatus'],
      socialProfiles: user.socialProfiles?.map((p) => ({
        id: p.id,
        platform: p.platform,
        profileUrl: p.profileUrl,
        createdAt: p.createdAt,
      })),
      createdAt: user.createdAt,
    };
  }
}
