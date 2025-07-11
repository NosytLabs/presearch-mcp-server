#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import axios, { AxiosError } from 'axios';
import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Enable debug logging if DEBUG environment variable is set
const DEBUG = process.env.DEBUG === 'presearch-mcp';
const log = (message: string, ...args: any[]) => {
  if (DEBUG) {
    console.error(`[DEBUG] ${message}`, ...args);
  }
};

interface SearchParams {
  query: string;
  page?: number;
  lang?: string;
  time?: 'any' | 'day' | 'week' | 'month' | 'year';
  safe?: '0' | '1';
  location?: string;
  ip?: string;
}

interface SearchResult {
  title: string;
  link: string;
  description: string;
}

interface PresearchResponse {
  standardResults: SearchResult[];
  query: string;
  totalResults: number;
  page: number;
}

class PresearchMCPServer {
  private server: McpServer;
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.PRESEARCH_API_KEY || '';
    this.baseUrl = process.env.PRESEARCH_BASE_URL || 'https://na-us-1.presearch.com/v1';
    
    log('Initializing Presearch MCP Server', { 
      hasApiKey: !!this.apiKey, 
      baseUrl: this.baseUrl 
    });
    
    if (!this.apiKey) {
      throw new Error('PRESEARCH_API_KEY environment variable is required. Please check your .env file.');
    }

    // Validate API key format (basic check)
    if (this.apiKey.length < 10) {
      throw new Error('PRESEARCH_API_KEY appears to be invalid (too short). Please check your API key.');
    }

    this.server = new McpServer({
      name: 'presearch-mcp-server',
      version: '1.0.0',
    });

    this.setupRequestHandlers();
    log('Presearch MCP Server initialized successfully');
  }

  private setupRequestHandlers(): void {
    this.server.registerTool(
      'presearch_search',
      {
        title: 'Presearch Web Search',
        description: 'Search the web using Presearch API',
        inputSchema: {
           query: z.string().describe('Search query'),
           page: z.number().optional().describe('Page number for pagination (default: 1)'),
           lang: z.string().optional().describe('Language code (e.g., "en", "es")'),
           time: z.enum(['any', 'day', 'week', 'month', 'year']).optional().describe('Time filter for results'),
           safe: z.enum(['0', '1']).optional().describe('Safe search setting'),
           location: z.string().optional().describe('Location for localized results'),
           ip: z.string().optional().describe('IP address for geo-targeting')
         }
      },
      async (args) => {
        return await this.handleSearch(args);
      }
    );
  }

  private async handleSearch(args: any): Promise<any> {
    if (!args || !args.query) {
      throw new Error('Missing query parameter');
    }

    try {
      const searchParams: SearchParams = {
        query: args.query,
        page: args.page || 1,
        lang: args.lang,
        time: args.time,
        safe: args.safe,
        location: args.location,
        ip: args.ip
      };

      const response = await this.performSearch(searchParams);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(
        `Search failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async performSearch(params: SearchParams): Promise<PresearchResponse> {
    const url = `${this.baseUrl}/search`;
    
    const requestParams = {
      q: params.query,
      page: params.page,
      ...(params.lang && { lang: params.lang }),
      ...(params.time && { time: params.time }),
      ...(params.safe && { safe: params.safe }),
      ...(params.location && { location: params.location }),
      ...(params.ip && { ip: params.ip })
    };

    log('Making search request', { url, params: requestParams });

    try {
      const response = await axios.get(url, {
        params: requestParams,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json',
          'User-Agent': 'presearch-mcp/1.0.0'
        },
        timeout: 15000
      });

      log('Search response received', { status: response.status, dataKeys: Object.keys(response.data) });

      const data = response.data.data || response.data;
      
      return {
        standardResults: data.standardResults || [],
        query: params.query,
        totalResults: data.standardResults?.length || 0,
        page: params.page || 1
      };
    } catch (error) {
      if (error instanceof AxiosError) {
        const status = error.response?.status;
        const message = error.response?.data?.message || error.message;
        
        log('Search request failed', { status, message, url });
        
        if (status === 401) {
          throw new Error('Invalid API key. Please check your PRESEARCH_API_KEY environment variable.');
        } else if (status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        } else if (status === 403) {
          throw new Error('Access forbidden. Please check your API key permissions.');
        } else if (error.code === 'ECONNABORTED') {
          throw new Error('Request timeout. The Presearch API may be experiencing high load.');
        } else {
          throw new Error(`Search request failed: ${message} (Status: ${status})`);
        }
      }
      
      log('Unexpected error during search', error);
      throw new Error(`Unexpected error during search: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Presearch MCP server running on stdio');
  }
}

// Export default function for Smithery compatibility
export default function({ sessionId, config }: { sessionId: string; config?: any }) {
  const server = new PresearchMCPServer();
  return server.start().catch((error) => {
    console.error('Failed to start Presearch MCP server:', error);
    process.exit(1);
  });
}