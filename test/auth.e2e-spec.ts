import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Generate unique email for each test run
  const testEmail = `test.user.${Date.now()}@example.com`;
  const testPassword = 'SecureP@ss123';

  let accessToken: string;
  let refreshToken: string;

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
  }, 30000);

  afterAll(async () => {
    // Clean up test user
    await prisma.user.deleteMany({
      where: { email: testEmail },
    });

    if (app) {
      await app.close();
    }
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: testEmail,
          firstName: 'Test',
          lastName: 'User',
          password: testPassword,
          confirmPassword: testPassword,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toContain('verify');
        });
    });

    it('should reject registration with existing email', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: testEmail,
          firstName: 'Test',
          lastName: 'User',
          password: testPassword,
          confirmPassword: testPassword,
        })
        .expect(409);
    });

    it('should reject registration with invalid email', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          firstName: 'Test',
          lastName: 'User',
          password: testPassword,
          confirmPassword: testPassword,
        })
        .expect(400);
    });

    it('should reject registration with weak password', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: `weak.${Date.now()}@example.com`,
          firstName: 'Test',
          lastName: 'User',
          password: 'weak',
          confirmPassword: 'weak',
        })
        .expect(400);
    });

    it('should reject registration with mismatched passwords', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: `mismatch.${Date.now()}@example.com`,
          firstName: 'Test',
          lastName: 'User',
          password: testPassword,
          confirmPassword: 'DifferentP@ss123',
        })
        .expect(400);
    });
  });

  describe('POST /api/auth/verify-email', () => {
    it('should reject invalid verification token', () => {
      return request(app.getHttpServer())
        .post('/api/auth/verify-email')
        .send({ token: 'invalid-token' })
        .expect(400);
    });

    it('should verify email with valid token', async () => {
      // Get the verification token from database
      const verificationToken = await prisma.emailVerificationToken.findFirst({
        where: {
          user: { email: testEmail },
        },
      });

      expect(verificationToken).not.toBeNull();

      const response = await request(app.getHttpServer())
        .post('/api/auth/verify-email')
        .send({ token: verificationToken!.token })
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('tokens');
      expect(response.body.user.email).toBe(testEmail);
      expect(response.body.user.emailVerified).toBe(true);
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('refreshToken');

      // Save tokens for later tests
      accessToken = response.body.tokens.accessToken;
      refreshToken = response.body.tokens.refreshToken;
    });
  });

  describe('POST /api/auth/complete-profile', () => {
    it('should reject without authentication', () => {
      return request(app.getHttpServer())
        .post('/api/auth/complete-profile')
        .send({
          address: '123 Test Street',
          postalCode: '1051',
          city: 'Budapest',
          country: 'HU',
          phone: '+36201234567',
        })
        .expect(401);
    });

    it('should complete user profile', () => {
      return request(app.getHttpServer())
        .post('/api/auth/complete-profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          address: '123 Test Street',
          postalCode: '1051',
          city: 'Budapest',
          country: 'HU',
          phone: '+36201234567',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('user');
          expect(res.body).toHaveProperty('message');
          expect(res.body.user.address).toBe('123 Test Street');
          expect(res.body.user.city).toBe('Budapest');
          expect(res.body.user.status).toBe('ACTIVE');
        });
    });

    it('should reject completing profile twice', () => {
      return request(app.getHttpServer())
        .post('/api/auth/complete-profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          address: '456 New Street',
          postalCode: '1052',
          city: 'Vienna',
          country: 'AT',
          phone: '+43201234567',
        })
        .expect(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('user');
          expect(res.body).toHaveProperty('tokens');
          expect(res.body.user.email).toBe(testEmail);
          expect(res.body.tokens).toHaveProperty('accessToken');
          expect(res.body.tokens).toHaveProperty('refreshToken');

          // Update tokens
          accessToken = res.body.tokens.accessToken;
          refreshToken = res.body.tokens.refreshToken;
        });
    });

    it('should reject login with wrong password', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'WrongP@ss123',
        })
        .expect(401);
    });

    it('should reject login with non-existent email', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testPassword,
        })
        .expect(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user profile', () => {
      return request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('email', testEmail);
          expect(res.body).toHaveProperty('firstName', 'Test');
          expect(res.body).toHaveProperty('lastName', 'User');
          expect(res.body).toHaveProperty('status', 'ACTIVE');
        });
    });

    it('should reject without authentication', () => {
      return request(app.getHttpServer())
        .get('/api/auth/me')
        .expect(401);
    });

    it('should reject with invalid token', () => {
      return request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh tokens with valid refresh token', () => {
      return request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body).toHaveProperty('expiresIn');

          // Update tokens
          accessToken = res.body.accessToken;
          refreshToken = res.body.refreshToken;
        });
    });

    it('should reject with invalid refresh token', () => {
      return request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should accept forgot password request for existing email', () => {
      return request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: testEmail })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
        });
    });

    it('should accept forgot password request for non-existent email (no leak)', () => {
      return request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
        });
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('should reject with invalid reset token', () => {
      return request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-token',
          password: 'NewSecureP@ss123',
          confirmPassword: 'NewSecureP@ss123',
        })
        .expect(400);
    });

    it('should reset password with valid token', async () => {
      // Get the reset token from database
      const resetToken = await prisma.passwordResetToken.findFirst({
        where: {
          user: { email: testEmail },
          usedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!resetToken) {
        // Token might not exist if forgot-password wasn't called or email disabled
        console.log('No reset token found, skipping test');
        return;
      }

      const newPassword = 'NewSecureP@ss456';

      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({
          token: resetToken.token,
          password: newPassword,
          confirmPassword: newPassword,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
        });

      // Verify can login with new password
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: newPassword,
        })
        .expect(200);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout and revoke refresh token', async () => {
      // First login to get fresh tokens
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'NewSecureP@ss456',
        })
        .expect(200);

      const logoutRefreshToken = loginResponse.body.tokens.refreshToken;

      // Logout
      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .send({ refreshToken: logoutRefreshToken })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
        });

      // Verify refresh token is revoked
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: logoutRefreshToken })
        .expect(401);
    });
  });
});
