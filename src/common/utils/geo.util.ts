/**
 * Geo utilities for spatial calculations
 * PROD-043: Map-Based Search support functions
 */

export interface GeoPoint {
  lat: number;
  lng: number;
}

/**
 * Check if a point is inside a polygon using ray-casting algorithm
 * Works for both convex and concave polygons
 * PROD-043.5: Accurate point-in-polygon check
 *
 * @param point - The point to test
 * @param polygon - Array of polygon vertices (must have at least 3 points)
 * @returns true if point is inside the polygon
 */
export function isPointInPolygon(point: GeoPoint, polygon: GeoPoint[]): boolean {
  if (polygon.length < 3) {
    return false;
  }

  const { lat: y, lng: x } = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;

    // Ray casting: count intersections with polygon edges
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Calculate the Haversine distance between two points in kilometers
 * PROD-043: Used for radius-based search
 *
 * @param point1 - First point
 * @param point2 - Second point
 * @returns Distance in kilometers
 */
export function haversineDistance(point1: GeoPoint, point2: GeoPoint): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(point2.lat - point1.lat);
  const dLng = toRadians(point2.lng - point1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.lat)) *
      Math.cos(toRadians(point2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Get the bounding box of a polygon
 * Used for initial database filtering before accurate point-in-polygon check
 *
 * @param polygon - Array of polygon vertices
 * @returns Bounding box with min/max lat/lng
 */
export function getPolygonBoundingBox(polygon: GeoPoint[]): {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
} {
  if (polygon.length === 0) {
    throw new Error('Polygon must have at least one point');
  }

  const lats = polygon.map((p) => p.lat);
  const lngs = polygon.map((p) => p.lng);

  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  };
}

/**
 * Check if a point is within a bounding box
 *
 * @param point - The point to test
 * @param box - Bounding box coordinates
 * @returns true if point is within the bounding box
 */
export function isPointInBoundingBox(
  point: GeoPoint,
  box: { swLat: number; swLng: number; neLat: number; neLng: number },
): boolean {
  return (
    point.lat >= box.swLat &&
    point.lat <= box.neLat &&
    point.lng >= box.swLng &&
    point.lng <= box.neLng
  );
}

/**
 * Filter an array of geo-located items by polygon
 * First filters by bounding box, then applies accurate point-in-polygon
 *
 * @param items - Array of items with lat/lng properties
 * @param polygon - Polygon vertices
 * @param getPoint - Function to extract lat/lng from item
 * @returns Filtered array of items inside the polygon
 */
export function filterByPolygon<T>(
  items: T[],
  polygon: GeoPoint[],
  getPoint: (item: T) => GeoPoint | null,
): T[] {
  if (polygon.length < 3) {
    return items;
  }

  const bbox = getPolygonBoundingBox(polygon);

  return items.filter((item) => {
    const point = getPoint(item);
    if (!point) return false;

    // Quick bounding box check first
    if (
      point.lat < bbox.minLat ||
      point.lat > bbox.maxLat ||
      point.lng < bbox.minLng ||
      point.lng > bbox.maxLng
    ) {
      return false;
    }

    // Accurate point-in-polygon check
    return isPointInPolygon(point, polygon);
  });
}

/**
 * Filter an array of geo-located items by radius
 *
 * @param items - Array of items with lat/lng properties
 * @param center - Center point
 * @param radiusKm - Radius in kilometers
 * @param getPoint - Function to extract lat/lng from item
 * @returns Filtered array of items within the radius
 */
export function filterByRadius<T>(
  items: T[],
  center: GeoPoint,
  radiusKm: number,
  getPoint: (item: T) => GeoPoint | null,
): T[] {
  return items.filter((item) => {
    const point = getPoint(item);
    if (!point) return false;
    return haversineDistance(center, point) <= radiusKm;
  });
}
