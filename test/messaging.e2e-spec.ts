import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('MessagingController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Test users
  const user1Email = `user1.msg.${Date.now()}@example.com`;
  const user2Email = `user2.msg.${Date.now()}@example.com`;
  const user3Email = `user3.msg.${Date.now()}@example.com`;
  const testPassword = 'SecureP@ss123';

  let user1Token: string;
  let user2Token: string;
  let user3Token: string;
  let user1Id: string;
  let user2Id: string;
  let propertyId: string;
  let negotiationId: string;
  let conversationId: string;
  let messageId: string;

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

    // Helper to create and verify a user
    const createUser = async (
      email: string,
      firstName: string,
      lastName: string,
    ) => {
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

      let token = verifyResponse.body.tokens.accessToken;

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

      token = loginResponse.body.tokens.accessToken;
      const userId = loginResponse.body.user.id;

      return { token, userId };
    };

    // Create test users
    const user1 = await createUser(user1Email, 'User', 'One');
    user1Token = user1.token;
    user1Id = user1.userId;

    const user2 = await createUser(user2Email, 'User', 'Two');
    user2Token = user2.token;
    user2Id = user2.userId;

    const user3 = await createUser(user3Email, 'User', 'Three');
    user3Token = user3.token;

    // Create a property for user1
    const propertyResponse = await request(app.getHttpServer())
      .post('/api/properties')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        title: 'Test Property for Messaging',
        address: '123 Message Street',
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
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ status: 'ACTIVE' });

    // Create a negotiation between user2 (buyer) and user1 (seller)
    const negotiationResponse = await request(app.getHttpServer())
      .post('/api/negotiations')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({
        propertyId,
        type: 'BUY',
        initialOfferAmount: 95000,
        currency: 'EUR',
      });

    negotiationId = negotiationResponse.body.id;
  }, 90000);

  afterAll(async () => {
    // Clean up
    const users = await prisma.user.findMany({
      where: { email: { in: [user1Email, user2Email, user3Email] } },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);

    if (userIds.length > 0) {
      // Delete in proper order due to FK constraints
      await prisma.message.deleteMany({
        where: { senderId: { in: userIds } },
      });
      await prisma.conversationParticipant.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.conversation.deleteMany({
        where: {
          OR: [
            { negotiation: { buyerId: { in: userIds } } },
            { negotiation: { sellerId: { in: userIds } } },
            { property: { ownerId: { in: userIds } } },
          ],
        },
      });
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

  // ============ CREATE CONVERSATION ============

  describe('POST /api/messages/conversations', () => {
    it('should require authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/messages/conversations')
        .send({ recipientId: user2Id });

      expect(response.status).toBe(401);
    });

    it('should require at least one context (recipientId, propertyId, or negotiationId)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/messages/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should create a direct conversation with recipient', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/messages/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          recipientId: user2Id,
          subject: 'Test Conversation',
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.subject).toBe('Test Conversation');
      expect(response.body.participants).toHaveLength(2);

      conversationId = response.body.id;
    });

    it('should create a conversation with initial message', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/messages/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          recipientId: user2Id,
          subject: 'Conversation with Message',
          initialMessage: 'Hello, this is the first message!',
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
    });

    it('should create a conversation linked to a property', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/messages/conversations')
        .set('Authorization', `Bearer ${user3Token}`)
        .send({
          propertyId,
          subject: 'Property Inquiry',
          initialMessage: 'I am interested in this property',
        });

      expect(response.status).toBe(201);
      expect(response.body.propertyId).toBe(propertyId);
      // Should include property owner as participant
      expect(response.body.participants.length).toBeGreaterThanOrEqual(2);
    });

    it('should create/get a conversation linked to a negotiation', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/messages/conversations')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          negotiationId,
        });

      expect(response.status).toBe(201);
      expect(response.body.negotiationId).toBe(negotiationId);
    });

    it('should return existing conversation for same negotiation', async () => {
      // First call creates
      const response1 = await request(app.getHttpServer())
        .post('/api/messages/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ negotiationId });

      // Second call should return same conversation
      const response2 = await request(app.getHttpServer())
        .post('/api/messages/conversations')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ negotiationId });

      expect(response1.body.id).toBe(response2.body.id);
    });

    it('should reject non-existent recipient', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/messages/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          recipientId: '00000000-0000-0000-0000-000000000000',
        });

      expect(response.status).toBe(404);
    });
  });

  // ============ LIST CONVERSATIONS ============

  describe('GET /api/messages/conversations', () => {
    it('should require authentication', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/messages/conversations',
      );

      expect(response.status).toBe(401);
    });

    it('should list user conversations', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/messages/conversations')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.total).toBeGreaterThan(0);
    });

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/messages/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .query({ page: 1, limit: 2 });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeLessThanOrEqual(2);
      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.limit).toBe(2);
    });

    it('should filter archived conversations', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/messages/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .query({ isArchived: true });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should include last message in response', async () => {
      // First send a message
      await request(app.getHttpServer())
        .post(`/api/messages/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ content: 'Test message for listing' });

      const response = await request(app.getHttpServer())
        .get('/api/messages/conversations')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(response.status).toBe(200);
      const conv = response.body.data.find((c: any) => c.id === conversationId);
      expect(conv).toBeDefined();
      expect(conv.lastMessage).toBeDefined();
    });
  });

  // ============ GET CONVERSATION ============

  describe('GET /api/messages/conversations/:id', () => {
    it('should require authentication', async () => {
      const response = await request(app.getHttpServer()).get(
        `/api/messages/conversations/${conversationId}`,
      );

      expect(response.status).toBe(401);
    });

    it('should return conversation with messages', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/messages/conversations/${conversationId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(conversationId);
      expect(response.body.participants).toBeInstanceOf(Array);
      expect(response.body.messages).toBeInstanceOf(Array);
    });

    it('should reject access for non-participants', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/messages/conversations/${conversationId}`)
        .set('Authorization', `Bearer ${user3Token}`);

      expect(response.status).toBe(403);
    });

    it('should return 404 for non-existent conversation', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/messages/conversations/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(response.status).toBe(404);
    });
  });

  // ============ GET NEGOTIATION CONVERSATION ============

  describe('GET /api/messages/negotiations/:negotiationId/conversation', () => {
    it('should require authentication', async () => {
      const response = await request(app.getHttpServer()).get(
        `/api/messages/negotiations/${negotiationId}/conversation`,
      );

      expect(response.status).toBe(401);
    });

    it('should return conversation for negotiation', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/messages/negotiations/${negotiationId}/conversation`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(response.status).toBe(200);
      expect(response.body.negotiationId).toBe(negotiationId);
    });

    it('should reject access for users not in negotiation', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/messages/negotiations/${negotiationId}/conversation`)
        .set('Authorization', `Bearer ${user3Token}`);

      expect(response.status).toBe(403);
    });
  });

  // ============ SEND MESSAGE ============

  describe('POST /api/messages/conversations/:id/messages', () => {
    it('should require authentication', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/messages/conversations/${conversationId}/messages`)
        .send({ content: 'Test message' });

      expect(response.status).toBe(401);
    });

    it('should send a message', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/messages/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ content: 'Hello from user1!' });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.content).toBe('Hello from user1!');
      expect(response.body.senderId).toBe(user1Id);
      expect(response.body.type).toBe('TEXT');

      messageId = response.body.id;
    });

    it('should reject empty messages', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/messages/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ content: '' });

      expect(response.status).toBe(400);
    });

    it('should reject messages from non-participants', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/messages/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${user3Token}`)
        .send({ content: 'I should not be able to send this' });

      expect(response.status).toBe(403);
    });

    it('should update lastMessageAt on conversation', async () => {
      const beforeSend = new Date();

      await request(app.getHttpServer())
        .post(`/api/messages/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ content: 'Reply from user2' });

      const response = await request(app.getHttpServer())
        .get(`/api/messages/conversations/${conversationId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(new Date(response.body.lastMessageAt).getTime()).toBeGreaterThanOrEqual(
        beforeSend.getTime(),
      );
    });
  });

  // ============ GET MESSAGES ============

  describe('GET /api/messages/conversations/:id/messages', () => {
    it('should require authentication', async () => {
      const response = await request(app.getHttpServer()).get(
        `/api/messages/conversations/${conversationId}/messages`,
      );

      expect(response.status).toBe(401);
    });

    it('should return paginated messages', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/messages/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.meta).toBeDefined();
    });

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/messages/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .query({ page: 1, limit: 5 });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    it('should reject access for non-participants', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/messages/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${user3Token}`);

      expect(response.status).toBe(403);
    });

    it('should order messages by createdAt descending', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/messages/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(response.status).toBe(200);
      const messages = response.body.data;
      if (messages.length > 1) {
        for (let i = 1; i < messages.length; i++) {
          expect(
            new Date(messages[i - 1].createdAt).getTime(),
          ).toBeGreaterThanOrEqual(new Date(messages[i].createdAt).getTime());
        }
      }
    });
  });

  // ============ MARK AS READ ============

  describe('PATCH /api/messages/conversations/:id/read', () => {
    it('should require authentication', async () => {
      const response = await request(app.getHttpServer()).patch(
        `/api/messages/conversations/${conversationId}/read`,
      );

      expect(response.status).toBe(401);
    });

    it('should mark conversation as read', async () => {
      // First send a message from user1 to create unread for user2
      await request(app.getHttpServer())
        .post(`/api/messages/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ content: 'Message to create unread' });

      // Mark as read for user2
      const response = await request(app.getHttpServer())
        .patch(`/api/messages/conversations/${conversationId}/read`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Conversation marked as read');
    });

    it('should reset unread count', async () => {
      // Check unread count is 0 after marking as read
      const response = await request(app.getHttpServer())
        .get('/api/messages/conversations')
        .set('Authorization', `Bearer ${user2Token}`);

      const conv = response.body.data.find((c: any) => c.id === conversationId);
      expect(conv.unreadCount).toBe(0);
    });

    it('should reject for non-participants', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/messages/conversations/${conversationId}/read`)
        .set('Authorization', `Bearer ${user3Token}`);

      expect(response.status).toBe(404);
    });
  });

  // ============ UNREAD COUNT ============

  describe('GET /api/messages/unread-count', () => {
    it('should require authentication', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/messages/unread-count',
      );

      expect(response.status).toBe(401);
    });

    it('should return unread message count', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/messages/unread-count')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(response.status).toBe(200);
      expect(response.body.count).toBeDefined();
      expect(typeof response.body.count).toBe('number');
    });

    it('should increment after receiving messages', async () => {
      // Get initial count
      const before = await request(app.getHttpServer())
        .get('/api/messages/unread-count')
        .set('Authorization', `Bearer ${user1Token}`);

      // Send message from user2 to user1
      await request(app.getHttpServer())
        .post(`/api/messages/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ content: 'New message for user1' });

      // Check count increased
      const after = await request(app.getHttpServer())
        .get('/api/messages/unread-count')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(after.body.count).toBeGreaterThan(before.body.count);
    });
  });

  // ============ ARCHIVE/UNARCHIVE ============

  describe('PATCH /api/messages/conversations/:id/archive', () => {
    it('should require authentication', async () => {
      const response = await request(app.getHttpServer()).patch(
        `/api/messages/conversations/${conversationId}/archive`,
      );

      expect(response.status).toBe(401);
    });

    it('should archive a conversation', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/messages/conversations/${conversationId}/archive`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Conversation archived');
    });

    it('should not show archived in default list', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/messages/conversations')
        .set('Authorization', `Bearer ${user1Token}`);

      const conv = response.body.data.find((c: any) => c.id === conversationId);
      expect(conv).toBeUndefined();
    });

    it('should show archived when filtered', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/messages/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .query({ isArchived: true });

      const conv = response.body.data.find((c: any) => c.id === conversationId);
      expect(conv).toBeDefined();
    });
  });

  describe('PATCH /api/messages/conversations/:id/unarchive', () => {
    it('should unarchive a conversation', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/messages/conversations/${conversationId}/unarchive`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Conversation unarchived');
    });

    it('should show in default list after unarchive', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/messages/conversations')
        .set('Authorization', `Bearer ${user1Token}`);

      const conv = response.body.data.find((c: any) => c.id === conversationId);
      expect(conv).toBeDefined();
    });
  });

  // ============ DELETE MESSAGE ============

  describe('DELETE /api/messages/:messageId', () => {
    let messageToDelete: string;

    beforeAll(async () => {
      // Create a message to delete
      const response = await request(app.getHttpServer())
        .post(`/api/messages/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ content: 'Message to be deleted' });

      messageToDelete = response.body.id;
    });

    it('should require authentication', async () => {
      const response = await request(app.getHttpServer()).delete(
        `/api/messages/${messageToDelete}`,
      );

      expect(response.status).toBe(401);
    });

    it('should not allow deleting others messages', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/messages/${messageToDelete}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(response.status).toBe(403);
    });

    it('should delete own message', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/messages/${messageToDelete}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Message deleted');
    });

    it('should return 404 for deleted message', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/messages/${messageToDelete}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(response.status).toBe(404);
    });
  });

  // ============ CONVERSATION FLOW ============

  describe('Full Messaging Flow', () => {
    let flowConversationId: string;

    it('should support a complete conversation flow', async () => {
      // 1. User1 creates a conversation with User2
      const createResponse = await request(app.getHttpServer())
        .post('/api/messages/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          recipientId: user2Id,
          subject: 'Flow Test Conversation',
          initialMessage: 'Hi, how are you?',
        });

      expect(createResponse.status).toBe(201);
      flowConversationId = createResponse.body.id;

      // 2. User2 receives unread notification
      const unreadResponse = await request(app.getHttpServer())
        .get('/api/messages/unread-count')
        .set('Authorization', `Bearer ${user2Token}`);

      expect(unreadResponse.body.count).toBeGreaterThan(0);

      // 3. User2 reads the conversation
      const readResponse = await request(app.getHttpServer())
        .get(`/api/messages/conversations/${flowConversationId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(readResponse.status).toBe(200);
      expect(readResponse.body.messages.length).toBeGreaterThan(0);

      // 4. User2 marks as read
      await request(app.getHttpServer())
        .patch(`/api/messages/conversations/${flowConversationId}/read`)
        .set('Authorization', `Bearer ${user2Token}`);

      // 5. User2 replies
      const replyResponse = await request(app.getHttpServer())
        .post(`/api/messages/conversations/${flowConversationId}/messages`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ content: "I'm doing great, thanks for asking!" });

      expect(replyResponse.status).toBe(201);

      // 6. User1 sees the conversation in their list
      const listResponse = await request(app.getHttpServer())
        .get('/api/messages/conversations')
        .set('Authorization', `Bearer ${user1Token}`);

      const conv = listResponse.body.data.find(
        (c: any) => c.id === flowConversationId,
      );
      expect(conv).toBeDefined();
      expect(conv.lastMessage.content).toBe(
        "I'm doing great, thanks for asking!",
      );
    });
  });
});
