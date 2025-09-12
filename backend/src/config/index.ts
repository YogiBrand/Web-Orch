import { config } from 'dotenv';
import { ServerConfig } from '../types';

// Load environment variables
config();

function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name] || defaultValue;
  if (!value) {
    throw new Error(`Environment variable ${name} is required but not set`);
  }
  return value;
}

function getEnvNumber(name: string, defaultValue?: number): number {
  const value = process.env[name];
  if (!value) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${name} is required but not set`);
  }
  const num = parseInt(value, 10);
  if (isNaN(num)) {
    throw new Error(`Environment variable ${name} must be a valid number`);
  }
  return num;
}

function getEnvBoolean(name: string, defaultValue: boolean = false): boolean {
  const value = process.env[name];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
}

export const serverConfig: ServerConfig = {
  port: getEnvNumber('PORT', 4000),
  host: getEnvVar('HOST', '0.0.0.0'),
  cors_origins: getEnvVar('CORS_ORIGINS', 'http://localhost:3000,http://localhost:3001').split(','),
  jwt_secret: getEnvVar('JWT_SECRET', 'dev-secret-key-change-in-production'),
  log_level: getEnvVar('LOG_LEVEL', 'info'),

  database: {
    host: getEnvVar('DB_HOST', 'postgres-logs'),
    port: getEnvNumber('DB_PORT', 5432),
    database: getEnvVar('POSTGRES_DB', 'agentlogs'),
    username: getEnvVar('POSTGRES_USER', 'agentlog'),
    password: getEnvVar('POSTGRES_PASSWORD', 'agentpass'),
    ssl: getEnvBoolean('DB_SSL', false),
    max_connections: getEnvNumber('DB_MAX_CONNECTIONS', 20),
  },

  redis: {
    host: getEnvVar('REDIS_HOST', 'redis-logs'),
    port: getEnvNumber('REDIS_PORT', 6379),
    password: process.env.REDIS_PASSWORD,
    db: getEnvNumber('REDIS_DB', 0),
    ttl: getEnvNumber('REDIS_TTL', 3600), // 1 hour
  },

  loki: {
    endpoint: getEnvVar('LOKI_URL', 'http://loki:3100'),
    username: process.env.LOKI_USERNAME,
    password: process.env.LOKI_PASSWORD,
    timeout: getEnvNumber('LOKI_TIMEOUT', 30000),
  },

  openrouter: {
    api_key: getEnvVar('OPENROUTER_API_KEY'),
    model: getEnvVar('OPENROUTER_MODEL', 'openai/gpt-4o-mini'),
    endpoint: getEnvVar('OPENROUTER_ENDPOINT', 'https://openrouter.ai/api/v1'),
    timeout: getEnvNumber('OPENROUTER_TIMEOUT', 60000),
    max_tokens: getEnvNumber('OPENROUTER_MAX_TOKENS', 4000),
  },

  deepseek: {
    endpoint: getEnvVar('DEEPSEEK_BASE_URL', 'http://localhost:11434'),
    model: getEnvVar('DEEPSEEK_MODEL', 'deepseek-r1:latest'),
    timeout: getEnvNumber('DEEPSEEK_TIMEOUT', 30000),
    max_tokens: getEnvNumber('DEEPSEEK_MAX_TOKENS', 2048),
  },

  llm: {
    default_provider: getEnvVar('LLM_PREFERRED_PROVIDER', 'deepseek') as 'openrouter' | 'deepseek',
    fallback_enabled: getEnvBoolean('LLM_FALLBACK_ENABLED', true),
  },
};

// Validate configuration
export function validateConfig(): void {
  const errors: string[] = [];

  // Required fields validation
  if (!serverConfig.openrouter.api_key || serverConfig.openrouter.api_key === 'your-openrouter-api-key-here') {
    errors.push('OPENROUTER_API_KEY is required');
  }

  if (!serverConfig.database.password || serverConfig.database.password === 'change-me') {
    console.warn('Warning: Using default database password. Change POSTGRES_PASSWORD in production.');
  }

  if (!serverConfig.jwt_secret || serverConfig.jwt_secret === 'dev-secret-key-change-in-production') {
    console.warn('Warning: Using default JWT secret. Change JWT_SECRET in production.');
  }

  // Port validation
  if (serverConfig.port < 1 || serverConfig.port > 65535) {
    errors.push('PORT must be between 1 and 65535');
  }

  // Database connection validation
  if (!serverConfig.database.host || !serverConfig.database.database) {
    errors.push('Database configuration is incomplete');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

// Export individual config sections for convenience
export const dbConfig = serverConfig.database;
export const redisConfig = serverConfig.redis;
export const lokiConfig = serverConfig.loki;
export const openrouterConfig = serverConfig.openrouter;
export const deepseekConfig = serverConfig.deepseek;
export const llmConfig = serverConfig.llm;

// Runtime configuration flags
export const isDevelopment = process.env.NODE_ENV !== 'production';
export const isProduction = process.env.NODE_ENV === 'production';
export const isTest = process.env.NODE_ENV === 'test';

// Logging configuration
export const logConfig = {
  level: serverConfig.log_level,
  format: isDevelopment ? 'combined' : 'json',
  max_file_size: '20m',
  max_files: '14d',
  date_pattern: 'YYYY-MM-DD-HH',
};

// Rate limiting configuration
export const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 1000 : 100, // requests per window
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
};

// CORS configuration
export const corsConfig = {
  origin: serverConfig.cors_origins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID', 'X-Total-Count'],
};

// WebSocket configuration
export const wsConfig = {
  port: serverConfig.port,
  path: '/ws',
  heartbeat_interval: 30000, // 30 seconds
  max_connections: isDevelopment ? 100 : 10000,
  message_buffer_size: 100,
};

// Cache configuration
export const cacheConfig = {
  default_ttl: 300, // 5 minutes
  max_keys: 10000,
  check_period: 600, // 10 minutes
  use_redis: !isDevelopment, // Use in-memory cache in dev
};

// OpenRouter model configurations
export const openrouterModels = {
  'gpt-5-nano': {
    name: 'openai/gpt-4o-mini',
    max_tokens: 4000,
    cost_per_1k_tokens: 0.0015,
    good_for: ['summarization', 'quick analysis'],
  },
  'gpt-4': {
    name: 'openai/gpt-4',
    max_tokens: 8000,
    cost_per_1k_tokens: 0.03,
    good_for: ['complex analysis', 'detailed summaries'],
  },
  'claude-3-haiku': {
    name: 'anthropic/claude-3-haiku',
    max_tokens: 4000,
    cost_per_1k_tokens: 0.0025,
    good_for: ['structured output', 'consistent formatting'],
  },
};

// Performance monitoring thresholds
export const performanceThresholds = {
  slow_query_ms: 1000,
  slow_api_response_ms: 2000,
  high_memory_usage_mb: 500,
  high_cpu_usage_percent: 80,
  max_concurrent_requests: 100,
};

// Health check configuration
export const healthCheckConfig = {
  timeout_ms: 5000,
  critical_services: ['database', 'redis', 'loki'],
  optional_services: ['openrouter'],
  check_interval_ms: 30000,
};