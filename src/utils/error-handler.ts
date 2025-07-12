import { logger } from './logger.js';
import { RequestContext } from '../types/presearch-types.js';

/**
 * Custom error classes
 */
export class PresearchError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly context?: RequestContext;

  constructor(message: string, code: string, statusCode?: number, context?: RequestContext) {
    super(message);
    this.name = 'PresearchError';
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
  }
}

export class APIError extends PresearchError {
  constructor(message: string, statusCode?: number, context?: RequestContext) {
    super(message, 'API_ERROR', statusCode, context);
    this.name = 'APIError';
  }
}

export class ValidationError extends PresearchError {
  constructor(message: string, context?: RequestContext) {
    super(message, 'VALIDATION_ERROR', 400, context);
    this.name = 'ValidationError';
  }
}

export class RateLimitError extends PresearchError {
  constructor(message: string, context?: RequestContext) {
    super(message, 'RATE_LIMIT_ERROR', 429, context);
    this.name = 'RateLimitError';
  }
}

export class TimeoutError extends PresearchError {
  constructor(message: string, context?: RequestContext) {
    super(message, 'TIMEOUT_ERROR', 408, context);
    this.name = 'TimeoutError';
  }
}

/**
 * Error handler utility
 */
export class ErrorHandler {
  /**
   * Handle and normalize errors
   */
  public handleError(error: any, context?: RequestContext): PresearchError {
    // If already a PresearchError, return as-is
    if (error instanceof PresearchError) {
      return error;
    }

    // Handle Axios errors
    if (error.isAxiosError) {
      return this.handleAxiosError(error, context);
    }

    // Handle Zod validation errors
    if (error.name === 'ZodError') {
      return this.handleZodError(error, context);
    }

    // Handle generic errors
    return this.handleGenericError(error, context);
  }

  /**
   * Handle Axios errors
   */
  private handleAxiosError(error: any, context?: RequestContext): PresearchError {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;

    switch (status) {
      case 400:
        return new ValidationError(`Bad request: ${message}`, context);
      case 401:
        return new APIError('Unauthorized: Invalid API key', 401, context);
      case 403:
        return new APIError('Forbidden: Access denied', 403, context);
      case 404:
        return new APIError('Not found: Endpoint does not exist', 404, context);
      case 429:
        return new RateLimitError('Rate limit exceeded', context);
      case 500:
        return new APIError('Internal server error', 500, context);
      case 502:
        return new APIError('Bad gateway', 502, context);
      case 503:
        return new APIError('Service unavailable', 503, context);
      case 504:
        return new APIError('Gateway timeout', 504, context);
      default:
        if (error.code === 'ECONNABORTED') {
          return new TimeoutError('Request timeout', context);
        }
        if (error.code === 'ECONNREFUSED') {
          return new APIError('Connection refused', undefined, context);
        }
        if (error.code === 'ENOTFOUND') {
          return new APIError('DNS resolution failed', undefined, context);
        }
        return new APIError(`Network error: ${message}`, status, context);
    }
  }

  /**
   * Handle Zod validation errors
   */
  private handleZodError(error: any, context?: RequestContext): ValidationError {
    const issues = error.errors || [];
    const messages = issues.map((issue: any) => {
      const path = issue.path.join('.');
      return `${path}: ${issue.message}`;
    });
    
    const message = `Validation failed: ${messages.join(', ')}`;
    return new ValidationError(message, context);
  }

  /**
   * Handle generic errors
   */
  private handleGenericError(error: any, context?: RequestContext): PresearchError {
    const message = error.message || 'Unknown error occurred';
    return new PresearchError(message, 'UNKNOWN_ERROR', undefined, context);
  }

  /**
   * Log error with appropriate level
   */
  public logError(error: PresearchError): void {
    const logData = {
      code: error.code,
      statusCode: error.statusCode,
      context: error.context,
      stack: error.stack
    };

    switch (error.code) {
      case 'RATE_LIMIT_ERROR':
        logger.warn(error.message, logData);
        break;
      case 'VALIDATION_ERROR':
        logger.warn(error.message, logData);
        break;
      case 'TIMEOUT_ERROR':
        logger.warn(error.message, logData);
        break;
      default:
        logger.error(error.message, logData);
    }
  }

  /**
   * Create user-friendly error message
   */
  public getUserMessage(error: PresearchError): string {
    switch (error.code) {
      case 'API_ERROR':
        if (error.statusCode === 401) {
          return 'Invalid API key. Please check your PRESEARCH_API_KEY environment variable.';
        }
        if (error.statusCode === 429) {
          return 'Rate limit exceeded. Please try again later.';
        }
        return 'API service is currently unavailable. Please try again later.';
      
      case 'VALIDATION_ERROR':
        return `Invalid input: ${error.message.replace('Validation failed: ', '')}`;
      
      case 'RATE_LIMIT_ERROR':
        return 'Too many requests. Please wait before trying again.';
      
      case 'TIMEOUT_ERROR':
        return 'Request timed out. Please try again.';
      
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandler();