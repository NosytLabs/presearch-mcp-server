#!/usr/bin/env node

import { PresearchServer } from './server/presearch-mcp-server.js';
import { logger } from './utils/logger.js';
import { config } from './config/configuration.js';

/**
 * Main entry point for the Presearch MCP server
 */
async function main() {
  try {
    logger.info('Starting Presearch MCP Server', {
      version: '2.0.0',
      nodeVersion: process.version,
      platform: process.platform
    });

    // Validate configuration
    const configValidation = config.validateApiKey();
    if (!configValidation.isValid) {
      logger.warn('Configuration warning', { message: configValidation.message });
    }

    const urlValidation = config.validateBaseUrl();
    if (!urlValidation.isValid) {
      logger.error('Configuration error', { message: urlValidation.message });
      process.exit(1);
    }

    // Initialize and start the server
    const server = new PresearchServer();
    await server.initialize();
    
    logger.info('Presearch MCP Server started successfully');
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully');
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully');
      process.exit(0);
    });
    
  } catch (error) {
    logger.error('Failed to start Presearch MCP Server', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  }
}

// Start the server
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});