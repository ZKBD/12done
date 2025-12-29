import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WsException } from '@nestjs/websockets';
import { WsJwtGuard } from './ws-jwt.guard';
import { PrismaService } from '@/database';

describe('WsJwtGuard', () => {
  let guard: WsJwtGuard;
  let jwtService: JwtService;
  let prismaService: PrismaService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'USER',
    status: 'ACTIVE',
  };

  const createMockContext = (handshake: Record<string, unknown> = {}): ExecutionContext => {
    const mockSocket = {
      id: 'socket-123',
      handshake: {
        auth: {},
        query: {},
        headers: {},
        ...handshake,
      },
    };

    return {
      switchToWs: () => ({
        getClient: () => mockSocket,
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WsJwtGuard,
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

    guard = module.get<WsJwtGuard>(WsJwtGuard);
    jwtService = module.get<JwtService>(JwtService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should return true for valid token and active user', async () => {
      const context = createMockContext({ auth: { token: 'valid-token' } });
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: mockUser.id });
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(jwtService.verify).toHaveBeenCalledWith('valid-token', { secret: 'test-secret' });
    });

    it('should throw WsException for missing token', async () => {
      const context = createMockContext();

      await expect(guard.canActivate(context)).rejects.toThrow(WsException);
      await expect(guard.canActivate(context)).rejects.toThrow('Unauthorized: No token provided');
    });

    it('should throw WsException for invalid token', async () => {
      const context = createMockContext({ auth: { token: 'invalid-token' } });
      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(guard.canActivate(context)).rejects.toThrow(WsException);
      await expect(guard.canActivate(context)).rejects.toThrow('Unauthorized: Invalid token');
    });

    it('should throw WsException for non-existent user', async () => {
      const context = createMockContext({ auth: { token: 'valid-token' } });
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: 'non-existent' });
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(guard.canActivate(context)).rejects.toThrow(WsException);
      await expect(guard.canActivate(context)).rejects.toThrow('Unauthorized: User not found');
    });

    it('should throw WsException for deleted user', async () => {
      const context = createMockContext({ auth: { token: 'valid-token' } });
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: mockUser.id });
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        status: 'DELETED',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(WsException);
      await expect(guard.canActivate(context)).rejects.toThrow('Unauthorized: Account is not active');
    });

    it('should throw WsException for suspended user', async () => {
      const context = createMockContext({ auth: { token: 'valid-token' } });
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: mockUser.id });
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        status: 'SUSPENDED',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(WsException);
      await expect(guard.canActivate(context)).rejects.toThrow('Unauthorized: Account is not active');
    });

    it('should extract token from query params', async () => {
      const context = createMockContext({ query: { token: 'query-token' } });
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: mockUser.id });
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(jwtService.verify).toHaveBeenCalledWith('query-token', { secret: 'test-secret' });
    });

    it('should extract token from Authorization header', async () => {
      const context = createMockContext({
        headers: { authorization: 'Bearer header-token' },
      });
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: mockUser.id });
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(jwtService.verify).toHaveBeenCalledWith('header-token', { secret: 'test-secret' });
    });

    it('should prioritize auth token over query token', async () => {
      const context = createMockContext({
        auth: { token: 'auth-token' },
        query: { token: 'query-token' },
      });
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: mockUser.id });
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await guard.canActivate(context);

      expect(jwtService.verify).toHaveBeenCalledWith('auth-token', { secret: 'test-secret' });
    });

    it('should attach user to socket', async () => {
      const mockSocket = {
        id: 'socket-123',
        handshake: {
          auth: { token: 'valid-token' },
          query: {},
          headers: {},
        },
      };

      const context = {
        switchToWs: () => ({
          getClient: () => mockSocket,
        }),
      } as unknown as ExecutionContext;

      (jwtService.verify as jest.Mock).mockReturnValue({ sub: mockUser.id });
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await guard.canActivate(context);

      expect((mockSocket as any).user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        status: mockUser.status,
      });
    });
  });
});
