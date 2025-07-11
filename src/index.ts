#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

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
  private server: Server;
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.PRESEARCH_API_KEY || '';
    this.baseUrl = process.env.PRESEARCH_BASE_URL || 'https://api.presearch.org/v1';
    
    if (!this.apiKey) {
      throw new Error('PRESEARCH_API_KEY environment variable is required');
    }

    this.server = new Server(
      {
        name: 'presearch-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupRequestHandlers();
  }

  private setupRequestHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'presearch_search',
            description: 'Search the web using Presearch API',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query'
                },
                page: {
                  type: 'number',
                  description: 'Page number for pagination (default: 1)'
                },
                lang: {
                  type: 'string',
                  description: 'Language code (e.g., "en", "es")'
                },
                time: {
                  type: 'string',
                  enum: ['any', 'day', 'week', 'month', 'year'],
                  description: 'Time filter for results'
                },
                safe: {
                  type: 'string',
                  enum: ['0', '1'],
                  description: 'Safe search setting'
                },
                location: {
                  type: 'string',
                  description: 'Location for localized results'
                },
                ip: {
                  type: 'string',
                  description: 'IP address for geo-targeting'
                }
              },
              required: ['query']
            }
          }
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      if (name === 'presearch_search') {
        return await this.handleSearch(args);
      }
      
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    });
  }

  private async handleSearch(args: any): Promise<any> {
    if (!args || !args.query) {
      throw new McpError(ErrorCode.InvalidParams, 'Missing query parameter');
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
      throw new McpError(
        ErrorCode.InternalError,
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

    const response = await axios.get(url, {
      params: requestParams,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    const data = response.data.data || response.data;
    
    return {
      standardResults: data.standardResults || [],
      query: params.query,
      totalResults: data.standardResults?.length || 0,
      page: params.page || 1
    };
  }

  public async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Presearch MCP server running on stdio');
  }
}

const server = new PresearchMCPServer();
server.start().catch((error) => {
  console.error('Failed to start Presearch MCP server:', error);
  process.exit(1);
});