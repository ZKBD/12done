import {
  Controller,
  Get,
  Patch,
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
import { UserRole, UserStatus } from '@prisma/client';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '@/modules/auth/guards';
import { RolesGuard } from '@/common/guards';
import { CurrentUser, CurrentUserData, Roles } from '@/common/decorators';
import { PaginatedResponseDto } from '@/common/dto';
import {
  UpdateUserDto,
  UpdateSocialProfilesDto,
  UserResponseDto,
  UserPublicResponseDto,
  UserQueryDto,
  SocialProfileResponseDto,
  InvitationNetworkResponseDto,
} from './dto';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all users (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of users',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async findAll(
    @Query() query: UserQueryDto,
  ): Promise<PaginatedResponseDto<UserResponseDto>> {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User details',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Can only view own profile' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<UserResponseDto> {
    return this.usersService.findById(id, user.id, user.role as UserRole);
  }

  @Get(':id/public')
  @ApiOperation({ summary: 'Get public user profile' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Public user profile',
    type: UserPublicResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findByIdPublic(@Param('id') id: string): Promise<UserPublicResponseDto> {
    return this.usersService.findByIdPublic(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Can only update own profile' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<UserResponseDto> {
    return this.usersService.update(id, dto, user.id, user.role as UserRole);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete user account (soft delete)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Account deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Can only delete own account' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<{ message: string }> {
    return this.usersService.softDelete(id, user.id, user.role as UserRole);
  }

  @Get(':id/social-profiles')
  @ApiOperation({ summary: 'Get user social profiles' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'List of social profiles',
    type: [SocialProfileResponseDto],
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getSocialProfiles(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<SocialProfileResponseDto[]> {
    return this.usersService.getSocialProfiles(id, user.id, user.role as UserRole);
  }

  @Patch(':id/social-profiles')
  @ApiOperation({ summary: 'Update user social profiles (replaces all)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Social profiles updated',
    type: [SocialProfileResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Can only update own profiles' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateSocialProfiles(
    @Param('id') id: string,
    @Body() dto: UpdateSocialProfilesDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<SocialProfileResponseDto[]> {
    return this.usersService.updateSocialProfiles(id, dto, user.id, user.role as UserRole);
  }

  @Get(':id/invitation-network')
  @ApiOperation({ summary: 'Get user invitation network (upstream chain and direct invitees)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Invitation network data',
    type: InvitationNetworkResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Can only view own network' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getInvitationNetwork(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<InvitationNetworkResponseDto> {
    return this.usersService.getInvitationNetwork(id, user.id, user.role as UserRole);
  }

  // Admin-only endpoints

  @Patch(':id/role')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update user role (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User role updated',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateRole(
    @Param('id') id: string,
    @Body('role') role: UserRole,
    @CurrentUser() user: CurrentUserData,
  ): Promise<UserResponseDto> {
    return this.usersService.updateRole(id, role, user.id);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update user status (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User status updated',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: UserStatus,
  ): Promise<UserResponseDto> {
    return this.usersService.updateStatus(id, status);
  }
}
