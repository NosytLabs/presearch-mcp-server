import { logger } from './logger.js';
import {
  APIResponse,
  PresearchResponse,
  SearchResult,
  AnalyticsData,
  MCPToolResponse
} from '../types/presearch-types.js';

/**
 * Response parser utility
 */
export class ResponseParser {
  /**
   * Parse search response
   */
  public parseSearchResponse(
    response: APIResponse,
    query: string,
    operation: string
  ): PresearchResponse {
    try {
      const results = this.normalizeSearchResults(response.results || []);
      
      const parsedResponse: PresearchResponse = {
        query,
        results,
        total: response.total || results.length,
        page: response.page || 1,
        timestamp: response.timestamp || new Date().toISOString(),
        source: response.source || 'presearch-api',
        processingTime: this.calculateProcessingTime(response.timestamp),
        cached: false
      };
      
      // Add suggestions if available
      if (response.suggestions && response.suggestions.length > 0) {
        parsedResponse.suggestions = response.suggestions;
      }
      
      // Add analytics if available
      if (response.analytics) {
        parsedResponse.analytics = this.normalizeAnalytics(response.analytics);
      }
      
      logger.debug('Search response parsed', {
        operation,
        query,
        resultsCount: results.length,
        total: parsedResponse.total
      });
      
      return parsedResponse;
      
    } catch (error) {
      logger.error('Failed to parse search response', {
        operation,
        query,
        error: (error as Error).message
      });
      
      // Return minimal response on parse error
      return {
        query,
        results: [],
        total: 0,
        page: 1,
        timestamp: new Date().toISOString(),
        source: 'error-fallback'
      };
    }
  }

  /**
   * Parse multi-search response
   */
  public parseMultiSearchResponse(
    responses: APIResponse[],
    queries: string[]
  ): MCPToolResponse {
    try {
      const results = responses.map((response, index) => {
        const query = queries[index];
        
        if (response.success) {
          return this.parseSearchResponse(response, query, 'multi-search');
        } else {
          return {
            query,
            results: [],
            total: 0,
            page: 1,
            timestamp: new Date().toISOString(),
            source: 'error',
            error: response.error
          };
        }
      });
      
      const totalResults = results.reduce((sum, result) => sum + result.results.length, 0);
      const successfulQueries = results.filter(result => !result.error).length;
      
      logger.info('Multi-search response parsed', {
        totalQueries: queries.length,
        successfulQueries,
        totalResults
      });
      
      return {
        success: true,
        data: {
          queries: queries.length,
          successful: successfulQueries,
          results,
          summary: {
            totalResults,
            averageResults: totalResults / queries.length,
            successRate: successfulQueries / queries.length
          },
          timestamp: new Date().toISOString()
        }
      };
      
    } catch (error) {
      logger.error('Failed to parse multi-search response', {
        error: (error as Error).message,
        queriesCount: queries.length
      });
      
      return {
        success: false,
        error: `Failed to parse multi-search response: ${(error as Error).message}`
      };
    }
  }

  /**
   * Parse suggestions response
   */
  public parseSuggestionsResponse(
    response: APIResponse,
    query: string
  ): MCPToolResponse {
    try {
      const suggestions = response.suggestions || [];
      
      logger.debug('Suggestions response parsed', {
        query,
        suggestionsCount: suggestions.length
      });
      
      return {
        success: true,
        data: {
          query,
          suggestions,
          count: suggestions.length,
          timestamp: response.timestamp || new Date().toISOString(),
          source: response.source || 'presearch-api'
        }
      };
      
    } catch (error) {
      logger.error('Failed to parse suggestions response', {
        query,
        error: (error as Error).message
      });
      
      return {
        success: false,
        error: `Failed to parse suggestions: ${(error as Error).message}`
      };
    }
  }

  /**
   * Parse analytics response
   */
  public parseAnalyticsResponse(
    response: APIResponse,
    query: string
  ): MCPToolResponse {
    try {
      const analytics = this.normalizeAnalytics(response.analytics || {});
      
      logger.debug('Analytics response parsed', {
        query,
        hasSearchVolume: !!analytics.searchVolume,
        hasTrends: !!(analytics.trends && analytics.trends.length > 0),
        hasRelatedQueries: !!(analytics.relatedQueries && analytics.relatedQueries.length > 0)
      });
      
      return {
        success: true,
        data: {
          query,
          analytics,
          timestamp: response.timestamp || new Date().toISOString(),
          source: response.source || 'presearch-api'
        }
      };
      
    } catch (error) {
      logger.error('Failed to parse analytics response', {
        query,
        error: (error as Error).message
      });
      
      return {
        success: false,
        error: `Failed to parse analytics: ${(error as Error).message}`
      };
    }
  }

  /**
   * Normalize search results
   */
  private normalizeSearchResults(results: any[]): SearchResult[] {
    return results.map((result, index) => {
      try {
        return {
          title: this.sanitizeText(result.title || `Result ${index + 1}`),
          url: result.url || result.link || '',
          description: this.sanitizeText(result.description || result.snippet || ''),
          timestamp: result.timestamp || new Date().toISOString(),
          favicon: result.favicon || result.icon,
          domain: this.extractDomain(result.url || result.link),
          snippet: this.sanitizeText(result.snippet || result.description)
        };
      } catch (error) {
        logger.warn('Failed to normalize search result', {
          index,
          error: (error as Error).message
        });
        
        return {
          title: `Result ${index + 1}`,
          url: '',
          description: 'Failed to parse result',
          timestamp: new Date().toISOString()
        };
      }
    }).filter(result => result.url); // Filter out results without URLs
  }

  /**
   * Normalize analytics data
   */
  private normalizeAnalytics(analytics: any): AnalyticsData {
    return {
      searchVolume: typeof analytics.searchVolume === 'number' ? analytics.searchVolume : undefined,
      competition: typeof analytics.competition === 'number' ? analytics.competition : undefined,
      trends: Array.isArray(analytics.trends) ? analytics.trends : undefined,
      relatedQueries: Array.isArray(analytics.relatedQueries) ? analytics.relatedQueries : undefined,
      topDomains: Array.isArray(analytics.topDomains) ? analytics.topDomains : undefined
    };
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string | undefined {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return undefined;
    }
  }

  /**
   * Sanitize text content
   */
  private sanitizeText(text: string): string {
    if (typeof text !== 'string') {
      return '';
    }
    
    return text
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .replace(/[\r\n\t]/g, ' ') // Replace line breaks and tabs with spaces
      .trim() // Remove leading/trailing whitespace
      .substring(0, 500); // Limit length
  }

  /**
   * Calculate processing time
   */
  private calculateProcessingTime(responseTimestamp?: string): number | undefined {
    if (!responseTimestamp) {
      return undefined;
    }
    
    try {
      const responseTime = new Date(responseTimestamp).getTime();
      const now = Date.now();
      return now - responseTime;
    } catch {
      return undefined;
    }
  }
}

// Export singleton instance
export const responseParser = new ResponseParser();