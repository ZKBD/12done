import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('SearchController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Test user credentials
  const testEmail = `search.test.${Date.now()}@example.com`;
  const testPassword = 'SecureP@ss123';

  let accessToken: string;
  let userId: string;
  let propertyId: string;
  let searchAgentId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();

    // Create and verify test user
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: testEmail,
        firstName: 'Search',
        lastName: 'Tester',
        password: testPassword,
        confirmPassword: testPassword,
      });

    const verificationToken = await prisma.emailVerificationToken.findFirst({
      where: { user: { email: testEmail } },
    });

    const verifyResponse = await request(app.getHttpServer())
      .post('/api/auth/verify-email')
      .send({ token: verificationToken!.token });

    accessToken = verifyResponse.body.tokens.accessToken;
    userId = verifyResponse.body.user.id;

    // Complete profile
    await request(app.getHttpServer())
      .post('/api/auth/complete-profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        address: '123 Test Street',
        postalCode: '1051',
        city: 'Budapest',
        country: 'HU',
        phone: '+36201234567',
      });

    // Login to get fresh token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: testEmail, password: testPassword });

    accessToken = loginResponse.body.tokens.accessToken;

    // Create a test property for favorites tests
    const propertyResponse = await request(app.getHttpServer())
      .post('/api/properties')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Test Property for Search',
        address: '456 Search Street',
        postalCode: '1012',
        city: 'Budapest',
        country: 'HU',
        listingTypes: ['FOR_SALE'],
        basePrice: '200000.00',
        currency: 'EUR',
        squareMeters: 75,
        bedrooms: 2,
        bathrooms: 1,
      });

    propertyId = propertyResponse.body.id;

    // Publish the property so it can be searched
    await request(app.getHttpServer())
      .patch(`/api/properties/${propertyId}/status`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'ACTIVE' });
  }, 60000);

  afterAll(async () => {
    // Clean up: delete properties first, then user
    if (userId) {
      await prisma.property.deleteMany({
        where: { ownerId: userId },
      });
      await prisma.user.delete({
        where: { id: userId },
      });
    }

    if (app) {
      await app.close();
    }
  });

  // ============ SEARCH AGENTS ============

  describe('POST /api/search-agents', () => {
    it('should create a search agent', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/search-agents')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Budapest Apartments',
          criteria: {
            city: 'Budapest',
            listingTypes: ['FOR_SALE'],
            minPrice: 100000,
            maxPrice: 300000,
          },
          emailNotifications: true,
          inAppNotifications: true,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Budapest Apartments');
      expect(response.body.isActive).toBe(true);
      expect(response.body.criteria).toHaveProperty('city', 'Budapest');
      searchAgentId = response.body.id;
    });

    it('should reject without authentication', () => {
      return request(app.getHttpServer())
        .post('/api/search-agents')
        .send({
          name: 'Unauthorized Agent',
          criteria: { city: 'Vienna' },
        })
        .expect(401);
    });

    it('should reject with missing required fields', () => {
      return request(app.getHttpServer())
        .post('/api/search-agents')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Missing Criteria',
        })
        .expect(400);
    });

    it('should create another search agent with different criteria', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/search-agents')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Large Properties',
          criteria: {
            minSquareMeters: 100,
            minBedrooms: 3,
          },
          emailNotifications: false,
          inAppNotifications: true,
        })
        .expect(201);

      expect(response.body.name).toBe('Large Properties');
      expect(response.body.emailNotifications).toBe(false);
    });
  });

  describe('GET /api/search-agents', () => {
    it('should list user\'s search agents', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/search-agents')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });

    it('should reject without authentication', () => {
      return request(app.getHttpServer())
        .get('/api/search-agents')
        .expect(401);
    });
  });

  describe('GET /api/search-agents/:id', () => {
    it('should get search agent by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/search-agents/${searchAgentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(searchAgentId);
      expect(response.body.name).toBe('Budapest Apartments');
    });

    it('should return 404 for non-existent search agent', () => {
      return request(app.getHttpServer())
        .get('/api/search-agents/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('PATCH /api/search-agents/:id', () => {
    it('should update search agent', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/search-agents/${searchAgentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Updated Budapest Search',
          emailNotifications: false,
        })
        .expect(200);

      expect(response.body.name).toBe('Updated Budapest Search');
      expect(response.body.emailNotifications).toBe(false);
    });

    it('should update search criteria', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/search-agents/${searchAgentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          criteria: {
            city: 'Budapest',
            listingTypes: ['FOR_SALE', 'LONG_TERM_RENT'],
            maxPrice: 400000,
          },
        })
        .expect(200);

      expect(response.body.criteria.maxPrice).toBe(400000);
    });
  });

  describe('POST /api/search-agents/:id/toggle-active', () => {
    it('should deactivate search agent', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/search-agents/${searchAgentId}/toggle-active`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ isActive: false })
        .expect(200);

      expect(response.body.isActive).toBe(false);
    });

    it('should activate search agent', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/search-agents/${searchAgentId}/toggle-active`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ isActive: true })
        .expect(200);

      expect(response.body.isActive).toBe(true);
    });
  });

  describe('POST /api/search-agents/:id/run', () => {
    it('should run search agent and return matching properties', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/search-agents/${searchAgentId}/run`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('propertyIds');
      expect(response.body).toHaveProperty('count');
      expect(Array.isArray(response.body.propertyIds)).toBe(true);
    });
  });

  // ============ SEARCH AGENT NOTIFICATIONS ============

  describe('Search Agent Notifications (PROD-041)', () => {
    let notificationAgentId: string;
    let notificationTestPropertyId: string;

    it('should create a search agent for notification testing', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/search-agents')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Vienna Notification Test',
          criteria: {
            city: 'Vienna',
            country: 'AT',
            listingTypes: ['FOR_SALE'],
            minPrice: 50000,
            maxPrice: 500000,
          },
          emailNotifications: true,
          inAppNotifications: true,
        })
        .expect(201);

      notificationAgentId = response.body.id;
      expect(response.body.isActive).toBe(true);
    });

    it('should create a matching property as DRAFT', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/properties')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Vienna Apartment for Notification Test',
          address: '123 Ringstrasse',
          postalCode: '1010',
          city: 'Vienna',
          country: 'AT',
          listingTypes: ['FOR_SALE'],
          basePrice: '250000.00',
          currency: 'EUR',
          squareMeters: 80,
          bedrooms: 2,
          bathrooms: 1,
        })
        .expect(201);

      notificationTestPropertyId = response.body.id;
      expect(response.body.status).toBe('DRAFT');
    });

    it('should create notification when property is published', async () => {
      // Get notification count before publishing
      const beforeNotifications = await request(app.getHttpServer())
        .get('/api/notifications')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const beforeCount = beforeNotifications.body.length;

      // Publish the property (should trigger search agent check)
      await request(app.getHttpServer())
        .patch(`/api/properties/${notificationTestPropertyId}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'ACTIVE' })
        .expect(200);

      // Wait for async notification to be created
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Get all notifications after publishing
      const afterNotifications = await request(app.getHttpServer())
        .get('/api/notifications')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(afterNotifications.body.length).toBeGreaterThan(beforeCount);

      // Verify the notification content
      const matchNotification = afterNotifications.body.find(
        (n: { type: string; data?: { searchAgentId?: string } }) =>
          n.type === 'SEARCH_AGENT_MATCH' &&
          n.data?.searchAgentId === notificationAgentId,
      );

      expect(matchNotification).toBeDefined();
      expect(matchNotification.title).toContain('Vienna Notification Test');
      expect(matchNotification.data.propertyId).toBe(notificationTestPropertyId);
    });

    it('should update lastTriggeredAt on search agent', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/search-agents/${notificationAgentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.lastTriggeredAt).toBeDefined();
    });

    it('should NOT create notification for non-matching property', async () => {
      // Create a property that doesn't match the search agent criteria
      const nonMatchingProperty = await request(app.getHttpServer())
        .post('/api/properties')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Prague Property (no match)',
          address: '123 Wenceslas Square',
          postalCode: '11000',
          city: 'Prague',
          country: 'CZ', // Different country - won't match Vienna search
          listingTypes: ['FOR_SALE'],
          basePrice: '150000.00',
        })
        .expect(201);

      const beforeStats = await request(app.getHttpServer())
        .get('/api/notifications/stats')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Publish the non-matching property
      await request(app.getHttpServer())
        .patch(`/api/properties/${nonMatchingProperty.body.id}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'ACTIVE' })
        .expect(200);

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const afterStats = await request(app.getHttpServer())
        .get('/api/notifications/stats')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Count should not increase (no new match notification)
      expect(afterStats.body.total).toBe(beforeStats.body.total);
    });

    // Cleanup
    afterAll(async () => {
      if (notificationAgentId) {
        await request(app.getHttpServer())
          .delete(`/api/search-agents/${notificationAgentId}`)
          .set('Authorization', `Bearer ${accessToken}`);
      }
    });
  });

  // ============ FAVORITES ============

  describe('POST /api/favorites/:propertyId', () => {
    it('should add property to favorites', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/favorites/${propertyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.propertyId).toBe(propertyId);
    });

    it('should reject adding same property again', () => {
      return request(app.getHttpServer())
        .post(`/api/favorites/${propertyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(409);
    });

    it('should reject without authentication', () => {
      return request(app.getHttpServer())
        .post(`/api/favorites/${propertyId}`)
        .expect(401);
    });

    it('should reject for non-existent property', () => {
      return request(app.getHttpServer())
        .post('/api/favorites/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('GET /api/favorites', () => {
    it('should list user\'s favorites', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/favorites')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('propertyId', propertyId);
    });

    it('should reject without authentication', () => {
      return request(app.getHttpServer())
        .get('/api/favorites')
        .expect(401);
    });
  });

  describe('GET /api/favorites/ids', () => {
    it('should return list of favorite property IDs', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/favorites/ids')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toContain(propertyId);
    });
  });

  describe('GET /api/favorites/stats', () => {
    it('should return favorite statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/favorites/stats')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body.total).toBeGreaterThan(0);
      expect(response.body).toHaveProperty('byListingType');
    });
  });

  describe('GET /api/favorites/:propertyId/check', () => {
    it('should return true for favorited property', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/favorites/${propertyId}/check`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.isFavorite).toBe(true);
    });

    it('should return false for non-favorited property', async () => {
      // Create another property
      const anotherProperty = await request(app.getHttpServer())
        .post('/api/properties')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Another Property',
          address: '789 Other Street',
          postalCode: '1013',
          city: 'Vienna',
          country: 'AT',
          listingTypes: ['FOR_SALE'],
          basePrice: '150000.00',
        });

      const response = await request(app.getHttpServer())
        .get(`/api/favorites/${anotherProperty.body.id}/check`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.isFavorite).toBe(false);
    });
  });

  describe('POST /api/favorites/:propertyId/toggle', () => {
    it('should toggle favorite off', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/favorites/${propertyId}/toggle`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.isFavorite).toBe(false);
    });

    it('should toggle favorite on', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/favorites/${propertyId}/toggle`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.isFavorite).toBe(true);
    });
  });

  describe('DELETE /api/favorites/:propertyId', () => {
    it('should remove property from favorites', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/favorites/${propertyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 404 when removing non-favorited property', () => {
      return request(app.getHttpServer())
        .delete(`/api/favorites/${propertyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  // ============ VOICE SEARCH (PROD-044) ============

  describe('POST /api/voice-search/parse (PROD-044.3)', () => {
    it('should parse simple city search', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/voice-search/parse')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ transcript: 'apartments in Budapest' })
        .expect(200);

      expect(response.body).toHaveProperty('originalText', 'apartments in Budapest');
      expect(response.body).toHaveProperty('parsedCriteria');
      expect(response.body.parsedCriteria.city?.value).toBe('Budapest');
      expect(response.body).toHaveProperty('confidence');
      expect(response.body).toHaveProperty('suggestedDisplayText');
    });

    it('should parse complex multi-criteria query', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/voice-search/parse')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ transcript: '3 bedroom apartment in Vienna under 400k' })
        .expect(200);

      expect(response.body.parsedCriteria.minBedrooms?.value).toBe(3);
      expect(response.body.parsedCriteria.city?.value).toBe('Vienna');
      expect(response.body.parsedCriteria.maxPrice?.value).toBe(400000);
      expect(response.body.fieldCount).toBeGreaterThanOrEqual(3);
    });

    it('should parse listing type from "to rent"', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/voice-search/parse')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ transcript: 'house to rent in london' })
        .expect(200);

      expect(response.body.parsedCriteria.listingTypes?.value).toContain(
        'LONG_TERM_RENT',
      );
      expect(response.body.parsedCriteria.city?.value).toBe('London');
    });

    it('should parse features like pet friendly', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/voice-search/parse')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ transcript: 'pet friendly new build apartment' })
        .expect(200);

      expect(response.body.parsedCriteria.petFriendly?.value).toBe(true);
      expect(response.body.parsedCriteria.newlyBuilt?.value).toBe(true);
    });

    it('should return 0 confidence for unparseable text', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/voice-search/parse')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ transcript: 'hello world how are you' })
        .expect(200);

      expect(response.body.confidence).toBe(0);
      expect(response.body.fieldCount).toBe(0);
      expect(response.body.suggestedDisplayText).toBe('All properties');
    });

    it('should reject without authentication', () => {
      return request(app.getHttpServer())
        .post('/api/voice-search/parse')
        .send({ transcript: 'apartments in budapest' })
        .expect(401);
    });

    it('should reject empty transcript', () => {
      return request(app.getHttpServer())
        .post('/api/voice-search/parse')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ transcript: '' })
        .expect(400);
    });

    it('should reject missing transcript', () => {
      return request(app.getHttpServer())
        .post('/api/voice-search/parse')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);
    });
  });

  describe('POST /api/voice-search/to-query (PROD-044.4)', () => {
    it('should convert transcript to query parameters', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/voice-search/to-query')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ transcript: '2 bed apartment in Budapest for sale under 300k' })
        .expect(200);

      expect(response.body).toHaveProperty('parsed');
      expect(response.body).toHaveProperty('query');
      expect(response.body.query.city).toBe('Budapest');
      expect(response.body.query.minBedrooms).toBe(2);
      expect(response.body.query.maxPrice).toBe(300000);
      expect(response.body.query.listingTypes).toContain('FOR_SALE');
    });

    it('should include boolean features in query', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/voice-search/to-query')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ transcript: 'wheelchair accessible pet friendly flat' })
        .expect(200);

      expect(response.body.query.accessible).toBe(true);
      expect(response.body.query.petFriendly).toBe(true);
    });

    it('should return empty query for unparseable text', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/voice-search/to-query')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ transcript: 'random text without property info' })
        .expect(200);

      expect(response.body.parsed.confidence).toBe(0);
      expect(Object.keys(response.body.query).length).toBe(0);
    });

    it('should reject without authentication', () => {
      return request(app.getHttpServer())
        .post('/api/voice-search/to-query')
        .send({ transcript: 'apartments' })
        .expect(401);
    });
  });

  // ============ VISUAL SEARCH (PROD-045) ============

  describe('POST /api/visual-search (PROD-045)', () => {
    // Create a simple test image buffer (100x100 red square as JPEG)
    const createTestImageBuffer = (): Buffer => {
      // Minimal valid JPEG (1x1 red pixel)
      return Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01,
        0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08,
        0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a,
        0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12, 0x13, 0x0f, 0x14, 0x1d,
        0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20, 0x22,
        0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34,
        0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0,
        0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4,
        0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06,
        0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xc4, 0x00, 0xb5, 0x10, 0x00, 0x02, 0x01,
        0x03, 0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7d,
        0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06, 0x13,
        0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xa1, 0x08, 0x23, 0x42,
        0xb1, 0xc1, 0x15, 0x52, 0xd1, 0xf0, 0x24, 0x33, 0x62, 0x72, 0x82, 0x09, 0x0a,
        0x16, 0x17, 0x18, 0x19, 0x1a, 0x25, 0x26, 0x27, 0x28, 0x29, 0x2a, 0x34, 0x35,
        0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4a,
        0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5a, 0x63, 0x64, 0x65, 0x66, 0x67,
        0x68, 0x69, 0x6a, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7a, 0x83, 0x84,
        0x85, 0x86, 0x87, 0x88, 0x89, 0x8a, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98,
        0x99, 0x9a, 0xa2, 0xa3, 0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xb2, 0xb3,
        0xb4, 0xb5, 0xb6, 0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7,
        0xc8, 0xc9, 0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe1,
        0xe2, 0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xf1, 0xf2, 0xf3, 0xf4,
        0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00,
        0x00, 0x3f, 0x00, 0xfb, 0xd5, 0xdb, 0x20, 0xa8, 0xf3, 0xff, 0xd9,
      ]);
    };

    it('should require authentication', () => {
      return request(app.getHttpServer())
        .post('/api/visual-search')
        .attach('image', createTestImageBuffer(), 'test.jpg')
        .expect(401);
    });

    it('should reject request without image file', () => {
      return request(app.getHttpServer())
        .post('/api/visual-search')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('should reject non-image file', () => {
      return request(app.getHttpServer())
        .post('/api/visual-search')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('image', Buffer.from('not an image'), {
          filename: 'test.txt',
          contentType: 'text/plain',
        })
        .expect(400);
    });

    it('should accept valid JPEG image and return results', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/visual-search')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('image', createTestImageBuffer(), {
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        })
        .expect(200);

      expect(response.body).toHaveProperty('results');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('uploadedImageFeatures');
      expect(response.body).toHaveProperty('processingTimeMs');
      expect(Array.isArray(response.body.results)).toBe(true);
    });

    it('should respect limit query parameter', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/visual-search')
        .query({ limit: 5 })
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('image', createTestImageBuffer(), {
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        })
        .expect(200);

      expect(response.body.results.length).toBeLessThanOrEqual(5);
    });

    it('should respect minSimilarity query parameter', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/visual-search')
        .query({ minSimilarity: 0.9 })
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('image', createTestImageBuffer(), {
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        })
        .expect(200);

      // All results should have similarity >= 0.9
      response.body.results.forEach((result: { similarity: number }) => {
        expect(result.similarity).toBeGreaterThanOrEqual(0.9);
      });
    });

    it('should return uploaded image features', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/visual-search')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('image', createTestImageBuffer(), {
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        })
        .expect(200);

      expect(response.body.uploadedImageFeatures).toHaveProperty('pHash');
      expect(response.body.uploadedImageFeatures).toHaveProperty('dominantColors');
      expect(response.body.uploadedImageFeatures).toHaveProperty('aspectRatio');
      expect(response.body.uploadedImageFeatures).toHaveProperty('brightness');
    });
  });

  describe('GET /api/visual-search/stats (PROD-045)', () => {
    it('should require authentication', () => {
      return request(app.getHttpServer())
        .get('/api/visual-search/stats')
        .expect(401);
    });

    it('should return indexing statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/visual-search/stats')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalMedia');
      expect(response.body).toHaveProperty('indexedMedia');
      expect(response.body).toHaveProperty('unindexedMedia');
      expect(response.body).toHaveProperty('indexedPercentage');
      expect(typeof response.body.totalMedia).toBe('number');
      expect(typeof response.body.indexedMedia).toBe('number');
    });
  });

  // ============ SEARCH AGENT CLEANUP ============

  describe('DELETE /api/search-agents/:id', () => {
    it('should delete search agent', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/search-agents/${searchAgentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 404 for already deleted search agent', () => {
      return request(app.getHttpServer())
        .delete(`/api/search-agents/${searchAgentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});
