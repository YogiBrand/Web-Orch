# Agent Logging Backend

A comprehensive Node.js/TypeScript backend for the unified agent logging system with Loki proxy, OpenRouter AI integration, and real-time analytics.

## Features

- **🔄 Loki Integration**: Proxy endpoints for log queries with caching
- **🤖 AI Summaries**: OpenRouter GPT-5-nano integration for task summarization
- **📊 Real-time Analytics**: Failure pattern detection and performance analysis
- **⚡ WebSocket Support**: Real-time log streaming and task progress
- **🚀 High Performance**: Redis caching with intelligent cache strategies
- **🛡️ Security**: JWT authentication, rate limiting, and input validation
- **📈 Monitoring**: Prometheus metrics and comprehensive health checks

## Quick Start

1. **Setup Environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Start Services**:
   ```bash
   # Start PostgreSQL, Redis, and Loki first
   docker-compose up -d postgres redis loki
   
   # Then start the backend
   npm run dev
   ```

## API Endpoints

### Core Logging
- `GET /api/logs/query_range` - Query logs with filters
- `GET /api/logs/tail` - Real-time log streaming
- `POST /api/logs/search` - Advanced log search

### Task Management
- `GET /api/tasks` - List tasks with pagination
- `GET /api/tasks/:run_id` - Get task details
- `GET /api/tasks/:run_id/summary` - AI-generated summary
- `PUT /api/tasks/:run_id/status` - Update task status

### Analytics
- `GET /api/analytics/overview` - Dashboard metrics
- `GET /api/analytics/failures` - Failure patterns
- `GET /api/analytics/performance` - Performance trends
- `GET /api/analytics/cache-stats` - Cache statistics

### Health & Metrics
- `GET /health` - Basic health check
- `GET /health/detailed` - Comprehensive service health
- `GET /metrics` - Prometheus metrics
- `GET /metrics/json` - JSON metrics for dashboards

## Configuration

Key environment variables:

```bash
# Server
PORT=4000
JWT_SECRET=your-secret-key

# Database
POSTGRES_DB=agentlogs
POSTGRES_USER=agentlog
POSTGRES_PASSWORD=agentpass

# OpenRouter AI
OPENROUTER_API_KEY=your-api-key
OPENROUTER_MODEL=anthropic/claude-3-haiku

# Services
LOKI_URL=http://localhost:3100
REDIS_HOST=localhost
```

## Architecture

```
┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   WebSocket     │
│   Dashboard     │────│   Service       │
└─────────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│   API Gateway   │    │   Real-time     │
│   + Rate Limit  │────│   Updates       │
└─────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│            Core Services                │
├─────────────┬─────────────┬─────────────┤
│  Database   │    Cache    │   Analytics │
│  Service    │   Service   │   Service   │
└─────────────┴─────────────┴─────────────┘
         │           │           │
         ▼           ▼           ▼
┌─────────────┬─────────────┬─────────────┐
│ PostgreSQL  │    Redis    │    Loki     │
│   Database  │    Cache    │   Logs      │
└─────────────┴─────────────┴─────────────┘
```

## Development

```bash
# Development mode with hot reload
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Lint code
npm run lint

# Type check
npm run type-check
```

## Production Deployment

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Set environment variables**:
   ```bash
   export NODE_ENV=production
   export JWT_SECRET=strong-production-secret
   # ... other vars
   ```

3. **Start with PM2**:
   ```bash
   pm2 start dist/server.js --name agent-logging-backend
   ```

## Performance Features

- **Intelligent Caching**: Multi-level caching with Redis and local memory
- **Rate Limiting**: Configurable limits per endpoint and user
- **Connection Pooling**: Optimized database connections
- **Streaming**: Real-time log tail with WebSocket
- **Compression**: Gzip compression for API responses
- **Health Monitoring**: Comprehensive service health checks

## Security

- JWT authentication with role-based access
- Input validation and sanitization
- Rate limiting and DDoS protection
- Security headers via Helmet
- Request/response logging for auditing
- SQL injection prevention with parameterized queries

## Monitoring

The backend exposes Prometheus metrics at `/metrics`:

- System metrics (memory, CPU, uptime)
- Service health indicators
- Cache hit rates and performance
- WebSocket connection statistics
- OpenRouter API usage and costs

## Support

For issues and questions, check the logs at:
- `logs/access-YYYY-MM-DD.log` - Request logs
- `logs/error-YYYY-MM-DD.log` - Error logs
- Console output for real-time monitoring