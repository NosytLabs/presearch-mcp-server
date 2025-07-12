import { logger } from '../utils/logger.js';
import { config } from '../config/configuration.js';
import { CacheEntry, CacheStats } from '../types/presearch-types.js';

/**
 * Cache manager with TTL support
 */
export class CacheManager {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize: number;
  private defaultTTL: number;
  private stats = {
    hits: 0,
    misses: 0
  };
  private cleanupInterval?: NodeJS.Timeout;

  constructor() {
    const configData = config.get();
    this.maxSize = configData.cacheMaxSize;
    this.defaultTTL = configData.cacheTTL * 1000; // Convert to milliseconds
  }

  /**
   * Initialize cache manager
   */
  public initialize(): void {
    if (!config.get().enableCache) {
      logger.info('Cache is disabled');
      return;
    }

    logger.info('Initializing cache manager', {
      maxSize: this.maxSize,
      defaultTTL: this.defaultTTL / 1000
    });

    // Start cleanup interval (every 5 minutes)
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);

    logger.info('Cache manager initialized');
  }

  /**
   * Generate cache key from parameters
   */
  public generateKey(params: Record<string, any>): string {
    // Sort keys for consistent cache keys
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {} as Record<string, any>);

    return JSON.stringify(sortedParams);
  }

  /**
   * Get value from cache
   */
  public get(key: string): any {
    if (!config.get().enableCache) {
      return null;
    }

    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      logger.debug('Cache entry expired', { key });
      return null;
    }

    // Update hit count and stats
    entry.hits++;
    this.stats.hits++;
    
    logger.debug('Cache hit', { key, hits: entry.hits });
    return entry.data;
  }

  /**
   * Set value in cache
   */
  public set(key: string, data: any, ttl?: number): void {
    if (!config.get().enableCache) {
      return;
    }

    // Check cache size limit
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictOldest();
    }

    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
      hits: 0
    };

    this.cache.set(key, entry);
    
    logger.debug('Cache entry set', { 
      key, 
      ttl: entry.ttl / 1000,
      cacheSize: this.cache.size 
    });
  }

  /**
   * Delete entry from cache
   */
  public delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      logger.debug('Cache entry deleted', { key });
    }
    return deleted;
  }

  /**
   * Delete entries by pattern
   */
  public deleteByPattern(pattern: string): number {
    let deletedCount = 0;
    const regex = new RegExp(pattern);
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    
    logger.debug('Cache entries deleted by pattern', { pattern, deletedCount });
    return deletedCount;
  }

  /**
   * Clear all cache entries
   */
  public clear(): number {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
    
    logger.info('Cache cleared', { clearedCount: size });
    return size;
  }

  /**
   * Get cache statistics
   */
  public getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const timestamps = entries.map(e => e.timestamp);
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: this.stats.hits + this.stats.misses > 0 
        ? this.stats.hits / (this.stats.hits + this.stats.misses) 
        : 0,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : undefined,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : undefined
    };
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
        expiredCount++;
      }
    }
    
    if (expiredCount > 0) {
      logger.debug('Cache cleanup completed', { expiredCount, remainingSize: this.cache.size });
    }
  }

  /**
   * Evict oldest entry when cache is full
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      logger.debug('Evicted oldest cache entry', { key: oldestKey });
    }
  }

  /**
   * Shutdown cache manager
   */
  public shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    
    this.clear();
    logger.info('Cache manager shutdown');
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();