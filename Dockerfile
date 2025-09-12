# Agent Registry & Marketplace Dockerfile
FROM node:20-alpine

RUN apk add --no-cache curl

WORKDIR /app

# Copy package files
COPY package.json ./
COPY package-lock.json ./

# Copy shared packages
COPY ../packages/ ./packages/

# Install dependencies (clean install to ensure all packages are installed)
RUN npm ci

# Copy the application
COPY . .

# Expose port
EXPOSE 5173

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:5173/ || exit 1

# Start the agent marketplace
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]