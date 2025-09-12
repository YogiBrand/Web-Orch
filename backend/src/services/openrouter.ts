import axios, { AxiosInstance } from 'axios';
import winston from 'winston';
import { 
  TaskSummary, 
  TaskRun, 
  TaskStep, 
  LogEvent,
  OpenRouterConfig,
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
    new winston.transports.File({ filename: 'openrouter.log' })
  ]
});

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}

interface TaskSummaryData {
  task_run: TaskRun;
  steps: TaskStep[];
  log_events: LogEvent[];
  total_events: number;
  error_events: number;
  total_duration_ms: number;
}

export class OpenRouterService {
  private client: AxiosInstance;
  private config: OpenRouterConfig;
  private isHealthy: boolean = false;
  private totalCostUsd: number = 0;
  private requestCount: number = 0;
  private responseCache: Map<string, { response: any; timestamp: number; cost: number }> = new Map();
  private readonly cacheExpiryMs = 24 * 60 * 60 * 1000; // 24 hours

  constructor(config: OpenRouterConfig) {
    this.config = config;
    
    this.client = axios.create({
      baseURL: config.endpoint || 'https://openrouter.ai/api/v1',
      timeout: config.timeout || 60000,
      headers: {
        'Authorization': `Bearer ${config.api_key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://agent-logging-backend.com',
        'X-Title': 'Agent Logging Backend'
      }
    });

    // Request interceptor for logging and cost tracking
    this.client.interceptors.request.use(
      (config) => {
        this.requestCount++;
        logger.debug('OpenRouter request:', {
          method: config.method?.toUpperCase(),
          url: config.url,
          model: config.data?.model
        });
        return config;
      },
      (error) => {
        logger.error('OpenRouter request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for cost tracking
    this.client.interceptors.response.use(
      (response) => {
        if (response.data?.usage) {
          const cost = this.calculateCost(response.data.usage, response.data.model);
          this.totalCostUsd += cost;
          logger.info('OpenRouter API usage:', {
            model: response.data.model,
            prompt_tokens: response.data.usage.prompt_tokens,
            completion_tokens: response.data.usage.completion_tokens,
            total_tokens: response.data.usage.total_tokens,
            cost_usd: cost.toFixed(4)
          });
        }
        return response;
      },
      (error) => {
        logger.error('OpenRouter response error:', {
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
      logger.info('OpenRouter service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize OpenRouter service:', error);
      throw new AppError('OpenRouter service initialization failed', 503);
    }
  }

  async healthCheck(): Promise<{ status: string; latency_ms: number; models?: string[] }> {
    const start = Date.now();
    try {
      // Test with a simple models list request
      const response = await this.client.get('/models', { timeout: 10000 });
      const latency_ms = Date.now() - start;
      
      this.isHealthy = true;
      
      return {
        status: 'healthy',
        latency_ms,
        models: response.data?.data?.slice(0, 5).map((m: any) => m.id) || []
      };
    } catch (error) {
      this.isHealthy = false;
      const latency_ms = Date.now() - start;
      
      logger.warn('OpenRouter health check failed:', error);
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
            cost_usd: 0, // No cost for cached responses
            cached: true
          };
        } else {
          // Remove expired cache entry
          this.responseCache.delete(cacheKey);
        }
      }

      const prompt = this.buildSummaryPrompt(data);
      const messages: OpenRouterMessage[] = [
        {
          role: 'system',
          content: 'You are an expert at analyzing automation task logs and creating concise, actionable summaries. Focus on key actions, performance insights, and any issues encountered.'
        },
        {
          role: 'user',
          content: prompt
        }
      ];

      const requestBody = {
        model: this.config.model,
        messages,
        max_tokens: this.config.max_tokens || 1000,
        temperature: 0.3,
        top_p: 0.9,
        response_format: { type: 'json_object' }
      };

      const response = await this.client.post('/chat/completions', requestBody);
      const openRouterResponse: OpenRouterResponse = response.data;
      
      if (!openRouterResponse.choices || openRouterResponse.choices.length === 0) {
        throw new AppError('No response generated from OpenRouter', 500);
      }

      const content = openRouterResponse.choices[0].message.content;
      const summaryData = JSON.parse(content);
      
      const cost = this.calculateCost(openRouterResponse.usage, openRouterResponse.model);
      
      const summary: TaskSummary = {
        id: '', // Will be set by database
        task_run_id: data.task_run.id,
        run_id: data.task_run.run_id,
        summary_title: summaryData.title || `${data.task_run.tool} Task`,
        summary_description: summaryData.description || '',
        key_actions: summaryData.key_actions || [],
        performance_notes: summaryData.performance_notes || '',
        model_used: openRouterResponse.model,
        generated_at: new Date().toISOString(),
        generation_cost_usd: cost,
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
        timestamp: Date.now(),
        cost
      });

      logger.info('Generated task summary', {
        run_id: data.task_run.run_id,
        model: openRouterResponse.model,
        cost_usd: cost.toFixed(4),
        confidence: summary.confidence_score
      });

      return {
        summary,
        cost_usd: cost,
        cached: false
      };
    } catch (error) {
      logger.error('Task summary generation failed:', {
        run_id: data.task_run.run_id,
        error: error.response?.data || error.message
      });

      if (error.response?.status === 401) {
        throw new AppError('OpenRouter API key is invalid', 401);
      } else if (error.response?.status === 429) {
        throw new AppError('OpenRouter rate limit exceeded', 429);
      } else if (error.response?.status === 400) {
        throw new AppError('Invalid request to OpenRouter', 400);
      }
      
      throw new AppError('Failed to generate task summary', 500);
    }
  }

  async generateFailureAnalysis(failureData: {
    error_message: string;
    error_context: Record<string, any>;
    task_steps: TaskStep[];
    similar_failures?: string[];
  }): Promise<{
    suggested_fix: string;
    root_cause: string;
    preventive_actions: string[];
    cost_usd: number;
  }> {
    try {
      const messages: OpenRouterMessage[] = [
        {
          role: 'system',
          content: 'You are an expert at analyzing automation failures and providing actionable solutions. Focus on root cause analysis and practical fixes.'
        },
        {
          role: 'user',
          content: this.buildFailureAnalysisPrompt(failureData)
        }
      ];

      const requestBody = {
        model: this.config.model,
        messages,
        max_tokens: 800,
        temperature: 0.2,
        response_format: { type: 'json_object' }
      };

      const response = await this.client.post('/chat/completions', requestBody);
      const openRouterResponse: OpenRouterResponse = response.data;
      
      const content = openRouterResponse.choices[0].message.content;
      const analysisData = JSON.parse(content);
      const cost = this.calculateCost(openRouterResponse.usage, openRouterResponse.model);
      
      logger.info('Generated failure analysis', {
        error_message: failureData.error_message.substring(0, 100),
        cost_usd: cost.toFixed(4)
      });

      return {
        suggested_fix: analysisData.suggested_fix || 'No specific fix identified',
        root_cause: analysisData.root_cause || 'Unknown',
        preventive_actions: analysisData.preventive_actions || [],
        cost_usd: cost
      };
    } catch (error) {
      logger.error('Failure analysis generation failed:', error);
      throw new AppError('Failed to generate failure analysis', 500);
    }
  }

  async optimizeTaskSequence(steps: TaskStep[]): Promise<{
    optimized_sequence: string[];
    potential_savings_ms: number;
    recommendations: string[];
    cost_usd: number;
  }> {
    try {
      const messages: OpenRouterMessage[] = [
        {
          role: 'system',
          content: 'You are an expert at optimizing automation task sequences for better performance and reliability.'
        },
        {
          role: 'user',
          content: this.buildOptimizationPrompt(steps)
        }
      ];

      const requestBody = {
        model: this.config.model,
        messages,
        max_tokens: 600,
        temperature: 0.4,
        response_format: { type: 'json_object' }
      };

      const response = await this.client.post('/chat/completions', requestBody);
      const openRouterResponse: OpenRouterResponse = response.data;
      
      const content = openRouterResponse.choices[0].message.content;
      const optimizationData = JSON.parse(content);
      const cost = this.calculateCost(openRouterResponse.usage, openRouterResponse.model);
      
      return {
        optimized_sequence: optimizationData.optimized_sequence || [],
        potential_savings_ms: optimizationData.potential_savings_ms || 0,
        recommendations: optimizationData.recommendations || [],
        cost_usd: cost
      };
    } catch (error) {
      logger.error('Task sequence optimization failed:', error);
      throw new AppError('Failed to optimize task sequence', 500);
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

  private buildFailureAnalysisPrompt(failureData: {
    error_message: string;
    error_context: Record<string, any>;
    task_steps: TaskStep[];
    similar_failures?: string[];
  }): string {
    return `Analyze this automation failure and provide actionable solutions in JSON format:

**Error Message:**
${failureData.error_message}

**Error Context:**
${JSON.stringify(failureData.error_context, null, 2)}

**Task Steps Before Failure:**
${failureData.task_steps.map((step, i) => `${i + 1}. ${step.action_type}: ${step.action} (${step.status})`).join('\n')}

**Similar Previous Failures:**
${failureData.similar_failures?.join('\n') || 'None identified'}

**Required JSON Response Format:**
{
  "root_cause": "Primary reason for failure",
  "suggested_fix": "Specific actionable solution",
  "preventive_actions": ["action1", "action2", "action3"]
}

Provide practical, implementable solutions.`;
  }

  private buildOptimizationPrompt(steps: TaskStep[]): string {
    return `Analyze these automation steps and suggest optimizations in JSON format:

**Current Task Steps:**
${steps.map((step, i) => `${i + 1}. ${step.action_type}: ${step.action} - ${step.duration_ms || 0}ms (${step.retry_count} retries)`).join('\n')}

**Performance Metrics:**
- Total Steps: ${steps.length}
- Total Duration: ${steps.reduce((sum, s) => sum + (s.duration_ms || 0), 0)}ms
- Total Retries: ${steps.reduce((sum, s) => sum + s.retry_count, 0)}

**Required JSON Response Format:**
{
  "optimized_sequence": ["step1", "step2", "step3"],
  "potential_savings_ms": 5000,
  "recommendations": ["recommendation1", "recommendation2"]
}

Focus on:
1. Parallelizable operations
2. Redundant or unnecessary steps
3. Opportunities for caching
4. Retry logic improvements`;
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

  private calculateCost(usage: any, model: string): number {
    // OpenRouter cost calculation - these are approximate rates
    const costs: Record<string, { input: number; output: number }> = {
      'openai/gpt-4-turbo': { input: 0.00001, output: 0.00003 },
      'openai/gpt-4': { input: 0.00003, output: 0.00006 },
      'openai/gpt-3.5-turbo': { input: 0.000001, output: 0.000002 },
      'anthropic/claude-3-haiku': { input: 0.00000025, output: 0.00000125 },
      'anthropic/claude-3-sonnet': { input: 0.000003, output: 0.000015 },
      'meta-llama/llama-3.1-8b-instruct:free': { input: 0, output: 0 },
      'default': { input: 0.000001, output: 0.000002 } // fallback rates
    };

    const modelCosts = costs[model] || costs['default'];
    const inputCost = (usage.prompt_tokens || 0) * modelCosts.input;
    const outputCost = (usage.completion_tokens || 0) * modelCosts.output;
    
    return inputCost + outputCost;
  }

  // Cache management methods
  clearCache(): void {
    this.responseCache.clear();
    logger.info('OpenRouter response cache cleared');
  }

  getCacheStats(): {
    entries: number;
    total_cost_usd: number;
    oldest_entry_age_ms: number;
    cache_hit_rate: number;
  } {
    const entries = this.responseCache.size;
    const totalCost = Array.from(this.responseCache.values())
      .reduce((sum, cached) => sum + cached.cost, 0);
    
    const oldestTimestamp = Math.min(...Array.from(this.responseCache.values())
      .map(cached => cached.timestamp));
    const oldestAge = entries > 0 ? Date.now() - oldestTimestamp : 0;
    
    // Approximate cache hit rate based on cost savings
    const potentialRequests = this.requestCount;
    const actualCost = this.totalCostUsd;
    const savedCost = totalCost;
    const cacheHitRate = potentialRequests > 0 ? savedCost / (actualCost + savedCost) : 0;
    
    return {
      entries,
      total_cost_usd: totalCost,
      oldest_entry_age_ms: oldestAge,
      cache_hit_rate: cacheHitRate
    };
  }

  // Public getters for service statistics
  get totalCost(): number {
    return this.totalCostUsd;
  }

  get requestsCount(): number {
    return this.requestCount;
  }

  get healthy(): boolean {
    return this.isHealthy;
  }
}

export default OpenRouterService;