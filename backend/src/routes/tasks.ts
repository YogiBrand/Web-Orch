import { Router, Request, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import winston from 'winston';
import DatabaseService from '../services/database';
import CacheService from '../services/cache';
import OpenRouterService from '../services/openrouter';
import { 
  ApiResponse, 
  PaginatedResponse, 
  TaskCard,
  TaskSummary,
  AppError, 
  ValidationError,
  TaskStatus 
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
const validateTaskQuery = [
  query('tool').optional().isString().isLength({ max: 50 }),
  query('status').optional().isIn(['pending', 'running', 'completed', 'failed', 'cancelled', 'timeout']),
  query('session_id').optional().isString().isLength({ max: 100 }),
  query('limit').optional().isInt({ min: 1, max: 200 }),
  query('offset').optional().isInt({ min: 0 }),
  query('start_date').optional().isISO8601(),
  query('end_date').optional().isISO8601()
];

const validateRunId = [
  param('run_id').isString().isLength({ min: 1, max: 100 })
];

const validateCacheRequest = [
  param('run_id').isString().isLength({ min: 1, max: 100 }),
  body('tool').isString().isLength({ min: 1, max: 50 }),
  body('action_sequence').isArray().isLength({ min: 1, max: 20 }),
  body('normalized_params').isObject()
];

const validateStatusUpdate = [
  param('run_id').isString().isLength({ min: 1, max: 100 }),
  body('status').isIn(['pending', 'running', 'completed', 'failed', 'cancelled', 'timeout']),
  body('result').optional().isObject(),
  body('error_details').optional().isObject(),
  body('total_duration_ms').optional().isInt({ min: 0 }),
  body('cpu_usage_percent').optional().isFloat({ min: 0, max: 100 }),
  body('memory_usage_mb').optional().isFloat({ min: 0 })
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

const createPaginatedResponse = <T>(
  data: T[], 
  total: number, 
  page: number, 
  limit: number
): PaginatedResponse<T[]> => {
  const pages = Math.ceil(total / limit);
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    pagination: {
      page,
      limit,
      total,
      pages,
      has_next: page < pages,
      has_prev: page > 1
    }
  };
};

// GET /tasks - List tasks with pagination and filters
router.get('/', validateTaskQuery, async (req: Request, res: Response) => {
  try {
    handleValidationErrors(req);
    
    const database: DatabaseService = req.app.locals.database;
    const cacheService: CacheService = req.app.locals.cacheService;
    
    const filters = {
      tool: req.query.tool as string,
      status: req.query.status as TaskStatus,
      session_id: req.query.session_id as string,
      start_date: req.query.start_date as string,
      end_date: req.query.end_date as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0
    };
    
    const page = Math.floor(filters.offset / filters.limit) + 1;
    
    // Generate cache key
    const cacheKey = `tasks_list_${JSON.stringify(filters)}`;
    const cached = await cacheService.getCachedAnalytics(cacheKey);
    
    if (cached) {
      logger.debug('Serving cached task list');
      return res.json(cached);
    }
    
    const { tasks, total } = await database.getTaskRuns(filters);
    
    const response = createPaginatedResponse(tasks, total, page, filters.limit);
    
    // Cache for 2 minutes
    await cacheService.cacheAnalytics(cacheKey, response, 120);
    
    logger.info('Retrieved task list', {
      count: tasks.length,
      total,
      filters: Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined))
    });
    
    res.json(response);
  } catch (error) {
    logger.error('Failed to get tasks:', error);
    
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

// GET /tasks/:run_id - Get specific task details
router.get('/:run_id', validateRunId, async (req: Request, res: Response) => {
  try {
    handleValidationErrors(req);
    
    const database: DatabaseService = req.app.locals.database;
    const cacheService: CacheService = req.app.locals.cacheService;
    const runId = req.params.run_id;
    
    // Try cache first
    const cacheKey = `task_details_${runId}`;
    const cached = await cacheService.getCachedAnalytics(cacheKey);
    
    if (cached) {
      logger.debug('Serving cached task details', { run_id: runId });
      return res.json(cached);
    }
    
    // Get task run
    const taskRun = await database.getTaskRun(runId);
    if (!taskRun) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
        timestamp: new Date().toISOString()
      });
    }
    
    // Get task steps
    const steps = await database.getTaskSteps(taskRun.id);
    
    const response = createApiResponse({
      task_run: taskRun,
      steps,
      step_count: steps.length
    });
    
    // Cache for 5 minutes
    await cacheService.cacheAnalytics(cacheKey, response, 300);
    
    logger.info('Retrieved task details', {
      run_id: runId,
      step_count: steps.length,
      status: taskRun.status
    });
    
    res.json(response);
  } catch (error) {
    logger.error('Failed to get task details:', error);
    
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

// GET /tasks/:run_id/summary - AI-generated task summary
router.get('/:run_id/summary', validateRunId, async (req: Request, res: Response) => {
  try {
    handleValidationErrors(req);
    
    const database: DatabaseService = req.app.locals.database;
    const openrouterService: OpenRouterService = req.app.locals.openrouterService;
    const cacheService: CacheService = req.app.locals.cacheService;
    const runId = req.params.run_id;
    const forceRefresh = req.query.force_refresh === 'true';
    
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = await cacheService.getCachedSummary(runId);
      if (cached) {
        logger.info('Serving cached summary', { run_id: runId });
        return res.json(createApiResponse({
          summary: cached.summary,
          cost_usd: cached.cost_usd,
          cached: true,
          cached_at: cached.cached_at ? new Date(cached.cached_at).toISOString() : undefined
        }));
      }
    }
    
    // Check if summary already exists in database
    const existingSummary = await database.getTaskSummary(runId);
    if (existingSummary && !forceRefresh) {
      logger.info('Serving existing summary from database', { run_id: runId });
      return res.json(createApiResponse({
        summary: existingSummary,
        cost_usd: existingSummary.generation_cost_usd,
        cached: false
      }));
    }
    
    // Get task data for summary generation
    const taskRun = await database.getTaskRun(runId);
    if (!taskRun) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
        timestamp: new Date().toISOString()
      });
    }
    
    const steps = await database.getTaskSteps(taskRun.id);
    
    // For this example, we'll create a simple log events array from steps
    // In a real implementation, you'd query actual log events from Loki
    const logEvents = steps.map(step => ({
      ts: step.created_at,
      tool: taskRun.tool,
      run_id: runId,
      session_id: taskRun.session_id,
      task_id: taskRun.task_id,
      step_id: step.step_id,
      event_type: step.status === 'failed' ? 'error' : 'info' as any,
      status: step.status,
      action: step.action,
      schema_version: '1.0',
      level: 'info' as any
    }));
    
    const errorEvents = logEvents.filter(e => e.event_type === 'error').length;
    const totalDurationMs = taskRun.total_duration_ms || 0;
    
    const summaryData = {
      task_run: taskRun,
      steps,
      log_events: logEvents,
      total_events: logEvents.length,
      error_events: errorEvents,
      total_duration_ms: totalDurationMs
    };
    
    // Generate AI summary
    const { summary, cost_usd, cached } = await openrouterService.generateTaskSummary(
      summaryData,
      forceRefresh
    );
    
    // Save to database if not cached
    let savedSummary = summary;
    if (!cached) {
      savedSummary = await database.createTaskSummary(summary);
      
      // Cache the result
      await cacheService.cacheSummary(runId, savedSummary, cost_usd);
    }
    
    logger.info('Generated task summary', {
      run_id: runId,
      cost_usd: cost_usd,
      cached,
      force_refresh: forceRefresh
    });
    
    res.json(createApiResponse({
      summary: savedSummary,
      cost_usd,
      cached
    }));
  } catch (error) {
    logger.error('Failed to get task summary:', error);
    
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

// GET /tasks/:run_id/cards - Task cards for dashboard
router.get('/:run_id/cards', validateRunId, async (req: Request, res: Response) => {
  try {
    handleValidationErrors(req);
    
    const database: DatabaseService = req.app.locals.database;
    const cacheService: CacheService = req.app.locals.cacheService;
    const runId = req.params.run_id;
    const includeSteps = req.query.include_steps === 'true';
    
    // Try cache first
    const cacheKey = `task_cards_${runId}_${includeSteps}`;
    const cached = await cacheService.getCachedAnalytics(cacheKey);
    
    if (cached) {
      logger.debug('Serving cached task cards', { run_id: runId });
      return res.json(cached);
    }
    
    // Get task run
    const taskRun = await database.getTaskRun(runId);
    if (!taskRun) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
        timestamp: new Date().toISOString()
      });
    }
    
    const cards: TaskCard[] = [];
    
    // Create main task card
    cards.push({
      id: taskRun.id,
      type: 'task',
      title: taskRun.title || `${taskRun.tool} Task`,
      description: taskRun.description || `Task executed with ${taskRun.tool}`,
      status: taskRun.status,
      duration_ms: taskRun.total_duration_ms,
      timestamp: taskRun.created_at,
      metadata: {
        tool: taskRun.tool,
        cache_hit: taskRun.cache_hit,
        cpu_usage_percent: taskRun.cpu_usage_percent,
        memory_usage_mb: taskRun.memory_usage_mb
      },
      error: taskRun.error_details?.message
    });
    
    // Add step cards if requested
    if (includeSteps) {
      const steps = await database.getTaskSteps(taskRun.id);
      
      for (const step of steps) {
        cards.push({
          id: step.id,
          type: 'step',
          title: step.action,
          description: `${step.action_type} action`,
          status: step.status,
          duration_ms: step.duration_ms,
          timestamp: step.created_at,
          metadata: {
            sequence_number: step.sequence_number,
            retry_count: step.retry_count,
            browser_session_id: step.browser_session_id,
            screenshot_url: step.screenshot_url
          },
          error: step.error_details?.message
        });
      }
    }
    
    const response = createApiResponse({
      cards,
      total_cards: cards.length,
      include_steps: includeSteps
    });
    
    // Cache for 3 minutes
    await cacheService.cacheAnalytics(cacheKey, response, 180);
    
    logger.info('Generated task cards', {
      run_id: runId,
      card_count: cards.length,
      include_steps: includeSteps
    });
    
    res.json(response);
  } catch (error) {
    logger.error('Failed to get task cards:', error);
    
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

// POST /tasks/:run_id/cache - Check cache before task execution
router.post('/:run_id/cache', validateCacheRequest, async (req: Request, res: Response) => {
  try {
    handleValidationErrors(req);
    
    const cacheService: CacheService = req.app.locals.cacheService;
    const runId = req.params.run_id;
    
    const cacheParams = {
      tool: req.body.tool,
      action_sequence: req.body.action_sequence,
      normalized_params: req.body.normalized_params
    };
    
    // Generate cache key
    const cacheKey = await cacheService.generateTaskCacheKey(cacheParams);
    
    // Check cache
    const cacheResult = await cacheService.checkTaskCache(cacheKey);
    
    logger.info('Cache check performed', {
      run_id: runId,
      cache_key: cacheKey,
      hit: cacheResult.hit
    });
    
    res.json(createApiResponse({
      cache_key: cacheKey,
      hit: cacheResult.hit,
      result: cacheResult.result,
      metadata: cacheResult.metadata
    }));
  } catch (error) {
    logger.error('Cache check failed:', error);
    
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

// PUT /tasks/:run_id/status - Update task status
router.put('/:run_id/status', validateStatusUpdate, async (req: Request, res: Response) => {
  try {
    handleValidationErrors(req);
    
    const database: DatabaseService = req.app.locals.database;
    const cacheService: CacheService = req.app.locals.cacheService;
    const runId = req.params.run_id;
    
    const updates = {
      status: req.body.status,
      result: req.body.result,
      error_details: req.body.error_details,
      total_duration_ms: req.body.total_duration_ms,
      cpu_usage_percent: req.body.cpu_usage_percent,
      memory_usage_mb: req.body.memory_usage_mb,
      completed_at: req.body.status === 'completed' || req.body.status === 'failed' ? 
        new Date().toISOString() : undefined
    };
    
    // Remove undefined values
    Object.keys(updates).forEach(key => 
      updates[key] === undefined && delete updates[key]
    );
    
    const updatedTask = await database.updateTaskRun(runId, updates);
    
    // Invalidate related cache entries
    await cacheService.invalidatePattern(runId);
    
    logger.info('Task status updated', {
      run_id: runId,
      status: req.body.status,
      has_result: !!req.body.result,
      has_error: !!req.body.error_details
    });
    
    res.json(createApiResponse({
      task_run: updatedTask
    }, 'Task status updated successfully'));
  } catch (error) {
    logger.error('Task status update failed:', error);
    
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

export default router;