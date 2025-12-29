import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { ServiceType, ServiceProviderStatus, ServiceRequestStatus, UserRole } from '@prisma/client';

describe('ServiceProvidersController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Test users
  const providerEmail = `provider.${Date.now()}@example.com`;
  const clientEmail = `client.${Date.now()}@example.com`;
  const adminEmail = `admin.${Date.now()}@example.com`;
  const testPassword = 'SecureP@ss123';

  let providerToken: string;
  let clientToken: string;
  let adminToken: string;
  let providerId: string;
  let serviceRequestId: string;
  let reviewId: string;
  let exceptionId: string;
  let propertyId: string;

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

    // Create and verify provider user
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: providerEmail,
        firstName: 'Provider',
        lastName: 'User',
        password: testPassword,
        confirmPassword: testPassword,
      });

    const providerVerificationToken = await prisma.emailVerificationToken.findFirst({
      where: { user: { email: providerEmail } },
    });

    const providerVerifyResponse = await request(app.getHttpServer())
      .post('/api/auth/verify-email')
      .send({ token: providerVerificationToken!.token });

    providerToken = providerVerifyResponse.body.tokens.accessToken;

    await request(app.getHttpServer())
      .post('/api/auth/complete-profile')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({
        address: '123 Provider Street',
        postalCode: '1051',
        city: 'Budapest',
        country: 'HU',
        phone: '+36201234567',
      });

    const providerLoginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: providerEmail, password: testPassword });

    providerToken = providerLoginResponse.body.tokens.accessToken;

    // Create and verify client user
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: clientEmail,
        firstName: 'Client',
        lastName: 'User',
        password: testPassword,
        confirmPassword: testPassword,
      });

    const clientVerificationToken = await prisma.emailVerificationToken.findFirst({
      where: { user: { email: clientEmail } },
    });

    const clientVerifyResponse = await request(app.getHttpServer())
      .post('/api/auth/verify-email')
      .send({ token: clientVerificationToken!.token });

    clientToken = clientVerifyResponse.body.tokens.accessToken;

    await request(app.getHttpServer())
      .post('/api/auth/complete-profile')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        address: '456 Client Street',
        postalCode: '1052',
        city: 'Budapest',
        country: 'HU',
        phone: '+36201234568',
      });

    const clientLoginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: clientEmail, password: testPassword });

    clientToken = clientLoginResponse.body.tokens.accessToken;

    // Create and verify admin user
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: adminEmail,
        firstName: 'Admin',
        lastName: 'User',
        password: testPassword,
        confirmPassword: testPassword,
      });

    const adminVerificationToken = await prisma.emailVerificationToken.findFirst({
      where: { user: { email: adminEmail } },
    });

    const adminVerifyResponse = await request(app.getHttpServer())
      .post('/api/auth/verify-email')
      .send({ token: adminVerificationToken!.token });

    adminToken = adminVerifyResponse.body.tokens.accessToken;

    await request(app.getHttpServer())
      .post('/api/auth/complete-profile')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        address: '789 Admin Street',
        postalCode: '1053',
        city: 'Budapest',
        country: 'HU',
        phone: '+36201234569',
      });

    // Make user admin
    await prisma.user.update({
      where: { email: adminEmail },
      data: { role: UserRole.ADMIN },
    });

    const adminLoginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: adminEmail, password: testPassword });

    adminToken = adminLoginResponse.body.tokens.accessToken;

    // Create a property for client (needed for property-related service requests)
    const propertyResponse = await request(app.getHttpServer())
      .post('/api/properties')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        title: 'Test Property for Services',
        address: '123 Test Street',
        postalCode: '1011',
        city: 'Budapest',
        country: 'HU',
        listingTypes: ['FOR_SALE'],
        basePrice: '250000',
        currency: 'EUR',
      });

    propertyId = propertyResponse.body.id;

    // Publish the property
    await request(app.getHttpServer())
      .patch(`/api/properties/${propertyId}/status`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ status: 'ACTIVE' });
  }, 90000);

  afterAll(async () => {
    // Clean up
    const users = await prisma.user.findMany({
      where: { email: { in: [providerEmail, clientEmail, adminEmail] } },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);

    if (userIds.length > 0) {
      // Delete in order due to FK constraints
      await prisma.providerReview.deleteMany({
        where: {
          OR: [
            { reviewerId: { in: userIds } },
            { provider: { userId: { in: userIds } } },
          ],
        },
      });
      await prisma.serviceRequest.deleteMany({
        where: {
          OR: [
            { requesterId: { in: userIds } },
            { provider: { userId: { in: userIds } } },
          ],
        },
      });
      await prisma.availabilityException.deleteMany({
        where: { provider: { userId: { in: userIds } } },
      });
      await prisma.providerAvailability.deleteMany({
        where: { provider: { userId: { in: userIds } } },
      });
      await prisma.serviceProvider.deleteMany({
        where: { userId: { in: userIds } },
      });
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

  // ============================================
  // PROVIDER APPLICATION (PROD-060)
  // ============================================

  describe('POST /api/service-providers/apply', () => {
    it('should require authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/service-providers/apply')
        .send({
          serviceType: ServiceType.LAWYER,
          bio: 'Experienced lawyer',
        });

      expect(response.status).toBe(401);
    });

    it('should create a provider application', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/service-providers/apply')
        .set('Authorization', `Bearer ${providerToken}`)
        .send({
          serviceType: ServiceType.LAWYER,
          bio: 'Experienced lawyer with 10 years of experience',
          serviceDetails: {
            hourlyRate: 100,
            currency: 'EUR',
            languages: ['Hungarian', 'English'],
          },
          serviceArea: {
            city: 'Budapest',
            country: 'HU',
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.status).toBe(ServiceProviderStatus.PENDING);
      expect(response.body.serviceType).toBe(ServiceType.LAWYER);

      providerId = response.body.id;
    });

    it('should not allow duplicate applications for same service type', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/service-providers/apply')
        .set('Authorization', `Bearer ${providerToken}`)
        .send({
          serviceType: ServiceType.LAWYER,
          bio: 'Another application',
        });

      expect(response.status).toBe(409);
    });
  });

  // ============================================
  // PROVIDER PROFILES (PROD-061)
  // ============================================

  describe('GET /api/service-providers/my-profiles', () => {
    it('should return user provider profiles', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/service-providers/my-profiles')
        .set('Authorization', `Bearer ${providerToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].serviceType).toBe(ServiceType.LAWYER);
    });

    it('should return empty array for user with no profiles', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/service-providers/my-profiles')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  describe('GET /api/service-providers/:id', () => {
    it('should return provider profile (public)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/service-providers/${providerId}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(providerId);
      expect(response.body.serviceType).toBe(ServiceType.LAWYER);
    });

    it('should return 404 for non-existent provider', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/service-providers/non-existent-id');

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/service-providers/:id', () => {
    it('should update own profile', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/service-providers/${providerId}`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({
          bio: 'Updated bio with more details',
          serviceDetails: {
            hourlyRate: 120,
            currency: 'EUR',
            languages: ['Hungarian', 'English'],
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.bio).toBe('Updated bio with more details');
      expect(response.body.serviceDetails.hourlyRate).toBe(120);
    });

    it('should not allow updating other user profile', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/service-providers/${providerId}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          bio: 'Trying to update',
        });

      expect(response.status).toBe(403);
    });
  });

  // ============================================
  // ADMIN APPROVAL (PROD-066)
  // ============================================

  describe('GET /api/service-providers/admin/list', () => {
    it('should require admin role', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/service-providers/admin/list')
        .set('Authorization', `Bearer ${providerToken}`);

      expect(response.status).toBe(403);
    });

    it('should list providers for admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/service-providers/admin/list')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.meta).toBeDefined();
    });

    it('should filter by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/service-providers/admin/list')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ status: ServiceProviderStatus.PENDING });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/service-providers/admin/:id/review', () => {
    it('should approve provider', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/service-providers/admin/${providerId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          decision: 'approve',
          adminNotes: 'Application approved',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(ServiceProviderStatus.APPROVED);
    });

    it('should require admin role to review', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/service-providers/admin/${providerId}/review`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({
          decision: 'approve',
        });

      expect(response.status).toBe(403);
    });
  });

  // ============================================
  // AVAILABILITY (PROD-062)
  // ============================================

  describe('PUT /api/service-providers/:id/availability', () => {
    it('should set weekly availability', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/service-providers/${providerId}/availability`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({
          slots: [
            { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
            { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' },
            { dayOfWeek: 3, startTime: '09:00', endTime: '17:00' },
            { dayOfWeek: 4, startTime: '09:00', endTime: '17:00' },
            { dayOfWeek: 5, startTime: '09:00', endTime: '17:00' },
          ],
        });

      expect(response.status).toBe(200);
    });

    it('should not allow setting availability for other user', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/service-providers/${providerId}/availability`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          slots: [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }],
        });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/service-providers/:id/availability', () => {
    it('should get weekly availability', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/service-providers/${providerId}/availability`);

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(5);
    });
  });

  describe('POST /api/service-providers/:id/availability/exceptions', () => {
    it('should add availability exception', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const dateStr = futureDate.toISOString().split('T')[0];

      const response = await request(app.getHttpServer())
        .post(`/api/service-providers/${providerId}/availability/exceptions`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({
          date: dateStr,
          isAvailable: false,
          reason: 'Vacation day',
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.isAvailable).toBe(false);

      exceptionId = response.body.id;
    });
  });

  describe('GET /api/service-providers/:id/availability/exceptions', () => {
    it('should get availability exceptions', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/service-providers/${providerId}/availability/exceptions`);

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/service-providers/:id/availability/check', () => {
    it('should check availability for a date', async () => {
      // Check a Monday (should be available based on weekly schedule)
      const nextMonday = getNextMonday();
      const dateStr = nextMonday.toISOString().split('T')[0];

      const response = await request(app.getHttpServer())
        .get(`/api/service-providers/${providerId}/availability/check`)
        .query({ date: dateStr });

      expect(response.status).toBe(200);
      expect(response.body.available).toBeDefined();
    });
  });

  describe('DELETE /api/service-providers/availability/exceptions/:exceptionId', () => {
    it('should delete availability exception', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/service-providers/availability/exceptions/${exceptionId}`)
        .set('Authorization', `Bearer ${providerToken}`);

      expect(response.status).toBe(204);
    });
  });

  // ============================================
  // SEARCH (PROD-065)
  // ============================================

  describe('GET /api/service-providers', () => {
    it('should search providers', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/service-providers')
        .query({ serviceType: ServiceType.LAWYER });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.meta).toBeDefined();
    });

    it('should filter by city', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/service-providers')
        .query({
          serviceType: ServiceType.LAWYER,
          city: 'Budapest',
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/service-providers/match', () => {
    it('should find matching providers', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/service-providers/match')
        .query({
          serviceType: ServiceType.LAWYER,
          city: 'Budapest',
          country: 'HU',
        });

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
    });
  });

  // ============================================
  // SERVICE REQUESTS (PROD-063, PROD-064)
  // ============================================

  describe('POST /api/service-providers/requests', () => {
    it('should require authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/service-providers/requests')
        .send({
          serviceType: ServiceType.LAWYER,
          title: 'Legal consultation',
          description: 'Need help with contract review',
        });

      expect(response.status).toBe(401);
    });

    it('should create a service request', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/service-providers/requests')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          serviceType: ServiceType.LAWYER,
          title: 'Legal consultation',
          description: 'Need help with contract review',
          providerId: providerId,
          propertyId: propertyId,
          preferredDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.status).toBe(ServiceRequestStatus.PENDING);
      expect(response.body.serviceType).toBe(ServiceType.LAWYER);

      serviceRequestId = response.body.id;
    });
  });

  describe('GET /api/service-providers/requests/my', () => {
    it('should get my service requests', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/service-providers/requests/my')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.meta).toBeDefined();
    });
  });

  describe('GET /api/service-providers/:id/requests', () => {
    it('should get received requests for provider', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/service-providers/${providerId}/requests`)
        .set('Authorization', `Bearer ${providerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.meta).toBeDefined();
    });
  });

  describe('GET /api/service-providers/requests/:requestId', () => {
    it('should get request details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/service-providers/requests/${serviceRequestId}`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(serviceRequestId);
      expect(response.body.title).toBe('Legal consultation');
    });

    it('should allow provider to view request', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/service-providers/requests/${serviceRequestId}`)
        .set('Authorization', `Bearer ${providerToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/service-providers/requests/:requestId/respond', () => {
    it('should allow provider to accept request', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/service-providers/requests/${serviceRequestId}/respond`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({
          action: 'accept',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(ServiceRequestStatus.ACCEPTED);
    });

    it('should not allow client to respond', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/service-providers/requests/${serviceRequestId}/respond`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          action: 'accept',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/service-providers/requests/:requestId/start', () => {
    it('should allow provider to start request', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/service-providers/requests/${serviceRequestId}/start`)
        .set('Authorization', `Bearer ${providerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(ServiceRequestStatus.IN_PROGRESS);
    });
  });

  describe('POST /api/service-providers/requests/:requestId/complete', () => {
    it('should allow provider to complete request', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/service-providers/requests/${serviceRequestId}/complete`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({
          completionNotes: 'Service completed successfully',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(ServiceRequestStatus.COMPLETED);
    });
  });

  // ============================================
  // REVIEWS (PROD-068)
  // ============================================

  describe('POST /api/service-providers/reviews', () => {
    it('should create a review for completed service', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/service-providers/reviews')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          serviceRequestId: serviceRequestId,
          rating: 5,
          title: 'Excellent service',
          comment: 'Very professional and helpful',
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.rating).toBe(5);
      expect(response.body.title).toBe('Excellent service');

      reviewId = response.body.id;
    });

    it('should not allow duplicate reviews', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/service-providers/reviews')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          serviceRequestId: serviceRequestId,
          rating: 5,
          title: 'Another review',
          comment: 'Trying to review again',
        });

      expect(response.status).toBe(409);
    });
  });

  describe('GET /api/service-providers/reviews/my', () => {
    it('should get my reviews', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/service-providers/reviews/my')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/service-providers/:id/reviews', () => {
    it('should get provider reviews (public)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/service-providers/${providerId}/reviews`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.stats).toBeDefined();
      expect(response.body.stats.averageRating).toBeDefined();
    });
  });

  describe('GET /api/service-providers/reviews/:reviewId', () => {
    it('should get review by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/service-providers/reviews/${reviewId}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(reviewId);
      expect(response.body.rating).toBe(5);
    });
  });

  describe('PUT /api/service-providers/reviews/:reviewId', () => {
    it('should update own review', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/service-providers/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          rating: 4,
          comment: 'Updated comment - still great service',
        });

      expect(response.status).toBe(200);
      expect(response.body.rating).toBe(4);
      expect(response.body.comment).toBe('Updated comment - still great service');
    });

    it('should not allow updating other user review', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/service-providers/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({
          rating: 1,
          comment: 'Trying to change review',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/service-providers/reviews/:reviewId/helpful', () => {
    it('should mark review as helpful', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/service-providers/reviews/${reviewId}/helpful`);

      expect(response.status).toBe(200);
      expect(response.body.helpfulCount).toBeGreaterThan(0);
    });
  });

  describe('DELETE /api/service-providers/reviews/:reviewId', () => {
    it('should not allow non-owner to delete', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/service-providers/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${providerToken}`);

      expect(response.status).toBe(403);
    });

    it('should delete own review', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/service-providers/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(response.status).toBe(204);
    });
  });

  // ============================================
  // CANCEL REQUEST (PROD-064.5)
  // ============================================

  describe('Service request cancellation flow', () => {
    let cancelRequestId: string;

    beforeAll(async () => {
      // Create a new request to cancel
      const response = await request(app.getHttpServer())
        .post('/api/service-providers/requests')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          serviceType: ServiceType.LAWYER,
          title: 'Request to cancel',
          description: 'This will be cancelled',
          providerId: providerId,
        });

      cancelRequestId = response.body.id;
    });

    it('should allow client to cancel pending request', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/service-providers/requests/${cancelRequestId}/cancel`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(ServiceRequestStatus.CANCELLED);
    });
  });

  // ============================================
  // DEACTIVATE PROFILE
  // ============================================

  describe('POST /api/service-providers/:id/deactivate', () => {
    it('should deactivate own profile', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/service-providers/${providerId}/deactivate`)
        .set('Authorization', `Bearer ${providerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(ServiceProviderStatus.INACTIVE);
    });
  });

  // ============================================
  // ADMIN SUSPEND (PROD-066.3)
  // ============================================

  describe('POST /api/service-providers/admin/:id/suspend', () => {
    let newProviderId: string;

    beforeAll(async () => {
      // Create another provider to suspend
      const response = await request(app.getHttpServer())
        .post('/api/service-providers/apply')
        .set('Authorization', `Bearer ${providerToken}`)
        .send({
          serviceType: ServiceType.CLEANER,
          bio: 'Professional cleaning service',
        });

      newProviderId = response.body.id;

      // Approve it first
      await request(app.getHttpServer())
        .post(`/api/service-providers/admin/${newProviderId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ decision: 'approve' });
    });

    it('should suspend provider', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/service-providers/admin/${newProviderId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Policy violation',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(ServiceProviderStatus.SUSPENDED);
    });
  });
});

// Helper function to get next Monday
function getNextMonday(): Date {
  const date = new Date();
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? 1 : 8); // Adjust for Sunday
  return new Date(date.setDate(diff));
}
