import { Test, TestingModule } from '@nestjs/testing';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';
import { MessageType } from '@prisma/client';

describe('MessagingController', () => {
  let controller: MessagingController;
  let service: MessagingService;

  const mockUser = { id: 'user-123', email: 'user@test.com', role: 'USER', status: 'ACTIVE' };

  const mockConversation = {
    id: 'conv-123',
    subject: 'Test Subject',
    lastMessageAt: new Date(),
    createdAt: new Date(),
    participants: [
      {
        id: 'user-123',
        odString: 'user-123',
        firstName: 'Test',
        lastName: 'User',
        unreadCount: 0,
      },
    ],
    unreadCount: 0,
  };

  const mockConversationDetail = {
    ...mockConversation,
    messages: [],
  };

  const mockMessage = {
    id: 'msg-123',
    conversationId: 'conv-123',
    senderId: 'user-123',
    sender: { id: 'user-123', firstName: 'Test', lastName: 'User' },
    type: MessageType.TEXT,
    content: 'Hello, test message',
    isEdited: false,
    createdAt: new Date(),
  };

  const mockConversationList = {
    data: [mockConversation],
    meta: {
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    },
  };

  const mockMessageList = {
    data: [mockMessage],
    meta: {
      total: 1,
      page: 1,
      limit: 50,
      totalPages: 1,
      hasMore: false,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessagingController],
      providers: [
        {
          provide: MessagingService,
          useValue: {
            getConversations: jest.fn().mockResolvedValue(mockConversationList),
            createConversation: jest.fn().mockResolvedValue(mockConversation),
            getConversation: jest.fn().mockResolvedValue(mockConversationDetail),
            getMessages: jest.fn().mockResolvedValue(mockMessageList),
            sendMessage: jest.fn().mockResolvedValue(mockMessage),
            markAsRead: jest.fn().mockResolvedValue({ message: 'Conversation marked as read' }),
            archiveConversation: jest.fn().mockResolvedValue({ message: 'Conversation archived' }),
            unarchiveConversation: jest.fn().mockResolvedValue({ message: 'Conversation unarchived' }),
            deleteMessage: jest.fn().mockResolvedValue({ message: 'Message deleted' }),
            getUnreadCount: jest.fn().mockResolvedValue({ count: 5 }),
          },
        },
      ],
    }).compile();

    controller = module.get<MessagingController>(MessagingController);
    service = module.get<MessagingService>(MessagingService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getConversations', () => {
    it('should return paginated conversations', async () => {
      const result = await controller.getConversations(mockUser, {});

      expect(service.getConversations).toHaveBeenCalledWith('user-123', {});
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should pass query parameters', async () => {
      await controller.getConversations(mockUser, { page: 2, limit: 10, isArchived: true });

      expect(service.getConversations).toHaveBeenCalledWith('user-123', {
        page: 2,
        limit: 10,
        isArchived: true,
      });
    });
  });

  describe('createConversation', () => {
    it('should create a new conversation', async () => {
      const dto = { recipientId: 'recipient-456', subject: 'Hello' };

      const result = await controller.createConversation(mockUser, dto);

      expect(service.createConversation).toHaveBeenCalledWith('user-123', dto);
      expect(result.id).toBe('conv-123');
    });

    it('should create conversation with initial message', async () => {
      const dto = {
        recipientId: 'recipient-456',
        subject: 'Hello',
        initialMessage: 'Hi there!',
      };

      await controller.createConversation(mockUser, dto);

      expect(service.createConversation).toHaveBeenCalledWith('user-123', dto);
    });
  });

  describe('getConversation', () => {
    it('should return conversation details with messages', async () => {
      const result = await controller.getConversation(mockUser, 'conv-123');

      expect(service.getConversation).toHaveBeenCalledWith('user-123', 'conv-123');
      expect(result.id).toBe('conv-123');
      expect(result.messages).toBeDefined();
    });
  });

  describe('getMessages', () => {
    it('should return paginated messages', async () => {
      const result = await controller.getMessages(mockUser, 'conv-123', {});

      expect(service.getMessages).toHaveBeenCalledWith('user-123', 'conv-123', {});
      expect(result.data).toHaveLength(1);
    });

    it('should pass pagination parameters', async () => {
      await controller.getMessages(mockUser, 'conv-123', { page: 2, limit: 25 });

      expect(service.getMessages).toHaveBeenCalledWith('user-123', 'conv-123', {
        page: 2,
        limit: 25,
      });
    });
  });

  describe('sendMessage', () => {
    it('should send a message', async () => {
      const dto = { content: 'Hello!' };

      const result = await controller.sendMessage(mockUser, 'conv-123', dto);

      expect(service.sendMessage).toHaveBeenCalledWith('user-123', 'conv-123', dto);
      expect(result.content).toBe('Hello, test message');
    });
  });

  describe('markAsRead', () => {
    it('should mark conversation as read', async () => {
      const result = await controller.markAsRead(mockUser, 'conv-123');

      expect(service.markAsRead).toHaveBeenCalledWith('user-123', 'conv-123');
      expect(result.message).toBe('Conversation marked as read');
    });
  });

  describe('archiveConversation', () => {
    it('should archive a conversation', async () => {
      const result = await controller.archiveConversation(mockUser, 'conv-123');

      expect(service.archiveConversation).toHaveBeenCalledWith('user-123', 'conv-123');
      expect(result.message).toBe('Conversation archived');
    });
  });

  describe('unarchiveConversation', () => {
    it('should unarchive a conversation', async () => {
      const result = await controller.unarchiveConversation(mockUser, 'conv-123');

      expect(service.unarchiveConversation).toHaveBeenCalledWith('user-123', 'conv-123');
      expect(result.message).toBe('Conversation unarchived');
    });
  });

  describe('deleteMessage', () => {
    it('should delete a message', async () => {
      const result = await controller.deleteMessage(mockUser, 'msg-123');

      expect(service.deleteMessage).toHaveBeenCalledWith('user-123', 'msg-123');
      expect(result.message).toBe('Message deleted');
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread message count', async () => {
      const result = await controller.getUnreadCount(mockUser);

      expect(service.getUnreadCount).toHaveBeenCalledWith('user-123');
      expect(result.count).toBe(5);
    });
  });
});
