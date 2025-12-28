// User types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'USER' | 'AGENT' | 'ADMIN';
export type UserStatus = 'PENDING_VERIFICATION' | 'PENDING_PROFILE' | 'ACTIVE' | 'SUSPENDED' | 'DELETED';

// Auth types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

export interface RegisterDto {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  confirmPassword: string;
  invitationToken?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface CompleteProfileDto {
  address: string;
  postalCode: string;
  city: string;
  country: string;
  phone: string;
}

// Property types
export interface Property {
  id: string;
  title: string;
  description?: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
  listingTypes: ListingType[];
  status: PropertyStatus;
  basePrice: string;
  currency: string;
  squareMeters?: number;
  bedrooms?: number;
  bathrooms?: number;
  floors?: number;
  yearBuilt?: number;
  petFriendly: boolean;
  noAgents: boolean;
  owner: PropertyOwner;
  media: PropertyMedia[];
  createdAt: string;
  updatedAt: string;
}

export interface PropertyOwner {
  id: string;
  firstName: string;
  lastName: string;
}

export interface PropertyMedia {
  id: string;
  type: 'photo' | 'video' | 'tour_360' | 'tour_3d';
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  sortOrder: number;
  isPrimary: boolean;
}

export type ListingType = 'FOR_SALE' | 'SHORT_TERM_RENT' | 'LONG_TERM_RENT' | 'EVENTS' | 'BARTER';
export type PropertyStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'SOLD' | 'RENTED' | 'EXPIRED' | 'DELETED';

// Search types
export interface PropertyFilters {
  search?: string;
  country?: string;
  city?: string;
  listingTypes?: ListingType[];
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  minBathrooms?: number;
  minSquareMeters?: number;
  maxSquareMeters?: number;
  petFriendly?: boolean;
  hasUpcomingOpenHouse?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Negotiation types
export interface Negotiation {
  id: string;
  propertyId: string;
  buyerId: string;
  sellerId: string;
  type: 'BUY' | 'RENT';
  status: NegotiationStatus;
  property: Property;
  buyer: User;
  seller: User;
  offers: Offer[];
  createdAt: string;
  updatedAt: string;
}

export type NegotiationStatus = 'ACTIVE' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED' | 'EXPIRED';

export interface Offer {
  id: string;
  negotiationId: string;
  madeById: string;
  amount: string;
  currency: string;
  message?: string;
  status: OfferStatus;
  createdAt: string;
}

export type OfferStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COUNTERED' | 'EXPIRED' | 'WITHDRAWN';

// Transaction types
export interface Transaction {
  id: string;
  negotiationId: string;
  amount: string;
  currency: string;
  platformFee: string;
  sellerAmount: string;
  status: TransactionStatus;
  paidAt?: string;
  createdAt: string;
}

export type TransactionStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'CANCELLED';

// Notification types
export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

// Country type
export interface Country {
  code: string;
  name: string;
  phonePrefix: string;
  currency: string;
}

// Search Agent types
export interface SearchAgent {
  id: string;
  name: string;
  criteria: SearchAgentCriteria;
  frequency: 'INSTANT' | 'DAILY' | 'WEEKLY';
  isActive: boolean;
  lastRunAt?: string;
  matchCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SearchAgentCriteria {
  query?: string;
  listingType?: string;
  propertyType?: string;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  minBathrooms?: number;
  maxBathrooms?: number;
  city?: string;
  country?: string;
  amenities?: string[];
}

// API Error
export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}
