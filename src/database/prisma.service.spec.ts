import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('constructor', () => {
    it('should be an instance of PrismaService', () => {
      expect(service).toBeInstanceOf(PrismaService);
    });
  });

  describe('onModuleInit', () => {
    it('should call $connect', async () => {
      const connectSpy = jest.spyOn(service, '$connect').mockResolvedValue();

      await service.onModuleInit();

      expect(connectSpy).toHaveBeenCalled();
    });

    it('should handle connection errors', async () => {
      const error = new Error('Connection failed');
      jest.spyOn(service, '$connect').mockRejectedValue(error);

      await expect(service.onModuleInit()).rejects.toThrow('Connection failed');
    });
  });

  describe('onModuleDestroy', () => {
    it('should call $disconnect', async () => {
      const disconnectSpy = jest.spyOn(service, '$disconnect').mockResolvedValue();

      await service.onModuleDestroy();

      expect(disconnectSpy).toHaveBeenCalled();
    });

    it('should handle disconnection errors', async () => {
      const error = new Error('Disconnection failed');
      jest.spyOn(service, '$disconnect').mockRejectedValue(error);

      await expect(service.onModuleDestroy()).rejects.toThrow('Disconnection failed');
    });
  });

  describe('cleanDatabase', () => {
    it('should throw error in production environment', async () => {
      process.env.NODE_ENV = 'production';

      await expect(service.cleanDatabase()).rejects.toThrow(
        'cleanDatabase is not allowed in production',
      );
    });

    it('should not throw error in development environment', async () => {
      process.env.NODE_ENV = 'development';

      // Mock the models to prevent actual database operations
      const mockModel = {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      };

      // Replace service properties with mock
      Object.defineProperty(service, 'user', {
        value: mockModel,
        writable: true,
        configurable: true,
      });

      await expect(service.cleanDatabase()).resolves.not.toThrow();
    });

    it('should not throw error in test environment', async () => {
      process.env.NODE_ENV = 'test';

      await expect(service.cleanDatabase()).resolves.not.toThrow();
    });

    it('should call deleteMany on models with deleteMany method', async () => {
      process.env.NODE_ENV = 'development';

      const mockDeleteMany = jest.fn().mockResolvedValue({ count: 5 });
      const mockModel = { deleteMany: mockDeleteMany };

      Object.defineProperty(service, 'testModel', {
        value: mockModel,
        writable: true,
        configurable: true,
        enumerable: true,
      });

      await service.cleanDatabase();

      expect(mockDeleteMany).toHaveBeenCalled();
    });

    it('should skip properties without deleteMany method', async () => {
      process.env.NODE_ENV = 'development';

      const mockModelWithoutDeleteMany = { findMany: jest.fn() };

      Object.defineProperty(service, 'noDeleteModel', {
        value: mockModelWithoutDeleteMany,
        writable: true,
        configurable: true,
        enumerable: true,
      });

      // Should not throw
      await expect(service.cleanDatabase()).resolves.not.toThrow();
    });

    it('should skip private properties (starting with _)', async () => {
      process.env.NODE_ENV = 'development';

      const mockDeleteMany = jest.fn().mockResolvedValue({ count: 0 });
      const mockPrivateModel = { deleteMany: mockDeleteMany };

      Object.defineProperty(service, '_privateModel', {
        value: mockPrivateModel,
        writable: true,
        configurable: true,
        enumerable: true,
      });

      await service.cleanDatabase();

      // Private models should be skipped
      expect(mockDeleteMany).not.toHaveBeenCalled();
    });

    it('should skip $ prefixed properties', async () => {
      process.env.NODE_ENV = 'development';

      const mockDeleteMany = jest.fn().mockResolvedValue({ count: 0 });
      const mockDollarModel = { deleteMany: mockDeleteMany };

      Object.defineProperty(service, '$specialModel', {
        value: mockDollarModel,
        writable: true,
        configurable: true,
        enumerable: true,
      });

      await service.cleanDatabase();

      // $ prefixed models should be skipped
      expect(mockDeleteMany).not.toHaveBeenCalled();
    });

    it('should handle null model values', async () => {
      process.env.NODE_ENV = 'development';

      Object.defineProperty(service, 'nullModel', {
        value: null,
        writable: true,
        configurable: true,
        enumerable: true,
      });

      await expect(service.cleanDatabase()).resolves.not.toThrow();
    });

    it('should handle undefined model values', async () => {
      process.env.NODE_ENV = 'development';

      Object.defineProperty(service, 'undefinedModel', {
        value: undefined,
        writable: true,
        configurable: true,
        enumerable: true,
      });

      await expect(service.cleanDatabase()).resolves.not.toThrow();
    });

    it('should clean multiple models', async () => {
      process.env.NODE_ENV = 'development';

      const mockDeleteMany1 = jest.fn().mockResolvedValue({ count: 3 });
      const mockDeleteMany2 = jest.fn().mockResolvedValue({ count: 5 });

      Object.defineProperty(service, 'model1', {
        value: { deleteMany: mockDeleteMany1 },
        writable: true,
        configurable: true,
        enumerable: true,
      });

      Object.defineProperty(service, 'model2', {
        value: { deleteMany: mockDeleteMany2 },
        writable: true,
        configurable: true,
        enumerable: true,
      });

      await service.cleanDatabase();

      expect(mockDeleteMany1).toHaveBeenCalled();
      expect(mockDeleteMany2).toHaveBeenCalled();
    });
  });

  describe('lifecycle hooks implementation', () => {
    it('should implement OnModuleInit interface', () => {
      expect(service.onModuleInit).toBeDefined();
      expect(typeof service.onModuleInit).toBe('function');
    });

    it('should implement OnModuleDestroy interface', () => {
      expect(service.onModuleDestroy).toBeDefined();
      expect(typeof service.onModuleDestroy).toBe('function');
    });
  });

  describe('PrismaClient extension', () => {
    it('should have $connect method', () => {
      expect(service.$connect).toBeDefined();
      expect(typeof service.$connect).toBe('function');
    });

    it('should have $disconnect method', () => {
      expect(service.$disconnect).toBeDefined();
      expect(typeof service.$disconnect).toBe('function');
    });

    it('should have $transaction method', () => {
      expect(service.$transaction).toBeDefined();
      expect(typeof service.$transaction).toBe('function');
    });
  });
});
