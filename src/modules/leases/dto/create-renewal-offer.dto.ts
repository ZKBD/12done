import {
  IsString,
  IsNumber,
  IsDateString,
  IsOptional,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRenewalOfferDto {
  @ApiProperty({
    description: 'Proposed start date for the new lease',
    example: '2026-02-01',
  })
  @IsDateString()
  proposedStartDate: string;

  @ApiProperty({
    description: 'Proposed end date for the new lease',
    example: '2027-01-31',
  })
  @IsDateString()
  proposedEndDate: string;

  @ApiProperty({
    description: 'Proposed monthly rent amount for the new lease',
    example: 1600,
  })
  @IsNumber()
  @Min(0)
  proposedRentAmount: number;

  @ApiPropertyOptional({
    description: 'Additional terms or notes for the renewal offer',
    example: 'Rent increase of 5% reflects market adjustments.',
  })
  @IsOptional()
  @IsString()
  proposedTerms?: string;

  @ApiPropertyOptional({
    description:
      'Deadline for tenant to respond to the offer (defaults to 14 days from offer)',
    example: '2026-01-15',
  })
  @IsOptional()
  @IsDateString()
  offerExpiresAt?: string;
}
