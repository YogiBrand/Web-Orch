import { Router, Request, Response } from 'express';
import winston from 'winston';

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
const createApiResponse = (data: any, message?: string) => {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    request_id: Math.random().toString(36).substring(2, 15)
  };
};

// GET /orchestrator/status - Get orchestrator system status
router.get('/status', async (req: Request, res: Response) => {
  try {
    const database = req.app.locals.database;
    const cacheService = req.app.locals.cacheService;
    const lokiService = req.app.locals.lokiService;
    const openrouterService = req.app.locals.openrouterService;
    const websocketService = req.app.locals.websocketService;

    // Collect system metrics
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    // Get service health checks
    const healthChecks = await Promise.allSettled([
      database?.healthCheck() || Promise.resolve({ status: 'not_configured' }),
      cacheService?.healthCheck() || Promise.resolve({ status: 'not_configured' }),
      lokiService?.healthCheck() || Promise.resolve({ status: 'not_configured' }),
      openrouterService?.healthCheck() || Promise.resolve({ status: 'not_configured' }),
    ]);

    // Get basic metrics
    const cacheMetrics = cacheService?.getMetrics() || {};
    const wsStats = websocketService?.getStats() || {};

    const status = {
      orchestrator: {
        status: 'running',
        version: '1.0.0',
        uptime_seconds: Math.floor(uptime),
        environment: process.env.NODE_ENV || 'development',
        node_version: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid
      },
      system: {
        memory: {
          heap_used_mb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          heap_total_mb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          external_mb: Math.round(memoryUsage.external / 1024 / 1024),
          rss_mb: Math.round(memoryUsage.rss / 1024 / 1024)
        },
        uptime_seconds: Math.floor(uptime)
      },
      services: {
        database: healthChecks[0].status === 'fulfilled' ? healthChecks[0].value : { status: 'error' },
        cache: healthChecks[1].status === 'fulfilled' ? healthChecks[1].value : { status: 'error' },
        loki: healthChecks[2].status === 'fulfilled' ? healthChecks[2].value : { status: 'error' },
        openrouter: healthChecks[3].status === 'fulfilled' ? healthChecks[3].value : { status: 'error' }
      },
      metrics: {
        cache: cacheMetrics,
        websocket: wsStats
      },
      agents: {
        total_available: 158,
        active_sessions: 0, // TODO: Implement actual session tracking
        queue_size: 0, // TODO: Implement actual queue tracking
        status: 'ready'
      }
    };

    // Determine overall health
    const unhealthyServices = Object.entries(status.services)
      .filter(([, health]) => (health as any).status !== 'healthy' && (health as any).status !== 'not_configured')
      .map(([name]) => name);

    const overallStatus = unhealthyServices.length === 0 ? 'healthy' : 'degraded';
    status.orchestrator.status = overallStatus;

    logger.info('Orchestrator status requested', {
      overall_status: overallStatus,
      unhealthy_services: unhealthyServices,
      user_agent: req.get('User-Agent')
    });

    res.json(createApiResponse(status, 'Orchestrator status retrieved successfully'));
  } catch (error: any) {
    logger.error('Failed to get orchestrator status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system status',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;