import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import winston from 'winston';
import { EventEmitter } from 'events';
import { 
  LogQueryRequest, 
  LogQueryResponse, 
  LokiConfig,
  AppError,
  LogEvent
} from '../types';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'loki.log' })
  ]
});

interface LokiStream {
  stream: Record<string, string>;
  values: Array<[string, string]>;
}

interface LokiTailResponse {
  streams: LokiStream[];
  dropped_entries?: Array<{
    labels: Record<string, string>;
    timestamp: string;
  }>;
}

export class LokiService extends EventEmitter {
  private client: AxiosInstance;
  private config: LokiConfig;
  private isHealthy: boolean = false;
  private lastHealthCheck: Date = new Date(0);
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(config: LokiConfig) {
    super();
    this.config = config;
    
    this.client = axios.create({
      baseURL: config.endpoint,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'agent-logging-backend/1.0.0'
      }
    });

    // Add authentication if provided
    if (config.username && config.password) {
      this.client.defaults.auth = {
        username: config.username,
        password: config.password
      };
    }

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('Loki request:', {
          method: config.method?.toUpperCase(),
          url: config.url,
          params: config.params
        });
        return config;
      },
      (error) => {
        logger.error('Loki request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        logger.error('Loki response error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url
        });
        
        if (error.response?.status >= 500) {
          this.isHealthy = false;
        }
        
        return Promise.reject(error);
      }
    );
  }

  async initialize(): Promise<void> {
    try {
      await this.healthCheck();
      
      // Start periodic health checks every 30 seconds
      this.healthCheckInterval = setInterval(async () => {
        try {
          await this.healthCheck();
        } catch (error) {
          logger.warn('Periodic health check failed:', error);
        }
      }, 30000);
      
      logger.info('Loki service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Loki service:', error);
      throw new AppError('Loki service initialization failed', 503);
    }
  }

  async close(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    logger.info('Loki service closed');
  }

  async healthCheck(): Promise<{ status: string; latency_ms: number; version?: string }> {
    const start = Date.now();
    try {
      // Try to query Loki's ready endpoint
      const response = await this.client.get('/ready', { timeout: 5000 });
      const latency_ms = Date.now() - start;
      
      this.isHealthy = true;
      this.lastHealthCheck = new Date();
      
      return {
        status: 'healthy',
        latency_ms,
        version: response.headers['x-loki-version']
      };
    } catch (error) {
      this.isHealthy = false;
      const latency_ms = Date.now() - start;
      
      logger.warn('Loki health check failed:', error);
      return {
        status: 'unhealthy',
        latency_ms
      };
    }
  }

  async queryRange(params: LogQueryRequest): Promise<LogQueryResponse> {
    try {
      this.validateQueryParams(params);
      
      const queryParams = this.buildQueryParams(params);
      const response = await this.client.get('/loki/api/v1/query_range', {
        params: queryParams,
        timeout: 60000 // Extended timeout for large queries
      });

      logger.info('Loki query executed successfully', {
        query: params.query,
        start: params.start,
        end: params.end,
        resultCount: response.data.data?.result?.length || 0
      });

      return this.transformLokiResponse(response.data);
    } catch (error) {
      logger.error('Loki query failed:', {
        params,
        error: error.response?.data || error.message
      });

      if (error.response?.status === 400) {
        throw new AppError('Invalid query parameters', 400);
      } else if (error.response?.status === 429) {
        throw new AppError('Rate limit exceeded', 429);
      } else if (error.response?.status >= 500) {
        throw new AppError('Loki service unavailable', 503);
      }
      
      throw new AppError('Query execution failed', 500);
    }
  }

  async queryInstant(query: string, time?: string): Promise<LogQueryResponse> {
    try {
      const queryParams: any = { query };
      if (time) {
        queryParams.time = time;
      }

      const response = await this.client.get('/loki/api/v1/query', {
        params: queryParams,
        timeout: 30000
      });

      logger.info('Loki instant query executed successfully', {
        query,
        time,
        resultCount: response.data.data?.result?.length || 0
      });

      return this.transformLokiResponse(response.data);
    } catch (error) {
      logger.error('Loki instant query failed:', {
        query,
        time,
        error: error.response?.data || error.message
      });

      if (error.response?.status === 400) {
        throw new AppError('Invalid query', 400);
      }
      
      throw new AppError('Instant query execution failed', 500);
    }
  }

  async tail(params: {
    query?: string;
    delay_for?: number;
    limit?: number;
    start?: string;
  }): Promise<AsyncIterableIterator<LogEvent[]>> {
    if (!this.isHealthy) {
      throw new AppError('Loki service is unhealthy', 503);
    }

    const queryParams: any = {
      query: params.query || '{job="agent"}',
      delay_for: params.delay_for || 0,
      limit: params.limit || 100
    };

    if (params.start) {
      queryParams.start = params.start;
    }

    const controller = new AbortController();
    
    return this.createTailIterator(queryParams, controller);
  }

  private async *createTailIterator(
    params: any, 
    controller: AbortController
  ): AsyncIterableIterator<LogEvent[]> {
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 5;
    
    while (!controller.signal.aborted) {
      try {
        const response = await this.client.get('/loki/api/v1/tail', {
          params,
          timeout: 30000,
          signal: controller.signal,
          responseType: 'stream'
        });

        const stream = response.data;
        let buffer = '';

        for await (const chunk of stream) {
          if (controller.signal.aborted) break;
          
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.trim()) {
              try {
                const data: LokiTailResponse = JSON.parse(line);
                const logEvents = this.transformTailResponse(data);
                if (logEvents.length > 0) {
                  yield logEvents;
                }
              } catch (parseError) {
                logger.warn('Failed to parse tail response line:', line);
              }
            }
          }
        }
        
        consecutiveErrors = 0;
        
      } catch (error) {
        consecutiveErrors++;
        
        if (controller.signal.aborted) {
          break;
        }
        
        logger.error(`Loki tail error (attempt ${consecutiveErrors}):`, {
          error: error.message,
          status: error.response?.status
        });
        
        if (consecutiveErrors >= maxConsecutiveErrors) {
          logger.error('Max consecutive tail errors reached, stopping tail');
          break;
        }
        
        // Exponential backoff for retries
        const delay = Math.min(1000 * Math.pow(2, consecutiveErrors - 1), 30000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    logger.info('Loki tail iterator stopped');
  }

  async searchLogs(params: {
    query?: string;
    start?: string;
    end?: string;
    limit?: number;
    direction?: 'forward' | 'backward';
    regexp?: string;
  }): Promise<LogEvent[]> {
    try {
      let query = params.query || '{job="agent"}';
      
      // Add regex filter if provided
      if (params.regexp) {
        query += ` |~ "${params.regexp}"`;
      }

      const queryParams = {
        query,
        start: params.start || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        end: params.end || new Date().toISOString(),
        limit: params.limit || 1000,
        direction: params.direction || 'backward'
      };

      const response = await this.queryRange(queryParams);
      return this.extractLogEventsFromResponse(response);
    } catch (error) {
      logger.error('Log search failed:', error);
      throw error;
    }
  }

  async getLabels(): Promise<string[]> {
    try {
      const response = await this.client.get('/loki/api/v1/labels');
      return response.data.data || [];
    } catch (error) {
      logger.error('Failed to get labels:', error);
      throw new AppError('Failed to retrieve labels', 500);
    }
  }

  async getLabelValues(labelName: string): Promise<string[]> {
    try {
      const response = await this.client.get(`/loki/api/v1/label/${labelName}/values`);
      return response.data.data || [];
    } catch (error) {
      logger.error(`Failed to get values for label ${labelName}:`, error);
      throw new AppError(`Failed to retrieve values for label ${labelName}`, 500);
    }
  }

  private validateQueryParams(params: LogQueryRequest): void {
    if (params.start && params.end) {
      const start = new Date(params.start);
      const end = new Date(params.end);
      
      if (start >= end) {
        throw new AppError('Start time must be before end time', 400);
      }
      
      // Limit query range to 30 days
      const maxRange = 30 * 24 * 60 * 60 * 1000;
      if (end.getTime() - start.getTime() > maxRange) {
        throw new AppError('Query range cannot exceed 30 days', 400);
      }
    }
    
    if (params.limit && (params.limit < 1 || params.limit > 10000)) {
      throw new AppError('Limit must be between 1 and 10000', 400);
    }
  }

  private buildQueryParams(params: LogQueryRequest): Record<string, any> {
    const queryParams: Record<string, any> = {};

    // Build LogQL query
    let query = params.query || '{job="agent"}';
    
    // Add filters
    const filters = [];
    if (params.run_id) filters.push(`run_id="${params.run_id}"`);
    if (params.session_id) filters.push(`session_id="${params.session_id}"`);
    if (params.tool) filters.push(`tool="${params.tool}"`);
    if (params.status) filters.push(`status="${params.status}"`);
    if (params.event_type) filters.push(`event_type="${params.event_type}"`);
    
    if (filters.length > 0) {
      // If query already has filters, add to them
      if (query.includes(',')) {
        query = query.replace('}', `, ${filters.join(', ')}`);
      } else {
        query = query.replace('}', `, ${filters.join(', ')}`);
      }
    }

    queryParams.query = query;
    
    if (params.start) queryParams.start = params.start;
    if (params.end) queryParams.end = params.end;
    if (params.limit) queryParams.limit = params.limit;
    if (params.direction) queryParams.direction = params.direction;

    return queryParams;
  }

  private transformLokiResponse(data: any): LogQueryResponse {
    return {
      data: {
        result: data.data?.result || [],
        stats: {
          summary: {
            bytesTotal: data.data?.stats?.summary?.bytesTotal || 0,
            linesTotal: data.data?.stats?.summary?.linesTotal || 0,
            execTime: data.data?.stats?.summary?.execTime || 0
          }
        }
      }
    };
  }

  private transformTailResponse(data: LokiTailResponse): LogEvent[] {
    const logEvents: LogEvent[] = [];
    
    for (const stream of data.streams || []) {
      for (const [timestamp, message] of stream.values) {
        try {
          // Try to parse as JSON log event
          const logEvent: LogEvent = JSON.parse(message);
          logEvents.push(logEvent);
        } catch (error) {
          // If not JSON, create a basic log event
          logEvents.push({
            ts: new Date(parseInt(timestamp) / 1000000).toISOString(),
            tool: stream.stream.tool || 'unknown',
            run_id: stream.stream.run_id || 'unknown',
            event_type: 'info' as EventType,
            status: 'running' as any,
            message,
            schema_version: '1.0',
            level: 'info'
          });
        }
      }
    }
    
    return logEvents;
  }

  private extractLogEventsFromResponse(response: LogQueryResponse): LogEvent[] {
    const logEvents: LogEvent[] = [];
    
    for (const result of response.data.result) {
      for (const [timestamp, message] of result.values) {
        try {
          const logEvent: LogEvent = JSON.parse(message);
          logEvents.push(logEvent);
        } catch (error) {
          // Create basic log event if parsing fails
          logEvents.push({
            ts: new Date(parseInt(timestamp) / 1000000).toISOString(),
            tool: result.stream.tool || 'unknown',
            run_id: result.stream.run_id || 'unknown',
            event_type: 'info' as EventType,
            status: 'running' as any,
            message,
            schema_version: '1.0',
            level: 'info'
          });
        }
      }
    }
    
    return logEvents.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
  }

  // Public getters for service status
  get healthy(): boolean {
    return this.isHealthy;
  }

  get lastHealthCheckTime(): Date {
    return this.lastHealthCheck;
  }
}

export default LokiService;