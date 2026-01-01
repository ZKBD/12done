import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async get<T>(key: string): Promise<T | undefined> {
    const result = await this.cacheManager.get<T>(key);
    return result ?? undefined;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await this.cacheManager.set(key, value, ttlSeconds ? ttlSeconds * 1000 : undefined);
  }

  async del(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  async reset(): Promise<void> {
    await this.cacheManager.clear();
  }

  generateKey(...parts: (string | number)[]): string {
    return parts.join(':');
  }

  // Property cache helpers
  async getProperty<T>(propertyId: string): Promise<T | undefined> {
    return this.get<T>(this.generateKey('property', propertyId));
  }

  async setProperty<T>(propertyId: string, data: T, ttlSeconds = 300): Promise<void> {
    await this.set(this.generateKey('property', propertyId), data, ttlSeconds);
  }

  async invalidateProperty(propertyId: string): Promise<void> {
    await this.del(this.generateKey('property', propertyId));
  }

  // Search cache helpers
  async getSearchResults<T>(queryHash: string): Promise<T | undefined> {
    return this.get<T>(this.generateKey('search', queryHash));
  }

  async setSearchResults<T>(queryHash: string, data: T, ttlSeconds = 60): Promise<void> {
    await this.set(this.generateKey('search', queryHash), data, ttlSeconds);
  }

  // User session cache helpers
  async getUserSession<T>(userId: string): Promise<T | undefined> {
    return this.get<T>(this.generateKey('session', userId));
  }

  async setUserSession<T>(userId: string, data: T, ttlSeconds = 3600): Promise<void> {
    await this.set(this.generateKey('session', userId), data, ttlSeconds);
  }

  async invalidateUserSession(userId: string): Promise<void> {
    await this.del(this.generateKey('session', userId));
  }
}
