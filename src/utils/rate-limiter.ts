import { logger } from './logger.js';
import { config } from '../config/configuration.js';
import { RateLimitStatus } from '../types/presearch-types.js';

/**
 * Rate limiter implementation
 */
export class RateLimiter {
  private requests: number[] = [];
  private limit: number;
  private windowMs: number;

  constructor() {
    const configData = config.get();
    this.limit = configData.rateLimit;
    this.windowMs = configData.rateLimitWindow;
  }

  /**
   * Initialize rate limiter
   */
  public initialize(): void {
    if (!config.get().enableRateLimit) {
      logger.info('Rate limiting is disabled');
      return;
    }

    logger.info('Initializing rate limiter', {
      limit: this.limit,
      windowMs: this.windowMs
    });

    // Clean up old requests every minute
    setInterval(() => {
      this.cleanup();
    }, 60 * 1000);

    logger.info('Rate limiter initialized');
  }

  /**
   * Check if request is within rate limit
   */
  public checkLimit(): boolean {
    if (!config.get().enableRateLimit) {
      return true;
    }

    const now = Date.now();
    
    // Clean up old requests
    this.cleanup();
    
    // Check if we're within the limit
    if (this.requests.length >= this.limit) {
      logger.warn('Rate limit exceeded', {
        current: this.requests.length,
        limit: this.limit,
        windowMs: this.windowMs
      });
      return false;
    }
    
    // Add current request
    this.requests.push(now);
    
    logger.debug('Rate limit check passed', {
      current: this.requests.length,
      limit: this.limit
    });
    
    return true;
  }

  /**
   * Get current rate limit status
   */
  public getStatus(): RateLimitStatus {
    this.cleanup();
    
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const oldestRequest = this.requests.length > 0 ? this.requests[0] : now;
    const resetTime = oldestRequest + this.windowMs;
    
    return {
      remaining: Math.max(0, this.limit - this.requests.length),
      limit: this.limit,
      resetTime,
      windowStart
    };
  }

  /**
   * Reset rate limiter
   */
  public reset(): void {
    this.requests = [];
    logger.debug('Rate limiter reset');
  }

  /**
   * Clean up old requests outside the time window
   */
  private cleanup(): void {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    
    const initialLength = this.requests.length;
    this.requests = this.requests.filter(timestamp => timestamp > cutoff);
    
    const removed = initialLength - this.requests.length;
    if (removed > 0) {
      logger.debug('Rate limiter cleanup', {
        removed,
        remaining: this.requests.length
      });
    }
  }

  /**
   * Get time until rate limit resets
   */
  public getTimeUntilReset(): number {
    if (this.requests.length === 0) {
      return 0;
    }
    
    const oldestRequest = this.requests[0];
    const resetTime = oldestRequest + this.windowMs;
    const now = Date.now();
    
    return Math.max(0, resetTime - now);
  }

  /**
   * Check if rate limit is currently exceeded
   */
  public isLimitExceeded(): boolean {
    this.cleanup();
    return this.requests.length >= this.limit;
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();