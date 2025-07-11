# Presearch MCP Server

A minimal Model Context Protocol (MCP) server that provides web search functionality using the Presearch API.

## Features

- **presearch_search**: Search the web using Presearch API with various filters

## Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the project:
   ```bash
   npm run build
   ```

## Configuration

Set the following environment variable:

```bash
PRESEARCH_API_KEY=your_presearch_api_key_here
```

Optionally, you can also set:

```bash
PRESEARCH_BASE_URL=https://api.presearch.org/v1
```

## Usage

Start the MCP server:

```bash
npm start
```

The server will run on stdio and can be integrated with MCP-compatible clients.

## Tool: presearch_search

Search the web using Presearch API.

### Parameters

- `query` (required): Search query string
- `page` (optional): Page number for pagination (default: 1)
- `lang` (optional): Language code (e.g., "en", "es")
- `time` (optional): Time filter ("any", "day", "week", "month", "year")
- `safe` (optional): Safe search setting ("0" or "1")
- `location` (optional): Location for localized results
- `ip` (optional): IP address for geo-targeting

### Example Response

```json
{
  "standardResults": [
    {
      "title": "Example Result",
      "link": "https://example.com",
      "description": "Example description"
    }
  ],
  "query": "search query",
  "totalResults": 1,
  "page": 1
}
```

## License

MIT
