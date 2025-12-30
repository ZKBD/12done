import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, IsOptional, IsUUID } from 'class-validator';
import { MaintenanceRequestType, MaintenancePriority } from '@prisma/client';

// ============================================
// REQUEST DTOs
// ============================================

export class AnalyzeMaintenanceRequestDto {
  @ApiProperty({
    description: 'Brief title describing the issue',
    example: 'Leaking faucet in kitchen',
    minLength: 5,
    maxLength: 100,
  })
  @IsString()
  @MinLength(5)
  @MaxLength(100)
  title: string;

  @ApiProperty({
    description: 'Detailed description of the maintenance issue',
    example:
      'The kitchen faucet has been dripping constantly for the past two days. Water is pooling under the sink.',
    minLength: 20,
    maxLength: 2000,
  })
  @IsString()
  @MinLength(20)
  @MaxLength(2000)
  description: string;

  @ApiPropertyOptional({
    description: 'Property ID for location-specific suggestions',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  propertyId?: string;
}

export class GetAppointmentSuggestionsDto {
  @ApiProperty({
    description: 'Property ID for the maintenance location',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  propertyId: string;

  @ApiProperty({
    description: 'Type of maintenance request',
    enum: MaintenanceRequestType,
    example: MaintenanceRequestType.PLUMBING,
  })
  @IsString()
  type: MaintenanceRequestType;
}

// ============================================
// RESPONSE DTOs
// ============================================

export class DiySolutionDto {
  @ApiProperty({ description: 'Step number', example: 1 })
  step: number;

  @ApiProperty({
    description: 'Instruction for this step',
    example: 'Turn off the water supply valve under the sink',
  })
  instruction: string;

  @ApiPropertyOptional({
    description: 'Warning or safety note for this step',
    example: 'Make sure the area is dry before proceeding',
  })
  warning?: string;
}

export class AiCategoryAnalysisDto {
  @ApiProperty({
    description: 'Suggested maintenance request type',
    enum: MaintenanceRequestType,
    example: MaintenanceRequestType.PLUMBING,
  })
  suggestedType: MaintenanceRequestType;

  @ApiProperty({
    description: 'Confidence score for the type suggestion (0-1)',
    example: 0.85,
  })
  typeConfidence: number;

  @ApiProperty({
    description: 'Keywords that influenced the categorization',
    example: ['faucet', 'leak', 'water', 'dripping'],
    type: [String],
  })
  matchedKeywords: string[];
}

export class AiPriorityAnalysisDto {
  @ApiProperty({
    description: 'Suggested priority level',
    enum: MaintenancePriority,
    example: MaintenancePriority.URGENT,
  })
  suggestedPriority: MaintenancePriority;

  @ApiProperty({
    description: 'Confidence score for the priority suggestion (0-1)',
    example: 0.75,
  })
  priorityConfidence: number;

  @ApiProperty({
    description: 'Factors that influenced the priority assessment',
    example: ['water damage risk', 'continuous issue', 'safety concern'],
    type: [String],
  })
  urgencyFactors: string[];

  @ApiProperty({
    description: 'Explanation of the priority assessment',
    example:
      'A leaking faucet with pooling water suggests potential water damage risk and should be addressed urgently.',
  })
  explanation: string;
}

export class AiSuggestedSolutionDto {
  @ApiProperty({
    description: 'Whether this issue might be DIY-fixable',
    example: true,
  })
  isDiyPossible: boolean;

  @ApiProperty({
    description: 'DIY difficulty level (1-5, where 5 is most difficult)',
    example: 2,
  })
  diyDifficulty: number;

  @ApiProperty({
    description: 'Estimated time to fix (in minutes)',
    example: 30,
  })
  estimatedTimeMinutes: number;

  @ApiPropertyOptional({
    description: 'Step-by-step DIY instructions if applicable',
    type: [DiySolutionDto],
  })
  diySteps?: DiySolutionDto[];

  @ApiPropertyOptional({
    description: 'Tools or materials needed for DIY fix',
    example: ['adjustable wrench', 'plumber tape', 'replacement washer'],
    type: [String],
  })
  toolsNeeded?: string[];

  @ApiProperty({
    description: 'When to call a professional instead of DIY',
    example:
      'Call a professional if the leak persists after replacing the washer or if you notice corrosion on the pipes.',
  })
  whenToCallProfessional: string;
}

export class AiMaintenanceAnalysisResponseDto {
  @ApiProperty({ description: 'Category analysis results' })
  category: AiCategoryAnalysisDto;

  @ApiProperty({ description: 'Priority analysis results' })
  priority: AiPriorityAnalysisDto;

  @ApiProperty({ description: 'Suggested solutions' })
  solutions: AiSuggestedSolutionDto;

  @ApiProperty({
    description: 'AI analysis timestamp',
    example: '2025-01-15T10:30:00.000Z',
  })
  analyzedAt: Date;

  @ApiProperty({
    description: 'AI model/version used for analysis',
    example: 'rule-based-v1',
  })
  modelVersion: string;
}

// ============================================
// APPOINTMENT SUGGESTION DTOs
// ============================================

export class ProviderAvailabilityDto {
  @ApiProperty({ description: 'Provider ID' })
  providerId: string;

  @ApiProperty({ description: 'Provider business name' })
  providerName: string;

  @ApiPropertyOptional({ description: 'Provider rating (1-5)' })
  rating?: number;

  @ApiPropertyOptional({ description: 'Number of reviews' })
  reviewCount?: number;

  @ApiPropertyOptional({
    description: 'Estimated response time in hours',
    example: 2,
  })
  estimatedResponseHours?: number;
}

export class AppointmentSlotDto {
  @ApiProperty({
    description: 'Suggested date for appointment',
    example: '2025-01-16',
  })
  date: string;

  @ApiProperty({
    description: 'Time slot for appointment',
    example: '09:00-12:00',
  })
  timeSlot: string;

  @ApiProperty({
    description: 'Availability score (0-1, higher is better)',
    example: 0.9,
  })
  availabilityScore: number;

  @ApiProperty({
    description: 'Reason for this suggestion',
    example: 'Multiple providers available, earliest possible slot',
  })
  reason: string;

  @ApiPropertyOptional({
    description: 'Available providers for this slot',
    type: [ProviderAvailabilityDto],
  })
  availableProviders?: ProviderAvailabilityDto[];
}

export class AiAppointmentSuggestionsResponseDto {
  @ApiProperty({
    description: 'Suggested appointment slots, ordered by recommendation',
    type: [AppointmentSlotDto],
  })
  suggestedSlots: AppointmentSlotDto[];

  @ApiProperty({
    description: 'Total number of available providers for this type',
    example: 5,
  })
  totalAvailableProviders: number;

  @ApiProperty({
    description: 'Average wait time in days',
    example: 2,
  })
  averageWaitDays: number;

  @ApiProperty({
    description: 'Recommendation summary',
    example:
      'We recommend scheduling for Monday morning when 3 top-rated plumbers are available.',
  })
  recommendation: string;

  @ApiProperty({ description: 'Timestamp of suggestions' })
  generatedAt: Date;
}

// ============================================
// EXISTING REQUEST AI SUGGESTIONS
// ============================================

export class AiRequestSuggestionsResponseDto {
  @ApiProperty({ description: 'Request ID this suggestion is for' })
  requestId: string;

  @ApiProperty({ description: 'Category analysis results' })
  category: AiCategoryAnalysisDto;

  @ApiProperty({ description: 'Priority analysis results' })
  priority: AiPriorityAnalysisDto;

  @ApiProperty({ description: 'Suggested solutions' })
  solutions: AiSuggestedSolutionDto;

  @ApiPropertyOptional({
    description: 'Appointment suggestions if property context available',
  })
  appointments?: AiAppointmentSuggestionsResponseDto;

  @ApiProperty({ description: 'Suggestions generated at' })
  generatedAt: Date;
}
