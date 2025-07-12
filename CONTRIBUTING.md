# Contributing to Presearch MCP Server

Thank you for your interest in contributing to the Presearch MCP Server! This project is maintained by [NosyLabs](https://nosylabs.com) and we welcome contributions from the community.

## 🤝 How to Contribute

### Reporting Issues

1. Check existing issues to avoid duplicates
2. Use the issue template when creating new issues
3. Provide detailed information including:
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (Node.js version, OS, etc.)
   - Error messages or logs

### Submitting Pull Requests

1. **Fork the repository**
   ```bash
   git clone https://github.com/nosylabs/presearch-mcp-server.git
   cd presearch-mcp-server
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation as needed

4. **Test your changes**
   ```bash
   npm install
   npm run build
   npm run dev
   ```

5. **Commit your changes**
   ```bash
   git commit -m "feat: add your feature description"
   ```

6. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## 📋 Development Guidelines

### Code Style

- Use TypeScript for all new code
- Follow existing naming conventions
- Add JSDoc comments for public APIs
- Keep functions small and focused

### Commit Messages

We follow the [Conventional Commits](https://conventionalcommits.org/) specification:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

### Testing

- Write unit tests for new functionality
- Ensure all tests pass before submitting
- Test with different Presearch API scenarios

## 🛠️ Development Setup

1. **Prerequisites**
   - Node.js 18+
   - npm or yarn
   - Presearch API key

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Add your Presearch API key to .env
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Build and Run**
   ```bash
   npm run build
   npm run dev
   ```

## 🚀 Deployment Testing

### Local Testing
```bash
# Test with Docker
docker build -t presearch-mcp-test .
docker run -p 3000:3000 -e PRESEARCH_API_KEY=your_key presearch-mcp-test
```

### Smithery Testing
1. Fork the repository
2. Create a test deployment on [Smithery](https://smithery.ai)
3. Verify all tools work correctly

## 📝 Documentation

- Update README.md for user-facing changes
- Update API documentation for new tools
- Add inline code comments for complex logic
- Update CHANGELOG.md for releases

## 🔍 Code Review Process

1. All PRs require review from NosyLabs maintainers
2. Automated checks must pass (build, tests, linting)
3. Changes should be backward compatible
4. New features should include documentation

## 🎯 Areas for Contribution

- **New Features**: Additional search filters, result formatting
- **Performance**: Caching improvements, rate limiting enhancements
- **Documentation**: Examples, tutorials, API documentation
- **Testing**: Unit tests, integration tests, edge cases
- **Deployment**: Docker optimizations, CI/CD improvements

## 📞 Getting Help

- **Issues**: Use GitHub issues for bug reports and feature requests
- **Discussions**: Use GitHub discussions for questions and ideas
- **Email**: Contact NosyLabs at [contact@nosylabs.com](mailto:contact@nosylabs.com)
- **Community**: Join our community channels (links in README)

## 📄 License

By contributing to this project, you agree that your contributions will be licensed under the MIT License.

---

**Built with ❤️ by [NosyLabs](https://nosylabs.com)**