import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('UsersController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Test user credentials
  const testEmail = `user.test.${Date.now()}@example.com`;
  const testPassword = 'SecureP@ss123';

  // Second user for cross-user tests
  const otherEmail = `other.user.${Date.now()}@example.com`;

  // Admin user
  const adminEmail = `admin.test.${Date.now()}@example.com`;

  let accessToken: string;
  let userId: string;
  let otherAccessToken: string;
  let otherUserId: string;
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
        firstName: 'Test',
        lastName: 'User',
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
        lastName: 'Person',
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
    otherUserId = otherVerifyResponse.body.user.id;

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

    // Make the user an admin directly in database
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
    // Clean up test users
    await prisma.user.deleteMany({
      where: { email: { in: [testEmail, otherEmail, adminEmail] } },
    });

    if (app) {
      await app.close();
    }
  });

  // ============ USER PROFILE ============

  describe('GET /api/users/:id', () => {
    it('should get own profile', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(userId);
      expect(response.body.email).toBe(testEmail);
      expect(response.body.firstName).toBe('Test');
      expect(response.body.lastName).toBe('User');
    });

    it('should reject accessing other user profile', () => {
      return request(app.getHttpServer())
        .get(`/api/users/${otherUserId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);
    });

    it('should allow admin to access any profile', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.id).toBe(userId);
    });

    it('should reject without authentication', () => {
      return request(app.getHttpServer())
        .get(`/api/users/${userId}`)
        .expect(401);
    });

    it('should return 404 for non-existent user', () => {
      return request(app.getHttpServer())
        .get('/api/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(404);
    });
  });

  describe('GET /api/users/:id/public', () => {
    it('should get public profile', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/users/${otherUserId}/public`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('firstName');
      // Public profile should not expose sensitive data
      expect(response.body).not.toHaveProperty('email');
      expect(response.body).not.toHaveProperty('phone');
      expect(response.body).not.toHaveProperty('address');
    });

    it('should return 404 for non-existent user', () => {
      return request(app.getHttpServer())
        .get('/api/users/00000000-0000-0000-0000-000000000000/public')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('PATCH /api/users/:id', () => {
    it('should update own profile', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          firstName: 'Updated',
          lastName: 'Name',
        })
        .expect(200);

      expect(response.body.firstName).toBe('Updated');
      expect(response.body.lastName).toBe('Name');
    });

    it('should update address fields', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          address: '999 New Address',
          city: 'Prague',
          country: 'CZ',
        })
        .expect(200);

      expect(response.body.address).toBe('999 New Address');
      expect(response.body.city).toBe('Prague');
      expect(response.body.country).toBe('CZ');
    });

    it('should reject updating other user profile', () => {
      return request(app.getHttpServer())
        .patch(`/api/users/${otherUserId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ firstName: 'Hacked' })
        .expect(403);
    });

    it('should allow admin to update any profile', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/users/${otherUserId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ firstName: 'AdminUpdated' })
        .expect(200);

      expect(response.body.firstName).toBe('AdminUpdated');
    });

    it('should reject invalid phone format', () => {
      return request(app.getHttpServer())
        .patch(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ phone: 'invalid-phone' })
        .expect(400);
    });
  });

  // ============ SOCIAL PROFILES ============

  describe('GET /api/users/:id/social-profiles', () => {
    it('should get own social profiles (empty initially)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/users/${userId}/social-profiles`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should allow viewing other user social profiles (public)', async () => {
      // Social profiles are public - anyone can view them
      const response = await request(app.getHttpServer())
        .get(`/api/users/${otherUserId}/social-profiles`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('PATCH /api/users/:id/social-profiles', () => {
    it('should add social profiles', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/users/${userId}/social-profiles`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          profiles: [
            { platform: 'linkedin', profileUrl: 'https://linkedin.com/in/testuser' },
            { platform: 'twitter', profileUrl: 'https://twitter.com/testuser' },
          ],
        })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0]).toHaveProperty('platform');
      expect(response.body[0]).toHaveProperty('profileUrl');
    });

    it('should replace all social profiles', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/users/${userId}/social-profiles`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          profiles: [
            { platform: 'instagram', profileUrl: 'https://instagram.com/testuser' },
          ],
        })
        .expect(200);

      expect(response.body.length).toBe(1);
      expect(response.body[0].platform).toBe('instagram');
    });

    it('should clear social profiles with empty array', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/users/${userId}/social-profiles`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ profiles: [] })
        .expect(200);

      expect(response.body.length).toBe(0);
    });

    it('should reject invalid platform', () => {
      return request(app.getHttpServer())
        .patch(`/api/users/${userId}/social-profiles`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          profiles: [
            { platform: 'invalidplatform', profileUrl: 'https://example.com' },
          ],
        })
        .expect(400);
    });

    it('should reject invalid URL', () => {
      return request(app.getHttpServer())
        .patch(`/api/users/${userId}/social-profiles`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          profiles: [
            { platform: 'linkedin', profileUrl: 'not-a-url' },
          ],
        })
        .expect(400);
    });

    it('should reject updating other user social profiles', () => {
      return request(app.getHttpServer())
        .patch(`/api/users/${otherUserId}/social-profiles`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          profiles: [
            { platform: 'linkedin', profileUrl: 'https://linkedin.com/in/hacked' },
          ],
        })
        .expect(403);
    });
  });

  // ============ INVITATION NETWORK ============

  describe('GET /api/users/:id/invitation-network', () => {
    it('should get own invitation network', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/users/${userId}/invitation-network`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('upstream');
      expect(response.body).toHaveProperty('directInvitees');
      expect(response.body).toHaveProperty('totalDownstreamCount');
      expect(Array.isArray(response.body.upstream)).toBe(true);
      expect(Array.isArray(response.body.directInvitees)).toBe(true);
    });

    it('should reject accessing other user invitation network', () => {
      return request(app.getHttpServer())
        .get(`/api/users/${otherUserId}/invitation-network`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);
    });

    it('should allow admin to access any invitation network', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/users/${userId}/invitation-network`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('upstream');
    });
  });

  // ============ ADMIN ENDPOINTS ============

  describe('GET /api/users (Admin only)', () => {
    it('should list all users for admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(3);
    });

    it('should reject for non-admin users', () => {
      return request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);
    });

    it('should filter users by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users')
        .query({ status: 'ACTIVE' })
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.data.every((u: any) => u.status === 'ACTIVE')).toBe(true);
    });

    it('should search users', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users')
        .query({ search: 'Updated' })
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('PATCH /api/users/:id/role (Admin only)', () => {
    it('should update user role to ADMIN', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/users/${otherUserId}/role`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ role: 'ADMIN' })
        .expect(200);

      expect(response.body.role).toBe('ADMIN');
    });

    it('should reject for non-admin users', () => {
      return request(app.getHttpServer())
        .patch(`/api/users/${userId}/role`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ role: 'ADMIN' })
        .expect(403);
    });

    // Reset role back to USER
    it('should reset role back to USER', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/users/${otherUserId}/role`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ role: 'USER' })
        .expect(200);

      expect(response.body.role).toBe('USER');
    });
  });

  describe('PATCH /api/users/:id/status (Admin only)', () => {
    it('should update user status', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/users/${otherUserId}/status`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ status: 'SUSPENDED' })
        .expect(200);

      expect(response.body.status).toBe('SUSPENDED');
    });

    it('should reject for non-admin users', () => {
      return request(app.getHttpServer())
        .patch(`/api/users/${otherUserId}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'ACTIVE' })
        .expect(403);
    });

    // Reset status back to ACTIVE
    it('should reset status back to ACTIVE', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/users/${otherUserId}/status`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ status: 'ACTIVE' })
        .expect(200);

      expect(response.body.status).toBe('ACTIVE');
    });
  });

  // ============ DELETE USER ============

  describe('DELETE /api/users/:id', () => {
    it('should reject deleting other user account as non-admin', () => {
      return request(app.getHttpServer())
        .delete(`/api/users/${otherUserId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);
    });

    it('should allow admin to delete any user', async () => {
      // Create a user to delete with full setup
      const deleteEmail = `delete.test.${Date.now()}@example.com`;

      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: deleteEmail,
          firstName: 'Delete',
          lastName: 'Me',
          password: testPassword,
          confirmPassword: testPassword,
        });

      const deleteUser = await prisma.user.findFirst({
        where: { email: deleteEmail },
      });

      // Admin can delete even unverified users
      const response = await request(app.getHttpServer())
        .delete(`/api/users/${deleteUser!.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');

      // Verify user is deleted (soft delete - status should be DELETED)
      const deletedUser = await prisma.user.findUnique({
        where: { id: deleteUser!.id },
      });
      expect(deletedUser?.status).toBe('DELETED');
    });
  });
});
