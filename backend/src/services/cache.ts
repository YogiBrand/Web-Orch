import Redis from 'ioredis';
import NodeCache from 'node-cache';
import winston from 'winston';
import { createHash } from 'crypto';
import { 
  TaskRun, 
  TaskStep, 
  LogEvent,
  RedisConfig,
  AppError
} from '../types';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'cache.log' })
  ]
});

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  access_count: number;
  last_accessed: number;
}

interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  memory_usage_mb: number;
}

export class CacheService {
  private redis: Redis | null = null;
  private localCache: NodeCache;
  private isRedisConnected: boolean = false;
  private metrics: CacheMetrics;
  private config: RedisConfig;
  private readonly localCacheTTL = 300; // 5 minutes for local cache
  private readonly redisTTL = 3600; // 1 hour for Redis cache

  constructor(config: RedisConfig) {
    this.config = config;
    this.localCache = new NodeCache({
      stdTTL: this.localCacheTTL,
      checkperiod: 60, // Check for expired keys every 60 seconds
      useClones: false, // Better performance, but be careful with object mutations
      deleteOnExpire: true
    });

    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      memory_usage_mb: 0
    };

    // Setup local cache event listeners
    this.localCache.on('set', (key) => {
      this.metrics.sets++;
      logger.debug('Local cache set', { key });
    });

    this.localCache.on('del', (key) => {
      this.metrics.deletes++;
      logger.debug('Local cache delete', { key });
    });

    this.localCache.on('expired', (key) => {
      this.metrics.evictions++;
      logger.debug('Local cache expiry', { key });
    });
  }

  async initialize(): Promise<void> {
    try {
      // Initialize Redis connection
      if (this.config.host && this.config.port) {
        this.redis = new Redis({
          host: this.config.host,
          port: this.config.port,
          password: this.config.password,
          db: this.config.db || 0,
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
          lazyConnect: true,
          connectTimeout: 10000,
          commandTimeout: 5000
        });

        this.redis.on('connect', () => {
          this.isRedisConnected = true;
          logger.info('Redis cache connected successfully');
        });

        this.redis.on('error', (error) => {
          this.isRedisConnected = false;
          logger.warn('Redis cache error (falling back to local cache):', error.message);
        });

        this.redis.on('close', () => {
          this.isRedisConnected = false;
          logger.warn('Redis cache connection closed');
        });

        // Test Redis connection
        await this.redis.connect();
        await this.redis.ping();
      }

      logger.info('Cache service initialized successfully');
    } catch (error) {
      logger.warn('Redis initialization failed, using local cache only:', error);
      // Continue with local cache only
    }
  }

  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }
    this.localCache.close();
    logger.info('Cache service closed');
  }

  async healthCheck(): Promise<{ 
    status: string; 
    redis_connected: boolean; 
    local_cache_keys: number;
    redis_latency_ms?: number;
  }> {
    const localKeys = this.localCache.keys().length;
    let redisLatency: number | undefined;
    
    if (this.redis && this.isRedisConnected) {
      try {
        const start = Date.now();
        await this.redis.ping();
        redisLatency = Date.now() - start;
      } catch (error) {
        this.isRedisConnected = false;
      }
    }

    return {
      status: 'healthy',
      redis_connected: this.isRedisConnected,
      local_cache_keys: localKeys,
      redis_latency_ms: redisLatency
    };
  }

  // Task cache operations
  async generateTaskCacheKey(params: {
    tool: string;
    action_sequence: string[];
    normalized_params: Record<string, any>;
  }): Promise<string> {
    const keyData = {
      tool: params.tool,
      actions: params.action_sequence.sort(), // Sort for consistency
      params: this.normalizeParams(params.normalized_params)
    };
    
    const hash = createHash('sha256')
      .update(JSON.stringify(keyData))
      .digest('hex');
    
    return `task:${params.tool}:${hash.substring(0, 16)}`;
  }

  async checkTaskCache(cacheKey: string): Promise<{
    hit: boolean;
    result?: any;
    metadata?: {
      cached_at: string;
      success_rate: number;
      avg_duration_ms: number;
      use_count: number;
    };
  }> {
    try {
      // Try local cache first (fastest)
      const localResult = this.localCache.get(cacheKey);
      if (localResult) {
        this.metrics.hits++;
        logger.debug('Task cache hit (local)', { cache_key: cacheKey });
        return {
          hit: true,
          result: (localResult as CacheEntry<any>).data,
          metadata: {
            cached_at: new Date((localResult as CacheEntry<any>).timestamp).toISOString(),
            success_rate: 1.0, // Local cache only stores successful results
            avg_duration_ms: 0,
            use_count: (localResult as CacheEntry<any>).access_count
          }
        };
      }

      // Try Redis cache if available
      if (this.redis && this.isRedisConnected) {
        const redisResult = await this.redis.get(cacheKey);
        if (redisResult) {
          const cacheEntry: CacheEntry<any> = JSON.parse(redisResult);
          this.metrics.hits++;
          
          // Store in local cache for faster future access
          this.localCache.set(cacheKey, cacheEntry, this.localCacheTTL);
          
          logger.debug('Task cache hit (Redis)', { cache_key: cacheKey });
          return {
            hit: true,
            result: cacheEntry.data,
            metadata: {
              cached_at: new Date(cacheEntry.timestamp).toISOString(),
              success_rate: 1.0,
              avg_duration_ms: 0,
              use_count: cacheEntry.access_count
            }
          };
        }
      }

      // Cache miss
      this.metrics.misses++;
      logger.debug('Task cache miss', { cache_key: cacheKey });
      return { hit: false };
    } catch (error) {
      logger.error('Cache check error:', error);
      this.metrics.misses++;
      return { hit: false };
    }
  }

  async setTaskCache(
    cacheKey: string, 
    result: any, 
    metadata: {
      tool: string;
      duration_ms: number;
      success: boolean;
    }
  ): Promise<void> {
    try {
      const cacheEntry: CacheEntry<any> = {
        data: result,
        timestamp: Date.now(),
        ttl: this.redisTTL,
        access_count: 1,
        last_accessed: Date.now()
      };

      // Only cache successful results
      if (!metadata.success) {
        return;
      }

      // Store in local cache
      this.localCache.set(cacheKey, cacheEntry, this.localCacheTTL);
      
      // Store in Redis if available
      if (this.redis && this.isRedisConnected) {
        await this.redis.setex(
          cacheKey, 
          this.redisTTL, 
          JSON.stringify(cacheEntry)
        );
      }

      this.metrics.sets++;
      logger.debug('Task cache set', { 
        cache_key: cacheKey, 
        tool: metadata.tool,
        duration_ms: metadata.duration_ms
      });
    } catch (error) {
      logger.error('Cache set error:', error);
    }
  }

  // Summary cache operations
  async cacheSummary(runId: string, summary: any, costUsd: number): Promise<void> {
    const cacheKey = `summary:${runId}`;
    const cacheEntry = {
      summary,
      cost_usd: costUsd,
      cached_at: Date.now()
    };

    try {
      // Store in both local and Redis cache
      this.localCache.set(cacheKey, cacheEntry, this.localCacheTTL * 4); // Longer TTL for summaries
      
      if (this.redis && this.isRedisConnected) {
        await this.redis.setex(
          cacheKey, 
          this.redisTTL * 6, // 6 hours for summaries
          JSON.stringify(cacheEntry)
        );
      }

      logger.debug('Summary cached', { run_id: runId, cost_usd: costUsd });
    } catch (error) {
      logger.error('Summary cache error:', error);
    }
  }

  async getCachedSummary(runId: string): Promise<{
    summary?: any;
    cost_usd?: number;
    cached_at?: number;
  } | null> {
    const cacheKey = `summary:${runId}`;
    
    try {
      // Try local cache first
      const localResult = this.localCache.get(cacheKey);
      if (localResult) {
        this.metrics.hits++;
        return localResult as any;
      }

      // Try Redis cache
      if (this.redis && this.isRedisConnected) {
        const redisResult = await this.redis.get(cacheKey);
        if (redisResult) {
          const cacheEntry = JSON.parse(redisResult);
          this.metrics.hits++;
          
          // Store in local cache
          this.localCache.set(cacheKey, cacheEntry);
          
          return cacheEntry;
        }
      }

      this.metrics.misses++;
      return null;
    } catch (error) {
      logger.error('Summary cache retrieval error:', error);
      this.metrics.misses++;
      return null;
    }
  }

  // Log query cache operations
  async cacheLogQuery(
    queryHash: string, 
    results: LogEvent[], 
    queryParams: any
  ): Promise<void> {
    const cacheKey = `logs:${queryHash}`;
    const cacheEntry = {
      results,
      params: queryParams,
      cached_at: Date.now(),
      result_count: results.length
    };

    try {
      // Shorter TTL for log queries (they change frequently)
      this.localCache.set(cacheKey, cacheEntry, 120); // 2 minutes
      
      if (this.redis && this.isRedisConnected) {
        await this.redis.setex(
          cacheKey, 
          300, // 5 minutes in Redis
          JSON.stringify(cacheEntry)
        );
      }
    } catch (error) {
      logger.error('Log query cache error:', error);
    }
  }

  async getCachedLogQuery(queryHash: string): Promise<{
    results: LogEvent[];
    params: any;
    cached_at: number;
    result_count: number;
  } | null> {
    const cacheKey = `logs:${queryHash}`;
    
    try {
      // Try local cache first
      const localResult = this.localCache.get(cacheKey);
      if (localResult) {
        this.metrics.hits++;
        return localResult as any;
      }

      // Try Redis cache
      if (this.redis && this.isRedisConnected) {
        const redisResult = await this.redis.get(cacheKey);
        if (redisResult) {
          const cacheEntry = JSON.parse(redisResult);
          this.metrics.hits++;
          
          // Store in local cache
          this.localCache.set(cacheKey, cacheEntry);
          
          return cacheEntry;
        }
      }

      this.metrics.misses++;
      return null;
    } catch (error) {
      logger.error('Log query cache retrieval error:', error);
      this.metrics.misses++;
      return null;
    }
  }

  // Analytics cache operations
  async cacheAnalytics(key: string, data: any, ttlSeconds = 300): Promise<void> {
    const cacheKey = `analytics:${key}`;
    
    try {
      this.localCache.set(cacheKey, data, ttlSeconds);
      
      if (this.redis && this.isRedisConnected) {
        await this.redis.setex(cacheKey, ttlSeconds, JSON.stringify(data));
      }
    } catch (error) {
      logger.error('Analytics cache error:', error);
    }
  }

  async getCachedAnalytics(key: string): Promise<any | null> {
    const cacheKey = `analytics:${key}`;
    
    try {
      // Try local cache first
      const localResult = this.localCache.get(cacheKey);
      if (localResult) {
        this.metrics.hits++;
        return localResult;
      }

      // Try Redis cache
      if (this.redis && this.isRedisConnected) {
        const redisResult = await this.redis.get(cacheKey);
        if (redisResult) {
          const data = JSON.parse(redisResult);
          this.metrics.hits++;
          
          // Store in local cache
          this.localCache.set(cacheKey, data);
          
          return data;
        }
      }

      this.metrics.misses++;
      return null;
    } catch (error) {
      logger.error('Analytics cache retrieval error:', error);
      this.metrics.misses++;
      return null;
    }
  }

  // Cache management operations
  async invalidatePattern(pattern: string): Promise<number> {
    let deletedCount = 0;
    
    try {
      // Invalidate local cache
      const localKeys = this.localCache.keys();
      for (const key of localKeys) {
        if (key.includes(pattern)) {
          this.localCache.del(key);
          deletedCount++;
        }
      }

      // Invalidate Redis cache
      if (this.redis && this.isRedisConnected) {
        const redisKeys = await this.redis.keys(`*${pattern}*`);
        if (redisKeys.length > 0) {
          const pipeline = this.redis.pipeline();
          redisKeys.forEach(key => pipeline.del(key));
          await pipeline.exec();
          deletedCount += redisKeys.length;
        }
      }

      logger.info(`Invalidated cache pattern: ${pattern}`, { deleted_count: deletedCount });
      return deletedCount;
    } catch (error) {
      logger.error('Cache invalidation error:', error);
      return deletedCount;
    }
  }

  async clearAll(): Promise<void> {
    try {
      this.localCache.flushAll();
      
      if (this.redis && this.isRedisConnected) {
        await this.redis.flushdb();
      }
      
      // Reset metrics
      this.metrics = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        evictions: 0,
        memory_usage_mb: 0
      };
      
      logger.info('Cache cleared completely');
    } catch (error) {
      logger.error('Cache clear error:', error);
    }
  }

  // Utility methods
  private normalizeParams(params: Record<string, any>): Record<string, any> {
    // Sort object keys and handle nested objects consistently
    const normalized: Record<string, any> = {};
    
    const sortedKeys = Object.keys(params).sort();
    for (const key of sortedKeys) {
      const value = params[key];
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        normalized[key] = this.normalizeParams(value);
      } else if (Array.isArray(value)) {
        normalized[key] = value.slice().sort();
      } else {
        normalized[key] = value;
      }
    }
    
    return normalized;
  }

  generateQueryHash(query: string, params: any): string {
    const queryData = {
      query: query.trim(),
      params: this.normalizeParams(params)
    };
    
    return createHash('md5')
      .update(JSON.stringify(queryData))
      .digest('hex');
  }

  // Metrics and statistics
  getMetrics(): CacheMetrics & {
    hit_rate: number;
    miss_rate: number;
    total_operations: number;
  } {
    const totalOps = this.metrics.hits + this.metrics.misses;
    return {
      ...this.metrics,
      memory_usage_mb: this.getMemoryUsage(),
      hit_rate: totalOps > 0 ? this.metrics.hits / totalOps : 0,
      miss_rate: totalOps > 0 ? this.metrics.misses / totalOps : 0,
      total_operations: totalOps
    };
  }

  private getMemoryUsage(): number {
    try {
      const used = process.memoryUsage();
      return Math.round(used.heapUsed / 1024 / 1024 * 100) / 100;
    } catch {
      return 0;
    }
  }

  async getRedisInfo(): Promise<Record<string, any>> {
    if (!this.redis || !this.isRedisConnected) {
      return {};
    }

    try {
      const info = await this.redis.info('memory');
      const lines = info.split('\n');
      const result: Record<string, any> = {};
      
      for (const line of lines) {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          result[key.trim()] = value.trim();
        }
      }
      
      return result;
    } catch (error) {
      logger.error('Redis info error:', error);
      return {};
    }
  }

  // Public getters
  get isConnected(): boolean {
    return this.isRedisConnected;
  }

  get localCacheSize(): number {
    return this.localCache.keys().length;
  }
}

export default CacheService;