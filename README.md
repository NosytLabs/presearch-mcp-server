<div align="center">

# 🔍 Presearch MCP Server

<img src="https://raw.githubusercontent.com/PresearchOfficial/presearch-brand-assets/main/logos/presearch-logo-horizontal-color.svg" alt="Presearch Logo" width="300">

**A powerful Model Context Protocol (MCP) server for decentralized web search**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue.svg)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-purple.svg)](https://modelcontextprotocol.io/)

</div>

## ✨ Features

- 🌐 **Decentralized Search**: Powered by Presearch's decentralized search network
- 🔧 **MCP Integration**: Seamless integration with Model Context Protocol clients
- 🌍 **Geo-targeting**: Location-based and IP-based search results
- 🕒 **Time Filtering**: Search results filtered by time periods
- 🔒 **Safe Search**: Configurable safe search settings
- 🌏 **Multi-language**: Support for multiple languages
- 📄 **Pagination**: Navigate through search result pages

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Presearch API key ([Get yours here](https://presearch.com/api))

### Installation

```bash
# Clone the repository
git clone https://github.com/NosytLabs/presearch-mcp.git
cd presearch-mcp

# Install dependencies
npm install

# Build the project
npm run build
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root:

```bash
# Required: Your Presearch API key
PRESEARCH_API_KEY=your_presearch_api_key_here

# Optional: Custom API endpoint (defaults to official Presearch API)
PRESEARCH_BASE_URL=https://api.presearch.org/v1
```

### Getting Your API Key

1. Visit [Presearch API Portal](https://presearch.com/api)
2. Sign up or log in to your Presearch account
3. Generate your API key
4. Add it to your `.env` file

> **Note**: Keep your API key secure and never commit it to version control!

## 🎯 Usage

### Starting the Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

The server runs on stdio and integrates with MCP-compatible clients like:
- Claude Desktop
- Continue.dev
- Other MCP clients

### MCP Client Configuration

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "presearch": {
      "command": "node",
      "args": ["/path/to/presearch-mcp/dist/index.js"]
    }
  }
}
```

## 🔧 API Reference

### `presearch_search`

Performs web search using Presearch's decentralized search network.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | ✅ | Search query string |
| `page` | number | ❌ | Page number for pagination (default: 1) |
| `lang` | string | ❌ | Language code (e.g., "en", "es", "fr") |
| `time` | string | ❌ | Time filter: "any", "day", "week", "month", "year" |
| `safe` | string | ❌ | Safe search: "0" (off) or "1" (on) |
| `location` | string | ❌ | Location for localized results (e.g., "New York", "London") |
| `ip` | string | ❌ | IP address for geo-targeting (e.g., "8.8.8.8") |

#### Geo-targeting Notes

- **IP Parameter**: <mcreference link="https://docs.presearch.io/nodes/api" index="1">Neither IP nor location parameters are strictly required by the Presearch API</mcreference>
- **Default Behavior**: When no IP or location is specified, Presearch uses the server's IP for geo-targeting
- **Custom IP**: You can specify any valid IPv4 address for targeted results
- **Location Override**: Location parameter takes precedence over IP-based geo-targeting

#### Example Usage

```javascript
// Basic search
{
  "query": "artificial intelligence"
}

// Advanced search with geo-targeting
{
  "query": "best restaurants",
  "location": "San Francisco",
  "time": "week",
  "safe": "1",
  "lang": "en"
}

// IP-based geo-targeting
{
  "query": "weather forecast",
  "ip": "8.8.8.8",
  "time": "day"
}
```

#### Example Response

```json
{
  "standardResults": [
    {
      "title": "Artificial Intelligence - Wikipedia",
      "link": "https://en.wikipedia.org/wiki/Artificial_intelligence",
      "description": "Artificial intelligence (AI) is intelligence demonstrated by machines..."
    },
    {
      "title": "What is AI? | IBM",
      "link": "https://www.ibm.com/topics/artificial-intelligence",
      "description": "Artificial intelligence leverages computers and machines..."
    }
  ],
  "query": "artificial intelligence",
  "totalResults": 2,
  "page": 1
}
```

## 🛠️ Development

### Project Structure

```
presearch-mcp/
├── src/
│   └── index.ts          # Main server implementation
├── dist/                 # Compiled JavaScript
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── .env.example          # Environment template
└── README.md            # This file
```

### Building from Source

```bash
# Install dependencies
npm install

# Development with auto-reload
npm run dev

# Build for production
npm run build

# Run tests (if available)
npm test
```

### Testing with Smithery

For development and testing, you can use the Smithery CLI:

```bash
# Install Smithery CLI globally
npm install -g @smithery/cli

# Start development server with hot reload
npx @smithery/cli dev src/index.ts

# Server will be available at http://localhost:8181
```

### Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format

# Type check
npm run type-check
```

## 🔍 Troubleshooting

### Common Issues

**❌ "PRESEARCH_API_KEY environment variable is required"**
- Ensure your `.env` file exists and contains a valid API key
- Check that the `.env` file is in the project root directory

**❌ "Search failed: Request failed with status code 401"**
- Verify your API key is correct and active
- Check if your API key has sufficient permissions

**❌ "Search failed: timeout"**
- Check your internet connection
- Presearch API might be experiencing high load

**❌ No results returned**
- Try different search queries
- Check if geo-targeting parameters are valid
- Verify the time filter isn't too restrictive

### Debug Mode

Enable debug logging by setting:

```bash
DEBUG=presearch-mcp npm start
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests if applicable
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📚 Resources

- [Presearch Official Website](https://presearch.com/)
- [Presearch API Documentation](https://docs.presearch.io/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Presearch](https://presearch.com/) for providing the decentralized search API
- [Anthropic](https://anthropic.com/) for the Model Context Protocol
- The open-source community for their valuable contributions

---

<div align="center">

**Made with ❤️ for the decentralized web**

[⭐ Star this repo](https://github.com/NosytLabs/presearch-mcp) • [🐛 Report Bug](https://github.com/NosytLabs/presearch-mcp/issues) • [💡 Request Feature](https://github.com/NosytLabs/presearch-mcp/issues)

</div>