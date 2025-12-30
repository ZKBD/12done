import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsInt, Min, Max } from 'class-validator';
import { MaintenanceRequestType } from '@prisma/client';

// ============================================
// REQUEST DTOs
// ============================================

export class GetPropertyPredictionsDto {
  @ApiProperty({
    description: 'Property ID to get predictions for',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  propertyId: string;

  @ApiPropertyOptional({
    description: 'Number of months to look ahead (default: 12)',
    example: 12,
    minimum: 1,
    maximum: 24,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  monthsAhead?: number;
}

export class GetPortfolioPredictionsDto {
  @ApiPropertyOptional({
    description: 'Number of months to look ahead (default: 6)',
    example: 6,
    minimum: 1,
    maximum: 12,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  monthsAhead?: number;
}

// ============================================
// RESPONSE DTOs - Historical Analysis (PROD-108.1)
// ============================================

export class MaintenanceHistoryItemDto {
  @ApiProperty({ description: 'Maintenance type' })
  type: MaintenanceRequestType;

  @ApiProperty({ description: 'Number of occurrences' })
  count: number;

  @ApiProperty({ description: 'Average days to complete' })
  avgResolutionDays: number;

  @ApiProperty({ description: 'Total cost spent on this type' })
  totalCost: number;

  @ApiProperty({ description: 'Average cost per occurrence' })
  avgCost: number;

  @ApiProperty({ description: 'Date of last occurrence' })
  lastOccurrence: Date | null;

  @ApiProperty({ description: 'Average days between occurrences' })
  avgDaysBetween: number | null;
}

export class MaintenanceHistoryDto {
  @ApiProperty({ description: 'Property ID' })
  propertyId: string;

  @ApiProperty({ description: 'Property title' })
  propertyTitle: string;

  @ApiProperty({ description: 'Year property was built' })
  yearBuilt: number | null;

  @ApiProperty({ description: 'Property age in years' })
  propertyAge: number | null;

  @ApiProperty({ description: 'Total maintenance requests' })
  totalRequests: number;

  @ApiProperty({ description: 'Total spent on maintenance' })
  totalSpent: number;

  @ApiProperty({ description: 'Average annual maintenance cost' })
  avgAnnualCost: number;

  @ApiProperty({ description: 'Breakdown by maintenance type', type: [MaintenanceHistoryItemDto] })
  byType: MaintenanceHistoryItemDto[];

  @ApiProperty({ description: 'Analysis start date' })
  analysisStartDate: Date;

  @ApiProperty({ description: 'Analysis end date' })
  analysisEndDate: Date;
}

// ============================================
// RESPONSE DTOs - Failure Prediction (PROD-108.2)
// ============================================

export class PredictedMaintenanceDto {
  @ApiProperty({ description: 'Maintenance type predicted to fail' })
  type: MaintenanceRequestType;

  @ApiProperty({
    description: 'Risk level (0-1)',
    example: 0.75,
  })
  riskScore: number;

  @ApiProperty({
    description: 'Risk category',
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
  })
  riskCategory: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  @ApiProperty({ description: 'Estimated days until issue might occur' })
  estimatedDaysUntilIssue: number;

  @ApiProperty({ description: 'Predicted date range for issue' })
  predictedTimeframe: string;

  @ApiProperty({ description: 'Estimated repair cost' })
  estimatedCost: number;

  @ApiProperty({
    description: 'Factors contributing to prediction',
    example: ['Property age > 20 years', 'Last HVAC service 18 months ago', 'Summer season approaching'],
    type: [String],
  })
  riskFactors: string[];

  @ApiProperty({ description: 'Recommended preventive action' })
  recommendation: string;

  @ApiProperty({ description: 'Confidence in prediction (0-1)' })
  confidence: number;
}

export class PropertyPredictionsDto {
  @ApiProperty({ description: 'Property ID' })
  propertyId: string;

  @ApiProperty({ description: 'Property title' })
  propertyTitle: string;

  @ApiProperty({ description: 'Property address' })
  propertyAddress: string;

  @ApiProperty({ description: 'Overall risk score for property (0-1)' })
  overallRiskScore: number;

  @ApiProperty({ description: 'Number of high-risk predictions' })
  highRiskCount: number;

  @ApiProperty({ description: 'Predicted maintenance items', type: [PredictedMaintenanceDto] })
  predictions: PredictedMaintenanceDto[];

  @ApiProperty({ description: 'Total estimated upcoming costs' })
  totalEstimatedCost: number;

  @ApiProperty({ description: 'Prediction generated at' })
  generatedAt: Date;
}

// ============================================
// RESPONSE DTOs - Proactive Alerts (PROD-108.3)
// ============================================

export class MaintenanceAlertDto {
  @ApiProperty({ description: 'Alert ID' })
  id: string;

  @ApiProperty({ description: 'Property ID' })
  propertyId: string;

  @ApiProperty({ description: 'Property title' })
  propertyTitle: string;

  @ApiProperty({
    description: 'Alert severity',
    enum: ['INFO', 'WARNING', 'URGENT', 'CRITICAL'],
  })
  severity: 'INFO' | 'WARNING' | 'URGENT' | 'CRITICAL';

  @ApiProperty({ description: 'Maintenance type' })
  type: MaintenanceRequestType;

  @ApiProperty({ description: 'Alert title' })
  title: string;

  @ApiProperty({ description: 'Alert message' })
  message: string;

  @ApiProperty({ description: 'Recommended action' })
  recommendedAction: string;

  @ApiProperty({ description: 'Estimated cost if not addressed' })
  estimatedCostIfIgnored: number;

  @ApiProperty({ description: 'Days until action needed' })
  daysUntilActionNeeded: number;

  @ApiProperty({ description: 'Alert created at' })
  createdAt: Date;

  @ApiProperty({ description: 'Whether alert has been dismissed' })
  dismissed: boolean;
}

export class AlertsResponseDto {
  @ApiProperty({ description: 'Active alerts', type: [MaintenanceAlertDto] })
  alerts: MaintenanceAlertDto[];

  @ApiProperty({ description: 'Total active alerts' })
  totalAlerts: number;

  @ApiProperty({ description: 'Critical alerts count' })
  criticalCount: number;

  @ApiProperty({ description: 'Urgent alerts count' })
  urgentCount: number;
}

// ============================================
// RESPONSE DTOs - HVAC Predictions (PROD-108.4)
// ============================================

export class HvacPredictionDto {
  @ApiProperty({ description: 'Property ID' })
  propertyId: string;

  @ApiProperty({ description: 'Property title' })
  propertyTitle: string;

  @ApiProperty({ description: 'Estimated HVAC system age in years' })
  estimatedHvacAge: number;

  @ApiProperty({ description: 'Typical HVAC lifespan (15-25 years)' })
  typicalLifespan: number;

  @ApiProperty({ description: 'Percentage of lifespan used' })
  lifespanPercentage: number;

  @ApiProperty({ description: 'Last HVAC maintenance date' })
  lastMaintenanceDate: Date | null;

  @ApiProperty({ description: 'Days since last HVAC service' })
  daysSinceLastService: number | null;

  @ApiProperty({ description: 'HVAC maintenance count in history' })
  historicalHvacIssues: number;

  @ApiProperty({ description: 'Risk of HVAC failure (0-1)' })
  failureRisk: number;

  @ApiProperty({
    description: 'HVAC health status',
    enum: ['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'CRITICAL'],
  })
  healthStatus: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';

  @ApiProperty({ description: 'Current season relevance' })
  seasonalRisk: string;

  @ApiProperty({ description: 'Recommended actions', type: [String] })
  recommendations: string[];

  @ApiProperty({ description: 'Estimated replacement cost' })
  estimatedReplacementCost: number;

  @ApiProperty({ description: 'Estimated annual maintenance cost' })
  estimatedAnnualMaintenanceCost: number;
}

// ============================================
// Portfolio Summary Response
// ============================================

export class PortfolioPredictionSummaryDto {
  @ApiProperty({ description: 'Total properties analyzed' })
  totalProperties: number;

  @ApiProperty({ description: 'Properties at high risk' })
  highRiskProperties: number;

  @ApiProperty({ description: 'Total estimated upcoming costs' })
  totalEstimatedCosts: number;

  @ApiProperty({ description: 'Most common predicted issue type' })
  mostCommonIssueType: MaintenanceRequestType | null;

  @ApiProperty({ description: 'Properties with HVAC concerns' })
  hvacConcernCount: number;

  @ApiProperty({ description: 'Predictions by property', type: [PropertyPredictionsDto] })
  properties: PropertyPredictionsDto[];

  @ApiProperty({ description: 'Generated at' })
  generatedAt: Date;
}
