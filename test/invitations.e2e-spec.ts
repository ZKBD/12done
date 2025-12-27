import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('InvitationsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Test user credentials
  const testEmail = `inviter.${Date.now()}@example.com`;
  const testPassword = 'SecureP@ss123';

  // Second user for cross-user tests
  const otherEmail = `other.inviter.${Date.now()}@example.com`;

  // Admin user
  const adminEmail = `admin.inviter.${Date.now()}@example.com`;

  // Invitation target emails
  const inviteeEmail1 = `invitee1.${Date.now()}@example.com`;
  const inviteeEmail2 = `invitee2.${Date.now()}@example.com`;
  const inviteeEmail3 = `invitee3.${Date.now()}@example.com`;

  let accessToken: string;
  let userId: string;
  let otherAccessToken: string;
  let adminAccessToken: string;
  let adminUserId: string;

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
        firstName: 'Inviter',
        lastName: 'Test',
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

    // Create second user
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: otherEmail,
        firstName: 'Other',
        lastName: 'Inviter',
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

    // Create admin user
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: adminEmail,
        firstName: 'Admin',
        lastName: 'Inviter',
        password: testPassword,
        confirmPassword: testPassword,
      });

    const adminVerificationToken = await prisma.emailVerificationToken.findFirst({
      where: { user: { email: adminEmail } },
    });

    const adminVerifyResponse = await request(app.getHttpServer())
      .post('/api/auth/verify-email')
      .send({ token: adminVerificationToken!.token });

    adminUserId = adminVerifyResponse.body.user.id;

    await request(app.getHttpServer())
      .post('/api/auth/complete-profile')
      .set('Authorization', `Bearer ${adminVerifyResponse.body.tokens.accessToken}`)
      .send({
        address: '789 Admin Street',
        postalCode: '1053',
        city: 'Berlin',
        country: 'DE',
        phone: '+49201234567',
      });

    // Make the user an admin
    await prisma.user.update({
      where: { id: adminUserId },
      data: { role: 'ADMIN' },
    });

    const adminLoginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: adminEmail, password: testPassword });

    adminAccessToken = adminLoginResponse.body.tokens.accessToken;
  }, 90000);

  afterAll(async () => {
    // Clean up invitations first (including any invitations created by userId)
    await prisma.invitation.deleteMany({
      where: {
        inviterId: userId,
      },
    });

    // Clean up invited user if created
    await prisma.user.deleteMany({
      where: { email: inviteeEmail3 },
    });

    // Clean up test users
    await prisma.user.deleteMany({
      where: { email: { in: [testEmail, otherEmail, adminEmail] } },
    });

    if (app) {
      await app.close();
    }
  });

  // ============ CREATE INVITATION ============

  describe('POST /api/invitations', () => {
    it('should create an invitation', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/invitations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: inviteeEmail1 })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe(inviteeEmail1);
      expect(response.body.status).toBe('PENDING');
    });

    it('should reject duplicate invitation to same email', () => {
      return request(app.getHttpServer())
        .post('/api/invitations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: inviteeEmail1 })
        .expect(409);
    });

    it('should reject self-invitation', () => {
      return request(app.getHttpServer())
        .post('/api/invitations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: testEmail })
        .expect(400);
    });

    it('should reject invitation to existing user', () => {
      return request(app.getHttpServer())
        .post('/api/invitations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: otherEmail })
        .expect(409);
    });

    it('should reject invalid email format', () => {
      return request(app.getHttpServer())
        .post('/api/invitations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: 'invalid-email' })
        .expect(400);
    });

    it('should reject without authentication', () => {
      return request(app.getHttpServer())
        .post('/api/invitations')
        .send({ email: inviteeEmail2 })
        .expect(401);
    });

    it('should create another invitation', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/invitations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: inviteeEmail2 })
        .expect(201);

      expect(response.body.email).toBe(inviteeEmail2);
    });
  });

  // ============ LIST INVITATIONS ============

  describe('GET /api/invitations', () => {
    it('should list user\'s invitations', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/invitations')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/invitations')
        .query({ status: 'PENDING' })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.every((inv: any) => inv.status === 'PENDING')).toBe(true);
    });

    it('should return empty list for user with no invitations', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/invitations')
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .expect(200);

      expect(response.body.data.length).toBe(0);
    });

    it('should reject without authentication', () => {
      return request(app.getHttpServer())
        .get('/api/invitations')
        .expect(401);
    });
  });

  // ============ GET STATS ============

  describe('GET /api/invitations/stats', () => {
    it('should get invitation statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/invitations/stats')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('pending');
      expect(response.body).toHaveProperty('accepted');
      expect(response.body.total).toBeGreaterThanOrEqual(2);
      expect(response.body.pending).toBeGreaterThanOrEqual(2);
    });

    it('should return zero stats for user with no invitations', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/invitations/stats')
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .expect(200);

      expect(response.body.total).toBe(0);
    });

    it('should reject without authentication', () => {
      return request(app.getHttpServer())
        .get('/api/invitations/stats')
        .expect(401);
    });
  });

  // ============ GET KICKBACK ELIGIBLE ============

  describe('GET /api/invitations/kickback-eligible', () => {
    it('should get kickback eligible invitations (empty for pending)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/invitations/kickback-eligible')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // All invitations are pending, so no kickback-eligible ones
      expect(response.body.length).toBe(0);
    });

    it('should reject without authentication', () => {
      return request(app.getHttpServer())
        .get('/api/invitations/kickback-eligible')
        .expect(401);
    });
  });

  // ============ GET BY ID ============

  describe('GET /api/invitations/:id', () => {
    let getTestInvitationId: string;
    const getTestEmail = `get.test.${Date.now()}@example.com`;

    beforeAll(async () => {
      // Create a fresh invitation for GET tests
      const response = await request(app.getHttpServer())
        .post('/api/invitations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: getTestEmail });
      getTestInvitationId = response.body.id;
    });

    it('should get invitation by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/invitations/${getTestInvitationId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(getTestInvitationId);
      expect(response.body.email).toBe(getTestEmail);
    });

    it('should reject accessing other user\'s invitation', () => {
      return request(app.getHttpServer())
        .get(`/api/invitations/${getTestInvitationId}`)
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .expect(403);
    });

    it('should allow admin to access any invitation', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/invitations/${getTestInvitationId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.id).toBe(getTestInvitationId);
    });

    it('should return 404 for non-existent invitation', () => {
      return request(app.getHttpServer())
        .get('/api/invitations/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  // ============ RESEND INVITATION ============

  describe('POST /api/invitations/:id/resend', () => {
    let resendTestInvitationId: string;
    const resendTestEmail = `resend.test.${Date.now()}@example.com`;

    beforeAll(async () => {
      // Create a fresh invitation for resend tests
      const response = await request(app.getHttpServer())
        .post('/api/invitations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: resendTestEmail });
      resendTestInvitationId = response.body.id;
    });

    it('should resend invitation', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/invitations/${resendTestInvitationId}/resend`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(resendTestInvitationId);
      expect(response.body.status).toBe('PENDING');
    });

    it('should reject resending other user\'s invitation', () => {
      return request(app.getHttpServer())
        .post(`/api/invitations/${resendTestInvitationId}/resend`)
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent invitation', () => {
      return request(app.getHttpServer())
        .post('/api/invitations/00000000-0000-0000-0000-000000000000/resend')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  // ============ ADMIN CLEANUP ============

  describe('POST /api/invitations/admin/cleanup-expired (Admin only)', () => {
    it('should cleanup expired invitations', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/invitations/admin/cleanup-expired')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('message');
    });

    it('should reject for non-admin users', () => {
      return request(app.getHttpServer())
        .post('/api/invitations/admin/cleanup-expired')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);
    });
  });

  // ============ CANCEL INVITATION ============

  describe('DELETE /api/invitations/:id', () => {
    let cancelTestInvitationId: string;
    const cancelTestEmail = `cancel.test.${Date.now()}@example.com`;

    beforeAll(async () => {
      // Create a fresh invitation for cancel tests
      const response = await request(app.getHttpServer())
        .post('/api/invitations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: cancelTestEmail });
      cancelTestInvitationId = response.body.id;
    });

    it('should reject cancelling other user\'s invitation', () => {
      return request(app.getHttpServer())
        .delete(`/api/invitations/${cancelTestInvitationId}`)
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .expect(403);
    });

    it('should cancel invitation', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/invitations/${cancelTestInvitationId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    it('should reject cancelling already cancelled invitation', () => {
      return request(app.getHttpServer())
        .delete(`/api/invitations/${cancelTestInvitationId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('should return 404 for non-existent invitation', () => {
      return request(app.getHttpServer())
        .delete('/api/invitations/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  // ============ ACCEPT INVITATION FLOW ============

  describe('Invitation acceptance flow', () => {
    let newInvitationId: string;
    let invitationToken: string;

    it('should create a new invitation for acceptance test', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/invitations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: inviteeEmail3 })
        .expect(201);

      newInvitationId = response.body.id;

      // Get token from database since it's not returned in response
      const invitation = await prisma.invitation.findUnique({
        where: { id: newInvitationId },
      });
      invitationToken = invitation!.token;
    });

    it('should mark invitation as accepted when user registers with token', async () => {
      // Register using the invitation token
      const registerResponse = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: inviteeEmail3,
          firstName: 'Invited',
          lastName: 'User',
          password: testPassword,
          confirmPassword: testPassword,
          invitationToken,
        })
        .expect(201);

      expect(registerResponse.body).toHaveProperty('message');

      // Check invitation status - should be ACCEPTED immediately after registration
      const response = await request(app.getHttpServer())
        .get(`/api/invitations/${newInvitationId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.status).toBe('ACCEPTED');
    });

    it('should show accepted invitation in stats', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/invitations/stats')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.accepted).toBeGreaterThanOrEqual(1);
    });
  });
});
