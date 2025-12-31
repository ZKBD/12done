import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { ListingType } from '@prisma/client';

describe('LeaseRenewal (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Test users
  const landlordEmail = `landlord.renewal.${Date.now()}@example.com`;
  const tenantEmail = `tenant.renewal.${Date.now()}@example.com`;
  const otherUserEmail = `other.renewal.${Date.now()}@example.com`;
  const testPassword = 'SecureP@ss123';

  let landlordToken: string;
  let tenantToken: string;
  let otherUserToken: string;
  let landlordId: string;
  let tenantId: string;
  let propertyId: string;
  let leaseId: string;
  let _renewalId: string;

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
        title: 'Test Renewal Apartment',
        address: '123 Test Street',
        postalCode: '1051',
        city: 'Budapest',
        country: 'HU',
        listingTypes: [ListingType.LONG_TERM_RENT],
        basePrice: 1500,
        currency: 'EUR',
        status: 'ACTIVE',
      },
    });
    propertyId = property.id;

    // Create an active lease that's ending soon
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 45); // 45 days from now

    const lease = await prisma.lease.create({
      data: {
        propertyId,
        tenantId,
        landlordId,
        startDate: new Date('2024-02-01'),
        endDate,
        rentAmount: 1500,
        currency: 'EUR',
        dueDay: 1,
        status: 'ACTIVE',
      },
    });
    leaseId = lease.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.leaseRenewal.deleteMany({
      where: { leaseId },
    });
    await prisma.rentPayment.deleteMany({
      where: { lease: { propertyId } },
    });
    await prisma.lease.deleteMany({
      where: { propertyId },
    });
    await prisma.property.deleteMany({ where: { ownerId: landlordId } });
    await prisma.notification.deleteMany({
      where: {
        OR: [
          { user: { email: landlordEmail } },
          { user: { email: tenantEmail } },
          { user: { email: otherUserEmail } },
        ],
      },
    });
    await prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { user: { email: landlordEmail } },
          { user: { email: tenantEmail } },
          { user: { email: otherUserEmail } },
        ],
      },
    });
    await prisma.emailVerificationToken.deleteMany({
      where: {
        OR: [
          { user: { email: landlordEmail } },
          { user: { email: tenantEmail } },
          { user: { email: otherUserEmail } },
        ],
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [landlordEmail, tenantEmail, otherUserEmail],
        },
      },
    });

    await app.close();
  });

  describe('GET /api/leases/:id/renewal', () => {
    it('should return empty when no renewal exists', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/leases/${leaseId}/renewal`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      // NestJS serializes null as empty object
      expect(response.body).toEqual({});
    });

    it('should return 403 for unauthorized user', async () => {
      await request(app.getHttpServer())
        .get(`/api/leases/${leaseId}/renewal`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent lease', async () => {
      await request(app.getHttpServer())
        .get('/api/leases/non-existent-id/renewal')
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(404);
    });
  });

  describe('POST /api/leases/:id/renewal/offer', () => {
    it('should create renewal offer successfully (landlord)', async () => {
      const offerData = {
        proposedStartDate: '2026-02-01',
        proposedEndDate: '2027-01-31',
        proposedRentAmount: 1600,
        proposedTerms: 'Standard renewal with 7% rent increase',
      };

      const response = await request(app.getHttpServer())
        .post(`/api/leases/${leaseId}/renewal/offer`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send(offerData)
        .expect(201);

      expect(response.body.status).toBe('OFFERED');
      expect(response.body.proposedRentAmount).toBe(1600);
      _renewalId = response.body.id;
    });

    it('should return 403 when tenant tries to create offer', async () => {
      await request(app.getHttpServer())
        .post(`/api/leases/${leaseId}/renewal/offer`)
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          proposedStartDate: '2026-02-01',
          proposedEndDate: '2027-01-31',
          proposedRentAmount: 1600,
        })
        .expect(403);
    });

    it('should return 409 when offer already exists', async () => {
      await request(app.getHttpServer())
        .post(`/api/leases/${leaseId}/renewal/offer`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          proposedStartDate: '2026-02-01',
          proposedEndDate: '2027-01-31',
          proposedRentAmount: 1700,
        })
        .expect(409);
    });

    it('should return 400 when end date is before start date', async () => {
      // First cancel the existing offer
      await request(app.getHttpServer())
        .delete(`/api/leases/${leaseId}/renewal`)
        .set('Authorization', `Bearer ${landlordToken}`);

      await request(app.getHttpServer())
        .post(`/api/leases/${leaseId}/renewal/offer`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          proposedStartDate: '2027-02-01',
          proposedEndDate: '2026-01-31',
          proposedRentAmount: 1600,
        })
        .expect(400);
    });
  });

  describe('GET /api/leases/renewals/pending', () => {
    beforeEach(async () => {
      // Ensure there's an active offer
      await prisma.leaseRenewal.deleteMany({ where: { leaseId } });
      await prisma.leaseRenewal.create({
        data: {
          leaseId,
          landlordId,
          tenantId,
          status: 'OFFERED',
          proposedStartDate: new Date('2026-02-01'),
          proposedEndDate: new Date('2027-01-31'),
          proposedRentAmount: 1600,
          offerExpiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          offerSentAt: new Date(),
        },
      });
    });

    it('should return list of pending renewals for landlord', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/leases/renewals/pending')
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.meta).toBeDefined();
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty list for user with no renewals', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/leases/renewals/pending')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('POST /api/leases/:id/renewal/accept', () => {
    beforeEach(async () => {
      // Create a fresh offer
      await prisma.leaseRenewal.deleteMany({ where: { leaseId } });
      const renewal = await prisma.leaseRenewal.create({
        data: {
          leaseId,
          landlordId,
          tenantId,
          status: 'OFFERED',
          proposedStartDate: new Date('2026-02-01'),
          proposedEndDate: new Date('2027-01-31'),
          proposedRentAmount: 1600,
          offerExpiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          offerSentAt: new Date(),
        },
      });
      _renewalId = renewal.id;
    });

    it('should accept offer successfully (tenant)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/leases/${leaseId}/renewal/accept`)
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(201);

      expect(response.body.status).toBe('ACCEPTED');
      expect(response.body.newLeaseId).toBeDefined();

      // Clean up the new lease
      if (response.body.newLeaseId) {
        await prisma.lease.delete({ where: { id: response.body.newLeaseId } });
      }
    });

    it('should return 403 when landlord tries to accept', async () => {
      await request(app.getHttpServer())
        .post(`/api/leases/${leaseId}/renewal/accept`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(403);
    });

    it('should return 404 when no offer exists', async () => {
      await prisma.leaseRenewal.deleteMany({ where: { leaseId } });

      await request(app.getHttpServer())
        .post(`/api/leases/${leaseId}/renewal/accept`)
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(404);
    });
  });

  describe('POST /api/leases/:id/renewal/decline', () => {
    beforeEach(async () => {
      // Create a fresh offer
      await prisma.leaseRenewal.deleteMany({ where: { leaseId } });
      const renewal = await prisma.leaseRenewal.create({
        data: {
          leaseId,
          landlordId,
          tenantId,
          status: 'OFFERED',
          proposedStartDate: new Date('2026-02-01'),
          proposedEndDate: new Date('2027-01-31'),
          proposedRentAmount: 1600,
          offerExpiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          offerSentAt: new Date(),
        },
      });
      _renewalId = renewal.id;
    });

    it('should decline offer successfully (tenant)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/leases/${leaseId}/renewal/decline`)
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({ declineReason: 'Moving to another city' })
        .expect(201);

      expect(response.body.status).toBe('DECLINED');
      expect(response.body.declineReason).toBe('Moving to another city');
    });

    it('should decline without reason', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/leases/${leaseId}/renewal/decline`)
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({})
        .expect(201);

      expect(response.body.status).toBe('DECLINED');
    });

    it('should return 403 when landlord tries to decline', async () => {
      await request(app.getHttpServer())
        .post(`/api/leases/${leaseId}/renewal/decline`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({})
        .expect(403);
    });
  });

  describe('DELETE /api/leases/:id/renewal', () => {
    beforeEach(async () => {
      // Create a fresh offer
      await prisma.leaseRenewal.deleteMany({ where: { leaseId } });
      await prisma.leaseRenewal.create({
        data: {
          leaseId,
          landlordId,
          tenantId,
          status: 'OFFERED',
          proposedStartDate: new Date('2026-02-01'),
          proposedEndDate: new Date('2027-01-31'),
          proposedRentAmount: 1600,
          offerExpiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          offerSentAt: new Date(),
        },
      });
    });

    it('should cancel renewal successfully (landlord)', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/leases/${leaseId}/renewal`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      expect(response.body.status).toBe('CANCELLED');
    });

    it('should return 403 when tenant tries to cancel', async () => {
      await request(app.getHttpServer())
        .delete(`/api/leases/${leaseId}/renewal`)
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(403);
    });

    it('should return 404 when no active renewal exists', async () => {
      await prisma.leaseRenewal.deleteMany({ where: { leaseId } });

      await request(app.getHttpServer())
        .delete(`/api/leases/${leaseId}/renewal`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(404);
    });
  });

  describe('Full renewal workflow', () => {
    beforeEach(async () => {
      await prisma.leaseRenewal.deleteMany({ where: { leaseId } });
    });

    it('should complete full accept workflow: create offer -> accept -> new lease created', async () => {
      // Step 1: Landlord creates offer
      const offerResponse = await request(app.getHttpServer())
        .post(`/api/leases/${leaseId}/renewal/offer`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          proposedStartDate: '2026-02-01',
          proposedEndDate: '2027-01-31',
          proposedRentAmount: 1650,
          proposedTerms: 'Renewal with 10% increase',
        })
        .expect(201);

      expect(offerResponse.body.status).toBe('OFFERED');

      // Step 2: Tenant can see the offer
      const renewalResponse = await request(app.getHttpServer())
        .get(`/api/leases/${leaseId}/renewal`)
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(200);

      expect(renewalResponse.body.status).toBe('OFFERED');
      expect(renewalResponse.body.proposedRentAmount).toBe(1650);

      // Step 3: Tenant accepts
      const acceptResponse = await request(app.getHttpServer())
        .post(`/api/leases/${leaseId}/renewal/accept`)
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(201);

      expect(acceptResponse.body.status).toBe('ACCEPTED');
      expect(acceptResponse.body.newLeaseId).toBeDefined();

      // Verify new lease was created
      const newLease = await prisma.lease.findUnique({
        where: { id: acceptResponse.body.newLeaseId },
      });
      expect(newLease).toBeDefined();
      expect(Number(newLease?.rentAmount)).toBe(1650);
      expect(newLease?.status).toBe('DRAFT');

      // Clean up
      await prisma.lease.delete({ where: { id: acceptResponse.body.newLeaseId } });
    });

    it('should complete full decline workflow: create offer -> decline', async () => {
      // Step 1: Landlord creates offer
      await request(app.getHttpServer())
        .post(`/api/leases/${leaseId}/renewal/offer`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          proposedStartDate: '2026-02-01',
          proposedEndDate: '2027-01-31',
          proposedRentAmount: 1800,
        })
        .expect(201);

      // Step 2: Tenant declines
      const declineResponse = await request(app.getHttpServer())
        .post(`/api/leases/${leaseId}/renewal/decline`)
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({ declineReason: 'Rent increase too high' })
        .expect(201);

      expect(declineResponse.body.status).toBe('DECLINED');
      expect(declineResponse.body.declineReason).toBe('Rent increase too high');
      expect(declineResponse.body.newLeaseId).toBeNull();
    });
  });
});
