# Presearch MCP Server

A Model Context Protocol (MCP) server that provides comprehensive search capabilities using the Presearch API. This server enables AI assistants to perform web searches, get suggestions, analyze search patterns, and access various search-related functionalities.

## Features

- **8 Comprehensive Search Tools**: Web search, multi-search, suggestions, analytics, domain search, filtered search, and cache management
- **Robust Error Handling**: Comprehensive error handling with retry logic and graceful fallbacks
- **Intelligent Caching**: TTL-based caching system for improved performance
- **Rate Limiting**: Built-in rate limiting to respect API quotas
- **Type Safety**: Full TypeScript implementation with Zod schema validation
- **Mock Mode**: Fallback mode for testing and development
- **Comprehensive Logging**: Detailed logging for debugging and monitoring

## Installation

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Presearch API key (get one at [presearch.org](https://presearch.org))

### Quick Start

1. **Clone the repository**:
   ```bash
   git clone https://github.com/presearch/presearch-mcp-server.git
   cd presearch-mcp-server
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your Presearch API key
   ```

4. **Build the project**:
   ```bash
   npm run build
   ```

5. **Run the server**:
   ```bash
   npm start
   ```

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Required
PRESEARCH_API_KEY=your_presearch_api_key_here

# Optional - API Configuration
PRESEARCH_BASE_URL=https://api.presearch.org/v1
PRESEARCH_TIMEOUT=30000
PRESEARCH_MAX_RETRIES=3
PRESEARCH_RETRY_DELAY=1000

# Optional - Rate Limiting
PRESEARCH_RATE_LIMIT=100
PRESEARCH_RATE_LIMIT_WINDOW=60000

# Optional - Caching
PRESEARCH_CACHE_TTL=3600
PRESEARCH_CACHE_MAX_SIZE=1000
PRESEARCH_ENABLE_CACHE=true

# Optional - Debugging
PRESEARCH_LOG_LEVEL=info
PRESEARCH_MOCK_MODE=false
```

### Configuration Options

| Variable | Default | Description |
|----------|---------|-------------|
| `PRESEARCH_API_KEY` | *required* | Your Presearch API key |
| `PRESEARCH_BASE_URL` | `https://api.presearch.org/v1` | Presearch API base URL |
| `PRESEARCH_TIMEOUT` | `30000` | Request timeout in milliseconds |
| `PRESEARCH_MAX_RETRIES` | `3` | Maximum number of retry attempts |
| `PRESEARCH_RETRY_DELAY` | `1000` | Delay between retries in milliseconds |
| `PRESEARCH_RATE_LIMIT` | `100` | Maximum requests per window |
| `PRESEARCH_RATE_LIMIT_WINDOW` | `60000` | Rate limit window in milliseconds |
| `PRESEARCH_CACHE_TTL` | `3600` | Cache time-to-live in seconds |
| `PRESEARCH_CACHE_MAX_SIZE` | `1000` | Maximum number of cached entries |
| `PRESEARCH_ENABLE_CACHE` | `true` | Enable/disable caching |
| `PRESEARCH_LOG_LEVEL` | `info` | Logging level (error, warn, info, debug) |
| `PRESEARCH_MOCK_MODE` | `false` | Enable mock mode for testing |

## Available Tools

### 1. presearch_search

Perform web search with advanced filtering options.

**Parameters:**
- `q` (string, required): Search query
- `page` (number, optional): Page number (default: 1)
- `lang` (string, optional): Language code (e.g., 'en', 'es', 'fr')
- `time` (string, optional): Time filter ('any', 'day', 'week', 'month', 'year')
- `safe` (string, optional): Safe search ('0'=off, '1'=on)
- `location` (string, optional): Location filter
- `ip` (string, optional): IP address for geo-targeting

**Example:**
```json
{
  "q": "artificial intelligence trends 2024",
  "page": 1,
  "lang": "en",
  "time": "month"
}
```

### 2. presearch_multi_search

Execute multiple search queries simultaneously (2-5 queries).

**Parameters:**
- `queries` (array, required): Array of 2-5 search queries
- `lang` (string, optional): Language code for all queries
- `time` (string, optional): Time filter for all queries
- `safe` (string, optional): Safe search setting for all queries
- `location` (string, optional): Location filter for all queries

**Example:**
```json
{
  "queries": [
    "machine learning algorithms",
    "deep learning frameworks",
    "neural network architectures"
  ],
  "lang": "en"
}
```

### 3. presearch_suggestions

Get search suggestions and autocomplete for a query.

**Parameters:**
- `q` (string, required): Partial search query
- `limit` (number, optional): Maximum suggestions (default: 10, max: 20)
- `lang` (string, optional): Language code

**Example:**
```json
{
  "q": "climate chang",
  "limit": 10,
  "lang": "en"
}
```

### 4. presearch_search_analytics

Get analytics and insights about search patterns.

**Parameters:**
- `q` (string, required): Search query to analyze
- `analyze_trends` (boolean, optional): Include trend analysis (default: false)
- `include_related` (boolean, optional): Include related queries (default: true)

**Example:**
```json
{
  "q": "renewable energy",
  "analyze_trends": true,
  "include_related": true
}
```

### 5. presearch_domain_search

Search within a specific domain or website.

**Parameters:**
- `q` (string, required): Search query
- `domain` (string, required): Domain to search within (e.g., 'wikipedia.org')
- `page` (number, optional): Page number (default: 1)
- `lang` (string, optional): Language code

**Example:**
```json
{
  "q": "quantum computing",
  "domain": "wikipedia.org",
  "page": 1
}
```

### 6. presearch_filtered_search

Advanced search with content type and quality filtering.

**Parameters:**
- `q` (string, required): Search query
- `contentType` (string, required): Content type ('web', 'news', 'images', 'videos', 'academic')
- `page` (number, optional): Page number (default: 1)
- `lang` (string, optional): Language code

**Example:**
```json
{
  "q": "latest AI research",
  "contentType": "academic",
  "page": 1
}
```

### 7. presearch_cache_stats

Get cache statistics and performance metrics.

**Parameters:** None

**Example:**
```json
{}
```

### 8. presearch_cache_clear

Clear the search results cache.

**Parameters:**
- `pattern` (string, optional): Pattern to match cache keys for selective clearing

**Example:**
```json
{
  "pattern": "search_.*"
}
```

## Integration with MCP Clients

### Claude Desktop

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "presearch": {
      "command": "node",
      "args": ["/path/to/presearch-mcp-server/dist/index.js"],
      "env": {
        "PRESEARCH_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### Other MCP Clients

The server implements the standard MCP protocol and should work with any compatible client. Ensure the client can:

1. Execute Node.js processes
2. Pass environment variables
3. Handle JSON-RPC 2.0 communication over stdio

## Development

### Project Structure

```
src/
├── api/                 # API client implementation
├── cache/              # Cache management
├── config/             # Configuration management
├── server/             # MCP server implementation
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── index.ts            # Entry point
```

### Scripts

- `npm run build` - Build the TypeScript project
- `npm run clean` - Clean the dist directory
- `npm start` - Start the MCP server
- `npm run dev` - Development mode with auto-reload

### Testing

The server includes comprehensive error handling and can run in mock mode for testing:

```bash
PRESEARCH_MOCK_MODE=true npm start
```

## Troubleshooting

### Common Issues

1. **"API key is required" error**
   - Ensure `PRESEARCH_API_KEY` is set in your environment
   - Verify the API key is valid and active

2. **Connection timeout errors**
   - Check your internet connection
   - Increase `PRESEARCH_TIMEOUT` value
   - Verify the Presearch API is accessible

3. **Rate limit exceeded**
   - Reduce request frequency
   - Adjust `PRESEARCH_RATE_LIMIT` settings
   - Enable caching to reduce API calls

4. **Cache issues**
   - Clear cache using `presearch_cache_clear` tool
   - Adjust `PRESEARCH_CACHE_TTL` settings
   - Disable cache temporarily with `PRESEARCH_ENABLE_CACHE=false`

### Debug Mode

Enable debug logging for detailed information:

```bash
PRESEARCH_LOG_LEVEL=debug npm start
```

### Mock Mode

For testing without API calls:

```bash
PRESEARCH_MOCK_MODE=true npm start
```

## Performance Optimization

### Caching Strategy

- Enable caching for frequently accessed queries
- Adjust TTL based on content freshness requirements
- Monitor cache hit rates using `presearch_cache_stats`

### Rate Limiting

- Configure appropriate rate limits for your API quota
- Use longer time windows for better burst handling
- Monitor rate limit status in cache stats

### Error Handling

- The server automatically retries failed requests
- Implements exponential backoff for rate limits
- Falls back to mock data when API is unavailable

## Security Considerations

- Store API keys securely using environment variables
- Never commit API keys to version control
- Use HTTPS for all API communications
- Implement proper input validation and sanitization
- Monitor for unusual usage patterns

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:

1. Check the troubleshooting section
2. Search existing GitHub issues
3. Create a new issue with detailed information
4. Join the Presearch community discussions

## Changelog

### Version 2.0.0

- Complete rewrite with TypeScript
- Added 8 comprehensive search tools
- Implemented robust error handling and retry logic
- Added intelligent caching with TTL support
- Implemented rate limiting
- Added comprehensive logging
- Added mock mode for testing
- Updated to latest MCP SDK
- Improved documentation and examples

---

**Built with ❤️ for the Presearch community**