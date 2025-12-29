import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

describe('Dashboard (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let configService: ConfigService;

  let landlordToken: string;
  let otherUserToken: string;
  let landlordId: string;
  let otherUserId: string;
  let propertyId: string;
  let expenseId: string;
  let leaseId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);
    configService = app.get(ConfigService);

    // Clean up test data
    await prisma.expense.deleteMany({});
    await prisma.rentPayment.deleteMany({});
    await prisma.lease.deleteMany({});
    await prisma.maintenanceRequest.deleteMany({});
    await prisma.property.deleteMany({
      where: { title: { startsWith: 'Dashboard Test' } },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: 'dashboard-e2e' } },
    });

    // Create landlord user
    const landlord = await prisma.user.create({
      data: {
        email: 'landlord-dashboard-e2e@test.com',
        passwordHash: 'hashed',
        firstName: 'Landlord',
        lastName: 'User',
        emailVerified: true,
        status: 'ACTIVE',
      },
    });
    landlordId = landlord.id;
    landlordToken = jwtService.sign(
      { sub: landlord.id, email: landlord.email },
      { secret: configService.get('jwt.secret') },
    );

    // Create other user
    const otherUser = await prisma.user.create({
      data: {
        email: 'other-dashboard-e2e@test.com',
        passwordHash: 'hashed',
        firstName: 'Other',
        lastName: 'User',
        emailVerified: true,
        status: 'ACTIVE',
      },
    });
    otherUserId = otherUser.id;
    otherUserToken = jwtService.sign(
      { sub: otherUser.id, email: otherUser.email },
      { secret: configService.get('jwt.secret') },
    );

    // Create tenant user
    const tenant = await prisma.user.create({
      data: {
        email: 'tenant-dashboard-e2e@test.com',
        passwordHash: 'hashed',
        firstName: 'Tenant',
        lastName: 'User',
        emailVerified: true,
        status: 'ACTIVE',
      },
    });

    // Create property
    const property = await prisma.property.create({
      data: {
        ownerId: landlordId,
        title: 'Dashboard Test Property',
        address: '123 Dashboard St',
        postalCode: '12345',
        city: 'Test City',
        country: 'HU',
        basePrice: 1000,
        currency: 'EUR',
        status: 'ACTIVE',
        listingTypes: ['LONG_TERM_RENT'],
      },
    });
    propertyId = property.id;

    // Create lease
    const lease = await prisma.lease.create({
      data: {
        propertyId: property.id,
        landlordId: landlordId,
        tenantId: tenant.id,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        rentAmount: 1000,
        currency: 'EUR',
        dueDay: 1,
        status: 'ACTIVE',
      },
    });
    leaseId = lease.id;

    // Create rent payment
    await prisma.rentPayment.create({
      data: {
        leaseId: lease.id,
        dueDate: new Date('2025-01-01'),
        amount: 1000,
        currency: 'EUR',
        status: 'PAID',
        paidAt: new Date('2025-01-01'),
        paidAmount: 1000,
      },
    });

    // Create maintenance request
    await prisma.maintenanceRequest.create({
      data: {
        propertyId: property.id,
        leaseId: lease.id,
        tenantId: tenant.id,
        landlordId: landlordId,
        title: 'Fix sink',
        description: 'Leaking sink',
        type: 'PLUMBING',
        priority: 'NORMAL',
        status: 'SUBMITTED',
      },
    });
  });

  afterAll(async () => {
    // Clean up
    await prisma.expense.deleteMany({});
    await prisma.maintenanceRequest.deleteMany({});
    await prisma.rentPayment.deleteMany({});
    await prisma.lease.deleteMany({});
    await prisma.property.deleteMany({
      where: { title: { startsWith: 'Dashboard Test' } },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: 'dashboard-e2e' } },
    });
    await app.close();
  });

  // ============================================
  // LANDLORD DASHBOARD (PROD-100.1)
  // ============================================

  describe('GET /dashboard/landlord', () => {
    it('should return aggregated dashboard data (PROD-100.1)', async () => {
      const response = await request(app.getHttpServer())
        .get('/dashboard/landlord')
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalProperties');
      expect(response.body).toHaveProperty('activeLeases');
      expect(response.body).toHaveProperty('vacantProperties');
      expect(response.body).toHaveProperty('pendingMaintenanceRequests');
      expect(response.body).toHaveProperty('totalExpectedIncome');
      expect(response.body).toHaveProperty('totalActualIncome');
      expect(response.body).toHaveProperty('totalExpenses');
      expect(response.body).toHaveProperty('netIncome');
      expect(response.body).toHaveProperty('properties');
      expect(response.body).toHaveProperty('monthlyIncome');
      expect(response.body).toHaveProperty('expensesByCategory');
      expect(response.body).toHaveProperty('maintenanceRequests');
    });

    it('should include property summary with status (PROD-100.2)', async () => {
      const response = await request(app.getHttpServer())
        .get('/dashboard/landlord')
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      expect(response.body.properties.length).toBeGreaterThan(0);
      expect(response.body.properties[0]).toHaveProperty('id');
      expect(response.body.properties[0]).toHaveProperty('title');
      expect(response.body.properties[0]).toHaveProperty('status');
    });

    it('should include monthly income data (PROD-100.3)', async () => {
      const response = await request(app.getHttpServer())
        .get('/dashboard/landlord')
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      expect(response.body.monthlyIncome).toBeDefined();
      if (response.body.monthlyIncome.length > 0) {
        expect(response.body.monthlyIncome[0]).toHaveProperty('month');
        expect(response.body.monthlyIncome[0]).toHaveProperty('expectedIncome');
        expect(response.body.monthlyIncome[0]).toHaveProperty('actualIncome');
      }
    });

    it('should calculate net income correctly (PROD-100.5)', async () => {
      const response = await request(app.getHttpServer())
        .get('/dashboard/landlord')
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      expect(response.body.netIncome).toBe(
        response.body.totalActualIncome - response.body.totalExpenses,
      );
    });

    it('should include maintenance requests (PROD-100.6)', async () => {
      const response = await request(app.getHttpServer())
        .get('/dashboard/landlord')
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      expect(response.body.maintenanceRequests).toBeDefined();
      expect(response.body.pendingMaintenanceRequests).toBeGreaterThanOrEqual(0);
    });

    it('should filter by date range', async () => {
      const response = await request(app.getHttpServer())
        .get('/dashboard/landlord')
        .query({ startDate: '2025-01-01', endDate: '2025-12-31' })
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalExpectedIncome');
    });

    it('should filter by propertyId', async () => {
      const response = await request(app.getHttpServer())
        .get('/dashboard/landlord')
        .query({ propertyId })
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      expect(response.body.properties.length).toBeLessThanOrEqual(1);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/dashboard/landlord')
        .expect(401);
    });
  });

  // ============================================
  // EXPENSE MANAGEMENT (PROD-100.4)
  // ============================================

  describe('POST /dashboard/expenses', () => {
    it('should create an expense (PROD-100.4)', async () => {
      const response = await request(app.getHttpServer())
        .post('/dashboard/expenses')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          propertyId,
          category: 'MAINTENANCE',
          description: 'E2E Test Expense',
          amount: 500,
          currency: 'EUR',
          expenseDate: '2025-01-15',
        })
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.category).toBe('MAINTENANCE');
      expect(response.body.amount).toBe(500);
      expenseId = response.body.id;
    });

    it('should create expense without property (general expense)', async () => {
      const response = await request(app.getHttpServer())
        .post('/dashboard/expenses')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          category: 'LEGAL',
          description: 'General legal fee',
          amount: 200,
          expenseDate: '2025-01-20',
        })
        .expect(201);

      expect(response.body.propertyId).toBeUndefined();
    });

    it('should fail with invalid property', async () => {
      await request(app.getHttpServer())
        .post('/dashboard/expenses')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          propertyId: 'non-existent-property',
          category: 'MAINTENANCE',
          description: 'Test',
          amount: 100,
          expenseDate: '2025-01-15',
        })
        .expect(404);
    });

    it('should fail when not property owner', async () => {
      await request(app.getHttpServer())
        .post('/dashboard/expenses')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({
          propertyId,
          category: 'MAINTENANCE',
          description: 'Test',
          amount: 100,
          expenseDate: '2025-01-15',
        })
        .expect(403);
    });

    it('should validate required fields', async () => {
      await request(app.getHttpServer())
        .post('/dashboard/expenses')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          description: 'Missing category and date',
        })
        .expect(400);
    });
  });

  describe('GET /dashboard/expenses', () => {
    it('should return paginated expenses', async () => {
      const response = await request(app.getHttpServer())
        .get('/dashboard/expenses')
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.page).toBe(1);
    });

    it('should filter by category', async () => {
      const response = await request(app.getHttpServer())
        .get('/dashboard/expenses')
        .query({ category: 'MAINTENANCE' })
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      response.body.data.forEach((expense: any) => {
        expect(expense.category).toBe('MAINTENANCE');
      });
    });

    it('should filter by date range', async () => {
      const response = await request(app.getHttpServer())
        .get('/dashboard/expenses')
        .query({ startDate: '2025-01-01', endDate: '2025-01-31' })
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should filter by property', async () => {
      const response = await request(app.getHttpServer())
        .get('/dashboard/expenses')
        .query({ propertyId })
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      response.body.data.forEach((expense: any) => {
        expect(expense.propertyId).toBe(propertyId);
      });
    });
  });

  describe('GET /dashboard/expenses/:id', () => {
    it('should return expense details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/dashboard/expenses/${expenseId}`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      expect(response.body.id).toBe(expenseId);
    });

    it('should fail for non-owner', async () => {
      await request(app.getHttpServer())
        .get(`/dashboard/expenses/${expenseId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent expense', async () => {
      await request(app.getHttpServer())
        .get('/dashboard/expenses/non-existent-id')
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(404);
    });
  });

  describe('PATCH /dashboard/expenses/:id', () => {
    it('should update expense', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/dashboard/expenses/${expenseId}`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({ description: 'Updated E2E expense', amount: 600 })
        .expect(200);

      expect(response.body.description).toBe('Updated E2E expense');
      expect(response.body.amount).toBe(600);
    });

    it('should fail for non-owner', async () => {
      await request(app.getHttpServer())
        .patch(`/dashboard/expenses/${expenseId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ description: 'Hacked' })
        .expect(403);
    });
  });

  describe('DELETE /dashboard/expenses/:id', () => {
    it('should fail for non-owner', async () => {
      await request(app.getHttpServer())
        .delete(`/dashboard/expenses/${expenseId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(403);
    });

    it('should delete expense', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/dashboard/expenses/${expenseId}`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      expect(response.body.message).toBe('Expense deleted successfully');

      // Verify deletion
      await request(app.getHttpServer())
        .get(`/dashboard/expenses/${expenseId}`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(404);
    });
  });
});
