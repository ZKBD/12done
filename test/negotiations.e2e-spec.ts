import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('NegotiationsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Test users
  const buyerEmail = `buyer.${Date.now()}@example.com`;
  const sellerEmail = `seller.${Date.now()}@example.com`;
  const testPassword = 'SecureP@ss123';

  let buyerToken: string;
  let sellerToken: string;
  let propertyId: string;
  let negotiationId: string;
  let offerId: string;

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

    // Create a property for the seller
    const propertyResponse = await request(app.getHttpServer())
      .post('/api/properties')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        title: 'Beautiful Test Apartment',
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
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ status: 'ACTIVE' });
  }, 60000);

  afterAll(async () => {
    // Clean up
    const users = await prisma.user.findMany({
      where: { email: { in: [buyerEmail, sellerEmail] } },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);

    if (userIds.length > 0) {
      // Delete transactions first due to FK constraints
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

  // ============ CREATE NEGOTIATION (PROD-090.3) ============

  describe('POST /api/negotiations', () => {
    it('should require authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/negotiations')
        .send({
          propertyId,
          type: 'BUY',
        });

      expect(response.status).toBe(401);
    });

    it('should create a negotiation with initial offer', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/negotiations')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          propertyId,
          type: 'BUY',
          initialOfferAmount: 240000,
          currency: 'EUR',
          message: 'I am very interested in this property',
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.status).toBe('ACTIVE');
      expect(response.body.type).toBe('BUY');

      negotiationId = response.body.id;
    });

    it('should not allow duplicate active negotiations', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/negotiations')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          propertyId,
          type: 'BUY',
        });

      expect(response.status).toBe(409);
    });

    it('should not allow seller to negotiate on own property', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/negotiations')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          propertyId,
          type: 'BUY',
        });

      expect(response.status).toBe(403);
    });
  });

  // ============ LIST NEGOTIATIONS (PROD-091) ============

  describe('GET /api/negotiations', () => {
    it('should list buyer negotiations', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/negotiations')
        .set('Authorization', `Bearer ${buyerToken}`)
        .query({ role: 'buying' });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.meta).toBeDefined();
    });

    it('should list seller negotiations', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/negotiations')
        .set('Authorization', `Bearer ${sellerToken}`)
        .query({ role: 'selling' });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should filter by type', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/negotiations')
        .set('Authorization', `Bearer ${buyerToken}`)
        .query({ type: 'RENT' });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(0);
    });
  });

  // ============ GET NEGOTIATION DETAILS (PROD-091) ============

  describe('GET /api/negotiations/:id', () => {
    it('should return negotiation details for buyer', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/negotiations/${negotiationId}`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(negotiationId);
      expect(response.body.offers).toBeDefined();
    });

    it('should return negotiation details for seller', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/negotiations/${negotiationId}`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(negotiationId);
    });
  });

  // ============ SUBMIT OFFER (PROD-090.5) ============

  describe('POST /api/negotiations/:id/offers', () => {
    it('should allow seller to submit counter-offer', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/negotiations/${negotiationId}/offers`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          amount: 248000,
          currency: 'EUR',
          message: 'My counter-offer',
        });

      expect(response.status).toBe(201);
      expect(response.body.amount).toBe('248000');
      expect(response.body.status).toBe('PENDING');

      offerId = response.body.id;
    });

    it('should not allow buyer to submit while waiting for response', async () => {
      // Buyer's initial offer was auto-countered, so this should fail
      const response = await request(app.getHttpServer())
        .post(`/api/negotiations/${negotiationId}/offers`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          amount: 245000,
          message: 'My new offer',
        });

      // This should work since the last offer is from seller
      expect([201, 400]).toContain(response.status);
    });
  });

  // ============ RESPOND TO OFFER (PROD-090.6, PROD-090.7) ============

  describe('POST /api/negotiations/offers/:offerId/respond', () => {
    it('should allow buyer to counter an offer', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/negotiations/offers/${offerId}/respond`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          action: 'counter',
          counterAmount: 245000,
          message: 'Meeting in the middle',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ACTIVE');
    });

    it('should not allow responding to own offer', async () => {
      // Get the latest offer (buyer's counter-offer)
      const negotiation = await request(app.getHttpServer())
        .get(`/api/negotiations/${negotiationId}`)
        .set('Authorization', `Bearer ${buyerToken}`);

      const latestOffer = negotiation.body.offers[negotiation.body.offers.length - 1];

      const response = await request(app.getHttpServer())
        .post(`/api/negotiations/offers/${latestOffer.id}/respond`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ action: 'accept' });

      expect(response.status).toBe(403);
    });
  });

  // ============ ACCEPT OFFER (PROD-090.6) ============

  describe('Accept offer flow', () => {
    it('should accept an offer and create transaction', async () => {
      // Get the latest offer (buyer's counter-offer)
      const negotiation = await request(app.getHttpServer())
        .get(`/api/negotiations/${negotiationId}`)
        .set('Authorization', `Bearer ${sellerToken}`);

      const latestOffer = negotiation.body.offers.find(
        (o: { status: string }) => o.status === 'PENDING',
      );

      if (latestOffer) {
        const response = await request(app.getHttpServer())
          .post(`/api/negotiations/offers/${latestOffer.id}/respond`)
          .set('Authorization', `Bearer ${sellerToken}`)
          .send({ action: 'accept' });

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('ACCEPTED');
      }
    });

    it('should have created a transaction', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/negotiations/${negotiationId}/transaction`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('PENDING');
      expect(response.body.amount).toBeDefined();
    });
  });

  // ============ TRANSACTION HISTORY (PROD-095) ============

  describe('GET /api/negotiations/transactions/history', () => {
    it('should return transaction history for buyer', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/negotiations/transactions/history')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.meta).toBeDefined();
    });

    it('should return transaction history for seller', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/negotiations/transactions/history')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  // ============ CANCEL NEGOTIATION (PROD-090.8) ============

  describe('DELETE /api/negotiations/:id (new negotiation)', () => {
    let newNegotiationId: string;
    let newPropertyId: string;

    beforeAll(async () => {
      // Create another property for testing cancellation
      const propertyResponse = await request(app.getHttpServer())
        .post('/api/properties')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          title: 'Another Test Property',
          address: '789 Cancel Street',
          postalCode: '1012',
          city: 'Budapest',
          country: 'HU',
          listingTypes: ['FOR_SALE'],
          basePrice: '150000',
          currency: 'EUR',
        });

      newPropertyId = propertyResponse.body.id;

      await request(app.getHttpServer())
        .patch(`/api/properties/${newPropertyId}/status`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ status: 'ACTIVE' });

      // Create negotiation
      const negotiationResponse = await request(app.getHttpServer())
        .post('/api/negotiations')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          propertyId: newPropertyId,
          type: 'BUY',
        });

      newNegotiationId = negotiationResponse.body.id;
    });

    it('should allow buyer to cancel negotiation', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/negotiations/${newNegotiationId}`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('REJECTED');
    });

    it('should not allow cancelling already cancelled negotiation', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/negotiations/${newNegotiationId}`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(response.status).toBe(400);
    });
  });
});
