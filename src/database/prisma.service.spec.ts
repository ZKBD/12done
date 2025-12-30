import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;
  let originalNodeEnv: string | undefined;

  // Helper to safely set NODE_ENV (works around read-only property in some Jest configurations)
  const setNodeEnv = (value: string) => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value,
      writable: true,
      configurable: true,
    });
  };

  beforeEach(async () => {
    originalNodeEnv = process.env.NODE_ENV;
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    if (originalNodeEnv !== undefined) {
      setNodeEnv(originalNodeEnv);
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('constructor', () => {
    it('should be an instance of PrismaService', () => {
      // Use constructor name check to avoid Jest module resolution issues
      expect(service.constructor.name).toBe('PrismaService');
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
      setNodeEnv('production');

      await expect(service.cleanDatabase()).rejects.toThrow(
        'cleanDatabase is not allowed in production',
      );
    });

    it('should not throw error in development environment', async () => {
      setNodeEnv('development');

      // Mock Reflect.ownKeys to return empty array (no models to clean)
      const originalOwnKeys = Reflect.ownKeys;
      jest.spyOn(Reflect, 'ownKeys').mockReturnValue([]);

      await expect(service.cleanDatabase()).resolves.not.toThrow();

      // Restore
      Reflect.ownKeys = originalOwnKeys;
    });

    it('should not throw error in test environment', async () => {
      setNodeEnv('test');

      // Mock Reflect.ownKeys to return empty array (no models to clean)
      const originalOwnKeys = Reflect.ownKeys;
      jest.spyOn(Reflect, 'ownKeys').mockReturnValue([]);

      await expect(service.cleanDatabase()).resolves.not.toThrow();

      // Restore
      Reflect.ownKeys = originalOwnKeys;
    });

    it('should call deleteMany on models with deleteMany method', async () => {
      setNodeEnv('development');

      const mockDeleteMany = jest.fn().mockResolvedValue({ count: 5 });
      const mockModel = { deleteMany: mockDeleteMany };

      Object.defineProperty(service, 'testModel', {
        value: mockModel,
        writable: true,
        configurable: true,
        enumerable: true,
      });

      // Mock Reflect.ownKeys to return only our test property
      const originalOwnKeys = Reflect.ownKeys;
      jest.spyOn(Reflect, 'ownKeys').mockReturnValue(['testModel']);

      await service.cleanDatabase();

      expect(mockDeleteMany).toHaveBeenCalled();

      // Restore
      Reflect.ownKeys = originalOwnKeys;
    });

    it('should skip properties without deleteMany method', async () => {
      setNodeEnv('development');

      const mockModelWithoutDeleteMany = { findMany: jest.fn() };

      Object.defineProperty(service, 'noDeleteModel', {
        value: mockModelWithoutDeleteMany,
        writable: true,
        configurable: true,
        enumerable: true,
      });

      // Mock Reflect.ownKeys to return only our test property
      const originalOwnKeys = Reflect.ownKeys;
      jest.spyOn(Reflect, 'ownKeys').mockReturnValue(['noDeleteModel']);

      // Should not throw
      await expect(service.cleanDatabase()).resolves.not.toThrow();

      // Restore
      Reflect.ownKeys = originalOwnKeys;
    });

    it('should skip private properties (starting with _)', async () => {
      setNodeEnv('development');

      const mockDeleteMany = jest.fn().mockResolvedValue({ count: 0 });
      const mockPrivateModel = { deleteMany: mockDeleteMany };

      Object.defineProperty(service, '_privateModel', {
        value: mockPrivateModel,
        writable: true,
        configurable: true,
        enumerable: true,
      });

      // Mock Reflect.ownKeys to return only our test property
      const originalOwnKeys = Reflect.ownKeys;
      jest.spyOn(Reflect, 'ownKeys').mockReturnValue(['_privateModel']);

      await service.cleanDatabase();

      // Private models should be skipped
      expect(mockDeleteMany).not.toHaveBeenCalled();

      // Restore
      Reflect.ownKeys = originalOwnKeys;
    });

    it('should skip $ prefixed properties', async () => {
      setNodeEnv('development');

      const mockDeleteMany = jest.fn().mockResolvedValue({ count: 0 });
      const mockDollarModel = { deleteMany: mockDeleteMany };

      Object.defineProperty(service, '$specialModel', {
        value: mockDollarModel,
        writable: true,
        configurable: true,
        enumerable: true,
      });

      // Mock Reflect.ownKeys to return only our $ prefixed property
      const originalOwnKeys = Reflect.ownKeys;
      jest.spyOn(Reflect, 'ownKeys').mockReturnValue(['$specialModel']);

      await service.cleanDatabase();

      // $ prefixed models should be skipped
      expect(mockDeleteMany).not.toHaveBeenCalled();

      // Restore
      Reflect.ownKeys = originalOwnKeys;
    });

    it('should handle null model values', async () => {
      setNodeEnv('development');

      Object.defineProperty(service, 'nullModel', {
        value: null,
        writable: true,
        configurable: true,
        enumerable: true,
      });

      // Mock Reflect.ownKeys to return only our null property
      const originalOwnKeys = Reflect.ownKeys;
      jest.spyOn(Reflect, 'ownKeys').mockReturnValue(['nullModel']);

      await expect(service.cleanDatabase()).resolves.not.toThrow();

      // Restore
      Reflect.ownKeys = originalOwnKeys;
    });

    it('should handle undefined model values', async () => {
      setNodeEnv('development');

      Object.defineProperty(service, 'undefinedModel', {
        value: undefined,
        writable: true,
        configurable: true,
        enumerable: true,
      });

      // Mock Reflect.ownKeys to return only our undefined property
      const originalOwnKeys = Reflect.ownKeys;
      jest.spyOn(Reflect, 'ownKeys').mockReturnValue(['undefinedModel']);

      await expect(service.cleanDatabase()).resolves.not.toThrow();

      // Restore
      Reflect.ownKeys = originalOwnKeys;
    });

    it('should clean multiple models', async () => {
      setNodeEnv('development');

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

      // Mock Reflect.ownKeys to return only our mock models
      const originalOwnKeys = Reflect.ownKeys;
      jest.spyOn(Reflect, 'ownKeys').mockReturnValue(['model1', 'model2']);

      await service.cleanDatabase();

      expect(mockDeleteMany1).toHaveBeenCalled();
      expect(mockDeleteMany2).toHaveBeenCalled();

      // Restore
      Reflect.ownKeys = originalOwnKeys;
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
