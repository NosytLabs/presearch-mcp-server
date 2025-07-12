#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Enhanced logging with different levels
const DEBUG = process.env.DEBUG === 'presearch-mcp';
const VERBOSE = process.env.VERBOSE === 'true';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const log = (level: LogLevel, message: string, ...args: any[]) => {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  
  if (level === 'debug' && !DEBUG) return;
  if (level === 'info' && !VERBOSE && !DEBUG) return;
  
  console.error(`${prefix} ${message}`, ...args);
};

// Simple in-memory cache for search results
interface CacheEntry {
  data: PresearchResponse;
  timestamp: number;
  ttl: number;
}

class SimpleCache {
  private cache = new Map<string, CacheEntry>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes

  set(key: string, data: PresearchResponse, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): PresearchResponse | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Enhanced input validation schemas
const SearchParamsSchema = z.object({
  query: z.string().min(1, 'Query cannot be empty').max(500, 'Query too long'),
  page: z.number().int().min(1).max(100).optional().default(1),
  lang: z.string().length(2).optional(),
  time: z.enum(['any', 'day', 'week', 'month', 'year']).optional(),
  safe: z.enum(['0', '1']).optional(),
  location: z.string().max(100).optional(),
  ip: z.string().ip().optional()
});

type SearchParams = z.infer<typeof SearchParamsSchema>;

// Enhanced interfaces with better type safety
interface SearchResult {
  title: string;
  link: string;
  description: string;
  displayLink?: string;
  snippet?: string;
}

interface InfoSection {
  title?: string;
  content?: string;
  link?: string;
}

interface SpecialSection {
  type: string;
  title?: string;
  content?: any;
}

interface PresearchResponse {
  standardResults: SearchResult[];
  infoSection?: InfoSection;
  specialSections?: SpecialSection[];
  query: string;
  totalResults: number;
  page: number;
  searchTime?: number;
  links?: {
    next?: string;
    previous?: string;
  };
  meta?: {
    searchId?: string;
    timestamp?: string;
  };
}

// Rate limiting interface
interface RateLimiter {
  requests: number;
  windowStart: number;
  windowSize: number;
  maxRequests: number;
}

// Retry configuration
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

/**
 * Enhanced Presearch MCP Server with caching, rate limiting, and retry logic
 */
class PresearchMCPServer {
  private server!: McpServer;
  private apiKey: string;
  private baseUrl: string;
  private cache!: SimpleCache;
  private rateLimiter!: RateLimiter;
  private retryConfig!: RetryConfig;
  private readonly userAgent: string;
  private readonly timeout: number;

  constructor() {
    this.apiKey = process.env.PRESEARCH_API_KEY || '';
    this.baseUrl = process.env.PRESEARCH_BASE_URL || 'https://na-us-1.presearch.com/v1';
    this.userAgent = `presearch-mcp/${process.env.npm_package_version || '1.0.0'}`;
    this.timeout = parseInt(process.env.REQUEST_TIMEOUT || '15000', 10);
    
    log('info', 'Initializing Presearch MCP Server', { 
      hasApiKey: !!this.apiKey, 
      baseUrl: this.baseUrl,
      userAgent: this.userAgent,
      timeout: this.timeout
    });
    
    this.validateConfiguration();
    this.initializeComponents();
    this.setupRequestHandlers();
    
    log('info', 'Presearch MCP Server initialized successfully');
  }

  /**
   * Validates the server configuration
   */
  private validateConfiguration(): void {
    if (!this.apiKey) {
      throw new Error('PRESEARCH_API_KEY environment variable is required. Please check your .env file.');
    }

    // Enhanced API key validation
    if (this.apiKey.length < 10) {
      throw new Error('PRESEARCH_API_KEY appears to be invalid (too short). Please check your API key.');
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(this.apiKey)) {
      throw new Error('PRESEARCH_API_KEY contains invalid characters. Please check your API key.');
    }

    // Validate base URL
    try {
      new URL(this.baseUrl);
    } catch {
      throw new Error(`Invalid PRESEARCH_BASE_URL: ${this.baseUrl}`);
    }
  }

  /**
   * Initializes cache, rate limiter, and retry configuration
   */
  private initializeComponents(): void {
    this.cache = new SimpleCache();
    
    // Rate limiter: 100 requests per minute by default
    this.rateLimiter = {
      requests: 0,
      windowStart: Date.now(),
      windowSize: 60 * 1000, // 1 minute
      maxRequests: parseInt(process.env.RATE_LIMIT || '100', 10)
    };

    // Retry configuration
    this.retryConfig = {
      maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
      baseDelay: parseInt(process.env.RETRY_BASE_DELAY || '1000', 10),
      maxDelay: parseInt(process.env.RETRY_MAX_DELAY || '10000', 10),
      backoffFactor: parseFloat(process.env.RETRY_BACKOFF_FACTOR || '2')
    };

    this.server = new McpServer({
      name: 'presearch-mcp-server',
      version: '1.0.0',
    });
  }

  /**
   * Sets up MCP request handlers with enhanced validation
   */
  private setupRequestHandlers(): void {
    this.server.registerTool(
      'presearch_search',
      {
        title: 'Presearch Web Search',
        description: 'Search the web using Presearch API with caching and rate limiting',
        inputSchema: {
          query: z.string().min(1, 'Query cannot be empty').max(500, 'Query too long'),
          page: z.number().int().min(1).max(100).optional().default(1),
          lang: z.string().length(2).optional(),
          time: z.enum(['any', 'day', 'week', 'month', 'year']).optional(),
          safe: z.enum(['0', '1']).optional(),
          location: z.string().max(100).optional(),
          ip: z.string().ip().optional()
        }
      },
      async (args) => {
        return await this.handleSearch(args);
      }
    );

    // Add cache management tools for debugging
    this.server.registerTool(
      'presearch_cache_stats',
      {
        title: 'Cache Statistics',
        description: 'Get cache statistics and performance metrics',
        inputSchema: {}
      },
      async () => {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              cacheSize: this.cache.size(),
              rateLimiter: {
                requests: this.rateLimiter.requests,
                windowStart: new Date(this.rateLimiter.windowStart).toISOString(),
                maxRequests: this.rateLimiter.maxRequests
              }
            }, null, 2)
          }]
        };
      }
    );
  }

  /**
   * Checks and enforces rate limiting
   */
  private checkRateLimit(): void {
    const now = Date.now();
    
    // Reset window if expired
    if (now - this.rateLimiter.windowStart >= this.rateLimiter.windowSize) {
      this.rateLimiter.requests = 0;
      this.rateLimiter.windowStart = now;
    }
    
    if (this.rateLimiter.requests >= this.rateLimiter.maxRequests) {
      const resetTime = this.rateLimiter.windowStart + this.rateLimiter.windowSize;
      const waitTime = Math.ceil((resetTime - now) / 1000);
      throw new Error(`Rate limit exceeded. Try again in ${waitTime} seconds.`);
    }
    
    this.rateLimiter.requests++;
  }

  /**
   * Generates cache key for search parameters
   */
  private generateCacheKey(params: SearchParams): string {
    const normalized = {
      query: params.query.toLowerCase().trim(),
      page: params.page || 1,
      lang: params.lang,
      time: params.time,
      safe: params.safe,
      location: params.location,
      ip: params.ip
    };
    return JSON.stringify(normalized);
  }

  /**
   * Handles search requests with validation, caching, and rate limiting
   */
  private async handleSearch(args: any): Promise<any> {
    const startTime = Date.now();
    
    try {
      // Validate input parameters
      const validatedParams = SearchParamsSchema.parse(args);
      
      log('debug', 'Processing search request', { 
        query: validatedParams.query,
        page: validatedParams.page,
        hasOptionalParams: !!(validatedParams.lang || validatedParams.time || validatedParams.safe)
      });

      // Check rate limiting
      this.checkRateLimit();

      // Check cache first
      const cacheKey = this.generateCacheKey(validatedParams);
      const cachedResult = this.cache.get(cacheKey);
      
      if (cachedResult) {
        log('debug', 'Cache hit for search query', { query: validatedParams.query });
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              ...cachedResult,
              cached: true,
              searchTime: Date.now() - startTime
            }, null, 2)
          }]
        };
      }

      // Perform search with retry logic
      const response = await this.performSearchWithRetry(validatedParams);
      
      // Cache the result
      this.cache.set(cacheKey, response);
      
      log('info', 'Search completed successfully', {
        query: validatedParams.query,
        resultsCount: response.standardResults.length,
        searchTime: Date.now() - startTime
      });
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            ...response,
            cached: false,
            searchTime: Date.now() - startTime
          }, null, 2)
        }]
      };
    } catch (error) {
      log('error', 'Search request failed', {
        error: error instanceof Error ? error.message : String(error),
        args: args
      });
      
      if (error instanceof z.ZodError) {
        const validationErrors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        throw new Error(`Invalid input parameters: ${validationErrors}`);
      }
      
      throw new Error(
        `Search failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Performs search with retry logic
   */
  private async performSearchWithRetry(params: SearchParams): Promise<PresearchResponse> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await this.performSearch(params);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Don't retry on certain errors
        if (this.isNonRetryableError(lastError)) {
          throw lastError;
        }
        
        if (attempt < this.retryConfig.maxRetries) {
          const delay = this.calculateRetryDelay(attempt);
          log('warn', `Search attempt ${attempt + 1} failed, retrying in ${delay}ms`, {
            error: lastError.message,
            attempt: attempt + 1,
            maxRetries: this.retryConfig.maxRetries
          });
          await this.sleep(delay);
        }
      }
    }
    
    throw lastError!;
  }

  /**
   * Determines if an error should not be retried
   */
  private isNonRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('invalid api key') ||
           message.includes('access forbidden') ||
           message.includes('invalid input parameters') ||
           message.includes('rate limit exceeded');
  }

  /**
   * Calculates retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    const delay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffFactor, attempt);
    return Math.min(delay, this.retryConfig.maxDelay);
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Performs the actual search request
   */
  private async performSearch(params: SearchParams): Promise<PresearchResponse> {
    const url = `${this.baseUrl}/search`;
    const startTime = Date.now();
    
    const requestParams = {
      q: params.query,
      page: params.page,
      ...(params.lang && { lang: params.lang }),
      ...(params.time && { time: params.time }),
      ...(params.safe && { safe: params.safe }),
      ...(params.location && { location: params.location }),
      ...(params.ip && { ip: params.ip })
    };

    log('debug', 'Making search request', { url, params: requestParams });

    const config: AxiosRequestConfig = {
      params: requestParams,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json',
        'User-Agent': this.userAgent,
        'X-Request-ID': `presearch-mcp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      },
      timeout: this.timeout,
      validateStatus: (status) => status < 500 // Don't throw on 4xx errors
    };

    try {
      const response = await axios.get(url, config);
      const searchTime = Date.now() - startTime;

      log('debug', 'Search response received', { 
        status: response.status, 
        searchTime,
        dataKeys: Object.keys(response.data || {})
      });

      // Handle different response status codes
      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your PRESEARCH_API_KEY environment variable.');
      } else if (response.status === 402) {
        throw new Error('Payment required. Please check your Presearch account billing status.');
      } else if (response.status === 403) {
        throw new Error('Access forbidden. Please check your API key permissions.');
      } else if (response.status === 422) {
        const errorMsg = response.data?.message || 'Invalid request parameters';
        throw new Error(`Unprocessable entity: ${errorMsg}`);
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (response.status >= 400) {
        throw new Error(`HTTP ${response.status}: ${response.data?.message || 'Request failed'}`);
      }

      const data = response.data?.data || response.data;
      
      if (!data) {
        throw new Error('Invalid response format: missing data');
      }
      
      return {
        standardResults: this.normalizeSearchResults(data.standardResults || []),
        infoSection: data.infoSection,
        specialSections: data.specialSections,
        query: params.query,
        totalResults: data.standardResults?.length || 0,
        page: params.page || 1,
        searchTime,
        links: data.links,
        meta: {
          searchId: response.headers['x-search-id'],
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      if (error instanceof AxiosError) {
        const status = error.response?.status;
        const message = error.response?.data?.message || error.message;
        
        log('error', 'Search request failed', { status, message, url, searchTime: Date.now() - startTime });
        
        if (error.code === 'ECONNABORTED') {
          throw new Error('Request timeout. The Presearch API may be experiencing high load.');
        } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
          throw new Error('Network error. Please check your internet connection and API endpoint.');
        } else if (status) {
          // Status-specific errors are handled above
          throw error;
        } else {
          throw new Error(`Network error: ${message}`);
        }
      }
      
      log('error', 'Unexpected error during search', error);
      throw new Error(`Unexpected error during search: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Normalizes search results to ensure consistent format
   */
  private normalizeSearchResults(results: any[]): SearchResult[] {
    return results.map(result => ({
      title: result.title || '',
      link: result.link || result.url || '',
      description: result.description || result.snippet || '',
      displayLink: result.displayLink,
      snippet: result.snippet
    }));
  }

  public async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Presearch MCP server running on stdio');
  }
}

// Main execution for MCP stdio
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new PresearchMCPServer();
  server.start().catch((error) => {
    console.error('Failed to start Presearch MCP server:', error);
    process.exit(1);
  });
}

// Export default function for Smithery compatibility
export default function({ sessionId, config }: { sessionId: string; config?: any }) {
  const server = new PresearchMCPServer();
  return server.start().catch((error) => {
    console.error('Failed to start Presearch MCP server:', error);
    process.exit(1);
  });
}