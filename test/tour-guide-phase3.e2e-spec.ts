import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AmbientSoundCategory, PoiType, InterestCategory } from '@prisma/client';

describe('Tour Guide Phase 3 (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let configService: ConfigService;

  let userToken: string;
  let otherUserToken: string;
  let _userId: string;
  let _otherUserId: string;

  // Test data IDs
  let ambientSoundId: string;
  let offlineRegionId: string;

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
    await prisma.interestHistory.deleteMany({});
    await prisma.offlinePoiCache.deleteMany({});
    await prisma.offlineRegion.deleteMany({});
    await prisma.ambientSound.deleteMany({});
    await prisma.tourPreferences.deleteMany({
      where: { user: { email: { contains: 'tour-guide-p3-e2e' } } },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: 'tour-guide-p3-e2e' } },
    });

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'user-tour-guide-p3-e2e@test.com',
        passwordHash: 'hashed',
        firstName: 'Test',
        lastName: 'User',
        emailVerified: true,
        status: 'ACTIVE',
      },
    });
    _userId = user.id;
    userToken = jwtService.sign(
      { sub: user.id, email: user.email },
      { secret: configService.get('jwt.secret') },
    );

    // Create other user (for access control tests)
    const otherUser = await prisma.user.create({
      data: {
        email: 'other-tour-guide-p3-e2e@test.com',
        passwordHash: 'hashed',
        firstName: 'Other',
        lastName: 'User',
        emailVerified: true,
        status: 'ACTIVE',
      },
    });
    _otherUserId = otherUser.id;
    otherUserToken = jwtService.sign(
      { sub: otherUser.id, email: otherUser.email },
      { secret: configService.get('jwt.secret') },
    );

    // Create test ambient sounds
    const sound = await prisma.ambientSound.create({
      data: {
        category: AmbientSoundCategory.NATURE,
        name: 'Forest Ambience',
        description: 'Peaceful forest sounds',
        audioUrl: 'https://example.com/sounds/forest.mp3',
        duration: 300,
        loopable: true,
        tags: ['forest', 'birds', 'nature'],
      },
    });
    ambientSoundId = sound.id;

    // Create additional sounds for variety
    await prisma.ambientSound.createMany({
      data: [
        {
          category: AmbientSoundCategory.CITY,
          name: 'City Traffic',
          description: 'Urban city sounds',
          audioUrl: 'https://example.com/sounds/city.mp3',
          duration: 180,
          loopable: true,
          tags: ['city', 'traffic', 'urban'],
        },
        {
          category: AmbientSoundCategory.CAFE,
          name: 'Coffee Shop',
          description: 'Cozy cafe ambience',
          audioUrl: 'https://example.com/sounds/cafe.mp3',
          duration: 240,
          loopable: true,
          tags: ['cafe', 'coffee', 'chatter'],
        },
        {
          category: AmbientSoundCategory.PARK,
          name: 'Park Morning',
          description: 'Morning in the park',
          audioUrl: 'https://example.com/sounds/park.mp3',
          duration: 200,
          loopable: true,
          tags: ['park', 'morning', 'birds'],
        },
      ],
    });
  });

  afterAll(async () => {
    // Clean up
    await prisma.interestHistory.deleteMany({});
    await prisma.offlinePoiCache.deleteMany({});
    await prisma.offlineRegion.deleteMany({});
    await prisma.ambientSound.deleteMany({});
    await prisma.tourPreferences.deleteMany({
      where: { user: { email: { contains: 'tour-guide-p3-e2e' } } },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: 'tour-guide-p3-e2e' } },
    });
    await app.close();
  });

  // ============================================
  // AMBIENT SOUNDS (PROD-128)
  // ============================================

  describe('PROD-128: Ambient Sounds', () => {
    describe('GET /tour-guide/ambient-sounds', () => {
      it('should return all ambient sounds (PROD-128.1)', async () => {
        const response = await request(app.getHttpServer())
          .get('/tour-guide/ambient-sounds')
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
        expect(response.body[0]).toHaveProperty('id');
        expect(response.body[0]).toHaveProperty('category');
        expect(response.body[0]).toHaveProperty('name');
        expect(response.body[0]).toHaveProperty('audioUrl');
      });

      it('should filter sounds by category (PROD-128.2)', async () => {
        const response = await request(app.getHttpServer())
          .get('/tour-guide/ambient-sounds')
          .query({ category: AmbientSoundCategory.NATURE })
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        response.body.forEach((sound: any) => {
          expect(sound.category).toBe(AmbientSoundCategory.NATURE);
        });
      });

      it('should not require authentication', async () => {
        const response = await request(app.getHttpServer())
          .get('/tour-guide/ambient-sounds')
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
      });
    });

    describe('GET /tour-guide/ambient-sounds/categories', () => {
      it('should return all available categories (PROD-128.2)', async () => {
        const response = await request(app.getHttpServer())
          .get('/tour-guide/ambient-sounds/categories')
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
        expect(response.body).toContain(AmbientSoundCategory.NATURE);
        expect(response.body).toContain(AmbientSoundCategory.CITY);
      });
    });

    describe('GET /tour-guide/ambient-sounds/for-poi/:poiType', () => {
      it('should return recommended sounds for PARK (PROD-128.3)', async () => {
        const response = await request(app.getHttpServer())
          .get(`/tour-guide/ambient-sounds/for-poi/${PoiType.PARK}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        // PARK should map to NATURE and PARK categories
        response.body.forEach((sound: any) => {
          expect([AmbientSoundCategory.NATURE, AmbientSoundCategory.PARK]).toContain(
            sound.category,
          );
        });
      });

      it('should return recommended sounds for RESTAURANT (PROD-128.3)', async () => {
        const response = await request(app.getHttpServer())
          .get(`/tour-guide/ambient-sounds/for-poi/${PoiType.RESTAURANT}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        // RESTAURANT should map to CAFE and MARKET categories
        response.body.forEach((sound: any) => {
          expect([AmbientSoundCategory.CAFE, AmbientSoundCategory.MARKET]).toContain(
            sound.category,
          );
        });
      });

      it('should handle unknown POI type gracefully', async () => {
        const response = await request(app.getHttpServer())
          .get(`/tour-guide/ambient-sounds/for-poi/${PoiType.OTHER}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
      });
    });

    describe('GET /tour-guide/ambient-sounds/:id', () => {
      it('should return sound by ID (PROD-128.4)', async () => {
        const response = await request(app.getHttpServer())
          .get(`/tour-guide/ambient-sounds/${ambientSoundId}`)
          .expect(200);

        expect(response.body.id).toBe(ambientSoundId);
        expect(response.body.name).toBe('Forest Ambience');
        expect(response.body.category).toBe(AmbientSoundCategory.NATURE);
      });

      it('should return 404 for non-existent sound', async () => {
        await request(app.getHttpServer())
          .get('/tour-guide/ambient-sounds/non-existent-id')
          .expect(404);
      });
    });

    describe('GET /tour-guide/ambient-sounds/preferences', () => {
      it('should return ambient sound preferences (PROD-128.5)', async () => {
        const response = await request(app.getHttpServer())
          .get('/tour-guide/ambient-sounds/preferences')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('enabled');
        expect(response.body).toHaveProperty('volume');
        expect(typeof response.body.enabled).toBe('boolean');
        expect(typeof response.body.volume).toBe('number');
      });

      it('should require authentication', async () => {
        await request(app.getHttpServer())
          .get('/tour-guide/ambient-sounds/preferences')
          .expect(401);
      });
    });

    describe('PUT /tour-guide/ambient-sounds/preferences', () => {
      it('should update ambient sound preferences (PROD-128.5)', async () => {
        const response = await request(app.getHttpServer())
          .put('/tour-guide/ambient-sounds/preferences')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ enabled: false, volume: 0.5 })
          .expect(200);

        expect(response.body.enabled).toBe(false);
        expect(response.body.volume).toBe(0.5);
      });

      it('should validate volume range', async () => {
        await request(app.getHttpServer())
          .put('/tour-guide/ambient-sounds/preferences')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ volume: 1.5 }) // Invalid: > 1.0
          .expect(400);
      });

      it('should require authentication', async () => {
        await request(app.getHttpServer())
          .put('/tour-guide/ambient-sounds/preferences')
          .send({ enabled: true })
          .expect(401);
      });
    });
  });

  // ============================================
  // INTEREST QUERIES ENHANCEMENT (PROD-133)
  // ============================================

  describe('PROD-133: Interest Queries Enhancement', () => {
    describe('POST /tour-guide/preferences/interest-history/:interest', () => {
      it('should record interest usage (PROD-133.1)', async () => {
        const response = await request(app.getHttpServer())
          .post(`/tour-guide/preferences/interest-history/${InterestCategory.HISTORY}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(response.body.interest).toBe(InterestCategory.HISTORY);
        expect(response.body.queryCount).toBe(1);
      });

      it('should increment count on subsequent usage', async () => {
        await request(app.getHttpServer())
          .post(`/tour-guide/preferences/interest-history/${InterestCategory.HISTORY}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        const response = await request(app.getHttpServer())
          .post(`/tour-guide/preferences/interest-history/${InterestCategory.HISTORY}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(response.body.queryCount).toBeGreaterThanOrEqual(2);
      });

      it('should track multiple different interests', async () => {
        await request(app.getHttpServer())
          .post(`/tour-guide/preferences/interest-history/${InterestCategory.FOOD}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        await request(app.getHttpServer())
          .post(`/tour-guide/preferences/interest-history/${InterestCategory.ART}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        const historyResponse = await request(app.getHttpServer())
          .get('/tour-guide/preferences/interest-history')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(historyResponse.body.length).toBeGreaterThanOrEqual(3);
      });

      it('should require authentication', async () => {
        await request(app.getHttpServer())
          .post(`/tour-guide/preferences/interest-history/${InterestCategory.HISTORY}`)
          .expect(401);
      });
    });

    describe('GET /tour-guide/preferences/interest-history', () => {
      it('should return interest usage history (PROD-133.2)', async () => {
        const response = await request(app.getHttpServer())
          .get('/tour-guide/preferences/interest-history')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        if (response.body.length > 0) {
          expect(response.body[0]).toHaveProperty('interest');
          expect(response.body[0]).toHaveProperty('queryCount');
          expect(response.body[0]).toHaveProperty('lastUsedAt');
        }
      });

      it('should return empty array for user with no history', async () => {
        const response = await request(app.getHttpServer())
          .get('/tour-guide/preferences/interest-history')
          .set('Authorization', `Bearer ${otherUserToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(0);
      });

      it('should require authentication', async () => {
        await request(app.getHttpServer())
          .get('/tour-guide/preferences/interest-history')
          .expect(401);
      });
    });

    describe('GET /tour-guide/preferences/suggested-interests', () => {
      it('should return suggested interests based on history (PROD-133.3)', async () => {
        const response = await request(app.getHttpServer())
          .get('/tour-guide/preferences/suggested-interests')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('suggestions');
        expect(Array.isArray(response.body.suggestions)).toBe(true);
      });

      it('should return context-aware suggestions for POI type (PROD-133.4)', async () => {
        const response = await request(app.getHttpServer())
          .get('/tour-guide/preferences/suggested-interests')
          .query({ poiType: PoiType.MUSEUM })
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('suggestions');
        expect(response.body).toHaveProperty('basedOnPoiType');
        expect(response.body.basedOnPoiType).toBe(PoiType.MUSEUM);
        // MUSEUM should suggest HISTORY, ART, CULTURE - suggestions are now string array
        expect(
          response.body.suggestions.includes(InterestCategory.HISTORY) ||
          response.body.suggestions.includes(InterestCategory.ART) ||
          response.body.suggestions.includes(InterestCategory.CULTURE)
        ).toBe(true);
      });

      it('should respect limit parameter', async () => {
        const response = await request(app.getHttpServer())
          .get('/tour-guide/preferences/suggested-interests')
          .query({ limit: 2 })
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(response.body.suggestions.length).toBeLessThanOrEqual(2);
      });

      it('should require authentication', async () => {
        await request(app.getHttpServer())
          .get('/tour-guide/preferences/suggested-interests')
          .expect(401);
      });
    });

    describe('DELETE /tour-guide/preferences/interest-history', () => {
      it('should clear interest history (PROD-133.5)', async () => {
        // First verify we have history
        const beforeResponse = await request(app.getHttpServer())
          .get('/tour-guide/preferences/interest-history')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(beforeResponse.body.length).toBeGreaterThan(0);

        // Clear history
        await request(app.getHttpServer())
          .delete('/tour-guide/preferences/interest-history')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(204);

        // Verify cleared
        const afterResponse = await request(app.getHttpServer())
          .get('/tour-guide/preferences/interest-history')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(afterResponse.body.length).toBe(0);
      });

      it('should require authentication', async () => {
        await request(app.getHttpServer())
          .delete('/tour-guide/preferences/interest-history')
          .expect(401);
      });
    });
  });

  // ============================================
  // OFFLINE MODE (PROD-129)
  // ============================================

  describe('PROD-129: Offline Mode', () => {
    describe('POST /tour-guide/offline/regions', () => {
      it('should create an offline region (PROD-129.1)', async () => {
        const response = await request(app.getHttpServer())
          .post('/tour-guide/offline/regions')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            name: 'Budapest Downtown',
            centerLat: 47.497913,
            centerLng: 19.040236,
            radiusKm: 5,
          })
          .expect(201);

        expect(response.body.id).toBeDefined();
        expect(response.body.name).toBe('Budapest Downtown');
        expect(response.body.centerLat).toBe(47.497913);
        expect(response.body.centerLng).toBe(19.040236);
        expect(response.body.radiusKm).toBe(5);
        expect(response.body.poiCount).toBe(0);
        expect(response.body.sizeBytes).toBe(0);
        expect(response.body.expiresAt).toBeDefined();

        offlineRegionId = response.body.id;
      });

      it('should fail for duplicate region name (PROD-129.2)', async () => {
        await request(app.getHttpServer())
          .post('/tour-guide/offline/regions')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            name: 'Budapest Downtown', // Same name as before
            centerLat: 47.5,
            centerLng: 19.0,
            radiusKm: 3,
          })
          .expect(409);
      });

      it('should validate required fields', async () => {
        await request(app.getHttpServer())
          .post('/tour-guide/offline/regions')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            name: 'Missing coordinates',
            // Missing centerLat, centerLng, radiusKm
          })
          .expect(400);
      });

      it('should require authentication', async () => {
        await request(app.getHttpServer())
          .post('/tour-guide/offline/regions')
          .send({
            name: 'Unauthenticated Region',
            centerLat: 47.5,
            centerLng: 19.0,
            radiusKm: 5,
          })
          .expect(401);
      });
    });

    describe('GET /tour-guide/offline/regions', () => {
      it('should return user regions (PROD-129.3)', async () => {
        const response = await request(app.getHttpServer())
          .get('/tour-guide/offline/regions')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
        expect(response.body[0]).toHaveProperty('id');
        expect(response.body[0]).toHaveProperty('name');
        expect(response.body[0]).toHaveProperty('centerLat');
        expect(response.body[0]).toHaveProperty('centerLng');
      });

      it('should return empty array for user with no regions', async () => {
        const response = await request(app.getHttpServer())
          .get('/tour-guide/offline/regions')
          .set('Authorization', `Bearer ${otherUserToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(0);
      });

      it('should require authentication', async () => {
        await request(app.getHttpServer())
          .get('/tour-guide/offline/regions')
          .expect(401);
      });
    });

    describe('GET /tour-guide/offline/regions/:id', () => {
      it('should return region details (PROD-129.4)', async () => {
        const response = await request(app.getHttpServer())
          .get(`/tour-guide/offline/regions/${offlineRegionId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(response.body.id).toBe(offlineRegionId);
        expect(response.body.name).toBe('Budapest Downtown');
      });

      it('should return 404 for non-existent region', async () => {
        await request(app.getHttpServer())
          .get('/tour-guide/offline/regions/non-existent-id')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(404);
      });

      it('should return 403 for region owned by another user', async () => {
        await request(app.getHttpServer())
          .get(`/tour-guide/offline/regions/${offlineRegionId}`)
          .set('Authorization', `Bearer ${otherUserToken}`)
          .expect(403);
      });

      it('should require authentication', async () => {
        await request(app.getHttpServer())
          .get(`/tour-guide/offline/regions/${offlineRegionId}`)
          .expect(401);
      });
    });

    describe('POST /tour-guide/offline/regions/:id/download', () => {
      it('should download region data (PROD-129.5)', async () => {
        const response = await request(app.getHttpServer())
          .post(`/tour-guide/offline/regions/${offlineRegionId}/download`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(response.body.id).toBe(offlineRegionId);
        expect(response.body.lastSyncedAt).toBeDefined();
        // poiCount and sizeBytes will depend on actual POI service response
        expect(typeof response.body.poiCount).toBe('number');
        expect(typeof response.body.sizeBytes).toBe('number');
      });

      it('should return 404 for non-existent region', async () => {
        await request(app.getHttpServer())
          .post('/tour-guide/offline/regions/non-existent-id/download')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(404);
      });

      it('should return 403 for region owned by another user', async () => {
        await request(app.getHttpServer())
          .post(`/tour-guide/offline/regions/${offlineRegionId}/download`)
          .set('Authorization', `Bearer ${otherUserToken}`)
          .expect(403);
      });

      it('should require authentication', async () => {
        await request(app.getHttpServer())
          .post(`/tour-guide/offline/regions/${offlineRegionId}/download`)
          .expect(401);
      });
    });

    describe('GET /tour-guide/offline/regions/:id/pois', () => {
      it('should return cached POIs (PROD-129.6)', async () => {
        const response = await request(app.getHttpServer())
          .get(`/tour-guide/offline/regions/${offlineRegionId}/pois`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        // Each POI should have placeId, data, and createdAt
        if (response.body.length > 0) {
          expect(response.body[0]).toHaveProperty('placeId');
          expect(response.body[0]).toHaveProperty('data');
          expect(response.body[0]).toHaveProperty('createdAt');
        }
      });

      it('should return 403 for region owned by another user', async () => {
        await request(app.getHttpServer())
          .get(`/tour-guide/offline/regions/${offlineRegionId}/pois`)
          .set('Authorization', `Bearer ${otherUserToken}`)
          .expect(403);
      });

      it('should require authentication', async () => {
        await request(app.getHttpServer())
          .get(`/tour-guide/offline/regions/${offlineRegionId}/pois`)
          .expect(401);
      });
    });

    describe('POST /tour-guide/offline/regions/:id/narrations', () => {
      it('should pre-generate narrations (PROD-129.7)', async () => {
        const response = await request(app.getHttpServer())
          .post(`/tour-guide/offline/regions/${offlineRegionId}/narrations`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(response.body.id).toBe(offlineRegionId);
        // Size should increase if narrations were generated
        expect(typeof response.body.sizeBytes).toBe('number');
      });

      it('should return 403 for region owned by another user', async () => {
        await request(app.getHttpServer())
          .post(`/tour-guide/offline/regions/${offlineRegionId}/narrations`)
          .set('Authorization', `Bearer ${otherUserToken}`)
          .expect(403);
      });

      it('should require authentication', async () => {
        await request(app.getHttpServer())
          .post(`/tour-guide/offline/regions/${offlineRegionId}/narrations`)
          .expect(401);
      });
    });

    describe('POST /tour-guide/offline/regions/:id/sync', () => {
      it('should sync region data (PROD-129.8)', async () => {
        const response = await request(app.getHttpServer())
          .post(`/tour-guide/offline/regions/${offlineRegionId}/sync`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(response.body.id).toBe(offlineRegionId);
        expect(response.body.lastSyncedAt).toBeDefined();
        // expiresAt should be extended
        expect(new Date(response.body.expiresAt).getTime()).toBeGreaterThan(Date.now());
      });

      it('should return 403 for region owned by another user', async () => {
        await request(app.getHttpServer())
          .post(`/tour-guide/offline/regions/${offlineRegionId}/sync`)
          .set('Authorization', `Bearer ${otherUserToken}`)
          .expect(403);
      });

      it('should require authentication', async () => {
        await request(app.getHttpServer())
          .post(`/tour-guide/offline/regions/${offlineRegionId}/sync`)
          .expect(401);
      });
    });

    describe('GET /tour-guide/offline/storage', () => {
      it('should return storage usage (PROD-129.9)', async () => {
        const response = await request(app.getHttpServer())
          .get('/tour-guide/offline/storage')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('totalBytes');
        expect(response.body).toHaveProperty('regionCount');
        expect(response.body).toHaveProperty('totalPois');
        expect(typeof response.body.totalBytes).toBe('number');
        expect(typeof response.body.regionCount).toBe('number');
        expect(typeof response.body.totalPois).toBe('number');
        expect(response.body.regionCount).toBeGreaterThan(0);
      });

      it('should return zeros for user with no regions', async () => {
        const response = await request(app.getHttpServer())
          .get('/tour-guide/offline/storage')
          .set('Authorization', `Bearer ${otherUserToken}`)
          .expect(200);

        expect(response.body.totalBytes).toBe(0);
        expect(response.body.regionCount).toBe(0);
        expect(response.body.totalPois).toBe(0);
      });

      it('should require authentication', async () => {
        await request(app.getHttpServer())
          .get('/tour-guide/offline/storage')
          .expect(401);
      });
    });

    describe('DELETE /tour-guide/offline/regions/:id', () => {
      it('should return 403 for region owned by another user', async () => {
        await request(app.getHttpServer())
          .delete(`/tour-guide/offline/regions/${offlineRegionId}`)
          .set('Authorization', `Bearer ${otherUserToken}`)
          .expect(403);
      });

      it('should delete region and cached data (PROD-129.10)', async () => {
        await request(app.getHttpServer())
          .delete(`/tour-guide/offline/regions/${offlineRegionId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(204);

        // Verify deletion
        await request(app.getHttpServer())
          .get(`/tour-guide/offline/regions/${offlineRegionId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(404);

        // Verify storage is updated
        const storageResponse = await request(app.getHttpServer())
          .get('/tour-guide/offline/storage')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(storageResponse.body.regionCount).toBe(0);
      });

      it('should return 404 for non-existent region', async () => {
        await request(app.getHttpServer())
          .delete('/tour-guide/offline/regions/non-existent-id')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(404);
      });

      it('should require authentication', async () => {
        await request(app.getHttpServer())
          .delete(`/tour-guide/offline/regions/${offlineRegionId}`)
          .expect(401);
      });
    });
  });
});
