import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { LeaseStatus, RentPaymentStatus, ListingType } from '@prisma/client';

describe('LeasesController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Test users
  const landlordEmail = `landlord.${Date.now()}@example.com`;
  const tenantEmail = `tenant.${Date.now()}@example.com`;
  const otherUserEmail = `other.${Date.now()}@example.com`;
  const testPassword = 'SecureP@ss123';

  let landlordToken: string;
  let tenantToken: string;
  let otherUserToken: string;
  let landlordId: string;
  let tenantId: string;
  let propertyId: string;
  let leaseId: string;
  let paymentId: string;

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

    // Create a rental property for testing
    const property = await prisma.property.create({
      data: {
        ownerId: landlordId,
        title: 'Test Rental Apartment',
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
  });

  afterAll(async () => {
    // Clean up test data
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
        user: {
          email: { in: [landlordEmail, tenantEmail, otherUserEmail] },
        },
      },
    });
    await prisma.emailVerificationToken.deleteMany({
      where: {
        user: {
          email: { in: [landlordEmail, tenantEmail, otherUserEmail] },
        },
      },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [landlordEmail, tenantEmail, otherUserEmail] } },
    });

    await app.close();
  });

  describe('POST /leases (PROD-102.1)', () => {
    it('should create a lease', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/leases')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          propertyId,
          tenantId,
          startDate: '2025-02-01',
          endDate: '2026-01-31',
          rentAmount: 1500,
          currency: 'EUR',
          dueDay: 1,
          securityDeposit: 3000,
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.status).toBe(LeaseStatus.DRAFT);
      expect(response.body.rentAmount).toBe(1500);
      expect(response.body.property).toBeDefined();
      expect(response.body.tenant).toBeDefined();
      expect(response.body.landlord).toBeDefined();

      leaseId = response.body.id;
    });

    it('should fail when creating lease for property not owned', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/leases')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          propertyId,
          tenantId: landlordId,
          startDate: '2025-02-01',
          endDate: '2026-01-31',
          rentAmount: 1500,
          dueDay: 1,
        });

      expect(response.status).toBe(403);
    });

    it('should fail with invalid dueDay', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/leases')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          propertyId,
          tenantId,
          startDate: '2025-02-01',
          endDate: '2026-01-31',
          rentAmount: 1500,
          dueDay: 31, // Invalid
        });

      expect(response.status).toBe(400);
    });

    it('should fail without authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/leases')
        .send({
          propertyId,
          tenantId,
          startDate: '2025-02-01',
          endDate: '2026-01-31',
          rentAmount: 1500,
          dueDay: 1,
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /leases', () => {
    it('should return leases for landlord', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/leases')
        .set('Authorization', `Bearer ${landlordToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.meta).toBeDefined();
    });

    it('should return leases for tenant', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/leases')
        .set('Authorization', `Bearer ${tenantToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should filter by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/leases?status=DRAFT')
        .set('Authorization', `Bearer ${landlordToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((lease: any) => {
        expect(lease.status).toBe(LeaseStatus.DRAFT);
      });
    });

    it('should filter by role', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/leases?role=landlord')
        .set('Authorization', `Bearer ${landlordToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((lease: any) => {
        expect(lease.landlordId).toBe(landlordId);
      });
    });
  });

  describe('GET /leases/:id', () => {
    it('should return lease for landlord', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/leases/${leaseId}`)
        .set('Authorization', `Bearer ${landlordToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(leaseId);
    });

    it('should return lease for tenant', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/leases/${leaseId}`)
        .set('Authorization', `Bearer ${tenantToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(leaseId);
    });

    it('should fail for unauthorized user', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/leases/${leaseId}`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(response.status).toBe(403);
    });

    it('should fail for non-existent lease', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/leases/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${landlordToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /leases/:id', () => {
    it('should update draft lease', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/leases/${leaseId}`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          rentAmount: 1600,
        });

      expect(response.status).toBe(200);
      expect(response.body.rentAmount).toBe(1600);
    });

    it('should fail for non-landlord', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/leases/${leaseId}`)
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          rentAmount: 1700,
        });

      expect(response.status).toBe(403);
    });
  });

  describe('POST /leases/:id/activate', () => {
    it('should activate lease and generate payments', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/leases/${leaseId}/activate`)
        .set('Authorization', `Bearer ${landlordToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(LeaseStatus.ACTIVE);

      // Verify payments were generated
      const payments = await prisma.rentPayment.findMany({
        where: { leaseId },
      });
      expect(payments.length).toBeGreaterThan(0);

      // Save first payment ID for later tests
      paymentId = payments[0].id;
    });

    it('should fail to activate already active lease', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/leases/${leaseId}/activate`)
        .set('Authorization', `Bearer ${landlordToken}`);

      expect(response.status).toBe(400);
    });

    it('should fail for non-landlord', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/leases/${leaseId}/activate`)
        .set('Authorization', `Bearer ${tenantToken}`);

      expect(response.status).toBe(400); // Already active
    });
  });

  describe('GET /leases/:id/payments (PROD-102.2)', () => {
    it('should return payment history for landlord', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/leases/${leaseId}/payments`)
        .set('Authorization', `Bearer ${landlordToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should return payment history for tenant', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/leases/${leaseId}/payments`)
        .set('Authorization', `Bearer ${tenantToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should filter by status', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/leases/${leaseId}/payments?status=PENDING`)
        .set('Authorization', `Bearer ${landlordToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((payment: any) => {
        expect(payment.status).toBe(RentPaymentStatus.PENDING);
      });
    });

    it('should fail for unauthorized user', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/leases/${leaseId}/payments`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('POST /leases/:leaseId/payments/:paymentId/record (PROD-102.4)', () => {
    it('should record payment', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/leases/${leaseId}/payments/${paymentId}/record`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          paidAmount: 1600,
          paymentMethod: 'bank_transfer',
          transactionRef: 'TXN-123456',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(RentPaymentStatus.PAID);
      expect(response.body.paidAmount).toBe(1600);
    });

    it('should fail to record already paid payment', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/leases/${leaseId}/payments/${paymentId}/record`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          paidAmount: 1600,
        });

      expect(response.status).toBe(400);
    });

    it('should fail for non-landlord', async () => {
      // Get another pending payment
      const pendingPayment = await prisma.rentPayment.findFirst({
        where: { leaseId, status: 'PENDING' },
      });

      if (pendingPayment) {
        const response = await request(app.getHttpServer())
          .post(`/api/leases/${leaseId}/payments/${pendingPayment.id}/record`)
          .set('Authorization', `Bearer ${tenantToken}`)
          .send({
            paidAmount: 1600,
          });

        expect(response.status).toBe(403);
      }
    });
  });

  describe('POST /leases/:leaseId/payments/:paymentId/waive', () => {
    it('should waive payment', async () => {
      // Get a pending payment
      const pendingPayment = await prisma.rentPayment.findFirst({
        where: { leaseId, status: 'PENDING' },
      });

      if (pendingPayment) {
        const response = await request(app.getHttpServer())
          .post(`/api/leases/${leaseId}/payments/${pendingPayment.id}/waive`)
          .set('Authorization', `Bearer ${landlordToken}`)
          .send({
            reason: 'First month free promotion',
          });

        expect(response.status).toBe(200);
        expect(response.body.status).toBe(RentPaymentStatus.WAIVED);
      }
    });
  });

  describe('POST /leases/:id/terminate', () => {
    it('should terminate active lease', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/leases/${leaseId}/terminate`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          reason: 'Test termination',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(LeaseStatus.TERMINATED);
    });

    it('should fail to terminate non-active lease', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/leases/${leaseId}/terminate`)
        .set('Authorization', `Bearer ${landlordToken}`);

      expect(response.status).toBe(400);
    });
  });
});
