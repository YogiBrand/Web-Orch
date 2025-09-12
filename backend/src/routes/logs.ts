import { Router, Request, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import winston from 'winston';
import LokiService from '../services/loki';
import CacheService from '../services/cache';
import { 
  ApiResponse, 
  PaginatedResponse, 
  LogQueryRequest, 
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
const validateLogQuery = [
  query('query').optional().isString().isLength({ max: 1000 }),
  query('start').optional().isISO8601(),
  query('end').optional().isISO8601(),
  query('limit').optional().isInt({ min: 1, max: 10000 }),
  query('direction').optional().isIn(['forward', 'backward']),
  query('run_id').optional().isString().isLength({ max: 100 }),
  query('session_id').optional().isString().isLength({ max: 100 }),
  query('tool').optional().isString().isLength({ max: 50 }),
  query('status').optional().isIn(['pending', 'running', 'completed', 'failed', 'cancelled', 'timeout']),
  query('event_type').optional().isIn(['task_start', 'task_end', 'action_start', 'action_end', 'error', 'info', 'debug', 'warning', 'metric'])
];

const validateSearchQuery = [
  body('query').optional().isString().isLength({ max: 1000 }),
  body('start').optional().isISO8601(),
  body('end').optional().isISO8601(),
  body('limit').optional().isInt({ min: 1, max: 5000 }),
  body('direction').optional().isIn(['forward', 'backward']),
  body('filters').optional().isObject(),
  body('regexp').optional().isString().isLength({ max: 200 })
];

// Helper function to handle validation errors
const handleValidationErrors = (req: Request): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(`Validation failed: ${errors.array().map(e => e.msg).join(', ')}`);
  }
};

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

// GET /logs/query_range - Proxy to Loki with caching
router.get('/query_range', validateLogQuery, async (req: Request, res: Response) => {
  try {
    handleValidationErrors(req);
    
    const lokiService: LokiService = req.app.locals.lokiService;
    const cacheService: CacheService = req.app.locals.cacheService;
    
    const queryParams: LogQueryRequest = {
      query: req.query.query as string,
      start: req.query.start as string,
      end: req.query.end as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      direction: req.query.direction as 'forward' | 'backward',
      run_id: req.query.run_id as string,
      session_id: req.query.session_id as string,
      tool: req.query.tool as string,
      status: req.query.status as any,
      event_type: req.query.event_type as any
    };

    // Generate cache key
    const queryHash = cacheService.generateQueryHash(
      JSON.stringify(queryParams),
      queryParams
    );

    // Check cache first
    const cachedResult = await cacheService.getCachedLogQuery(queryHash);
    if (cachedResult) {
      logger.info('Serving cached log query', {
        query_hash: queryHash,
        result_count: cachedResult.results.length
      });
      
      return res.json(createApiResponse({
        result: cachedResult.results,
        cached: true,
        cached_at: new Date(cachedResult.cached_at).toISOString(),
        stats: {
          summary: {
            bytesTotal: 0,
            linesTotal: cachedResult.result_count,
            execTime: 0
          }
        }
      }));
    }

    // Query Loki
    const start = Date.now();
    const lokiResponse = await lokiService.queryRange(queryParams);
    const queryTime = Date.now() - start;

    // Extract log events for caching
    const logEvents = [];
    for (const result of lokiResponse.data.result) {
      for (const [timestamp, message] of result.values) {
        try {
          const logEvent = JSON.parse(message);
          logEvents.push(logEvent);
        } catch {
          // Skip invalid JSON entries
        }
      }
    }

    // Cache the results
    await cacheService.cacheLogQuery(queryHash, logEvents, queryParams);

    logger.info('Log query executed', {
      query_time_ms: queryTime,
      result_count: logEvents.length,
      cached: false
    });

    res.json(createApiResponse({
      ...lokiResponse.data,
      cached: false,
      query_time_ms: queryTime
    }));
  } catch (error) {
    logger.error('Log query failed:', error);
    
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

// GET /logs/tail - Real-time log streaming
router.get('/tail', validateLogQuery, async (req: Request, res: Response) => {
  try {
    handleValidationErrors(req);
    
    const lokiService: LokiService = req.app.locals.lokiService;
    
    const params = {
      query: req.query.query as string,
      delay_for: req.query.delay_for ? parseInt(req.query.delay_for as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      start: req.query.start as string
    };

    // Set up Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    const keepAlive = setInterval(() => {
      res.write('data: {"type":"heartbeat","timestamp":"' + new Date().toISOString() + '"}\n\n');
    }, 30000);

    logger.info('Starting log tail stream', { params });

    try {
      const tailIterator = await lokiService.tail(params);
      
      for await (const logEvents of tailIterator) {
        if (req.destroyed) {
          logger.info('Client disconnected from tail stream');
          break;
        }
        
        for (const event of logEvents) {
          const sseData = {
            type: 'log_event',
            data: event,
            timestamp: new Date().toISOString()
          };
          
          res.write(`data: ${JSON.stringify(sseData)}\n\n`);
        }
      }
    } catch (error) {
      logger.error('Tail stream error:', error);
      res.write(`data: {"type":"error","message":"Stream error: ${error.message}"}\n\n`);
    }

    clearInterval(keepAlive);
    res.end();
  } catch (error) {
    logger.error('Tail setup failed:', error);
    
    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to start tail stream',
      timestamp: new Date().toISOString()
    });
  }
});

// POST /logs/search - Advanced log search with filters
router.post('/search', validateSearchQuery, async (req: Request, res: Response) => {
  try {
    handleValidationErrors(req);
    
    const lokiService: LokiService = req.app.locals.lokiService;
    const cacheService: CacheService = req.app.locals.cacheService;
    
    const searchParams = {
      query: req.body.query,
      start: req.body.start,
      end: req.body.end,
      limit: req.body.limit || 1000,
      direction: req.body.direction || 'backward',
      regexp: req.body.regexp
    };

    // Generate cache key
    const searchHash = cacheService.generateQueryHash(
      'search',
      searchParams
    );

    // Check cache first (shorter TTL for searches)
    const cachedResult = await cacheService.getCachedLogQuery(searchHash);
    if (cachedResult && (Date.now() - cachedResult.cached_at) < 60000) { // 1 minute cache
      logger.info('Serving cached search results', {
        search_hash: searchHash,
        result_count: cachedResult.results.length
      });
      
      return res.json(createApiResponse({
        results: cachedResult.results,
        total: cachedResult.result_count,
        cached: true,
        search_params: searchParams
      }));
    }

    // Execute search
    const start = Date.now();
    const results = await lokiService.searchLogs(searchParams);
    const searchTime = Date.now() - start;

    // Cache the results
    await cacheService.cacheLogQuery(searchHash, results, searchParams);

    logger.info('Log search executed', {
      search_time_ms: searchTime,
      result_count: results.length,
      cached: false
    });

    res.json(createApiResponse({
      results,
      total: results.length,
      cached: false,
      search_time_ms: searchTime,
      search_params: searchParams
    }));
  } catch (error) {
    logger.error('Log search failed:', error);
    
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

// GET /logs/labels - Get available Loki labels
router.get('/labels', async (req: Request, res: Response) => {
  try {
    const lokiService: LokiService = req.app.locals.lokiService;
    const cacheService: CacheService = req.app.locals.cacheService;
    
    // Try cache first
    const cachedLabels = await cacheService.getCachedAnalytics('loki_labels');
    if (cachedLabels) {
      return res.json(createApiResponse({
        labels: cachedLabels,
        cached: true
      }));
    }

    const labels = await lokiService.getLabels();
    
    // Cache for 5 minutes
    await cacheService.cacheAnalytics('loki_labels', labels, 300);
    
    logger.info('Retrieved Loki labels', { count: labels.length });
    
    res.json(createApiResponse({
      labels,
      cached: false
    }));
  } catch (error) {
    logger.error('Failed to get labels:', error);
    
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve labels',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /logs/labels/:label/values - Get values for a specific label
router.get('/labels/:label/values', 
  param('label').isString().isLength({ min: 1, max: 100 }),
  async (req: Request, res: Response) => {
    try {
      handleValidationErrors(req);
      
      const lokiService: LokiService = req.app.locals.lokiService;
      const cacheService: CacheService = req.app.locals.cacheService;
      const labelName = req.params.label;
      
      // Try cache first
      const cacheKey = `label_values_${labelName}`;
      const cachedValues = await cacheService.getCachedAnalytics(cacheKey);
      if (cachedValues) {
        return res.json(createApiResponse({
          label: labelName,
          values: cachedValues,
          cached: true
        }));
      }

      const values = await lokiService.getLabelValues(labelName);
      
      // Cache for 5 minutes
      await cacheService.cacheAnalytics(cacheKey, values, 300);
      
      logger.info('Retrieved label values', { label: labelName, count: values.length });
      
      res.json(createApiResponse({
        label: labelName,
        values,
        cached: false
      }));
    } catch (error) {
      logger.error('Failed to get label values:', error);
      
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
        error: 'Failed to retrieve label values',
        timestamp: new Date().toISOString()
      });
    }
  }
);

export default router;