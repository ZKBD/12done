import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { AmenityCategory, SchoolLevel, RiskLevel } from '@prisma/client';
import {
  LocationQueryDto,
  GetSchoolsDto,
  GetAmenitiesDto,
  NeighborhoodDataResponseDto,
  SchoolsResponseDto,
  SchoolResponseDto,
  AmenitiesResponseDto,
  AmenityResponseDto,
  ClimateRiskResponseDto,
  WalkabilityResponseDto,
  WalkabilityItemDto,
  FutureDevelopmentsResponseDto,
  PropertyNeighborhoodProfileDto,
  MobilityScoresDto,
  SafetyDataDto,
  DemographicsDto,
  EnvironmentalDataDto,
} from '../dto';

@Injectable()
export class NeighborhoodService {
  private readonly logger = new Logger(NeighborhoodService.name);
  private readonly CACHE_DURATION_HOURS = 24; // Cache for 24 hours
  private readonly DEFAULT_RADIUS_KM = 1.5;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get comprehensive neighborhood data for a location (PROD-150)
   */
  async getNeighborhoodData(dto: LocationQueryDto): Promise<NeighborhoodDataResponseDto> {
    const { latitude, longitude } = dto;

    // Check cache first
    const cached = await this.getCachedNeighborhoodData(latitude, longitude);
    if (cached && new Date(cached.expiresAt) > new Date()) {
      return this.mapNeighborhoodDataToResponse(cached);
    }

    // Fetch fresh data (mock implementation for now)
    const freshData = await this.fetchNeighborhoodData(latitude, longitude);

    // Cache the result
    await this.cacheNeighborhoodData(latitude, longitude, freshData);

    return freshData;
  }

  /**
   * Get nearby schools (PROD-151)
   */
  async getSchools(dto: GetSchoolsDto): Promise<SchoolsResponseDto> {
    const { latitude, longitude, radiusKm = this.DEFAULT_RADIUS_KM, level, minRating } = dto;

    // Check cache
    const cached = await this.getCachedSchools(latitude, longitude, radiusKm);

    let schools: SchoolResponseDto[];
    if (cached.length > 0 && cached[0].expiresAt > new Date()) {
      schools = cached.map(s => this.mapSchoolToResponse(s));
    } else {
      // Fetch and cache fresh data
      schools = await this.fetchAndCacheSchools(latitude, longitude, radiusKm);
    }

    // Apply filters
    if (level) {
      schools = schools.filter(s => s.level === level);
    }
    if (minRating) {
      schools = schools.filter(s => s.rating && s.rating >= minRating);
    }

    // Group by level
    const elementary = schools.filter(s => s.level === SchoolLevel.ELEMENTARY);
    const middle = schools.filter(s => s.level === SchoolLevel.MIDDLE);
    const high = schools.filter(s => s.level === SchoolLevel.HIGH);

    return {
      schools,
      total: schools.length,
      elementary,
      middle,
      high,
    };
  }

  /**
   * Get nearby amenities (PROD-150.3, PROD-158)
   */
  async getAmenities(dto: GetAmenitiesDto): Promise<AmenitiesResponseDto> {
    const { latitude, longitude, radiusKm = this.DEFAULT_RADIUS_KM, category, categories, limit = 5 } = dto;

    const targetCategories = category ? [category] : (categories || Object.values(AmenityCategory));

    // Check cache
    const cached = await this.getCachedAmenities(latitude, longitude, radiusKm);

    let amenities: AmenityResponseDto[];
    if (cached.length > 0 && cached[0].expiresAt > new Date()) {
      amenities = cached.map(a => this.mapAmenityToResponse(a));
    } else {
      // Fetch and cache fresh data
      amenities = await this.fetchAndCacheAmenities(latitude, longitude, radiusKm);
    }

    // Filter by categories
    amenities = amenities.filter(a => targetCategories.includes(a.category));

    // Group by category and limit
    const byCategory: Record<string, AmenityResponseDto[]> = {};
    for (const cat of targetCategories) {
      const catAmenities = amenities
        .filter(a => a.category === cat)
        .slice(0, limit);
      if (catAmenities.length > 0) {
        byCategory[cat] = catAmenities;
      }
    }

    // Flatten for the main array
    const limitedAmenities = Object.values(byCategory).flat();

    return {
      amenities: limitedAmenities,
      total: limitedAmenities.length,
      byCategory,
    };
  }

  /**
   * Get climate risk data (PROD-156)
   */
  async getClimateRisk(dto: LocationQueryDto): Promise<ClimateRiskResponseDto> {
    const { latitude, longitude } = dto;

    // Check cache
    const cached = await this.getCachedClimateRisk(latitude, longitude);
    if (cached && new Date(cached.expiresAt) > new Date()) {
      return this.mapClimateRiskToResponse(cached);
    }

    // Fetch and cache fresh data
    const freshData = await this.fetchAndCacheClimateRisk(latitude, longitude);
    return freshData;
  }

  /**
   * Get walkability data for specific amenity categories (PROD-158)
   */
  async getWalkability(dto: LocationQueryDto & { categories?: AmenityCategory[] }): Promise<WalkabilityResponseDto> {
    const { latitude, longitude, categories = Object.values(AmenityCategory) } = dto;

    const amenitiesDto: GetAmenitiesDto = {
      latitude,
      longitude,
      categories,
      limit: 1, // Just need the nearest of each category
    };

    const amenities = await this.getAmenities(amenitiesDto);

    const items: WalkabilityItemDto[] = [];
    for (const [cat, catAmenities] of Object.entries(amenities.byCategory || {})) {
      if (catAmenities.length > 0) {
        const nearest = catAmenities[0];
        items.push({
          category: cat as AmenityCategory,
          nearestName: nearest.name,
          distanceMeters: nearest.distanceMeters,
          walkingMinutes: nearest.walkingMinutes || Math.round(nearest.distanceMeters / 80), // ~80m/min walking
        });
      }
    }

    const totalWalkingMinutes = items.reduce((sum, item) => sum + item.walkingMinutes, 0);
    const averageWalkingMinutes = items.length > 0 ? Math.round(totalWalkingMinutes / items.length) : 0;
    const within10Minutes = items.filter(item => item.walkingMinutes <= 10).length;

    return {
      items,
      averageWalkingMinutes,
      within10Minutes,
    };
  }

  /**
   * Get future development projects nearby (PROD-157)
   */
  async getFutureDevelopments(dto: LocationQueryDto): Promise<FutureDevelopmentsResponseDto> {
    const { latitude, longitude, radiusKm = 5 } = dto;

    // Check cache
    const cached = await this.prisma.futureDevelopment.findMany({
      where: {
        latitude: { gte: latitude - (radiusKm / 111), lte: latitude + (radiusKm / 111) },
        longitude: { gte: longitude - (radiusKm / (111 * Math.cos(latitude * Math.PI / 180))), lte: longitude + (radiusKm / (111 * Math.cos(latitude * Math.PI / 180))) },
        expiresAt: { gt: new Date() },
      },
      orderBy: { plannedStart: 'asc' },
    });

    if (cached.length > 0) {
      return {
        developments: cached.map(d => ({
          id: d.id,
          projectName: d.projectName,
          projectType: d.projectType,
          description: d.description || undefined,
          developer: d.developer || undefined,
          plannedStart: d.plannedStart || undefined,
          expectedEnd: d.expectedEnd || undefined,
          status: d.status || undefined,
          distanceKm: this.calculateDistance(latitude, longitude, d.latitude, d.longitude),
        })),
        total: cached.length,
      };
    }

    // Return mock data for demo
    return this.getMockFutureDevelopments(latitude, longitude);
  }

  /**
   * Get complete neighborhood profile for a property
   */
  async getPropertyNeighborhoodProfile(propertyId: string): Promise<PropertyNeighborhoodProfileDto> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        address: true,
        city: true,
        country: true,
      },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (!property.latitude || !property.longitude) {
      throw new NotFoundException('Property does not have location coordinates');
    }

    const locationDto: LocationQueryDto = {
      latitude: property.latitude,
      longitude: property.longitude,
    };

    // Fetch all data in parallel
    const [neighborhoodData, schools, amenities, climateRisk, walkability, futureDevelopments] = await Promise.all([
      this.getNeighborhoodData(locationDto),
      this.getSchools({ ...locationDto, radiusKm: 3 }),
      this.getAmenities({ ...locationDto, radiusKm: 1.5 }),
      this.getClimateRisk(locationDto),
      this.getWalkability(locationDto),
      this.getFutureDevelopments({ ...locationDto, radiusKm: 5 }),
    ]);

    return {
      propertyId: property.id,
      location: {
        latitude: property.latitude,
        longitude: property.longitude,
        address: property.address,
        city: property.city,
        state: neighborhoodData.state,
        neighborhood: neighborhoodData.neighborhood,
      },
      mobilityScores: neighborhoodData.mobilityScores,
      safety: neighborhoodData.safety,
      schools,
      nearbyAmenities: amenities,
      climateRisk,
      walkability,
      demographics: neighborhoodData.demographics,
      environmental: neighborhoodData.environmental,
      futureDevelopments,
    };
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private async getCachedNeighborhoodData(lat: number, lng: number) {
    // Round to 4 decimal places for caching (about 11m precision)
    const roundedLat = Math.round(lat * 10000) / 10000;
    const roundedLng = Math.round(lng * 10000) / 10000;

    return this.prisma.neighborhoodData.findUnique({
      where: { latitude_longitude: { latitude: roundedLat, longitude: roundedLng } },
    });
  }

  private async cacheNeighborhoodData(lat: number, lng: number, data: NeighborhoodDataResponseDto) {
    const roundedLat = Math.round(lat * 10000) / 10000;
    const roundedLng = Math.round(lng * 10000) / 10000;
    const expiresAt = new Date(Date.now() + this.CACHE_DURATION_HOURS * 60 * 60 * 1000);

    await this.prisma.neighborhoodData.upsert({
      where: { latitude_longitude: { latitude: roundedLat, longitude: roundedLng } },
      update: {
        walkScore: data.mobilityScores.walkScore,
        transitScore: data.mobilityScores.transitScore,
        bikeScore: data.mobilityScores.bikeScore,
        safetyScore: data.safety.safetyScore,
        crimeRating: data.safety.crimeRating,
        crimeData: {
          violent: data.safety.violentCrimeRate,
          property: data.safety.propertyCrimeRate,
        },
        demographics: data.demographics as unknown as Record<string, unknown>,
        noiseLevel: data.environmental?.noiseLevel,
        airQuality: data.environmental?.airQuality,
        pollenLevel: data.environmental?.pollenLevel,
        neighborhood: data.neighborhood,
        city: data.city,
        state: data.state,
        aiDescription: data.aiDescription,
        expiresAt,
        fetchedAt: new Date(),
      },
      create: {
        latitude: roundedLat,
        longitude: roundedLng,
        walkScore: data.mobilityScores.walkScore,
        transitScore: data.mobilityScores.transitScore,
        bikeScore: data.mobilityScores.bikeScore,
        safetyScore: data.safety.safetyScore,
        crimeRating: data.safety.crimeRating,
        crimeData: {
          violent: data.safety.violentCrimeRate,
          property: data.safety.propertyCrimeRate,
        },
        demographics: data.demographics as unknown as Record<string, unknown>,
        noiseLevel: data.environmental?.noiseLevel,
        airQuality: data.environmental?.airQuality,
        pollenLevel: data.environmental?.pollenLevel,
        neighborhood: data.neighborhood,
        city: data.city,
        state: data.state,
        aiDescription: data.aiDescription,
        expiresAt,
      },
    });
  }

  private mapNeighborhoodDataToResponse(data: any): NeighborhoodDataResponseDto {
    const crimeData = data.crimeData as any;
    return {
      latitude: data.latitude,
      longitude: data.longitude,
      neighborhood: data.neighborhood,
      city: data.city,
      state: data.state,
      aiDescription: data.aiDescription,
      mobilityScores: {
        walkScore: data.walkScore || 0,
        transitScore: data.transitScore || 0,
        bikeScore: data.bikeScore || 0,
        walkDescription: this.getScoreDescription(data.walkScore, 'walk'),
        transitDescription: this.getScoreDescription(data.transitScore, 'transit'),
        bikeDescription: this.getScoreDescription(data.bikeScore, 'bike'),
      },
      safety: {
        safetyScore: data.safetyScore || 50,
        crimeRating: data.crimeRating || 'MODERATE',
        violentCrimeRate: crimeData?.violent,
        propertyCrimeRate: crimeData?.property,
      },
      demographics: data.demographics as DemographicsDto,
      environmental: {
        noiseLevel: data.noiseLevel,
        airQuality: data.airQuality,
        pollenLevel: data.pollenLevel,
      },
    };
  }

  private async fetchNeighborhoodData(lat: number, lng: number): Promise<NeighborhoodDataResponseDto> {
    // Mock implementation - would call Walk Score API, crime APIs, etc.
    this.logger.log(`Fetching neighborhood data for ${lat}, ${lng}`);

    // Generate realistic mock data based on location
    const mockMobilityScores = this.getMockMobilityScores(lat, lng);
    const mockSafety = this.getMockSafetyData(lat, lng);
    const mockDemographics = this.getMockDemographics();
    const mockEnvironmental = this.getMockEnvironmental();

    return {
      latitude: lat,
      longitude: lng,
      neighborhood: 'Downtown',
      city: 'Los Angeles',
      state: 'CA',
      aiDescription: 'A vibrant urban neighborhood with excellent walkability, diverse dining options, and convenient access to public transportation. The area features a mix of modern high-rises and historic buildings, with numerous parks and cultural attractions nearby.',
      mobilityScores: mockMobilityScores,
      safety: mockSafety,
      demographics: mockDemographics,
      environmental: mockEnvironmental,
    };
  }

  private getMockMobilityScores(lat: number, _lng: number): MobilityScoresDto {
    // Simulate higher scores for urban areas (lower latitudes in US)
    const baseScore = Math.min(100, Math.max(20, 100 - Math.abs(lat - 34) * 5));

    return {
      walkScore: Math.round(baseScore + Math.random() * 15),
      transitScore: Math.round(baseScore - 10 + Math.random() * 15),
      bikeScore: Math.round(baseScore - 5 + Math.random() * 15),
      walkDescription: this.getScoreDescription(baseScore, 'walk'),
      transitDescription: this.getScoreDescription(baseScore - 10, 'transit'),
      bikeDescription: this.getScoreDescription(baseScore - 5, 'bike'),
    };
  }

  private getMockSafetyData(_lat: number, _lng: number): SafetyDataDto {
    const safetyScore = Math.round(50 + Math.random() * 40);
    const crimeRating = safetyScore >= 70 ? 'LOW' : safetyScore >= 40 ? 'MODERATE' : 'HIGH';

    return {
      safetyScore,
      crimeRating,
      violentCrimeRate: Math.round((100 - safetyScore) * 0.3 * 10) / 10,
      propertyCrimeRate: Math.round((100 - safetyScore) * 0.7 * 10) / 10,
      comparedToNational: safetyScore >= 60 ? 'Below average crime' : 'Above average crime',
    };
  }

  private getMockDemographics(): DemographicsDto {
    return {
      population: Math.round(15000 + Math.random() * 35000),
      medianAge: Math.round(28 + Math.random() * 15),
      medianIncome: Math.round(45000 + Math.random() * 60000),
      familyPercentage: Math.round(30 + Math.random() * 40),
    };
  }

  private getMockEnvironmental(): EnvironmentalDataDto {
    const aqiValue = Math.round(20 + Math.random() * 80);
    return {
      noiseLevel: Math.random() > 0.6 ? 'LOW' : Math.random() > 0.3 ? 'MODERATE' : 'HIGH',
      airQuality: aqiValue,
      airQualityDescription: aqiValue <= 50 ? 'Good' : aqiValue <= 100 ? 'Moderate' : 'Unhealthy for Sensitive Groups',
      pollenLevel: Math.random() > 0.5 ? 'LOW' : 'MODERATE',
    };
  }

  private getScoreDescription(score: number | null | undefined, type: string): string {
    if (!score) return 'No data available';

    if (type === 'walk') {
      if (score >= 90) return "Walker's Paradise";
      if (score >= 70) return 'Very Walkable';
      if (score >= 50) return 'Somewhat Walkable';
      if (score >= 25) return 'Car-Dependent';
      return 'Almost All Errands Require a Car';
    }
    if (type === 'transit') {
      if (score >= 90) return 'Excellent Transit';
      if (score >= 70) return 'Excellent Transit';
      if (score >= 50) return 'Good Transit';
      if (score >= 25) return 'Some Transit';
      return 'Minimal Transit';
    }
    if (type === 'bike') {
      if (score >= 90) return "Biker's Paradise";
      if (score >= 70) return 'Very Bikeable';
      if (score >= 50) return 'Bikeable';
      return 'Somewhat Bikeable';
    }
    return '';
  }

  private async getCachedSchools(lat: number, lng: number, radiusKm: number) {
    const latDelta = radiusKm / 111;
    const lngDelta = radiusKm / (111 * Math.cos(lat * Math.PI / 180));

    return this.prisma.schoolData.findMany({
      where: {
        latitude: { gte: lat - latDelta, lte: lat + latDelta },
        longitude: { gte: lng - lngDelta, lte: lng + lngDelta },
        expiresAt: { gt: new Date() },
      },
      orderBy: { rating: 'desc' },
    });
  }

  private async fetchAndCacheSchools(lat: number, lng: number, radiusKm: number): Promise<SchoolResponseDto[]> {
    // Mock implementation - would call GreatSchools API
    this.logger.log(`Fetching schools for ${lat}, ${lng} within ${radiusKm}km`);

    const mockSchools = this.getMockSchools(lat, lng);
    const expiresAt = new Date(Date.now() + this.CACHE_DURATION_HOURS * 60 * 60 * 1000);

    // Cache the schools
    for (const school of mockSchools) {
      await this.prisma.schoolData.create({
        data: {
          latitude: lat,
          longitude: lng,
          name: school.name,
          level: school.level,
          rating: school.rating,
          studentCount: school.studentCount,
          address: school.address,
          distanceKm: school.distanceKm,
          walkingMinutes: school.walkingMinutes,
          drivingMinutes: school.drivingMinutes,
          publicPrivate: school.publicPrivate,
          schoolDistrict: school.schoolDistrict,
          grades: school.grades,
          dataSource: 'mock',
          expiresAt,
        },
      });
    }

    return mockSchools;
  }

  private getMockSchools(_lat: number, _lng: number): SchoolResponseDto[] {
    return [
      {
        id: 'school-1',
        name: 'Lincoln Elementary School',
        level: SchoolLevel.ELEMENTARY,
        rating: 8,
        studentCount: 450,
        address: '123 Education Ave',
        distanceKm: 0.5,
        walkingMinutes: 6,
        drivingMinutes: 2,
        publicPrivate: 'PUBLIC',
        schoolDistrict: 'Unified School District',
        grades: 'K-5',
      },
      {
        id: 'school-2',
        name: 'Washington Middle School',
        level: SchoolLevel.MIDDLE,
        rating: 7,
        studentCount: 680,
        address: '456 Learning Blvd',
        distanceKm: 1.2,
        walkingMinutes: 15,
        drivingMinutes: 4,
        publicPrivate: 'PUBLIC',
        schoolDistrict: 'Unified School District',
        grades: '6-8',
      },
      {
        id: 'school-3',
        name: 'Roosevelt High School',
        level: SchoolLevel.HIGH,
        rating: 9,
        studentCount: 1200,
        address: '789 Academic Dr',
        distanceKm: 2.1,
        walkingMinutes: 26,
        drivingMinutes: 6,
        publicPrivate: 'PUBLIC',
        schoolDistrict: 'Unified School District',
        grades: '9-12',
      },
      {
        id: 'school-4',
        name: 'St. Mary\'s Academy',
        level: SchoolLevel.PRIVATE,
        rating: 9,
        studentCount: 320,
        address: '321 Private Lane',
        distanceKm: 1.8,
        walkingMinutes: 22,
        drivingMinutes: 5,
        publicPrivate: 'PRIVATE',
        grades: 'K-12',
      },
    ];
  }

  private mapSchoolToResponse(school: any): SchoolResponseDto {
    return {
      id: school.id,
      name: school.name,
      level: school.level,
      rating: school.rating,
      studentCount: school.studentCount,
      address: school.address,
      distanceKm: school.distanceKm,
      walkingMinutes: school.walkingMinutes,
      drivingMinutes: school.drivingMinutes,
      publicPrivate: school.publicPrivate,
      schoolDistrict: school.schoolDistrict,
      grades: school.grades,
    };
  }

  private async getCachedAmenities(lat: number, lng: number, radiusKm: number) {
    const latDelta = radiusKm / 111;
    const lngDelta = radiusKm / (111 * Math.cos(lat * Math.PI / 180));

    return this.prisma.nearbyAmenity.findMany({
      where: {
        refLatitude: { gte: lat - latDelta, lte: lat + latDelta },
        refLongitude: { gte: lng - lngDelta, lte: lng + lngDelta },
        expiresAt: { gt: new Date() },
      },
      orderBy: { distanceMeters: 'asc' },
    });
  }

  private async fetchAndCacheAmenities(lat: number, lng: number, radiusKm: number): Promise<AmenityResponseDto[]> {
    // Mock implementation - would call Google Places API
    this.logger.log(`Fetching amenities for ${lat}, ${lng} within ${radiusKm}km`);

    const mockAmenities = this.getMockAmenities(lat, lng);
    const expiresAt = new Date(Date.now() + this.CACHE_DURATION_HOURS * 60 * 60 * 1000);

    // Cache the amenities
    for (const amenity of mockAmenities) {
      await this.prisma.nearbyAmenity.create({
        data: {
          refLatitude: lat,
          refLongitude: lng,
          category: amenity.category,
          name: amenity.name,
          address: amenity.address,
          latitude: lat + (Math.random() - 0.5) * 0.01,
          longitude: lng + (Math.random() - 0.5) * 0.01,
          distanceMeters: amenity.distanceMeters,
          walkingMinutes: amenity.walkingMinutes,
          drivingMinutes: amenity.drivingMinutes,
          rating: amenity.rating,
          priceLevel: amenity.priceLevel,
          isOpenNow: amenity.isOpenNow,
          expiresAt,
        },
      });
    }

    return mockAmenities;
  }

  private getMockAmenities(_lat: number, _lng: number): AmenityResponseDto[] {
    return [
      { id: 'a1', category: AmenityCategory.GROCERY, name: 'Whole Foods Market', address: '100 Market St', distanceMeters: 350, walkingMinutes: 4, drivingMinutes: 1, rating: 4.5, priceLevel: 3, isOpenNow: true },
      { id: 'a2', category: AmenityCategory.GROCERY, name: 'Trader Joe\'s', address: '200 Food Ave', distanceMeters: 600, walkingMinutes: 8, drivingMinutes: 2, rating: 4.7, priceLevel: 2, isOpenNow: true },
      { id: 'a3', category: AmenityCategory.COFFEE, name: 'Starbucks', address: '50 Coffee Lane', distanceMeters: 150, walkingMinutes: 2, drivingMinutes: 1, rating: 4.2, priceLevel: 2, isOpenNow: true },
      { id: 'a4', category: AmenityCategory.COFFEE, name: 'Blue Bottle Coffee', address: '75 Brew St', distanceMeters: 280, walkingMinutes: 4, drivingMinutes: 1, rating: 4.6, priceLevel: 3, isOpenNow: true },
      { id: 'a5', category: AmenityCategory.RESTAURANT, name: 'The Local Bistro', address: '300 Dining Rd', distanceMeters: 420, walkingMinutes: 5, drivingMinutes: 2, rating: 4.4, priceLevel: 3, isOpenNow: true },
      { id: 'a6', category: AmenityCategory.FITNESS, name: 'LA Fitness', address: '500 Health Way', distanceMeters: 800, walkingMinutes: 10, drivingMinutes: 3, rating: 4.1, priceLevel: 2, isOpenNow: true },
      { id: 'a7', category: AmenityCategory.PARK, name: 'Central Park', address: '1 Park Ave', distanceMeters: 200, walkingMinutes: 3, drivingMinutes: 1, rating: 4.8, isOpenNow: true },
      { id: 'a8', category: AmenityCategory.PHARMACY, name: 'CVS Pharmacy', address: '150 Health St', distanceMeters: 320, walkingMinutes: 4, drivingMinutes: 1, rating: 4.0, priceLevel: 2, isOpenNow: true },
      { id: 'a9', category: AmenityCategory.BANK, name: 'Chase Bank', address: '250 Finance Blvd', distanceMeters: 450, walkingMinutes: 6, drivingMinutes: 2, rating: 3.9, isOpenNow: false },
      { id: 'a10', category: AmenityCategory.TRANSIT, name: 'Metro Station', address: '10 Transit Way', distanceMeters: 180, walkingMinutes: 2, drivingMinutes: 1, rating: 4.3, isOpenNow: true },
    ];
  }

  private mapAmenityToResponse(amenity: any): AmenityResponseDto {
    return {
      id: amenity.id,
      category: amenity.category,
      name: amenity.name,
      address: amenity.address,
      distanceMeters: amenity.distanceMeters,
      walkingMinutes: amenity.walkingMinutes,
      drivingMinutes: amenity.drivingMinutes,
      rating: amenity.rating,
      priceLevel: amenity.priceLevel,
      isOpenNow: amenity.isOpenNow,
      photoUrl: amenity.photoUrl,
    };
  }

  private async getCachedClimateRisk(lat: number, lng: number) {
    const roundedLat = Math.round(lat * 1000) / 1000;
    const roundedLng = Math.round(lng * 1000) / 1000;

    return this.prisma.climateRiskData.findUnique({
      where: { latitude_longitude: { latitude: roundedLat, longitude: roundedLng } },
    });
  }

  private async fetchAndCacheClimateRisk(lat: number, lng: number): Promise<ClimateRiskResponseDto> {
    // Mock implementation - would call FEMA, USGS APIs
    this.logger.log(`Fetching climate risk for ${lat}, ${lng}`);

    const mockRisk = this.getMockClimateRisk(lat, lng);
    const expiresAt = new Date(Date.now() + this.CACHE_DURATION_HOURS * 24 * 60 * 60 * 1000); // Cache longer for climate data

    const roundedLat = Math.round(lat * 1000) / 1000;
    const roundedLng = Math.round(lng * 1000) / 1000;

    await this.prisma.climateRiskData.upsert({
      where: { latitude_longitude: { latitude: roundedLat, longitude: roundedLng } },
      update: {
        floodRisk: mockRisk.flood.level,
        floodZone: mockRisk.flood.zone,
        fireRisk: mockRisk.fire.level,
        earthquakeRisk: mockRisk.earthquake.level,
        hurricaneRisk: mockRisk.hurricane.level,
        tornadoRisk: mockRisk.tornado.level,
        overallRiskScore: mockRisk.overallRiskScore,
        overallRiskLevel: mockRisk.overallRiskLevel,
        floodInsuranceRequired: mockRisk.flood.insuranceRequired,
        insuranceNotes: mockRisk.insuranceNotes,
        expiresAt,
        fetchedAt: new Date(),
      },
      create: {
        latitude: roundedLat,
        longitude: roundedLng,
        floodRisk: mockRisk.flood.level,
        floodZone: mockRisk.flood.zone,
        fireRisk: mockRisk.fire.level,
        earthquakeRisk: mockRisk.earthquake.level,
        hurricaneRisk: mockRisk.hurricane.level,
        tornadoRisk: mockRisk.tornado.level,
        overallRiskScore: mockRisk.overallRiskScore,
        overallRiskLevel: mockRisk.overallRiskLevel,
        floodInsuranceRequired: mockRisk.flood.insuranceRequired,
        insuranceNotes: mockRisk.insuranceNotes,
        expiresAt,
      },
    });

    return mockRisk;
  }

  private getMockClimateRisk(lat: number, lng: number): ClimateRiskResponseDto {
    // Simulate different risks based on location
    const isCoastal = Math.abs(lng) > 100; // Rough approximation
    const isSouthern = lat < 35;

    return {
      latitude: lat,
      longitude: lng,
      overallRiskLevel: RiskLevel.LOW,
      overallRiskScore: 25,
      flood: {
        level: isCoastal ? RiskLevel.MODERATE : RiskLevel.LOW,
        zone: isCoastal ? 'X' : 'X',
        insuranceRequired: false,
      },
      fire: {
        level: isSouthern ? RiskLevel.MODERATE : RiskLevel.LOW,
      },
      earthquake: {
        level: lng < -115 ? RiskLevel.MODERATE : RiskLevel.MINIMAL, // California region
      },
      hurricane: {
        level: isSouthern && isCoastal ? RiskLevel.MODERATE : RiskLevel.MINIMAL,
      },
      tornado: {
        level: RiskLevel.MINIMAL,
      },
      historicalEvents: [
        { type: 'Flood', date: '2019-03', severity: 'Minor', description: 'Flash flooding from heavy rain' },
      ],
      insuranceNotes: 'Standard homeowner\'s insurance should provide adequate coverage for this area.',
    };
  }

  private mapClimateRiskToResponse(data: any): ClimateRiskResponseDto {
    return {
      latitude: data.latitude,
      longitude: data.longitude,
      overallRiskLevel: data.overallRiskLevel,
      overallRiskScore: data.overallRiskScore,
      flood: {
        level: data.floodRisk,
        zone: data.floodZone,
        insuranceRequired: data.floodInsuranceRequired,
      },
      fire: { level: data.fireRisk },
      earthquake: { level: data.earthquakeRisk },
      hurricane: { level: data.hurricaneRisk },
      tornado: { level: data.tornadoRisk },
      historicalEvents: data.historicalEvents,
      insuranceNotes: data.insuranceNotes,
    };
  }

  private getMockFutureDevelopments(_lat: number, _lng: number): FutureDevelopmentsResponseDto {
    return {
      developments: [
        {
          id: 'dev-1',
          projectName: 'Metro Line Extension',
          projectType: 'TRANSIT',
          description: 'New metro station connecting downtown to suburbs',
          developer: 'City Transit Authority',
          plannedStart: new Date('2025-06-01'),
          expectedEnd: new Date('2028-12-01'),
          status: 'APPROVED',
          distanceKm: 1.2,
        },
        {
          id: 'dev-2',
          projectName: 'Central Plaza Mixed-Use',
          projectType: 'COMMERCIAL',
          description: 'Mixed-use development with retail, office, and residential units',
          developer: 'Urban Development Corp',
          plannedStart: new Date('2025-03-01'),
          expectedEnd: new Date('2027-06-01'),
          status: 'IN_PROGRESS',
          distanceKm: 0.8,
        },
      ],
      total: 2,
    };
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
