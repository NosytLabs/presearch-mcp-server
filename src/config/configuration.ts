import { z } from 'zod';
import { logger } from '../utils/logger.js';

/**
 * Configuration schema with validation
 */
const ConfigSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  baseUrl: z.string().url('Base URL must be a valid URL').default('https://api.presearch.org/v1'),
  timeout: z.number().min(1000).max(60000).default(30000),
  maxRetries: z.number().min(1).max(10).default(3),
  retryDelay: z.number().min(100).max(5000).default(1000),
  rateLimit: z.number().min(1).max(1000).default(100),
  rateLimitWindow: z.number().min(1000).max(3600000).default(60000),
  cacheTTL: z.number().min(60).max(86400).default(3600),
  cacheMaxSize: z.number().min(10).max(10000).default(1000),
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  mockMode: z.boolean().default(false),
  enableCache: z.boolean().default(true),
  enableRateLimit: z.boolean().default(true)
});

export type ConfigType = z.infer<typeof ConfigSchema>;

/**
 * Configuration manager
 */
export class Configuration {
  private config: ConfigType;
  private isLoaded = false;

  constructor() {
    this.config = this.loadConfiguration();
  }

  /**
   * Load configuration from environment variables
   */
  private loadConfiguration(): ConfigType {
    try {
      const rawConfig = {
        apiKey: process.env.PRESEARCH_API_KEY || '',
        baseUrl: process.env.PRESEARCH_BASE_URL,
        timeout: this.parseNumber(process.env.PRESEARCH_TIMEOUT),
        maxRetries: this.parseNumber(process.env.PRESEARCH_MAX_RETRIES),
        retryDelay: this.parseNumber(process.env.PRESEARCH_RETRY_DELAY),
        rateLimit: this.parseNumber(process.env.PRESEARCH_RATE_LIMIT),
        rateLimitWindow: this.parseNumber(process.env.PRESEARCH_RATE_LIMIT_WINDOW),
        cacheTTL: this.parseNumber(process.env.PRESEARCH_CACHE_TTL),
        cacheMaxSize: this.parseNumber(process.env.PRESEARCH_CACHE_MAX_SIZE),
        logLevel: process.env.PRESEARCH_LOG_LEVEL,
        mockMode: this.parseBoolean(process.env.PRESEARCH_MOCK_MODE),
        enableCache: this.parseBoolean(process.env.PRESEARCH_ENABLE_CACHE),
        enableRateLimit: this.parseBoolean(process.env.PRESEARCH_ENABLE_RATE_LIMIT)
      };

      // Remove undefined values to let defaults apply
      const cleanConfig = Object.fromEntries(
        Object.entries(rawConfig).filter(([_, value]) => value !== undefined)
      );

      const validatedConfig = ConfigSchema.parse(cleanConfig);
      
      this.validateConfiguration(validatedConfig);
      this.isLoaded = true;
      
      logger.info('Configuration loaded successfully', {
        baseUrl: validatedConfig.baseUrl,
        timeout: validatedConfig.timeout,
        maxRetries: validatedConfig.maxRetries,
        rateLimit: validatedConfig.rateLimit,
        cacheTTL: validatedConfig.cacheTTL,
        logLevel: validatedConfig.logLevel,
        mockMode: validatedConfig.mockMode,
        hasApiKey: !!validatedConfig.apiKey
      });
      
      return validatedConfig;
      
    } catch (error) {
      const errorMessage = error instanceof z.ZodError 
        ? `Configuration validation failed: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
        : `Configuration loading failed: ${(error as Error).message}`;
      
      logger.error(errorMessage);
      
      // Return minimal config for mock mode
      const fallbackConfig = {
        apiKey: 'mock-api-key',
        baseUrl: 'https://api.presearch.org/v1',
        timeout: 30000,
        maxRetries: 3,
        retryDelay: 1000,
        rateLimit: 100,
        rateLimitWindow: 60000,
        cacheTTL: 3600,
        cacheMaxSize: 1000,
        logLevel: 'info' as const,
        mockMode: true,
        enableCache: true,
        enableRateLimit: true
      };
      
      logger.warn('Using fallback configuration with mock mode enabled');
      return fallbackConfig;
    }
  }

  /**
   * Validate configuration
   */
  private validateConfiguration(config: ConfigType): void {
    // Validate API key format if not in mock mode
    if (!config.mockMode && config.apiKey) {
      if (config.apiKey.length < 10) {
        throw new Error('API key appears to be too short');
      }
      
      if (config.apiKey === 'your-api-key-here' || config.apiKey === 'mock-api-key') {
        logger.warn('Using placeholder API key - enabling mock mode');
        config.mockMode = true;
      }
    }
    
    // Validate URL accessibility
    try {
      new URL(config.baseUrl);
    } catch {
      throw new Error(`Invalid base URL: ${config.baseUrl}`);
    }
    
    // Validate timeout ranges
    if (config.timeout < 1000) {
      logger.warn('Timeout is very low, this may cause frequent timeouts');
    }
    
    if (config.timeout > 60000) {
      logger.warn('Timeout is very high, this may cause slow responses');
    }
  }

  /**
   * Parse number from string
   */
  private parseNumber(value: string | undefined): number | undefined {
    if (!value) return undefined;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? undefined : parsed;
  }

  /**
   * Parse boolean from string
   */
  private parseBoolean(value: string | undefined): boolean | undefined {
    if (!value) return undefined;
    return value.toLowerCase() === 'true' || value === '1';
  }

  /**
   * Get configuration
   */
  public get(): ConfigType {
    return { ...this.config };
  }

  /**
   * Get specific configuration value
   */
  public getValue<K extends keyof ConfigType>(key: K): ConfigType[K] {
    return this.config[key];
  }

  /**
   * Update configuration (for testing)
   */
  public update(updates: Partial<ConfigType>): void {
    this.config = { ...this.config, ...updates };
    logger.debug('Configuration updated', updates);
  }

  /**
   * Check if configuration is loaded
   */
  public isConfigLoaded(): boolean {
    return this.isLoaded;
  }

  /**
   * Get masked configuration for logging
   */
  public getMaskedConfig(): Record<string, any> {
    const masked = { ...this.config };
    
    // Mask sensitive data
    if (masked.apiKey) {
      masked.apiKey = masked.apiKey.substring(0, 4) + '***' + masked.apiKey.substring(masked.apiKey.length - 4);
    }
    
    return masked;
  }

  /**
   * Validate environment setup
   */
  public validateEnvironment(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!process.env.PRESEARCH_API_KEY && !this.config.mockMode) {
      errors.push('PRESEARCH_API_KEY environment variable is required');
    }
    
    if (this.config.mockMode) {
      logger.warn('Running in mock mode - API calls will return mock data');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const config = new Configuration();