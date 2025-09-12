import { Router, Request, Response } from 'express';
import winston from 'winston';
import DatabaseService from '../services/database';
import CacheService from '../services/cache';
import LokiService from '../services/loki';
import OpenRouterService from '../services/openrouter';
import WebSocketService from '../services/websocket';
import AnalyticsService from '../services/analytics';
import { ApiResponse } from '../types';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

const router = Router();

// Helper function to create API response
const createApiResponse = <T>(data: T, message?: string): ApiResponse<T> => {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    request_id: Math.random().toString(36).substring(2, 15)
  };
};

// GET /health - Basic health check
router.get('/', async (req: Request, res: Response) => {
  try {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    
    const health = {
      status: 'healthy',
      uptime_seconds: Math.floor(uptime),
      uptime_human: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
      memory: {
        used_mb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        total_mb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        external_mb: Math.round(memoryUsage.external / 1024 / 1024),
        rss_mb: Math.round(memoryUsage.rss / 1024 / 1024)
      },
      node_version: process.version,
      platform: process.platform,
      arch: process.arch
    };
    
    res.json(createApiResponse(health));
  } catch (error) {
    logger.error('Basic health check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /health/detailed - Detailed health check of all services
router.get('/detailed', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    
    // Get all services from app locals
    const database: DatabaseService = req.app.locals.database;
    const cacheService: CacheService = req.app.locals.cacheService;
    const lokiService: LokiService = req.app.locals.lokiService;
    const openrouterService: OpenRouterService = req.app.locals.openrouterService;
    const websocketService: WebSocketService = req.app.locals.websocketService;
    
    // Run health checks in parallel
    const [databaseHealth, cacheHealth, lokiHealth, openrouterHealth] = await Promise.allSettled([
      database?.healthCheck() || Promise.resolve({ status: 'not_configured', latency_ms: 0 }),
      cacheService?.healthCheck() || Promise.resolve({ status: 'not_configured', redis_connected: false, local_cache_keys: 0 }),
      lokiService?.healthCheck() || Promise.resolve({ status: 'not_configured', latency_ms: 0 }),
      openrouterService?.healthCheck() || Promise.resolve({ status: 'not_configured', latency_ms: 0 })
    ]);
    
    const totalLatency = Date.now() - startTime;
    
    // Process results
    const serviceHealth = {
      database: databaseHealth.status === 'fulfilled' ? databaseHealth.value : { status: 'error', error: databaseHealth.reason?.message },
      cache: cacheHealth.status === 'fulfilled' ? cacheHealth.value : { status: 'error', error: cacheHealth.reason?.message },
      loki: lokiHealth.status === 'fulfilled' ? lokiHealth.value : { status: 'error', error: lokiHealth.reason?.message },
      openrouter: openrouterHealth.status === 'fulfilled' ? openrouterHealth.value : { status: 'error', error: openrouterHealth.reason?.message },
      websocket: websocketService ? {
        status: 'healthy',
        stats: websocketService.getStats()
      } : { status: 'not_configured' }
    };
    
    // Determine overall health
    const unhealthyServices = Object.entries(serviceHealth)
      .filter(([, health]) => health.status !== 'healthy' && health.status !== 'not_configured')
      .map(([name]) => name);
    
    const overallStatus = unhealthyServices.length === 0 ? 'healthy' : 'degraded';
    
    const detailedHealth = {
      overall_status: overallStatus,
      check_duration_ms: totalLatency,
      services: serviceHealth,
      unhealthy_services: unhealthyServices,
      timestamp: new Date().toISOString()
    };
    
    const statusCode = overallStatus === 'healthy' ? 200 : 503;
    
    logger.info('Detailed health check completed', {
      overall_status: overallStatus,
      check_duration_ms: totalLatency,
      unhealthy_services: unhealthyServices
    });
    
    res.status(statusCode).json(createApiResponse(detailedHealth));
  } catch (error) {
    logger.error('Detailed health check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /health/database - Database-specific health check
router.get('/database', async (req: Request, res: Response) => {
  try {
    const database: DatabaseService = req.app.locals.database;
    
    if (!database) {
      return res.status(503).json({
        success: false,
        error: 'Database service not configured',
        timestamp: new Date().toISOString()
      });
    }
    
    const health = await database.healthCheck();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json(createApiResponse(health));
  } catch (error) {
    logger.error('Database health check failed:', error);
    res.status(503).json({
      success: false,
      error: 'Database health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /health/cache - Cache service health check
router.get('/cache', async (req: Request, res: Response) => {
  try {
    const cacheService: CacheService = req.app.locals.cacheService;
    
    if (!cacheService) {
      return res.status(503).json({
        success: false,
        error: 'Cache service not configured',
        timestamp: new Date().toISOString()
      });
    }
    
    const health = await cacheService.healthCheck();
    const metrics = cacheService.getMetrics();
    
    const cacheHealth = {
      ...health,
      metrics,
      redis_connected: cacheService.isConnected,
      local_cache_size: cacheService.localCacheSize
    };
    
    res.json(createApiResponse(cacheHealth));
  } catch (error) {
    logger.error('Cache health check failed:', error);
    res.status(503).json({
      success: false,
      error: 'Cache health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /health/loki - Loki service health check
router.get('/loki', async (req: Request, res: Response) => {
  try {
    const lokiService: LokiService = req.app.locals.lokiService;
    
    if (!lokiService) {
      return res.status(503).json({
        success: false,
        error: 'Loki service not configured',
        timestamp: new Date().toISOString()
      });
    }
    
    const health = await lokiService.healthCheck();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    
    const lokiHealth = {
      ...health,
      healthy: lokiService.healthy,
      last_health_check: lokiService.lastHealthCheckTime.toISOString()
    };
    
    res.status(statusCode).json(createApiResponse(lokiHealth));
  } catch (error) {
    logger.error('Loki health check failed:', error);
    res.status(503).json({
      success: false,
      error: 'Loki health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /health/openrouter - OpenRouter service health check
router.get('/openrouter', async (req: Request, res: Response) => {
  try {
    const openrouterService: OpenRouterService = req.app.locals.openrouterService;
    
    if (!openrouterService) {
      return res.status(503).json({
        success: false,
        error: 'OpenRouter service not configured',
        timestamp: new Date().toISOString()
      });
    }
    
    const health = await openrouterService.healthCheck();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    
    const openrouterHealth = {
      ...health,
      healthy: openrouterService.healthy,
      total_cost_usd: openrouterService.totalCost,
      requests_count: openrouterService.requestsCount
    };
    
    res.status(statusCode).json(createApiResponse(openrouterHealth));
  } catch (error) {
    logger.error('OpenRouter health check failed:', error);
    res.status(503).json({
      success: false,
      error: 'OpenRouter health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /health/websocket - WebSocket service health check
router.get('/websocket', async (req: Request, res: Response) => {
  try {
    const websocketService: WebSocketService = req.app.locals.websocketService;
    
    if (!websocketService) {
      return res.status(503).json({
        success: false,
        error: 'WebSocket service not configured',
        timestamp: new Date().toISOString()
      });
    }
    
    const stats = websocketService.getStats();
    
    const websocketHealth = {
      status: 'healthy',
      stats,
      uptime_ms: process.uptime() * 1000
    };
    
    res.json(createApiResponse(websocketHealth));
  } catch (error) {
    logger.error('WebSocket health check failed:', error);
    res.status(503).json({
      success: false,
      error: 'WebSocket health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /health/readiness - Kubernetes readiness probe
router.get('/readiness', async (req: Request, res: Response) => {
  try {
    const database: DatabaseService = req.app.locals.database;
    const cacheService: CacheService = req.app.locals.cacheService;
    
    // Check critical services are ready
    const readinessChecks = [];
    
    if (database) {
      readinessChecks.push(database.healthCheck().then(h => ({ service: 'database', ready: h.status === 'healthy' })));
    }
    
    if (cacheService) {
      readinessChecks.push(cacheService.healthCheck().then(h => ({ service: 'cache', ready: h.status === 'healthy' })));
    }
    
    const results = await Promise.allSettled(readinessChecks);
    const readinessStatus = results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value as { service: string; ready: boolean });
    
    const notReady = readinessStatus.filter(r => !r.ready);
    const ready = notReady.length === 0;
    
    const readiness = {
      ready,
      services: readinessStatus,
      not_ready_services: notReady.map(r => r.service)
    };
    
    const statusCode = ready ? 200 : 503;
    res.status(statusCode).json(createApiResponse(readiness));
  } catch (error) {
    logger.error('Readiness check failed:', error);
    res.status(503).json({
      success: false,
      error: 'Readiness check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /health/liveness - Kubernetes liveness probe
router.get('/liveness', async (req: Request, res: Response) => {
  try {
    // Simple liveness check - process is alive and responsive
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    
    // Check if memory usage is not excessive (over 1GB heap)
    const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
    const memoryOk = heapUsedMB < 1024;
    
    const liveness = {
      alive: true,
      uptime_seconds: Math.floor(uptime),
      memory_usage_mb: Math.round(heapUsedMB),
      memory_ok: memoryOk,
      pid: process.pid
    };
    
    const statusCode = memoryOk ? 200 : 503;
    res.status(statusCode).json(createApiResponse(liveness));
  } catch (error) {
    logger.error('Liveness check failed:', error);
    res.status(503).json({
      success: false,
      error: 'Liveness check failed',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;