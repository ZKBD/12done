import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsString, IsOptional, IsDateString, IsUrl } from 'class-validator';
import { DocumentType } from '@prisma/client';

/**
 * DTO for submitting ID verification request (PROD-008.2)
 */
export class SubmitVerificationDto {
  @ApiProperty({
    enum: DocumentType,
    description: 'Type of ID document being submitted',
    example: 'PASSPORT',
  })
  @IsEnum(DocumentType)
  documentType: DocumentType;

  @ApiProperty({
    description: 'Secure URL to the uploaded document image',
    example: 'https://storage.example.com/docs/passport-12345.jpg',
  })
  @IsString()
  @IsUrl()
  documentUrl: string;

  @ApiPropertyOptional({
    description: 'Secure URL to selfie image for liveness verification',
    example: 'https://storage.example.com/docs/selfie-12345.jpg',
  })
  @IsOptional()
  @IsString()
  @IsUrl()
  selfieUrl?: string;

  @ApiPropertyOptional({
    description: 'Document expiration date if applicable',
    example: '2030-12-31',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
