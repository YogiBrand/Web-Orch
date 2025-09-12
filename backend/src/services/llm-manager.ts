import winston from 'winston';
import OpenRouterService from './openrouter';
import DeepSeekService from './deepseek';
import { AppError } from '../types';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'llm-manager.log' })
  ]
});

export type LLMProvider = 'openrouter' | 'deepseek';

export interface LLMConfig {
  openrouter?: {
    api_key: string;
    model: string;
    endpoint?: string;
    timeout?: number;
    max_tokens?: number;
  };
  deepseek?: {
    endpoint: string;
    model: string;
    timeout?: number;
    max_tokens?: number;
  };
  defaultProvider: LLMProvider;
  fallbackEnabled?: boolean;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  response: string;
  provider: string;
  model: string;
  tokens_used?: number;
  cost_usd?: number;
  response_time_ms: number;
  cached?: boolean;
}

export interface LLMProviderInfo {
  name: string;
  provider: LLMProvider;
  models: string[];
  status: 'healthy' | 'unhealthy' | 'unknown';
  cost_per_1k_tokens?: number;
  max_tokens?: number;
  features: string[];
}

export class LLMManager {
  private openrouter?: OpenRouterService;
  private deepseek?: DeepSeekService;
  private config: LLMConfig;
  private lastHealthCheck: Map<LLMProvider, { status: string; timestamp: number }> = new Map();

  constructor(config: LLMConfig) {
    this.config = config;
    this.initializeProviders();
  }

  private initializeProviders(): void {
    try {
      // Initialize OpenRouter if configured
      if (this.config.openrouter) {
        this.openrouter = new OpenRouterService({
          api_key: this.config.openrouter.api_key,
          model: this.config.openrouter.model,
          endpoint: this.config.openrouter.endpoint,
          timeout: this.config.openrouter.timeout,
          max_tokens: this.config.openrouter.max_tokens
        });
      }

      // Initialize DeepSeek if configured
      if (this.config.deepseek) {
        this.deepseek = new DeepSeekService({
          endpoint: this.config.deepseek.endpoint,
          model: this.config.deepseek.model,
          timeout: this.config.deepseek.timeout,
          max_tokens: this.config.deepseek.max_tokens
        });
      }

      logger.info('LLM Manager initialized', {
        providers: {
          openrouter: !!this.openrouter,
          deepseek: !!this.deepseek
        },
        defaultProvider: this.config.defaultProvider
      });
    } catch (error) {
      logger.error('Failed to initialize LLM providers:', error);
      throw new AppError('LLM Manager initialization failed', 500);
    }
  }

  async initialize(): Promise<void> {
    const initPromises: Promise<void>[] = [];

    if (this.openrouter) {
      initPromises.push(
        this.openrouter.initialize().catch(error => {
          logger.warn('OpenRouter initialization failed:', error);
        })
      );
    }

    if (this.deepseek) {
      initPromises.push(
        this.deepseek.initialize().catch(error => {
          logger.warn('DeepSeek initialization failed:', error);
        })
      );
    }

    await Promise.allSettled(initPromises);
    logger.info('LLM Manager initialization completed');
  }

  async generateChatResponse(
    messages: ChatMessage[], 
    provider?: LLMProvider,
    options?: {
      temperature?: number;
      max_tokens?: number;
      model?: string;
    }
  ): Promise<ChatResponse> {
    const targetProvider = provider || this.config.defaultProvider;
    
    try {
      // Try primary provider
      const response = await this.generateWithProvider(targetProvider, messages, options);
      return response;
    } catch (error) {
      logger.warn(`Provider ${targetProvider} failed:`, error);
      
      // Try fallback if enabled and available
      if (this.config.fallbackEnabled && targetProvider !== this.getFallbackProvider(targetProvider)) {
        const fallbackProvider = this.getFallbackProvider(targetProvider);
        logger.info(`Attempting fallback to ${fallbackProvider}`);
        
        try {
          const response = await this.generateWithProvider(fallbackProvider, messages, options);
          return { ...response, provider: `${response.provider} (fallback)` };
        } catch (fallbackError) {
          logger.error('Fallback provider also failed:', fallbackError);
        }
      }
      
      throw error;
    }
  }

  private async generateWithProvider(
    provider: LLMProvider, 
    messages: ChatMessage[],
    options?: {
      temperature?: number;
      max_tokens?: number;
      model?: string;
    }
  ): Promise<ChatResponse> {
    switch (provider) {
      case 'openrouter':
        if (!this.openrouter) {
          throw new AppError('OpenRouter not configured', 400);
        }
        
        // Convert to OpenRouter format and generate
        return await this.generateOpenRouterResponse(messages, options);

      case 'deepseek':
        if (!this.deepseek) {
          throw new AppError('DeepSeek not configured', 400);
        }
        
        return await this.deepseek.generateChatResponse(messages);

      default:
        throw new AppError(`Unknown provider: ${provider}`, 400);
    }
  }

  private async generateOpenRouterResponse(
    messages: ChatMessage[],
    options?: {
      temperature?: number;
      max_tokens?: number;
      model?: string;
    }
  ): Promise<ChatResponse> {
    // For now, use a simplified approach since OpenRouterService is focused on task summaries
    // In a real implementation, you'd extend OpenRouterService to support chat
    
    if (!this.openrouter) {
      throw new AppError('OpenRouter not configured', 400);
    }

    // This is a placeholder - you'd need to extend OpenRouterService for chat
    // For now, return a mock response indicating OpenRouter integration needed
    return {
      response: 'OpenRouter chat integration pending - please use DeepSeek for now',
      provider: 'openrouter',
      model: this.config.openrouter?.model || 'unknown',
      response_time_ms: 100,
      cost_usd: 0
    };
  }

  private getFallbackProvider(primary: LLMProvider): LLMProvider {
    switch (primary) {
      case 'openrouter':
        return 'deepseek';
      case 'deepseek':
        return 'openrouter';
      default:
        return 'deepseek';
    }
  }

  async healthCheck(): Promise<{ [provider: string]: any }> {
    const results: { [provider: string]: any } = {};
    
    if (this.openrouter) {
      try {
        const health = await this.openrouter.healthCheck();
        results.openrouter = health;
        this.lastHealthCheck.set('openrouter', { 
          status: health.status, 
          timestamp: Date.now() 
        });
      } catch (error) {
        results.openrouter = { status: 'unhealthy', error: error.message };
      }
    }

    if (this.deepseek) {
      try {
        const health = await this.deepseek.healthCheck();
        results.deepseek = health;
        this.lastHealthCheck.set('deepseek', { 
          status: health.status, 
          timestamp: Date.now() 
        });
      } catch (error) {
        results.deepseek = { status: 'unhealthy', error: error.message };
      }
    }

    return results;
  }

  getAvailableProviders(): LLMProviderInfo[] {
    const providers: LLMProviderInfo[] = [];

    if (this.openrouter) {
      const lastCheck = this.lastHealthCheck.get('openrouter');
      providers.push({
        name: 'OpenRouter',
        provider: 'openrouter',
        models: [this.config.openrouter?.model || 'openai/gpt-4o-mini'],
        status: (lastCheck?.status === 'healthy' ? 'healthy' : 'unknown') as any,
        cost_per_1k_tokens: 0.0015, // Approximate
        max_tokens: this.config.openrouter?.max_tokens || 4000,
        features: ['Task Summaries', 'Failure Analysis', 'Optimization', 'Multiple Models']
      });
    }

    if (this.deepseek) {
      const lastCheck = this.lastHealthCheck.get('deepseek');
      providers.push({
        name: 'DeepSeek Local',
        provider: 'deepseek',
        models: [this.config.deepseek?.model || 'deepseek-r1:latest'],
        status: (lastCheck?.status === 'healthy' ? 'healthy' : 'unknown') as any,
        cost_per_1k_tokens: 0, // Free local model
        max_tokens: this.config.deepseek?.max_tokens || 2048,
        features: ['Local Processing', 'No API Costs', 'High Performance', 'Privacy']
      });
    }

    return providers;
  }

  getDefaultProvider(): LLMProvider {
    return this.config.defaultProvider;
  }

  setDefaultProvider(provider: LLMProvider): void {
    if (!this.isProviderAvailable(provider)) {
      throw new AppError(`Provider ${provider} is not configured or available`, 400);
    }
    
    this.config.defaultProvider = provider;
    logger.info('Default LLM provider changed', { newProvider: provider });
  }

  isProviderAvailable(provider: LLMProvider): boolean {
    switch (provider) {
      case 'openrouter':
        return !!this.openrouter;
      case 'deepseek':
        return !!this.deepseek;
      default:
        return false;
    }
  }

  getProviderStats(): { [provider: string]: any } {
    const stats: { [provider: string]: any } = {};

    if (this.openrouter) {
      stats.openrouter = {
        requests: this.openrouter.requestsCount,
        total_cost_usd: this.openrouter.totalCost,
        healthy: this.openrouter.healthy,
        cache_stats: this.openrouter.getCacheStats()
      };
    }

    if (this.deepseek) {
      stats.deepseek = {
        requests: this.deepseek.requestsCount,
        total_cost_usd: 0, // Always free
        healthy: this.deepseek.healthy,
        cache_stats: this.deepseek.getCacheStats()
      };
    }

    return stats;
  }

  async clearAllCaches(): Promise<void> {
    if (this.openrouter) {
      this.openrouter.clearCache();
    }
    
    if (this.deepseek) {
      this.deepseek.clearCache();
    }
    
    logger.info('All LLM provider caches cleared');
  }
}

export default LLMManager;