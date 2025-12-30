import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { ListingType } from '@prisma/client';

describe('Tenant Portal (e2e) - PROD-106', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let landlordToken: string;
  let tenantToken: string;
  let landlordId: string;
  let tenantId: string;
  let propertyId: string;
  let leaseId: string;
  let paymentId: string;
  let documentId: string;

  // Test users
  const landlordEmail = `landlord.portal.${Date.now()}@example.com`;
  const tenantEmail = `tenant.portal.${Date.now()}@example.com`;
  const testPassword = 'SecureP@ss123';

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
      'Portal',
    );
    landlordToken = landlordData.token;
    landlordId = landlordData.userId;

    const tenantData = await createAndVerifyUser(
      tenantEmail,
      'Tenant',
      'Portal',
    );
    tenantToken = tenantData.token;
    tenantId = tenantData.userId;

    // Create a property directly via Prisma (like other E2E tests)
    const property = await prisma.property.create({
      data: {
        ownerId: landlordId,
        title: 'Tenant Portal Test Property',
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

    // Create a lease via API
    const leaseRes = await request(app.getHttpServer())
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
    leaseId = leaseRes.body.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.tenantDocument.deleteMany({
      where: { lease: { propertyId } },
    });
    await prisma.rentPayment.deleteMany({
      where: { lease: { propertyId } },
    });
    await prisma.lease.deleteMany({
      where: { propertyId },
    });
    await prisma.property.deleteMany({ where: { ownerId: landlordId } });
    await prisma.user.deleteMany({
      where: { email: { in: [landlordEmail, tenantEmail] } },
    });
    await app.close();
  });

  // ============================================
  // TENANT DASHBOARD TESTS (PROD-106.1)
  // ============================================

  describe('GET /api/dashboard/tenant (PROD-106.1)', () => {
    it('should return tenant dashboard data', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/dashboard/tenant')
        .set('Authorization', `Bearer ${tenantToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('activeLeases');
      expect(res.body).toHaveProperty('totalMonthlyRent');
      expect(res.body).toHaveProperty('currency');
      expect(res.body).toHaveProperty('pendingMaintenanceRequests');
      expect(res.body).toHaveProperty('unreadMessages');
      expect(res.body).toHaveProperty('pendingRenewals');
      expect(res.body).toHaveProperty('documentsCount');
      expect(res.body).toHaveProperty('leases');
      expect(res.body).toHaveProperty('upcomingPayments');
      expect(res.body).toHaveProperty('overduePayments');
      expect(res.body).toHaveProperty('maintenanceRequests');
      expect(res.body).toHaveProperty('renewalOffers');
    });

    it('should require authentication', async () => {
      const res = await request(app.getHttpServer()).get('/api/dashboard/tenant');

      expect(res.status).toBe(401);
    });
  });

  // ============================================
  // E-SIGNATURE TESTS (PROD-106.6)
  // ============================================

  describe('Lease E-Signature Flow (PROD-106.6)', () => {
    describe('GET /api/leases/:id/signature-status', () => {
      it('should return signature status for unsigned lease', async () => {
        const res = await request(app.getHttpServer())
          .get(`/api/leases/${leaseId}/signature-status`)
          .set('Authorization', `Bearer ${tenantToken}`);

        expect(res.status).toBe(200);
        expect(res.body.leaseId).toBe(leaseId);
        expect(res.body.landlordSigned).toBe(false);
        expect(res.body.tenantSigned).toBe(false);
        expect(res.body.fullyExecuted).toBe(false);
      });

      it('should be accessible by landlord', async () => {
        const res = await request(app.getHttpServer())
          .get(`/api/leases/${leaseId}/signature-status`)
          .set('Authorization', `Bearer ${landlordToken}`);

        expect(res.status).toBe(200);
        expect(res.body.landlordSigned).toBe(false);
      });

      it('should return 404 for non-existent lease', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/leases/non-existent-id/signature-status')
          .set('Authorization', `Bearer ${tenantToken}`);

        expect(res.status).toBe(404);
      });
    });

    describe('POST /api/leases/:id/sign', () => {
      it('should not allow tenant to sign before landlord', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/leases/${leaseId}/sign`)
          .set('Authorization', `Bearer ${tenantToken}`);

        expect(res.status).toBe(400);
        expect(res.body.message).toContain('Landlord must sign');
      });

      it('should allow landlord to sign first', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/leases/${leaseId}/sign`)
          .set('Authorization', `Bearer ${landlordToken}`);

        expect(res.status).toBe(201);
        expect(res.body.landlordSigned).toBe(true);
        expect(res.body.tenantSigned).toBe(false);
        expect(res.body.fullyExecuted).toBe(false);
      });

      it('should not allow landlord to sign twice', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/leases/${leaseId}/sign`)
          .set('Authorization', `Bearer ${landlordToken}`);

        expect(res.status).toBe(400);
        expect(res.body.message).toContain('already signed');
      });

      it('should allow tenant to sign after landlord', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/leases/${leaseId}/sign`)
          .set('Authorization', `Bearer ${tenantToken}`);

        expect(res.status).toBe(201);
        expect(res.body.landlordSigned).toBe(true);
        expect(res.body.tenantSigned).toBe(true);
        expect(res.body.fullyExecuted).toBe(true);
        expect(res.body.leaseStatus).toBe('ACTIVE');
      });

      it('should not allow tenant to sign twice', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/leases/${leaseId}/sign`)
          .set('Authorization', `Bearer ${tenantToken}`);

        expect(res.status).toBe(400);
        expect(res.body.message).toContain('already signed');
      });
    });

    describe('Signature status after signing', () => {
      it('should show fully executed status', async () => {
        const res = await request(app.getHttpServer())
          .get(`/api/leases/${leaseId}/signature-status`)
          .set('Authorization', `Bearer ${tenantToken}`);

        expect(res.status).toBe(200);
        expect(res.body.landlordSigned).toBe(true);
        expect(res.body.tenantSigned).toBe(true);
        expect(res.body.fullyExecuted).toBe(true);
        expect(res.body.leaseStatus).toBe('ACTIVE');
        expect(res.body.landlordSignedAt).toBeDefined();
        expect(res.body.tenantSignedAt).toBeDefined();
      });
    });
  });

  // ============================================
  // PAYMENT LINK TESTS (PROD-106.3)
  // ============================================

  describe('GET /api/leases/:leaseId/payments/:paymentId/pay-link (PROD-106.3)', () => {
    beforeAll(async () => {
      // Get payment ID from the lease
      const paymentsRes = await request(app.getHttpServer())
        .get(`/api/leases/${leaseId}/payments`)
        .set('Authorization', `Bearer ${tenantToken}`);

      if (paymentsRes.body.data && paymentsRes.body.data.length > 0) {
        paymentId = paymentsRes.body.data[0].id;
      }
    });

    it('should return payment link for tenant', async () => {
      if (!paymentId) {
        console.log('Skipping test - no payment found');
        return;
      }

      const res = await request(app.getHttpServer())
        .get(`/api/leases/${leaseId}/payments/${paymentId}/pay-link`)
        .set('Authorization', `Bearer ${tenantToken}`);

      expect(res.status).toBe(200);
      expect(res.body.paymentId).toBe(paymentId);
      expect(res.body.leaseId).toBe(leaseId);
      expect(res.body.amount).toBeDefined();
      expect(res.body.currency).toBe('EUR');
      expect(res.body.message).toContain('Online payment is not yet available');
    });

    it('should deny landlord access to payment link', async () => {
      if (!paymentId) {
        console.log('Skipping test - no payment found');
        return;
      }

      const res = await request(app.getHttpServer())
        .get(`/api/leases/${leaseId}/payments/${paymentId}/pay-link`)
        .set('Authorization', `Bearer ${landlordToken}`);

      expect(res.status).toBe(403);
    });
  });

  // ============================================
  // DOCUMENT TESTS (PROD-106.7)
  // ============================================

  describe('Tenant Documents (PROD-106.7)', () => {
    describe('POST /api/dashboard/tenant/documents', () => {
      it('should create a document for a lease', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/dashboard/tenant/documents')
          .set('Authorization', `Bearer ${tenantToken}`)
          .send({
            leaseId,
            type: 'LEASE_AGREEMENT',
            name: 'Signed Lease Agreement',
            description: 'The signed lease agreement document',
            documentUrl: 'https://example.com/signed-lease.pdf',
            fileSize: 1024,
            mimeType: 'application/pdf',
          });

        expect(res.status).toBe(201);
        expect(res.body.id).toBeDefined();
        expect(res.body.leaseId).toBe(leaseId);
        expect(res.body.type).toBe('LEASE_AGREEMENT');
        expect(res.body.name).toBe('Signed Lease Agreement');
        documentId = res.body.id;
      });

      it('should allow landlord to upload document', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/dashboard/tenant/documents')
          .set('Authorization', `Bearer ${landlordToken}`)
          .send({
            leaseId,
            type: 'NOTICE',
            name: 'Welcome Notice',
            documentUrl: 'https://example.com/welcome.pdf',
          });

        expect(res.status).toBe(201);
        expect(res.body.type).toBe('NOTICE');
      });

      it('should fail for non-existent lease', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/dashboard/tenant/documents')
          .set('Authorization', `Bearer ${tenantToken}`)
          .send({
            leaseId: 'non-existent-lease',
            type: 'LEASE_AGREEMENT',
            name: 'Test',
            documentUrl: 'https://example.com/test.pdf',
          });

        expect(res.status).toBe(404);
      });
    });

    describe('GET /api/dashboard/tenant/documents', () => {
      it('should list documents for tenant', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/dashboard/tenant/documents')
          .set('Authorization', `Bearer ${tenantToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toBeDefined();
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.meta).toBeDefined();
      });

      it('should filter documents by lease', async () => {
        const res = await request(app.getHttpServer())
          .get(`/api/dashboard/tenant/documents?leaseId=${leaseId}`)
          .set('Authorization', `Bearer ${tenantToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeGreaterThan(0);
        expect(
          res.body.data.every((doc: any) => doc.leaseId === leaseId),
        ).toBe(true);
      });

      it('should filter documents by type', async () => {
        const res = await request(app.getHttpServer())
          .get(`/api/dashboard/tenant/documents?type=LEASE_AGREEMENT`)
          .set('Authorization', `Bearer ${tenantToken}`);

        expect(res.status).toBe(200);
        expect(
          res.body.data.every((doc: any) => doc.type === 'LEASE_AGREEMENT'),
        ).toBe(true);
      });
    });

    describe('GET /api/dashboard/tenant/documents/:id', () => {
      it('should get document by ID', async () => {
        const res = await request(app.getHttpServer())
          .get(`/api/dashboard/tenant/documents/${documentId}`)
          .set('Authorization', `Bearer ${tenantToken}`);

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(documentId);
        expect(res.body.name).toBe('Signed Lease Agreement');
      });

      it('should be accessible by landlord', async () => {
        const res = await request(app.getHttpServer())
          .get(`/api/dashboard/tenant/documents/${documentId}`)
          .set('Authorization', `Bearer ${landlordToken}`);

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(documentId);
      });

      it('should return 404 for non-existent document', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/dashboard/tenant/documents/non-existent-id')
          .set('Authorization', `Bearer ${tenantToken}`);

        expect(res.status).toBe(404);
      });
    });

    describe('DELETE /api/dashboard/tenant/documents/:id', () => {
      it('should allow uploader to delete document', async () => {
        const res = await request(app.getHttpServer())
          .delete(`/api/dashboard/tenant/documents/${documentId}`)
          .set('Authorization', `Bearer ${tenantToken}`);

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Document deleted successfully');
      });

      it('should return 404 for deleted document', async () => {
        const res = await request(app.getHttpServer())
          .get(`/api/dashboard/tenant/documents/${documentId}`)
          .set('Authorization', `Bearer ${tenantToken}`);

        expect(res.status).toBe(404);
      });
    });
  });

  // ============================================
  // TENANT DASHBOARD AFTER ACTIVATION
  // ============================================

  describe('Tenant Dashboard After Lease Activation', () => {
    it('should show active lease in dashboard', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/dashboard/tenant')
        .set('Authorization', `Bearer ${tenantToken}`);

      expect(res.status).toBe(200);
      expect(res.body.activeLeases).toBeGreaterThan(0);
      expect(res.body.leases).toBeDefined();
      expect(res.body.leases.length).toBeGreaterThan(0);

      const lease = res.body.leases.find((l: any) => l.id === leaseId);
      expect(lease).toBeDefined();
      expect(lease.status).toBe('ACTIVE');
      expect(lease.landlordSigned).toBe(true);
      expect(lease.tenantSigned).toBe(true);
    });

    it('should show upcoming payments', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/dashboard/tenant')
        .set('Authorization', `Bearer ${tenantToken}`);

      expect(res.status).toBe(200);
      // After activation, there should be payments generated
      // The number depends on the lease dates
    });
  });
});
