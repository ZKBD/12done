import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PoiType } from '@prisma/client';
import { PoiResponseDto, NearbyPoiQueryDto, PoiDetailsQueryDto } from './dto';

// Google Places API type mappings
const GOOGLE_PLACE_TYPE_MAP: Record<string, PoiType> = {
  restaurant: PoiType.RESTAURANT,
  cafe: PoiType.RESTAURANT,
  bar: PoiType.RESTAURANT,
  bakery: PoiType.RESTAURANT,
  food: PoiType.RESTAURANT,
  meal_delivery: PoiType.RESTAURANT,
  meal_takeaway: PoiType.RESTAURANT,

  park: PoiType.PARK,
  natural_feature: PoiType.PARK,
  campground: PoiType.PARK,

  shopping_mall: PoiType.SHOP,
  store: PoiType.SHOP,
  clothing_store: PoiType.SHOP,
  convenience_store: PoiType.SHOP,
  supermarket: PoiType.SHOP,
  grocery_or_supermarket: PoiType.SHOP,
  department_store: PoiType.SHOP,
  electronics_store: PoiType.SHOP,
  furniture_store: PoiType.SHOP,
  home_goods_store: PoiType.SHOP,
  jewelry_store: PoiType.SHOP,
  shoe_store: PoiType.SHOP,
  book_store: PoiType.SHOP,
  florist: PoiType.SHOP,
  pet_store: PoiType.SHOP,

  museum: PoiType.MUSEUM,
  art_gallery: PoiType.MUSEUM,

  tourist_attraction: PoiType.LANDMARK,
  point_of_interest: PoiType.LANDMARK,
  place_of_worship: PoiType.LANDMARK,
  church: PoiType.LANDMARK,
  hindu_temple: PoiType.LANDMARK,
  mosque: PoiType.LANDMARK,
  synagogue: PoiType.LANDMARK,
  city_hall: PoiType.LANDMARK,
  courthouse: PoiType.LANDMARK,

  lodging: PoiType.HOTEL,
  hotel: PoiType.HOTEL,

  transit_station: PoiType.TRANSPORT,
  bus_station: PoiType.TRANSPORT,
  subway_station: PoiType.TRANSPORT,
  train_station: PoiType.TRANSPORT,
  airport: PoiType.TRANSPORT,
  taxi_stand: PoiType.TRANSPORT,

  movie_theater: PoiType.ENTERTAINMENT,
  night_club: PoiType.ENTERTAINMENT,
  amusement_park: PoiType.ENTERTAINMENT,
  bowling_alley: PoiType.ENTERTAINMENT,
  casino: PoiType.ENTERTAINMENT,
  stadium: PoiType.ENTERTAINMENT,
  zoo: PoiType.ENTERTAINMENT,
  aquarium: PoiType.ENTERTAINMENT,

  hospital: PoiType.HEALTHCARE,
  doctor: PoiType.HEALTHCARE,
  dentist: PoiType.HEALTHCARE,
  pharmacy: PoiType.HEALTHCARE,
  veterinary_care: PoiType.HEALTHCARE,

  school: PoiType.EDUCATION,
  university: PoiType.EDUCATION,
  library: PoiType.EDUCATION,

  establishment: PoiType.BUILDING,
  local_government_office: PoiType.BUILDING,
  embassy: PoiType.BUILDING,
  post_office: PoiType.BUILDING,
  police: PoiType.BUILDING,
  fire_station: PoiType.BUILDING,
  bank: PoiType.BUILDING,
  atm: PoiType.BUILDING,
  gym: PoiType.BUILDING,
  spa: PoiType.BUILDING,
  hair_care: PoiType.BUILDING,
  beauty_salon: PoiType.BUILDING,
};

// Reverse mapping for search filters
const POI_TYPE_TO_GOOGLE: Record<PoiType, string[]> = {
  [PoiType.RESTAURANT]: ['restaurant', 'cafe', 'bar', 'bakery'],
  [PoiType.PARK]: ['park', 'natural_feature'],
  [PoiType.SHOP]: ['shopping_mall', 'store', 'supermarket'],
  [PoiType.MUSEUM]: ['museum', 'art_gallery'],
  [PoiType.LANDMARK]: ['tourist_attraction', 'point_of_interest', 'place_of_worship'],
  [PoiType.HOTEL]: ['lodging'],
  [PoiType.TRANSPORT]: ['transit_station', 'bus_station', 'subway_station', 'train_station'],
  [PoiType.ENTERTAINMENT]: ['movie_theater', 'night_club', 'amusement_park', 'stadium'],
  [PoiType.HEALTHCARE]: ['hospital', 'doctor', 'pharmacy'],
  [PoiType.EDUCATION]: ['school', 'university', 'library'],
  [PoiType.BUILDING]: ['establishment', 'local_government_office'],
  [PoiType.OTHER]: ['establishment'],
};

interface GooglePlaceResult {
  place_id: string;
  name: string;
  types: string[];
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  vicinity?: string;
  formatted_address?: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  opening_hours?: {
    open_now?: boolean;
    weekday_text?: string[];
  };
  photos?: Array<{
    photo_reference: string;
    width: number;
    height: number;
  }>;
  website?: string;
  formatted_phone_number?: string;
}

interface GoogleNearbySearchResponse {
  results: GooglePlaceResult[];
  status: string;
  error_message?: string;
  next_page_token?: string;
}

interface GooglePlaceDetailsResponse {
  result: GooglePlaceResult;
  status: string;
  error_message?: string;
}

@Injectable()
export class PoiService {
  private readonly logger = new Logger(PoiService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://maps.googleapis.com/maps/api/place';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY') || '';

    if (!this.apiKey) {
      this.logger.warn('GOOGLE_MAPS_API_KEY not configured - POI service will return mock data');
    }
  }

  /**
   * Search for nearby POIs (PROD-121, PROD-122)
   */
  async getNearbyPois(query: NearbyPoiQueryDto): Promise<PoiResponseDto[]> {
    const { latitude, longitude, radius = 500, types, limit = 20 } = query;

    // If no API key, return mock data
    if (!this.apiKey) {
      return this.getMockNearbyPois(latitude, longitude, types, limit);
    }

    try {
      const googleTypes = types?.flatMap((t) => POI_TYPE_TO_GOOGLE[t] || []) || [];

      const params = new URLSearchParams({
        location: `${latitude},${longitude}`,
        radius: radius.toString(),
        key: this.apiKey,
      });

      // Add type filter if specified (Google only allows one type per request)
      if (googleTypes.length > 0) {
        params.set('type', googleTypes[0]);
      }

      const url = `${this.baseUrl}/nearbysearch/json?${params.toString()}`;
      const response = await fetch(url);
      const data: GoogleNearbySearchResponse = await response.json();

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        this.logger.error(`Google Places API error: ${data.status} - ${data.error_message}`);
        throw new BadRequestException(`Places API error: ${data.status}`);
      }

      const pois = data.results.slice(0, limit).map((place) => this.mapGooglePlaceToPoi(place));

      // Calculate distances
      return pois.map((poi) => ({
        ...poi,
        distance: this.calculateDistance(latitude, longitude, poi.latitude, poi.longitude),
      }));
    } catch (error) {
      this.logger.error('Failed to fetch nearby POIs', error);
      // Fallback to mock data on error
      return this.getMockNearbyPois(latitude, longitude, types, limit);
    }
  }

  /**
   * Get detailed information about a POI (PROD-122.6)
   */
  async getPoiDetails(query: PoiDetailsQueryDto): Promise<PoiResponseDto> {
    const { placeId, language = 'en' } = query;

    if (!this.apiKey) {
      return this.getMockPoiDetails(placeId);
    }

    try {
      const params = new URLSearchParams({
        place_id: placeId,
        language,
        fields:
          'place_id,name,types,geometry,formatted_address,rating,user_ratings_total,price_level,opening_hours,photos,website,formatted_phone_number',
        key: this.apiKey,
      });

      const url = `${this.baseUrl}/details/json?${params.toString()}`;
      const response = await fetch(url);
      const data: GooglePlaceDetailsResponse = await response.json();

      if (data.status !== 'OK') {
        this.logger.error(`Google Places API error: ${data.status} - ${data.error_message}`);
        throw new BadRequestException(`Place not found: ${data.status}`);
      }

      return this.mapGooglePlaceToPoi(data.result, true);
    } catch (error) {
      this.logger.error('Failed to fetch POI details', error);
      return this.getMockPoiDetails(placeId);
    }
  }

  /**
   * Map Google Place types to our PoiType enum
   */
  mapGoogleTypesToPoiType(types: string[]): PoiType {
    for (const type of types) {
      if (GOOGLE_PLACE_TYPE_MAP[type]) {
        return GOOGLE_PLACE_TYPE_MAP[type];
      }
    }
    return PoiType.OTHER;
  }

  /**
   * Convert Google Place result to our DTO
   */
  private mapGooglePlaceToPoi(place: GooglePlaceResult, includeDetails = false): PoiResponseDto {
    const poi: PoiResponseDto = {
      placeId: place.place_id,
      name: place.name,
      type: this.mapGoogleTypesToPoiType(place.types),
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      address: place.formatted_address || place.vicinity,
      rating: place.rating,
      reviewCount: place.user_ratings_total,
      priceLevel: place.price_level,
    };

    if (includeDetails) {
      poi.isOpen = place.opening_hours?.open_now;
      poi.openingHours = place.opening_hours?.weekday_text;
      poi.website = place.website;
      poi.phone = place.formatted_phone_number;

      if (place.photos?.[0] && this.apiKey) {
        poi.photoUrl = `${this.baseUrl}/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${this.apiKey}`;
      }
    }

    return poi;
  }

  /**
   * Calculate distance between two points using Haversine formula (PROD-121.3)
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371000; // Earth radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Mock data for development without API key
   */
  private getMockNearbyPois(
    latitude: number,
    longitude: number,
    types?: PoiType[],
    limit = 20,
  ): PoiResponseDto[] {
    const mockPois: PoiResponseDto[] = [
      {
        placeId: 'mock_place_1',
        name: 'Central Park',
        type: PoiType.PARK,
        latitude: latitude + 0.001,
        longitude: longitude + 0.001,
        address: '123 Park Avenue',
        rating: 4.5,
        reviewCount: 1250,
        distance: 150,
      },
      {
        placeId: 'mock_place_2',
        name: 'Grand Restaurant',
        type: PoiType.RESTAURANT,
        latitude: latitude + 0.002,
        longitude: longitude - 0.001,
        address: '456 Food Street',
        rating: 4.2,
        reviewCount: 890,
        priceLevel: 2,
        distance: 280,
      },
      {
        placeId: 'mock_place_3',
        name: 'City Museum',
        type: PoiType.MUSEUM,
        latitude: latitude - 0.001,
        longitude: longitude + 0.002,
        address: '789 Culture Boulevard',
        rating: 4.7,
        reviewCount: 2100,
        distance: 320,
      },
      {
        placeId: 'mock_place_4',
        name: 'Historic Cathedral',
        type: PoiType.LANDMARK,
        latitude: latitude - 0.002,
        longitude: longitude - 0.002,
        address: '101 Heritage Square',
        rating: 4.8,
        reviewCount: 3500,
        distance: 400,
      },
      {
        placeId: 'mock_place_5',
        name: 'Shopping Plaza',
        type: PoiType.SHOP,
        latitude: latitude + 0.003,
        longitude: longitude + 0.001,
        address: '202 Commerce Lane',
        rating: 4.0,
        reviewCount: 650,
        priceLevel: 3,
        distance: 450,
      },
    ];

    let filtered = mockPois;
    if (types && types.length > 0) {
      filtered = mockPois.filter((p) => types.includes(p.type));
    }

    return filtered.slice(0, limit);
  }

  private getMockPoiDetails(placeId: string): PoiResponseDto {
    return {
      placeId,
      name: 'Sample Place',
      type: PoiType.LANDMARK,
      latitude: 47.4979,
      longitude: 19.0402,
      address: '123 Sample Street, Budapest',
      rating: 4.5,
      reviewCount: 1000,
      isOpen: true,
      openingHours: [
        'Monday: 9:00 AM – 6:00 PM',
        'Tuesday: 9:00 AM – 6:00 PM',
        'Wednesday: 9:00 AM – 6:00 PM',
        'Thursday: 9:00 AM – 6:00 PM',
        'Friday: 9:00 AM – 6:00 PM',
        'Saturday: 10:00 AM – 4:00 PM',
        'Sunday: Closed',
      ],
      website: 'https://example.com',
      phone: '+36 1 234 5678',
    };
  }
}
