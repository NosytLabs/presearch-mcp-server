<div align="center">

# 🔍 Presearch MCP Server

<img src="https://raw.githubusercontent.com/PresearchOfficial/presearch-brand-assets/main/logos/presearch-logo-horizontal-color.svg" alt="Presearch Logo" width="300">

**A Model Context Protocol (MCP) server for decentralized web search**

[![Built by NosyLabs](https://img.shields.io/badge/Built%20by-NosyLabs-blue)](https://nosylabs.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Deploy on Smithery](https://img.shields.io/badge/Deploy%20on-Smithery-purple)](https://smithery.ai)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue.svg)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-purple.svg)](https://modelcontextprotocol.io/)

**Built by [NosyLabs](https://nosylabs.com)** - Advancing AI through innovative tools and integrations.

</div>

## ✨ Features

- 🌐 **Decentralized Search**: Powered by Presearch's decentralized search network
- 🔧 **MCP Integration**: Seamless integration with Model Context Protocol clients
- 🌍 **Geo-targeting**: Location-based and IP-based search results
- 🕒 **Time Filtering**: Search results filtered by time periods
- 🔒 **Safe Search**: Configurable safe search settings
- 🌏 **Multi-language**: Support for multiple languages
- 📄 **Pagination**: Navigate through search result pages
- 📝 **TypeScript**: Full TypeScript support with type checking

## 🚀 Installation

### Prerequisites

- Node.js 18+ 
- Presearch API key ([Get yours here](https://presearch.com/api))

### Setup

```bash
# Clone the repository
git clone https://github.com/nosylabs/presearch-mcp-server.git
cd presearch-mcp-server

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
PRESEARCH_BASE_URL=https://na-us-1.presearch.com/v1
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

### Available Tools

#### `presearch_search`

Performs a web search using Presearch's decentralized search engine.

**Parameters:**
- `query` (string, required): The search query
- `page` (number, optional): Page number for pagination (default: 1)
- `lang` (string, optional): Language code (e.g., "en", "es", "fr")
- `time` (string, optional): Time filter: "any", "day", "week", "month", "year"
- `safe` (string, optional): Safe search: "0" (off) or "1" (on)
- `location` (string, optional): Location for localized results

**Example:**
```json
{
  "query": "artificial intelligence",
  "lang": "en",
  "time": "week"
}
```

#### `presearch_cache_stats`

Returns cache and performance statistics for monitoring.

**Parameters:** None

## 🚀 Deployment

### Deploy on Smithery (Recommended)

The easiest way to deploy this MCP server is using [Smithery](https://smithery.ai):

1. Fork this repository to your GitHub account
2. Connect your GitHub to Smithery
3. Select this repository for deployment
4. Smithery will automatically detect the `smithery.yaml` configuration
5. Deploy with one click!

### Manual Deployment

#### Using Docker

```bash
# Build the Docker image
docker build -t presearch-mcp-server .

# Run the container
docker run -p 3000:3000 -e PRESEARCH_API_KEY=your_key presearch-mcp-server
```

#### Using Node.js

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start the server
npm start
```

## 🛠️ Development

### Development Setup

```bash
# Clone and setup
git clone https://github.com/nosylabs/presearch-mcp-server.git
cd presearch-mcp-server
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API key

# Build and run
npm run build
npm run dev
```

### Available Scripts

- `npm run build` - Compile TypeScript
- `npm start` - Start the server
- `npm run dev` - Development mode

## 🔍 Troubleshooting

### Common Issues

#### Authentication Errors

**Problem**: `401 Unauthorized` or `403 Forbidden` errors

**Solutions**:
1. Verify your `PRESEARCH_API_KEY` is correct and active
2. Check for extra spaces or characters in the API key
3. Ensure your Presearch account has API access

#### Network Issues

**Problem**: Timeout or connection errors

**Solutions**:
1. Check your internet connection
2. Verify the Presearch API is accessible
3. Try with a simple test query

#### Empty Results

**Problem**: No search results returned

**Solutions**:
1. Try a different search query
2. Check if the query contains special characters
3. Verify language and location parameters

## 🔒 Security

- Store your API key in environment variables, never in code
- Add `.env` to `.gitignore` to prevent accidental commits
- Use HTTPS in production environments

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📚 Resources

- [Presearch API Documentation](https://docs.presearch.io/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [GitHub Repository](https://github.com/nosylabs/presearch-mcp-server)

## 🏢 About NosyLabs

[NosyLabs](https://nosylabs.com) is a cutting-edge technology company focused on advancing artificial intelligence through innovative tools and integrations. We specialize in:

- **AI Tool Development**: Creating powerful MCP servers and AI integrations
- **Decentralized Technologies**: Building solutions that leverage decentralized platforms
- **Open Source Contributions**: Contributing to the AI and blockchain communities
- **Custom AI Solutions**: Developing tailored AI tools for businesses and developers

### Our Mission
To democratize access to advanced AI capabilities by building open, interoperable tools that enhance the AI ecosystem.

### Connect with NosyLabs
- 🌐 Website: [nosylabs.com](https://nosylabs.com)
- 📧 Email: [contact@nosylabs.com](mailto:contact@nosylabs.com)
- 🐙 GitHub: [github.com/nosylabs](https://github.com/nosylabs)
- 🐦 Twitter: [@nosylabs](https://twitter.com/nosylabs)
- 💼 LinkedIn: [NosyLabs](https://linkedin.com/company/nosylabs)

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Presearch](https://presearch.com/) for the decentralized search API
- [Anthropic](https://anthropic.com/) for the Model Context Protocol
- [Smithery](https://smithery.ai) for providing excellent MCP server deployment platform