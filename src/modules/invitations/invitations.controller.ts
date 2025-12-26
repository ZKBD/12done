import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { InvitationsService } from './invitations.service';
import { JwtAuthGuard } from '@/modules/auth/guards';
import { RolesGuard } from '@/common/guards';
import { CurrentUser, CurrentUserData, Roles } from '@/common/decorators';
import { PaginatedResponseDto } from '@/common/dto';
import {
  CreateInvitationDto,
  InvitationResponseDto,
  InvitationQueryDto,
  InvitationStatsDto,
} from './dto';

@ApiTags('invitations')
@Controller('invitations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post()
  @ApiOperation({ summary: 'Send an invitation to a new user (PROD-006)' })
  @ApiResponse({
    status: 201,
    description: 'Invitation sent successfully',
    type: InvitationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid email or self-invite' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'Conflict - user or invitation already exists' })
  async create(
    @Body() dto: CreateInvitationDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<InvitationResponseDto> {
    return this.invitationsService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List all invitations sent by current user' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of invitations',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @Query() query: InvitationQueryDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<PaginatedResponseDto<InvitationResponseDto>> {
    return this.invitationsService.findAll(user.id, query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get invitation statistics for current user' })
  @ApiResponse({
    status: 200,
    description: 'Invitation statistics',
    type: InvitationStatsDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getStats(
    @CurrentUser() user: CurrentUserData,
  ): Promise<InvitationStatsDto> {
    return this.invitationsService.getStats(user.id);
  }

  @Get('kickback-eligible')
  @ApiOperation({ summary: 'Get all kickback-eligible accepted invitations (PROD-006)' })
  @ApiResponse({
    status: 200,
    description: 'List of kickback-eligible invitations',
    type: [InvitationResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getKickbackEligible(
    @CurrentUser() user: CurrentUserData,
  ): Promise<InvitationResponseDto[]> {
    return this.invitationsService.getKickbackEligible(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invitation by ID' })
  @ApiParam({ name: 'id', description: 'Invitation ID' })
  @ApiResponse({
    status: 200,
    description: 'Invitation details',
    type: InvitationResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not your invitation' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<InvitationResponseDto> {
    return this.invitationsService.findById(id, user.id, user.role as UserRole);
  }

  @Post(':id/resend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend invitation email with new token' })
  @ApiParam({ name: 'id', description: 'Invitation ID' })
  @ApiResponse({
    status: 200,
    description: 'Invitation resent successfully',
    type: InvitationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - invitation not pending' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not your invitation' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  async resend(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<InvitationResponseDto> {
    return this.invitationsService.resend(id, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a pending invitation' })
  @ApiParam({ name: 'id', description: 'Invitation ID' })
  @ApiResponse({
    status: 200,
    description: 'Invitation cancelled successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - invitation not pending' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not your invitation' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<{ message: string }> {
    return this.invitationsService.cancel(id, user.id, user.role as UserRole);
  }

  // Admin endpoint: Cleanup expired invitations
  @Post('admin/cleanup-expired')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all expired invitations (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Number of invitations marked as expired',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async cleanupExpired(): Promise<{ count: number; message: string }> {
    const count = await this.invitationsService.markExpiredInvitations();
    return {
      count,
      message: `Marked ${count} invitations as expired`,
    };
  }
}
