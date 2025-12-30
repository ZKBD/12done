import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import {
  LeaseStatus,
  ListingType,
  MaintenanceRequestStatus,
  MaintenanceRequestType,
  MaintenancePriority,
  ServiceProviderStatus,
  ServiceType,
} from '@prisma/client';

describe('MaintenanceController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Test users
  const landlordEmail = `landlord.maint.${Date.now()}@example.com`;
  const tenantEmail = `tenant.maint.${Date.now()}@example.com`;
  const providerEmail = `provider.maint.${Date.now()}@example.com`;
  const otherUserEmail = `other.maint.${Date.now()}@example.com`;
  const testPassword = 'SecureP@ss123';

  let landlordToken: string;
  let tenantToken: string;
  let providerToken: string;
  let otherUserToken: string;
  let landlordId: string;
  let tenantId: string;
  let providerId: string;
  let propertyId: string;
  let leaseId: string;
  let serviceProviderId: string;
  let maintenanceRequestId: string;

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

    // Helper function to create and verify a user
    const createAndVerifyUser = async (
      email: string,
      firstName: string,
      lastName: string,
    ): Promise<{ token: string; userId: string }> => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email,
          firstName,
          lastName,
          password: testPassword,
          confirmPassword: testPassword,
        });

      const verificationToken = await prisma.emailVerificationToken.findFirst({
        where: { user: { email } },
      });

      const verifyResponse = await request(app.getHttpServer())
        .post('/api/auth/verify-email')
        .send({ token: verificationToken!.token });

      const token = verifyResponse.body.tokens.accessToken;

      await request(app.getHttpServer())
        .post('/api/auth/complete-profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          address: '123 Test Street',
          postalCode: '1051',
          city: 'Budapest',
          country: 'HU',
          phone: '+36201234567',
        });

      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: testPassword });

      const user = await prisma.user.findUnique({ where: { email } });

      return {
        token: loginResponse.body.tokens.accessToken,
        userId: user!.id,
      };
    };

    // Create test users
    const landlordData = await createAndVerifyUser(
      landlordEmail,
      'Landlord',
      'User',
    );
    landlordToken = landlordData.token;
    landlordId = landlordData.userId;

    const tenantData = await createAndVerifyUser(tenantEmail, 'Tenant', 'User');
    tenantToken = tenantData.token;
    tenantId = tenantData.userId;

    const providerData = await createAndVerifyUser(
      providerEmail,
      'Provider',
      'User',
    );
    providerToken = providerData.token;
    providerId = providerData.userId;

    const otherUserData = await createAndVerifyUser(
      otherUserEmail,
      'Other',
      'User',
    );
    otherUserToken = otherUserData.token;

    // Create a rental property
    const property = await prisma.property.create({
      data: {
        ownerId: landlordId,
        title: 'Test Maintenance Apartment',
        address: '456 Maintenance Street',
        postalCode: '1052',
        city: 'Budapest',
        country: 'HU',
        listingTypes: [ListingType.LONG_TERM_RENT],
        basePrice: 1500,
        currency: 'EUR',
        status: 'ACTIVE',
      },
    });
    propertyId = property.id;

    // Create an active lease
    const lease = await prisma.lease.create({
      data: {
        propertyId,
        tenantId,
        landlordId,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        rentAmount: 1500,
        currency: 'EUR',
        dueDay: 1,
        securityDeposit: 3000,
        securityDepositPaid: true,
        status: LeaseStatus.ACTIVE,
      },
    });
    leaseId = lease.id;

    // Create a service provider
    const serviceProvider = await prisma.serviceProvider.create({
      data: {
        userId: providerId,
        serviceType: ServiceType.HANDYMAN,
        status: ServiceProviderStatus.APPROVED,
        serviceDetails: { specializations: ['plumbing', 'electrical'] },
        serviceArea: { city: 'Budapest', country: 'HU' },
      },
    });
    serviceProviderId = serviceProvider.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.maintenanceRequest.deleteMany({
      where: { propertyId },
    });
    await prisma.lease.deleteMany({
      where: { propertyId },
    });
    await prisma.property.deleteMany({ where: { ownerId: landlordId } });
    await prisma.serviceProvider.deleteMany({ where: { userId: providerId } });
    await prisma.notification.deleteMany({
      where: {
        OR: [
          { user: { email: landlordEmail } },
          { user: { email: tenantEmail } },
          { user: { email: providerEmail } },
          { user: { email: otherUserEmail } },
        ],
      },
    });
    await prisma.refreshToken.deleteMany({
      where: {
        user: {
          email: {
            in: [landlordEmail, tenantEmail, providerEmail, otherUserEmail],
          },
        },
      },
    });
    await prisma.emailVerificationToken.deleteMany({
      where: {
        user: {
          email: {
            in: [landlordEmail, tenantEmail, providerEmail, otherUserEmail],
          },
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [landlordEmail, tenantEmail, providerEmail, otherUserEmail],
        },
      },
    });
    await app.close();
  });

  // ============================================
  // PROD-103.2: CREATE MAINTENANCE REQUEST
  // ============================================
  describe('POST /api/maintenance-requests (PROD-103.2)', () => {
    it('should allow tenant to create a maintenance request', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/maintenance-requests')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          leaseId,
          type: MaintenanceRequestType.PLUMBING,
          priority: MaintenancePriority.NORMAL,
          title: 'Leaking faucet in kitchen',
          description:
            'The kitchen faucet has been dripping constantly for the past two days. Water is pooling under the sink.',
        })
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.status).toBe(MaintenanceRequestStatus.SUBMITTED);
      expect(response.body.type).toBe(MaintenanceRequestType.PLUMBING);
      expect(response.body.tenantId).toBe(tenantId);
      expect(response.body.landlordId).toBe(landlordId);

      maintenanceRequestId = response.body.id;
    });

    it('should reject request from non-tenant', async () => {
      await request(app.getHttpServer())
        .post('/api/maintenance-requests')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          leaseId,
          type: MaintenanceRequestType.ELECTRICAL,
          title: 'Light fixture broken',
          description:
            'The ceiling light fixture in the bedroom is not working.',
        })
        .expect(403);
    });

    it('should reject request without authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/maintenance-requests')
        .send({
          leaseId,
          type: MaintenanceRequestType.PLUMBING,
          title: 'Test request',
          description: 'This is a test maintenance request.',
        })
        .expect(401);
    });
  });

  // ============================================
  // PROD-103.3: GET MAINTENANCE REQUESTS
  // ============================================
  describe('GET /api/maintenance-requests (PROD-103.3)', () => {
    it('should return maintenance requests for tenant', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/maintenance-requests')
        .set('Authorization', `Bearer ${tenantToken}`)
        .query({ role: 'tenant' })
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.meta.total).toBeGreaterThanOrEqual(1);
    });

    it('should return maintenance requests for landlord', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/maintenance-requests')
        .set('Authorization', `Bearer ${landlordToken}`)
        .query({ role: 'landlord' })
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should filter by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/maintenance-requests')
        .set('Authorization', `Bearer ${tenantToken}`)
        .query({ role: 'tenant', status: MaintenanceRequestStatus.SUBMITTED })
        .expect(200);

      if (response.body.data.length > 0) {
        expect(
          response.body.data.every(
            (r: any) => r.status === MaintenanceRequestStatus.SUBMITTED,
          ),
        ).toBe(true);
      }
    });
  });

  // ============================================
  // PROD-103.4: GET SINGLE REQUEST
  // ============================================
  describe('GET /api/maintenance-requests/:id (PROD-103.4)', () => {
    it('should return request details for authorized user', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/maintenance-requests/${maintenanceRequestId}`)
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(200);

      expect(response.body.id).toBe(maintenanceRequestId);
      expect(response.body.property).toBeDefined();
      expect(response.body.tenant).toBeDefined();
    });

    it('should deny access to unauthorized user', async () => {
      await request(app.getHttpServer())
        .get(`/api/maintenance-requests/${maintenanceRequestId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(403);
    });
  });

  // ============================================
  // PROD-103.5: UPDATE REQUEST (tenant only)
  // ============================================
  describe('PATCH /api/maintenance-requests/:id (PROD-103.5)', () => {
    it('should allow tenant to update submitted request', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/maintenance-requests/${maintenanceRequestId}`)
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          description:
            'Updated: The kitchen faucet has been dripping constantly and getting worse.',
        })
        .expect(200);

      expect(response.body.description).toContain('Updated');
    });

    it('should reject update from landlord', async () => {
      await request(app.getHttpServer())
        .patch(`/api/maintenance-requests/${maintenanceRequestId}`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({ title: 'Updated title' })
        .expect(403);
    });
  });

  // ============================================
  // PROD-103.6: APPROVE REQUEST
  // ============================================
  describe('POST /api/maintenance-requests/:id/approve (PROD-103.6)', () => {
    it('should allow landlord to approve request', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/maintenance-requests/${maintenanceRequestId}/approve`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(201);

      expect(response.body.status).toBe(MaintenanceRequestStatus.APPROVED);
    });

    it('should reject approval from tenant', async () => {
      // Create new request for this test
      const createRes = await request(app.getHttpServer())
        .post('/api/maintenance-requests')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          leaseId,
          type: MaintenanceRequestType.HVAC,
          title: 'AC not cooling',
          description: 'The air conditioning unit is not producing cold air.',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/maintenance-requests/${createRes.body.id}/approve`)
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(403);
    });
  });

  // ============================================
  // PROD-103.7: REJECT REQUEST
  // ============================================
  describe('POST /api/maintenance-requests/:id/reject (PROD-103.7)', () => {
    it('should allow landlord to reject request with reason', async () => {
      // Create new request for rejection test
      const createRes = await request(app.getHttpServer())
        .post('/api/maintenance-requests')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          leaseId,
          type: MaintenanceRequestType.APPLIANCE,
          title: 'Dishwasher making noise',
          description: 'The dishwasher makes a loud noise during operation.',
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .post(`/api/maintenance-requests/${createRes.body.id}/reject`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({ rejectionReason: 'Normal wear noise - not covered' })
        .expect(201);

      expect(response.body.status).toBe(MaintenanceRequestStatus.REJECTED);
      expect(response.body.rejectionReason).toBe(
        'Normal wear noise - not covered',
      );
    });
  });

  // ============================================
  // PROD-103.8: ASSIGN PROVIDER
  // ============================================
  describe('POST /api/maintenance-requests/:id/assign (PROD-103.8)', () => {
    it('should allow landlord to assign provider', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/maintenance-requests/${maintenanceRequestId}/assign`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          providerId: serviceProviderId,
          scheduledDate: '2025-02-15',
          scheduledTimeSlot: '09:00-12:00',
          estimatedCost: 150,
        })
        .expect(201);

      expect(response.body.status).toBe(MaintenanceRequestStatus.ASSIGNED);
      expect(response.body.assignedProviderId).toBe(serviceProviderId);
    });

    it('should reject assignment from tenant', async () => {
      // Create and approve a new request
      const createRes = await request(app.getHttpServer())
        .post('/api/maintenance-requests')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          leaseId,
          type: MaintenanceRequestType.PEST_CONTROL,
          title: 'Ant problem in kitchen',
          description: 'There are ants appearing in the kitchen area.',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/maintenance-requests/${createRes.body.id}/approve`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/maintenance-requests/${createRes.body.id}/assign`)
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({ providerId: serviceProviderId })
        .expect(403);
    });
  });

  // ============================================
  // PROD-103.9: SCHEDULE REQUEST
  // ============================================
  describe('POST /api/maintenance-requests/:id/schedule (PROD-103.9)', () => {
    it('should allow scheduling of assigned request', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/maintenance-requests/${maintenanceRequestId}/schedule`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          scheduledDate: '2025-02-20',
          scheduledTimeSlot: '14:00-17:00',
        })
        .expect(201);

      expect(response.body.status).toBe(MaintenanceRequestStatus.SCHEDULED);
      expect(response.body.scheduledTimeSlot).toBe('14:00-17:00');
    });
  });

  // ============================================
  // PROD-103.10: START WORK
  // ============================================
  describe('POST /api/maintenance-requests/:id/start (PROD-103.10)', () => {
    it('should allow provider to start work', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/maintenance-requests/${maintenanceRequestId}/start`)
        .set('Authorization', `Bearer ${providerToken}`)
        .expect(201);

      expect(response.body.status).toBe(MaintenanceRequestStatus.IN_PROGRESS);
    });

    it('should reject start from non-provider', async () => {
      // This should fail because request is already in progress
      await request(app.getHttpServer())
        .post(`/api/maintenance-requests/${maintenanceRequestId}/start`)
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(403);
    });
  });

  // ============================================
  // PROD-103.11: COMPLETE WORK
  // ============================================
  describe('POST /api/maintenance-requests/:id/complete (PROD-103.11)', () => {
    it('should allow provider to complete work', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/maintenance-requests/${maintenanceRequestId}/complete`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({
          completionNotes: 'Replaced the faucet washer and tightened connections.',
          actualCost: 120,
        })
        .expect(201);

      expect(response.body.status).toBe(MaintenanceRequestStatus.COMPLETED);
      expect(response.body.completionNotes).toBeDefined();
    });
  });

  // ============================================
  // PROD-103.12: CONFIRM COMPLETION
  // ============================================
  describe('POST /api/maintenance-requests/:id/confirm (PROD-103.12)', () => {
    it('should allow tenant to confirm completion', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/maintenance-requests/${maintenanceRequestId}/confirm`)
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(201);

      expect(response.body.confirmedByTenant).toBe(true);
    });

    it('should allow landlord to confirm and finalize', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/maintenance-requests/${maintenanceRequestId}/confirm`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(201);

      expect(response.body.confirmedByLandlord).toBe(true);
      expect(response.body.status).toBe(MaintenanceRequestStatus.CONFIRMED);
    });
  });

  // ============================================
  // PROD-103.13: CANCEL REQUEST
  // ============================================
  describe('POST /api/maintenance-requests/:id/cancel (PROD-103.13)', () => {
    it('should allow tenant to cancel submitted request', async () => {
      // Create new request for cancellation test
      const createRes = await request(app.getHttpServer())
        .post('/api/maintenance-requests')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          leaseId,
          type: MaintenanceRequestType.CLEANING,
          title: 'Request to be cancelled',
          description: 'This request will be cancelled by the tenant.',
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .post(`/api/maintenance-requests/${createRes.body.id}/cancel`)
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(201);

      expect(response.body.status).toBe(MaintenanceRequestStatus.CANCELLED);
    });

    it('should allow landlord to cancel approved request', async () => {
      // Create and approve a new request
      const createRes = await request(app.getHttpServer())
        .post('/api/maintenance-requests')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          leaseId,
          type: MaintenanceRequestType.LANDSCAPING,
          title: 'Garden cleanup needed',
          description: 'The garden needs maintenance - landlord will cancel.',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/maintenance-requests/${createRes.body.id}/approve`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(201);

      const response = await request(app.getHttpServer())
        .post(`/api/maintenance-requests/${createRes.body.id}/cancel`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(201);

      expect(response.body.status).toBe(MaintenanceRequestStatus.CANCELLED);
    });

    it('should prevent tenant from cancelling approved request', async () => {
      // Create and approve a new request
      const createRes = await request(app.getHttpServer())
        .post('/api/maintenance-requests')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          leaseId,
          type: MaintenanceRequestType.STRUCTURAL,
          title: 'Wall crack noticed',
          description: 'A crack has appeared on the bedroom wall.',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/maintenance-requests/${createRes.body.id}/approve`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/maintenance-requests/${createRes.body.id}/cancel`)
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(400);
    });
  });

  // ============================================
  // AI MAINTENANCE ENDPOINTS (PROD-107)
  // ============================================
  describe('AI Maintenance Analysis (PROD-107)', () => {
    describe('POST /maintenance-requests/analyze', () => {
      it('should analyze a maintenance request and return category suggestion (PROD-107.1)', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/maintenance-requests/analyze')
          .set('Authorization', `Bearer ${tenantToken}`)
          .send({
            title: 'Leaking faucet in kitchen',
            description:
              'The kitchen faucet has been dripping constantly for the past two days. Water is pooling under the sink.',
          })
          .expect(201);

        expect(response.body.category).toBeDefined();
        expect(response.body.category.suggestedType).toBe(
          MaintenanceRequestType.PLUMBING,
        );
        expect(response.body.category.typeConfidence).toBeGreaterThan(0);
        expect(response.body.category.matchedKeywords).toContain('faucet');
      });

      it('should return priority assessment (PROD-107.2)', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/maintenance-requests/analyze')
          .set('Authorization', `Bearer ${tenantToken}`)
          .send({
            title: 'Gas leak emergency',
            description:
              'I smell gas in the kitchen. This is an emergency and needs immediate attention.',
          })
          .expect(201);

        expect(response.body.priority).toBeDefined();
        expect(response.body.priority.suggestedPriority).toBe(
          MaintenancePriority.EMERGENCY,
        );
        expect(response.body.priority.urgencyFactors).toContain('emergency');
        expect(response.body.priority.explanation).toBeDefined();
      });

      it('should return DIY solutions when applicable (PROD-107.3)', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/maintenance-requests/analyze')
          .set('Authorization', `Bearer ${tenantToken}`)
          .send({
            title: 'Clogged bathroom drain',
            description:
              'The bathroom sink drain is clogged and water drains very slowly.',
          })
          .expect(201);

        expect(response.body.solutions).toBeDefined();
        expect(response.body.solutions.isDiyPossible).toBe(true);
        expect(response.body.solutions.diySteps).toBeDefined();
        expect(response.body.solutions.diySteps.length).toBeGreaterThan(0);
        expect(response.body.solutions.toolsNeeded).toBeDefined();
        expect(response.body.solutions.whenToCallProfessional).toBeDefined();
      });

      it('should not recommend DIY for electrical issues', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/maintenance-requests/analyze')
          .set('Authorization', `Bearer ${tenantToken}`)
          .send({
            title: 'Electrical outlet sparking',
            description:
              'The outlet in the living room is sparking when I plug something in.',
          })
          .expect(201);

        expect(response.body.solutions.isDiyPossible).toBe(false);
        expect(response.body.solutions.whenToCallProfessional).toContain(
          'electrician',
        );
      });

      it('should include model version and timestamp', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/maintenance-requests/analyze')
          .set('Authorization', `Bearer ${tenantToken}`)
          .send({
            title: 'General maintenance',
            description: 'Something needs to be fixed in my apartment.',
          })
          .expect(201);

        expect(response.body.modelVersion).toBe('rule-based-v1');
        expect(response.body.analyzedAt).toBeDefined();
      });

      it('should require authentication', async () => {
        await request(app.getHttpServer())
          .post('/api/maintenance-requests/analyze')
          .send({
            title: 'Test issue',
            description: 'This is a test description that is long enough.',
          })
          .expect(401);
      });

      it('should validate input - title too short', async () => {
        await request(app.getHttpServer())
          .post('/api/maintenance-requests/analyze')
          .set('Authorization', `Bearer ${tenantToken}`)
          .send({
            title: 'Hi',
            description: 'This is a valid description that is long enough.',
          })
          .expect(400);
      });

      it('should validate input - description too short', async () => {
        await request(app.getHttpServer())
          .post('/api/maintenance-requests/analyze')
          .set('Authorization', `Bearer ${tenantToken}`)
          .send({
            title: 'Valid title',
            description: 'Short',
          })
          .expect(400);
      });
    });

    describe('GET /maintenance-requests/:id/suggestions', () => {
      it('should return AI suggestions for an existing request', async () => {
        // First create a maintenance request
        const createRes = await request(app.getHttpServer())
          .post('/api/maintenance-requests')
          .set('Authorization', `Bearer ${tenantToken}`)
          .send({
            leaseId,
            type: MaintenanceRequestType.HVAC,
            title: 'AC not cooling',
            description:
              'The air conditioning is running but not producing cold air.',
          })
          .expect(201);

        const response = await request(app.getHttpServer())
          .get(`/api/maintenance-requests/${createRes.body.id}/suggestions`)
          .set('Authorization', `Bearer ${tenantToken}`)
          .expect(200);

        expect(response.body.requestId).toBe(createRes.body.id);
        expect(response.body.category).toBeDefined();
        expect(response.body.priority).toBeDefined();
        expect(response.body.solutions).toBeDefined();
        expect(response.body.generatedAt).toBeDefined();
      });

      it('should return 404 for non-existent request', async () => {
        await request(app.getHttpServer())
          .get('/api/maintenance-requests/non-existent-id/suggestions')
          .set('Authorization', `Bearer ${tenantToken}`)
          .expect(404);
      });

      it('should require authentication', async () => {
        await request(app.getHttpServer())
          .get(`/api/maintenance-requests/${maintenanceRequestId}/suggestions`)
          .expect(401);
      });

      it('should deny access to unauthorized user', async () => {
        // Create a request as tenant
        const createRes = await request(app.getHttpServer())
          .post('/api/maintenance-requests')
          .set('Authorization', `Bearer ${tenantToken}`)
          .send({
            leaseId,
            type: MaintenanceRequestType.CLEANING,
            title: 'Mold in bathroom',
            description:
              'There is mold growing on the bathroom ceiling tiles near the shower.',
          })
          .expect(201);

        // Try to access as unauthorized user
        await request(app.getHttpServer())
          .get(`/api/maintenance-requests/${createRes.body.id}/suggestions`)
          .set('Authorization', `Bearer ${otherUserToken}`)
          .expect(403);
      });
    });

    describe('POST /maintenance-requests/appointment-suggestions', () => {
      it('should return appointment slot suggestions (PROD-107.4)', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/maintenance-requests/appointment-suggestions')
          .set('Authorization', `Bearer ${tenantToken}`)
          .send({
            propertyId,
            type: MaintenanceRequestType.PLUMBING,
          })
          .expect(201);

        expect(response.body.suggestedSlots).toBeDefined();
        expect(Array.isArray(response.body.suggestedSlots)).toBe(true);
        expect(response.body.totalAvailableProviders).toBeDefined();
        expect(response.body.averageWaitDays).toBeDefined();
        expect(response.body.recommendation).toBeDefined();
        expect(response.body.generatedAt).toBeDefined();
      });

      it('should return default suggestions when no providers available', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/maintenance-requests/appointment-suggestions')
          .set('Authorization', `Bearer ${tenantToken}`)
          .send({
            propertyId,
            type: MaintenanceRequestType.PEST_CONTROL,
          })
          .expect(201);

        expect(response.body.suggestedSlots.length).toBeGreaterThan(0);
        expect(response.body.recommendation).toBeDefined();
      });

      it('should require authentication', async () => {
        await request(app.getHttpServer())
          .post('/api/maintenance-requests/appointment-suggestions')
          .send({
            propertyId,
            type: MaintenanceRequestType.PLUMBING,
          })
          .expect(401);
      });

      it('should validate property ID format', async () => {
        await request(app.getHttpServer())
          .post('/api/maintenance-requests/appointment-suggestions')
          .set('Authorization', `Bearer ${tenantToken}`)
          .send({
            propertyId: 'not-a-uuid',
            type: MaintenanceRequestType.PLUMBING,
          })
          .expect(400);
      });
    });
  });
});
