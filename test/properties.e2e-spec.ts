import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('PropertiesController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Test user credentials
  const testEmail = `property.test.${Date.now()}@example.com`;
  const testPassword = 'SecureP@ss123';

  // Second user for cross-user tests
  const otherEmail = `other.user.${Date.now()}@example.com`;

  let accessToken: string;
  let otherAccessToken: string;
  let propertyId: string;
  let availabilitySlotId: string;
  let inspectionSlotId: string;
  let pricingRuleId: string;
  let mediaId: string;
  let floorPlanId: string;

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
        firstName: 'Property',
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

    // Create second user for cross-user tests
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: otherEmail,
        firstName: 'Other',
        lastName: 'User',
        password: testPassword,
        confirmPassword: testPassword,
      });

    const otherVerificationToken = await prisma.emailVerificationToken.findFirst({
      where: { user: { email: otherEmail } },
    });

    const otherVerifyResponse = await request(app.getHttpServer())
      .post('/api/auth/verify-email')
      .send({ token: otherVerificationToken!.token });

    otherAccessToken = otherVerifyResponse.body.tokens.accessToken;

    await request(app.getHttpServer())
      .post('/api/auth/complete-profile')
      .set('Authorization', `Bearer ${otherAccessToken}`)
      .send({
        address: '456 Other Street',
        postalCode: '1052',
        city: 'Vienna',
        country: 'AT',
        phone: '+43201234567',
      });

    const otherLoginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: otherEmail, password: testPassword });

    otherAccessToken = otherLoginResponse.body.tokens.accessToken;
  }, 60000);

  afterAll(async () => {
    // Clean up: delete properties first due to FK constraints
    const users = await prisma.user.findMany({
      where: { email: { in: [testEmail, otherEmail] } },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);

    if (userIds.length > 0) {
      await prisma.property.deleteMany({
        where: { ownerId: { in: userIds } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: userIds } },
      });
    }

    if (app) {
      await app.close();
    }
  });

  // ============ PROPERTY CRUD ============

  describe('POST /api/properties', () => {
    it('should create a property', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/properties')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Test Apartment in Budapest',
          address: '123 Test Street',
          postalCode: '1011',
          city: 'Budapest',
          country: 'HU',
          listingTypes: ['FOR_SALE', 'LONG_TERM_RENT'],
          basePrice: '250000.00',
          currency: 'EUR',
          squareMeters: 85,
          bedrooms: 3,
          bathrooms: 2,
          description: 'Beautiful test apartment',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('Test Apartment in Budapest');
      expect(response.body.status).toBe('DRAFT');
      propertyId = response.body.id;
    });

    it('should reject creating property without authentication', () => {
      return request(app.getHttpServer())
        .post('/api/properties')
        .send({
          title: 'Unauthorized Property',
          address: '123 Test Street',
          postalCode: '1011',
          city: 'Budapest',
          country: 'HU',
          listingTypes: ['FOR_SALE'],
          basePrice: '100000.00',
        })
        .expect(401);
    });

    it('should reject creating property with missing required fields', () => {
      return request(app.getHttpServer())
        .post('/api/properties')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Incomplete Property',
        })
        .expect(400);
    });
  });

  describe('GET /api/properties', () => {
    it('should list properties', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/properties')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter properties by city', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/properties')
        .query({ city: 'Budapest' })
        .expect(200);

      expect(response.body.data.every((p: any) => p.city === 'Budapest')).toBe(true);
    });

    it('should filter properties by listing type', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/properties')
        .query({ listingTypes: ['FOR_SALE'] })
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/properties/my', () => {
    it('should list user\'s own properties', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/properties/my')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should reject without authentication', () => {
      return request(app.getHttpServer())
        .get('/api/properties/my')
        .expect(401);
    });
  });

  describe('GET /api/properties/:id', () => {
    it('should get own draft property with auth', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/properties/${propertyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(propertyId);
      expect(response.body.title).toBe('Test Apartment in Budapest');
    });

    it('should reject draft property access from non-owner', async () => {
      return request(app.getHttpServer())
        .get(`/api/properties/${propertyId}`)
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent property', () => {
      return request(app.getHttpServer())
        .get('/api/properties/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  describe('PATCH /api/properties/:id', () => {
    it('should update property', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/properties/${propertyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Updated Test Apartment' })
        .expect(200);

      expect(response.body.title).toBe('Updated Test Apartment');
    });

    it('should reject update from non-owner', () => {
      return request(app.getHttpServer())
        .patch(`/api/properties/${propertyId}`)
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .send({ title: 'Hijacked Title' })
        .expect(403);
    });
  });

  describe('PATCH /api/properties/:id/status', () => {
    it('should update property status to ACTIVE', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/properties/${propertyId}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'ACTIVE' })
        .expect(200);

      expect(response.body.status).toBe('ACTIVE');
    });
  });

  // ============ AVAILABILITY ============

  describe('POST /api/properties/:id/availability', () => {
    it('should create availability slot', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);
      const startDate = futureDate.toISOString().split('T')[0];
      futureDate.setDate(futureDate.getDate() + 7);
      const endDate = futureDate.toISOString().split('T')[0];

      const response = await request(app.getHttpServer())
        .post(`/api/properties/${propertyId}/availability`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          startDate,
          endDate,
          isAvailable: true,
          pricePerNight: '100.00',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.isAvailable).toBe(true);
      availabilitySlotId = response.body.id;
    });

    it('should reject from non-owner', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 2);
      const startDate = futureDate.toISOString().split('T')[0];
      futureDate.setDate(futureDate.getDate() + 7);
      const endDate = futureDate.toISOString().split('T')[0];

      return request(app.getHttpServer())
        .post(`/api/properties/${propertyId}/availability`)
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .send({
          startDate,
          endDate,
          isAvailable: true,
        })
        .expect(403);
    });
  });

  describe('GET /api/properties/:id/availability', () => {
    it('should get availability slots', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/properties/${propertyId}/availability`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('PATCH /api/properties/:id/availability/:slotId', () => {
    it('should update availability slot', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/properties/${propertyId}/availability/${availabilitySlotId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ pricePerNight: '120.00' })
        .expect(200);

      expect(parseFloat(response.body.pricePerNight)).toBe(120);
    });
  });

  describe('POST /api/properties/:id/availability/calculate-cost', () => {
    it('should calculate rental cost', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);
      const checkIn = futureDate.toISOString().split('T')[0];
      futureDate.setDate(futureDate.getDate() + 3);
      const checkOut = futureDate.toISOString().split('T')[0];

      const response = await request(app.getHttpServer())
        .post(`/api/properties/${propertyId}/availability/calculate-cost`)
        .send({ checkIn, checkOut })
        .expect(200);

      expect(response.body).toHaveProperty('nights');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('breakdown');
    });
  });

  // ============ INSPECTIONS ============

  describe('POST /api/properties/:id/inspections', () => {
    it('should create inspection slot', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);
      const date = futureDate.toISOString().split('T')[0];

      const response = await request(app.getHttpServer())
        .post(`/api/properties/${propertyId}/inspections`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          date,
          startTime: '10:00',
          endTime: '11:00',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.isBooked).toBe(false);
      inspectionSlotId = response.body.id;
    });
  });

  describe('GET /api/properties/:id/inspections', () => {
    it('should get inspection slots', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/properties/${propertyId}/inspections`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /api/properties/:id/inspections/:slotId/book', () => {
    it('should book inspection slot', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/properties/${propertyId}/inspections/${inspectionSlotId}/book`)
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .expect(200);

      expect(response.body.isBooked).toBe(true);
    });

    it('should reject owner booking own property', async () => {
      // Create another slot for this test
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);
      futureDate.setDate(futureDate.getDate() + 1);
      const date = futureDate.toISOString().split('T')[0];

      const slotResponse = await request(app.getHttpServer())
        .post(`/api/properties/${propertyId}/inspections`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          date,
          startTime: '14:00',
          endTime: '15:00',
        });

      return request(app.getHttpServer())
        .post(`/api/properties/${propertyId}/inspections/${slotResponse.body.id}/book`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });
  });

  describe('POST /api/properties/:id/inspections/:slotId/cancel', () => {
    it('should cancel inspection booking', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/properties/${propertyId}/inspections/${inspectionSlotId}/cancel`)
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .expect(200);

      expect(response.body.isBooked).toBe(false);
    });
  });

  // ============ DYNAMIC PRICING ============

  describe('POST /api/properties/:id/pricing/rules', () => {
    it('should create pricing rule', async () => {
      // First enable dynamic pricing
      await request(app.getHttpServer())
        .patch(`/api/properties/${propertyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ dynamicPricingEnabled: true });

      const response = await request(app.getHttpServer())
        .post(`/api/properties/${propertyId}/pricing/rules`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Weekend Premium',
          dayOfWeek: 6,
          priceMultiplier: '1.25',
          isActive: true,
          priority: 1,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Weekend Premium');
      pricingRuleId = response.body.id;
    });
  });

  describe('GET /api/properties/:id/pricing/rules', () => {
    it('should get pricing rules', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/properties/${propertyId}/pricing/rules`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('PATCH /api/properties/:id/pricing/rules/:ruleId', () => {
    it('should update pricing rule', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/properties/${propertyId}/pricing/rules/${pricingRuleId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ priceMultiplier: '1.30' })
        .expect(200);

      expect(parseFloat(response.body.priceMultiplier)).toBe(1.3);
    });
  });

  // ============ MEDIA ============

  describe('POST /api/properties/:id/media', () => {
    it('should add media to property', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/properties/${propertyId}/media`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          type: 'photo',
          url: 'https://example.com/photo1.jpg',
          caption: 'Living room',
          sortOrder: 0,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.type).toBe('photo');
      mediaId = response.body.id;
    });
  });

  describe('GET /api/properties/:id/media', () => {
    it('should get property media', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/properties/${propertyId}/media`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('PATCH /api/properties/:id/media/:mediaId', () => {
    it('should update media', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/properties/${propertyId}/media/${mediaId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ caption: 'Updated living room' })
        .expect(200);

      expect(response.body.caption).toBe('Updated living room');
    });
  });

  describe('POST /api/properties/:id/media/:mediaId/set-primary', () => {
    it('should set media as primary', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/properties/${propertyId}/media/${mediaId}/set-primary`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.isPrimary).toBe(true);
    });
  });

  // ============ FLOOR PLANS ============

  describe('POST /api/properties/:id/floor-plans', () => {
    it('should add floor plan', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/properties/${propertyId}/floor-plans`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Ground Floor',
          imageUrl: 'https://example.com/floorplan1.jpg',
          sortOrder: 0,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Ground Floor');
      floorPlanId = response.body.id;
    });
  });

  describe('GET /api/properties/:id/floor-plans', () => {
    it('should get floor plans', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/properties/${propertyId}/floor-plans`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('PATCH /api/properties/:id/floor-plans/:floorPlanId', () => {
    it('should update floor plan', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/properties/${propertyId}/floor-plans/${floorPlanId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Main Floor' })
        .expect(200);

      expect(response.body.name).toBe('Main Floor');
    });
  });

  // ============ CLEANUP TESTS ============

  describe('DELETE /api/properties/:id/floor-plans/:floorPlanId', () => {
    it('should delete floor plan', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/properties/${propertyId}/floor-plans/${floorPlanId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('DELETE /api/properties/:id/media/:mediaId', () => {
    it('should delete media', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/properties/${propertyId}/media/${mediaId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('DELETE /api/properties/:id/pricing/rules/:ruleId', () => {
    it('should delete pricing rule', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/properties/${propertyId}/pricing/rules/${pricingRuleId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('DELETE /api/properties/:id/inspections/:slotId', () => {
    it('should delete inspection slot', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/properties/${propertyId}/inspections/${inspectionSlotId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('DELETE /api/properties/:id/availability/:slotId', () => {
    it('should delete availability slot', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/properties/${propertyId}/availability/${availabilitySlotId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('DELETE /api/properties/:id', () => {
    it('should soft delete property', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/properties/${propertyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    it('should reject delete from non-owner', async () => {
      // Create another property to test deletion rejection
      const createResponse = await request(app.getHttpServer())
        .post('/api/properties')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Another Property',
          address: '789 Test Ave',
          postalCode: '1012',
          city: 'Budapest',
          country: 'HU',
          listingTypes: ['FOR_SALE'],
          basePrice: '300000.00',
        });

      return request(app.getHttpServer())
        .delete(`/api/properties/${createResponse.body.id}`)
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .expect(403);
    });
  });

  // PROD-026: No Agents Tag
  describe('No Agents Tag (PROD-026)', () => {
    const agentEmail = `agent.${Date.now()}@example.com`;
    let agentAccessToken: string;
    let noAgentsPropertyId: string;

    beforeAll(async () => {
      // Create and verify agent user
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: agentEmail,
          firstName: 'Agent',
          lastName: 'User',
          password: testPassword,
          confirmPassword: testPassword,
        });

      const agentVerificationToken = await prisma.emailVerificationToken.findFirst({
        where: { user: { email: agentEmail } },
      });

      const agentVerifyResponse = await request(app.getHttpServer())
        .post('/api/auth/verify-email')
        .send({ token: agentVerificationToken!.token });

      agentAccessToken = agentVerifyResponse.body.tokens.accessToken;

      // Complete agent profile
      await request(app.getHttpServer())
        .post('/api/auth/complete-profile')
        .set('Authorization', `Bearer ${agentAccessToken}`)
        .send({
          address: '456 Agent Street',
          postalCode: '1052',
          city: 'Budapest',
          country: 'HU',
          phone: '+36209876543',
        });

      // Set user role to AGENT
      const agentUser = await prisma.user.findUnique({
        where: { email: agentEmail },
      });
      await prisma.user.update({
        where: { id: agentUser!.id },
        data: { role: 'AGENT' },
      });

      // Login again to get token with updated role
      const agentLoginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: agentEmail, password: testPassword });

      agentAccessToken = agentLoginResponse.body.tokens.accessToken;

      // Create a noAgents property as regular user
      const noAgentsPropertyResponse = await request(app.getHttpServer())
        .post('/api/properties')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'No Agents Property',
          address: '999 No Agents Lane',
          postalCode: '1099',
          city: 'Budapest',
          country: 'HU',
          listingTypes: ['FOR_SALE'],
          basePrice: '500000.00',
          noAgents: true,
        });

      noAgentsPropertyId = noAgentsPropertyResponse.body.id;

      // Publish the property
      await request(app.getHttpServer())
        .patch(`/api/properties/${noAgentsPropertyId}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'ACTIVE' });
    });

    it('should exclude noAgents properties from AGENT search results', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/properties')
        .set('Authorization', `Bearer ${agentAccessToken}`)
        .query({ city: 'Budapest' })
        .expect(200);

      const propertyIds = response.body.data.map((p: { id: string }) => p.id);
      expect(propertyIds).not.toContain(noAgentsPropertyId);
    });

    it('should show noAgents properties to regular USER in search', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/properties')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ city: 'Budapest' })
        .expect(200);

      const propertyIds = response.body.data.map((p: { id: string }) => p.id);
      expect(propertyIds).toContain(noAgentsPropertyId);
    });

    it('should block AGENT from viewing noAgents property directly', async () => {
      await request(app.getHttpServer())
        .get(`/api/properties/${noAgentsPropertyId}`)
        .set('Authorization', `Bearer ${agentAccessToken}`)
        .expect(403);
    });

    it('should allow regular USER to view noAgents property', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/properties/${noAgentsPropertyId}`)
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .expect(200);

      expect(response.body.noAgents).toBe(true);
    });
  });

  // PROD-043: Geo-based Search
  describe('Geo-based Search (PROD-043)', () => {
    let geoPropertyId: string;

    beforeAll(async () => {
      // Create a property with specific coordinates for geo testing
      const propertyResponse = await request(app.getHttpServer())
        .post('/api/properties')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Geo Test Property in Budapest',
          address: '1 Andrassy ut',
          postalCode: '1061',
          city: 'Budapest',
          country: 'HU',
          latitude: 47.5025,
          longitude: 19.0640,
          listingTypes: ['FOR_SALE'],
          basePrice: '500000.00',
        });

      geoPropertyId = propertyResponse.body.id;

      // Publish the property
      await request(app.getHttpServer())
        .patch(`/api/properties/${geoPropertyId}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'ACTIVE' });
    });

    // PROD-043.6: Bounding box / viewport search
    it('should find property within bounding box', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/properties')
        .query({
          swLat: 47.4,
          swLng: 19.0,
          neLat: 47.6,
          neLng: 19.2,
        })
        .expect(200);

      const propertyIds = response.body.data.map((p: { id: string }) => p.id);
      expect(propertyIds).toContain(geoPropertyId);
    });

    it('should NOT find property outside bounding box', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/properties')
        .query({
          swLat: 48.0,
          swLng: 20.0,
          neLat: 48.5,
          neLng: 20.5,
        })
        .expect(200);

      const propertyIds = response.body.data.map((p: { id: string }) => p.id);
      expect(propertyIds).not.toContain(geoPropertyId);
    });

    // PROD-043: Radius search
    it('should find property within radius', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/properties')
        .query({
          centerLat: 47.5,
          centerLng: 19.05,
          radiusKm: 5,
        })
        .expect(200);

      const propertyIds = response.body.data.map((p: { id: string }) => p.id);
      expect(propertyIds).toContain(geoPropertyId);
    });

    it('should NOT find property outside radius', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/properties')
        .query({
          centerLat: 48.2,
          centerLng: 16.4, // Vienna
          radiusKm: 5,
        })
        .expect(200);

      const propertyIds = response.body.data.map((p: { id: string }) => p.id);
      expect(propertyIds).not.toContain(geoPropertyId);
    });

    // PROD-043.5: Polygon search
    it('should find property within polygon', async () => {
      const polygon = JSON.stringify([
        { lat: 47.4, lng: 19.0 },
        { lat: 47.6, lng: 19.0 },
        { lat: 47.6, lng: 19.2 },
        { lat: 47.4, lng: 19.2 },
      ]);

      const response = await request(app.getHttpServer())
        .get('/api/properties')
        .query({ polygon })
        .expect(200);

      const propertyIds = response.body.data.map((p: { id: string }) => p.id);
      expect(propertyIds).toContain(geoPropertyId);
    });

    it('should NOT find property outside polygon', async () => {
      const polygon = JSON.stringify([
        { lat: 48.0, lng: 20.0 },
        { lat: 48.5, lng: 20.0 },
        { lat: 48.5, lng: 20.5 },
        { lat: 48.0, lng: 20.5 },
      ]);

      const response = await request(app.getHttpServer())
        .get('/api/properties')
        .query({ polygon })
        .expect(200);

      const propertyIds = response.body.data.map((p: { id: string }) => p.id);
      expect(propertyIds).not.toContain(geoPropertyId);
    });

    // Combined filters
    it('should combine geo filters with other filters', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/properties')
        .query({
          city: 'Budapest',
          centerLat: 47.5,
          centerLng: 19.05,
          radiusKm: 10,
          minPrice: 100000,
          maxPrice: 1000000,
        })
        .expect(200);

      const propertyIds = response.body.data.map((p: { id: string }) => p.id);
      expect(propertyIds).toContain(geoPropertyId);
    });
  });

  // PROD-048: Open House Events
  describe('Open House Events (PROD-048)', () => {
    let openHousePropertyId: string;
    let openHouseEventId: string;

    beforeAll(async () => {
      // Create a property for open house tests
      const propertyResponse = await request(app.getHttpServer())
        .post('/api/properties')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Open House Test Property',
          address: '123 Open House Lane',
          postalCode: '1100',
          city: 'Budapest',
          country: 'HU',
          listingTypes: ['FOR_SALE'],
          basePrice: '600000.00',
        });

      openHousePropertyId = propertyResponse.body.id;

      // Publish the property
      await request(app.getHttpServer())
        .patch(`/api/properties/${openHousePropertyId}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'ACTIVE' });
    });

    it('should create an open house event', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const dateStr = futureDate.toISOString().split('T')[0];

      const response = await request(app.getHttpServer())
        .post(`/api/properties/${openHousePropertyId}/open-houses`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          date: dateStr,
          startTime: '10:00',
          endTime: '14:00',
          description: 'Welcome to our open house!',
          isPublic: true,
          maxAttendees: 20,
        })
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.startTime).toBe('10:00');
      expect(response.body.endTime).toBe('14:00');
      expect(response.body.isPublic).toBe(true);
      expect(response.body.maxAttendees).toBe(20);
      openHouseEventId = response.body.id;
    });

    it('should get open house events for a property', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/properties/${openHousePropertyId}/open-houses`)
        .expect(200);

      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(response.body[0].propertyId).toBe(openHousePropertyId);
    });

    it('should get a specific open house event', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/properties/${openHousePropertyId}/open-houses/${openHouseEventId}`)
        .expect(200);

      expect(response.body.id).toBe(openHouseEventId);
    });

    it('should update an open house event', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/properties/${openHousePropertyId}/open-houses/${openHouseEventId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          description: 'Updated open house description',
          maxAttendees: 30,
        })
        .expect(200);

      expect(response.body.description).toBe('Updated open house description');
      expect(response.body.maxAttendees).toBe(30);
    });

    it('should filter properties with upcoming open house events', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/properties')
        .query({ hasUpcomingOpenHouse: true, city: 'Budapest' })
        .expect(200);

      const propertyIds = response.body.data.map((p: { id: string }) => p.id);
      expect(propertyIds).toContain(openHousePropertyId);
    });

    it('should reject overlapping open house events', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const dateStr = futureDate.toISOString().split('T')[0];

      await request(app.getHttpServer())
        .post(`/api/properties/${openHousePropertyId}/open-houses`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          date: dateStr,
          startTime: '12:00',
          endTime: '16:00', // Overlaps with 10:00-14:00
        })
        .expect(400);
    });

    it('should reject open house with end time before start time', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 14);
      const dateStr = futureDate.toISOString().split('T')[0];

      await request(app.getHttpServer())
        .post(`/api/properties/${openHousePropertyId}/open-houses`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          date: dateStr,
          startTime: '14:00',
          endTime: '10:00',
        })
        .expect(400);
    });

    it('should not allow non-owner to create open house event', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 21);
      const dateStr = futureDate.toISOString().split('T')[0];

      await request(app.getHttpServer())
        .post(`/api/properties/${openHousePropertyId}/open-houses`)
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .send({
          date: dateStr,
          startTime: '10:00',
          endTime: '14:00',
        })
        .expect(403);
    });

    it('should delete an open house event', async () => {
      await request(app.getHttpServer())
        .delete(`/api/properties/${openHousePropertyId}/open-houses/${openHouseEventId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Verify it's deleted
      await request(app.getHttpServer())
        .get(`/api/properties/${openHousePropertyId}/open-houses/${openHouseEventId}`)
        .expect(404);
    });
  });
});
