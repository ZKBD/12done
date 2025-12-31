import { Test, TestingModule } from '@nestjs/testing';
import { ListingType } from '@prisma/client';
import { VoiceSearchService } from './voice-search.service';

describe('VoiceSearchService', () => {
  let service: VoiceSearchService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VoiceSearchService],
    }).compile();

    service = module.get<VoiceSearchService>(VoiceSearchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('parse', () => {
    describe('city extraction', () => {
      it('should extract city from "apartments in Budapest"', () => {
        const result = service.parse('apartments in Budapest');
        expect(result.parsedCriteria.city).toBeDefined();
        expect(result.parsedCriteria.city?.value).toBe('Budapest');
        expect(result.parsedCriteria.city?.confidence).toBeGreaterThanOrEqual(0.85);
      });

      it('should extract city from "house in london"', () => {
        const result = service.parse('house in london');
        expect(result.parsedCriteria.city?.value).toBe('London');
      });

      it('should extract city from "property in New York"', () => {
        const result = service.parse('looking for a property in New York');
        expect(result.parsedCriteria.city?.value).toBe('New York');
      });

      it('should extract city when mentioned without "in"', () => {
        const result = service.parse('budapest apartments');
        expect(result.parsedCriteria.city?.value).toBe('Budapest');
      });
    });

    describe('country extraction', () => {
      it('should extract country from "property in Hungary"', () => {
        const result = service.parse('looking for property in hungary');
        expect(result.parsedCriteria.country?.value).toBe('HU');
      });

      it('should extract UK from "flat in united kingdom"', () => {
        const result = service.parse('flat in united kingdom');
        expect(result.parsedCriteria.country?.value).toBe('UK');
      });

      it('should extract US from "house in america"', () => {
        const result = service.parse('house in america');
        expect(result.parsedCriteria.country?.value).toBe('US');
      });
    });

    describe('price extraction', () => {
      it('should extract max price from "under 500k"', () => {
        const result = service.parse('apartment under 500k');
        expect(result.parsedCriteria.maxPrice?.value).toBe(500000);
      });

      it('should extract max price from "below 300 thousand"', () => {
        const result = service.parse('house below 300 thousand');
        expect(result.parsedCriteria.maxPrice?.value).toBe(300000);
      });

      it('should extract max price from "less than 1 million"', () => {
        const result = service.parse('property less than 1 million');
        expect(result.parsedCriteria.maxPrice?.value).toBe(1000000);
      });

      it('should extract min price from "over 200k"', () => {
        const result = service.parse('apartment over 200k');
        expect(result.parsedCriteria.minPrice?.value).toBe(200000);
      });

      it('should extract min price from "at least 100 thousand"', () => {
        const result = service.parse('at least 100 thousand euros');
        expect(result.parsedCriteria.minPrice?.value).toBe(100000);
      });

      it('should extract price range from "between 200 and 500 thousand"', () => {
        const result = service.parse('apartment between 200 and 500 thousand');
        expect(result.parsedCriteria.minPrice?.value).toBe(200000);
        expect(result.parsedCriteria.maxPrice?.value).toBe(500000);
      });

      it('should extract price range from "200k to 400k"', () => {
        const result = service.parse('house 200k to 400k');
        expect(result.parsedCriteria.minPrice?.value).toBe(200000);
        expect(result.parsedCriteria.maxPrice?.value).toBe(400000);
      });

      it('should handle euro symbol', () => {
        const result = service.parse('apartment under €500k');
        expect(result.parsedCriteria.maxPrice?.value).toBe(500000);
      });

      it('should handle dollar symbol', () => {
        const result = service.parse('house under $1m');
        expect(result.parsedCriteria.maxPrice?.value).toBe(1000000);
      });
    });

    describe('bedroom extraction', () => {
      it('should extract bedrooms from "3 bedroom apartment"', () => {
        const result = service.parse('3 bedroom apartment');
        expect(result.parsedCriteria.minBedrooms?.value).toBe(3);
      });

      it('should extract bedrooms from "2 bed flat"', () => {
        const result = service.parse('2 bed flat');
        expect(result.parsedCriteria.minBedrooms?.value).toBe(2);
      });

      it('should extract bedrooms from "4br house"', () => {
        const result = service.parse('4br house');
        expect(result.parsedCriteria.minBedrooms?.value).toBe(4);
      });

      it('should extract bedrooms from "at least 2 bedrooms"', () => {
        const result = service.parse('at least 2 bedrooms');
        expect(result.parsedCriteria.minBedrooms?.value).toBe(2);
        expect(result.parsedCriteria.minBedrooms?.confidence).toBeGreaterThanOrEqual(0.9);
      });
    });

    describe('bathroom extraction', () => {
      it('should extract bathrooms from "2 bathroom house"', () => {
        const result = service.parse('2 bathroom house');
        expect(result.parsedCriteria.minBathrooms?.value).toBe(2);
      });

      it('should extract bathrooms from "3 bath apartment"', () => {
        const result = service.parse('3 bath apartment');
        expect(result.parsedCriteria.minBathrooms?.value).toBe(3);
      });
    });

    describe('listing type extraction', () => {
      it('should extract FOR_SALE from "buy"', () => {
        const result = service.parse('I want to buy a house');
        expect(result.parsedCriteria.listingTypes?.value).toContain(ListingType.FOR_SALE);
      });

      it('should extract FOR_SALE from "for sale"', () => {
        const result = service.parse('apartment for sale');
        expect(result.parsedCriteria.listingTypes?.value).toContain(ListingType.FOR_SALE);
      });

      it('should extract LONG_TERM_RENT from "rent"', () => {
        const result = service.parse('apartment to rent');
        expect(result.parsedCriteria.listingTypes?.value).toContain(ListingType.LONG_TERM_RENT);
      });

      it('should extract SHORT_TERM_RENT from "vacation rental"', () => {
        const result = service.parse('vacation rental in spain');
        expect(result.parsedCriteria.listingTypes?.value).toContain(ListingType.SHORT_TERM_RENT);
      });

      it('should extract SHORT_TERM_RENT from "airbnb"', () => {
        const result = service.parse('airbnb in paris');
        expect(result.parsedCriteria.listingTypes?.value).toContain(ListingType.SHORT_TERM_RENT);
      });

      it('should extract EVENTS from "wedding venue"', () => {
        const result = service.parse('wedding venue');
        expect(result.parsedCriteria.listingTypes?.value).toContain(ListingType.EVENTS);
      });
    });

    describe('feature extraction', () => {
      it('should extract petFriendly from "pet friendly"', () => {
        const result = service.parse('pet friendly apartment');
        expect(result.parsedCriteria.petFriendly?.value).toBe(true);
      });

      it('should extract petFriendly from "pets allowed"', () => {
        const result = service.parse('house with pets allowed');
        expect(result.parsedCriteria.petFriendly?.value).toBe(true);
      });

      it('should extract newlyBuilt from "new build"', () => {
        const result = service.parse('new build apartment');
        expect(result.parsedCriteria.newlyBuilt?.value).toBe(true);
      });

      it('should extract accessible from "wheelchair accessible"', () => {
        const result = service.parse('wheelchair accessible flat');
        expect(result.parsedCriteria.accessible?.value).toBe(true);
      });
    });

    describe('square meters extraction', () => {
      it('should extract size from "100 sqm apartment"', () => {
        const result = service.parse('100 sqm apartment');
        expect(result.parsedCriteria.minSquareMeters?.value).toBe(100);
      });

      it('should extract size from "80 square meters"', () => {
        const result = service.parse('at least 80 square meters');
        expect(result.parsedCriteria.minSquareMeters?.value).toBe(80);
      });

      it('should extract size from "60 m2"', () => {
        const result = service.parse('60 m2 flat');
        expect(result.parsedCriteria.minSquareMeters?.value).toBe(60);
      });
    });

    describe('year built extraction', () => {
      it('should extract min year from "built after 2010"', () => {
        const result = service.parse('house built after 2010');
        expect(result.parsedCriteria.minYearBuilt?.value).toBe(2010);
      });

      it('should extract min year from "from 2015"', () => {
        const result = service.parse('apartment from 2015');
        expect(result.parsedCriteria.minYearBuilt?.value).toBe(2015);
      });

      it('should extract max year from "built before 1990"', () => {
        const result = service.parse('house built before 1990');
        expect(result.parsedCriteria.maxYearBuilt?.value).toBe(1990);
      });
    });

    describe('complex queries', () => {
      it('should parse "2 bedroom apartment in Budapest for under 300 thousand"', () => {
        const result = service.parse('2 bedroom apartment in Budapest for under 300 thousand');
        expect(result.parsedCriteria.minBedrooms?.value).toBe(2);
        expect(result.parsedCriteria.city?.value).toBe('Budapest');
        expect(result.parsedCriteria.maxPrice?.value).toBe(300000);
        expect(result.fieldCount).toBeGreaterThanOrEqual(3);
      });

      it('should parse "pet friendly 3 bed house to rent in london"', () => {
        const result = service.parse('pet friendly 3 bed house to rent in london');
        expect(result.parsedCriteria.petFriendly?.value).toBe(true);
        expect(result.parsedCriteria.minBedrooms?.value).toBe(3);
        expect(result.parsedCriteria.listingTypes?.value).toContain(ListingType.LONG_TERM_RENT);
        expect(result.parsedCriteria.city?.value).toBe('London');
      });

      it('should parse "new build accessible apartment in vienna between 200k and 400k"', () => {
        const result = service.parse('new build accessible apartment in vienna between 200k and 400k');
        expect(result.parsedCriteria.newlyBuilt?.value).toBe(true);
        expect(result.parsedCriteria.accessible?.value).toBe(true);
        expect(result.parsedCriteria.city?.value).toBe('Vienna');
        expect(result.parsedCriteria.minPrice?.value).toBe(200000);
        expect(result.parsedCriteria.maxPrice?.value).toBe(400000);
      });
    });

    describe('normalization', () => {
      it('should handle uppercase text', () => {
        const result = service.parse('APARTMENT IN BUDAPEST');
        expect(result.parsedCriteria.city?.value).toBe('Budapest');
      });

      it('should handle punctuation', () => {
        const result = service.parse("I'm looking for an apartment in Budapest!");
        expect(result.parsedCriteria.city?.value).toBe('Budapest');
      });

      it('should preserve original text in response', () => {
        const original = 'Looking for a 2 bed flat';
        const result = service.parse(original);
        expect(result.originalText).toBe(original);
      });

      it('should include normalized text in response', () => {
        const result = service.parse('Looking FOR a 2 BED flat!');
        expect(result.normalizedText).toBe('looking for a 2 bed flat');
      });
    });

    describe('confidence scoring', () => {
      it('should return overall confidence between 0 and 1', () => {
        const result = service.parse('2 bed apartment in Budapest under 500k');
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
      });

      it('should return 0 confidence for unparseable text', () => {
        const result = service.parse('hello world');
        expect(result.confidence).toBe(0);
        expect(result.fieldCount).toBe(0);
      });

      it('should return fieldCount matching parsed fields', () => {
        const result = service.parse('3 bed house in london');
        const expectedFields = Object.keys(result.parsedCriteria).filter(
          (k) => result.parsedCriteria[k as keyof typeof result.parsedCriteria] !== undefined,
        ).length;
        expect(result.fieldCount).toBe(expectedFields);
      });
    });

    describe('display text generation', () => {
      it('should generate display text for simple query', () => {
        const result = service.parse('apartments in Budapest');
        expect(result.suggestedDisplayText).toContain('Budapest');
      });

      it('should include bedroom count in display text', () => {
        const result = service.parse('3 bedroom apartment');
        expect(result.suggestedDisplayText).toContain('3+');
      });

      it('should include price in display text', () => {
        const result = service.parse('house under 500k');
        expect(result.suggestedDisplayText).toContain('500K');
      });

      it('should return "All properties" for empty parse', () => {
        const result = service.parse('hello');
        expect(result.suggestedDisplayText).toBe('All properties');
      });
    });

    describe('edge cases', () => {
      it('should handle empty string', () => {
        const result = service.parse('');
        expect(result.fieldCount).toBe(0);
        expect(result.confidence).toBe(0);
      });

      it('should handle whitespace only', () => {
        const result = service.parse('   ');
        expect(result.fieldCount).toBe(0);
      });

      it('should handle very long input', () => {
        const longText = 'apartment '.repeat(100) + 'in Budapest';
        const result = service.parse(longText);
        expect(result.parsedCriteria.city?.value).toBe('Budapest');
      });

      it('should not extract invalid bedroom count', () => {
        const result = service.parse('100 bedroom apartment');
        expect(result.parsedCriteria.minBedrooms).toBeUndefined();
      });

      it('should not extract invalid year', () => {
        const result = service.parse('built after 1500');
        expect(result.parsedCriteria.minYearBuilt).toBeUndefined();
      });
    });
  });

  describe('toPropertyQuery', () => {
    it('should convert parsed criteria to query object', () => {
      const parsed = service.parse('3 bed apartment in Budapest under 500k');
      const query = service.toPropertyQuery(parsed);

      expect(query.city).toBe('Budapest');
      expect(query.minBedrooms).toBe(3);
      expect(query.maxPrice).toBe(500000);
    });

    it('should only include defined fields', () => {
      const parsed = service.parse('apartment in london');
      const query = service.toPropertyQuery(parsed);

      expect(query.city).toBeDefined();
      expect(query.minBedrooms).toBeUndefined();
      expect(query.maxPrice).toBeUndefined();
    });

    it('should include all extracted features', () => {
      const parsed = service.parse('pet friendly new build accessible flat');
      const query = service.toPropertyQuery(parsed);

      expect(query.petFriendly).toBe(true);
      expect(query.newlyBuilt).toBe(true);
      expect(query.accessible).toBe(true);
    });

    it('should include listing types as array', () => {
      const parsed = service.parse('apartment to rent');
      const query = service.toPropertyQuery(parsed);

      expect(Array.isArray(query.listingTypes)).toBe(true);
      expect(query.listingTypes).toContain(ListingType.LONG_TERM_RENT);
    });
  });
});
