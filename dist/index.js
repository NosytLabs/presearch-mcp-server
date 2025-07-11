#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
// Removed unused imports - McpServer handles tool registration automatically
import axios from 'axios';
import dotenv from 'dotenv';
import { z } from 'zod';
// Load environment variables
dotenv.config();
class PresearchMCPServer {
    server;
    apiKey;
    baseUrl;
    constructor() {
        this.apiKey = process.env.PRESEARCH_API_KEY || '';
        this.baseUrl = process.env.PRESEARCH_BASE_URL || 'https://api.presearch.org/v1';
        if (!this.apiKey) {
            throw new Error('PRESEARCH_API_KEY environment variable is required');
        }
        this.server = new McpServer({
            name: 'presearch-mcp-server',
            version: '1.0.0',
        });
        this.setupRequestHandlers();
    }
    setupRequestHandlers() {
        this.server.registerTool('presearch_search', {
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
        }, async (args) => {
            return await this.handleSearch(args);
        });
    }
    async handleSearch(args) {
        if (!args || !args.query) {
            throw new Error('Missing query parameter');
        }
        try {
            const searchParams = {
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
        }
        catch (error) {
            throw new Error(`Search failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async performSearch(params) {
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
    async start() {
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
