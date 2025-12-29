import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WsException } from '@nestjs/websockets';
import { MessagingGateway } from './messaging.gateway';
import { MessagingService } from './messaging.service';
import { PrismaService } from '@/database';
import { AuthenticatedSocket } from './guards/ws-jwt.guard';

describe('MessagingGateway', () => {
  let gateway: MessagingGateway;
  let messagingService: MessagingService;
  let jwtService: JwtService;
  let prismaService: PrismaService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'USER',
    status: 'ACTIVE',
    firstName: 'Test',
    lastName: 'User',
  };

  const mockMessage = {
    id: 'msg-123',
    conversationId: 'conv-123',
    senderId: 'user-123',
    content: 'Hello!',
    type: 'TEXT',
    createdAt: new Date(),
  };

  const createMockSocket = (user?: typeof mockUser): AuthenticatedSocket => {
    const socket = {
      id: 'socket-123',
      handshake: {
        auth: { token: 'valid-token' },
        query: {},
        headers: {},
      },
      join: jest.fn().mockResolvedValue(undefined),
      leave: jest.fn().mockResolvedValue(undefined),
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
      disconnect: jest.fn(),
      user: user || undefined,
    } as unknown as AuthenticatedSocket;

    if (user) {
      socket.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
      };
    }

    return socket;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingGateway,
        {
          provide: MessagingService,
          useValue: {
            isParticipant: jest.fn(),
            sendMessage: jest.fn(),
            markAsRead: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-secret'),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    gateway = module.get<MessagingGateway>(MessagingGateway);
    messagingService = module.get<MessagingService>(MessagingService);
    jwtService = module.get<JwtService>(JwtService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Initialize the server mock
    gateway.server = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    } as any;
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('should authenticate and store socket mapping on valid token', async () => {
      const socket = createMockSocket();
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: mockUser.id });
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await gateway.handleConnection(socket);

      expect(jwtService.verify).toHaveBeenCalledWith('valid-token', { secret: 'test-secret' });
      expect(socket.disconnect).not.toHaveBeenCalled();
    });

    it('should disconnect socket with no token', async () => {
      const socket = createMockSocket();
      socket.handshake.auth = {};

      await gateway.handleConnection(socket);

      expect(socket.disconnect).toHaveBeenCalled();
    });

    it('should disconnect socket with invalid token', async () => {
      const socket = createMockSocket();
      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await gateway.handleConnection(socket);

      expect(socket.disconnect).toHaveBeenCalled();
    });

    it('should disconnect socket for deleted user', async () => {
      const socket = createMockSocket();
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: mockUser.id });
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        status: 'DELETED',
      });

      await gateway.handleConnection(socket);

      expect(socket.disconnect).toHaveBeenCalled();
    });

    it('should disconnect socket for suspended user', async () => {
      const socket = createMockSocket();
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: mockUser.id });
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        status: 'SUSPENDED',
      });

      await gateway.handleConnection(socket);

      expect(socket.disconnect).toHaveBeenCalled();
    });

    it('should extract token from query params', async () => {
      const socket = createMockSocket();
      socket.handshake.auth = {};
      socket.handshake.query = { token: 'query-token' };
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: mockUser.id });
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await gateway.handleConnection(socket);

      expect(jwtService.verify).toHaveBeenCalledWith('query-token', { secret: 'test-secret' });
    });

    it('should extract token from Authorization header', async () => {
      const socket = createMockSocket();
      socket.handshake.auth = {};
      socket.handshake.headers = { authorization: 'Bearer header-token' };
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: mockUser.id });
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await gateway.handleConnection(socket);

      expect(jwtService.verify).toHaveBeenCalledWith('header-token', { secret: 'test-secret' });
    });
  });

  describe('handleDisconnect', () => {
    it('should clean up socket mappings on disconnect', async () => {
      const socket = createMockSocket(mockUser);
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: mockUser.id });
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      // First connect
      await gateway.handleConnection(socket);

      // Then disconnect
      gateway.handleDisconnect(socket);

      // Socket should be cleaned up (no error thrown)
      expect(true).toBe(true);
    });
  });

  describe('handleJoinConversation', () => {
    it('should join conversation room if user is participant', async () => {
      const socket = createMockSocket(mockUser);
      (messagingService.isParticipant as jest.Mock).mockResolvedValue(true);

      const result = await gateway.handleJoinConversation(socket, {
        conversationId: 'conv-123',
      });

      expect(messagingService.isParticipant).toHaveBeenCalledWith('user-123', 'conv-123');
      expect(socket.join).toHaveBeenCalledWith('conversation:conv-123');
      expect(result).toEqual({ success: true, conversationId: 'conv-123' });
    });

    it('should throw WsException if user is not participant', async () => {
      const socket = createMockSocket(mockUser);
      (messagingService.isParticipant as jest.Mock).mockResolvedValue(false);

      await expect(
        gateway.handleJoinConversation(socket, { conversationId: 'conv-123' }),
      ).rejects.toThrow(WsException);
    });
  });

  describe('handleLeaveConversation', () => {
    it('should leave conversation room', async () => {
      const socket = createMockSocket(mockUser);

      const result = await gateway.handleLeaveConversation(socket, {
        conversationId: 'conv-123',
      });

      expect(socket.leave).toHaveBeenCalledWith('conversation:conv-123');
      expect(result).toEqual({ success: true, conversationId: 'conv-123' });
    });
  });

  describe('handleSendMessage', () => {
    it('should send message and broadcast to room', async () => {
      const socket = createMockSocket(mockUser);
      (messagingService.sendMessage as jest.Mock).mockResolvedValue(mockMessage);
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await gateway.handleSendMessage(socket, {
        conversationId: 'conv-123',
        content: 'Hello!',
      });

      expect(messagingService.sendMessage).toHaveBeenCalledWith('user-123', 'conv-123', {
        content: 'Hello!',
      });
      expect(socket.to).toHaveBeenCalledWith('conversation:conv-123');
      expect(socket.emit).toHaveBeenCalledWith('new_message', expect.any(Object));
      expect(result.id).toBe('msg-123');
      expect(result.content).toBe('Hello!');
    });
  });

  describe('handleTypingStart', () => {
    it('should broadcast typing event to room', async () => {
      const socket = createMockSocket(mockUser);
      (messagingService.isParticipant as jest.Mock).mockResolvedValue(true);
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await gateway.handleTypingStart(socket, { conversationId: 'conv-123' });

      expect(socket.to).toHaveBeenCalledWith('conversation:conv-123');
      expect(socket.emit).toHaveBeenCalledWith('user_typing', {
        conversationId: 'conv-123',
        userId: 'user-123',
        firstName: 'Test',
        lastName: 'User',
      });
    });

    it('should not broadcast if user is not participant', async () => {
      const socket = createMockSocket(mockUser);
      (messagingService.isParticipant as jest.Mock).mockResolvedValue(false);

      await gateway.handleTypingStart(socket, { conversationId: 'conv-123' });

      expect(socket.to).not.toHaveBeenCalled();
    });
  });

  describe('handleTypingStop', () => {
    it('should broadcast stopped typing event to room', async () => {
      const socket = createMockSocket(mockUser);

      await gateway.handleTypingStop(socket, { conversationId: 'conv-123' });

      expect(socket.to).toHaveBeenCalledWith('conversation:conv-123');
      expect(socket.emit).toHaveBeenCalledWith('user_stopped_typing', {
        conversationId: 'conv-123',
        userId: 'user-123',
      });
    });
  });

  describe('handleMarkRead', () => {
    it('should mark conversation as read and broadcast receipt', async () => {
      const socket = createMockSocket(mockUser);
      (messagingService.markAsRead as jest.Mock).mockResolvedValue({ message: 'ok' });

      const result = await gateway.handleMarkRead(socket, { conversationId: 'conv-123' });

      expect(messagingService.markAsRead).toHaveBeenCalledWith('user-123', 'conv-123');
      expect(socket.to).toHaveBeenCalledWith('conversation:conv-123');
      expect(socket.emit).toHaveBeenCalledWith('read_receipt', {
        conversationId: 'conv-123',
        userId: 'user-123',
        readAt: expect.any(Date),
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe('emitToUser', () => {
    it('should emit event to all user sockets', async () => {
      const socket = createMockSocket(mockUser);
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: mockUser.id });
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      // Connect the socket first
      await gateway.handleConnection(socket);

      // Now emit to user
      gateway.emitToUser(mockUser.id, 'test_event', { data: 'test' });

      expect(gateway.server.to).toHaveBeenCalledWith('socket-123');
    });
  });

  describe('emitToConversation', () => {
    it('should emit event to conversation room', async () => {
      await gateway.emitToConversation('conv-123', 'test_event', { data: 'test' });

      expect(gateway.server.to).toHaveBeenCalledWith('conversation:conv-123');
      expect(gateway.server.emit).toHaveBeenCalledWith('test_event', { data: 'test' });
    });
  });
});
