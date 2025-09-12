import { Pool, PoolClient, QueryResult } from 'pg';
import winston from 'winston';
import { 
  TaskRun, 
  TaskStep, 
  TaskSummary, 
  TaskCache, 
  FailurePattern, 
  PerformanceMetric, 
  LogEvent, 
  TaskStatus, 
  EventType,
  DatabaseConfig,
  AppError,
  NotFoundError
} from '../types';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'database.log' })
  ]
});

export class DatabaseService {
  private pool: Pool;
  private isConnected: boolean = false;

  constructor(config: DatabaseConfig) {
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl,
      max: config.max_connections || 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    this.pool.on('error', (err) => {
      logger.error('Database pool error:', err);
      this.isConnected = false;
    });

    this.pool.on('connect', () => {
      logger.info('Database connection established');
      this.isConnected = true;
    });
  }

  async initialize(): Promise<void> {
    try {
      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      this.isConnected = true;
      logger.info('Database service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database service:', error);
      throw new AppError('Database connection failed', 500);
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
    this.isConnected = false;
    logger.info('Database connection pool closed');
  }

  async healthCheck(): Promise<{ status: string; latency_ms: number }> {
    const start = Date.now();
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      const latency_ms = Date.now() - start;
      return { status: 'healthy', latency_ms };
    } catch (error) {
      logger.error('Database health check failed:', error);
      return { status: 'unhealthy', latency_ms: Date.now() - start };
    }
  }

  // Transaction wrapper
  async withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Task Run Operations
  async createTaskRun(taskRun: Omit<TaskRun, 'id' | 'created_at' | 'updated_at'>): Promise<TaskRun> {
    const query = `
      INSERT INTO task_runs (
        run_id, session_id, task_id, tool, status, title, description,
        config, metadata, cache_key, cache_hit
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    
    const values = [
      taskRun.run_id, taskRun.session_id, taskRun.task_id, taskRun.tool,
      taskRun.status, taskRun.title, taskRun.description,
      JSON.stringify(taskRun.config), JSON.stringify(taskRun.metadata),
      taskRun.cache_key, taskRun.cache_hit
    ];

    try {
      const result = await this.pool.query(query, values);
      logger.info(`Created task run: ${taskRun.run_id}`);
      return this.mapTaskRunRow(result.rows[0]);
    } catch (error) {
      logger.error('Error creating task run:', error);
      throw new AppError('Failed to create task run', 500);
    }
  }

  async getTaskRun(runId: string): Promise<TaskRun | null> {
    const query = 'SELECT * FROM task_runs WHERE run_id = $1';
    try {
      const result = await this.pool.query(query, [runId]);
      return result.rows.length > 0 ? this.mapTaskRunRow(result.rows[0]) : null;
    } catch (error) {
      logger.error(`Error getting task run ${runId}:`, error);
      throw new AppError('Failed to get task run', 500);
    }
  }

  async updateTaskRun(runId: string, updates: Partial<TaskRun>): Promise<TaskRun> {
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'run_id' && key !== 'created_at') {
        if (key === 'config' || key === 'metadata' || key === 'result' || key === 'error_details') {
          setClause.push(`${key} = $${paramIndex}`);
          values.push(JSON.stringify(value));
        } else {
          setClause.push(`${key} = $${paramIndex}`);
          values.push(value);
        }
        paramIndex++;
      }
    });

    if (setClause.length === 0) {
      throw new AppError('No valid fields to update', 400);
    }

    setClause.push('updated_at = NOW()');
    values.push(runId);

    const query = `
      UPDATE task_runs 
      SET ${setClause.join(', ')}
      WHERE run_id = $${paramIndex}
      RETURNING *
    `;

    try {
      const result = await this.pool.query(query, values);
      if (result.rows.length === 0) {
        throw new NotFoundError(`Task run not found: ${runId}`);
      }
      logger.info(`Updated task run: ${runId}`);
      return this.mapTaskRunRow(result.rows[0]);
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      logger.error(`Error updating task run ${runId}:`, error);
      throw new AppError('Failed to update task run', 500);
    }
  }

  async getTaskRuns(filters: {
    tool?: string;
    status?: TaskStatus;
    session_id?: string;
    limit?: number;
    offset?: number;
    start_date?: string;
    end_date?: string;
  } = {}): Promise<{ tasks: TaskRun[]; total: number }> {
    const conditions = [];
    const values = [];
    let paramIndex = 1;

    if (filters.tool) {
      conditions.push(`tool = $${paramIndex}`);
      values.push(filters.tool);
      paramIndex++;
    }

    if (filters.status) {
      conditions.push(`status = $${paramIndex}`);
      values.push(filters.status);
      paramIndex++;
    }

    if (filters.session_id) {
      conditions.push(`session_id = $${paramIndex}`);
      values.push(filters.session_id);
      paramIndex++;
    }

    if (filters.start_date) {
      conditions.push(`created_at >= $${paramIndex}`);
      values.push(filters.start_date);
      paramIndex++;
    }

    if (filters.end_date) {
      conditions.push(`created_at <= $${paramIndex}`);
      values.push(filters.end_date);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Get total count
    const countQuery = `SELECT COUNT(*) FROM task_runs ${whereClause}`;
    const countResult = await this.pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    
    const dataQuery = `
      SELECT * FROM task_runs 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    values.push(limit, offset);
    
    try {
      const result = await this.pool.query(dataQuery, values);
      const tasks = result.rows.map(row => this.mapTaskRunRow(row));
      return { tasks, total };
    } catch (error) {
      logger.error('Error getting task runs:', error);
      throw new AppError('Failed to get task runs', 500);
    }
  }

  // Task Steps Operations
  async createTaskStep(taskStep: Omit<TaskStep, 'id' | 'created_at'>): Promise<TaskStep> {
    const query = `
      INSERT INTO task_steps (
        task_run_id, step_id, sequence_number, action_type, action, status,
        input_data, output_data, error_details, retry_count, browser_session_id, screenshot_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    
    const values = [
      taskStep.task_run_id, taskStep.step_id, taskStep.sequence_number,
      taskStep.action_type, taskStep.action, taskStep.status,
      JSON.stringify(taskStep.input_data), JSON.stringify(taskStep.output_data),
      JSON.stringify(taskStep.error_details), taskStep.retry_count,
      taskStep.browser_session_id, taskStep.screenshot_url
    ];

    try {
      const result = await this.pool.query(query, values);
      logger.info(`Created task step: ${taskStep.step_id}`);
      return this.mapTaskStepRow(result.rows[0]);
    } catch (error) {
      logger.error('Error creating task step:', error);
      throw new AppError('Failed to create task step', 500);
    }
  }

  async getTaskSteps(taskRunId: string): Promise<TaskStep[]> {
    const query = `
      SELECT * FROM task_steps 
      WHERE task_run_id = $1 
      ORDER BY sequence_number ASC
    `;
    
    try {
      const result = await this.pool.query(query, [taskRunId]);
      return result.rows.map(row => this.mapTaskStepRow(row));
    } catch (error) {
      logger.error(`Error getting task steps for ${taskRunId}:`, error);
      throw new AppError('Failed to get task steps', 500);
    }
  }

  async updateTaskStep(stepId: string, updates: Partial<TaskStep>): Promise<TaskStep> {
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'step_id' && key !== 'created_at') {
        if (key === 'input_data' || key === 'output_data' || key === 'error_details') {
          setClause.push(`${key} = $${paramIndex}`);
          values.push(JSON.stringify(value));
        } else {
          setClause.push(`${key} = $${paramIndex}`);
          values.push(value);
        }
        paramIndex++;
      }
    });

    if (setClause.length === 0) {
      throw new AppError('No valid fields to update', 400);
    }

    values.push(stepId);

    const query = `
      UPDATE task_steps 
      SET ${setClause.join(', ')}
      WHERE step_id = $${paramIndex}
      RETURNING *
    `;

    try {
      const result = await this.pool.query(query, values);
      if (result.rows.length === 0) {
        throw new NotFoundError(`Task step not found: ${stepId}`);
      }
      return this.mapTaskStepRow(result.rows[0]);
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      logger.error(`Error updating task step ${stepId}:`, error);
      throw new AppError('Failed to update task step', 500);
    }
  }

  // Task Summary Operations
  async createTaskSummary(summary: Omit<TaskSummary, 'id'>): Promise<TaskSummary> {
    const query = `
      INSERT INTO task_summaries (
        task_run_id, run_id, summary_title, summary_description, key_actions,
        performance_notes, model_used, generation_cost_usd, event_count,
        total_duration_ms, error_count, confidence_score, human_reviewed, human_rating
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;
    
    const values = [
      summary.task_run_id, summary.run_id, summary.summary_title, summary.summary_description,
      JSON.stringify(summary.key_actions), summary.performance_notes, summary.model_used,
      summary.generation_cost_usd, summary.event_count, summary.total_duration_ms,
      summary.error_count, summary.confidence_score, summary.human_reviewed, summary.human_rating
    ];

    try {
      const result = await this.pool.query(query, values);
      logger.info(`Created task summary for: ${summary.run_id}`);
      return this.mapTaskSummaryRow(result.rows[0]);
    } catch (error) {
      logger.error('Error creating task summary:', error);
      throw new AppError('Failed to create task summary', 500);
    }
  }

  async getTaskSummary(runId: string): Promise<TaskSummary | null> {
    const query = 'SELECT * FROM task_summaries WHERE run_id = $1';
    try {
      const result = await this.pool.query(query, [runId]);
      return result.rows.length > 0 ? this.mapTaskSummaryRow(result.rows[0]) : null;
    } catch (error) {
      logger.error(`Error getting task summary ${runId}:`, error);
      throw new AppError('Failed to get task summary', 500);
    }
  }

  // Cache Operations
  async getCacheEntry(cacheKey: string): Promise<TaskCache | null> {
    const query = `
      SELECT * FROM task_cache 
      WHERE cache_key = $1 AND is_active = true 
      AND (expires_at IS NULL OR expires_at > NOW())
    `;
    
    try {
      const result = await this.pool.query(query, [cacheKey]);
      if (result.rows.length > 0) {
        // Update last_used_at and hit_count
        await this.pool.query(
          'UPDATE task_cache SET last_used_at = NOW(), hit_count = hit_count + 1 WHERE cache_key = $1',
          [cacheKey]
        );
        return this.mapTaskCacheRow(result.rows[0]);
      }
      return null;
    } catch (error) {
      logger.error(`Error getting cache entry ${cacheKey}:`, error);
      throw new AppError('Failed to get cache entry', 500);
    }
  }

  async setCacheEntry(cache: Omit<TaskCache, 'id' | 'created_at' | 'last_used_at' | 'use_count' | 'hit_count'>): Promise<TaskCache> {
    const query = `
      INSERT INTO task_cache (
        cache_key, tool, action_sequence, normalized_params, cached_result,
        success_rate, avg_duration_ms, expires_at, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (cache_key) DO UPDATE SET
        cached_result = EXCLUDED.cached_result,
        success_rate = EXCLUDED.success_rate,
        avg_duration_ms = EXCLUDED.avg_duration_ms,
        last_used_at = NOW(),
        use_count = task_cache.use_count + 1
      RETURNING *
    `;
    
    const values = [
      cache.cache_key, cache.tool, JSON.stringify(cache.action_sequence),
      JSON.stringify(cache.normalized_params), JSON.stringify(cache.cached_result),
      cache.success_rate, cache.avg_duration_ms, cache.expires_at, cache.is_active
    ];

    try {
      const result = await this.pool.query(query, values);
      logger.info(`Set cache entry: ${cache.cache_key}`);
      return this.mapTaskCacheRow(result.rows[0]);
    } catch (error) {
      logger.error('Error setting cache entry:', error);
      throw new AppError('Failed to set cache entry', 500);
    }
  }

  async getCacheStats(): Promise<{
    total_entries: number;
    active_entries: number;
    hit_rate: number;
    avg_use_count: number;
    storage_size_mb: number;
  }> {
    const query = `
      SELECT 
        COUNT(*) as total_entries,
        COUNT(*) FILTER (WHERE is_active = true) as active_entries,
        COALESCE(AVG(CASE WHEN use_count > 0 THEN hit_count::float / use_count ELSE 0 END), 0) as hit_rate,
        COALESCE(AVG(use_count), 0) as avg_use_count,
        COALESCE(pg_total_relation_size('task_cache') / (1024.0 * 1024.0), 0) as storage_size_mb
      FROM task_cache
    `;

    try {
      const result = await this.pool.query(query);
      const row = result.rows[0];
      return {
        total_entries: parseInt(row.total_entries),
        active_entries: parseInt(row.active_entries),
        hit_rate: parseFloat(row.hit_rate),
        avg_use_count: parseFloat(row.avg_use_count),
        storage_size_mb: parseFloat(row.storage_size_mb)
      };
    } catch (error) {
      logger.error('Error getting cache stats:', error);
      throw new AppError('Failed to get cache stats', 500);
    }
  }

  // Analytics Operations
  async recordFailurePattern(pattern: Omit<FailurePattern, 'id' | 'first_seen' | 'last_seen' | 'occurrence_count'>): Promise<FailurePattern> {
    const query = `
      INSERT INTO failure_patterns (
        pattern_type, pattern_signature, tool, action, error_pattern,
        suggested_fix, resolution_notes, is_resolved, occurrence_count, first_seen, last_seen
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1, NOW(), NOW())
      ON CONFLICT (pattern_signature) DO UPDATE SET
        occurrence_count = failure_patterns.occurrence_count + 1,
        last_seen = NOW()
      RETURNING *
    `;
    
    const values = [
      pattern.pattern_type, pattern.pattern_signature, pattern.tool, pattern.action,
      pattern.error_pattern, pattern.suggested_fix, pattern.resolution_notes, pattern.is_resolved
    ];

    try {
      const result = await this.pool.query(query, values);
      return this.mapFailurePatternRow(result.rows[0]);
    } catch (error) {
      logger.error('Error recording failure pattern:', error);
      throw new AppError('Failed to record failure pattern', 500);
    }
  }

  async getFailurePatterns(limit = 50): Promise<FailurePattern[]> {
    const query = `
      SELECT * FROM failure_patterns 
      WHERE is_resolved = false
      ORDER BY occurrence_count DESC, last_seen DESC
      LIMIT $1
    `;

    try {
      const result = await this.pool.query(query, [limit]);
      return result.rows.map(row => this.mapFailurePatternRow(row));
    } catch (error) {
      logger.error('Error getting failure patterns:', error);
      throw new AppError('Failed to get failure patterns', 500);
    }
  }

  async recordPerformanceMetric(metric: Omit<PerformanceMetric, 'id' | 'recorded_at'>): Promise<PerformanceMetric> {
    const query = `
      INSERT INTO performance_metrics (
        metric_name, metric_value, metric_unit, tool, action, run_id,
        tags, aggregation_window, sample_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const values = [
      metric.metric_name, metric.metric_value, metric.metric_unit, metric.tool,
      metric.action, metric.run_id, JSON.stringify(metric.tags),
      metric.aggregation_window, metric.sample_count
    ];

    try {
      const result = await this.pool.query(query, values);
      return this.mapPerformanceMetricRow(result.rows[0]);
    } catch (error) {
      logger.error('Error recording performance metric:', error);
      throw new AppError('Failed to record performance metric', 500);
    }
  }

  async getPerformanceMetrics(filters: {
    metric_name?: string;
    tool?: string;
    action?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
  } = {}): Promise<PerformanceMetric[]> {
    const conditions = [];
    const values = [];
    let paramIndex = 1;

    if (filters.metric_name) {
      conditions.push(`metric_name = $${paramIndex}`);
      values.push(filters.metric_name);
      paramIndex++;
    }

    if (filters.tool) {
      conditions.push(`tool = $${paramIndex}`);
      values.push(filters.tool);
      paramIndex++;
    }

    if (filters.action) {
      conditions.push(`action = $${paramIndex}`);
      values.push(filters.action);
      paramIndex++;
    }

    if (filters.start_date) {
      conditions.push(`recorded_at >= $${paramIndex}`);
      values.push(filters.start_date);
      paramIndex++;
    }

    if (filters.end_date) {
      conditions.push(`recorded_at <= $${paramIndex}`);
      values.push(filters.end_date);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters.limit || 100;
    
    const query = `
      SELECT * FROM performance_metrics
      ${whereClause}
      ORDER BY recorded_at DESC
      LIMIT $${paramIndex}
    `;
    
    values.push(limit);

    try {
      const result = await this.pool.query(query, values);
      return result.rows.map(row => this.mapPerformanceMetricRow(row));
    } catch (error) {
      logger.error('Error getting performance metrics:', error);
      throw new AppError('Failed to get performance metrics', 500);
    }
  }

  // Utility methods for mapping database rows to TypeScript objects
  private mapTaskRunRow(row: any): TaskRun {
    return {
      id: row.id,
      run_id: row.run_id,
      session_id: row.session_id,
      task_id: row.task_id,
      tool: row.tool,
      status: row.status,
      title: row.title,
      description: row.description,
      created_at: row.created_at,
      started_at: row.started_at,
      completed_at: row.completed_at,
      updated_at: row.updated_at,
      config: row.config ? JSON.parse(row.config) : null,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
      total_duration_ms: row.total_duration_ms,
      cpu_usage_percent: row.cpu_usage_percent,
      memory_usage_mb: row.memory_usage_mb,
      result: row.result ? JSON.parse(row.result) : null,
      error_details: row.error_details ? JSON.parse(row.error_details) : null,
      cache_key: row.cache_key,
      cache_hit: row.cache_hit
    };
  }

  private mapTaskStepRow(row: any): TaskStep {
    return {
      id: row.id,
      task_run_id: row.task_run_id,
      step_id: row.step_id,
      sequence_number: row.sequence_number,
      action_type: row.action_type,
      action: row.action,
      status: row.status,
      created_at: row.created_at,
      started_at: row.started_at,
      completed_at: row.completed_at,
      input_data: row.input_data ? JSON.parse(row.input_data) : null,
      output_data: row.output_data ? JSON.parse(row.output_data) : null,
      error_details: row.error_details ? JSON.parse(row.error_details) : null,
      duration_ms: row.duration_ms,
      retry_count: row.retry_count,
      browser_session_id: row.browser_session_id,
      screenshot_url: row.screenshot_url
    };
  }

  private mapTaskSummaryRow(row: any): TaskSummary {
    return {
      id: row.id,
      task_run_id: row.task_run_id,
      run_id: row.run_id,
      summary_title: row.summary_title,
      summary_description: row.summary_description,
      key_actions: row.key_actions ? JSON.parse(row.key_actions) : null,
      performance_notes: row.performance_notes,
      model_used: row.model_used,
      generated_at: row.generated_at,
      generation_cost_usd: row.generation_cost_usd,
      event_count: row.event_count,
      total_duration_ms: row.total_duration_ms,
      error_count: row.error_count,
      confidence_score: row.confidence_score,
      human_reviewed: row.human_reviewed,
      human_rating: row.human_rating
    };
  }

  private mapTaskCacheRow(row: any): TaskCache {
    return {
      id: row.id,
      cache_key: row.cache_key,
      tool: row.tool,
      action_sequence: row.action_sequence ? JSON.parse(row.action_sequence) : [],
      normalized_params: row.normalized_params ? JSON.parse(row.normalized_params) : {},
      cached_result: row.cached_result ? JSON.parse(row.cached_result) : {},
      success_rate: row.success_rate,
      avg_duration_ms: row.avg_duration_ms,
      created_at: row.created_at,
      last_used_at: row.last_used_at,
      use_count: row.use_count,
      hit_count: row.hit_count,
      expires_at: row.expires_at,
      is_active: row.is_active
    };
  }

  private mapFailurePatternRow(row: any): FailurePattern {
    return {
      id: row.id,
      pattern_type: row.pattern_type,
      pattern_signature: row.pattern_signature,
      tool: row.tool,
      action: row.action,
      error_pattern: row.error_pattern,
      occurrence_count: row.occurrence_count,
      first_seen: row.first_seen,
      last_seen: row.last_seen,
      suggested_fix: row.suggested_fix,
      resolution_notes: row.resolution_notes,
      is_resolved: row.is_resolved
    };
  }

  private mapPerformanceMetricRow(row: any): PerformanceMetric {
    return {
      id: row.id,
      metric_name: row.metric_name,
      metric_value: row.metric_value,
      metric_unit: row.metric_unit,
      tool: row.tool,
      action: row.action,
      run_id: row.run_id,
      recorded_at: row.recorded_at,
      tags: row.tags ? JSON.parse(row.tags) : null,
      aggregation_window: row.aggregation_window,
      sample_count: row.sample_count
    };
  }
}

export default DatabaseService;