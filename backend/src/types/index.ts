// Core types for the agent logging system

export interface LogEvent {
  ts: string;
  tool: string;
  run_id: string;
  session_id?: string;
  task_id?: string;
  step_id?: string;
  event_type: EventType;
  status: TaskStatus;
  action?: string;
  metrics?: LogMetrics;
  err?: string | null;
  meta?: Record<string, any>;
  schema_version: string;
  level?: 'debug' | 'info' | 'warn' | 'error';
  message?: string;
}

export type EventType = 
  | 'task_start' 
  | 'task_end' 
  | 'action_start' 
  | 'action_end' 
  | 'error' 
  | 'info' 
  | 'debug' 
  | 'warning' 
  | 'metric';

export type TaskStatus = 
  | 'pending' 
  | 'running' 
  | 'completed' 
  | 'failed' 
  | 'cancelled' 
  | 'timeout';

export type ActionType = 
  | 'browser_navigate' 
  | 'form_fill' 
  | 'button_click' 
  | 'data_extract' 
  | 'api_call' 
  | 'file_upload' 
  | 'screenshot' 
  | 'wait' 
  | 'scroll' 
  | 'other';

export interface LogMetrics {
  duration_ms?: number;
  cpu_usage_percent?: number;
  memory_usage_mb?: number;
  network_requests?: number;
  bytes_transferred?: number;
  retry_count?: number;
  [key: string]: any;
}

export interface TaskRun {
  id: string;
  run_id: string;
  session_id?: string;
  task_id?: string;
  tool: string;
  status: TaskStatus;
  title?: string;
  description?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  updated_at: string;
  config?: Record<string, any>;
  metadata?: Record<string, any>;
  total_duration_ms?: number;
  cpu_usage_percent?: number;
  memory_usage_mb?: number;
  result?: Record<string, any>;
  error_details?: Record<string, any>;
  cache_key?: string;
  cache_hit: boolean;
}

export interface TaskStep {
  id: string;
  task_run_id: string;
  step_id: string;
  sequence_number: number;
  action_type: ActionType;
  action: string;
  status: TaskStatus;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  input_data?: Record<string, any>;
  output_data?: Record<string, any>;
  error_details?: Record<string, any>;
  duration_ms?: number;
  retry_count: number;
  browser_session_id?: string;
  screenshot_url?: string;
}

export interface TaskSummary {
  id: string;
  task_run_id: string;
  run_id: string;
  summary_title?: string;
  summary_description?: string;
  key_actions?: string[];
  performance_notes?: string;
  model_used: string;
  generated_at: string;
  generation_cost_usd?: number;
  event_count?: number;
  total_duration_ms?: number;
  error_count?: number;
  confidence_score?: number;
  human_reviewed: boolean;
  human_rating?: number;
}

export interface TaskCache {
  id: string;
  cache_key: string;
  tool: string;
  action_sequence: string[];
  normalized_params: Record<string, any>;
  cached_result: Record<string, any>;
  success_rate: number;
  avg_duration_ms?: number;
  created_at: string;
  last_used_at: string;
  use_count: number;
  hit_count: number;
  expires_at?: string;
  is_active: boolean;
}

export interface FailurePattern {
  id: string;
  pattern_type: string;
  pattern_signature: string;
  tool?: string;
  action?: string;
  error_pattern?: string;
  occurrence_count: number;
  first_seen: string;
  last_seen: string;
  suggested_fix?: string;
  resolution_notes?: string;
  is_resolved: boolean;
}

export interface PerformanceMetric {
  id: string;
  metric_name: string;
  metric_value: number;
  metric_unit?: string;
  tool?: string;
  action?: string;
  run_id?: string;
  recorded_at: string;
  tags?: Record<string, any>;
  aggregation_window?: string;
  sample_count: number;
}

// API Request/Response types
export interface LogQueryRequest {
  query?: string;
  start?: string;
  end?: string;
  limit?: number;
  direction?: 'forward' | 'backward';
  run_id?: string;
  session_id?: string;
  tool?: string;
  status?: TaskStatus;
  event_type?: EventType;
}

export interface LogQueryResponse {
  data: {
    result: Array<{
      stream: Record<string, string>;
      values: Array<[string, string]>;
    }>;
    stats: {
      summary: {
        bytesTotal: number;
        linesTotal: number;
        execTime: number;
      };
    };
  };
}

export interface TaskSummaryRequest {
  run_id: string;
  force_refresh?: boolean;
}

export interface TaskCardsRequest {
  run_id: string;
  include_steps?: boolean;
}

export interface TaskCard {
  id: string;
  type: 'task' | 'step';
  title: string;
  description: string;
  status: TaskStatus;
  duration_ms?: number;
  timestamp: string;
  metadata?: Record<string, any>;
  error?: string;
}

export interface AnalyticsData {
  total_tasks: number;
  successful_tasks: number;
  failed_tasks: number;
  avg_duration_ms: number;
  cache_hit_rate: number;
  top_errors: Array<{
    error: string;
    count: number;
  }>;
  performance_trends: Array<{
    timestamp: string;
    avg_duration: number;
    task_count: number;
  }>;
}

// WebSocket message types
export interface WebSocketMessage {
  type: 'log_update' | 'task_progress' | 'system_alert' | 'analytics_update';
  payload: any;
  timestamp: string;
}

export interface TaskProgressMessage {
  run_id: string;
  status: TaskStatus;
  progress_percent: number;
  current_step?: string;
  estimated_completion?: string;
}

// Configuration types
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  max_connections?: number;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  ttl?: number;
}

export interface LokiConfig {
  endpoint: string;
  username?: string;
  password?: string;
  timeout?: number;
}

export interface OpenRouterConfig {
  api_key: string;
  model: string;
  endpoint?: string;
  timeout?: number;
  max_tokens?: number;
}

export interface ServerConfig {
  port: number;
  host: string;
  cors_origins: string[];
  jwt_secret: string;
  log_level: string;
  database: DatabaseConfig;
  redis: RedisConfig;
  loki: LokiConfig;
  openrouter: OpenRouterConfig;
}

// Error types
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, true);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, true);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, true);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, true);
  }
}

// API Response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
  request_id?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}