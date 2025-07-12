import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { config } from '../config/configuration.js';
import { logger } from '../utils/logger.js';
import { errorHandler } from '../utils/error-handler.js';
import {
  SearchParams,
  MultiSearchParams,
  SuggestionsParams,
  AnalyticsParams,
  DomainSearchParams,
  FilteredSearchParams,
  APIResponse,
  RequestContext
} from '../types/presearch-types.js';

/**
 * Presearch API Client
 */
export class PresearchAPIClient {
  private client: AxiosInstance;
  private readonly maxRetries: number;
  private readonly retryDelay: number;
  private isConnected: boolean = false;

  constructor() {
    const configData = config.get();
    
    this.maxRetries = configData.maxRetries;
    this.retryDelay = configData.retryDelay;
    
    this.client = axios.create({
      baseURL: configData.baseUrl,
      timeout: configData.timeout,
      headers: {
        'Authorization': `Bearer ${configData.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'presearch-mcp-server/2.0.0',
        'Accept': 'application/json'
      }
    });
    
    this.setupInterceptors();
  }

  /**
   * Setup axios interceptors for logging and error handling
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('API request initiated', {
          method: config.method?.toUpperCase(),
          url: config.url,
          params: this.sanitizeParams(config.params || {})
        });
        return config;
      },
      (error) => {
        logger.error('Request interceptor error', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('API response received', {
          status: response.status,
          url: response.config.url,
          dataSize: JSON.stringify(response.data).length
        });
        return response;
      },
      (error) => {
        this.logAPIError(error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Test API connectivity
   */
  public async testConnection(): Promise<boolean> {
    try {
      logger.info('Testing API connectivity');
      
      const response = await this.client.get('/health', {
        timeout: 5000
      });
      
      this.isConnected = response.status === 200;
      
      if (this.isConnected) {
        logger.info('API connectivity test successful');
      } else {
        logger.warn('API connectivity test failed', { status: response.status });
      }
      
      return this.isConnected;
    } catch (error) {
      logger.warn('API connectivity test failed', { error: (error as Error).message });
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Perform search
   */
  public async search(params: SearchParams): Promise<APIResponse> {
    return this.makeRequest('/search', params, 'search');
  }

  /**
   * Perform multiple searches
   */
  public async multiSearch(params: MultiSearchParams): Promise<APIResponse[]> {
    const promises = params.queries.map(async (query, index) => {
      const searchParams: SearchParams = {
        q: query,
        page: 1,
        ...params
      };
      
      try {
        return await this.makeRequest('/search', searchParams, `multi-search-${index}`);
      } catch (error) {
        logger.error('Multi-search query failed', {
          query,
          index,
          error: (error as Error).message
        });
        
        return {
          success: false,
          error: (error as Error).message,
          query,
          results: [],
          total: 0,
          page: 1,
          timestamp: new Date().toISOString()
        };
      }
    });
    
    return Promise.all(promises);
  }

  /**
   * Get search suggestions
   */
  public async getSuggestions(params: SuggestionsParams): Promise<APIResponse> {
    return this.makeRequest('/suggestions', params, 'suggestions');
  }

  /**
   * Get search analytics
   */
  public async getAnalytics(params: AnalyticsParams): Promise<APIResponse> {
    return this.makeRequest('/analytics', params, 'analytics');
  }

  /**
   * Perform domain-specific search
   */
  public async domainSearch(params: DomainSearchParams): Promise<APIResponse> {
    const searchParams = {
      ...params,
      q: `${params.q} site:${params.domain}`
    };
    
    return this.makeRequest('/search', searchParams, 'domain-search');
  }

  /**
   * Perform filtered search
   */
  public async filteredSearch(params: FilteredSearchParams): Promise<APIResponse> {
    const endpoint = this.getFilteredEndpoint(params.contentType);
    return this.makeRequest(endpoint, params, 'filtered-search');
  }

  /**
   * Make HTTP request with retry logic
   */
  private async makeRequest(
    endpoint: string,
    params: Record<string, any>,
    operation: string
  ): Promise<APIResponse> {
    const context: RequestContext = {
      operation,
      endpoint,
      timestamp: new Date().toISOString(),
      requestId: Math.random().toString(36).substring(7)
    };
    
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.debug('Making API request', {
          ...context,
          attempt,
          params: this.sanitizeParams(params)
        });
        
        const response = await this.client.get(endpoint, {
          params: this.cleanParams(params)
        });
        
        const apiResponse = this.processResponse(response, context);
        
        logger.info('API request successful', {
          ...context,
          attempt,
          resultsCount: apiResponse.results?.length || 0
        });
        
        return apiResponse;
        
      } catch (error) {
        lastError = error as Error;
        
        logger.warn('API request failed', {
          ...context,
          attempt,
          error: lastError.message,
          willRetry: attempt < this.maxRetries
        });
        
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelay * attempt);
        }
      }
    }
    
    // All retries failed, return mock data or throw error
    if (config.get().mockMode) {
      logger.info('Returning mock data due to API failure', context);
      return this.getMockResponse(params, operation);
    }
    
    const handledError = errorHandler.handleError(lastError!, context);
    throw handledError;
  }

  /**
   * Process API response
   */
  private processResponse(response: AxiosResponse, context: RequestContext): APIResponse {
    const data = response.data;
    
    // Normalize response structure
    return {
      success: true,
      results: data.results || data.items || [],
      total: data.total || data.totalResults || 0,
      page: data.page || data.currentPage || 1,
      query: data.query || '',
      suggestions: data.suggestions || [],
      analytics: data.analytics || null,
      timestamp: new Date().toISOString(),
      source: 'presearch-api',
      ...data
    };
  }

  /**
   * Get mock response for testing/fallback
   */
  private getMockResponse(params: Record<string, any>, operation: string): APIResponse {
    const query = params.q || params.query || 'test';
    
    switch (operation) {
      case 'suggestions':
        return {
          success: true,
          query,
          suggestions: [
            `${query} tutorial`,
            `${query} guide`,
            `${query} examples`,
            `${query} documentation`,
            `${query} best practices`
          ],
          timestamp: new Date().toISOString(),
          source: 'mock-data'
        };
        
      case 'analytics':
        return {
          success: true,
          query,
          analytics: {
            searchVolume: Math.floor(Math.random() * 10000),
            competition: Math.random(),
            trends: [
              { period: '2024-01', volume: Math.floor(Math.random() * 1000) },
              { period: '2024-02', volume: Math.floor(Math.random() * 1000) },
              { period: '2024-03', volume: Math.floor(Math.random() * 1000) }
            ],
            relatedQueries: [
              `related to ${query}`,
              `${query} alternatives`,
              `best ${query}`
            ]
          },
          timestamp: new Date().toISOString(),
          source: 'mock-data'
        };
        
      default:
        return {
          success: true,
          query,
          results: [
            {
              title: `Mock Result for: ${query}`,
              url: 'https://example.com/mock-result',
              description: `This is a mock search result for the query: ${query}. In a real implementation, this would contain actual search results from the Presearch API.`,
              timestamp: new Date().toISOString()
            },
            {
              title: `Another Mock Result for: ${query}`,
              url: 'https://example.com/mock-result-2',
              description: `This is another mock search result demonstrating the structure of Presearch API responses.`,
              timestamp: new Date().toISOString()
            }
          ],
          total: 2,
          page: params.page || 1,
          timestamp: new Date().toISOString(),
          source: 'mock-data'
        };
    }
  }

  /**
   * Get filtered search endpoint
   */
  private getFilteredEndpoint(contentType: string): string {
    const endpoints: Record<string, string> = {
      web: '/search',
      news: '/news',
      images: '/images',
      videos: '/videos',
      academic: '/academic'
    };
    
    return endpoints[contentType] || '/search';
  }

  /**
   * Clean parameters for API request
   */
  private cleanParams(params: Record<string, any>): Record<string, any> {
    const cleaned: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        cleaned[key] = value;
      }
    }
    
    return cleaned;
  }

  /**
   * Sanitize parameters for logging
   */
  private sanitizeParams(params: Record<string, any>): Record<string, any> {
    const sanitized = { ...params };
    
    // Truncate long queries for logging
    if (sanitized.q && typeof sanitized.q === 'string' && sanitized.q.length > 100) {
      sanitized.q = sanitized.q.substring(0, 100) + '...';
    }
    
    return sanitized;
  }

  /**
   * Log API errors
   */
  private logAPIError(error: AxiosError): void {
    const errorInfo = {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      method: error.config?.method?.toUpperCase()
    };
    
    if (error.response?.status === 429) {
      logger.warn('API rate limit exceeded', errorInfo);
    } else if (error.response?.status && error.response.status >= 500) {
      logger.error('API server error', errorInfo);
    } else if (error.code === 'ECONNABORTED') {
      logger.warn('API request timeout', errorInfo);
    } else {
      logger.error('API request error', errorInfo);
    }
  }

  /**
   * Delay utility for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get connection status
   */
  public getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

// Export singleton instance
export const apiClient = new PresearchAPIClient();