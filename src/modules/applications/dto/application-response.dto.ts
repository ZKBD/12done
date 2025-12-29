import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicationStatus } from '@prisma/client';

// Reference response type
export class ReferenceResponseDto {
  @ApiProperty() name: string;
  @ApiProperty() relationship: string;
  @ApiPropertyOptional() phone?: string;
  @ApiPropertyOptional() email?: string;
}

// Nested DTOs for related entities
export class ApplicationPropertyDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiProperty() address: string;
  @ApiProperty() city: string;
  @ApiProperty() country: string;
}

export class ApplicationApplicantDto {
  @ApiProperty() id: string;
  @ApiProperty() firstName: string;
  @ApiProperty() lastName: string;
  @ApiProperty() email: string;
}

export class ApplicationOwnerDto {
  @ApiProperty() id: string;
  @ApiProperty() firstName: string;
  @ApiProperty() lastName: string;
}

// Main response DTO
export class ApplicationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() applicantId: string;
  @ApiProperty() propertyId: string;
  @ApiProperty({ enum: ApplicationStatus }) status: ApplicationStatus;

  // Employment info
  @ApiPropertyOptional() employmentStatus?: string;
  @ApiPropertyOptional() employer?: string;
  @ApiPropertyOptional() jobTitle?: string;
  @ApiPropertyOptional() monthlyIncome?: number;
  @ApiPropertyOptional() incomeCurrency?: string;
  @ApiPropertyOptional() employmentDuration?: string;

  // References
  @ApiPropertyOptional({ type: [ReferenceResponseDto] })
  references?: ReferenceResponseDto[];

  // Rental details
  @ApiPropertyOptional() desiredMoveInDate?: Date;
  @ApiPropertyOptional() desiredLeaseTerm?: number;
  @ApiPropertyOptional() numberOfOccupants?: number;
  @ApiPropertyOptional() hasPets?: boolean;
  @ApiPropertyOptional() petDetails?: string;
  @ApiPropertyOptional() additionalNotes?: string;

  // Owner response
  @ApiPropertyOptional() ownerNotes?: string;
  @ApiPropertyOptional() reviewedAt?: Date;

  // Timestamps
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  // Related entities (populated based on context)
  @ApiPropertyOptional({ type: ApplicationPropertyDto })
  property?: ApplicationPropertyDto;

  @ApiPropertyOptional({ type: ApplicationApplicantDto })
  applicant?: ApplicationApplicantDto;
}

// List response with pagination
export class ApplicationListResponseDto {
  @ApiProperty({ type: [ApplicationResponseDto] })
  data: ApplicationResponseDto[];

  @ApiProperty()
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
