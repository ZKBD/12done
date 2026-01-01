import {
  isPointInPolygon,
  haversineDistance,
  getPolygonBoundingBox,
  isPointInBoundingBox,
  filterByPolygon,
  filterByRadius,
  GeoPoint,
} from './geo.util';

describe('Geo Utilities', () => {
  describe('isPointInPolygon (PROD-043.5)', () => {
    // Simple square polygon around Budapest city center
    const squarePolygon: GeoPoint[] = [
      { lat: 47.4, lng: 19.0 },
      { lat: 47.4, lng: 19.2 },
      { lat: 47.6, lng: 19.2 },
      { lat: 47.6, lng: 19.0 },
    ];

    it('should return true for point inside polygon', () => {
      const point: GeoPoint = { lat: 47.5, lng: 19.1 };
      expect(isPointInPolygon(point, squarePolygon)).toBe(true);
    });

    it('should return false for point outside polygon', () => {
      const point: GeoPoint = { lat: 47.7, lng: 19.1 };
      expect(isPointInPolygon(point, squarePolygon)).toBe(false);
    });

    it('should return false for point to the left of polygon', () => {
      const point: GeoPoint = { lat: 47.5, lng: 18.9 };
      expect(isPointInPolygon(point, squarePolygon)).toBe(false);
    });

    it('should return false for point below polygon', () => {
      const point: GeoPoint = { lat: 47.3, lng: 19.1 };
      expect(isPointInPolygon(point, squarePolygon)).toBe(false);
    });

    it('should return false for empty polygon', () => {
      const point: GeoPoint = { lat: 47.5, lng: 19.1 };
      expect(isPointInPolygon(point, [])).toBe(false);
    });

    it('should return false for polygon with less than 3 points', () => {
      const point: GeoPoint = { lat: 47.5, lng: 19.1 };
      const twoPoints: GeoPoint[] = [
        { lat: 47.4, lng: 19.0 },
        { lat: 47.6, lng: 19.2 },
      ];
      expect(isPointInPolygon(point, twoPoints)).toBe(false);
    });

    // Test concave polygon (L-shape)
    describe('concave polygon', () => {
      // L-shaped polygon
      const lShapePolygon: GeoPoint[] = [
        { lat: 47.0, lng: 19.0 }, // bottom-left
        { lat: 47.0, lng: 19.5 }, // bottom-right of bottom section
        { lat: 47.3, lng: 19.5 }, // inner corner (bottom of vertical)
        { lat: 47.3, lng: 19.2 }, // inner corner (left of horizontal)
        { lat: 47.5, lng: 19.2 }, // top-right of vertical section
        { lat: 47.5, lng: 19.0 }, // top-left
      ];

      it('should return true for point in bottom section of L', () => {
        const point: GeoPoint = { lat: 47.15, lng: 19.25 };
        expect(isPointInPolygon(point, lShapePolygon)).toBe(true);
      });

      it('should return true for point in vertical section of L', () => {
        const point: GeoPoint = { lat: 47.4, lng: 19.1 };
        expect(isPointInPolygon(point, lShapePolygon)).toBe(true);
      });

      it('should return false for point in the "gap" of L', () => {
        const point: GeoPoint = { lat: 47.4, lng: 19.35 };
        expect(isPointInPolygon(point, lShapePolygon)).toBe(false);
      });
    });

    // Test triangle
    describe('triangle polygon', () => {
      const triangle: GeoPoint[] = [
        { lat: 47.0, lng: 19.0 },
        { lat: 47.0, lng: 19.4 },
        { lat: 47.4, lng: 19.2 },
      ];

      it('should return true for point inside triangle', () => {
        const point: GeoPoint = { lat: 47.1, lng: 19.2 };
        expect(isPointInPolygon(point, triangle)).toBe(true);
      });

      it('should return false for point outside triangle', () => {
        const point: GeoPoint = { lat: 47.35, lng: 19.35 };
        expect(isPointInPolygon(point, triangle)).toBe(false);
      });
    });
  });

  describe('haversineDistance', () => {
    it('should return 0 for same point', () => {
      const point: GeoPoint = { lat: 47.5, lng: 19.0 };
      expect(haversineDistance(point, point)).toBe(0);
    });

    it('should calculate distance between Budapest and Vienna (~214 km)', () => {
      const budapest: GeoPoint = { lat: 47.4979, lng: 19.0402 };
      const vienna: GeoPoint = { lat: 48.2082, lng: 16.3738 };
      const distance = haversineDistance(budapest, vienna);
      // Actual distance is about 214 km
      expect(distance).toBeGreaterThan(210);
      expect(distance).toBeLessThan(220);
    });

    it('should calculate distance between nearby points accurately', () => {
      // Two points about 1km apart in Budapest
      const point1: GeoPoint = { lat: 47.4979, lng: 19.0402 };
      const point2: GeoPoint = { lat: 47.4979, lng: 19.0545 }; // ~1km east
      const distance = haversineDistance(point1, point2);
      expect(distance).toBeGreaterThan(0.9);
      expect(distance).toBeLessThan(1.1);
    });
  });

  describe('getPolygonBoundingBox', () => {
    it('should calculate bounding box correctly', () => {
      const polygon: GeoPoint[] = [
        { lat: 47.4, lng: 19.0 },
        { lat: 47.5, lng: 19.3 },
        { lat: 47.6, lng: 19.1 },
      ];
      const bbox = getPolygonBoundingBox(polygon);

      expect(bbox.minLat).toBe(47.4);
      expect(bbox.maxLat).toBe(47.6);
      expect(bbox.minLng).toBe(19.0);
      expect(bbox.maxLng).toBe(19.3);
    });

    it('should throw error for empty polygon', () => {
      expect(() => getPolygonBoundingBox([])).toThrow('Polygon must have at least one point');
    });
  });

  describe('isPointInBoundingBox', () => {
    const box = { swLat: 47.4, swLng: 19.0, neLat: 47.6, neLng: 19.2 };

    it('should return true for point inside box', () => {
      expect(isPointInBoundingBox({ lat: 47.5, lng: 19.1 }, box)).toBe(true);
    });

    it('should return true for point on boundary', () => {
      expect(isPointInBoundingBox({ lat: 47.4, lng: 19.0 }, box)).toBe(true);
      expect(isPointInBoundingBox({ lat: 47.6, lng: 19.2 }, box)).toBe(true);
    });

    it('should return false for point outside box', () => {
      expect(isPointInBoundingBox({ lat: 47.7, lng: 19.1 }, box)).toBe(false);
      expect(isPointInBoundingBox({ lat: 47.5, lng: 18.9 }, box)).toBe(false);
    });
  });

  describe('filterByPolygon', () => {
    interface TestProperty {
      id: string;
      lat: number | null;
      lng: number | null;
    }

    const polygon: GeoPoint[] = [
      { lat: 47.4, lng: 19.0 },
      { lat: 47.4, lng: 19.2 },
      { lat: 47.6, lng: 19.2 },
      { lat: 47.6, lng: 19.0 },
    ];

    const properties: TestProperty[] = [
      { id: '1', lat: 47.5, lng: 19.1 }, // inside
      { id: '2', lat: 47.7, lng: 19.1 }, // outside (above)
      { id: '3', lat: 47.45, lng: 19.15 }, // inside
      { id: '4', lat: null, lng: null }, // no coordinates
      { id: '5', lat: 47.3, lng: 19.1 }, // outside (below)
    ];

    const getPoint = (p: TestProperty): GeoPoint | null =>
      p.lat !== null && p.lng !== null ? { lat: p.lat, lng: p.lng } : null;

    it('should filter properties by polygon', () => {
      const result = filterByPolygon(properties, polygon, getPoint);
      expect(result.map((p) => p.id)).toEqual(['1', '3']);
    });

    it('should return all items if polygon has less than 3 points', () => {
      const result = filterByPolygon(properties, [{ lat: 47.5, lng: 19.0 }], getPoint);
      expect(result.length).toBe(properties.length);
    });
  });

  describe('filterByRadius', () => {
    interface TestProperty {
      id: string;
      lat: number | null;
      lng: number | null;
    }

    const center: GeoPoint = { lat: 47.5, lng: 19.1 };
    const radiusKm = 10;

    const properties: TestProperty[] = [
      { id: '1', lat: 47.5, lng: 19.1 }, // at center (0 km)
      { id: '2', lat: 47.55, lng: 19.1 }, // ~5.5 km north (inside)
      { id: '3', lat: 47.7, lng: 19.1 }, // ~22 km north (outside)
      { id: '4', lat: null, lng: null }, // no coordinates
    ];

    const getPoint = (p: TestProperty): GeoPoint | null =>
      p.lat !== null && p.lng !== null ? { lat: p.lat, lng: p.lng } : null;

    it('should filter properties by radius', () => {
      const result = filterByRadius(properties, center, radiusKm, getPoint);
      expect(result.map((p) => p.id)).toEqual(['1', '2']);
    });

    it('should exclude properties without coordinates', () => {
      const result = filterByRadius(properties, center, radiusKm, getPoint);
      expect(result.find((p) => p.id === '4')).toBeUndefined();
    });
  });
});
