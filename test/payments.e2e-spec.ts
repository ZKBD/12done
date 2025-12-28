import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('PaymentsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Test users
  const buyerEmail = `buyer.pay.${Date.now()}@example.com`;
  const sellerEmail = `seller.pay.${Date.now()}@example.com`;
  const strangerEmail = `stranger.pay.${Date.now()}@example.com`;
  const testPassword = 'SecureP@ss123';

  let buyerToken: string;
  let sellerToken: string;
  let strangerToken: string;
  let propertyId: string;
  let negotiationId: string;
  let mockSessionId: string;
  let transactionId: string;

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
    const createUser = async (
      email: string,
      firstName: string,
      address: string,
    ): Promise<string> => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email,
          firstName,
          lastName: 'User',
          password: testPassword,
          confirmPassword: testPassword,
        });

      const verificationToken = await prisma.emailVerificationToken.findFirst({
        where: { user: { email } },
      });

      await request(app.getHttpServer())
        .post('/api/auth/verify-email')
        .send({ token: verificationToken!.token });

      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: testPassword });

      const token = loginResponse.body.tokens.accessToken;

      await request(app.getHttpServer())
        .post('/api/auth/complete-profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          address,
          postalCode: '1051',
          city: 'Budapest',
          country: 'HU',
          phone: '+36201234567',
        });

      // Re-login to get fresh token
      const freshLogin = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: testPassword });

      return freshLogin.body.tokens.accessToken;
    };

    // Create all test users
    sellerToken = await createUser(sellerEmail, 'Seller', '123 Seller St');
    buyerToken = await createUser(buyerEmail, 'Buyer', '456 Buyer St');
    strangerToken = await createUser(strangerEmail, 'Stranger', '789 Stranger St');

    // Create a property for the seller
    const propertyResponse = await request(app.getHttpServer())
      .post('/api/properties')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        title: 'Payment Test Property',
        address: '123 Payment Street',
        postalCode: '1011',
        city: 'Budapest',
        country: 'HU',
        listingTypes: ['FOR_SALE'],
        basePrice: '100000',
        currency: 'EUR',
      });

    propertyId = propertyResponse.body.id;

    // Publish the property
    await request(app.getHttpServer())
      .patch(`/api/properties/${propertyId}/status`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ status: 'ACTIVE' });

    // Create a negotiation
    const negotiationResponse = await request(app.getHttpServer())
      .post('/api/negotiations')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        propertyId,
        type: 'BUY',
        initialOfferAmount: 95000,
        currency: 'EUR',
        message: 'I want to buy this property',
      });

    negotiationId = negotiationResponse.body.id;

    // Get the pending offer and accept it to create an ACCEPTED negotiation
    const negotiationDetails = await request(app.getHttpServer())
      .get(`/api/negotiations/${negotiationId}`)
      .set('Authorization', `Bearer ${sellerToken}`);

    const pendingOffer = negotiationDetails.body.offers.find(
      (o: { status: string }) => o.status === 'PENDING',
    );

    if (pendingOffer) {
      await request(app.getHttpServer())
        .post(`/api/negotiations/offers/${pendingOffer.id}/respond`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ action: 'accept' });
    }
  }, 90000);

  afterAll(async () => {
    // Clean up test data
    const users = await prisma.user.findMany({
      where: { email: { in: [buyerEmail, sellerEmail, strangerEmail] } },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);

    if (userIds.length > 0) {
      await prisma.transaction.deleteMany({
        where: {
          OR: [
            { payerId: { in: userIds } },
            { negotiation: { sellerId: { in: userIds } } },
          ],
        },
      });
      await prisma.negotiation.deleteMany({
        where: {
          OR: [{ buyerId: { in: userIds } }, { sellerId: { in: userIds } }],
        },
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

  // ============ CHECKOUT ENDPOINTS ============

  describe('POST /api/payments/checkout', () => {
    it('should require authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/payments/checkout')
        .send({ negotiationId });

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent negotiation', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/payments/checkout')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ negotiationId: '00000000-0000-0000-0000-000000000000' });

      expect(response.status).toBe(404);
    });

    it('should return 403 if user is not the buyer', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/payments/checkout')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ negotiationId });

      expect(response.status).toBe(403);
    });

    it('should return 403 for unauthorized user (stranger)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/payments/checkout')
        .set('Authorization', `Bearer ${strangerToken}`)
        .send({ negotiationId });

      expect(response.status).toBe(403);
    });

    it('should create a mock checkout session for buyer', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/payments/checkout')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ negotiationId });

      expect(response.status).toBe(201);
      expect(response.body.sessionId).toBeDefined();
      expect(response.body.sessionId).toContain('mock_session_');
      expect(response.body.url).toBeDefined();
      expect(response.body.url).toContain('mock=true');

      mockSessionId = response.body.sessionId;
    });

    it('should reuse existing pending transaction on subsequent checkout', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/payments/checkout')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ negotiationId });

      expect(response.status).toBe(201);
      // Should reuse the same session for the same negotiation
      expect(response.body.sessionId).toBeDefined();
    });
  });

  // ============ PAYMENT STATUS ============

  describe('GET /api/payments/status/:sessionId', () => {
    it('should require authentication', async () => {
      const response = await request(app.getHttpServer()).get(
        `/api/payments/status/${mockSessionId}`,
      );

      expect(response.status).toBe(401);
    });

    it('should return payment status for buyer', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/payments/status/${mockSessionId}`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBeDefined();
      expect(response.body.transactionId).toBeDefined();
      expect(response.body.amount).toBeDefined();
      expect(response.body.currency).toBe('EUR');

      transactionId = response.body.transactionId;
    });

    it('should return payment status for seller', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/payments/status/${mockSessionId}`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.transactionId).toBe(transactionId);
    });

    it('should return 403 for unauthorized user (stranger)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/payments/status/${mockSessionId}`)
        .set('Authorization', `Bearer ${strangerToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 404 for non-existent session', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/payments/status/mock_session_nonexistent')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(response.status).toBe(404);
    });
  });

  // ============ COMPLETE MOCK PAYMENT ============

  describe('POST /api/payments/complete-mock/:sessionId', () => {
    it('should require authentication', async () => {
      const response = await request(app.getHttpServer()).post(
        `/api/payments/complete-mock/${mockSessionId}`,
      );

      expect(response.status).toBe(401);
    });

    it('should return 400 for non-mock session', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/payments/complete-mock/cs_real_session_123')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(response.status).toBe(400);
    });

    it('should return 403 if user is not the buyer', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/payments/complete-mock/${mockSessionId}`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(403);
    });

    it('should complete mock payment for buyer', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/payments/complete-mock/${mockSessionId}`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(transactionId);
      expect(response.body.status).toBe('COMPLETED');
      expect(response.body.paidAt).toBeDefined();
    });

    it('should return completed transaction on subsequent calls (idempotent)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/payments/complete-mock/${mockSessionId}`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('COMPLETED');
    });
  });

  // ============ TRANSACTIONS LIST ============

  describe('GET /api/payments/transactions', () => {
    it('should require authentication', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/payments/transactions',
      );

      expect(response.status).toBe(401);
    });

    it('should return transactions for buyer', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/payments/transactions')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.total).toBeGreaterThan(0);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(20);
      expect(response.body.totalPages).toBeGreaterThanOrEqual(1);
    });

    it('should return transactions for seller', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/payments/transactions')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should support pagination parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/payments/transactions')
        .query({ page: 1, limit: 5 })
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(5);
    });

    it('should filter by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/payments/transactions')
        .query({ status: 'COMPLETED' })
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((tx: { status: string }) => {
        expect(tx.status).toBe('COMPLETED');
      });
    });

    it('should return empty for stranger with no transactions', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/payments/transactions')
        .set('Authorization', `Bearer ${strangerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(0);
    });
  });

  // ============ SINGLE TRANSACTION ============

  describe('GET /api/payments/transactions/:id', () => {
    it('should require authentication', async () => {
      const response = await request(app.getHttpServer()).get(
        `/api/payments/transactions/${transactionId}`,
      );

      expect(response.status).toBe(401);
    });

    it('should return transaction details for buyer', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/payments/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(transactionId);
      expect(response.body.amount).toBeDefined();
      expect(response.body.currency).toBe('EUR');
      expect(response.body.platformFee).toBeDefined();
      expect(response.body.sellerAmount).toBeDefined();
      expect(response.body.status).toBe('COMPLETED');
      expect(response.body.negotiation).toBeDefined();
      expect(response.body.negotiation.property).toBeDefined();
    });

    it('should return transaction details for seller', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/payments/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(transactionId);
    });

    it('should return 403 for unauthorized user (stranger)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/payments/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${strangerToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 404 for non-existent transaction', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/payments/transactions/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(response.status).toBe(404);
    });
  });

  // ============ PAYMENT STATS ============

  describe('GET /api/payments/stats', () => {
    it('should require authentication', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/payments/stats',
      );

      expect(response.status).toBe(401);
    });

    it('should return stats for buyer (showing spent amount)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/payments/stats')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.totalSpent).toBeDefined();
      expect(parseFloat(response.body.totalSpent)).toBeGreaterThan(0);
      expect(response.body.totalEarnings).toBeDefined();
      expect(response.body.pendingPayouts).toBeDefined();
      expect(response.body.completedTransactions).toBeGreaterThan(0);
      expect(response.body.currency).toBe('USD');
    });

    it('should return stats for seller (showing earnings)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/payments/stats')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
      expect(parseFloat(response.body.totalEarnings)).toBeGreaterThan(0);
      expect(response.body.completedTransactions).toBeGreaterThan(0);
    });

    it('should return zero stats for stranger with no transactions', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/payments/stats')
        .set('Authorization', `Bearer ${strangerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.completedTransactions).toBe(0);
      expect(parseFloat(response.body.totalSpent)).toBe(0);
      expect(parseFloat(response.body.totalEarnings)).toBe(0);
    });
  });

  // ============ REFUND ============

  describe('POST /api/payments/refund', () => {
    it('should require authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/payments/refund')
        .send({
          transactionId,
          reason: 'Changed my mind',
        });

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent transaction', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/payments/refund')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          transactionId: '00000000-0000-0000-0000-000000000000',
          reason: 'Test refund',
        });

      expect(response.status).toBe(404);
    });

    it('should return 403 if user is not the buyer (seller cannot request refund)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/payments/refund')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          transactionId,
          reason: 'Seller trying to refund',
        });

      expect(response.status).toBe(403);
    });

    it('should return 403 for unauthorized user (stranger)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/payments/refund')
        .set('Authorization', `Bearer ${strangerToken}`)
        .send({
          transactionId,
          reason: 'Stranger trying to refund',
        });

      expect(response.status).toBe(403);
    });

    it('should process refund for buyer', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/payments/refund')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          transactionId,
          reason: 'Changed my mind about the property',
        });

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(transactionId);
      expect(response.body.status).toBe('REFUNDED');
    });

    it('should return 400 when trying to refund already refunded transaction', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/payments/refund')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          transactionId,
          reason: 'Trying to refund again',
        });

      expect(response.status).toBe(400);
    });
  });

  // ============ WEBHOOK ============

  describe('POST /api/payments/webhook', () => {
    it('should accept webhook without JWT authentication (Stripe calls this)', async () => {
      // Webhook endpoint should not require JWT auth, but in mock mode it handles gracefully
      const response = await request(app.getHttpServer())
        .post('/api/payments/webhook')
        .set('stripe-signature', 'test_signature')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ type: 'test.event' }));

      // In mock mode, webhook handling is graceful - it shouldn't fail with 401
      // The exact response depends on whether Stripe is configured
      expect(response.status).not.toBe(401);
    });
  });
});
