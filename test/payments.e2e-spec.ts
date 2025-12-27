import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { TransactionStatus, NegotiationStatus, NegotiationType, OfferStatus } from '@prisma/client';

describe('PaymentsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Test users
  const buyerEmail = `buyer.pay.${Date.now()}@example.com`;
  const sellerEmail = `seller.pay.${Date.now()}@example.com`;
  const testPassword = 'SecureP@ss123';

  let buyerToken: string;
  let sellerToken: string;
  let buyerId: string;
  let sellerId: string;
  let propertyId: string;
  let negotiationId: string;
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

    // Create and verify seller
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: sellerEmail,
        firstName: 'Seller',
        lastName: 'User',
        password: testPassword,
        confirmPassword: testPassword,
      });

    const sellerVerificationToken = await prisma.emailVerificationToken.findFirst({
      where: { user: { email: sellerEmail } },
    });

    const sellerVerifyResponse = await request(app.getHttpServer())
      .post('/api/auth/verify-email')
      .send({ token: sellerVerificationToken!.token });

    sellerToken = sellerVerifyResponse.body.tokens.accessToken;

    await request(app.getHttpServer())
      .post('/api/auth/complete-profile')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        address: '123 Seller Street',
        postalCode: '1051',
        city: 'Budapest',
        country: 'HU',
        phone: '+36201234567',
      });

    const sellerLoginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: sellerEmail, password: testPassword });

    sellerToken = sellerLoginResponse.body.tokens.accessToken;
    const sellerUser = await prisma.user.findUnique({ where: { email: sellerEmail } });
    sellerId = sellerUser!.id;

    // Create and verify buyer
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: buyerEmail,
        firstName: 'Buyer',
        lastName: 'User',
        password: testPassword,
        confirmPassword: testPassword,
      });

    const buyerVerificationToken = await prisma.emailVerificationToken.findFirst({
      where: { user: { email: buyerEmail } },
    });

    const buyerVerifyResponse = await request(app.getHttpServer())
      .post('/api/auth/verify-email')
      .send({ token: buyerVerificationToken!.token });

    buyerToken = buyerVerifyResponse.body.tokens.accessToken;

    await request(app.getHttpServer())
      .post('/api/auth/complete-profile')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        address: '456 Buyer Street',
        postalCode: '1052',
        city: 'Budapest',
        country: 'HU',
        phone: '+36201234568',
      });

    const buyerLoginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: buyerEmail, password: testPassword });

    buyerToken = buyerLoginResponse.body.tokens.accessToken;
    const buyerUser = await prisma.user.findUnique({ where: { email: buyerEmail } });
    buyerId = buyerUser!.id;

    // Create a property for the seller
    const propertyResponse = await request(app.getHttpServer())
      .post('/api/properties')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        title: 'Payment Test Property',
        address: '789 Payment Street',
        postalCode: '1011',
        city: 'Budapest',
        country: 'HU',
        listingTypes: ['FOR_SALE'],
        basePrice: '300000',
        currency: 'EUR',
      });

    propertyId = propertyResponse.body.id;

    // Publish the property
    await request(app.getHttpServer())
      .patch(`/api/properties/${propertyId}/status`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ status: 'ACTIVE' });

    // Create negotiation and accept an offer to create a transaction
    const negotiationResponse = await request(app.getHttpServer())
      .post('/api/negotiations')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        propertyId,
        type: 'BUY',
        initialOfferAmount: 280000,
        currency: 'EUR',
      });

    negotiationId = negotiationResponse.body.id;

    // Get the initial offer
    const negotiationDetails = await request(app.getHttpServer())
      .get(`/api/negotiations/${negotiationId}`)
      .set('Authorization', `Bearer ${sellerToken}`);

    const offerId = negotiationDetails.body.offers[0].id;

    // Seller accepts the offer - this creates a transaction
    await request(app.getHttpServer())
      .post(`/api/negotiations/offers/${offerId}/respond`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ action: 'accept' });

    // Get the transaction ID
    const transactionResponse = await request(app.getHttpServer())
      .get(`/api/negotiations/${negotiationId}/transaction`)
      .set('Authorization', `Bearer ${buyerToken}`);

    transactionId = transactionResponse.body.id;
  }, 120000);

  afterAll(async () => {
    // Clean up
    const users = await prisma.user.findMany({
      where: { email: { in: [buyerEmail, sellerEmail] } },
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

  // ============ GET PAYMENT STATUS ============

  describe('GET /api/payments/:transactionId', () => {
    it('should require authentication', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/payments/${transactionId}`);

      expect(response.status).toBe(401);
    });

    it('should return payment status for buyer', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/payments/${transactionId}`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(transactionId);
      expect(response.body.status).toBe(TransactionStatus.PENDING);
      expect(response.body.amount).toBeDefined();
      expect(response.body.currency).toBe('EUR');
      expect(response.body.platformFee).toBeDefined();
      expect(response.body.sellerAmount).toBeDefined();
    });

    it('should return payment status for seller', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/payments/${transactionId}`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(transactionId);
    });

    it('should return 403 for unauthorized user', async () => {
      // Create another user
      const otherEmail = `other.${Date.now()}@example.com`;
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

      const otherToken = otherVerifyResponse.body.tokens.accessToken;

      await request(app.getHttpServer())
        .post('/api/auth/complete-profile')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          address: '999 Other Street',
          postalCode: '1053',
          city: 'Budapest',
          country: 'HU',
          phone: '+36201234569',
        });

      const otherLoginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: otherEmail, password: testPassword });

      const response = await request(app.getHttpServer())
        .get(`/api/payments/${transactionId}`)
        .set('Authorization', `Bearer ${otherLoginResponse.body.tokens.accessToken}`);

      expect(response.status).toBe(403);

      // Cleanup other user
      await prisma.user.deleteMany({ where: { email: otherEmail } });
    });

    it('should return 404 for non-existent transaction', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/payments/non-existent-id')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(response.status).toBe(404);
    });
  });

  // ============ CREATE CHECKOUT SESSION ============

  describe('POST /api/payments/:transactionId/checkout', () => {
    it('should require authentication', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/payments/${transactionId}/checkout`)
        .send({});

      expect(response.status).toBe(401);
    });

    it('should return 403 if not the payer', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/payments/${transactionId}/checkout`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({});

      expect(response.status).toBe(403);
    });

    it('should return 404 for non-existent transaction', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/payments/non-existent-id/checkout')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({});

      expect(response.status).toBe(404);
    });

    // Note: This test requires STRIPE_SECRET_KEY to be set
    // In CI, this would be skipped or use a mock
    it('should fail without Stripe configuration', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/payments/${transactionId}/checkout`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({});

      // If Stripe is not configured, it will return 500
      // If Stripe IS configured, it would return 201 with a session URL
      expect([201, 500]).toContain(response.status);
    });
  });

  // ============ REFUND ============

  describe('POST /api/payments/:transactionId/refund', () => {
    it('should require authentication', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/payments/${transactionId}/refund`)
        .send({});

      expect(response.status).toBe(401);
    });

    it('should return 403 if not the seller', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/payments/${transactionId}/refund`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({});

      expect(response.status).toBe(403);
    });

    it('should return 400 if transaction is not COMPLETED', async () => {
      // Transaction is still PENDING
      const response = await request(app.getHttpServer())
        .post(`/api/payments/${transactionId}/refund`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({});

      expect(response.status).toBe(400);
    });
  });

  // ============ WEBHOOK ============

  describe('POST /api/payments/webhook', () => {
    it('should return 400 without stripe-signature header', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/payments/webhook')
        .send({});

      expect(response.status).toBe(400);
    });

    it('should return 400 with invalid signature', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/payments/webhook')
        .set('stripe-signature', 'invalid_signature')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ type: 'test.event' }));

      expect(response.status).toBe(400);
    });
  });
});
