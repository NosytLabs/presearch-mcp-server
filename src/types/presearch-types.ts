import { z } from 'zod';

/**
 * Base search parameters schema
 */
export const SearchParamsSchema = z.object({
  q: z.string().min(1, 'Query is required'),
  page: z.number().min(1).default(1),
  lang: z.string().optional(),
  time: z.enum(['any', 'day', 'week', 'month', 'year']).optional(),
  safe: z.enum(['0', '1']).optional(),
  location: z.string().optional(),
  ip: z.string().optional()
});

/**
 * Multi-search parameters schema
 */
export const MultiSearchParamsSchema = z.object({
  queries: z.array(z.string().min(1)).min(2).max(5),
  lang: z.string().optional(),
  time: z.enum(['any', 'day', 'week', 'month', 'year']).optional(),
  safe: z.enum(['0', '1']).optional(),
  location: z.string().optional()
});

/**
 * Suggestions parameters schema
 */
export const SuggestionsParamsSchema = z.object({
  q: z.string().min(1, 'Query is required'),
  limit: z.number().min(1).max(20).default(10),
  lang: z.string().optional()
});

/**
 * Analytics parameters schema
 */
export const AnalyticsParamsSchema = z.object({
  q: z.string().min(1, 'Query is required'),
  analyze_trends: z.boolean().default(false),
  include_related: z.boolean().default(true)
});

/**
 * Domain search parameters schema
 */
export const DomainSearchParamsSchema = z.object({
  q: z.string().min(1, 'Query is required'),
  domain: z.string().min(1, 'Domain is required'),
  page: z.number().min(1).default(1),
  lang: z.string().optional()
});

/**
 * Filtered search parameters schema
 */
export const FilteredSearchParamsSchema = z.object({
  q: z.string().min(1, 'Query is required'),
  contentType: z.enum(['web', 'news', 'images', 'videos', 'academic']),
  page: z.number().min(1).default(1),
  lang: z.string().optional()
});

/**
 * Cache clear parameters schema
 */
export const CacheClearParamsSchema = z.object({
  pattern: z.string().optional()
});

/**
 * Type definitions
 */
export type SearchParams = z.infer<typeof SearchParamsSchema>;
export type MultiSearchParams = z.infer<typeof MultiSearchParamsSchema>;
export type SuggestionsParams = z.infer<typeof SuggestionsParamsSchema>;
export type AnalyticsParams = z.infer<typeof AnalyticsParamsSchema>;
export type DomainSearchParams = z.infer<typeof DomainSearchParamsSchema>;
export type FilteredSearchParams = z.infer<typeof FilteredSearchParamsSchema>;
export type CacheClearParams = z.infer<typeof CacheClearParamsSchema>;

/**
 * Search result interface
 */
export interface SearchResult {
  title: string;
  url: string;
  description: string;
  timestamp?: string;
  favicon?: string;
  domain?: string;
  snippet?: string;
}

/**
 * Analytics data interface
 */
export interface AnalyticsData {
  searchVolume?: number;
  competition?: number;
  trends?: Array<{
    period: string;
    volume: number;
  }>;
  relatedQueries?: string[];
  topDomains?: Array<{
    domain: string;
    count: number;
  }>;
}

/**
 * API response interface
 */
export interface APIResponse {
  success: boolean;
  query?: string;
  results?: SearchResult[];
  suggestions?: string[];
  analytics?: AnalyticsData;
  total?: number;
  page?: number;
  timestamp: string;
  source?: string;
  error?: string;
  [key: string]: any;
}

/**
 * Presearch response interface
 */
export interface PresearchResponse {
  query: string;
  results: SearchResult[];
  total: number;
  page: number;
  timestamp: string;
  source: string;
  suggestions?: string[];
  analytics?: AnalyticsData;
  processingTime?: number;
  cached?: boolean;
}

/**
 * MCP tool response interface
 */
export interface MCPToolResponse {
  success: boolean;
  data?: any;
  error?: string;
  code?: string;
}

/**
 * Request context interface
 */
export interface RequestContext {
  operation?: string;
  endpoint?: string;
  toolName?: string;
  timestamp: string;
  requestId?: string;
  [key: string]: any;
}

/**
 * Cache entry interface
 */
export interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
  hits: number;
}

/**
 * Cache statistics interface
 */
export interface CacheStats {
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
  hitRate: number;
  oldestEntry?: number;
  newestEntry?: number;
}

/**
 * Rate limit status interface
 */
export interface RateLimitStatus {
  remaining: number;
  limit: number;
  resetTime: number;
  windowStart: number;
}

/**
 * Server status interface
 */
export interface ServerStatus {
  initialized: boolean;
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  cache: CacheStats;
  rateLimit: RateLimitStatus;
}

/**
 * Error response interface
 */
export interface ErrorResponse {
  success: false;
  error: string;
  code: string;
  timestamp: string;
  context?: RequestContext;
}