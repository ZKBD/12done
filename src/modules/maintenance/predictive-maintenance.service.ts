import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '@/database';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '@/mail/mail.service';
import { MaintenanceRequestType, MaintenanceRequestStatus } from '@prisma/client';
import {
  MaintenanceHistoryDto,
  MaintenanceHistoryItemDto,
  PropertyPredictionsDto,
  PredictedMaintenanceDto,
  AlertsResponseDto,
  MaintenanceAlertDto,
  HvacPredictionDto,
  PortfolioPredictionSummaryDto,
} from './dto/predictive-maintenance.dto';

/**
 * Predictive Maintenance Service (PROD-108)
 *
 * Provides intelligent maintenance predictions:
 * - Historical data analysis (PROD-108.1)
 * - Failure prediction based on patterns (PROD-108.2)
 * - Proactive alerts before failures (PROD-108.3)
 * - HVAC-specific predictions (PROD-108.4)
 *
 * Note: This is a rule-based implementation that can be enhanced
 * with ML models in the future.
 */
@Injectable()
export class PredictiveMaintenanceService {
  private readonly logger = new Logger(PredictiveMaintenanceService.name);

  // Typical maintenance intervals (in days)
  private readonly maintenanceIntervals: Record<MaintenanceRequestType, number> = {
    [MaintenanceRequestType.HVAC]: 180, // Every 6 months
    [MaintenanceRequestType.PLUMBING]: 365, // Annual check
    [MaintenanceRequestType.ELECTRICAL]: 365, // Annual
    [MaintenanceRequestType.APPLIANCE]: 365, // Annual
    [MaintenanceRequestType.STRUCTURAL]: 730, // Every 2 years
    [MaintenanceRequestType.PEST_CONTROL]: 180, // Every 6 months
    [MaintenanceRequestType.CLEANING]: 90, // Quarterly
    [MaintenanceRequestType.LANDSCAPING]: 30, // Monthly
    [MaintenanceRequestType.OTHER]: 365,
  };

  // Average repair costs by type
  private readonly avgRepairCosts: Record<MaintenanceRequestType, number> = {
    [MaintenanceRequestType.HVAC]: 500,
    [MaintenanceRequestType.PLUMBING]: 300,
    [MaintenanceRequestType.ELECTRICAL]: 400,
    [MaintenanceRequestType.APPLIANCE]: 350,
    [MaintenanceRequestType.STRUCTURAL]: 1500,
    [MaintenanceRequestType.PEST_CONTROL]: 200,
    [MaintenanceRequestType.CLEANING]: 150,
    [MaintenanceRequestType.LANDSCAPING]: 100,
    [MaintenanceRequestType.OTHER]: 250,
  };

  // Property age risk multipliers
  private readonly ageRiskMultipliers = [
    { maxAge: 5, multiplier: 0.5 },
    { maxAge: 10, multiplier: 0.75 },
    { maxAge: 20, multiplier: 1.0 },
    { maxAge: 30, multiplier: 1.3 },
    { maxAge: 50, multiplier: 1.6 },
    { maxAge: Infinity, multiplier: 2.0 },
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly mail: MailService,
  ) {}

  // ============================================
  // PROD-108.1: Historical Data Analysis
  // ============================================

  /**
   * Get comprehensive maintenance history for a property
   */
  async getPropertyHistory(
    propertyId: string,
    userId: string,
  ): Promise<MaintenanceHistoryDto> {
    // Verify property exists and user has access
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        title: true,
        yearBuilt: true,
        ownerId: true,
      },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.ownerId !== userId) {
      throw new NotFoundException('Property not found');
    }

    // Get all completed maintenance requests
    const requests = await this.prisma.maintenanceRequest.findMany({
      where: {
        propertyId,
        status: MaintenanceRequestStatus.CONFIRMED,
      },
      orderBy: { createdAt: 'asc' },
    });

    const currentYear = new Date().getFullYear();
    const propertyAge = property.yearBuilt ? currentYear - property.yearBuilt : null;

    // Group by type and calculate statistics
    const byTypeMap = new Map<MaintenanceRequestType, MaintenanceHistoryItemDto>();

    for (const type of Object.values(MaintenanceRequestType)) {
      const typeRequests = requests.filter((r) => r.type === type);

      if (typeRequests.length === 0) {
        continue;
      }

      const totalCost = typeRequests.reduce(
        (sum, r) => sum + (r.actualCost ? Number(r.actualCost) : 0),
        0,
      );

      const resolutionDays = typeRequests
        .filter((r) => r.completedAt)
        .map((r) => {
          const created = new Date(r.createdAt);
          const completed = new Date(r.completedAt!);
          return Math.ceil((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        });

      const avgResolutionDays =
        resolutionDays.length > 0
          ? resolutionDays.reduce((a, b) => a + b, 0) / resolutionDays.length
          : 0;

      // Calculate average days between occurrences
      let avgDaysBetween: number | null = null;
      if (typeRequests.length >= 2) {
        const daysBetween: number[] = [];
        for (let i = 1; i < typeRequests.length; i++) {
          const prev = new Date(typeRequests[i - 1].createdAt);
          const curr = new Date(typeRequests[i].createdAt);
          daysBetween.push(
            Math.ceil((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)),
          );
        }
        avgDaysBetween = daysBetween.reduce((a, b) => a + b, 0) / daysBetween.length;
      }

      byTypeMap.set(type, {
        type,
        count: typeRequests.length,
        avgResolutionDays: Math.round(avgResolutionDays * 10) / 10,
        totalCost,
        avgCost: Math.round((totalCost / typeRequests.length) * 100) / 100,
        lastOccurrence: typeRequests[typeRequests.length - 1]?.createdAt || null,
        avgDaysBetween: avgDaysBetween ? Math.round(avgDaysBetween) : null,
      });
    }

    const totalSpent = requests.reduce(
      (sum, r) => sum + (r.actualCost ? Number(r.actualCost) : 0),
      0,
    );

    // Calculate date range
    const analysisStartDate = requests.length > 0 ? requests[0].createdAt : new Date();
    const analysisEndDate = new Date();
    const yearsOfData = Math.max(
      1,
      (analysisEndDate.getTime() - new Date(analysisStartDate).getTime()) /
        (1000 * 60 * 60 * 24 * 365),
    );

    return {
      propertyId,
      propertyTitle: property.title,
      yearBuilt: property.yearBuilt,
      propertyAge,
      totalRequests: requests.length,
      totalSpent,
      avgAnnualCost: Math.round((totalSpent / yearsOfData) * 100) / 100,
      byType: Array.from(byTypeMap.values()),
      analysisStartDate: new Date(analysisStartDate),
      analysisEndDate,
    };
  }

  // ============================================
  // PROD-108.2: Failure Prediction
  // ============================================

  /**
   * Get predictions for a specific property
   */
  async getPropertyPredictions(
    propertyId: string,
    userId: string,
    monthsAhead: number = 12,
  ): Promise<PropertyPredictionsDto> {
    // Verify property exists and user has access
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        title: true,
        address: true,
        yearBuilt: true,
        ownerId: true,
      },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.ownerId !== userId) {
      throw new NotFoundException('Property not found');
    }

    const predictions = await this.generatePredictions(property, monthsAhead);

    const highRiskCount = predictions.filter((p) => p.riskCategory === 'HIGH' || p.riskCategory === 'CRITICAL').length;
    const totalEstimatedCost = predictions.reduce((sum, p) => sum + p.estimatedCost, 0);
    const overallRiskScore =
      predictions.length > 0
        ? predictions.reduce((sum, p) => sum + p.riskScore, 0) / predictions.length
        : 0;

    return {
      propertyId,
      propertyTitle: property.title,
      propertyAddress: property.address,
      overallRiskScore: Math.round(overallRiskScore * 100) / 100,
      highRiskCount,
      predictions,
      totalEstimatedCost,
      generatedAt: new Date(),
    };
  }

  /**
   * Get predictions for all properties owned by a landlord
   */
  async getPortfolioPredictions(
    userId: string,
    monthsAhead: number = 6,
  ): Promise<PortfolioPredictionSummaryDto> {
    const properties = await this.prisma.property.findMany({
      where: { ownerId: userId },
      select: {
        id: true,
        title: true,
        address: true,
        yearBuilt: true,
        ownerId: true,
      },
    });

    const allPredictions: PropertyPredictionsDto[] = [];
    let highRiskProperties = 0;
    let totalEstimatedCosts = 0;
    let hvacConcernCount = 0;
    const issueTypeCounts = new Map<MaintenanceRequestType, number>();

    for (const property of properties) {
      const predictions = await this.generatePredictions(property, monthsAhead);
      const highRiskCount = predictions.filter(
        (p) => p.riskCategory === 'HIGH' || p.riskCategory === 'CRITICAL',
      ).length;

      if (highRiskCount > 0) highRiskProperties++;

      const hvacPredictions = predictions.filter((p) => p.type === MaintenanceRequestType.HVAC);
      if (hvacPredictions.some((p) => p.riskScore > 0.5)) hvacConcernCount++;

      for (const pred of predictions) {
        issueTypeCounts.set(pred.type, (issueTypeCounts.get(pred.type) || 0) + 1);
        totalEstimatedCosts += pred.estimatedCost;
      }

      const totalEstimatedCost = predictions.reduce((sum, p) => sum + p.estimatedCost, 0);
      const overallRiskScore =
        predictions.length > 0
          ? predictions.reduce((sum, p) => sum + p.riskScore, 0) / predictions.length
          : 0;

      allPredictions.push({
        propertyId: property.id,
        propertyTitle: property.title,
        propertyAddress: property.address,
        overallRiskScore: Math.round(overallRiskScore * 100) / 100,
        highRiskCount,
        predictions,
        totalEstimatedCost,
        generatedAt: new Date(),
      });
    }

    // Find most common issue type
    let mostCommonIssueType: MaintenanceRequestType | null = null;
    let maxCount = 0;
    for (const [type, count] of issueTypeCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonIssueType = type;
      }
    }

    return {
      totalProperties: properties.length,
      highRiskProperties,
      totalEstimatedCosts,
      mostCommonIssueType,
      hvacConcernCount,
      properties: allPredictions,
      generatedAt: new Date(),
    };
  }

  /**
   * Generate predictions for a property
   */
  private async generatePredictions(
    property: { id: string; yearBuilt: number | null },
    monthsAhead: number,
  ): Promise<PredictedMaintenanceDto[]> {
    const predictions: PredictedMaintenanceDto[] = [];
    const currentYear = new Date().getFullYear();
    const propertyAge = property.yearBuilt ? currentYear - property.yearBuilt : 20; // Default 20 years

    // Get property age risk multiplier
    const ageMultiplier =
      this.ageRiskMultipliers.find((r) => propertyAge <= r.maxAge)?.multiplier || 2.0;

    // Get maintenance history
    const history = await this.prisma.maintenanceRequest.findMany({
      where: { propertyId: property.id },
      orderBy: { createdAt: 'desc' },
    });

    const historyByType = new Map<MaintenanceRequestType, typeof history>();
    for (const req of history) {
      if (!historyByType.has(req.type)) {
        historyByType.set(req.type, []);
      }
      historyByType.get(req.type)!.push(req);
    }

    // Generate predictions for each maintenance type
    for (const type of Object.values(MaintenanceRequestType)) {
      const typeHistory = historyByType.get(type) || [];
      const prediction = this.predictForType(
        type,
        typeHistory,
        propertyAge,
        ageMultiplier,
        monthsAhead,
      );

      if (prediction.riskScore > 0.2) {
        // Only include significant predictions
        predictions.push(prediction);
      }
    }

    // Sort by risk score descending
    predictions.sort((a, b) => b.riskScore - a.riskScore);

    return predictions;
  }

  /**
   * Predict for a specific maintenance type
   */
  private predictForType(
    type: MaintenanceRequestType,
    history: { createdAt: Date; completedAt: Date | null }[],
    propertyAge: number,
    ageMultiplier: number,
    monthsAhead: number,
  ): PredictedMaintenanceDto {
    const expectedInterval = this.maintenanceIntervals[type];
    const avgCost = this.avgRepairCosts[type];

    // Calculate days since last maintenance
    let daysSinceLastMaintenance: number;
    if (history.length > 0) {
      const lastMaintenance = new Date(history[0].createdAt);
      daysSinceLastMaintenance = Math.ceil(
        (Date.now() - lastMaintenance.getTime()) / (1000 * 60 * 60 * 24),
      );
    } else {
      // No history - assume overdue based on property age
      daysSinceLastMaintenance = Math.min(propertyAge * 365, expectedInterval * 2);
    }

    // Calculate base risk score
    let riskScore = daysSinceLastMaintenance / expectedInterval;

    // Apply age multiplier
    riskScore *= ageMultiplier;

    // Apply frequency adjustment (more past issues = higher risk)
    const frequencyMultiplier = Math.min(1 + (history.length * 0.1), 2);
    riskScore *= frequencyMultiplier;

    // Apply seasonal adjustment for HVAC
    if (type === MaintenanceRequestType.HVAC) {
      const month = new Date().getMonth();
      // Higher risk in summer (June-Aug) and winter (Dec-Feb)
      if (month >= 5 && month <= 7) riskScore *= 1.3; // Summer
      if (month === 11 || month <= 1) riskScore *= 1.3; // Winter
    }

    // Cap risk score at 1
    riskScore = Math.min(riskScore, 1);

    // Determine risk category
    let riskCategory: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    if (riskScore >= 0.8) riskCategory = 'CRITICAL';
    else if (riskScore >= 0.6) riskCategory = 'HIGH';
    else if (riskScore >= 0.4) riskCategory = 'MEDIUM';
    else riskCategory = 'LOW';

    // Estimate days until issue
    const remainingDays = Math.max(0, expectedInterval - daysSinceLastMaintenance);
    const estimatedDaysUntilIssue = Math.max(
      1,
      Math.round(remainingDays / ageMultiplier),
    );

    // Calculate timeframe
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + Math.min(estimatedDaysUntilIssue, monthsAhead * 30));
    const predictedTimeframe = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;

    // Generate risk factors
    const riskFactors: string[] = [];
    if (propertyAge > 20) riskFactors.push(`Property age: ${propertyAge} years`);
    if (daysSinceLastMaintenance > expectedInterval) {
      riskFactors.push(`Overdue by ${daysSinceLastMaintenance - expectedInterval} days`);
    }
    if (history.length >= 3) {
      riskFactors.push(`${history.length} past issues of this type`);
    }
    if (type === MaintenanceRequestType.HVAC) {
      const month = new Date().getMonth();
      if (month >= 5 && month <= 7) riskFactors.push('Peak summer usage period');
      if (month === 11 || month <= 1) riskFactors.push('Peak winter heating season');
    }

    // Generate recommendation
    const recommendation = this.generateRecommendation(type, riskCategory, daysSinceLastMaintenance);

    // Calculate confidence based on data availability
    const confidence = Math.min(0.5 + history.length * 0.1, 0.95);

    return {
      type,
      riskScore: Math.round(riskScore * 100) / 100,
      riskCategory,
      estimatedDaysUntilIssue,
      predictedTimeframe,
      estimatedCost: Math.round(avgCost * ageMultiplier),
      riskFactors,
      recommendation,
      confidence: Math.round(confidence * 100) / 100,
    };
  }

  /**
   * Generate recommendation based on type and risk
   */
  private generateRecommendation(
    type: MaintenanceRequestType,
    riskCategory: string,
    _daysSinceLast: number,
  ): string {
    const typeLabels: Record<MaintenanceRequestType, string> = {
      [MaintenanceRequestType.PLUMBING]: 'plumbing system',
      [MaintenanceRequestType.ELECTRICAL]: 'electrical system',
      [MaintenanceRequestType.HVAC]: 'HVAC system',
      [MaintenanceRequestType.APPLIANCE]: 'appliances',
      [MaintenanceRequestType.STRUCTURAL]: 'structural elements',
      [MaintenanceRequestType.PEST_CONTROL]: 'pest control',
      [MaintenanceRequestType.CLEANING]: 'deep cleaning',
      [MaintenanceRequestType.LANDSCAPING]: 'landscaping',
      [MaintenanceRequestType.OTHER]: 'general maintenance',
    };

    const label = typeLabels[type];

    switch (riskCategory) {
      case 'CRITICAL':
        return `Immediate attention required for ${label}. Schedule inspection within 1-2 weeks to prevent costly emergency repairs.`;
      case 'HIGH':
        return `Schedule preventive maintenance for ${label} within the next month to avoid potential issues.`;
      case 'MEDIUM':
        return `Consider scheduling routine ${label} check in the next 2-3 months.`;
      default:
        return `${label.charAt(0).toUpperCase() + label.slice(1)} appears to be in good condition. Continue regular monitoring.`;
    }
  }

  // ============================================
  // PROD-108.3: Proactive Alerts
  // ============================================

  /**
   * Get active alerts for a landlord
   */
  async getAlerts(userId: string): Promise<AlertsResponseDto> {
    const predictions = await this.getPortfolioPredictions(userId, 3);
    const alerts: MaintenanceAlertDto[] = [];

    for (const property of predictions.properties) {
      for (const pred of property.predictions) {
        if (pred.riskCategory === 'HIGH' || pred.riskCategory === 'CRITICAL') {
          const severity =
            pred.riskCategory === 'CRITICAL' ? 'CRITICAL' : 'URGENT';

          alerts.push({
            id: `${property.propertyId}-${pred.type}-${Date.now()}`,
            propertyId: property.propertyId,
            propertyTitle: property.propertyTitle,
            severity,
            type: pred.type,
            title: `${pred.type} maintenance needed`,
            message: pred.recommendation,
            recommendedAction: `Schedule ${pred.type.toLowerCase()} inspection`,
            estimatedCostIfIgnored: pred.estimatedCost * 2, // Double if ignored
            daysUntilActionNeeded: pred.estimatedDaysUntilIssue,
            createdAt: new Date(),
            dismissed: false,
          });
        } else if (pred.riskCategory === 'MEDIUM' && pred.riskScore > 0.45) {
          alerts.push({
            id: `${property.propertyId}-${pred.type}-${Date.now()}`,
            propertyId: property.propertyId,
            propertyTitle: property.propertyTitle,
            severity: 'WARNING',
            type: pred.type,
            title: `${pred.type} maintenance recommended`,
            message: pred.recommendation,
            recommendedAction: `Plan ${pred.type.toLowerCase()} maintenance`,
            estimatedCostIfIgnored: Math.round(pred.estimatedCost * 1.5),
            daysUntilActionNeeded: pred.estimatedDaysUntilIssue,
            createdAt: new Date(),
            dismissed: false,
          });
        }
      }
    }

    // Sort by severity then by days until action needed
    const severityOrder = { CRITICAL: 0, URGENT: 1, WARNING: 2, INFO: 3 };
    alerts.sort((a, b) => {
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return a.daysUntilActionNeeded - b.daysUntilActionNeeded;
    });

    return {
      alerts,
      totalAlerts: alerts.length,
      criticalCount: alerts.filter((a) => a.severity === 'CRITICAL').length,
      urgentCount: alerts.filter((a) => a.severity === 'URGENT').length,
    };
  }

  /**
   * Send proactive maintenance alerts (runs weekly on Monday at 8 AM)
   */
  @Cron('0 8 * * 1', { name: 'predictive-maintenance-alerts' })
  async sendProactiveAlerts(): Promise<void> {
    this.logger.log('Starting predictive maintenance alert job');

    try {
      // Get all landlords with properties
      const landlords = await this.prisma.user.findMany({
        where: {
          properties: { some: {} },
        },
        select: {
          id: true,
          email: true,
          firstName: true,
        },
      });

      for (const landlord of landlords) {
        try {
          const alerts = await this.getAlerts(landlord.id);

          if (alerts.criticalCount > 0 || alerts.urgentCount > 0) {
            // Send notification
            await this.notifications.create(
              landlord.id,
              'MAINTENANCE_REQUEST_SUBMITTED', // Using existing type for now
              'Predictive Maintenance Alert',
              `You have ${alerts.criticalCount} critical and ${alerts.urgentCount} urgent maintenance predictions for your properties.`,
            );

            this.logger.log(
              `Sent maintenance alerts to landlord ${landlord.id}: ${alerts.criticalCount} critical, ${alerts.urgentCount} urgent`,
            );
          }
        } catch (error) {
          this.logger.error(`Failed to process alerts for landlord ${landlord.id}:`, error);
        }
      }

      this.logger.log('Completed predictive maintenance alert job');
    } catch (error) {
      this.logger.error('Failed to run predictive maintenance alert job:', error);
    }
  }

  // ============================================
  // PROD-108.4: HVAC Predictions
  // ============================================

  /**
   * Get detailed HVAC prediction for a property
   */
  async getHvacPrediction(propertyId: string, userId: string): Promise<HvacPredictionDto> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        title: true,
        yearBuilt: true,
        ownerId: true,
      },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.ownerId !== userId) {
      throw new NotFoundException('Property not found');
    }

    const currentYear = new Date().getFullYear();
    const propertyAge = property.yearBuilt ? currentYear - property.yearBuilt : 20;

    // HVAC systems typically last 15-25 years
    // Assume HVAC is same age as property unless we have data otherwise
    const estimatedHvacAge = Math.min(propertyAge, 25);
    const typicalLifespan = 20;
    const lifespanPercentage = Math.min((estimatedHvacAge / typicalLifespan) * 100, 100);

    // Get HVAC maintenance history
    const hvacHistory = await this.prisma.maintenanceRequest.findMany({
      where: {
        propertyId,
        type: MaintenanceRequestType.HVAC,
      },
      orderBy: { createdAt: 'desc' },
    });

    const lastMaintenanceDate = hvacHistory.length > 0 ? hvacHistory[0].createdAt : null;
    const daysSinceLastService = lastMaintenanceDate
      ? Math.ceil((Date.now() - new Date(lastMaintenanceDate).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // Calculate failure risk
    let failureRisk = 0;

    // Age factor (0-0.4)
    failureRisk += (estimatedHvacAge / typicalLifespan) * 0.4;

    // Maintenance frequency factor (0-0.3)
    if (daysSinceLastService) {
      failureRisk += Math.min((daysSinceLastService / 365) * 0.15, 0.3);
    } else {
      failureRisk += 0.2; // No maintenance history
    }

    // Historical issues factor (0-0.3)
    failureRisk += Math.min(hvacHistory.length * 0.05, 0.3);

    failureRisk = Math.min(failureRisk, 1);

    // Determine health status
    let healthStatus: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';
    if (failureRisk <= 0.2) healthStatus = 'EXCELLENT';
    else if (failureRisk <= 0.4) healthStatus = 'GOOD';
    else if (failureRisk <= 0.6) healthStatus = 'FAIR';
    else if (failureRisk <= 0.8) healthStatus = 'POOR';
    else healthStatus = 'CRITICAL';

    // Seasonal risk
    const month = new Date().getMonth();
    let seasonalRisk = 'Low seasonal risk';
    if (month >= 5 && month <= 7) {
      seasonalRisk = 'High risk - Peak summer cooling season';
    } else if (month === 11 || month <= 1) {
      seasonalRisk = 'High risk - Peak winter heating season';
    } else if (month >= 3 && month <= 4) {
      seasonalRisk = 'Moderate - Pre-summer preparation recommended';
    } else if (month >= 9 && month <= 10) {
      seasonalRisk = 'Moderate - Pre-winter preparation recommended';
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (healthStatus === 'CRITICAL' || healthStatus === 'POOR') {
      recommendations.push('Schedule immediate HVAC inspection');
      recommendations.push('Consider replacement options - system may be near end of life');
    }
    if (!lastMaintenanceDate || (daysSinceLastService && daysSinceLastService > 180)) {
      recommendations.push('Schedule preventive maintenance service');
    }
    if (month >= 3 && month <= 4) {
      recommendations.push('Pre-summer AC tune-up recommended');
    }
    if (month >= 9 && month <= 10) {
      recommendations.push('Pre-winter heating system check recommended');
    }
    if (recommendations.length === 0) {
      recommendations.push('Continue regular maintenance schedule');
      recommendations.push('Replace air filters monthly during peak seasons');
    }

    // Cost estimates
    const estimatedReplacementCost = 5000 + (propertyAge > 30 ? 2000 : 0);
    const estimatedAnnualMaintenanceCost = 200 + hvacHistory.length * 50;

    return {
      propertyId,
      propertyTitle: property.title,
      estimatedHvacAge,
      typicalLifespan,
      lifespanPercentage: Math.round(lifespanPercentage),
      lastMaintenanceDate,
      daysSinceLastService,
      historicalHvacIssues: hvacHistory.length,
      failureRisk: Math.round(failureRisk * 100) / 100,
      healthStatus,
      seasonalRisk,
      recommendations,
      estimatedReplacementCost,
      estimatedAnnualMaintenanceCost,
    };
  }
}
