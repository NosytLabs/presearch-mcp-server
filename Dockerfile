FROM node:22-slim

WORKDIR /app

# Copy application code
COPY . .

# Install dependencies if package.json exists
RUN if [ -f package.json ]; then npm ci; fi

# Build the application if build script exists
RUN if [ -f package.json ] && npm run --silent build 2>/dev/null; then echo "Build completed"; fi

# Expose port (Smithery will set PORT env var)
EXPOSE 3000

CMD ["node", "dist/index.js"]