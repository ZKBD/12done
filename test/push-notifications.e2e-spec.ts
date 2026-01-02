import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { PushPlatform } from '@prisma/client';

describe('PushNotificationController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testEmail = `push.test.${Date.now()}@example.com`;
  const testPassword = 'SecureP@ss123';

  let accessToken: string;
  let userId: string;
  let registeredTokenId: string;

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
        firstName: 'Push',
        lastName: 'Tester',
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
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.pushToken.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await app.close();
  });

  describe('POST /api/push-notifications/register', () => {
    it('should register a new iOS push token (PROD-041.4 E2E)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/push-notifications/register')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          token: 'test-ios-fcm-token-abc123',
          platform: PushPlatform.IOS,
          deviceId: 'iphone-uuid-123',
          deviceName: 'iPhone 15 Pro',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.platform).toBe(PushPlatform.IOS);
      expect(response.body.deviceName).toBe('iPhone 15 Pro');
      expect(response.body.isActive).toBe(true);

      registeredTokenId = response.body.id;
    });

    it('should register an Android push token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/push-notifications/register')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          token: 'test-android-fcm-token-xyz789',
          platform: PushPlatform.ANDROID,
          deviceId: 'android-uuid-456',
          deviceName: 'Pixel 8',
        })
        .expect(201);

      expect(response.body.platform).toBe(PushPlatform.ANDROID);
      expect(response.body.deviceName).toBe('Pixel 8');
    });

    it('should register a Web push token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/push-notifications/register')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          token: 'test-web-push-token-web123',
          platform: PushPlatform.WEB,
        })
        .expect(201);

      expect(response.body.platform).toBe(PushPlatform.WEB);
    });

    it('should update existing token on re-registration', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/push-notifications/register')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          token: 'test-ios-fcm-token-abc123',
          platform: PushPlatform.IOS,
          deviceId: 'iphone-uuid-123',
          deviceName: 'iPhone 15 Pro Max', // Updated name
        })
        .expect(201);

      expect(response.body.deviceName).toBe('iPhone 15 Pro Max');
      expect(response.body.id).toBe(registeredTokenId); // Same ID
    });

    it('should reject registration without authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/push-notifications/register')
        .send({
          token: 'unauthorized-token',
          platform: PushPlatform.IOS,
        })
        .expect(401);
    });

    it('should reject registration with invalid platform', async () => {
      await request(app.getHttpServer())
        .post('/api/push-notifications/register')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          token: 'test-token',
          platform: 'INVALID_PLATFORM',
        })
        .expect(400);
    });

    it('should reject registration without token', async () => {
      await request(app.getHttpServer())
        .post('/api/push-notifications/register')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          platform: PushPlatform.IOS,
        })
        .expect(400);
    });
  });

  describe('GET /api/push-notifications/devices', () => {
    it('should list all registered devices for the user', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/push-notifications/devices')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(3); // iOS, Android, Web

      const platforms = response.body.map((d: { platform: string }) => d.platform);
      expect(platforms).toContain(PushPlatform.IOS);
      expect(platforms).toContain(PushPlatform.ANDROID);
      expect(platforms).toContain(PushPlatform.WEB);
    });

    it('should reject listing without authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/push-notifications/devices')
        .expect(401);
    });
  });

  describe('DELETE /api/push-notifications/devices/:tokenId', () => {
    let tokenToDelete: string;

    beforeAll(async () => {
      // Register a token specifically for deletion test
      const response = await request(app.getHttpServer())
        .post('/api/push-notifications/register')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          token: 'token-to-delete-' + Date.now(),
          platform: PushPlatform.IOS,
          deviceName: 'Device to Delete',
        });
      tokenToDelete = response.body.id;
    });

    it('should unregister a device by ID', async () => {
      await request(app.getHttpServer())
        .delete(`/api/push-notifications/devices/${tokenToDelete}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      // Verify token is deactivated (not deleted, just inactive)
      const token = await prisma.pushToken.findUnique({
        where: { id: tokenToDelete },
      });
      expect(token?.isActive).toBe(false);
    });

    it('should return 404 for non-existent token ID', async () => {
      await request(app.getHttpServer())
        .delete('/api/push-notifications/devices/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should reject deletion without authentication', async () => {
      await request(app.getHttpServer())
        .delete(`/api/push-notifications/devices/${registeredTokenId}`)
        .expect(401);
    });
  });

  describe('POST /api/push-notifications/unregister', () => {
    let tokenValueToUnregister: string;

    beforeAll(async () => {
      tokenValueToUnregister = 'logout-token-' + Date.now();
      await request(app.getHttpServer())
        .post('/api/push-notifications/register')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          token: tokenValueToUnregister,
          platform: PushPlatform.ANDROID,
          deviceName: 'Logout Test Device',
        });
    });

    it('should unregister by token value (useful for logout)', async () => {
      await request(app.getHttpServer())
        .post('/api/push-notifications/unregister')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ token: tokenValueToUnregister })
        .expect(204);

      // Verify token is deactivated
      const tokens = await prisma.pushToken.findMany({
        where: { token: tokenValueToUnregister },
      });
      expect(tokens.every((t) => t.isActive === false)).toBe(true);
    });

    it('should succeed even if token does not exist (idempotent)', async () => {
      await request(app.getHttpServer())
        .post('/api/push-notifications/unregister')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ token: 'non-existent-token-value' })
        .expect(204);
    });

    it('should reject unregister without authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/push-notifications/unregister')
        .send({ token: 'some-token' })
        .expect(401);
    });
  });
});
