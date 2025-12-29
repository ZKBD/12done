import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsDateString,
  IsArray,
  ValidateNested,
  MaxLength,
  Min,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// Reference DTO for nested validation
export class ReferenceDto {
  @ApiProperty({ description: 'Reference name' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Relationship to applicant' })
  @IsString()
  @MaxLength(50)
  relationship: string;

  @ApiPropertyOptional({ description: 'Reference phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ description: 'Reference email' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  email?: string;
}

export class CreateApplicationDto {
  // Employment Information (PROD-101.6)
  @ApiPropertyOptional({
    description: 'Employment status',
    enum: ['employed', 'self-employed', 'unemployed', 'retired', 'student'],
    example: 'employed',
  })
  @IsOptional()
  @IsString()
  @IsIn(['employed', 'self-employed', 'unemployed', 'retired', 'student'])
  employmentStatus?: string;

  @ApiPropertyOptional({
    description: 'Employer name',
    example: 'Tech Company Inc.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  employer?: string;

  @ApiPropertyOptional({
    description: 'Job title',
    example: 'Software Engineer',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  jobTitle?: string;

  @ApiPropertyOptional({
    description: 'Monthly income in specified currency',
    example: 5000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  monthlyIncome?: number;

  @ApiPropertyOptional({
    description: 'Currency for income (ISO 4217)',
    default: 'EUR',
    example: 'EUR',
  })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  incomeCurrency?: string;

  @ApiPropertyOptional({
    description: 'Duration of current employment',
    example: '2 years',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  employmentDuration?: string;

  // References (PROD-101.6)
  @ApiPropertyOptional({
    description: 'List of references',
    type: [ReferenceDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReferenceDto)
  references?: ReferenceDto[];

  // Rental Details
  @ApiPropertyOptional({
    description: 'Desired move-in date (ISO 8601)',
    example: '2025-02-01',
  })
  @IsOptional()
  @IsDateString()
  desiredMoveInDate?: string;

  @ApiPropertyOptional({
    description: 'Desired lease term in months',
    example: 12,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  desiredLeaseTerm?: number;

  @ApiPropertyOptional({
    description: 'Number of occupants including applicant',
    example: 2,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  numberOfOccupants?: number;

  @ApiPropertyOptional({
    description: 'Whether applicant has pets',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  hasPets?: boolean;

  @ApiPropertyOptional({
    description: 'Details about pets if applicable',
    example: '1 small dog, 2 years old',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  petDetails?: string;

  @ApiPropertyOptional({
    description: 'Additional notes or message to property owner',
    example: 'Looking for a quiet neighborhood for my family.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  additionalNotes?: string;
}
