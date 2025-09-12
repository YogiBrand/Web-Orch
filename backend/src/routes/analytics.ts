import { Router, Request, Response } from 'express';
import { query, validationResult } from 'express-validator';
import winston from 'winston';
import DatabaseService from '../services/database';
import CacheService from '../services/cache';
import AnalyticsService from '../services/analytics';
import { 
  ApiResponse, 
  AppError, 
  ValidationError 
} from '../types';

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

// Validation middleware
const validateTimeRange = [
  query('start').optional().isISO8601(),
  query('end').optional().isISO8601(),
  query('granularity').optional().isIn(['hour', 'day', 'week']),
  query('tools').optional().isString() // Comma-separated list
];

const validateFailureAnalysis = [
  query('lookback_hours').optional().isInt({ min: 1, max: 168 }), // Max 1 week
  query('min_occurrences').optional().isInt({ min: 1, max: 100 }),
  query('similarity_threshold').optional().isFloat({ min: 0.1, max: 1.0 })
];

const validateRecurringErrors = [
  query('lookback_days').optional().isInt({ min: 1, max: 30 }),
  query('min_frequency').optional().isInt({ min: 1, max: 1000 }),
  query('tools').optional().isString() // Comma-separated list
];

// Helper functions
const handleValidationErrors = (req: Request): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(`Validation failed: ${errors.array().map(e => e.msg).join(', ')}`);
  }
};

const createApiResponse = <T>(data: T, message?: string): ApiResponse<T> => {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    request_id: Math.random().toString(36).substring(2, 15)
  };
};

const parseToolsQuery = (toolsQuery?: string): string[] => {
  if (!toolsQuery) return [];
  return toolsQuery.split(',').map(tool => tool.trim()).filter(tool => tool.length > 0);
};

// GET /analytics/overview - Dashboard overview metrics
router.get('/overview', validateTimeRange, async (req: Request, res: Response) => {
  try {
    handleValidationErrors(req);
    
    const analyticsService: AnalyticsService = req.app.locals.analyticsService;
    
    // Default to last 24 hours if no time range specified
    const end = req.query.end as string || new Date().toISOString();
    const start = req.query.start as string || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const timeRange = { start, end };
    
    logger.info('Generating overview analytics', { time_range: timeRange });
    
    const analytics = await analyticsService.getOverviewAnalytics(timeRange);
    
    res.json(createApiResponse(analytics));
  } catch (error) {
    logger.error('Overview analytics failed:', error);
    
    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
    
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /analytics/failures - Failure patterns analysis
router.get('/failures', validateFailureAnalysis, async (req: Request, res: Response) => {
  try {
    handleValidationErrors(req);
    
    const analyticsService: AnalyticsService = req.app.locals.analyticsService;
    const database: DatabaseService = req.app.locals.database;
    
    const options = {
      lookback_hours: req.query.lookback_hours ? parseInt(req.query.lookback_hours as string) : 24,
      min_occurrences: req.query.min_occurrences ? parseInt(req.query.min_occurrences as string) : 3,
      similarity_threshold: req.query.similarity_threshold ? parseFloat(req.query.similarity_threshold as string) : 0.8
    };
    
    logger.info('Analyzing failure patterns', { options });
    
    // Run failure pattern detection
    const detectionResult = await analyticsService.detectFailurePatterns(options);
    
    // Get current failure patterns
    const currentPatterns = await database.getFailurePatterns(100);
    
    res.json(createApiResponse({
      detection_result: detectionResult,
      current_patterns: currentPatterns,
      analysis_options: options
    }));
  } catch (error) {
    logger.error('Failure pattern analysis failed:', error);
    
    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
    
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /analytics/performance - Performance trends
router.get('/performance', validateTimeRange, async (req: Request, res: Response) => {
  try {
    handleValidationErrors(req);
    
    const analyticsService: AnalyticsService = req.app.locals.analyticsService;
    const database: DatabaseService = req.app.locals.database;
    
    // Default to last 24 hours if no time range specified
    const end = req.query.end as string || new Date().toISOString();
    const start = req.query.start as string || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const granularity = req.query.granularity as 'hour' | 'day' | 'week' || 'hour';
    const tools = parseToolsQuery(req.query.tools as string);
    
    const options = {
      timeRange: { start, end },
      granularity,
      tools
    };
    
    logger.info('Analyzing performance trends', { options });
    
    // Get performance trends
    const trends = await analyticsService.analyzePerformanceTrends(options);
    
    // Get recent performance metrics for context
    const recentMetrics = await database.getPerformanceMetrics({
      start_date: start,
      end_date: end,
      limit: 1000
    });
    
    res.json(createApiResponse({
      trends,
      recent_metrics: recentMetrics.slice(0, 20), // Latest 20 metrics
      analysis_options: options,
      metric_count: recentMetrics.length
    }));
  } catch (error) {
    logger.error('Performance trend analysis failed:', error);
    
    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
    
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /analytics/recurring-errors - Recurring error identification
router.get('/recurring-errors', validateRecurringErrors, async (req: Request, res: Response) => {
  try {
    handleValidationErrors(req);
    
    const analyticsService: AnalyticsService = req.app.locals.analyticsService;
    
    const options = {
      lookback_days: req.query.lookback_days ? parseInt(req.query.lookback_days as string) : 7,
      min_frequency: req.query.min_frequency ? parseInt(req.query.min_frequency as string) : 5,
      tools: parseToolsQuery(req.query.tools as string)
    };
    
    logger.info('Identifying recurring errors', { options });
    
    const recurringErrors = await analyticsService.identifyRecurringErrors(options);
    
    res.json(createApiResponse({
      recurring_errors: recurringErrors,
      analysis_options: options,
      pattern_count: recurringErrors.length
    }));
  } catch (error) {
    logger.error('Recurring error identification failed:', error);
    
    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
    
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /analytics/cache-stats - Cache hit rates and statistics
router.get('/cache-stats', async (req: Request, res: Response) => {
  try {
    const database: DatabaseService = req.app.locals.database;
    const cacheService: CacheService = req.app.locals.cacheService;
    
    logger.info('Generating cache statistics');
    
    // Get database cache stats
    const dbCacheStats = await database.getCacheStats();
    
    // Get service cache stats
    const serviceCacheStats = cacheService.getMetrics();
    
    // Get Redis info if available
    const redisInfo = await cacheService.getRedisInfo();
    
    res.json(createApiResponse({
      database_cache: dbCacheStats,
      service_cache: serviceCacheStats,
      redis_info: redisInfo,
      cache_health: {
        redis_connected: cacheService.isConnected,
        local_cache_size: cacheService.localCacheSize
      }
    }));
  } catch (error) {
    logger.error('Cache stats generation failed:', error);
    
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /analytics/alerts - Current alert conditions and status
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const analyticsService: AnalyticsService = req.app.locals.analyticsService;
    
    logger.info('Checking alert conditions');
    
    // Get alert conditions
    const alertConditions = analyticsService.getAlertConditions();
    
    // Check current alert status
    const currentAlerts = await analyticsService.checkAlertConditions();
    
    const triggeredAlerts = currentAlerts.filter(alert => alert.triggered);
    
    res.json(createApiResponse({
      alert_conditions: alertConditions,
      current_alerts: currentAlerts,
      triggered_count: triggeredAlerts.length,
      last_check: new Date().toISOString()
    }));
  } catch (error) {
    logger.error('Alert check failed:', error);
    
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /analytics/summary - Quick analytics summary for dashboard
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const database: DatabaseService = req.app.locals.database;
    const cacheService: CacheService = req.app.locals.cacheService;
    const analyticsService: AnalyticsService = req.app.locals.analyticsService;
    
    // Check cache first
    const cacheKey = 'analytics_summary';
    const cached = await cacheService.getCachedAnalytics(cacheKey);
    
    if (cached) {
      logger.debug('Serving cached analytics summary');
      return res.json(cached);
    }
    
    logger.info('Generating analytics summary');
    
    // Get last 24 hours data
    const end = new Date().toISOString();
    const start = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const [overviewAnalytics, cacheStats, alertStatus] = await Promise.all([
      analyticsService.getOverviewAnalytics({ start, end }),
      database.getCacheStats(),
      analyticsService.checkAlertConditions()
    ]);
    
    const summary = {
      overview: overviewAnalytics,
      cache_performance: {
        hit_rate: cacheStats.hit_rate,
        total_entries: cacheStats.total_entries,
        active_entries: cacheStats.active_entries
      },
      alerts: {
        triggered_count: alertStatus.filter(a => a.triggered).length,
        total_conditions: alertStatus.length
      },
      generated_at: new Date().toISOString(),
      time_range: { start, end }
    };
    
    const response = createApiResponse(summary);
    
    // Cache for 5 minutes
    await cacheService.cacheAnalytics(cacheKey, response, 300);
    
    res.json(response);
  } catch (error) {
    logger.error('Analytics summary generation failed:', error);
    
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;