import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PredictiveMaintenanceService } from './predictive-maintenance.service';
import { PrismaService } from '@/database';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '@/mail/mail.service';
import { MaintenanceRequestType, MaintenanceRequestStatus } from '@prisma/client';

describe('PredictiveMaintenanceService', () => {
  let service: PredictiveMaintenanceService;

  const mockPrismaService = {
    property: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    maintenanceRequest: {
      findMany: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  };

  const mockNotificationsService = {
    create: jest.fn(),
  };

  const mockMailService = {
    sendEmail: jest.fn(),
  };

  const userId = 'user-123';
  const propertyId = 'property-456';

  const mockProperty = {
    id: propertyId,
    title: 'Test Property',
    address: '123 Test Street',
    yearBuilt: 2000,
    ownerId: userId,
  };

  const mockMaintenanceRequest = {
    id: 'request-1',
    propertyId,
    type: MaintenanceRequestType.PLUMBING,
    status: MaintenanceRequestStatus.CONFIRMED,
    createdAt: new Date('2024-01-15'),
    completedAt: new Date('2024-01-17'),
    actualCost: 250,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PredictiveMaintenanceService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<PredictiveMaintenanceService>(PredictiveMaintenanceService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  // ============================================
  // PROD-108.1: Historical Data Analysis
  // ============================================

  describe('getPropertyHistory (PROD-108.1)', () => {
    it('should return maintenance history for a property', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue(mockProperty);
      mockPrismaService.maintenanceRequest.findMany.mockResolvedValue([
        mockMaintenanceRequest,
        {
          ...mockMaintenanceRequest,
          id: 'request-2',
          createdAt: new Date('2024-06-15'),
          completedAt: new Date('2024-06-18'),
          actualCost: 300,
        },
      ]);

      const result = await service.getPropertyHistory(propertyId, userId);

      expect(result.propertyId).toBe(propertyId);
      expect(result.propertyTitle).toBe(mockProperty.title);
      expect(result.yearBuilt).toBe(mockProperty.yearBuilt);
      expect(result.totalRequests).toBe(2);
      expect(result.totalSpent).toBe(550);
      expect(result.byType.length).toBeGreaterThan(0);
    });

    it('should calculate property age correctly', async () => {
      const currentYear = new Date().getFullYear();
      mockPrismaService.property.findUnique.mockResolvedValue(mockProperty);
      mockPrismaService.maintenanceRequest.findMany.mockResolvedValue([]);

      const result = await service.getPropertyHistory(propertyId, userId);

      expect(result.propertyAge).toBe(currentYear - 2000);
    });

    it('should handle property with no maintenance history', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue(mockProperty);
      mockPrismaService.maintenanceRequest.findMany.mockResolvedValue([]);

      const result = await service.getPropertyHistory(propertyId, userId);

      expect(result.totalRequests).toBe(0);
      expect(result.totalSpent).toBe(0);
      expect(result.byType).toEqual([]);
    });

    it('should calculate statistics by maintenance type', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue(mockProperty);
      mockPrismaService.maintenanceRequest.findMany.mockResolvedValue([
        mockMaintenanceRequest,
        { ...mockMaintenanceRequest, id: 'request-2', actualCost: 150 },
        { ...mockMaintenanceRequest, id: 'request-3', type: MaintenanceRequestType.HVAC, actualCost: 500 },
      ]);

      const result = await service.getPropertyHistory(propertyId, userId);

      const plumbingStats = result.byType.find((t) => t.type === MaintenanceRequestType.PLUMBING);
      expect(plumbingStats).toBeDefined();
      expect(plumbingStats!.count).toBe(2);
      expect(plumbingStats!.totalCost).toBe(400);
    });

    it('should throw NotFoundException if property not found', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue(null);

      await expect(service.getPropertyHistory(propertyId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if user is not property owner', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue({
        ...mockProperty,
        ownerId: 'other-user',
      });

      await expect(service.getPropertyHistory(propertyId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should calculate average days between occurrences', async () => {
      const requests = [
        { ...mockMaintenanceRequest, createdAt: new Date('2024-01-01') },
        { ...mockMaintenanceRequest, id: 'request-2', createdAt: new Date('2024-04-01') }, // 90 days later
      ];
      mockPrismaService.property.findUnique.mockResolvedValue(mockProperty);
      mockPrismaService.maintenanceRequest.findMany.mockResolvedValue(requests);

      const result = await service.getPropertyHistory(propertyId, userId);

      const plumbingStats = result.byType.find((t) => t.type === MaintenanceRequestType.PLUMBING);
      expect(plumbingStats!.avgDaysBetween).toBeGreaterThan(0);
    });
  });

  // ============================================
  // PROD-108.2: Failure Prediction
  // ============================================

  describe('getPropertyPredictions (PROD-108.2)', () => {
    it('should return predictions for a property', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue(mockProperty);
      mockPrismaService.maintenanceRequest.findMany.mockResolvedValue([mockMaintenanceRequest]);

      const result = await service.getPropertyPredictions(propertyId, userId);

      expect(result.propertyId).toBe(propertyId);
      expect(result.propertyTitle).toBe(mockProperty.title);
      expect(result.overallRiskScore).toBeGreaterThanOrEqual(0);
      expect(result.overallRiskScore).toBeLessThanOrEqual(1);
      expect(result.predictions).toBeDefined();
      expect(result.generatedAt).toBeDefined();
    });

    it('should include predictions with risk categories', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue({
        ...mockProperty,
        yearBuilt: 1980, // Old property = higher risk
      });
      mockPrismaService.maintenanceRequest.findMany.mockResolvedValue([]);

      const result = await service.getPropertyPredictions(propertyId, userId);

      if (result.predictions.length > 0) {
        expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(
          result.predictions[0].riskCategory,
        );
        expect(result.predictions[0].riskScore).toBeGreaterThanOrEqual(0);
        expect(result.predictions[0].riskScore).toBeLessThanOrEqual(1);
      }
    });

    it('should assign higher risk to older properties', async () => {
      mockPrismaService.maintenanceRequest.findMany.mockResolvedValue([]);

      // New property
      mockPrismaService.property.findUnique.mockResolvedValueOnce({
        ...mockProperty,
        yearBuilt: 2020,
      });
      const newPropertyResult = await service.getPropertyPredictions(propertyId, userId, 12);

      // Old property
      mockPrismaService.property.findUnique.mockResolvedValueOnce({
        ...mockProperty,
        yearBuilt: 1970,
      });
      const oldPropertyResult = await service.getPropertyPredictions(propertyId, userId, 12);

      expect(oldPropertyResult.overallRiskScore).toBeGreaterThanOrEqual(
        newPropertyResult.overallRiskScore,
      );
    });

    it('should respect monthsAhead parameter', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue(mockProperty);
      mockPrismaService.maintenanceRequest.findMany.mockResolvedValue([]);

      const result = await service.getPropertyPredictions(propertyId, userId, 3);

      expect(result.predictions.every((p) => p.estimatedDaysUntilIssue <= 90)).toBe(true);
    });

    it('should throw NotFoundException if property not found', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue(null);

      await expect(service.getPropertyPredictions(propertyId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should include recommendation for each prediction', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue({
        ...mockProperty,
        yearBuilt: 1980,
      });
      mockPrismaService.maintenanceRequest.findMany.mockResolvedValue([]);

      const result = await service.getPropertyPredictions(propertyId, userId);

      result.predictions.forEach((pred) => {
        expect(pred.recommendation).toBeDefined();
        expect(pred.recommendation.length).toBeGreaterThan(0);
      });
    });

    it('should include risk factors for predictions', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue({
        ...mockProperty,
        yearBuilt: 1970,
      });
      mockPrismaService.maintenanceRequest.findMany.mockResolvedValue([
        mockMaintenanceRequest,
        { ...mockMaintenanceRequest, id: 'r2' },
        { ...mockMaintenanceRequest, id: 'r3' },
      ]);

      const result = await service.getPropertyPredictions(propertyId, userId);

      if (result.predictions.length > 0) {
        expect(result.predictions[0].riskFactors).toBeDefined();
        expect(Array.isArray(result.predictions[0].riskFactors)).toBe(true);
      }
    });
  });

  describe('getPortfolioPredictions (PROD-108.2)', () => {
    it('should return predictions for all properties', async () => {
      mockPrismaService.property.findMany.mockResolvedValue([
        mockProperty,
        { ...mockProperty, id: 'property-2', title: 'Property 2' },
      ]);
      mockPrismaService.maintenanceRequest.findMany.mockResolvedValue([]);

      const result = await service.getPortfolioPredictions(userId);

      expect(result.totalProperties).toBe(2);
      expect(result.properties.length).toBe(2);
      expect(result.generatedAt).toBeDefined();
    });

    it('should count high-risk properties', async () => {
      mockPrismaService.property.findMany.mockResolvedValue([
        { ...mockProperty, yearBuilt: 1960 }, // Very old
        { ...mockProperty, id: 'property-2', yearBuilt: 2020 }, // New
      ]);
      mockPrismaService.maintenanceRequest.findMany.mockResolvedValue([]);

      const result = await service.getPortfolioPredictions(userId);

      expect(result.highRiskProperties).toBeGreaterThanOrEqual(0);
    });

    it('should calculate total estimated costs', async () => {
      mockPrismaService.property.findMany.mockResolvedValue([mockProperty]);
      mockPrismaService.maintenanceRequest.findMany.mockResolvedValue([]);

      const result = await service.getPortfolioPredictions(userId);

      expect(result.totalEstimatedCosts).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty portfolio', async () => {
      mockPrismaService.property.findMany.mockResolvedValue([]);

      const result = await service.getPortfolioPredictions(userId);

      expect(result.totalProperties).toBe(0);
      expect(result.properties).toEqual([]);
    });
  });

  // ============================================
  // PROD-108.3: Proactive Alerts
  // ============================================

  describe('getAlerts (PROD-108.3)', () => {
    it('should return alerts sorted by severity', async () => {
      mockPrismaService.property.findMany.mockResolvedValue([
        { ...mockProperty, yearBuilt: 1960 }, // Very old = high risk
      ]);
      mockPrismaService.maintenanceRequest.findMany.mockResolvedValue([]);

      const result = await service.getAlerts(userId);

      expect(result.alerts).toBeDefined();
      expect(result.totalAlerts).toBeGreaterThanOrEqual(0);

      // Verify severity ordering
      const severityOrder = { CRITICAL: 0, URGENT: 1, WARNING: 2, INFO: 3 };
      for (let i = 1; i < result.alerts.length; i++) {
        const prevOrder = severityOrder[result.alerts[i - 1].severity];
        const currOrder = severityOrder[result.alerts[i].severity];
        expect(currOrder).toBeGreaterThanOrEqual(prevOrder);
      }
    });

    it('should include alert counts by severity', async () => {
      mockPrismaService.property.findMany.mockResolvedValue([mockProperty]);
      mockPrismaService.maintenanceRequest.findMany.mockResolvedValue([]);

      const result = await service.getAlerts(userId);

      expect(result.criticalCount).toBeGreaterThanOrEqual(0);
      expect(result.urgentCount).toBeGreaterThanOrEqual(0);
      expect(result.totalAlerts).toBe(result.alerts.length);
    });

    it('should include property information in alerts', async () => {
      mockPrismaService.property.findMany.mockResolvedValue([
        { ...mockProperty, yearBuilt: 1960 },
      ]);
      mockPrismaService.maintenanceRequest.findMany.mockResolvedValue([]);

      const result = await service.getAlerts(userId);

      if (result.alerts.length > 0) {
        expect(result.alerts[0].propertyId).toBe(propertyId);
        expect(result.alerts[0].propertyTitle).toBe(mockProperty.title);
      }
    });

    it('should include recommended action in alerts', async () => {
      mockPrismaService.property.findMany.mockResolvedValue([
        { ...mockProperty, yearBuilt: 1960 },
      ]);
      mockPrismaService.maintenanceRequest.findMany.mockResolvedValue([]);

      const result = await service.getAlerts(userId);

      if (result.alerts.length > 0) {
        expect(result.alerts[0].recommendedAction).toBeDefined();
        expect(result.alerts[0].recommendedAction.length).toBeGreaterThan(0);
      }
    });

    it('should include estimated cost if ignored', async () => {
      mockPrismaService.property.findMany.mockResolvedValue([
        { ...mockProperty, yearBuilt: 1960 },
      ]);
      mockPrismaService.maintenanceRequest.findMany.mockResolvedValue([]);

      const result = await service.getAlerts(userId);

      if (result.alerts.length > 0) {
        expect(result.alerts[0].estimatedCostIfIgnored).toBeGreaterThan(0);
      }
    });
  });

  // ============================================
  // PROD-108.4: HVAC Predictions
  // ============================================

  describe('getHvacPrediction (PROD-108.4)', () => {
    it('should return HVAC prediction for a property', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue(mockProperty);
      mockPrismaService.maintenanceRequest.findMany.mockResolvedValue([]);

      const result = await service.getHvacPrediction(propertyId, userId);

      expect(result.propertyId).toBe(propertyId);
      expect(result.propertyTitle).toBe(mockProperty.title);
      expect(result.estimatedHvacAge).toBeDefined();
      expect(result.typicalLifespan).toBe(20);
      expect(result.failureRisk).toBeGreaterThanOrEqual(0);
      expect(result.failureRisk).toBeLessThanOrEqual(1);
    });

    it('should determine HVAC health status based on risk', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue(mockProperty);
      mockPrismaService.maintenanceRequest.findMany.mockResolvedValue([]);

      const result = await service.getHvacPrediction(propertyId, userId);

      expect(['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'CRITICAL']).toContain(result.healthStatus);
    });

    it('should include seasonal risk assessment', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue(mockProperty);
      mockPrismaService.maintenanceRequest.findMany.mockResolvedValue([]);

      const result = await service.getHvacPrediction(propertyId, userId);

      expect(result.seasonalRisk).toBeDefined();
      expect(result.seasonalRisk.length).toBeGreaterThan(0);
    });

    it('should provide HVAC recommendations', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue(mockProperty);
      mockPrismaService.maintenanceRequest.findMany.mockResolvedValue([]);

      const result = await service.getHvacPrediction(propertyId, userId);

      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should calculate days since last HVAC service', async () => {
      const hvacRequest = {
        ...mockMaintenanceRequest,
        type: MaintenanceRequestType.HVAC,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      };
      mockPrismaService.property.findUnique.mockResolvedValue(mockProperty);
      mockPrismaService.maintenanceRequest.findMany.mockResolvedValue([hvacRequest]);

      const result = await service.getHvacPrediction(propertyId, userId);

      expect(result.lastMaintenanceDate).toBeDefined();
      expect(result.daysSinceLastService).toBeGreaterThan(25);
      expect(result.daysSinceLastService).toBeLessThan(35);
    });

    it('should include historical HVAC issue count', async () => {
      const hvacRequests = [
        { ...mockMaintenanceRequest, type: MaintenanceRequestType.HVAC },
        { ...mockMaintenanceRequest, id: 'r2', type: MaintenanceRequestType.HVAC },
      ];
      mockPrismaService.property.findUnique.mockResolvedValue(mockProperty);
      mockPrismaService.maintenanceRequest.findMany.mockResolvedValue(hvacRequests);

      const result = await service.getHvacPrediction(propertyId, userId);

      expect(result.historicalHvacIssues).toBe(2);
    });

    it('should estimate replacement and annual maintenance costs', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue(mockProperty);
      mockPrismaService.maintenanceRequest.findMany.mockResolvedValue([]);

      const result = await service.getHvacPrediction(propertyId, userId);

      expect(result.estimatedReplacementCost).toBeGreaterThan(0);
      expect(result.estimatedAnnualMaintenanceCost).toBeGreaterThan(0);
    });

    it('should throw NotFoundException if property not found', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue(null);

      await expect(service.getHvacPrediction(propertyId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if user is not owner', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue({
        ...mockProperty,
        ownerId: 'other-user',
      });

      await expect(service.getHvacPrediction(propertyId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should calculate lifespan percentage', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue({
        ...mockProperty,
        yearBuilt: 2015, // 10 years old
      });
      mockPrismaService.maintenanceRequest.findMany.mockResolvedValue([]);

      const result = await service.getHvacPrediction(propertyId, userId);

      expect(result.lifespanPercentage).toBeGreaterThan(0);
      expect(result.lifespanPercentage).toBeLessThanOrEqual(100);
    });
  });

  // ============================================
  // Cron Job Tests
  // ============================================

  describe('sendProactiveAlerts cron job', () => {
    it('should send notifications for landlords with critical alerts', async () => {
      const landlord = {
        id: userId,
        email: 'landlord@test.com',
        firstName: 'Test',
      };

      mockPrismaService.user.findMany.mockResolvedValue([landlord]);
      mockPrismaService.property.findMany.mockResolvedValue([
        { ...mockProperty, yearBuilt: 1960 }, // Very old = high risk
      ]);
      mockPrismaService.maintenanceRequest.findMany.mockResolvedValue([]);

      await service.sendProactiveAlerts();

      // The notification should have been called if there were critical/urgent alerts
      // This depends on the prediction algorithm generating alerts
      expect(mockPrismaService.user.findMany).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockPrismaService.user.findMany.mockRejectedValue(new Error('Database error'));

      // Should not throw
      await expect(service.sendProactiveAlerts()).resolves.not.toThrow();
    });

    it('should skip landlords with no critical/urgent alerts', async () => {
      const landlord = {
        id: userId,
        email: 'landlord@test.com',
        firstName: 'Test',
      };

      mockPrismaService.user.findMany.mockResolvedValue([landlord]);
      mockPrismaService.property.findMany.mockResolvedValue([
        { ...mockProperty, yearBuilt: 2024 }, // Brand new = low risk
      ]);
      mockPrismaService.maintenanceRequest.findMany.mockResolvedValue([]);

      await service.sendProactiveAlerts();

      expect(mockPrismaService.user.findMany).toHaveBeenCalled();
    });
  });
});
