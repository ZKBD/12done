import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { CacheService } from './cache.service';

describe('CacheService', () => {
  let service: CacheService;
  let cacheManager: jest.Mocked<Cache>;

  beforeEach(async () => {
    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      reset: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    cacheManager = module.get(CACHE_MANAGER);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('get', () => {
    it('should return cached value', async () => {
      const cachedData = { id: '123', name: 'Test' };
      (cacheManager.get as jest.Mock).mockResolvedValue(cachedData);

      const result = await service.get<typeof cachedData>('test-key');

      expect(result).toEqual(cachedData);
      expect(cacheManager.get).toHaveBeenCalledWith('test-key');
    });

    it('should return undefined when key not found', async () => {
      (cacheManager.get as jest.Mock).mockResolvedValue(undefined);

      const result = await service.get('nonexistent-key');

      expect(result).toBeUndefined();
    });

    it('should handle string values', async () => {
      (cacheManager.get as jest.Mock).mockResolvedValue('cached-string');

      const result = await service.get<string>('string-key');

      expect(result).toBe('cached-string');
    });

    it('should handle array values', async () => {
      const cachedArray = [1, 2, 3];
      (cacheManager.get as jest.Mock).mockResolvedValue(cachedArray);

      const result = await service.get<number[]>('array-key');

      expect(result).toEqual([1, 2, 3]);
    });
  });

  describe('set', () => {
    it('should set value without TTL', async () => {
      (cacheManager.set as jest.Mock).mockResolvedValue(undefined);

      await service.set('test-key', { data: 'test' });

      expect(cacheManager.set).toHaveBeenCalledWith('test-key', { data: 'test' }, undefined);
    });

    it('should set value with TTL in milliseconds', async () => {
      (cacheManager.set as jest.Mock).mockResolvedValue(undefined);

      await service.set('test-key', { data: 'test' }, 60);

      expect(cacheManager.set).toHaveBeenCalledWith('test-key', { data: 'test' }, 60000);
    });

    it('should handle string values', async () => {
      (cacheManager.set as jest.Mock).mockResolvedValue(undefined);

      await service.set('string-key', 'test-value', 30);

      expect(cacheManager.set).toHaveBeenCalledWith('string-key', 'test-value', 30000);
    });

    it('should handle null TTL', async () => {
      (cacheManager.set as jest.Mock).mockResolvedValue(undefined);

      await service.set('test-key', 'value');

      expect(cacheManager.set).toHaveBeenCalledWith('test-key', 'value', undefined);
    });
  });

  describe('del', () => {
    it('should delete cached key', async () => {
      (cacheManager.del as jest.Mock).mockResolvedValue(undefined);

      await service.del('test-key');

      expect(cacheManager.del).toHaveBeenCalledWith('test-key');
    });
  });

  describe('reset', () => {
    it('should reset entire cache', async () => {
      (cacheManager.reset as jest.Mock).mockResolvedValue(undefined);

      await service.reset();

      expect(cacheManager.reset).toHaveBeenCalled();
    });
  });

  describe('generateKey', () => {
    it('should join string parts with colon', () => {
      const key = service.generateKey('property', '123');

      expect(key).toBe('property:123');
    });

    it('should handle multiple parts', () => {
      const key = service.generateKey('user', 'session', 'abc123');

      expect(key).toBe('user:session:abc123');
    });

    it('should handle numeric parts', () => {
      const key = service.generateKey('search', 1, 20);

      expect(key).toBe('search:1:20');
    });

    it('should handle mixed string and number parts', () => {
      const key = service.generateKey('page', 'results', 5, 'offset', 10);

      expect(key).toBe('page:results:5:offset:10');
    });

    it('should handle single part', () => {
      const key = service.generateKey('simple');

      expect(key).toBe('simple');
    });
  });

  describe('getProperty', () => {
    it('should get property from cache', async () => {
      const propertyData = { id: 'prop-123', title: 'Test Property' };
      (cacheManager.get as jest.Mock).mockResolvedValue(propertyData);

      const result = await service.getProperty('prop-123');

      expect(result).toEqual(propertyData);
      expect(cacheManager.get).toHaveBeenCalledWith('property:prop-123');
    });

    it('should return undefined when property not cached', async () => {
      (cacheManager.get as jest.Mock).mockResolvedValue(undefined);

      const result = await service.getProperty('nonexistent');

      expect(result).toBeUndefined();
    });
  });

  describe('setProperty', () => {
    it('should set property with default TTL of 300 seconds', async () => {
      (cacheManager.set as jest.Mock).mockResolvedValue(undefined);
      const propertyData = { id: 'prop-123', title: 'Test' };

      await service.setProperty('prop-123', propertyData);

      expect(cacheManager.set).toHaveBeenCalledWith('property:prop-123', propertyData, 300000);
    });

    it('should set property with custom TTL', async () => {
      (cacheManager.set as jest.Mock).mockResolvedValue(undefined);
      const propertyData = { id: 'prop-123', title: 'Test' };

      await service.setProperty('prop-123', propertyData, 600);

      expect(cacheManager.set).toHaveBeenCalledWith('property:prop-123', propertyData, 600000);
    });
  });

  describe('invalidateProperty', () => {
    it('should delete property from cache', async () => {
      (cacheManager.del as jest.Mock).mockResolvedValue(undefined);

      await service.invalidateProperty('prop-123');

      expect(cacheManager.del).toHaveBeenCalledWith('property:prop-123');
    });
  });

  describe('getSearchResults', () => {
    it('should get search results from cache', async () => {
      const searchResults = { items: [{ id: '1' }, { id: '2' }], total: 2 };
      (cacheManager.get as jest.Mock).mockResolvedValue(searchResults);

      const result = await service.getSearchResults('query-hash-123');

      expect(result).toEqual(searchResults);
      expect(cacheManager.get).toHaveBeenCalledWith('search:query-hash-123');
    });

    it('should return undefined when search not cached', async () => {
      (cacheManager.get as jest.Mock).mockResolvedValue(undefined);

      const result = await service.getSearchResults('nonexistent-hash');

      expect(result).toBeUndefined();
    });
  });

  describe('setSearchResults', () => {
    it('should set search results with default TTL of 60 seconds', async () => {
      (cacheManager.set as jest.Mock).mockResolvedValue(undefined);
      const searchResults = { items: [], total: 0 };

      await service.setSearchResults('query-hash', searchResults);

      expect(cacheManager.set).toHaveBeenCalledWith('search:query-hash', searchResults, 60000);
    });

    it('should set search results with custom TTL', async () => {
      (cacheManager.set as jest.Mock).mockResolvedValue(undefined);
      const searchResults = { items: [], total: 0 };

      await service.setSearchResults('query-hash', searchResults, 120);

      expect(cacheManager.set).toHaveBeenCalledWith('search:query-hash', searchResults, 120000);
    });
  });

  describe('getUserSession', () => {
    it('should get user session from cache', async () => {
      const sessionData = { userId: 'user-123', role: 'USER' };
      (cacheManager.get as jest.Mock).mockResolvedValue(sessionData);

      const result = await service.getUserSession('user-123');

      expect(result).toEqual(sessionData);
      expect(cacheManager.get).toHaveBeenCalledWith('session:user-123');
    });

    it('should return undefined when session not cached', async () => {
      (cacheManager.get as jest.Mock).mockResolvedValue(undefined);

      const result = await service.getUserSession('nonexistent-user');

      expect(result).toBeUndefined();
    });
  });

  describe('setUserSession', () => {
    it('should set user session with default TTL of 3600 seconds', async () => {
      (cacheManager.set as jest.Mock).mockResolvedValue(undefined);
      const sessionData = { userId: 'user-123', role: 'USER' };

      await service.setUserSession('user-123', sessionData);

      expect(cacheManager.set).toHaveBeenCalledWith('session:user-123', sessionData, 3600000);
    });

    it('should set user session with custom TTL', async () => {
      (cacheManager.set as jest.Mock).mockResolvedValue(undefined);
      const sessionData = { userId: 'user-123', role: 'ADMIN' };

      await service.setUserSession('user-123', sessionData, 7200);

      expect(cacheManager.set).toHaveBeenCalledWith('session:user-123', sessionData, 7200000);
    });
  });

  describe('invalidateUserSession', () => {
    it('should delete user session from cache', async () => {
      (cacheManager.del as jest.Mock).mockResolvedValue(undefined);

      await service.invalidateUserSession('user-123');

      expect(cacheManager.del).toHaveBeenCalledWith('session:user-123');
    });
  });

  describe('TTL conversion', () => {
    it('should convert seconds to milliseconds for property cache', async () => {
      (cacheManager.set as jest.Mock).mockResolvedValue(undefined);

      await service.setProperty('id', {}, 1);

      expect(cacheManager.set).toHaveBeenCalledWith('property:id', {}, 1000);
    });

    it('should convert seconds to milliseconds for search cache', async () => {
      (cacheManager.set as jest.Mock).mockResolvedValue(undefined);

      await service.setSearchResults('hash', {}, 1);

      expect(cacheManager.set).toHaveBeenCalledWith('search:hash', {}, 1000);
    });

    it('should convert seconds to milliseconds for session cache', async () => {
      (cacheManager.set as jest.Mock).mockResolvedValue(undefined);

      await service.setUserSession('id', {}, 1);

      expect(cacheManager.set).toHaveBeenCalledWith('session:id', {}, 1000);
    });
  });

  describe('cache key namespacing', () => {
    it('should use property namespace for property cache', async () => {
      (cacheManager.get as jest.Mock).mockResolvedValue(null);
      (cacheManager.set as jest.Mock).mockResolvedValue(undefined);
      (cacheManager.del as jest.Mock).mockResolvedValue(undefined);

      await service.getProperty('123');
      await service.setProperty('123', {});
      await service.invalidateProperty('123');

      expect(cacheManager.get).toHaveBeenCalledWith('property:123');
      expect(cacheManager.set).toHaveBeenCalledWith('property:123', {}, 300000);
      expect(cacheManager.del).toHaveBeenCalledWith('property:123');
    });

    it('should use search namespace for search cache', async () => {
      (cacheManager.get as jest.Mock).mockResolvedValue(null);
      (cacheManager.set as jest.Mock).mockResolvedValue(undefined);

      await service.getSearchResults('hash');
      await service.setSearchResults('hash', {});

      expect(cacheManager.get).toHaveBeenCalledWith('search:hash');
      expect(cacheManager.set).toHaveBeenCalledWith('search:hash', {}, 60000);
    });

    it('should use session namespace for user session cache', async () => {
      (cacheManager.get as jest.Mock).mockResolvedValue(null);
      (cacheManager.set as jest.Mock).mockResolvedValue(undefined);
      (cacheManager.del as jest.Mock).mockResolvedValue(undefined);

      await service.getUserSession('user-1');
      await service.setUserSession('user-1', {});
      await service.invalidateUserSession('user-1');

      expect(cacheManager.get).toHaveBeenCalledWith('session:user-1');
      expect(cacheManager.set).toHaveBeenCalledWith('session:user-1', {}, 3600000);
      expect(cacheManager.del).toHaveBeenCalledWith('session:user-1');
    });
  });
});
