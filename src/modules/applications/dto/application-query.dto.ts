import { IsOptional, IsNumber, IsIn, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ApplicationQueryDto {
  @ApiPropertyOptional({
    description: 'Page number',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 20,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Filter by application status',
    enum: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'WITHDRAWN'],
  })
  @IsOptional()
  @IsIn(['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'WITHDRAWN'])
  status?: string;
}
