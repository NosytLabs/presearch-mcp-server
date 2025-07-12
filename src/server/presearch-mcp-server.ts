import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

import { config } from '../config/configuration.js';
import { logger } from '../utils/logger.js';
import { errorHandler } from '../utils/error-handler.js';
import { cacheManager } from '../cache/cache-manager.js';
import { apiClient } from '../api/api-client.js';
import { responseParser } from '../utils/response-parser.js';
import { rateLimiter } from '../utils/rate-limiter.js';
import {
  SearchParamsSchema,
  MultiSearchParamsSchema,
  SuggestionsParamsSchema,
  AnalyticsParamsSchema,
  DomainSearchParamsSchema,
  FilteredSearchParamsSchema,
  CacheClearParamsSchema,
  MCPToolResponse,
  PresearchResponse,
  RequestContext
} from '../types/presearch-types.js';

/**
 * Presearch MCP Server implementation
 */
export class PresearchServer {
  private server: Server;
  private isInitialized = false;

  constructor() {
    this.server = new Server(
      {
        name: 'presearch-mcp-server',
        version: '2.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
  }

  /**
   * Initialize the server
   */
  public async initialize(): Promise<void> {
    try {
      logger.info('Initializing Presearch MCP Server');
      
      // Validate configuration
      const configData = config.get();
      logger.debug('Configuration loaded', {
        baseUrl: configData.baseUrl,
        timeout: configData.timeout,
        rateLimit: configData.rateLimit,
        cacheTTL: configData.cacheTTL
      });
      
      // Initialize components
      cacheManager.initialize();
      rateLimiter.initialize();
      
      logger.info('Components initialized successfully');
      
      // Test API connectivity
      await this.testAPIConnectivity();
      
      // Setup request handlers
      this.setupRequestHandlers();
      
      // Connect transport
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      this.isInitialized = true;
      logger.info('Presearch MCP Server initialization complete');
      
    } catch (error) {
      const handledError = errorHandler.handleError(error, { operation: 'server-initialization' });
      logger.error('Failed to initialize server', { error: handledError.message });
      throw handledError;
    }
  }

  /**
   * Test API connectivity
   */
  private async testAPIConnectivity(): Promise<void> {
    logger.info('Testing API connectivity');
    
    const isConnected = await apiClient.testConnection();
    
    if (!isConnected) {
      logger.warn('API connectivity test failed - server will run in mock mode');
    } else {
      logger.info('API connectivity test passed');
    }
  }

  /**
   * Setup request handlers
   */
  private setupRequestHandlers(): void {
    // List tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      logger.debug('Listing available tools');
      return {
        tools: this.getToolDefinitions(),
      };
    });

    // Call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name: toolName, arguments: args } = request.params;
      
      const context: RequestContext = {
        toolName,
        timestamp: new Date().toISOString(),
        requestId: Math.random().toString(36).substring(7)
      };
      
      logger.info('Tool call received', {
        ...context,
        args: this.sanitizeArgs(args || {})
      });
      
      try {
        // Check rate limits
        if (!rateLimiter.checkLimit()) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        
        const result = await this.handleToolCall(toolName, args || {}, context);
        
        logger.info('Tool call completed successfully', {
          ...context,
          success: result.success
        });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        const handledError = errorHandler.handleError(error, context);
        
        logger.error('Tool call failed', {
          ...context,
          error: handledError.message
        });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: handledError.message,
                code: handledError.code
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Get tool definitions
   */
  private getToolDefinitions(): Tool[] {
    return [
      {
        name: 'presearch_search',
        description: 'Perform web search using Presearch API with advanced filtering options',
        inputSchema: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Search query' },
            page: { type: 'number', description: 'Page number (default: 1)', default: 1 },
            lang: { type: 'string', description: 'Language code (e.g., en, es, fr)' },
            time: { type: 'string', description: 'Time filter (any, day, week, month, year)' },
            safe: { type: 'string', description: 'Safe search (0=off, 1=on)' },
            location: { type: 'string', description: 'Location filter' },
            ip: { type: 'string', description: 'IP address for geo-targeting' }
          },
          required: ['q']
        }
      },
      {
        name: 'presearch_multi_search',
        description: 'Execute multiple search queries simultaneously (2-5 queries)',
        inputSchema: {
          type: 'object',
          properties: {
            queries: {
              type: 'array',
              items: { type: 'string' },
              minItems: 2,
              maxItems: 5,
              description: 'Array of search queries'
            },
            lang: { type: 'string', description: 'Language code for all queries' },
            time: { type: 'string', description: 'Time filter for all queries' },
            safe: { type: 'string', description: 'Safe search setting for all queries' },
            location: { type: 'string', description: 'Location filter for all queries' }
          },
          required: ['queries']
        }
      },
      {
        name: 'presearch_suggestions',
        description: 'Get search suggestions and autocomplete for a query',
        inputSchema: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Partial search query' },
            limit: { type: 'number', description: 'Maximum suggestions (default: 10, max: 20)', default: 10, maximum: 20 },
            lang: { type: 'string', description: 'Language code' }
          },
          required: ['q']
        }
      },
      {
        name: 'presearch_search_analytics',
        description: 'Get analytics and insights about search patterns',
        inputSchema: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Search query to analyze' },
            analyze_trends: { type: 'boolean', description: 'Include trend analysis', default: false },
            include_related: { type: 'boolean', description: 'Include related queries', default: true }
          },
          required: ['q']
        }
      },
      {
        name: 'presearch_domain_search',
        description: 'Search within a specific domain or website',
        inputSchema: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Search query' },
            domain: { type: 'string', description: 'Domain to search within (e.g., wikipedia.org)' },
            page: { type: 'number', description: 'Page number (default: 1)', default: 1 },
            lang: { type: 'string', description: 'Language code' }
          },
          required: ['q', 'domain']
        }
      },
      {
        name: 'presearch_filtered_search',
        description: 'Advanced search with content type and quality filtering',
        inputSchema: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Search query' },
            contentType: {
              type: 'string',
              enum: ['web', 'news', 'images', 'videos', 'academic'],
              description: 'Content type filter'
            },
            page: { type: 'number', description: 'Page number (default: 1)', default: 1 },
            lang: { type: 'string', description: 'Language code' }
          },
          required: ['q', 'contentType']
        }
      },
      {
        name: 'presearch_cache_stats',
        description: 'Get cache statistics and performance metrics',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false
        }
      },
      {
        name: 'presearch_cache_clear',
        description: 'Clear the search results cache',
        inputSchema: {
          type: 'object',
          properties: {
            pattern: { type: 'string', description: 'Optional pattern to match cache keys for selective clearing' }
          },
          additionalProperties: false
        }
      }
    ];
  }

  /**
   * Handle tool calls
   */
  private async handleToolCall(toolName: string, args: any, context: any): Promise<MCPToolResponse> {
    switch (toolName) {
      case 'presearch_search':
        return this.handleSearch(args, context);
      
      case 'presearch_multi_search':
        return this.handleMultiSearch(args, context);
      
      case 'presearch_suggestions':
        return this.handleSuggestions(args, context);
      
      case 'presearch_search_analytics':
        return this.handleAnalytics(args, context);
      
      case 'presearch_domain_search':
        return this.handleDomainSearch(args, context);
      
      case 'presearch_filtered_search':
        return this.handleFilteredSearch(args, context);
      
      case 'presearch_cache_stats':
        return this.handleCacheStats(context);
      
      case 'presearch_cache_clear':
        return this.handleCacheClear(args, context);
      
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  /**
   * Handle search requests
   */
  private async handleSearch(args: any, context: any): Promise<MCPToolResponse> {
    const params = SearchParamsSchema.parse(args);
    const cacheKey = cacheManager.generateKey(params);
    
    // Check cache first
    const cachedResult = cacheManager.get(cacheKey);
    if (cachedResult) {
      logger.info('Returning cached search result', context);
      return cachedResult;
    }
    
    // Make API request
    const response = await apiClient.search(params);
    const result: PresearchResponse = responseParser.parseSearchResponse(response, params.q, 'search');
    
    // Cache the result
    cacheManager.set(cacheKey, result);
    
    return {
      success: true,
      data: result
    } as MCPToolResponse;
  }

  /**
   * Handle multi-search requests
   */
  private async handleMultiSearch(args: any, context: any): Promise<MCPToolResponse> {
    const params = MultiSearchParamsSchema.parse(args);
    
    const responses = await apiClient.multiSearch(params);
    return responseParser.parseMultiSearchResponse(responses, params.queries);
  }

  /**
   * Handle suggestions requests
   */
  private async handleSuggestions(args: any, context: any): Promise<MCPToolResponse> {
    const params = SuggestionsParamsSchema.parse(args);
    const cacheKey = cacheManager.generateKey(params);
    
    const cachedResult = cacheManager.get(cacheKey);
    if (cachedResult) {
      logger.info('Returning cached suggestions result', context);
      return cachedResult;
    }
    
    const response = await apiClient.getSuggestions(params);
    const result = responseParser.parseSuggestionsResponse(response, params.q);
    
    if (result.success && result.data) {
      cacheManager.set(cacheKey, result.data);
    }
    
    return result;
  }

  /**
   * Handle analytics requests
   */
  private async handleAnalytics(args: any, context: any): Promise<MCPToolResponse> {
    const params = AnalyticsParamsSchema.parse(args);
    const cacheKey = cacheManager.generateKey(params);
    
    const cachedResult = cacheManager.get(cacheKey);
    if (cachedResult) {
      logger.info('Returning cached analytics result', context);
      return cachedResult;
    }
    
    const response = await apiClient.getAnalytics(params);
    const result = responseParser.parseAnalyticsResponse(response, params.q);
    
    if (result.success && result.data) {
      cacheManager.set(cacheKey, result.data);
    }
    
    return result;
  }

  /**
   * Handle domain search requests
   */
  private async handleDomainSearch(args: any, context: any): Promise<MCPToolResponse> {
    const params = DomainSearchParamsSchema.parse(args);
    const cacheKey = cacheManager.generateKey(params);
    
    const cachedResult = cacheManager.get(cacheKey);
    if (cachedResult) {
      logger.info('Returning cached domain search result', context);
      return cachedResult;
    }
    
    const response = await apiClient.domainSearch(params);
    const result: PresearchResponse = responseParser.parseSearchResponse(response, params.q, 'domain-search');
    
    cacheManager.set(cacheKey, result);
    
    return {
      success: true,
      data: result
    } as MCPToolResponse;
  }

  /**
   * Handle filtered search requests
   */
  private async handleFilteredSearch(args: any, context: any): Promise<MCPToolResponse> {
    const params = FilteredSearchParamsSchema.parse(args);
    const cacheKey = cacheManager.generateKey(params);
    
    const cachedResult = cacheManager.get(cacheKey);
    if (cachedResult) {
      logger.info('Returning cached filtered search result', context);
      return cachedResult;
    }
    
    const response = await apiClient.filteredSearch(params);
    const result: PresearchResponse = responseParser.parseSearchResponse(response, params.q, 'filtered-search');
    
    cacheManager.set(cacheKey, result);
    
    return {
      success: true,
      data: result
    } as MCPToolResponse;
  }

  /**
   * Handle cache stats requests
   */
  private async handleCacheStats(context: any): Promise<MCPToolResponse> {
    const stats = cacheManager.getStats();
    const rateLimitStatus = rateLimiter.getStatus();
    
    return {
      success: true,
      data: {
        cache: stats,
        rateLimit: rateLimitStatus,
        server: {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          version: '2.0.0'
        }
      }
    };
  }

  /**
   * Handle cache clear requests
   */
  private async handleCacheClear(args: any, context: any): Promise<MCPToolResponse> {
    const params = CacheClearParamsSchema.parse(args);
    
    let clearedCount: number;
    
    if (params.pattern) {
      clearedCount = cacheManager.deleteByPattern(params.pattern);
      logger.info('Cache cleared by pattern', { ...context, pattern: params.pattern, clearedCount });
    } else {
      clearedCount = cacheManager.clear();
      logger.info('Cache cleared completely', { ...context, clearedCount });
    }
    
    return {
      success: true,
      data: {
        message: params.pattern 
          ? `Cleared ${clearedCount} cache entries matching pattern: ${params.pattern}`
          : `Cleared all ${clearedCount} cache entries`,
        clearedCount,
        pattern: params.pattern
      }
    };
  }

  /**
   * Sanitize arguments for logging
   */
  private sanitizeArgs(args: Record<string, any>): Record<string, any> {
    const sanitized = { ...args };
    
    // Truncate long query strings for logging
    if (sanitized.q && typeof sanitized.q === 'string' && sanitized.q.length > 100) {
      sanitized.q = sanitized.q.substring(0, 100) + '...';
    }
    
    if (sanitized.queries && Array.isArray(sanitized.queries)) {
      sanitized.queries = sanitized.queries.slice(0, 3).map(q => 
        typeof q === 'string' && q.length > 50 ? q.substring(0, 50) + '...' : q
      );
    }
    
    return sanitized;
  }

  /**
   * Get server status
   */
  public getStatus() {
    return {
      initialized: this.isInitialized,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cache: cacheManager.getStats(),
      rateLimit: rateLimiter.getStatus()
    };
  }
}