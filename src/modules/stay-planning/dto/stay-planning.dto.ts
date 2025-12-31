import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsEnum,
  IsDateString,
  IsUUID,
  Min,
  Max,
  ValidateNested,
  IsUrl,
  IsInt,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

// ============================================
// ENUMS (matching Prisma schema)
// ============================================

export enum Season {
  SPRING = 'SPRING',
  SUMMER = 'SUMMER',
  FALL = 'FALL',
  WINTER = 'WINTER',
}

export enum InterestCategory {
  HISTORY = 'HISTORY',
  FOOD = 'FOOD',
  ARCHITECTURE = 'ARCHITECTURE',
  NATURE = 'NATURE',
  SHOPPING = 'SHOPPING',
  NIGHTLIFE = 'NIGHTLIFE',
  CULTURE = 'CULTURE',
  SPORTS = 'SPORTS',
  FAMILY = 'FAMILY',
  ART = 'ART',
}

export enum TripPlanStatus {
  DRAFT = 'DRAFT',
  PLANNED = 'PLANNED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum AttractionCategory {
  MUSEUM = 'MUSEUM',
  MONUMENT = 'MONUMENT',
  PARK = 'PARK',
  RESTAURANT = 'RESTAURANT',
  BAR = 'BAR',
  BEACH = 'BEACH',
  HIKING_TRAIL = 'HIKING_TRAIL',
  VIEWPOINT = 'VIEWPOINT',
  SHOPPING_CENTER = 'SHOPPING_CENTER',
  ENTERTAINMENT = 'ENTERTAINMENT',
  SPA = 'SPA',
  SPORTS_FACILITY = 'SPORTS_FACILITY',
  HISTORICAL_SITE = 'HISTORICAL_SITE',
  RELIGIOUS_SITE = 'RELIGIOUS_SITE',
  NATURE_RESERVE = 'NATURE_RESERVE',
}

export enum AttractionBookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  REFUNDED = 'REFUNDED',
}

export enum CateringQuoteStatus {
  REQUESTED = 'REQUESTED',
  QUOTED = 'QUOTED',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

// ============================================
// STAY PLANNING SESSION DTOs (PROD-140)
// ============================================

export class CreateSessionDto {
  @ApiPropertyOptional({ description: 'Property ID to plan stay for' })
  @IsOptional()
  @IsUUID()
  propertyId?: string;
}

export class UpdateWizardStepDto {
  @ApiPropertyOptional({ enum: Season })
  @IsOptional()
  @IsEnum(Season)
  season?: Season;

  @ApiPropertyOptional({ description: 'Trip start date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Trip end date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Minimum budget' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  budgetMin?: number;

  @ApiPropertyOptional({ description: 'Maximum budget' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  budgetMax?: number;

  @ApiPropertyOptional({ description: 'Currency code' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ enum: InterestCategory, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(InterestCategory, { each: true })
  interests?: InterestCategory[];

  @ApiPropertyOptional({ description: 'Number of guests' })
  @IsOptional()
  @IsInt()
  @Min(1)
  numberOfGuests?: number;

  @ApiPropertyOptional({ description: 'Are there children?' })
  @IsOptional()
  @IsBoolean()
  hasChildren?: boolean;

  @ApiPropertyOptional({ description: 'Ages of children', type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(17, { each: true })
  childrenAges?: number[];

  @ApiPropertyOptional({ description: 'Any mobility needs?' })
  @IsOptional()
  @IsBoolean()
  mobilityNeeds?: boolean;

  @ApiPropertyOptional({
    description: 'Preferred pace',
    enum: ['relaxed', 'moderate', 'packed'],
  })
  @IsOptional()
  @IsString()
  preferredPace?: string;

  @ApiPropertyOptional({ description: 'Current wizard step' })
  @IsOptional()
  @IsInt()
  @Min(1)
  currentStep?: number;
}

export class SelectProposalDto {
  @ApiProperty({ description: 'Index of the selected proposal' })
  @IsInt()
  @Min(0)
  proposalIndex: number;
}

export class SessionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiPropertyOptional()
  propertyId?: string;

  @ApiPropertyOptional({ enum: Season })
  season?: Season;

  @ApiPropertyOptional()
  startDate?: Date;

  @ApiPropertyOptional()
  endDate?: Date;

  @ApiPropertyOptional()
  budgetMin?: number;

  @ApiPropertyOptional()
  budgetMax?: number;

  @ApiProperty()
  currency: string;

  @ApiPropertyOptional({ enum: InterestCategory, isArray: true })
  interests?: InterestCategory[];

  @ApiPropertyOptional()
  numberOfGuests?: number;

  @ApiPropertyOptional()
  hasChildren?: boolean;

  @ApiPropertyOptional({ type: [Number] })
  childrenAges?: number[];

  @ApiPropertyOptional()
  mobilityNeeds?: boolean;

  @ApiPropertyOptional()
  preferredPace?: string;

  @ApiPropertyOptional({ description: 'AI-generated proposals' })
  proposals?: any[];

  @ApiPropertyOptional()
  selectedProposalIndex?: number;

  @ApiProperty()
  currentStep: number;

  @ApiProperty()
  isCompleted: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

// ============================================
// TRIP PLAN DTOs (PROD-141)
// ============================================

export class CreateActivityDto {
  @ApiProperty({ description: 'Activity title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Activity description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Start time (HH:mm)' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({ description: 'End time (HH:mm)' })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional({ description: 'Location name' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Location address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Latitude' })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude' })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ description: 'Estimated cost' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedCost?: number;

  @ApiPropertyOptional({ enum: InterestCategory })
  @IsOptional()
  @IsEnum(InterestCategory)
  category?: InterestCategory;

  @ApiPropertyOptional({ description: 'Linked attraction ID' })
  @IsOptional()
  @IsUUID()
  attractionId?: string;

  @ApiPropertyOptional({ description: 'Linked booking ID' })
  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @ApiPropertyOptional({ description: 'Notes about the activity' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Order within the day' })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class CreateTripDayDto {
  @ApiProperty({ description: 'Date for this day' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ description: 'Day number in the trip' })
  @IsOptional()
  @IsInt()
  @Min(1)
  dayNumber?: number;

  @ApiPropertyOptional({ description: 'Day title/theme' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Day notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [CreateActivityDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateActivityDto)
  activities?: CreateActivityDto[];
}

export class CreateTripPlanDto {
  @ApiProperty({ description: 'Trip plan title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Property ID' })
  @IsUUID()
  propertyId: string;

  @ApiPropertyOptional({ description: 'Planning session ID' })
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @ApiProperty({ description: 'Trip start date' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'Trip end date' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: 'Trip description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Total budget' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalBudget?: number;

  @ApiPropertyOptional({ description: 'Currency code' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ type: [CreateTripDayDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTripDayDto)
  days?: CreateTripDayDto[];
}

export class UpdateTripPlanDto extends PartialType(CreateTripPlanDto) {
  @ApiPropertyOptional({ enum: TripPlanStatus })
  @IsOptional()
  @IsEnum(TripPlanStatus)
  status?: TripPlanStatus;
}

export class UpdateTripDayDto extends PartialType(CreateTripDayDto) {}

export class UpdateActivityDto extends PartialType(CreateActivityDto) {
  @ApiPropertyOptional({ description: 'Mark as completed' })
  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;
}

export class TripActivityResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  dayId: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  startTime?: string;

  @ApiPropertyOptional()
  endTime?: string;

  @ApiPropertyOptional()
  location?: string;

  @ApiPropertyOptional()
  address?: string;

  @ApiPropertyOptional()
  latitude?: number;

  @ApiPropertyOptional()
  longitude?: number;

  @ApiPropertyOptional()
  estimatedCost?: number;

  @ApiPropertyOptional({ enum: InterestCategory })
  category?: InterestCategory;

  @ApiPropertyOptional()
  attractionId?: string;

  @ApiPropertyOptional()
  bookingId?: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  order: number;

  @ApiProperty()
  isCompleted: boolean;

  @ApiProperty()
  createdAt: Date;
}

export class TripDayResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tripPlanId: string;

  @ApiProperty()
  date: Date;

  @ApiProperty()
  dayNumber: number;

  @ApiPropertyOptional()
  title?: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty({ type: [TripActivityResponseDto] })
  activities: TripActivityResponseDto[];

  @ApiProperty()
  createdAt: Date;
}

export class TripPlanResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  propertyId: string;

  @ApiPropertyOptional()
  sessionId?: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  startDate: Date;

  @ApiProperty()
  endDate: Date;

  @ApiPropertyOptional()
  totalBudget?: number;

  @ApiProperty()
  currency: string;

  @ApiProperty({ enum: TripPlanStatus })
  status: TripPlanStatus;

  @ApiProperty({ type: [TripDayResponseDto] })
  days: TripDayResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

// ============================================
// ATTRACTION DTOs (PROD-142)
// ============================================

export class SearchAttractionsDto {
  @ApiPropertyOptional({ description: 'Latitude of center point' })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude of center point' })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ description: 'Property ID to search near' })
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiPropertyOptional({ description: 'Search radius in km', default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  radiusKm?: number;

  @ApiPropertyOptional({ enum: AttractionCategory, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(AttractionCategory, { each: true })
  categories?: AttractionCategory[];

  @ApiPropertyOptional({ description: 'Minimum rating (0-5)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional({ description: 'Maximum price level (1-4)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  maxPriceLevel?: number;

  @ApiPropertyOptional({ description: 'Only show bookable attractions' })
  @IsOptional()
  @IsBoolean()
  bookableOnly?: boolean;

  @ApiPropertyOptional({ description: 'Search query text' })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Results per page', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class CreateAttractionDto {
  @ApiProperty({ description: 'Attraction name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: AttractionCategory })
  @IsEnum(AttractionCategory)
  category: AttractionCategory;

  @ApiProperty({ description: 'Address' })
  @IsString()
  address: string;

  @ApiProperty({ description: 'City' })
  @IsString()
  city: string;

  @ApiProperty({ description: 'Country code' })
  @IsString()
  country: string;

  @ApiProperty({ description: 'Latitude' })
  @IsNumber()
  latitude: number;

  @ApiProperty({ description: 'Longitude' })
  @IsNumber()
  longitude: number;

  @ApiPropertyOptional({ description: 'Website URL' })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Opening hours JSON' })
  @IsOptional()
  openingHours?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Image URLs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  imageUrls?: string[];

  @ApiPropertyOptional({ description: 'Price level (1-4)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  priceLevel?: number;

  @ApiPropertyOptional({ description: 'Duration in minutes' })
  @IsOptional()
  @IsInt()
  @Min(15)
  durationMinutes?: number;

  @ApiPropertyOptional({ description: 'Tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'External source' })
  @IsOptional()
  @IsString()
  externalSource?: string;

  @ApiPropertyOptional({ description: 'External ID' })
  @IsOptional()
  @IsString()
  externalId?: string;
}

export class UpdateAttractionDto extends PartialType(CreateAttractionDto) {}

export class AttractionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ enum: AttractionCategory })
  category: AttractionCategory;

  @ApiProperty()
  address: string;

  @ApiProperty()
  city: string;

  @ApiProperty()
  country: string;

  @ApiProperty()
  latitude: number;

  @ApiProperty()
  longitude: number;

  @ApiPropertyOptional()
  website?: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  openingHours?: Record<string, any>;

  @ApiPropertyOptional({ type: [String] })
  imageUrls?: string[];

  @ApiPropertyOptional()
  rating?: number;

  @ApiPropertyOptional()
  reviewCount?: number;

  @ApiPropertyOptional()
  priceLevel?: number;

  @ApiPropertyOptional()
  durationMinutes?: number;

  @ApiPropertyOptional({ type: [String] })
  tags?: string[];

  @ApiProperty()
  isBookable: boolean;

  @ApiPropertyOptional()
  bookingUrl?: string;

  @ApiPropertyOptional()
  externalSource?: string;

  @ApiPropertyOptional()
  externalId?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Distance from search point in km' })
  distance?: number;
}

// ============================================
// ATTRACTION BOOKING DTOs (PROD-143)
// ============================================

export class CreateBookingDto {
  @ApiProperty({ description: 'Attraction ID' })
  @IsUUID()
  attractionId: string;

  @ApiProperty({ description: 'Booking date' })
  @IsDateString()
  bookingDate: string;

  @ApiPropertyOptional({ description: 'Time slot' })
  @IsOptional()
  @IsString()
  timeSlot?: string;

  @ApiProperty({ description: 'Number of guests' })
  @IsInt()
  @Min(1)
  numberOfGuests: number;

  @ApiPropertyOptional({ description: 'Number of adults' })
  @IsOptional()
  @IsInt()
  @Min(1)
  adults?: number;

  @ApiPropertyOptional({ description: 'Number of children' })
  @IsOptional()
  @IsInt()
  @Min(0)
  children?: number;

  @ApiPropertyOptional({ description: 'Ticket/package type' })
  @IsOptional()
  @IsString()
  ticketType?: string;

  @ApiPropertyOptional({ description: 'Special requests' })
  @IsOptional()
  @IsString()
  specialRequests?: string;

  @ApiPropertyOptional({ description: 'Link to trip day' })
  @IsOptional()
  @IsUUID()
  tripDayId?: string;

  @ApiPropertyOptional({ description: 'Contact name' })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiPropertyOptional({ description: 'Contact email' })
  @IsOptional()
  @IsString()
  contactEmail?: string;

  @ApiPropertyOptional({ description: 'Contact phone' })
  @IsOptional()
  @IsString()
  contactPhone?: string;
}

export class UpdateBookingDto {
  @ApiPropertyOptional({ description: 'Booking date' })
  @IsOptional()
  @IsDateString()
  bookingDate?: string;

  @ApiPropertyOptional({ description: 'Time slot' })
  @IsOptional()
  @IsString()
  timeSlot?: string;

  @ApiPropertyOptional({ description: 'Number of guests' })
  @IsOptional()
  @IsInt()
  @Min(1)
  numberOfGuests?: number;

  @ApiPropertyOptional({ description: 'Special requests' })
  @IsOptional()
  @IsString()
  specialRequests?: string;
}

export class BookingResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  attractionId: string;

  @ApiPropertyOptional()
  attraction?: AttractionResponseDto;

  @ApiProperty()
  bookingDate: Date;

  @ApiPropertyOptional()
  timeSlot?: string;

  @ApiProperty()
  numberOfGuests: number;

  @ApiPropertyOptional()
  adults?: number;

  @ApiPropertyOptional()
  children?: number;

  @ApiPropertyOptional()
  ticketType?: string;

  @ApiPropertyOptional()
  specialRequests?: string;

  @ApiPropertyOptional()
  tripDayId?: string;

  @ApiPropertyOptional()
  totalPrice?: number;

  @ApiProperty()
  currency: string;

  @ApiProperty({ enum: AttractionBookingStatus })
  status: AttractionBookingStatus;

  @ApiPropertyOptional()
  confirmationCode?: string;

  @ApiPropertyOptional()
  externalBookingId?: string;

  @ApiPropertyOptional()
  contactName?: string;

  @ApiPropertyOptional()
  contactEmail?: string;

  @ApiPropertyOptional()
  contactPhone?: string;

  @ApiPropertyOptional()
  confirmedAt?: Date;

  @ApiPropertyOptional()
  cancelledAt?: Date;

  @ApiPropertyOptional()
  cancellationReason?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

// ============================================
// CATERING DTOs (PROD-144)
// ============================================

export class SearchCateringProvidersDto {
  @ApiPropertyOptional({ description: 'City' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Country code' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: 'Latitude' })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude' })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ description: 'Search radius in km', default: 25 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  radiusKm?: number;

  @ApiPropertyOptional({ description: 'Cuisine types', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cuisineTypes?: string[];

  @ApiPropertyOptional({ description: 'Minimum rating' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional({ description: 'Minimum guests' })
  @IsOptional()
  @IsInt()
  @Min(1)
  minGuests?: number;

  @ApiPropertyOptional({ description: 'Maximum guests' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxGuests?: number;

  @ApiPropertyOptional({ description: 'Event types', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  eventTypes?: string[];

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Results per page', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class CreateCateringProviderDto {
  @ApiProperty({ description: 'Business name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Cuisine types', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  cuisineTypes: string[];

  @ApiProperty({ description: 'City' })
  @IsString()
  city: string;

  @ApiProperty({ description: 'Country code' })
  @IsString()
  country: string;

  @ApiPropertyOptional({ description: 'Full address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Latitude' })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude' })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ description: 'Contact email' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'Contact phone' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Website' })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({ description: 'Minimum guests' })
  @IsOptional()
  @IsInt()
  @Min(1)
  minGuests?: number;

  @ApiPropertyOptional({ description: 'Maximum guests' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxGuests?: number;

  @ApiPropertyOptional({ description: 'Price per person minimum' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerPersonMin?: number;

  @ApiPropertyOptional({ description: 'Price per person maximum' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerPersonMax?: number;

  @ApiPropertyOptional({ description: 'Currency' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Event types supported', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  eventTypes?: string[];

  @ApiPropertyOptional({ description: 'Dietary options', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dietaryOptions?: string[];

  @ApiPropertyOptional({ description: 'Service radius in km' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  serviceRadiusKm?: number;

  @ApiPropertyOptional({ description: 'Lead time in days' })
  @IsOptional()
  @IsInt()
  @Min(0)
  leadTimeDays?: number;

  @ApiPropertyOptional({ description: 'Image URLs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  imageUrls?: string[];
}

export class UpdateCateringProviderDto extends PartialType(
  CreateCateringProviderDto,
) {
  @ApiPropertyOptional({ description: 'Active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateCateringMenuDto {
  @ApiProperty({ description: 'Menu name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Menu description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Menu type (e.g., buffet, plated, cocktail)' })
  @IsString()
  menuType: string;

  @ApiProperty({ description: 'Price per person' })
  @IsNumber()
  @Min(0)
  pricePerPerson: number;

  @ApiPropertyOptional({ description: 'Currency' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Minimum guests' })
  @IsOptional()
  @IsInt()
  @Min(1)
  minGuests?: number;

  @ApiPropertyOptional({ description: 'Maximum guests' })
  @IsOptional()
  @IsInt()
  maxGuests?: number;

  @ApiPropertyOptional({ description: 'Menu items JSON' })
  @IsOptional()
  items?: any[];

  @ApiPropertyOptional({ description: 'Dietary options covered', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dietaryOptions?: string[];

  @ApiPropertyOptional({ description: 'Image URLs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  imageUrls?: string[];
}

export class UpdateCateringMenuDto extends PartialType(CreateCateringMenuDto) {
  @ApiPropertyOptional({ description: 'Active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CateringMenuResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  providerId: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  menuType: string;

  @ApiProperty()
  pricePerPerson: number;

  @ApiProperty()
  currency: string;

  @ApiPropertyOptional()
  minGuests?: number;

  @ApiPropertyOptional()
  maxGuests?: number;

  @ApiPropertyOptional()
  items?: any[];

  @ApiPropertyOptional({ type: [String] })
  dietaryOptions?: string[];

  @ApiPropertyOptional({ type: [String] })
  imageUrls?: string[];

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class CateringProviderResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ type: [String] })
  cuisineTypes: string[];

  @ApiProperty()
  city: string;

  @ApiProperty()
  country: string;

  @ApiPropertyOptional()
  address?: string;

  @ApiPropertyOptional()
  latitude?: number;

  @ApiPropertyOptional()
  longitude?: number;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  website?: string;

  @ApiPropertyOptional()
  minGuests?: number;

  @ApiPropertyOptional()
  maxGuests?: number;

  @ApiPropertyOptional()
  pricePerPersonMin?: number;

  @ApiPropertyOptional()
  pricePerPersonMax?: number;

  @ApiProperty()
  currency: string;

  @ApiPropertyOptional({ type: [String] })
  eventTypes?: string[];

  @ApiPropertyOptional({ type: [String] })
  dietaryOptions?: string[];

  @ApiPropertyOptional()
  serviceRadiusKm?: number;

  @ApiPropertyOptional()
  leadTimeDays?: number;

  @ApiPropertyOptional({ type: [String] })
  imageUrls?: string[];

  @ApiPropertyOptional()
  rating?: number;

  @ApiPropertyOptional()
  reviewCount?: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  isVerified: boolean;

  @ApiProperty({ type: [CateringMenuResponseDto] })
  menus: CateringMenuResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Distance from search point in km' })
  distance?: number;
}

export class RequestCateringQuoteDto {
  @ApiProperty({ description: 'Provider ID' })
  @IsUUID()
  providerId: string;

  @ApiProperty({ description: 'Event date' })
  @IsDateString()
  eventDate: string;

  @ApiProperty({ description: 'Event type' })
  @IsString()
  eventType: string;

  @ApiProperty({ description: 'Number of guests' })
  @IsInt()
  @Min(1)
  numberOfGuests: number;

  @ApiPropertyOptional({ description: 'Venue name' })
  @IsOptional()
  @IsString()
  venue?: string;

  @ApiPropertyOptional({ description: 'Venue address' })
  @IsOptional()
  @IsString()
  venueAddress?: string;

  @ApiPropertyOptional({ description: 'Property ID if event at property' })
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiPropertyOptional({ description: 'Cuisine preferences', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cuisinePreferences?: string[];

  @ApiPropertyOptional({ description: 'Dietary requirements', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dietaryRequirements?: string[];

  @ApiPropertyOptional({ description: 'Minimum budget' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  budgetMin?: number;

  @ApiPropertyOptional({ description: 'Maximum budget' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  budgetMax?: number;

  @ApiPropertyOptional({ description: 'Currency' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  additionalNotes?: string;
}

export class RespondToQuoteDto {
  @ApiProperty({ description: 'Quoted amount' })
  @IsNumber()
  @Min(0)
  quotedAmount: number;

  @ApiPropertyOptional({ description: 'Quote details' })
  @IsOptional()
  @IsString()
  quotedDetails?: string;

  @ApiPropertyOptional({ description: 'Suggested menu ID' })
  @IsOptional()
  @IsUUID()
  quotedMenuId?: string;

  @ApiPropertyOptional({ description: 'Quote expiration date' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'Response notes' })
  @IsOptional()
  @IsString()
  responseNotes?: string;
}

export class CateringQuoteResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  providerId: string;

  @ApiPropertyOptional()
  provider?: CateringProviderResponseDto;

  @ApiProperty()
  eventDate: Date;

  @ApiProperty()
  eventType: string;

  @ApiProperty()
  numberOfGuests: number;

  @ApiPropertyOptional()
  venue?: string;

  @ApiPropertyOptional()
  venueAddress?: string;

  @ApiPropertyOptional()
  propertyId?: string;

  @ApiPropertyOptional({ type: [String] })
  cuisinePreferences?: string[];

  @ApiPropertyOptional({ type: [String] })
  dietaryRequirements?: string[];

  @ApiPropertyOptional()
  budgetMin?: number;

  @ApiPropertyOptional()
  budgetMax?: number;

  @ApiProperty()
  currency: string;

  @ApiPropertyOptional()
  additionalNotes?: string;

  @ApiProperty({ enum: CateringQuoteStatus })
  status: CateringQuoteStatus;

  @ApiPropertyOptional()
  quotedAmount?: number;

  @ApiPropertyOptional()
  quotedDetails?: string;

  @ApiPropertyOptional()
  quotedMenuId?: string;

  @ApiPropertyOptional()
  quotedAt?: Date;

  @ApiPropertyOptional()
  expiresAt?: Date;

  @ApiPropertyOptional()
  respondedAt?: Date;

  @ApiPropertyOptional()
  responseNotes?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

// ============================================
// AI PLANNING DTOs (PROD-140)
// ============================================

export class GenerateProposalsDto {
  @ApiProperty({ description: 'Session ID' })
  @IsUUID()
  sessionId: string;
}

export class ProposalResponseDto {
  @ApiProperty({ description: 'Proposal index' })
  index: number;

  @ApiProperty({ description: 'Proposal title' })
  title: string;

  @ApiProperty({ description: 'Proposal description' })
  description: string;

  @ApiProperty({ description: 'Estimated total cost' })
  estimatedCost: number;

  @ApiProperty({ description: 'Pace level' })
  pace: string;

  @ApiProperty({ description: 'Highlights', type: [String] })
  highlights: string[];

  @ApiProperty({ description: 'Daily breakdown' })
  dailyBreakdown: {
    day: number;
    theme: string;
    activities: { title: string; duration: string; type: string }[];
  }[];
}
