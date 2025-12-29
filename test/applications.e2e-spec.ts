import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { ApplicationStatus, ListingType } from '@prisma/client';

describe('ApplicationsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Test users
  const ownerEmail = `owner.${Date.now()}@example.com`;
  const applicantEmail = `applicant.${Date.now()}@example.com`;
  const otherUserEmail = `other.${Date.now()}@example.com`;
  const testPassword = 'SecureP@ss123';

  let ownerToken: string;
  let applicantToken: string;
  let otherUserToken: string;
  let ownerId: string;
  let applicantId: string;
  let propertyId: string;
  let applicationId: string;

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
    const ownerData = await createAndVerifyUser(ownerEmail, 'Owner', 'User');
    ownerToken = ownerData.token;
    ownerId = ownerData.userId;

    const applicantData = await createAndVerifyUser(
      applicantEmail,
      'Applicant',
      'User',
    );
    applicantToken = applicantData.token;
    applicantId = applicantData.userId;

    const otherUserData = await createAndVerifyUser(
      otherUserEmail,
      'Other',
      'User',
    );
    otherUserToken = otherUserData.token;

    // Create a rental property for testing
    const property = await prisma.property.create({
      data: {
        ownerId,
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
    await prisma.rentalApplication.deleteMany({
      where: {
        OR: [{ applicantId }, { property: { ownerId } }],
      },
    });
    await prisma.property.deleteMany({ where: { ownerId } });
    await prisma.notification.deleteMany({
      where: {
        OR: [
          { user: { email: ownerEmail } },
          { user: { email: applicantEmail } },
          { user: { email: otherUserEmail } },
        ],
      },
    });
    await prisma.refreshToken.deleteMany({
      where: {
        user: {
          email: { in: [ownerEmail, applicantEmail, otherUserEmail] },
        },
      },
    });
    await prisma.emailVerificationToken.deleteMany({
      where: {
        user: {
          email: { in: [ownerEmail, applicantEmail, otherUserEmail] },
        },
      },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [ownerEmail, applicantEmail, otherUserEmail] } },
    });

    await app.close();
  });

  describe('POST /properties/:propertyId/apply (PROD-101.3)', () => {
    it('should create a rental application', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/properties/${propertyId}/apply`)
        .set('Authorization', `Bearer ${applicantToken}`)
        .send({
          employmentStatus: 'employed',
          employer: 'Tech Company',
          jobTitle: 'Software Engineer',
          monthlyIncome: 5000,
          incomeCurrency: 'EUR',
          desiredMoveInDate: '2025-02-01',
          desiredLeaseTerm: 12,
          numberOfOccupants: 2,
          hasPets: false,
          additionalNotes: 'Looking forward to renting this apartment.',
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.status).toBe(ApplicationStatus.PENDING);
      expect(response.body.employmentStatus).toBe('employed');
      expect(response.body.employer).toBe('Tech Company');
      expect(response.body.monthlyIncome).toBe(5000);
      expect(response.body.property).toBeDefined();
      expect(response.body.property.id).toBe(propertyId);

      applicationId = response.body.id;
    });

    it('should fail when applying twice to the same property', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/properties/${propertyId}/apply`)
        .set('Authorization', `Bearer ${applicantToken}`)
        .send({
          employmentStatus: 'employed',
        });

      expect(response.status).toBe(409);
    });

    it('should fail when applying to own property', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/properties/${propertyId}/apply`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          employmentStatus: 'employed',
        });

      expect(response.status).toBe(403);
    });

    it('should fail for non-existent property', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/properties/00000000-0000-0000-0000-000000000000/apply')
        .set('Authorization', `Bearer ${applicantToken}`)
        .send({
          employmentStatus: 'employed',
        });

      expect(response.status).toBe(404);
    });

    it('should fail without authentication', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/properties/${propertyId}/apply`)
        .send({
          employmentStatus: 'employed',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /applications (PROD-101.4)', () => {
    it('should return user applications', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/applications')
        .set('Authorization', `Bearer ${applicantToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.total).toBeGreaterThan(0);
    });

    it('should filter by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/applications?status=PENDING')
        .set('Authorization', `Bearer ${applicantToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((app: any) => {
        expect(app.status).toBe(ApplicationStatus.PENDING);
      });
    });

    it('should return empty list for user with no applications', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/applications')
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });
  });

  describe('GET /applications/:id', () => {
    it('should return application for applicant', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/applications/${applicationId}`)
        .set('Authorization', `Bearer ${applicantToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(applicationId);
      expect(response.body.applicant).toBeDefined();
      expect(response.body.property).toBeDefined();
    });

    it('should return application for property owner', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/applications/${applicationId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(applicationId);
    });

    it('should fail for unauthorized user', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/applications/${applicationId}`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(response.status).toBe(403);
    });

    it('should fail for non-existent application', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/applications/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${applicantToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /properties/:propertyId/applications', () => {
    it('should return applications for property owner', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/properties/${propertyId}/applications`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should fail for non-owner', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/properties/${propertyId}/applications`)
        .set('Authorization', `Bearer ${applicantToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('PATCH /applications/:id/review (PROD-101.5)', () => {
    it('should allow owner to set status to UNDER_REVIEW', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/applications/${applicationId}/review`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          status: 'UNDER_REVIEW',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(ApplicationStatus.UNDER_REVIEW);
    });

    it('should allow owner to approve with notes', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/applications/${applicationId}/review`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          status: 'APPROVED',
          ownerNotes: 'Welcome! You can move in on the requested date.',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(ApplicationStatus.APPROVED);
      expect(response.body.ownerNotes).toBe(
        'Welcome! You can move in on the requested date.',
      );
      expect(response.body.reviewedAt).toBeDefined();
    });

    it('should fail for non-owner', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/applications/${applicationId}/review`)
        .set('Authorization', `Bearer ${applicantToken}`)
        .send({
          status: 'REJECTED',
        });

      expect(response.status).toBe(403);
    });

    it('should fail with invalid status', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/applications/${applicationId}/review`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          status: 'INVALID_STATUS',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /applications/:id/withdraw', () => {
    let withdrawableApplicationId: string;

    beforeAll(async () => {
      // Create a new application that can be withdrawn
      const newProperty = await prisma.property.create({
        data: {
          ownerId,
          title: 'Another Rental Apartment',
          address: '456 Test Street',
          postalCode: '1052',
          city: 'Budapest',
          country: 'HU',
          listingTypes: [ListingType.LONG_TERM_RENT],
          basePrice: 2000,
          currency: 'EUR',
          status: 'ACTIVE',
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/api/properties/${newProperty.id}/apply`)
        .set('Authorization', `Bearer ${applicantToken}`)
        .send({
          employmentStatus: 'employed',
        });

      withdrawableApplicationId = response.body.id;
    });

    it('should allow applicant to withdraw pending application', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/applications/${withdrawableApplicationId}/withdraw`)
        .set('Authorization', `Bearer ${applicantToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(ApplicationStatus.WITHDRAWN);
    });

    it('should fail to withdraw already withdrawn application', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/applications/${withdrawableApplicationId}/withdraw`)
        .set('Authorization', `Bearer ${applicantToken}`);

      expect(response.status).toBe(400);
    });

    it('should fail for non-applicant', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/applications/${applicationId}/withdraw`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(response.status).toBe(403);
    });

    it('should fail to withdraw approved application', async () => {
      // applicationId was approved in previous test
      const response = await request(app.getHttpServer())
        .patch(`/api/applications/${applicationId}/withdraw`)
        .set('Authorization', `Bearer ${applicantToken}`);

      expect(response.status).toBe(400);
    });
  });
});
