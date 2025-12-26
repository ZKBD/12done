import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, UserStatus } from '@prisma/client';
import { PaginationQueryDto } from '@/common/dto';

export class UserQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search by email, first name, or last name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: UserRole, description: 'Filter by role' })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ enum: UserStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ description: 'Filter by country code' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: 'Filter by city' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Filter users invited by this user ID' })
  @IsOptional()
  @IsString()
  invitedBy?: string;
}
