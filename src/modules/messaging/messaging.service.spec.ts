import { Test, TestingModule } from '@nestjs/testing';
import { MessagingService } from './messaging.service';
import { PrismaService } from '@/database';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { MessageType } from '@prisma/client';

describe('MessagingService', () => {
  let service: MessagingService;
  let prisma: PrismaService;

  const mockUser = {
    id: 'user-123',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
  };

  const mockRecipient = {
    id: 'recipient-456',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
  };

  const mockProperty = {
    id: 'property-789',
    ownerId: mockRecipient.id,
    title: 'Test Property',
    city: 'Budapest',
  };

  const mockNegotiation = {
    id: 'negotiation-001',
    buyerId: mockUser.id,
    sellerId: mockRecipient.id,
    propertyId: mockProperty.id,
    type: 'BUY',
    status: 'ACTIVE',
  };

  const mockConversation = {
    id: 'conv-123',
    negotiationId: null,
    propertyId: null,
    subject: 'Test Subject',
    lastMessageAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    participants: [
      {
        id: 'part-1',
        conversationId: 'conv-123',
        userId: mockUser.id,
        lastReadAt: new Date(),
        unreadCount: 0,
        isArchived: false,
        isMuted: false,
        createdAt: new Date(),
        user: mockUser,
      },
      {
        id: 'part-2',
        conversationId: 'conv-123',
        userId: mockRecipient.id,
        lastReadAt: null,
        unreadCount: 1,
        isArchived: false,
        isMuted: false,
        createdAt: new Date(),
        user: mockRecipient,
      },
    ],
    messages: [],
    property: null,
    negotiation: null,
  };

  const mockMessage = {
    id: 'msg-123',
    conversationId: 'conv-123',
    senderId: mockUser.id,
    type: MessageType.TEXT,
    content: 'Hello, test message',
    isEdited: false,
    editedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    sender: mockUser,
  };

  const mockParticipant = {
    id: 'part-1',
    conversationId: 'conv-123',
    userId: mockUser.id,
    lastReadAt: new Date(),
    unreadCount: 0,
    isArchived: false,
    isMuted: false,
    createdAt: new Date(),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    property: {
      findUnique: jest.fn(),
    },
    negotiation: {
      findUnique: jest.fn(),
    },
    conversation: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    conversationParticipant: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      aggregate: jest.fn(),
    },
    message: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<MessagingService>(MessagingService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createConversation', () => {
    it('should throw BadRequestException if no context provided', async () => {
      await expect(service.createConversation(mockUser.id, {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if recipient not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.createConversation(mockUser.id, { recipientId: 'invalid-id' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if property not found', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue(null);

      await expect(
        service.createConversation(mockUser.id, { propertyId: 'invalid-id' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if negotiation not found', async () => {
      mockPrismaService.conversation.findUnique.mockResolvedValue(null);
      mockPrismaService.negotiation.findUnique.mockResolvedValue(null);

      await expect(
        service.createConversation(mockUser.id, { negotiationId: 'invalid-id' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user not part of negotiation', async () => {
      mockPrismaService.conversation.findUnique.mockResolvedValue(null);
      mockPrismaService.negotiation.findUnique.mockResolvedValue({
        ...mockNegotiation,
        buyerId: 'other-user',
        sellerId: 'other-seller',
      });

      await expect(
        service.createConversation(mockUser.id, { negotiationId: mockNegotiation.id }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return existing conversation for negotiation', async () => {
      mockPrismaService.conversation.findUnique.mockResolvedValue({
        ...mockConversation,
        negotiationId: mockNegotiation.id,
      });

      const result = await service.createConversation(mockUser.id, {
        negotiationId: mockNegotiation.id,
      });

      expect(result.id).toBe(mockConversation.id);
    });

    it('should create conversation with recipient', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockRecipient);
      mockPrismaService.conversation.create.mockResolvedValue(mockConversation);

      const result = await service.createConversation(mockUser.id, {
        recipientId: mockRecipient.id,
        subject: 'Test Subject',
      });

      expect(result.id).toBe(mockConversation.id);
      expect(mockPrismaService.conversation.create).toHaveBeenCalled();
    });

    it('should create conversation with property and add owner as participant', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue(mockProperty);
      mockPrismaService.conversation.create.mockResolvedValue({
        ...mockConversation,
        propertyId: mockProperty.id,
        property: mockProperty,
      });

      const result = await service.createConversation(mockUser.id, {
        propertyId: mockProperty.id,
      });

      expect(result.propertyId).toBe(mockProperty.id);
    });
  });

  describe('getConversations', () => {
    it('should return paginated conversations', async () => {
      mockPrismaService.conversation.findMany.mockResolvedValue([mockConversation]);
      mockPrismaService.conversation.count.mockResolvedValue(1);

      const result = await service.getConversations(mockUser.id, {});

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('should filter archived conversations', async () => {
      mockPrismaService.conversation.findMany.mockResolvedValue([]);
      mockPrismaService.conversation.count.mockResolvedValue(0);

      const result = await service.getConversations(mockUser.id, { isArchived: true });

      expect(result.data).toHaveLength(0);
      expect(mockPrismaService.conversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            participants: expect.objectContaining({
              some: expect.objectContaining({ isArchived: true }),
            }),
          }),
        }),
      );
    });

    it('should handle pagination parameters', async () => {
      mockPrismaService.conversation.findMany.mockResolvedValue([]);
      mockPrismaService.conversation.count.mockResolvedValue(50);

      const result = await service.getConversations(mockUser.id, { page: 2, limit: 10 });

      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.totalPages).toBe(5);
    });
  });

  describe('getConversation', () => {
    it('should throw NotFoundException if conversation not found', async () => {
      mockPrismaService.conversation.findUnique.mockResolvedValue(null);

      await expect(
        service.getConversation(mockUser.id, 'invalid-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user not participant', async () => {
      mockPrismaService.conversation.findUnique.mockResolvedValue({
        ...mockConversation,
        participants: [{ ...mockConversation.participants[1] }], // Only recipient
      });

      await expect(
        service.getConversation(mockUser.id, mockConversation.id),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return conversation with messages', async () => {
      mockPrismaService.conversation.findUnique.mockResolvedValue({
        ...mockConversation,
        messages: [mockMessage],
      });

      const result = await service.getConversation(mockUser.id, mockConversation.id);

      expect(result.id).toBe(mockConversation.id);
      expect(result.messages).toHaveLength(1);
    });
  });

  describe('getOrCreateNegotiationConversation', () => {
    it('should return existing conversation', async () => {
      mockPrismaService.conversation.findUnique.mockResolvedValue({
        ...mockConversation,
        negotiationId: mockNegotiation.id,
      });

      const result = await service.getOrCreateNegotiationConversation(
        mockNegotiation.id,
        mockUser.id,
      );

      expect(result.id).toBe(mockConversation.id);
    });

    it('should throw ForbiddenException if user not in negotiation', async () => {
      mockPrismaService.conversation.findUnique.mockResolvedValue({
        ...mockConversation,
        negotiationId: mockNegotiation.id,
        participants: [{ userId: 'other-user', user: { id: 'other-user', firstName: 'Other', lastName: 'User' } }],
      });

      await expect(
        service.getOrCreateNegotiationConversation(mockNegotiation.id, mockUser.id),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('archiveConversation', () => {
    it('should throw NotFoundException if participant not found', async () => {
      mockPrismaService.conversationParticipant.findUnique.mockResolvedValue(null);

      await expect(
        service.archiveConversation(mockUser.id, 'invalid-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should archive conversation for user', async () => {
      mockPrismaService.conversationParticipant.findUnique.mockResolvedValue(mockParticipant);
      mockPrismaService.conversationParticipant.update.mockResolvedValue({
        ...mockParticipant,
        isArchived: true,
      });

      const result = await service.archiveConversation(mockUser.id, mockConversation.id);

      expect(result.message).toBe('Conversation archived');
      expect(mockPrismaService.conversationParticipant.update).toHaveBeenCalledWith({
        where: { id: mockParticipant.id },
        data: { isArchived: true },
      });
    });
  });

  describe('unarchiveConversation', () => {
    it('should throw NotFoundException if participant not found', async () => {
      mockPrismaService.conversationParticipant.findUnique.mockResolvedValue(null);

      await expect(
        service.unarchiveConversation(mockUser.id, 'invalid-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should unarchive conversation for user', async () => {
      mockPrismaService.conversationParticipant.findUnique.mockResolvedValue({
        ...mockParticipant,
        isArchived: true,
      });
      mockPrismaService.conversationParticipant.update.mockResolvedValue(mockParticipant);

      const result = await service.unarchiveConversation(mockUser.id, mockConversation.id);

      expect(result.message).toBe('Conversation unarchived');
    });
  });

  describe('getMessages', () => {
    it('should throw ForbiddenException if user not participant', async () => {
      mockPrismaService.conversationParticipant.findUnique.mockResolvedValue(null);

      await expect(
        service.getMessages(mockUser.id, 'conv-id', {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return paginated messages', async () => {
      mockPrismaService.conversationParticipant.findUnique.mockResolvedValue(mockParticipant);
      mockPrismaService.message.findMany.mockResolvedValue([mockMessage]);
      mockPrismaService.message.count.mockResolvedValue(1);

      const result = await service.getMessages(mockUser.id, mockConversation.id, {});

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should handle cursor-based pagination', async () => {
      mockPrismaService.conversationParticipant.findUnique.mockResolvedValue(mockParticipant);
      mockPrismaService.message.findUnique.mockResolvedValue(mockMessage);
      mockPrismaService.message.findMany.mockResolvedValue([]);
      mockPrismaService.message.count.mockResolvedValue(10);

      const result = await service.getMessages(mockUser.id, mockConversation.id, {
        before: mockMessage.id,
      });

      expect(result.data).toHaveLength(0);
    });
  });

  describe('sendMessage', () => {
    it('should throw ForbiddenException if user not participant', async () => {
      mockPrismaService.conversationParticipant.findUnique.mockResolvedValue(null);

      await expect(
        service.sendMessage(mockUser.id, 'conv-id', { content: 'Hello' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create message and update conversation', async () => {
      mockPrismaService.conversationParticipant.findUnique.mockResolvedValue(mockParticipant);
      mockPrismaService.$transaction.mockResolvedValue([mockMessage, {}, {}]);

      const result = await service.sendMessage(mockUser.id, mockConversation.id, {
        content: 'Hello',
      });

      expect(result.id).toBe(mockMessage.id);
      expect(result.content).toBe(mockMessage.content);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });

  describe('deleteMessage', () => {
    it('should throw NotFoundException if message not found', async () => {
      mockPrismaService.message.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteMessage(mockUser.id, 'invalid-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if not message sender', async () => {
      mockPrismaService.message.findUnique.mockResolvedValue({
        ...mockMessage,
        senderId: 'other-user',
      });

      await expect(
        service.deleteMessage(mockUser.id, mockMessage.id),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should delete message successfully', async () => {
      mockPrismaService.message.findUnique.mockResolvedValue(mockMessage);
      mockPrismaService.message.delete.mockResolvedValue(mockMessage);

      const result = await service.deleteMessage(mockUser.id, mockMessage.id);

      expect(result.message).toBe('Message deleted');
    });
  });

  describe('markAsRead', () => {
    it('should throw NotFoundException if participant not found', async () => {
      mockPrismaService.conversationParticipant.findUnique.mockResolvedValue(null);

      await expect(
        service.markAsRead(mockUser.id, 'invalid-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update lastReadAt and reset unreadCount', async () => {
      mockPrismaService.conversationParticipant.findUnique.mockResolvedValue(mockParticipant);
      mockPrismaService.conversationParticipant.update.mockResolvedValue({
        ...mockParticipant,
        lastReadAt: new Date(),
        unreadCount: 0,
      });

      const result = await service.markAsRead(mockUser.id, mockConversation.id);

      expect(result.message).toBe('Conversation marked as read');
      expect(mockPrismaService.conversationParticipant.update).toHaveBeenCalledWith({
        where: { id: mockParticipant.id },
        data: expect.objectContaining({
          unreadCount: 0,
        }),
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should return total unread count', async () => {
      mockPrismaService.conversationParticipant.aggregate.mockResolvedValue({
        _sum: { unreadCount: 5 },
      });

      const result = await service.getUnreadCount(mockUser.id);

      expect(result.count).toBe(5);
    });

    it('should return 0 if no unread messages', async () => {
      mockPrismaService.conversationParticipant.aggregate.mockResolvedValue({
        _sum: { unreadCount: null },
      });

      const result = await service.getUnreadCount(mockUser.id);

      expect(result.count).toBe(0);
    });
  });

  describe('isParticipant', () => {
    it('should return true if user is participant', async () => {
      mockPrismaService.conversationParticipant.findUnique.mockResolvedValue(mockParticipant);

      const result = await service.isParticipant(mockUser.id, mockConversation.id);

      expect(result).toBe(true);
    });

    it('should return false if user is not participant', async () => {
      mockPrismaService.conversationParticipant.findUnique.mockResolvedValue(null);

      const result = await service.isParticipant(mockUser.id, mockConversation.id);

      expect(result).toBe(false);
    });
  });
});
