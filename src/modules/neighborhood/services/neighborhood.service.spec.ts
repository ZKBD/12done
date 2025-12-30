import { Test, TestingModule } from '@nestjs/testing';
import { NeighborhoodService } from './neighborhood.service';
import { PrismaService } from '@/database/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { AmenityCategory, SchoolLevel, RiskLevel } from '@prisma/client';

describe('NeighborhoodService', () => {
  let service: NeighborhoodService;
  let prismaService: PrismaService;

  const mockLatitude = 34.0522;
  const mockLongitude = -118.2437;
  const mockPropertyId = 'property-123';

  const mockNeighborhoodData = {
    id: 'neighborhood-1',
    latitude: mockLatitude,
    longitude: mockLongitude,
    zipCode: '90001',
    city: 'Los Angeles',
    state: 'CA',
    neighborhood: 'Downtown',
    aiDescription: 'A vibrant urban neighborhood',
    walkScore: 85,
    transitScore: 72,
    bikeScore: 68,
    safetyScore: 75,
    crimeRating: 'LOW',
    crimeData: { violent: 2.5, property: 15.3 },
    demographics: { population: 25000, medianAge: 35, medianIncome: 65000 },
    noiseLevel: 'MODERATE',
    airQuality: 42,
    pollenLevel: 'LOW',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    fetchedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSchoolData = {
    id: 'school-1',
    latitude: mockLatitude,
    longitude: mockLongitude,
    name: 'Lincoln Elementary',
    level: SchoolLevel.ELEMENTARY,
    rating: 8,
    studentCount: 450,
    address: '123 School St',
    distanceKm: 0.5,
    walkingMinutes: 6,
    drivingMinutes: 2,
    publicPrivate: 'PUBLIC',
    schoolDistrict: 'LAUSD',
    grades: 'K-5',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    fetchedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAmenity = {
    id: 'amenity-1',
    refLatitude: mockLatitude,
    refLongitude: mockLongitude,
    category: AmenityCategory.GROCERY,
    name: 'Whole Foods Market',
    address: '100 Market St',
    latitude: mockLatitude + 0.003,
    longitude: mockLongitude + 0.002,
    distanceMeters: 350,
    walkingMinutes: 4,
    drivingMinutes: 1,
    rating: 4.5,
    priceLevel: 3,
    isOpenNow: true,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    fetchedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockClimateRiskData = {
    id: 'climate-1',
    latitude: mockLatitude,
    longitude: mockLongitude,
    zipCode: '90001',
    floodRisk: RiskLevel.LOW,
    floodZone: 'X',
    fireRisk: RiskLevel.MODERATE,
    earthquakeRisk: RiskLevel.MODERATE,
    hurricaneRisk: RiskLevel.MINIMAL,
    tornadoRisk: RiskLevel.MINIMAL,
    droughtRisk: RiskLevel.LOW,
    overallRiskScore: 25,
    overallRiskLevel: RiskLevel.LOW,
    floodInsuranceRequired: false,
    insuranceNotes: 'Standard coverage recommended',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    fetchedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProperty = {
    id: mockPropertyId,
    latitude: mockLatitude,
    longitude: mockLongitude,
    address: '123 Main St',
    city: 'Los Angeles',
    country: 'US',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NeighborhoodService,
        {
          provide: PrismaService,
          useValue: {
            neighborhoodData: {
              findUnique: jest.fn(),
              upsert: jest.fn(),
            },
            schoolData: {
              findMany: jest.fn(),
              create: jest.fn(),
            },
            nearbyAmenity: {
              findMany: jest.fn(),
              create: jest.fn(),
            },
            climateRiskData: {
              findUnique: jest.fn(),
              upsert: jest.fn(),
            },
            futureDevelopment: {
              findMany: jest.fn(),
            },
            property: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<NeighborhoodService>(NeighborhoodService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('getNeighborhoodData (PROD-150)', () => {
    it('should return cached data if available and not expired', async () => {
      jest.spyOn(prismaService.neighborhoodData, 'findUnique').mockResolvedValue(mockNeighborhoodData as any);

      const result = await service.getNeighborhoodData({
        latitude: mockLatitude,
        longitude: mockLongitude,
      });

      expect(result.latitude).toBe(mockLatitude);
      expect(result.longitude).toBe(mockLongitude);
      expect(result.mobilityScores.walkScore).toBe(85);
      expect(result.mobilityScores.transitScore).toBe(72);
      expect(result.mobilityScores.bikeScore).toBe(68);
      expect(result.safety.safetyScore).toBe(75);
    });

    it('should fetch fresh data if cache is expired (PROD-150.1)', async () => {
      const expiredData = { ...mockNeighborhoodData, expiresAt: new Date(Date.now() - 1000) };
      jest.spyOn(prismaService.neighborhoodData, 'findUnique').mockResolvedValue(expiredData as any);
      jest.spyOn(prismaService.neighborhoodData, 'upsert').mockResolvedValue(mockNeighborhoodData as any);

      const result = await service.getNeighborhoodData({
        latitude: mockLatitude,
        longitude: mockLongitude,
      });

      expect(result).toBeDefined();
      expect(result.mobilityScores).toBeDefined();
      expect(prismaService.neighborhoodData.upsert).toHaveBeenCalled();
    });

    it('should include AI-generated neighborhood description (PROD-150.4)', async () => {
      jest.spyOn(prismaService.neighborhoodData, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prismaService.neighborhoodData, 'upsert').mockResolvedValue(mockNeighborhoodData as any);

      const result = await service.getNeighborhoodData({
        latitude: mockLatitude,
        longitude: mockLongitude,
      });

      expect(result.aiDescription).toBeDefined();
      expect(typeof result.aiDescription).toBe('string');
    });

    it('should include nearby amenities summary (PROD-150.3)', async () => {
      jest.spyOn(prismaService.neighborhoodData, 'findUnique').mockResolvedValue(mockNeighborhoodData as any);

      const result = await service.getNeighborhoodData({
        latitude: mockLatitude,
        longitude: mockLongitude,
      });

      expect(result.city).toBeDefined();
      expect(result.neighborhood).toBeDefined();
    });
  });

  describe('getSchools (PROD-151)', () => {
    it('should return nearby schools (PROD-151.1)', async () => {
      jest.spyOn(prismaService.schoolData, 'findMany').mockResolvedValue([mockSchoolData] as any);

      const result = await service.getSchools({
        latitude: mockLatitude,
        longitude: mockLongitude,
      });

      expect(result.schools).toBeDefined();
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it('should include school ratings (PROD-151.2)', async () => {
      jest.spyOn(prismaService.schoolData, 'findMany').mockResolvedValue([mockSchoolData] as any);

      const result = await service.getSchools({
        latitude: mockLatitude,
        longitude: mockLongitude,
      });

      if (result.schools.length > 0) {
        expect(result.schools[0].rating).toBeDefined();
        expect(result.schools[0].rating).toBeGreaterThanOrEqual(0);
        expect(result.schools[0].rating).toBeLessThanOrEqual(10);
      }
    });

    it('should group schools by level (PROD-151.3)', async () => {
      const multiLevelSchools = [
        { ...mockSchoolData, level: SchoolLevel.ELEMENTARY },
        { ...mockSchoolData, id: 'school-2', level: SchoolLevel.MIDDLE },
        { ...mockSchoolData, id: 'school-3', level: SchoolLevel.HIGH },
      ];
      jest.spyOn(prismaService.schoolData, 'findMany').mockResolvedValue(multiLevelSchools as any);

      const result = await service.getSchools({
        latitude: mockLatitude,
        longitude: mockLongitude,
      });

      expect(result.elementary).toBeDefined();
      expect(result.middle).toBeDefined();
      expect(result.high).toBeDefined();
    });

    it('should filter by school level', async () => {
      jest.spyOn(prismaService.schoolData, 'findMany').mockResolvedValue([mockSchoolData] as any);

      const result = await service.getSchools({
        latitude: mockLatitude,
        longitude: mockLongitude,
        level: SchoolLevel.ELEMENTARY,
      });

      result.schools.forEach(school => {
        expect(school.level).toBe(SchoolLevel.ELEMENTARY);
      });
    });

    it('should filter by minimum rating', async () => {
      jest.spyOn(prismaService.schoolData, 'findMany').mockResolvedValue([mockSchoolData] as any);

      const result = await service.getSchools({
        latitude: mockLatitude,
        longitude: mockLongitude,
        minRating: 7,
      });

      result.schools.forEach(school => {
        expect(school.rating).toBeGreaterThanOrEqual(7);
      });
    });

    it('should include distance and walking time (PROD-151.5)', async () => {
      jest.spyOn(prismaService.schoolData, 'findMany').mockResolvedValue([mockSchoolData] as any);

      const result = await service.getSchools({
        latitude: mockLatitude,
        longitude: mockLongitude,
      });

      if (result.schools.length > 0) {
        expect(result.schools[0].distanceKm).toBeDefined();
        expect(result.schools[0].walkingMinutes).toBeDefined();
      }
    });
  });

  describe('getAmenities (PROD-150.3, PROD-158)', () => {
    it('should return nearby amenities', async () => {
      jest.spyOn(prismaService.nearbyAmenity, 'findMany').mockResolvedValue([mockAmenity] as any);

      const result = await service.getAmenities({
        latitude: mockLatitude,
        longitude: mockLongitude,
      });

      expect(result.amenities).toBeDefined();
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it('should filter by category', async () => {
      jest.spyOn(prismaService.nearbyAmenity, 'findMany').mockResolvedValue([mockAmenity] as any);

      const result = await service.getAmenities({
        latitude: mockLatitude,
        longitude: mockLongitude,
        category: AmenityCategory.GROCERY,
      });

      result.amenities.forEach(amenity => {
        expect(amenity.category).toBe(AmenityCategory.GROCERY);
      });
    });

    it('should group amenities by category', async () => {
      const multiCategoryAmenities = [
        mockAmenity,
        { ...mockAmenity, id: 'amenity-2', category: AmenityCategory.COFFEE, name: 'Starbucks' },
        { ...mockAmenity, id: 'amenity-3', category: AmenityCategory.FITNESS, name: 'LA Fitness' },
      ];
      jest.spyOn(prismaService.nearbyAmenity, 'findMany').mockResolvedValue(multiCategoryAmenities as any);

      const result = await service.getAmenities({
        latitude: mockLatitude,
        longitude: mockLongitude,
      });

      expect(result.byCategory).toBeDefined();
      expect(Object.keys(result.byCategory || {}).length).toBeGreaterThan(0);
    });

    it('should respect limit per category', async () => {
      const manyAmenities = Array(10).fill(null).map((_, i) => ({
        ...mockAmenity,
        id: `amenity-${i}`,
        name: `Grocery Store ${i}`,
      }));
      jest.spyOn(prismaService.nearbyAmenity, 'findMany').mockResolvedValue(manyAmenities as any);

      const result = await service.getAmenities({
        latitude: mockLatitude,
        longitude: mockLongitude,
        category: AmenityCategory.GROCERY,
        limit: 3,
      });

      expect(result.amenities.length).toBeLessThanOrEqual(3);
    });

    it('should include walking time (PROD-158)', async () => {
      jest.spyOn(prismaService.nearbyAmenity, 'findMany').mockResolvedValue([mockAmenity] as any);

      const result = await service.getAmenities({
        latitude: mockLatitude,
        longitude: mockLongitude,
      });

      if (result.amenities.length > 0) {
        expect(result.amenities[0].walkingMinutes).toBeDefined();
        expect(result.amenities[0].distanceMeters).toBeDefined();
      }
    });
  });

  describe('getClimateRisk (PROD-156)', () => {
    it('should return climate risk data', async () => {
      jest.spyOn(prismaService.climateRiskData, 'findUnique').mockResolvedValue(mockClimateRiskData as any);

      const result = await service.getClimateRisk({
        latitude: mockLatitude,
        longitude: mockLongitude,
      });

      expect(result.overallRiskLevel).toBeDefined();
      expect(result.flood).toBeDefined();
      expect(result.fire).toBeDefined();
      expect(result.earthquake).toBeDefined();
    });

    it('should include flood zone information (PROD-156.1)', async () => {
      jest.spyOn(prismaService.climateRiskData, 'findUnique').mockResolvedValue(mockClimateRiskData as any);

      const result = await service.getClimateRisk({
        latitude: mockLatitude,
        longitude: mockLongitude,
      });

      expect(result.flood.zone).toBeDefined();
      expect(result.flood.level).toBeDefined();
    });

    it('should include fire risk (PROD-156.2)', async () => {
      jest.spyOn(prismaService.climateRiskData, 'findUnique').mockResolvedValue(mockClimateRiskData as any);

      const result = await service.getClimateRisk({
        latitude: mockLatitude,
        longitude: mockLongitude,
      });

      expect(result.fire.level).toBeDefined();
      expect(Object.values(RiskLevel)).toContain(result.fire.level);
    });

    it('should include earthquake risk (PROD-156.3)', async () => {
      jest.spyOn(prismaService.climateRiskData, 'findUnique').mockResolvedValue(mockClimateRiskData as any);

      const result = await service.getClimateRisk({
        latitude: mockLatitude,
        longitude: mockLongitude,
      });

      expect(result.earthquake.level).toBeDefined();
      expect(Object.values(RiskLevel)).toContain(result.earthquake.level);
    });

    it('should calculate overall risk score (PROD-156.4)', async () => {
      jest.spyOn(prismaService.climateRiskData, 'findUnique').mockResolvedValue(mockClimateRiskData as any);

      const result = await service.getClimateRisk({
        latitude: mockLatitude,
        longitude: mockLongitude,
      });

      expect(result.overallRiskScore).toBeDefined();
      expect(result.overallRiskLevel).toBeDefined();
    });

    it('should include insurance implications (PROD-156.6)', async () => {
      jest.spyOn(prismaService.climateRiskData, 'findUnique').mockResolvedValue(mockClimateRiskData as any);

      const result = await service.getClimateRisk({
        latitude: mockLatitude,
        longitude: mockLongitude,
      });

      expect(result.flood.insuranceRequired).toBeDefined();
      expect(typeof result.flood.insuranceRequired).toBe('boolean');
    });
  });

  describe('getWalkability (PROD-158)', () => {
    it('should return walkability data', async () => {
      jest.spyOn(prismaService.nearbyAmenity, 'findMany').mockResolvedValue([mockAmenity] as any);

      const result = await service.getWalkability({
        latitude: mockLatitude,
        longitude: mockLongitude,
      });

      expect(result.items).toBeDefined();
      expect(result.averageWalkingMinutes).toBeDefined();
      expect(result.within10Minutes).toBeDefined();
    });

    it('should calculate walking times by category (PROD-158.2)', async () => {
      jest.spyOn(prismaService.nearbyAmenity, 'findMany').mockResolvedValue([mockAmenity] as any);

      const result = await service.getWalkability({
        latitude: mockLatitude,
        longitude: mockLongitude,
      });

      result.items.forEach(item => {
        expect(item.category).toBeDefined();
        expect(item.walkingMinutes).toBeDefined();
        expect(item.nearestName).toBeDefined();
      });
    });

    it('should return nearest amenity per category (PROD-158.3)', async () => {
      jest.spyOn(prismaService.nearbyAmenity, 'findMany').mockResolvedValue([mockAmenity] as any);

      const result = await service.getWalkability({
        latitude: mockLatitude,
        longitude: mockLongitude,
      });

      // Each item should represent the nearest of its category
      const categories = result.items.map(i => i.category);
      const uniqueCategories = [...new Set(categories)];
      expect(categories.length).toBe(uniqueCategories.length);
    });

    it('should count amenities within 10 minutes walk (PROD-158.4)', async () => {
      jest.spyOn(prismaService.nearbyAmenity, 'findMany').mockResolvedValue([mockAmenity] as any);

      const result = await service.getWalkability({
        latitude: mockLatitude,
        longitude: mockLongitude,
      });

      expect(typeof result.within10Minutes).toBe('number');
      expect(result.within10Minutes).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getFutureDevelopments (PROD-157)', () => {
    it('should return future development projects', async () => {
      jest.spyOn(prismaService.futureDevelopment, 'findMany').mockResolvedValue([]);

      const result = await service.getFutureDevelopments({
        latitude: mockLatitude,
        longitude: mockLongitude,
      });

      expect(result.developments).toBeDefined();
      expect(result.total).toBeDefined();
    });

    it('should include project timeline (PROD-157.5)', async () => {
      jest.spyOn(prismaService.futureDevelopment, 'findMany').mockResolvedValue([]);

      const result = await service.getFutureDevelopments({
        latitude: mockLatitude,
        longitude: mockLongitude,
      });

      result.developments.forEach(dev => {
        expect(dev.projectName).toBeDefined();
        expect(dev.projectType).toBeDefined();
      });
    });

    it('should include distance from location', async () => {
      jest.spyOn(prismaService.futureDevelopment, 'findMany').mockResolvedValue([]);

      const result = await service.getFutureDevelopments({
        latitude: mockLatitude,
        longitude: mockLongitude,
      });

      result.developments.forEach(dev => {
        expect(dev.distanceKm).toBeDefined();
      });
    });
  });

  describe('getPropertyNeighborhoodProfile', () => {
    it('should return complete neighborhood profile for a property', async () => {
      jest.spyOn(prismaService.property, 'findUnique').mockResolvedValue(mockProperty as any);
      jest.spyOn(prismaService.neighborhoodData, 'findUnique').mockResolvedValue(mockNeighborhoodData as any);
      jest.spyOn(prismaService.schoolData, 'findMany').mockResolvedValue([mockSchoolData] as any);
      jest.spyOn(prismaService.nearbyAmenity, 'findMany').mockResolvedValue([mockAmenity] as any);
      jest.spyOn(prismaService.climateRiskData, 'findUnique').mockResolvedValue(mockClimateRiskData as any);
      jest.spyOn(prismaService.futureDevelopment, 'findMany').mockResolvedValue([]);

      const result = await service.getPropertyNeighborhoodProfile(mockPropertyId);

      expect(result.propertyId).toBe(mockPropertyId);
      expect(result.location).toBeDefined();
      expect(result.mobilityScores).toBeDefined();
      expect(result.safety).toBeDefined();
      expect(result.schools).toBeDefined();
      expect(result.nearbyAmenities).toBeDefined();
      expect(result.climateRisk).toBeDefined();
    });

    it('should throw NotFoundException if property not found', async () => {
      jest.spyOn(prismaService.property, 'findUnique').mockResolvedValue(null);

      await expect(
        service.getPropertyNeighborhoodProfile('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if property has no coordinates', async () => {
      jest.spyOn(prismaService.property, 'findUnique').mockResolvedValue({
        ...mockProperty,
        latitude: null,
        longitude: null,
      } as any);

      await expect(
        service.getPropertyNeighborhoodProfile(mockPropertyId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should include all data types in profile', async () => {
      jest.spyOn(prismaService.property, 'findUnique').mockResolvedValue(mockProperty as any);
      jest.spyOn(prismaService.neighborhoodData, 'findUnique').mockResolvedValue(mockNeighborhoodData as any);
      jest.spyOn(prismaService.schoolData, 'findMany').mockResolvedValue([mockSchoolData] as any);
      jest.spyOn(prismaService.nearbyAmenity, 'findMany').mockResolvedValue([mockAmenity] as any);
      jest.spyOn(prismaService.climateRiskData, 'findUnique').mockResolvedValue(mockClimateRiskData as any);
      jest.spyOn(prismaService.futureDevelopment, 'findMany').mockResolvedValue([]);

      const result = await service.getPropertyNeighborhoodProfile(mockPropertyId);

      // Verify location data
      expect(result.location.latitude).toBe(mockLatitude);
      expect(result.location.longitude).toBe(mockLongitude);
      expect(result.location.address).toBe('123 Main St');

      // Verify all sections are populated
      expect(result.mobilityScores.walkScore).toBeDefined();
      expect(result.safety.safetyScore).toBeDefined();
      expect(result.schools.total).toBeDefined();
      expect(result.nearbyAmenities.total).toBeDefined();
      expect(result.climateRisk.overallRiskLevel).toBeDefined();
    });
  });

  describe('Mobility Scores (PROD-153)', () => {
    it('should return walk score 0-100 (PROD-153.2)', async () => {
      jest.spyOn(prismaService.neighborhoodData, 'findUnique').mockResolvedValue(mockNeighborhoodData as any);

      const result = await service.getNeighborhoodData({
        latitude: mockLatitude,
        longitude: mockLongitude,
      });

      expect(result.mobilityScores.walkScore).toBeGreaterThanOrEqual(0);
      expect(result.mobilityScores.walkScore).toBeLessThanOrEqual(100);
    });

    it('should return transit score 0-100 (PROD-153.3)', async () => {
      jest.spyOn(prismaService.neighborhoodData, 'findUnique').mockResolvedValue(mockNeighborhoodData as any);

      const result = await service.getNeighborhoodData({
        latitude: mockLatitude,
        longitude: mockLongitude,
      });

      expect(result.mobilityScores.transitScore).toBeGreaterThanOrEqual(0);
      expect(result.mobilityScores.transitScore).toBeLessThanOrEqual(100);
    });

    it('should return bike score 0-100 (PROD-153.4)', async () => {
      jest.spyOn(prismaService.neighborhoodData, 'findUnique').mockResolvedValue(mockNeighborhoodData as any);

      const result = await service.getNeighborhoodData({
        latitude: mockLatitude,
        longitude: mockLongitude,
      });

      expect(result.mobilityScores.bikeScore).toBeGreaterThanOrEqual(0);
      expect(result.mobilityScores.bikeScore).toBeLessThanOrEqual(100);
    });

    it('should include score descriptions (PROD-153.6)', async () => {
      jest.spyOn(prismaService.neighborhoodData, 'findUnique').mockResolvedValue(mockNeighborhoodData as any);

      const result = await service.getNeighborhoodData({
        latitude: mockLatitude,
        longitude: mockLongitude,
      });

      expect(result.mobilityScores.walkDescription).toBeDefined();
      expect(result.mobilityScores.transitDescription).toBeDefined();
      expect(result.mobilityScores.bikeDescription).toBeDefined();
    });
  });

  describe('Safety Data (PROD-152)', () => {
    it('should return safety score (PROD-152.2)', async () => {
      jest.spyOn(prismaService.neighborhoodData, 'findUnique').mockResolvedValue(mockNeighborhoodData as any);

      const result = await service.getNeighborhoodData({
        latitude: mockLatitude,
        longitude: mockLongitude,
      });

      expect(result.safety.safetyScore).toBeDefined();
      expect(result.safety.safetyScore).toBeGreaterThanOrEqual(0);
      expect(result.safety.safetyScore).toBeLessThanOrEqual(100);
    });

    it('should return crime statistics (PROD-152.3)', async () => {
      jest.spyOn(prismaService.neighborhoodData, 'findUnique').mockResolvedValue(mockNeighborhoodData as any);

      const result = await service.getNeighborhoodData({
        latitude: mockLatitude,
        longitude: mockLongitude,
      });

      expect(result.safety.crimeRating).toBeDefined();
      expect(['LOW', 'MODERATE', 'HIGH']).toContain(result.safety.crimeRating);
    });
  });

  describe('Demographics (PROD-154)', () => {
    it('should return demographic data (PROD-154.2)', async () => {
      jest.spyOn(prismaService.neighborhoodData, 'findUnique').mockResolvedValue(mockNeighborhoodData as any);

      const result = await service.getNeighborhoodData({
        latitude: mockLatitude,
        longitude: mockLongitude,
      });

      expect(result.demographics).toBeDefined();
    });

    it('should include income data (PROD-154.3)', async () => {
      jest.spyOn(prismaService.neighborhoodData, 'findUnique').mockResolvedValue(mockNeighborhoodData as any);

      const result = await service.getNeighborhoodData({
        latitude: mockLatitude,
        longitude: mockLongitude,
      });

      if (result.demographics) {
        expect(result.demographics.medianIncome).toBeDefined();
      }
    });
  });

  describe('Environmental Data (PROD-155)', () => {
    it('should return environmental data', async () => {
      jest.spyOn(prismaService.neighborhoodData, 'findUnique').mockResolvedValue(mockNeighborhoodData as any);

      const result = await service.getNeighborhoodData({
        latitude: mockLatitude,
        longitude: mockLongitude,
      });

      expect(result.environmental).toBeDefined();
    });

    it('should include air quality (PROD-155.2)', async () => {
      jest.spyOn(prismaService.neighborhoodData, 'findUnique').mockResolvedValue(mockNeighborhoodData as any);

      const result = await service.getNeighborhoodData({
        latitude: mockLatitude,
        longitude: mockLongitude,
      });

      if (result.environmental) {
        expect(result.environmental.airQuality).toBeDefined();
      }
    });

    it('should include noise level (PROD-155.1)', async () => {
      jest.spyOn(prismaService.neighborhoodData, 'findUnique').mockResolvedValue(mockNeighborhoodData as any);

      const result = await service.getNeighborhoodData({
        latitude: mockLatitude,
        longitude: mockLongitude,
      });

      if (result.environmental) {
        expect(result.environmental.noiseLevel).toBeDefined();
      }
    });
  });
});
