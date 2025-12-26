import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InvitationStatus, UserRole } from '@prisma/client';
import { PrismaService } from '@/database';
import { MailService } from '@/mail';
import { generateSecureToken } from '@/common/utils';
import { PaginatedResponseDto } from '@/common/dto';
import {
  CreateInvitationDto,
  InvitationResponseDto,
  InvitationQueryDto,
  InvitationStatsDto,
} from './dto';

@Injectable()
export class InvitationsService {
  private readonly INVITATION_EXPIRY_DAYS = 7;

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  async create(
    dto: CreateInvitationDto,
    inviterId: string,
  ): Promise<InvitationResponseDto> {
    const inviter = await this.prisma.user.findUnique({
      where: { id: inviterId },
    });

    if (!inviter) {
      throw new NotFoundException('Inviter not found');
    }

    const email = dto.email.toLowerCase();

    // Check if inviting themselves
    if (email === inviter.email.toLowerCase()) {
      throw new BadRequestException('You cannot invite yourself');
    }

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }

    // Check if there's already a pending invitation to this email
    const existingInvitation = await this.prisma.invitation.findFirst({
      where: {
        email,
        status: InvitationStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvitation) {
      throw new ConflictException('An active invitation already exists for this email');
    }

    // Create the invitation
    const token = generateSecureToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.INVITATION_EXPIRY_DAYS);

    const invitation = await this.prisma.invitation.create({
      data: {
        email,
        inviterId,
        token,
        expiresAt,
        kickbackEligible: true,
      },
    });

    // Send invitation email
    const inviterName = `${inviter.firstName} ${inviter.lastName}`;
    await this.mailService.sendInvitationEmail(email, inviterName, token);

    return this.mapToResponseDto(invitation);
  }

  async findAll(
    inviterId: string,
    query: InvitationQueryDto,
  ): Promise<PaginatedResponseDto<InvitationResponseDto>> {
    const where: Record<string, unknown> = {
      inviterId,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.email = {
        contains: query.search,
        mode: 'insensitive',
      };
    }

    const [invitations, total] = await Promise.all([
      this.prisma.invitation.findMany({
        where,
        include: {
          acceptedUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.invitation.count({ where }),
    ]);

    const data = invitations.map((inv) => this.mapToResponseDto(inv));

    return new PaginatedResponseDto(data, total, query.page || 1, query.limit || 20);
  }

  async findById(
    id: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<InvitationResponseDto> {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id },
      include: {
        acceptedUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    // Users can only view their own invitations unless admin
    if (invitation.inviterId !== requesterId && requesterRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only view your own invitations');
    }

    return this.mapToResponseDto(invitation);
  }

  async cancel(
    id: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<{ message: string }> {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    // Users can only cancel their own invitations unless admin
    if (invitation.inviterId !== requesterId && requesterRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only cancel your own invitations');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException(
        `Cannot cancel invitation with status: ${invitation.status}`,
      );
    }

    await this.prisma.invitation.update({
      where: { id },
      data: { status: InvitationStatus.CANCELLED },
    });

    return { message: 'Invitation cancelled successfully' };
  }

  async resend(
    id: string,
    requesterId: string,
  ): Promise<InvitationResponseDto> {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id },
      include: {
        inviter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.inviterId !== requesterId) {
      throw new ForbiddenException('You can only resend your own invitations');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException(
        `Cannot resend invitation with status: ${invitation.status}`,
      );
    }

    // Generate new token and extend expiry
    const newToken = generateSecureToken();
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + this.INVITATION_EXPIRY_DAYS);

    const updatedInvitation = await this.prisma.invitation.update({
      where: { id },
      data: {
        token: newToken,
        expiresAt: newExpiresAt,
      },
    });

    // Resend email
    const inviterName = `${invitation.inviter.firstName} ${invitation.inviter.lastName}`;
    await this.mailService.sendInvitationEmail(
      invitation.email,
      inviterName,
      newToken,
    );

    return this.mapToResponseDto(updatedInvitation);
  }

  async getStats(userId: string): Promise<InvitationStatsDto> {
    const [total, pending, accepted, expired, kickbackEligible] = await Promise.all([
      this.prisma.invitation.count({
        where: { inviterId: userId },
      }),
      this.prisma.invitation.count({
        where: {
          inviterId: userId,
          status: InvitationStatus.PENDING,
          expiresAt: { gt: new Date() },
        },
      }),
      this.prisma.invitation.count({
        where: {
          inviterId: userId,
          status: InvitationStatus.ACCEPTED,
        },
      }),
      this.prisma.invitation.count({
        where: {
          inviterId: userId,
          status: InvitationStatus.EXPIRED,
        },
      }),
      this.prisma.invitation.count({
        where: {
          inviterId: userId,
          status: InvitationStatus.ACCEPTED,
          kickbackEligible: true,
        },
      }),
    ]);

    return {
      total,
      pending,
      accepted,
      expired,
      kickbackEligible,
    };
  }

  async getKickbackEligible(
    userId: string,
  ): Promise<InvitationResponseDto[]> {
    const invitations = await this.prisma.invitation.findMany({
      where: {
        inviterId: userId,
        status: InvitationStatus.ACCEPTED,
        kickbackEligible: true,
      },
      include: {
        acceptedUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { acceptedAt: 'desc' },
    });

    return invitations.map((inv) => this.mapToResponseDto(inv));
  }

  // Admin method: Mark expired invitations
  async markExpiredInvitations(): Promise<number> {
    const result = await this.prisma.invitation.updateMany({
      where: {
        status: InvitationStatus.PENDING,
        expiresAt: { lt: new Date() },
      },
      data: {
        status: InvitationStatus.EXPIRED,
      },
    });

    return result.count;
  }

  private mapToResponseDto(
    invitation: {
      id: string;
      email: string;
      status: InvitationStatus;
      kickbackEligible: boolean;
      expiresAt: Date;
      acceptedAt: Date | null;
      acceptedUserId: string | null;
      createdAt: Date;
      acceptedUser?: {
        id: string;
        firstName: string;
        lastName: string;
      } | null;
    },
  ): InvitationResponseDto {
    return {
      id: invitation.id,
      email: invitation.email,
      status: invitation.status,
      kickbackEligible: invitation.kickbackEligible,
      expiresAt: invitation.expiresAt,
      acceptedAt: invitation.acceptedAt || undefined,
      acceptedUserId: invitation.acceptedUserId || undefined,
      acceptedUser: invitation.acceptedUser || undefined,
      createdAt: invitation.createdAt,
    };
  }
}
