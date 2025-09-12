import axios, { AxiosInstance } from 'axios';
import winston from 'winston';
import { 
  TaskSummary, 
  TaskRun, 
  TaskStep, 
  LogEvent,
  AppError
} from '../types';
import { createHash } from 'crypto';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'deepseek.log' })
  ]
});

interface DeepSeekConfig {
  endpoint: string;
  model: string;
  timeout?: number;
  max_tokens?: number;
}

interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface DeepSeekResponse {
  model: string;
  response: string;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

interface TaskSummaryData {
  task_run: TaskRun;
  steps: TaskStep[];
  log_events: LogEvent[];
  total_events: number;
  error_events: number;
  total_duration_ms: number;
}

export class DeepSeekService {
  private client: AxiosInstance;
  private config: DeepSeekConfig;
  private isHealthy: boolean = false;
  private requestCount: number = 0;
  private responseCache: Map<string, { response: any; timestamp: number }> = new Map();
  private readonly cacheExpiryMs = 24 * 60 * 60 * 1000; // 24 hours

  constructor(config: DeepSeekConfig) {
    this.config = config;
    
    this.client = axios.create({
      baseURL: config.endpoint || 'http://localhost:11434',
      timeout: config.timeout || 60000,
      headers: {
        'Content-Type': 'application/json',
      }
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        this.requestCount++;
        logger.debug('DeepSeek request:', {
          method: config.method?.toUpperCase(),
          url: config.url,
          model: config.data?.model
        });
        return config;
      },
      (error) => {
        logger.error('DeepSeek request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.info('DeepSeek API usage:', {
          model: this.config.model,
          response_time_ms: response.data.total_duration ? 
            Math.round(response.data.total_duration / 1000000) : 'unknown',
          tokens_generated: response.data.eval_count || 'unknown'
        });
        return response;
      },
      (error) => {
        logger.error('DeepSeek response error:', {
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
      logger.info('DeepSeek service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize DeepSeek service:', error);
      throw new AppError('DeepSeek service initialization failed', 503);
    }
  }

  async healthCheck(): Promise<{ status: string; latency_ms: number; model?: string }> {
    const start = Date.now();
    try {
      // Test with a simple models list request
      const response = await this.client.get('/api/tags');
      const latency_ms = Date.now() - start;
      
      this.isHealthy = true;
      
      return {
        status: 'healthy',
        latency_ms,
        model: this.config.model
      };
    } catch (error) {
      this.isHealthy = false;
      const latency_ms = Date.now() - start;
      
      logger.warn('DeepSeek health check failed:', error);
      return {
        status: 'unhealthy',
        latency_ms
      };
    }
  }

  async generateTaskSummary(data: TaskSummaryData, forceRefresh = false): Promise<{
    summary: TaskSummary;
    cost_usd: number;
    cached: boolean;
  }> {
    try {
      // Generate cache key based on task data
      const cacheKey = this.generateCacheKey(data);
      
      // Check cache first unless force refresh
      if (!forceRefresh && this.responseCache.has(cacheKey)) {
        const cached = this.responseCache.get(cacheKey)!;
        if (Date.now() - cached.timestamp < this.cacheExpiryMs) {
          logger.info('Using cached task summary', { run_id: data.task_run.run_id });
          return {
            summary: cached.response,
            cost_usd: 0, // No cost for local DeepSeek
            cached: true
          };
        } else {
          // Remove expired cache entry
          this.responseCache.delete(cacheKey);
        }
      }

      const prompt = this.buildSummaryPrompt(data);

      const requestBody = {
        model: this.config.model,
        prompt: `You are an expert at analyzing automation task logs and creating concise, actionable summaries. Focus on key actions, performance insights, and any issues encountered.

${prompt}

Please provide a JSON response with the exact structure requested.`,
        stream: false,
        options: {
          temperature: 0.3,
          top_p: 0.9,
          num_predict: this.config.max_tokens || 1000
        }
      };

      const response = await this.client.post('/api/generate', requestBody);
      const deepSeekResponse: DeepSeekResponse = response.data;
      
      if (!deepSeekResponse.response) {
        throw new AppError('No response generated from DeepSeek', 500);
      }

      // Parse JSON from response
      let summaryData;
      try {
        // Extract JSON from the response text
        const jsonMatch = deepSeekResponse.response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in response');
        }
        summaryData = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        logger.error('Failed to parse DeepSeek response as JSON:', parseError);
        // Fallback: create summary from the raw response
        summaryData = {
          title: `${data.task_run.tool} Task Analysis`,
          description: deepSeekResponse.response.substring(0, 200) + '...',
          key_actions: ['Task executed', 'Analysis completed'],
          performance_notes: 'DeepSeek analysis completed successfully',
          confidence_score: 0.7
        };
      }
      
      const summary: TaskSummary = {
        id: '', // Will be set by database
        task_run_id: data.task_run.id,
        run_id: data.task_run.run_id,
        summary_title: summaryData.title || `${data.task_run.tool} Task`,
        summary_description: summaryData.description || '',
        key_actions: summaryData.key_actions || [],
        performance_notes: summaryData.performance_notes || '',
        model_used: `deepseek-local:${this.config.model}`,
        generated_at: new Date().toISOString(),
        generation_cost_usd: 0, // Local model, no cost
        event_count: data.total_events,
        total_duration_ms: data.total_duration_ms,
        error_count: data.error_events,
        confidence_score: summaryData.confidence_score || 0.8,
        human_reviewed: false,
        human_rating: null
      };

      // Cache the response
      this.responseCache.set(cacheKey, {
        response: summary,
        timestamp: Date.now()
      });

      logger.info('Generated task summary with DeepSeek', {
        run_id: data.task_run.run_id,
        model: this.config.model,
        response_time_ms: deepSeekResponse.total_duration ? 
          Math.round(deepSeekResponse.total_duration / 1000000) : 'unknown',
        confidence: summary.confidence_score
      });

      return {
        summary,
        cost_usd: 0, // Local model
        cached: false
      };
    } catch (error) {
      logger.error('Task summary generation failed:', {
        run_id: data.task_run.run_id,
        error: error.response?.data || error.message
      });

      if (error.code === 'ECONNREFUSED') {
        throw new AppError('DeepSeek service is not available', 503);
      }
      
      throw new AppError('Failed to generate task summary with DeepSeek', 500);
    }
  }

  async generateChatResponse(messages: DeepSeekMessage[]): Promise<{
    response: string;
    model: string;
    tokens_used: number;
    response_time_ms: number;
  }> {
    try {
      // Convert messages to a single prompt for Ollama format
      const prompt = messages.map(msg => 
        `${msg.role === 'system' ? 'System' : msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
      ).join('\n\n');

      const requestBody = {
        model: this.config.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          num_predict: this.config.max_tokens || 2048
        }
      };

      const startTime = Date.now();
      const response = await this.client.post('/api/generate', requestBody);
      const responseTime = Date.now() - startTime;
      
      const deepSeekResponse: DeepSeekResponse = response.data;
      
      if (!deepSeekResponse.response) {
        throw new AppError('No response generated from DeepSeek', 500);
      }

      logger.info('Generated chat response with DeepSeek', {
        model: this.config.model,
        response_time_ms: responseTime,
        tokens_generated: deepSeekResponse.eval_count || 'unknown'
      });

      return {
        response: deepSeekResponse.response,
        model: `deepseek-local:${this.config.model}`,
        tokens_used: deepSeekResponse.eval_count || 0,
        response_time_ms: responseTime
      };
    } catch (error) {
      logger.error('Chat response generation failed:', error);
      
      if (error.code === 'ECONNREFUSED') {
        throw new AppError('DeepSeek service is not available', 503);
      }
      
      throw new AppError('Failed to generate chat response with DeepSeek', 500);
    }
  }

  private buildSummaryPrompt(data: TaskSummaryData): string {
    const { task_run, steps, log_events, total_events, error_events, total_duration_ms } = data;
    
    return `Analyze this automation task and provide a structured summary in JSON format:

**Task Details:**
- Tool: ${task_run.tool}
- Status: ${task_run.status}
- Duration: ${total_duration_ms}ms
- Total Events: ${total_events}
- Error Events: ${error_events}
- Steps: ${steps.length}

**Task Steps:**
${steps.map((step, i) => `${i + 1}. ${step.action_type}: ${step.action} (${step.status}) - ${step.duration_ms || 0}ms`).join('\n')}

**Recent Log Events:**
${log_events.slice(0, 10).map(event => `[${event.event_type}] ${event.message || event.action || 'No message'} (${event.status})`).join('\n')}

**Required JSON Response Format:**
{
  "title": "Brief descriptive title (max 100 chars)",
  "description": "2-3 sentence summary of what was accomplished",
  "key_actions": ["action1", "action2", "action3"],
  "performance_notes": "Brief performance analysis and any concerns",
  "confidence_score": 0.95
}

Focus on:
1. What the task actually accomplished
2. Key performance metrics and bottlenecks
3. Any errors or issues encountered
4. Overall success assessment`;
  }

  private generateCacheKey(data: TaskSummaryData): string {
    const keyData = {
      tool: data.task_run.tool,
      steps_hash: this.hashSteps(data.steps),
      status: data.task_run.status,
      error_count: data.error_events
    };
    
    return createHash('sha256')
      .update(JSON.stringify(keyData))
      .digest('hex');
  }

  private hashSteps(steps: TaskStep[]): string {
    const stepSummary = steps.map(s => `${s.action_type}:${s.status}:${s.retry_count}`);
    return createHash('md5')
      .update(stepSummary.join('|'))
      .digest('hex');
  }

  // Cache management methods
  clearCache(): void {
    this.responseCache.clear();
    logger.info('DeepSeek response cache cleared');
  }

  getCacheStats(): {
    entries: number;
    oldest_entry_age_ms: number;
  } {
    const entries = this.responseCache.size;
    
    const oldestTimestamp = Math.min(...Array.from(this.responseCache.values())
      .map(cached => cached.timestamp));
    const oldestAge = entries > 0 ? Date.now() - oldestTimestamp : 0;
    
    return {
      entries,
      oldest_entry_age_ms: oldestAge
    };
  }

  // Public getters for service statistics
  get requestsCount(): number {
    return this.requestCount;
  }

  get healthy(): boolean {
    return this.isHealthy;
  }
}

export default DeepSeekService;