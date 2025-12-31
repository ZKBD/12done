import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ListingType } from '@prisma/client';

/**
 * Voice Search DTOs (PROD-044)
 * Handles parsing of natural language voice transcripts into structured search criteria
 */

// Request DTO for voice search parsing
export class VoiceSearchDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  transcript: string;
}

// Individual parsed field with confidence score
export interface ParsedField<T> {
  value: T;
  confidence: number; // 0-1 scale
  matchedText?: string; // The text that triggered this extraction
}

// All parseable search criteria
export interface ParsedSearchCriteria {
  // Text search
  search?: ParsedField<string>;

  // Location
  city?: ParsedField<string>;
  country?: ParsedField<string>;

  // Listing types
  listingTypes?: ParsedField<ListingType[]>;

  // Price
  minPrice?: ParsedField<number>;
  maxPrice?: ParsedField<number>;

  // Size
  minSquareMeters?: ParsedField<number>;
  maxSquareMeters?: ParsedField<number>;

  // Rooms
  minBedrooms?: ParsedField<number>;
  maxBedrooms?: ParsedField<number>;
  minBathrooms?: ParsedField<number>;

  // Year
  minYearBuilt?: ParsedField<number>;
  maxYearBuilt?: ParsedField<number>;

  // Boolean features
  petFriendly?: ParsedField<boolean>;
  newlyBuilt?: ParsedField<boolean>;
  accessible?: ParsedField<boolean>;
}

// Response DTO for voice search parsing
export class VoiceSearchResponseDto {
  originalText: string;
  normalizedText: string;
  parsedCriteria: ParsedSearchCriteria;
  confidence: number; // Overall confidence (average of all parsed fields)
  suggestedDisplayText: string; // Human-readable summary of parsed criteria
  fieldCount: number; // Number of fields successfully parsed
}

// Response DTO for voice search execution
export class VoiceSearchExecuteResponseDto extends VoiceSearchResponseDto {
  resultCount: number;
  searchUrl: string; // URL with query params for the parsed search
}
