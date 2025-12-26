import { IsOptional, IsEnum, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { InvitationStatus } from '@prisma/client';
import { PaginationQueryDto } from '@/common/dto';

export class InvitationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by invitation status',
    enum: InvitationStatus,
    example: InvitationStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(InvitationStatus)
  status?: InvitationStatus;

  @ApiPropertyOptional({
    description: 'Search by email',
    example: 'john',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
