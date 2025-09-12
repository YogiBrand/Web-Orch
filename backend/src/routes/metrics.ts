import { Router, Request, Response } from 'express';
import winston from 'winston';
import DatabaseService from '../services/database';
import CacheService from '../services/cache';
import LokiService from '../services/loki';
import OpenRouterService from '../services/openrouter';
import WebSocketService from '../services/websocket';
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

// GET /metrics - Prometheus-style metrics
router.get('/', async (req: Request, res: Response) => {
  try {
    const database: DatabaseService = req.app.locals.database;
    const cacheService: CacheService = req.app.locals.cacheService;
    const lokiService: LokiService = req.app.locals.lokiService;
    const openrouterService: OpenRouterService = req.app.locals.openrouterService;
    const websocketService: WebSocketService = req.app.locals.websocketService;
    
    // Collect metrics from all services
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const uptime = process.uptime();
    
    // Get service-specific metrics
    const cacheMetrics = cacheService?.getMetrics() || {};
    const wsStats = websocketService?.getStats() || {};
    
    // Create Prometheus-style metrics
    const metrics = [];
    
    // System metrics
    metrics.push('# HELP agent_logging_uptime_seconds Server uptime in seconds');
    metrics.push('# TYPE agent_logging_uptime_seconds gauge');
    metrics.push(`agent_logging_uptime_seconds ${uptime}`);
    metrics.push('');
    
    // Memory metrics
    metrics.push('# HELP nodejs_memory_usage_bytes Node.js memory usage in bytes');
    metrics.push('# TYPE nodejs_memory_usage_bytes gauge');
    metrics.push(`nodejs_memory_usage_bytes{type="heap_used"} ${memoryUsage.heapUsed}`);
    metrics.push(`nodejs_memory_usage_bytes{type="heap_total"} ${memoryUsage.heapTotal}`);
    metrics.push(`nodejs_memory_usage_bytes{type="external"} ${memoryUsage.external}`);
    metrics.push(`nodejs_memory_usage_bytes{type="rss"} ${memoryUsage.rss}`);
    metrics.push('');
    
    // CPU metrics
    metrics.push('# HELP nodejs_cpu_usage_microseconds Node.js CPU usage in microseconds');
    metrics.push('# TYPE nodejs_cpu_usage_microseconds counter');
    metrics.push(`nodejs_cpu_usage_microseconds{type="user"} ${cpuUsage.user}`);
    metrics.push(`nodejs_cpu_usage_microseconds{type="system"} ${cpuUsage.system}`);
    metrics.push('');
    
    // Cache metrics
    if (cacheMetrics.hits !== undefined) {
      metrics.push('# HELP agent_logging_cache_operations_total Cache operations');
      metrics.push('# TYPE agent_logging_cache_operations_total counter');
      metrics.push(`agent_logging_cache_operations_total{type="hits"} ${cacheMetrics.hits}`);
      metrics.push(`agent_logging_cache_operations_total{type="misses"} ${cacheMetrics.misses}`);
      metrics.push(`agent_logging_cache_operations_total{type="sets"} ${cacheMetrics.sets}`);
      metrics.push(`agent_logging_cache_operations_total{type="deletes"} ${cacheMetrics.deletes}`);
      metrics.push('');
      
      metrics.push('# HELP agent_logging_cache_hit_rate Cache hit rate (0-1)');
      metrics.push('# TYPE agent_logging_cache_hit_rate gauge');
      metrics.push(`agent_logging_cache_hit_rate ${cacheMetrics.hit_rate || 0}`);
      metrics.push('');
    }
    
    // WebSocket metrics
    if (wsStats.total_clients !== undefined) {
      metrics.push('# HELP agent_logging_websocket_connections WebSocket connections');
      metrics.push('# TYPE agent_logging_websocket_connections gauge');
      metrics.push(`agent_logging_websocket_connections{type="total"} ${wsStats.total_clients}`);
      metrics.push(`agent_logging_websocket_connections{type="authenticated"} ${wsStats.authenticated_clients}`);
      metrics.push('');
      
      metrics.push('# HELP agent_logging_websocket_messages_total WebSocket messages sent');
      metrics.push('# TYPE agent_logging_websocket_messages_total counter');
      metrics.push(`agent_logging_websocket_messages_total ${wsStats.total_messages_sent || 0}`);
      metrics.push('');
    }
    
    // OpenRouter metrics
    if (openrouterService) {
      metrics.push('# HELP agent_logging_openrouter_requests_total OpenRouter API requests');
      metrics.push('# TYPE agent_logging_openrouter_requests_total counter');
      metrics.push(`agent_logging_openrouter_requests_total ${openrouterService.requestsCount}`);
      metrics.push('');
      
      metrics.push('# HELP agent_logging_openrouter_cost_usd_total OpenRouter costs in USD');
      metrics.push('# TYPE agent_logging_openrouter_cost_usd_total counter');
      metrics.push(`agent_logging_openrouter_cost_usd_total ${openrouterService.totalCost}`);
      metrics.push('');
    }
    
    // Service health metrics
    const healthPromises = [];
    if (database) healthPromises.push(database.healthCheck().then(h => ({ service: 'database', healthy: h.status === 'healthy' ? 1 : 0 })));
    if (cacheService) healthPromises.push(cacheService.healthCheck().then(h => ({ service: 'cache', healthy: h.status === 'healthy' ? 1 : 0 })));
    if (lokiService) healthPromises.push(lokiService.healthCheck().then(h => ({ service: 'loki', healthy: h.status === 'healthy' ? 1 : 0 })));
    if (openrouterService) healthPromises.push(openrouterService.healthCheck().then(h => ({ service: 'openrouter', healthy: h.status === 'healthy' ? 1 : 0 })));
    
    const healthResults = await Promise.allSettled(healthPromises);
    const healthMetrics = healthResults
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value as { service: string; healthy: number });
    
    if (healthMetrics.length > 0) {
      metrics.push('# HELP agent_logging_service_healthy Service health status (1=healthy, 0=unhealthy)');
      metrics.push('# TYPE agent_logging_service_healthy gauge');
      healthMetrics.forEach(({ service, healthy }) => {
        metrics.push(`agent_logging_service_healthy{service="${service}"} ${healthy}`);
      });
      metrics.push('');
    }
    
    // Custom application metrics would go here
    metrics.push('# HELP agent_logging_build_info Build information');
    metrics.push('# TYPE agent_logging_build_info gauge');
    metrics.push(`agent_logging_build_info{version="1.0.0",environment="${process.env.NODE_ENV || 'development'}"} 1`);
    
    const metricsText = metrics.join('\n');
    
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metricsText);
    
    logger.debug('Metrics endpoint called', {
      metrics_count: metrics.length,
      user_agent: req.get('User-Agent')
    });
  } catch (error) {
    logger.error('Metrics endpoint error:', error);
    
    res.status(500).set('Content-Type', 'text/plain').send('# Metrics collection failed\n');
  }
});

// GET /metrics/json - JSON format metrics for dashboards
router.get('/json', async (req: Request, res: Response) => {
  try {
    const database: DatabaseService = req.app.locals.database;
    const cacheService: CacheService = req.app.locals.cacheService;
    const lokiService: LokiService = req.app.locals.lokiService;
    const openrouterService: OpenRouterService = req.app.locals.openrouterService;
    const websocketService: WebSocketService = req.app.locals.websocketService;
    
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // Collect health status
    const healthChecks = await Promise.allSettled([
      database?.healthCheck() || Promise.resolve({ status: 'not_configured' }),
      cacheService?.healthCheck() || Promise.resolve({ status: 'not_configured' }),
      lokiService?.healthCheck() || Promise.resolve({ status: 'not_configured' }),
      openrouterService?.healthCheck() || Promise.resolve({ status: 'not_configured' })
    ]);
    
    const metrics = {
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.floor(process.uptime()),
      
      system: {
        memory: {
          heap_used_mb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          heap_total_mb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          external_mb: Math.round(memoryUsage.external / 1024 / 1024),
          rss_mb: Math.round(memoryUsage.rss / 1024 / 1024)
        },
        cpu: {
          user_microseconds: cpuUsage.user,
          system_microseconds: cpuUsage.system
        },
        node_version: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid
      },
      
      services: {
        database: healthChecks[0].status === 'fulfilled' ? healthChecks[0].value : { status: 'error' },
        cache: healthChecks[1].status === 'fulfilled' ? healthChecks[1].value : { status: 'error' },
        loki: healthChecks[2].status === 'fulfilled' ? healthChecks[2].value : { status: 'error' },
        openrouter: healthChecks[3].status === 'fulfilled' ? healthChecks[3].value : { status: 'error' }
      },
      
      cache: cacheService?.getMetrics() || {},
      
      websocket: websocketService?.getStats() || {},
      
      openrouter: openrouterService ? {
        total_cost_usd: openrouterService.totalCost,
        requests_count: openrouterService.requestsCount,
        healthy: openrouterService.healthy
      } : { status: 'not_configured' },
      
      build: {
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        start_time: new Date(Date.now() - process.uptime() * 1000).toISOString()
      }
    };
    
    res.json(createApiResponse(metrics));
  } catch (error) {
    logger.error('JSON metrics endpoint error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Metrics collection failed',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;