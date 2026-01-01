import { Injectable, Logger } from '@nestjs/common';
import { ListingType } from '@prisma/client';
import {
  VoiceSearchResponseDto,
  ParsedSearchCriteria,
  ParsedField,
} from './dto';

/**
 * VoiceSearchService (PROD-044)
 *
 * Parses natural language voice transcripts into structured property search criteria.
 * Uses rule-based keyword matching with confidence scoring.
 */
@Injectable()
export class VoiceSearchService {
  private readonly logger = new Logger(VoiceSearchService.name);

  // Listing type keywords
  private readonly listingTypeKeywords: Record<ListingType, string[]> = {
    [ListingType.FOR_SALE]: [
      'buy',
      'purchase',
      'for sale',
      'selling',
      'to buy',
      'buying',
      'own',
      'ownership',
    ],
    [ListingType.SHORT_TERM_RENT]: [
      'short term',
      'vacation',
      'holiday',
      'airbnb',
      'weekly',
      'weekend',
      'getaway',
      'temporary',
      'short stay',
    ],
    [ListingType.LONG_TERM_RENT]: [
      'rent',
      'rental',
      'lease',
      'leasing',
      'monthly',
      'long term',
      'to rent',
      'renting',
      'tenant',
    ],
    [ListingType.EVENTS]: [
      'event',
      'party',
      'wedding',
      'conference',
      'meeting',
      'venue',
      'celebration',
      'gathering',
    ],
    [ListingType.BARTER]: [
      'barter',
      'exchange',
      'swap',
      'trade',
      'trading',
    ],
  };

  // Feature keywords
  private readonly featureKeywords = {
    petFriendly: [
      'pet friendly',
      'pet-friendly',
      'pets allowed',
      'pets welcome',
      'dog friendly',
      'cat friendly',
      'animals allowed',
      'with pets',
    ],
    newlyBuilt: [
      'new build',
      'newly built',
      'brand new',
      'new construction',
      'just built',
      'modern build',
      'new development',
      'recently built',
    ],
    accessible: [
      'accessible',
      'wheelchair',
      'disability',
      'handicap',
      'mobility',
      'barrier free',
      'disabled access',
      'step free',
    ],
  };

  // Common city names for extraction (can be expanded)
  private readonly knownCities = [
    'budapest',
    'london',
    'paris',
    'berlin',
    'amsterdam',
    'vienna',
    'prague',
    'rome',
    'madrid',
    'barcelona',
    'lisbon',
    'dublin',
    'manchester',
    'birmingham',
    'leeds',
    'glasgow',
    'edinburgh',
    'liverpool',
    'new york',
    'los angeles',
    'chicago',
    'miami',
    'san francisco',
    'seattle',
    'boston',
    'denver',
    'austin',
    'portland',
    'debrecen',
    'szeged',
    'pecs',
    'miskolc',
    'gyor',
  ];

  // Country keywords
  private readonly countryKeywords: Record<string, string[]> = {
    HU: ['hungary', 'hungarian'],
    UK: ['uk', 'united kingdom', 'britain', 'british', 'england', 'english'],
    US: ['usa', 'united states', 'america', 'american'],
    DE: ['germany', 'german', 'deutschland'],
    FR: ['france', 'french'],
    ES: ['spain', 'spanish'],
    IT: ['italy', 'italian'],
    NL: ['netherlands', 'dutch', 'holland'],
    AT: ['austria', 'austrian'],
    CZ: ['czech', 'czechia'],
    PT: ['portugal', 'portuguese'],
    IE: ['ireland', 'irish'],
  };

  // Words to remove for normalization
  private readonly stopWords = [
    'i',
    'im',
    "i'm",
    'am',
    'looking',
    'for',
    'a',
    'an',
    'the',
    'some',
    'any',
    'please',
    'find',
    'me',
    'show',
    'search',
    'want',
    'need',
    'would',
    'like',
    'to',
    'get',
    'see',
    'can',
    'you',
    'help',
    'with',
    'property',
    'properties',
    'place',
    'places',
    'home',
    'homes',
  ];

  /**
   * Parse a voice transcript into structured search criteria
   */
  parse(transcript: string): VoiceSearchResponseDto {
    const originalText = transcript;
    const normalizedText = this.normalizeText(transcript);

    this.logger.debug(`Parsing voice search: "${originalText}"`);
    this.logger.debug(`Normalized text: "${normalizedText}"`);

    const parsedCriteria: ParsedSearchCriteria = {};

    // Extract all criteria
    this.extractListingTypes(normalizedText, parsedCriteria);
    this.extractCity(normalizedText, parsedCriteria);
    this.extractCountry(normalizedText, parsedCriteria);
    this.extractPrice(normalizedText, parsedCriteria);
    this.extractBedrooms(normalizedText, parsedCriteria);
    this.extractBathrooms(normalizedText, parsedCriteria);
    this.extractSquareMeters(normalizedText, parsedCriteria);
    this.extractYearBuilt(normalizedText, parsedCriteria);
    this.extractFeatures(normalizedText, parsedCriteria);

    // Calculate overall confidence
    const fields = Object.values(parsedCriteria).filter(Boolean) as ParsedField<unknown>[];
    const fieldCount = fields.length;
    const confidence =
      fieldCount > 0
        ? fields.reduce((sum, f) => sum + f.confidence, 0) / fieldCount
        : 0;

    // Generate human-readable display text
    const suggestedDisplayText = this.generateDisplayText(parsedCriteria);

    return {
      originalText,
      normalizedText,
      parsedCriteria,
      confidence: Math.round(confidence * 100) / 100,
      suggestedDisplayText,
      fieldCount,
    };
  }

  /**
   * Convert parsed criteria to PropertyQueryDto-compatible format
   */
  toPropertyQuery(parsed: VoiceSearchResponseDto): Record<string, unknown> {
    const query: Record<string, unknown> = {};
    const criteria = parsed.parsedCriteria;

    if (criteria.city) query.city = criteria.city.value;
    if (criteria.country) query.country = criteria.country.value;
    if (criteria.listingTypes) query.listingTypes = criteria.listingTypes.value;
    if (criteria.minPrice) query.minPrice = criteria.minPrice.value;
    if (criteria.maxPrice) query.maxPrice = criteria.maxPrice.value;
    if (criteria.minBedrooms) query.minBedrooms = criteria.minBedrooms.value;
    if (criteria.maxBedrooms) query.maxBedrooms = criteria.maxBedrooms.value;
    if (criteria.minBathrooms) query.minBathrooms = criteria.minBathrooms.value;
    if (criteria.minSquareMeters) query.minSquareMeters = criteria.minSquareMeters.value;
    if (criteria.maxSquareMeters) query.maxSquareMeters = criteria.maxSquareMeters.value;
    if (criteria.minYearBuilt) query.minYearBuilt = criteria.minYearBuilt.value;
    if (criteria.maxYearBuilt) query.maxYearBuilt = criteria.maxYearBuilt.value;
    if (criteria.petFriendly) query.petFriendly = criteria.petFriendly.value;
    if (criteria.newlyBuilt) query.newlyBuilt = criteria.newlyBuilt.value;
    if (criteria.accessible) query.accessible = criteria.accessible.value;
    if (criteria.search) query.search = criteria.search.value;

    return query;
  }

  /**
   * Normalize text for parsing
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[.,!?;:'"()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extract listing types from text
   */
  private extractListingTypes(
    text: string,
    criteria: ParsedSearchCriteria,
  ): void {
    const matchedTypes: ListingType[] = [];
    let maxConfidence = 0;
    let matchedText = '';

    for (const [type, keywords] of Object.entries(this.listingTypeKeywords)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          if (!matchedTypes.includes(type as ListingType)) {
            matchedTypes.push(type as ListingType);
          }
          // Higher confidence for more specific keywords
          const confidence = keyword.length > 5 ? 0.9 : 0.75;
          if (confidence > maxConfidence) {
            maxConfidence = confidence;
            matchedText = keyword;
          }
        }
      }
    }

    if (matchedTypes.length > 0) {
      criteria.listingTypes = {
        value: matchedTypes,
        confidence: maxConfidence,
        matchedText,
      };
    }
  }

  // Words that should not be part of a city name
  private readonly cityExcludeWords = [
    'under',
    'over',
    'below',
    'above',
    'between',
    'around',
    'about',
    'near',
    'from',
    'less',
    'more',
    'than',
    'max',
    'min',
    'maximum',
    'minimum',
    // Country names/keywords to exclude
    'usa',
    'uk',
    'hungary',
    'germany',
    'france',
    'spain',
    'italy',
    'netherlands',
    'austria',
    'czech',
    'portugal',
    'ireland',
    'america',
    'britain',
    'england',
  ];

  /**
   * Extract city from text
   */
  private extractCity(text: string, criteria: ParsedSearchCriteria): void {
    // Check for "in [city]" pattern
    const inPattern = /\bin\s+([a-z]+(?:\s+[a-z]+)?)/gi;
    const matches = [...text.matchAll(inPattern)];

    for (const match of matches) {
      let potentialCity = match[1].toLowerCase().trim();

      // Filter out excluded words (stop words, price keywords, country names)
      const words = potentialCity.split(/\s+/);
      const filteredWords = words.filter(
        (word) =>
          !this.stopWords.includes(word) && !this.cityExcludeWords.includes(word),
      );
      potentialCity = filteredWords.join(' ').trim();

      // Skip if nothing left after filtering
      if (!potentialCity || potentialCity.length < 2) {
        continue;
      }

      // Check against known cities
      for (const city of this.knownCities) {
        if (potentialCity.includes(city) || city.includes(potentialCity)) {
          criteria.city = {
            value: this.capitalizeCity(city),
            confidence: 0.95,
            matchedText: match[0],
          };
          return;
        }
      }

      // If not in known cities but follows pattern, still use it with lower confidence
      if (potentialCity.length > 2 && !this.stopWords.includes(potentialCity)) {
        criteria.city = {
          value: this.capitalizeCity(potentialCity),
          confidence: 0.7,
          matchedText: match[0],
        };
        return;
      }
    }

    // Fallback: check if any known city appears in text
    for (const city of this.knownCities) {
      if (text.includes(city)) {
        criteria.city = {
          value: this.capitalizeCity(city),
          confidence: 0.85,
          matchedText: city,
        };
        return;
      }
    }
  }

  /**
   * Extract country from text
   */
  private extractCountry(text: string, criteria: ParsedSearchCriteria): void {
    for (const [code, keywords] of Object.entries(this.countryKeywords)) {
      for (const keyword of keywords) {
        // Use word boundary matching to avoid false positives (e.g., 'usa' in other words)
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        if (regex.test(text)) {
          criteria.country = {
            value: code,
            confidence: 0.9,
            matchedText: keyword,
          };
          return;
        }
      }
    }
  }

  /**
   * Extract price from text
   */
  private extractPrice(text: string, criteria: ParsedSearchCriteria): void {
    // Pattern: "under X", "below X", "less than X"
    const underPattern =
      /(?:under|below|less than|up to|max(?:imum)?)\s*[$€£]?\s*(\d+(?:[.,]\d+)?)\s*(k|thousand|million|m)?/i;
    const underMatch = text.match(underPattern);
    if (underMatch) {
      const value = this.parseNumber(underMatch[1], underMatch[2]);
      if (value) {
        criteria.maxPrice = {
          value,
          confidence: 0.85,
          matchedText: underMatch[0],
        };
      }
    }

    // Pattern: "over X", "above X", "more than X", "at least X"
    const overPattern =
      /(?:over|above|more than|at least|min(?:imum)?|from)\s*[$€£]?\s*(\d+(?:[.,]\d+)?)\s*(k|thousand|million|m)?/i;
    const overMatch = text.match(overPattern);
    if (overMatch) {
      const value = this.parseNumber(overMatch[1], overMatch[2]);
      if (value) {
        criteria.minPrice = {
          value,
          confidence: 0.85,
          matchedText: overMatch[0],
        };
      }
    }

    // Pattern: "between X and Y"
    const betweenPattern =
      /between\s*[$€£]?\s*(\d+(?:[.,]\d+)?)\s*(k|thousand|million|m)?\s*(?:and|to|-)\s*[$€£]?\s*(\d+(?:[.,]\d+)?)\s*(k|thousand|million|m)?/i;
    const betweenMatch = text.match(betweenPattern);
    if (betweenMatch) {
      const minValue = this.parseNumber(betweenMatch[1], betweenMatch[2]);
      const maxValue = this.parseNumber(betweenMatch[3], betweenMatch[4]);
      if (minValue) {
        criteria.minPrice = {
          value: minValue,
          confidence: 0.9,
          matchedText: betweenMatch[0],
        };
      }
      if (maxValue) {
        criteria.maxPrice = {
          value: maxValue,
          confidence: 0.9,
          matchedText: betweenMatch[0],
        };
      }
    }

    // Pattern: "X to Y" price range
    const rangePattern =
      /[$€£]?\s*(\d+(?:[.,]\d+)?)\s*(k|thousand|million|m)?\s*(?:to|-)\s*[$€£]?\s*(\d+(?:[.,]\d+)?)\s*(k|thousand|million|m)?(?:\s*(?:euro|eur|dollar|usd|gbp|pound|forint|huf))?/i;
    if (!criteria.minPrice && !criteria.maxPrice) {
      const rangeMatch = text.match(rangePattern);
      if (rangeMatch) {
        const minValue = this.parseNumber(rangeMatch[1], rangeMatch[2]);
        const maxValue = this.parseNumber(rangeMatch[3], rangeMatch[4]);
        if (minValue && maxValue && minValue < maxValue) {
          criteria.minPrice = {
            value: minValue,
            confidence: 0.8,
            matchedText: rangeMatch[0],
          };
          criteria.maxPrice = {
            value: maxValue,
            confidence: 0.8,
            matchedText: rangeMatch[0],
          };
        }
      }
    }

    // Pattern: just a number with currency context
    if (!criteria.minPrice && !criteria.maxPrice) {
      const simplePattern =
        /(\d+(?:[.,]\d+)?)\s*(k|thousand|million|m)?\s*(?:euro|eur|dollar|usd|gbp|pound|forint|huf)/i;
      const simpleMatch = text.match(simplePattern);
      if (simpleMatch) {
        const value = this.parseNumber(simpleMatch[1], simpleMatch[2]);
        if (value) {
          // Assume it's a max price if mentioned alone
          criteria.maxPrice = {
            value,
            confidence: 0.6,
            matchedText: simpleMatch[0],
          };
        }
      }
    }
  }

  /**
   * Extract bedrooms from text
   */
  private extractBedrooms(text: string, criteria: ParsedSearchCriteria): void {
    // Pattern: "X bedroom(s)" or "X bed" or "X br"
    const bedroomPattern = /(\d+)\s*(?:\+\s*)?(?:bed(?:room)?s?|br)/i;
    const match = text.match(bedroomPattern);
    if (match) {
      const value = parseInt(match[1], 10);
      if (value >= 0 && value <= 20) {
        criteria.minBedrooms = {
          value,
          confidence: 0.9,
          matchedText: match[0],
        };
      }
    }

    // Pattern: "at least X bedrooms"
    const atLeastPattern = /(?:at least|minimum|min)\s*(\d+)\s*(?:bed(?:room)?s?|br)/i;
    const atLeastMatch = text.match(atLeastPattern);
    if (atLeastMatch) {
      const value = parseInt(atLeastMatch[1], 10);
      if (value >= 0 && value <= 20) {
        criteria.minBedrooms = {
          value,
          confidence: 0.95,
          matchedText: atLeastMatch[0],
        };
      }
    }
  }

  /**
   * Extract bathrooms from text
   */
  private extractBathrooms(text: string, criteria: ParsedSearchCriteria): void {
    // Pattern: "X bathroom(s)" or "X bath"
    const bathroomPattern = /(\d+)\s*(?:\+\s*)?(?:bath(?:room)?s?)/i;
    const match = text.match(bathroomPattern);
    if (match) {
      const value = parseInt(match[1], 10);
      if (value >= 0 && value <= 10) {
        criteria.minBathrooms = {
          value,
          confidence: 0.9,
          matchedText: match[0],
        };
      }
    }
  }

  /**
   * Extract square meters from text
   */
  private extractSquareMeters(
    text: string,
    criteria: ParsedSearchCriteria,
  ): void {
    // Pattern: "X sqm" or "X square meters" or "X m2"
    const sizePattern = /(\d+)\s*(?:sqm|square\s*met(?:er|re)s?|m2|m²)/i;
    const match = text.match(sizePattern);
    if (match) {
      const value = parseInt(match[1], 10);
      if (value >= 10 && value <= 10000) {
        // Check for "at least" or "over"
        const textBefore = text.slice(0, match.index);
        if (/(?:at least|over|above|minimum|min)\s*$/.test(textBefore)) {
          criteria.minSquareMeters = {
            value,
            confidence: 0.9,
            matchedText: match[0],
          };
        } else if (/(?:under|below|maximum|max|up to)\s*$/.test(textBefore)) {
          criteria.maxSquareMeters = {
            value,
            confidence: 0.9,
            matchedText: match[0],
          };
        } else {
          // Default to minimum
          criteria.minSquareMeters = {
            value,
            confidence: 0.75,
            matchedText: match[0],
          };
        }
      }
    }
  }

  /**
   * Extract year built from text
   */
  private extractYearBuilt(text: string, criteria: ParsedSearchCriteria): void {
    // Pattern: "built after YEAR" or "from YEAR"
    const afterPattern = /(?:built\s+)?(?:after|from|since)\s*(\d{4})/i;
    const afterMatch = text.match(afterPattern);
    if (afterMatch) {
      const year = parseInt(afterMatch[1], 10);
      if (year >= 1800 && year <= 2100) {
        criteria.minYearBuilt = {
          value: year,
          confidence: 0.85,
          matchedText: afterMatch[0],
        };
      }
    }

    // Pattern: "built before YEAR"
    const beforePattern = /(?:built\s+)?before\s*(\d{4})/i;
    const beforeMatch = text.match(beforePattern);
    if (beforeMatch) {
      const year = parseInt(beforeMatch[1], 10);
      if (year >= 1800 && year <= 2100) {
        criteria.maxYearBuilt = {
          value: year,
          confidence: 0.85,
          matchedText: beforeMatch[0],
        };
      }
    }
  }

  /**
   * Extract features from text
   */
  private extractFeatures(text: string, criteria: ParsedSearchCriteria): void {
    for (const [feature, keywords] of Object.entries(this.featureKeywords)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          const key = feature as keyof Pick<
            ParsedSearchCriteria,
            'petFriendly' | 'newlyBuilt' | 'accessible'
          >;
          criteria[key] = {
            value: true,
            confidence: 0.9,
            matchedText: keyword,
          };
          break;
        }
      }
    }
  }

  /**
   * Parse a number with optional multiplier (k, thousand, million, m)
   */
  private parseNumber(numStr: string, multiplier?: string): number | null {
    const num = parseFloat(numStr.replace(',', '.'));
    if (isNaN(num)) return null;

    if (multiplier) {
      const m = multiplier.toLowerCase();
      if (m === 'k' || m === 'thousand') {
        return num * 1000;
      }
      if (m === 'm' || m === 'million') {
        return num * 1000000;
      }
    }

    // If number is small and no multiplier, assume thousands
    if (num < 1000 && !multiplier) {
      return num * 1000;
    }

    return num;
  }

  /**
   * Capitalize city name
   */
  private capitalizeCity(city: string): string {
    return city
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Generate human-readable display text from parsed criteria
   */
  private generateDisplayText(criteria: ParsedSearchCriteria): string {
    // Check if any meaningful criteria was extracted
    const hasCriteria =
      criteria.city ||
      criteria.country ||
      criteria.listingTypes ||
      criteria.minPrice ||
      criteria.maxPrice ||
      criteria.minBedrooms ||
      criteria.maxBedrooms ||
      criteria.minBathrooms ||
      criteria.minSquareMeters ||
      criteria.maxSquareMeters ||
      criteria.petFriendly ||
      criteria.newlyBuilt ||
      criteria.accessible;

    if (!hasCriteria) {
      return 'All properties';
    }

    const parts: string[] = [];

    // Bedrooms
    if (criteria.minBedrooms) {
      parts.push(`${criteria.minBedrooms.value}+ bedroom`);
    }

    // Property type indicator
    if (criteria.listingTypes?.value.length === 1) {
      if (criteria.listingTypes.value[0] === ListingType.FOR_SALE) {
        parts.push('properties for sale');
      } else if (criteria.listingTypes.value[0] === ListingType.LONG_TERM_RENT) {
        parts.push('rentals');
      } else if (criteria.listingTypes.value[0] === ListingType.SHORT_TERM_RENT) {
        parts.push('vacation rentals');
      } else {
        parts.push('properties');
      }
    } else {
      parts.push('properties');
    }

    // Location
    if (criteria.city) {
      parts.push(`in ${criteria.city.value}`);
    }
    if (criteria.country && !criteria.city) {
      const countryName = this.getCountryName(criteria.country.value);
      parts.push(`in ${countryName}`);
    }

    // Price
    if (criteria.minPrice && criteria.maxPrice) {
      parts.push(
        `${this.formatPrice(criteria.minPrice.value)} - ${this.formatPrice(criteria.maxPrice.value)}`,
      );
    } else if (criteria.maxPrice) {
      parts.push(`under ${this.formatPrice(criteria.maxPrice.value)}`);
    } else if (criteria.minPrice) {
      parts.push(`from ${this.formatPrice(criteria.minPrice.value)}`);
    }

    // Features
    const features: string[] = [];
    if (criteria.petFriendly?.value) features.push('pet-friendly');
    if (criteria.newlyBuilt?.value) features.push('newly built');
    if (criteria.accessible?.value) features.push('accessible');
    if (features.length > 0) {
      parts.push(`(${features.join(', ')})`);
    }

    return parts.join(' ') || 'All properties';
  }

  /**
   * Format price for display
   */
  private formatPrice(price: number): string {
    if (price >= 1000000) {
      return `${(price / 1000000).toFixed(1)}M`;
    }
    if (price >= 1000) {
      return `${Math.round(price / 1000)}K`;
    }
    return price.toString();
  }

  /**
   * Get country name from code
   */
  private getCountryName(code: string): string {
    const names: Record<string, string> = {
      HU: 'Hungary',
      UK: 'United Kingdom',
      US: 'United States',
      DE: 'Germany',
      FR: 'France',
      ES: 'Spain',
      IT: 'Italy',
      NL: 'Netherlands',
      AT: 'Austria',
      CZ: 'Czech Republic',
      PT: 'Portugal',
      IE: 'Ireland',
    };
    return names[code] || code;
  }
}
