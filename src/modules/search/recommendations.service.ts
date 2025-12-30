import { Injectable } from '@nestjs/common';
import { PropertyStatus, ListingType, Prisma } from '@prisma/client';
import { PrismaService } from '@/database';
import { BrowsingHistoryService } from './browsing-history.service';
import {
  RecommendationQueryDto,
  SimilarPropertiesQueryDto,
  RecommendationResponseDto,
  SimilarPropertyResponseDto,
  RecommendationFeedbackResponseDto,
  UserPreferencesDto,
  PropertySummaryDto,
} from './dto/recommendations.dto';
import { SearchCriteriaDto } from './dto/search-agent.dto';

interface PropertyData {
  id: string;
  title: string;
  city: string;
  country: string;
  listingTypes: ListingType[];
  basePrice: Prisma.Decimal;
  currency: string;
  squareMeters: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  status: PropertyStatus;
  petFriendly: boolean;
  newlyBuilt: boolean;
  accessible: boolean;
  media: Array<{ url: string }>;
  _count?: { favoritedBy?: number };
}

@Injectable()
export class RecommendationsService {
  // Scoring weights
  private readonly PREFERENCE_WEIGHT = 0.4;
  private readonly SIMILARITY_WEIGHT = 0.4;
  private readonly POPULARITY_WEIGHT = 0.2;

  // Similarity component weights
  private readonly LOCATION_WEIGHT = 0.25;
  private readonly PRICE_WEIGHT = 0.25;
  private readonly SIZE_WEIGHT = 0.2;
  private readonly BEDROOMS_WEIGHT = 0.15;
  private readonly FEATURES_WEIGHT = 0.15;

  constructor(
    private prisma: PrismaService,
    private browsingHistoryService: BrowsingHistoryService,
  ) {}

  /**
   * Get personalized property recommendations for a user
   */
  async getRecommendations(
    userId: string,
    query: RecommendationQueryDto,
  ): Promise<RecommendationResponseDto[]> {
    const limit = query.limit || 20;
    const minConfidence = query.minConfidence || 0;

    // Extract user preferences
    const preferences = await this.extractPreferences(userId);

    // Get recently viewed properties (to avoid recommending)
    const recentPropertyIds = await this.browsingHistoryService.getRecentPropertyIds(userId, 30);

    // Get user's favorites (to exclude from recommendations)
    const favoriteIds = await this.getFavoriteIds(userId);

    // Get properties with view stats (for similarity calculation)
    const viewedWithStats = await this.browsingHistoryService.getViewedPropertiesWithStats(userId, 30);

    // Get candidate properties
    const excludeIds = [...new Set([...recentPropertyIds, ...favoriteIds])];
    const candidates = await this.getCandidateProperties(query.listingType, excludeIds, limit * 3);

    // Score each candidate
    const scoredCandidates: Array<{
      property: PropertyData;
      preferenceScore: number;
      similarityScore: number;
      popularityScore: number;
      totalScore: number;
      explanation: string;
      matchedCriteria: string[];
      confidence: number;
    }> = [];

    for (const property of candidates) {
      const preferenceScore = this.calculatePreferenceScore(property, preferences);
      const similarityScore = this.calculateAverageSimilarity(property, viewedWithStats);
      const popularityScore = this.calculatePopularityScore(property);

      const totalScore =
        preferenceScore * this.PREFERENCE_WEIGHT +
        similarityScore * this.SIMILARITY_WEIGHT +
        popularityScore * this.POPULARITY_WEIGHT;

      const { explanation, matchedCriteria } = this.generateExplanation(
        property,
        preferences,
        viewedWithStats,
      );

      const confidence = this.calculateConfidence(preferences, viewedWithStats.length);

      if (confidence >= minConfidence) {
        scoredCandidates.push({
          property,
          preferenceScore,
          similarityScore,
          popularityScore,
          totalScore,
          explanation,
          matchedCriteria,
          confidence,
        });
      }
    }

    // Sort by score and take top N
    scoredCandidates.sort((a, b) => b.totalScore - a.totalScore);
    const topCandidates = scoredCandidates.slice(0, limit);

    // Check for negative feedback and exclude those properties
    const feedbackExclusions = await this.getNegativeFeedbackPropertyIds(userId);

    return topCandidates
      .filter((c) => !feedbackExclusions.includes(c.property.id))
      .map((c) => ({
        property: this.mapToPropertySummary(c.property),
        score: c.totalScore,
        explanation: c.explanation,
        matchedCriteria: c.matchedCriteria,
        confidence: c.confidence,
      }));
  }

  /**
   * Get properties similar to a specific property
   */
  async getSimilarProperties(
    propertyId: string,
    query: SimilarPropertiesQueryDto,
  ): Promise<SimilarPropertyResponseDto[]> {
    const limit = query.limit || 10;

    // Get the source property
    const sourceProperty = await this.prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        media: {
          where: { isPrimary: true },
          take: 1,
        },
      },
    });

    if (!sourceProperty || sourceProperty.status === PropertyStatus.DELETED) {
      return [];
    }

    // Get candidate properties (same listing type, exclude source)
    const candidates = await this.prisma.property.findMany({
      where: {
        id: { not: propertyId },
        status: PropertyStatus.ACTIVE,
        listingTypes: { hasSome: sourceProperty.listingTypes },
      },
      include: {
        media: {
          where: { isPrimary: true },
          take: 1,
        },
      },
      take: limit * 5,
    });

    // Calculate similarity for each
    const similarCandidates = candidates.map((candidate) => {
      const { similarity, sharedAttributes } = this.calculateDetailedSimilarity(
        sourceProperty,
        candidate,
      );
      return {
        property: candidate,
        similarity,
        sharedAttributes,
      };
    });

    // Sort by similarity and return top N
    similarCandidates.sort((a, b) => b.similarity - a.similarity);

    return similarCandidates.slice(0, limit).map((c) => ({
      property: this.mapToPropertySummary(c.property),
      similarity: c.similarity,
      sharedAttributes: c.sharedAttributes,
    }));
  }

  /**
   * Submit feedback for a recommendation
   */
  async submitFeedback(
    userId: string,
    propertyId: string,
    isPositive: boolean,
  ): Promise<RecommendationFeedbackResponseDto> {
    const feedback = await this.prisma.recommendationFeedback.upsert({
      where: {
        userId_propertyId: {
          userId,
          propertyId,
        },
      },
      update: {
        isPositive,
      },
      create: {
        userId,
        propertyId,
        isPositive,
      },
    });

    return {
      id: feedback.id,
      propertyId: feedback.propertyId,
      isPositive: feedback.isPositive,
      createdAt: feedback.createdAt,
    };
  }

  /**
   * Get the user's current preferences based on their activity
   */
  async getUserPreferences(userId: string): Promise<UserPreferencesDto> {
    return this.extractPreferences(userId);
  }

  /**
   * Extract user preferences from favorites and search agents
   */
  private async extractPreferences(userId: string): Promise<UserPreferencesDto> {
    // Get favorites with property details
    const favorites = await this.prisma.favoriteProperty.findMany({
      where: { userId },
      include: {
        property: {
          select: {
            city: true,
            country: true,
            listingTypes: true,
            basePrice: true,
            currency: true,
            squareMeters: true,
            bedrooms: true,
            petFriendly: true,
            newlyBuilt: true,
            accessible: true,
          },
        },
      },
    });

    // Get active search agents
    const searchAgents = await this.prisma.searchAgent.findMany({
      where: { userId, isActive: true },
    });

    const cities: string[] = [];
    const countries: string[] = [];
    const prices: number[] = [];
    const currencies: string[] = [];
    const sizes: number[] = [];
    const bedroomCounts: number[] = [];
    const listingTypesSet = new Set<ListingType>();
    const features: string[] = [];

    // Extract from favorites (weight: 0.6)
    for (const fav of favorites) {
      if (fav.property.city) cities.push(fav.property.city);
      if (fav.property.country) countries.push(fav.property.country);
      if (fav.property.basePrice) {
        prices.push(fav.property.basePrice.toNumber());
        currencies.push(fav.property.currency);
      }
      if (fav.property.squareMeters) sizes.push(fav.property.squareMeters);
      if (fav.property.bedrooms) bedroomCounts.push(fav.property.bedrooms);
      fav.property.listingTypes.forEach((t) => listingTypesSet.add(t));

      if (fav.property.petFriendly) features.push('petFriendly');
      if (fav.property.newlyBuilt) features.push('newlyBuilt');
      if (fav.property.accessible) features.push('accessible');
    }

    // Extract from search agents (weight: 0.4)
    for (const agent of searchAgents) {
      const criteria = agent.criteria as SearchCriteriaDto;

      if (criteria.city) cities.push(criteria.city);
      if (criteria.country) countries.push(criteria.country);
      if (criteria.minPrice || criteria.maxPrice) {
        if (criteria.minPrice) prices.push(criteria.minPrice);
        if (criteria.maxPrice) prices.push(criteria.maxPrice);
      }
      if (criteria.minSquareMeters || criteria.maxSquareMeters) {
        if (criteria.minSquareMeters) sizes.push(criteria.minSquareMeters);
        if (criteria.maxSquareMeters) sizes.push(criteria.maxSquareMeters);
      }
      if (criteria.minBedrooms || criteria.maxBedrooms) {
        if (criteria.minBedrooms) bedroomCounts.push(criteria.minBedrooms);
        if (criteria.maxBedrooms) bedroomCounts.push(criteria.maxBedrooms);
      }
      if (criteria.listingTypes) {
        criteria.listingTypes.forEach((t) => listingTypesSet.add(t as ListingType));
      }

      if (criteria.petFriendly) features.push('petFriendly');
      if (criteria.newlyBuilt) features.push('newlyBuilt');
      if (criteria.accessible) features.push('accessible');
    }

    // Calculate aggregated preferences
    const priceRange = prices.length > 0
      ? {
          min: Math.min(...prices),
          max: Math.max(...prices),
          currency: this.mostCommon(currencies) || 'EUR',
        }
      : undefined;

    const locations = cities.length > 0 || countries.length > 0
      ? {
          cities: [...new Set(cities)],
          countries: [...new Set(countries)],
        }
      : undefined;

    const sizeRange = sizes.length > 0
      ? {
          min: Math.min(...sizes),
          max: Math.max(...sizes),
        }
      : undefined;

    const bedrooms = bedroomCounts.length > 0
      ? {
          min: Math.min(...bedroomCounts),
          max: Math.max(...bedroomCounts),
        }
      : undefined;

    const uniqueFeatures = [...new Set(features)];

    return {
      priceRange,
      locations,
      sizeRange,
      bedrooms,
      features: uniqueFeatures.length > 0 ? uniqueFeatures : undefined,
      listingTypes: listingTypesSet.size > 0 ? [...listingTypesSet] : undefined,
      dataPoints: favorites.length + searchAgents.length,
    };
  }

  /**
   * Calculate preference score for a property based on user preferences
   */
  private calculatePreferenceScore(
    property: PropertyData,
    preferences: UserPreferencesDto,
  ): number {
    if (preferences.dataPoints === 0) {
      return 0.5; // Neutral score if no preferences
    }

    let score = 0;
    let weights = 0;

    // Location match
    if (preferences.locations) {
      let locationScore = 0;
      if (preferences.locations.cities.includes(property.city)) {
        locationScore = 1;
      } else if (preferences.locations.countries.includes(property.country)) {
        locationScore = 0.5;
      }
      score += locationScore * 0.25;
      weights += 0.25;
    }

    // Price range match
    if (preferences.priceRange) {
      const price = property.basePrice.toNumber();
      const inRange =
        price >= preferences.priceRange.min * 0.8 &&
        price <= preferences.priceRange.max * 1.2;
      score += (inRange ? 1 : 0.3) * 0.25;
      weights += 0.25;
    }

    // Size match
    if (preferences.sizeRange && property.squareMeters) {
      const inRange =
        property.squareMeters >= preferences.sizeRange.min * 0.8 &&
        property.squareMeters <= preferences.sizeRange.max * 1.2;
      score += (inRange ? 1 : 0.3) * 0.2;
      weights += 0.2;
    }

    // Bedroom match
    if (preferences.bedrooms && property.bedrooms) {
      const inRange =
        property.bedrooms >= preferences.bedrooms.min &&
        property.bedrooms <= preferences.bedrooms.max + 1;
      score += (inRange ? 1 : 0.3) * 0.15;
      weights += 0.15;
    }

    // Listing type match
    if (preferences.listingTypes && preferences.listingTypes.length > 0) {
      const hasMatch = property.listingTypes.some((t) =>
        preferences.listingTypes!.includes(t),
      );
      score += (hasMatch ? 1 : 0) * 0.1;
      weights += 0.1;
    }

    // Features match
    if (preferences.features && preferences.features.length > 0) {
      let featureMatches = 0;
      if (preferences.features.includes('petFriendly') && property.petFriendly) featureMatches++;
      if (preferences.features.includes('newlyBuilt') && property.newlyBuilt) featureMatches++;
      if (preferences.features.includes('accessible') && property.accessible) featureMatches++;

      const featureScore = featureMatches / preferences.features.length;
      score += featureScore * 0.05;
      weights += 0.05;
    }

    return weights > 0 ? score / weights : 0.5;
  }

  /**
   * Calculate average similarity to viewed properties
   */
  private calculateAverageSimilarity(
    property: PropertyData,
    viewedProperties: Array<{
      property: {
        id: string;
        city: string;
        country: string;
        listingTypes: ListingType[];
        basePrice: string;
        currency: string;
        squareMeters: number | null;
        bedrooms: number | null;
        bathrooms: number | null;
        petFriendly: boolean;
        newlyBuilt: boolean;
        accessible: boolean;
      };
      viewCount: number;
      totalDuration: number;
    }>,
  ): number {
    if (viewedProperties.length === 0) {
      return 0.5; // Neutral score if no history
    }

    let totalSimilarity = 0;
    let totalWeight = 0;

    for (const viewed of viewedProperties) {
      const { similarity } = this.calculateSimilarityToViewed(property, viewed.property);

      // Weight by engagement (view count and duration)
      const engagementWeight = Math.min(
        viewed.viewCount + viewed.totalDuration / 60,
        5,
      ) / 5;

      totalSimilarity += similarity * (1 + engagementWeight);
      totalWeight += 1 + engagementWeight;
    }

    return totalWeight > 0 ? totalSimilarity / totalWeight : 0.5;
  }

  /**
   * Calculate similarity between two properties
   */
  private calculateSimilarityToViewed(
    property: PropertyData,
    viewed: {
      city: string;
      country: string;
      listingTypes: ListingType[];
      basePrice: string;
      squareMeters: number | null;
      bedrooms: number | null;
      petFriendly: boolean;
      newlyBuilt: boolean;
      accessible: boolean;
    },
  ): { similarity: number } {
    let score = 0;

    // Location similarity
    if (property.city === viewed.city) {
      score += 1 * this.LOCATION_WEIGHT;
    } else if (property.country === viewed.country) {
      score += 0.5 * this.LOCATION_WEIGHT;
    }

    // Price similarity (normalized difference)
    const priceA = property.basePrice.toNumber();
    const priceB = parseFloat(viewed.basePrice);
    if (priceA > 0 && priceB > 0) {
      const priceDiff = Math.abs(priceA - priceB) / Math.max(priceA, priceB);
      score += (1 - priceDiff) * this.PRICE_WEIGHT;
    }

    // Size similarity
    if (property.squareMeters && viewed.squareMeters) {
      const sizeDiff =
        Math.abs(property.squareMeters - viewed.squareMeters) /
        Math.max(property.squareMeters, viewed.squareMeters);
      score += (1 - sizeDiff) * this.SIZE_WEIGHT;
    }

    // Bedroom similarity
    if (property.bedrooms !== null && viewed.bedrooms !== null) {
      const bedroomDiff = Math.abs(property.bedrooms - viewed.bedrooms) / 4;
      score += (1 - Math.min(bedroomDiff, 1)) * this.BEDROOMS_WEIGHT;
    }

    // Feature similarity
    let featureMatches = 0;
    let totalFeatures = 0;
    if (property.petFriendly || viewed.petFriendly) {
      totalFeatures++;
      if (property.petFriendly === viewed.petFriendly) featureMatches++;
    }
    if (property.newlyBuilt || viewed.newlyBuilt) {
      totalFeatures++;
      if (property.newlyBuilt === viewed.newlyBuilt) featureMatches++;
    }
    if (property.accessible || viewed.accessible) {
      totalFeatures++;
      if (property.accessible === viewed.accessible) featureMatches++;
    }
    if (totalFeatures > 0) {
      score += (featureMatches / totalFeatures) * this.FEATURES_WEIGHT;
    }

    return { similarity: score };
  }

  /**
   * Calculate detailed similarity with shared attributes
   */
  private calculateDetailedSimilarity(
    sourceProperty: PropertyData,
    candidateProperty: PropertyData,
  ): { similarity: number; sharedAttributes: string[] } {
    let score = 0;
    const sharedAttributes: string[] = [];

    // Location
    if (sourceProperty.city === candidateProperty.city) {
      score += 1 * this.LOCATION_WEIGHT;
      sharedAttributes.push(`Same city: ${sourceProperty.city}`);
    } else if (sourceProperty.country === candidateProperty.country) {
      score += 0.5 * this.LOCATION_WEIGHT;
      sharedAttributes.push(`Same country`);
    }

    // Price
    const priceA = sourceProperty.basePrice.toNumber();
    const priceB = candidateProperty.basePrice.toNumber();
    if (priceA > 0 && priceB > 0) {
      const priceDiff = Math.abs(priceA - priceB) / Math.max(priceA, priceB);
      score += (1 - priceDiff) * this.PRICE_WEIGHT;
      if (priceDiff < 0.2) {
        sharedAttributes.push('Similar price range');
      }
    }

    // Size
    if (sourceProperty.squareMeters && candidateProperty.squareMeters) {
      const sizeDiff =
        Math.abs(sourceProperty.squareMeters - candidateProperty.squareMeters) /
        Math.max(sourceProperty.squareMeters, candidateProperty.squareMeters);
      score += (1 - sizeDiff) * this.SIZE_WEIGHT;
      if (sizeDiff < 0.2) {
        sharedAttributes.push('Similar size');
      }
    }

    // Bedrooms
    if (sourceProperty.bedrooms !== null && candidateProperty.bedrooms !== null) {
      const bedroomDiff = Math.abs(sourceProperty.bedrooms - candidateProperty.bedrooms);
      score += (1 - Math.min(bedroomDiff / 4, 1)) * this.BEDROOMS_WEIGHT;
      if (bedroomDiff === 0) {
        sharedAttributes.push(`${sourceProperty.bedrooms} bedroom${sourceProperty.bedrooms !== 1 ? 's' : ''}`);
      }
    }

    // Features
    let featureMatches = 0;
    let totalFeatures = 0;
    if (sourceProperty.petFriendly && candidateProperty.petFriendly) {
      featureMatches++;
      sharedAttributes.push('Pet-friendly');
    }
    if (sourceProperty.petFriendly || candidateProperty.petFriendly) totalFeatures++;

    if (sourceProperty.newlyBuilt && candidateProperty.newlyBuilt) {
      featureMatches++;
      sharedAttributes.push('Newly built');
    }
    if (sourceProperty.newlyBuilt || candidateProperty.newlyBuilt) totalFeatures++;

    if (sourceProperty.accessible && candidateProperty.accessible) {
      featureMatches++;
      sharedAttributes.push('Accessible');
    }
    if (sourceProperty.accessible || candidateProperty.accessible) totalFeatures++;

    if (totalFeatures > 0) {
      score += (featureMatches / totalFeatures) * this.FEATURES_WEIGHT;
    }

    // Listing type overlap
    const sharedTypes = sourceProperty.listingTypes.filter((t) =>
      candidateProperty.listingTypes.includes(t),
    );
    if (sharedTypes.length > 0) {
      sharedAttributes.push(`${this.formatListingType(sharedTypes[0])}`);
    }

    return { similarity: score, sharedAttributes };
  }

  /**
   * Calculate popularity score based on favorites count
   */
  private calculatePopularityScore(property: PropertyData): number {
    const favoriteCount = property._count?.favoritedBy || 0;
    // Normalize: 0 favorites = 0, 10+ favorites = 1
    return Math.min(favoriteCount / 10, 1);
  }

  /**
   * Calculate confidence based on available preference data
   */
  private calculateConfidence(
    preferences: UserPreferencesDto,
    viewedCount: number,
  ): number {
    // Confidence increases with more data points
    const preferenceConfidence = Math.min(preferences.dataPoints / 5, 1) * 0.5;
    const viewingConfidence = Math.min(viewedCount / 10, 1) * 0.5;
    return preferenceConfidence + viewingConfidence;
  }

  /**
   * Generate explanation and matched criteria for a recommendation
   */
  private generateExplanation(
    property: PropertyData,
    preferences: UserPreferencesDto,
    viewedProperties: Array<{
      property: {
        id: string;
        city: string;
        country: string;
      };
    }>,
  ): { explanation: string; matchedCriteria: string[] } {
    const matchedCriteria: string[] = [];
    const explanationParts: string[] = [];

    // Check location match with preferences
    if (preferences.locations?.cities.includes(property.city)) {
      matchedCriteria.push(property.city);
      explanationParts.push(`matches your preferred location in ${property.city}`);
    }

    // Check if similar to viewed properties
    const viewedCities = viewedProperties.map((v) => v.property.city);
    if (viewedCities.includes(property.city)) {
      explanationParts.push(`similar to properties you viewed in ${property.city}`);
    }

    // Check price range
    if (preferences.priceRange) {
      const price = property.basePrice.toNumber();
      if (price <= preferences.priceRange.max && price >= preferences.priceRange.min) {
        matchedCriteria.push(`Under ${property.currency}${preferences.priceRange.max.toLocaleString()}`);
      }
    }

    // Check bedrooms
    if (preferences.bedrooms && property.bedrooms) {
      if (property.bedrooms >= preferences.bedrooms.min) {
        matchedCriteria.push(`${property.bedrooms}+ bedrooms`);
      }
    }

    // Check listing type
    if (preferences.listingTypes && preferences.listingTypes.length > 0) {
      const matchedType = property.listingTypes.find((t) =>
        preferences.listingTypes!.includes(t),
      );
      if (matchedType) {
        matchedCriteria.push(this.formatListingType(matchedType));
      }
    }

    // Check features
    if (property.petFriendly && preferences.features?.includes('petFriendly')) {
      matchedCriteria.push('Pet-friendly');
    }
    if (property.newlyBuilt && preferences.features?.includes('newlyBuilt')) {
      matchedCriteria.push('Newly built');
    }
    if (property.accessible && preferences.features?.includes('accessible')) {
      matchedCriteria.push('Accessible');
    }

    // Build explanation
    let explanation = '';
    if (explanationParts.length > 0) {
      explanation = explanationParts[0].charAt(0).toUpperCase() + explanationParts[0].slice(1);
    } else if (matchedCriteria.length > 0) {
      explanation = `Matches your preferences: ${matchedCriteria.slice(0, 2).join(', ')}`;
    } else {
      explanation = 'Popular property in your area';
    }

    return { explanation, matchedCriteria };
  }

  /**
   * Get candidate properties for recommendations
   */
  private async getCandidateProperties(
    listingType: ListingType | undefined,
    excludeIds: string[],
    limit: number,
  ): Promise<PropertyData[]> {
    const where: Prisma.PropertyWhereInput = {
      status: PropertyStatus.ACTIVE,
      ...(excludeIds.length > 0 && { id: { notIn: excludeIds } }),
      ...(listingType && { listingTypes: { has: listingType } }),
    };

    return this.prisma.property.findMany({
      where,
      include: {
        media: {
          where: { isPrimary: true },
          take: 1,
        },
        _count: {
          select: { favoritedBy: true },
        },
      },
      orderBy: [
        { favoritedBy: { _count: 'desc' } },
        { createdAt: 'desc' },
      ],
      take: limit,
    });
  }

  /**
   * Get user's favorite property IDs
   */
  private async getFavoriteIds(userId: string): Promise<string[]> {
    const favorites = await this.prisma.favoriteProperty.findMany({
      where: { userId },
      select: { propertyId: true },
    });
    return favorites.map((f) => f.propertyId);
  }

  /**
   * Get property IDs with negative feedback from user
   */
  private async getNegativeFeedbackPropertyIds(userId: string): Promise<string[]> {
    const feedback = await this.prisma.recommendationFeedback.findMany({
      where: { userId, isPositive: false },
      select: { propertyId: true },
    });
    return feedback.map((f) => f.propertyId);
  }

  /**
   * Map property data to summary DTO
   */
  private mapToPropertySummary(property: PropertyData): PropertySummaryDto {
    return {
      id: property.id,
      title: property.title,
      city: property.city,
      country: property.country,
      listingTypes: property.listingTypes,
      basePrice: property.basePrice.toString(),
      currency: property.currency,
      squareMeters: property.squareMeters || undefined,
      bedrooms: property.bedrooms || undefined,
      bathrooms: property.bathrooms || undefined,
      status: property.status,
      primaryImageUrl: property.media[0]?.url,
    };
  }

  /**
   * Format listing type for display
   */
  private formatListingType(type: ListingType): string {
    const formats: Record<ListingType, string> = {
      [ListingType.FOR_SALE]: 'For Sale',
      [ListingType.LONG_TERM_RENT]: 'Long-term Rent',
      [ListingType.SHORT_TERM_RENT]: 'Short-term Rent',
      [ListingType.EVENTS]: 'Events',
      [ListingType.BARTER]: 'Barter',
    };
    return formats[type] || type;
  }

  /**
   * Find most common value in array
   */
  private mostCommon<T>(arr: T[]): T | undefined {
    if (arr.length === 0) return undefined;

    const counts = new Map<T, number>();
    for (const item of arr) {
      counts.set(item, (counts.get(item) || 0) + 1);
    }

    let maxCount = 0;
    let mostCommonItem: T | undefined;
    for (const [item, count] of counts) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonItem = item;
      }
    }

    return mostCommonItem;
  }
}
