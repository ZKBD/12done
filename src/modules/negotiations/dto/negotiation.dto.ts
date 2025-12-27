import {
  IsString,
  IsEnum,
  IsOptional,
  IsDateString,
  IsNumber,
  Min,
  IsObject,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import {
  NegotiationType,
  NegotiationStatus,
  OfferStatus,
} from '@prisma/client';

// ============================================
// CREATE NEGOTIATION DTO (PROD-090.3)
// ============================================

export class CreateNegotiationDto {
  @ApiProperty({
    description: 'Property ID to negotiate for',
    example: 'uuid-property-123',
  })
  @IsString()
  propertyId: string;

  @ApiProperty({
    description: 'Type of negotiation',
    enum: NegotiationType,
    example: NegotiationType.BUY,
  })
  @IsEnum(NegotiationType)
  type: NegotiationType;

  @ApiPropertyOptional({
    description: 'Initial offer amount',
    example: 250000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  initialOfferAmount?: number;

  @ApiPropertyOptional({
    description: 'Currency for the offer',
    example: 'EUR',
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    description: 'Rental start date (for RENT type)',
    example: '2024-02-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Rental end date (for RENT type)',
    example: '2024-08-01',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Initial message to the seller',
    example: 'I am very interested in this property...',
  })
  @IsOptional()
  @IsString()
  message?: string;
}

// ============================================
// CREATE OFFER DTO (PROD-090.5)
// ============================================

export class CreateOfferDto {
  @ApiProperty({
    description: 'Offer amount',
    example: 245000,
  })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount: number;

  @ApiPropertyOptional({
    description: 'Currency for the offer',
    example: 'EUR',
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    description: 'Additional terms as JSON object',
    example: { moveInDate: '2024-03-01', includesFurniture: true },
  })
  @IsOptional()
  @IsObject()
  terms?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Message accompanying the offer',
    example: 'This is my best offer...',
  })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({
    description: 'Offer expiry date',
    example: '2024-01-20T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({
    description: 'ID of offer this is countering (for counter-offers)',
    example: 'uuid-offer-123',
  })
  @IsOptional()
  @IsString()
  counterToId?: string;
}

// ============================================
// RESPOND TO OFFER DTO (PROD-090.6, PROD-090.7)
// ============================================

export class RespondToOfferDto {
  @ApiProperty({
    description: 'Response action',
    enum: ['accept', 'reject', 'counter'],
    example: 'accept',
  })
  @IsIn(['accept', 'reject', 'counter'])
  action: 'accept' | 'reject' | 'counter';

  @ApiPropertyOptional({
    description: 'Counter-offer amount (required if action is counter)',
    example: 240000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  counterAmount?: number;

  @ApiPropertyOptional({
    description: 'Counter-offer terms',
  })
  @IsOptional()
  @IsObject()
  counterTerms?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Message with response',
  })
  @IsOptional()
  @IsString()
  message?: string;
}

// ============================================
// QUERY DTOs (PROD-091)
// ============================================

export class NegotiationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by negotiation type',
    enum: NegotiationType,
  })
  @IsOptional()
  @IsEnum(NegotiationType)
  type?: NegotiationType;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: NegotiationStatus,
  })
  @IsOptional()
  @IsEnum(NegotiationStatus)
  status?: NegotiationStatus;

  @ApiPropertyOptional({
    description: 'Filter by role: buying, selling, or all',
    enum: ['buying', 'selling', 'all'],
    default: 'all',
  })
  @IsOptional()
  @IsIn(['buying', 'selling', 'all'])
  role?: 'buying' | 'selling' | 'all';

  @ApiPropertyOptional({
    description: 'Page number',
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number;
}

// ============================================
// RESPONSE DTOs
// ============================================

export class OfferResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() negotiationId: string;
  @ApiProperty() madeById: string;
  @ApiProperty() amount: string;
  @ApiProperty() currency: string;
  @ApiPropertyOptional() terms?: Record<string, unknown>;
  @ApiPropertyOptional() message?: string;
  @ApiProperty({ enum: OfferStatus }) status: OfferStatus;
  @ApiPropertyOptional() expiresAt?: Date;
  @ApiPropertyOptional() respondedAt?: Date;
  @ApiPropertyOptional() counterToId?: string;
  @ApiProperty() createdAt: Date;
}

export class NegotiationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() propertyId: string;
  @ApiProperty() buyerId: string;
  @ApiProperty() sellerId: string;
  @ApiProperty({ enum: NegotiationType }) type: NegotiationType;
  @ApiProperty({ enum: NegotiationStatus }) status: NegotiationStatus;
  @ApiPropertyOptional() startDate?: Date;
  @ApiPropertyOptional() endDate?: Date;
  @ApiPropertyOptional() initialMessage?: string;
  @ApiProperty({ type: [OfferResponseDto] }) offers: OfferResponseDto[];
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  // Populated relations
  @ApiPropertyOptional() property?: {
    id: string;
    title: string;
    basePrice: string;
    city: string;
  };
  @ApiPropertyOptional() buyer?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  @ApiPropertyOptional() seller?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export class NegotiationListResponseDto {
  @ApiProperty({ type: [NegotiationResponseDto] })
  data: NegotiationResponseDto[];

  @ApiProperty()
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
