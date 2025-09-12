import { Router, Request, Response } from 'express';
import LLMManager, { ChatMessage, LLMProvider } from '../services/llm-manager';
import { openrouterConfig, deepseekConfig, llmConfig } from '../config';
import { AppError } from '../types';
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

// Initialize LLM Manager
const llmManager = new LLMManager({
  openrouter: {
    api_key: openrouterConfig.api_key,
    model: openrouterConfig.model,
    endpoint: openrouterConfig.endpoint,
    timeout: openrouterConfig.timeout,
    max_tokens: openrouterConfig.max_tokens
  },
  deepseek: {
    endpoint: deepseekConfig.endpoint,
    model: deepseekConfig.model,
    timeout: deepseekConfig.timeout,
    max_tokens: deepseekConfig.max_tokens
  },
  defaultProvider: llmConfig.default_provider,
  fallbackEnabled: llmConfig.fallback_enabled
});

// Initialize the LLM manager on startup
llmManager.initialize().catch(error => {
  logger.error('Failed to initialize LLM Manager:', error);
});

interface ChatRequest {
  messages: ChatMessage[];
  provider?: LLMProvider;
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  provider?: string;
  model?: string;
  tokens_used?: number;
  cost_usd?: number;
  response_time_ms?: number;
}

// Store conversations in memory (in production, use database)
const conversations: Map<string, ConversationMessage[]> = new Map();

/**
 * POST /api/chat/completions
 * Generate chat completion using selected LLM provider
 */
router.post('/completions', async (req: Request, res: Response) => {
  try {
    const { messages, provider, model, temperature, max_tokens }: ChatRequest = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: 'Messages array is required and must not be empty'
      });
    }

    // Validate message format
    for (const msg of messages) {
      if (!msg.role || !msg.content || !['system', 'user', 'assistant'].includes(msg.role)) {
        return res.status(400).json({
          error: 'Invalid message format. Each message must have role and content.'
        });
      }
    }

    const startTime = Date.now();
    
    const response = await llmManager.generateChatResponse(messages, provider, {
      model,
      temperature,
      max_tokens
    });

    const totalTime = Date.now() - startTime;

    logger.info('Chat completion generated', {
      provider: response.provider,
      model: response.model,
      messages_count: messages.length,
      response_time_ms: totalTime,
      tokens_used: response.tokens_used,
      cost_usd: response.cost_usd
    });

    res.json({
      choices: [{
        message: {
          role: 'assistant',
          content: response.response
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: 0, // Would need to calculate
        completion_tokens: response.tokens_used || 0,
        total_tokens: response.tokens_used || 0
      },
      model: response.model,
      provider: response.provider,
      response_time_ms: response.response_time_ms,
      cost_usd: response.cost_usd || 0,
      cached: response.cached || false
    });
  } catch (error) {
    logger.error('Chat completion failed:', error);
    
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        error: error.message
      });
    }

    res.status(500).json({
      error: 'Internal server error during chat completion'
    });
  }
});

/**
 * GET /api/chat/providers
 * Get available LLM providers and their status
 */
router.get('/providers', async (req: Request, res: Response) => {
  try {
    const providers = llmManager.getAvailableProviders();
    const healthStatus = await llmManager.healthCheck();
    const stats = llmManager.getProviderStats();

    res.json({
      providers: providers.map(provider => ({
        ...provider,
        health: healthStatus[provider.provider],
        stats: stats[provider.provider]
      })),
      default_provider: llmManager.getDefaultProvider()
    });
  } catch (error) {
    logger.error('Failed to get providers:', error);
    res.status(500).json({
      error: 'Failed to retrieve provider information'
    });
  }
});

/**
 * POST /api/chat/provider
 * Set default LLM provider
 */
router.post('/provider', async (req: Request, res: Response) => {
  try {
    const { provider }: { provider: LLMProvider } = req.body;

    if (!provider || !['openrouter', 'deepseek'].includes(provider)) {
      return res.status(400).json({
        error: 'Invalid provider. Must be "openrouter" or "deepseek"'
      });
    }

    llmManager.setDefaultProvider(provider);

    res.json({
      message: `Default provider set to ${provider}`,
      provider
    });
  } catch (error) {
    logger.error('Failed to set provider:', error);
    
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        error: error.message
      });
    }

    res.status(500).json({
      error: 'Failed to set default provider'
    });
  }
});

/**
 * POST /api/chat/conversations
 * Create a new conversation
 */
router.post('/conversations', async (req: Request, res: Response) => {
  try {
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    conversations.set(conversationId, []);

    res.json({
      conversation_id: conversationId,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to create conversation:', error);
    res.status(500).json({
      error: 'Failed to create conversation'
    });
  }
});

/**
 * POST /api/chat/conversations/:id/messages
 * Add message to conversation and get response
 */
router.post('/conversations/:id/messages', async (req: Request, res: Response) => {
  try {
    const conversationId = req.params.id;
    const { content, provider } = req.body;

    if (!content) {
      return res.status(400).json({
        error: 'Message content is required'
      });
    }

    // Get existing conversation
    let conversation = conversations.get(conversationId) || [];

    // Add user message
    const userMessage: ConversationMessage = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content,
      timestamp: Date.now()
    };
    conversation.push(userMessage);

    // Prepare messages for LLM (convert format)
    const llmMessages: ChatMessage[] = conversation.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Add system message if it's the first interaction
    if (conversation.length === 1) {
      llmMessages.unshift({
        role: 'system',
        content: 'You are a helpful AI assistant for the WebOrchestrator browser automation platform. You help users with browser automation, web scraping, form filling, and general web automation tasks.'
      });
    }

    // Generate response
    const startTime = Date.now();
    const response = await llmManager.generateChatResponse(llmMessages, provider);

    // Add assistant message
    const assistantMessage: ConversationMessage = {
      id: `msg_${Date.now()}_assistant`,
      role: 'assistant',
      content: response.response,
      timestamp: Date.now(),
      provider: response.provider,
      model: response.model,
      tokens_used: response.tokens_used,
      cost_usd: response.cost_usd,
      response_time_ms: response.response_time_ms
    };
    conversation.push(assistantMessage);

    // Save conversation
    conversations.set(conversationId, conversation);

    logger.info('Conversation message processed', {
      conversation_id: conversationId,
      provider: response.provider,
      response_time_ms: response.response_time_ms
    });

    res.json({
      message: assistantMessage,
      conversation_length: conversation.length
    });
  } catch (error) {
    logger.error('Failed to process conversation message:', error);
    
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        error: error.message
      });
    }

    res.status(500).json({
      error: 'Failed to process message'
    });
  }
});

/**
 * GET /api/chat/conversations/:id
 * Get conversation history
 */
router.get('/conversations/:id', async (req: Request, res: Response) => {
  try {
    const conversationId = req.params.id;
    const conversation = conversations.get(conversationId);

    if (!conversation) {
      return res.status(404).json({
        error: 'Conversation not found'
      });
    }

    res.json({
      conversation_id: conversationId,
      messages: conversation,
      message_count: conversation.length
    });
  } catch (error) {
    logger.error('Failed to get conversation:', error);
    res.status(500).json({
      error: 'Failed to retrieve conversation'
    });
  }
});

/**
 * DELETE /api/chat/conversations/:id
 * Delete conversation
 */
router.delete('/conversations/:id', async (req: Request, res: Response) => {
  try {
    const conversationId = req.params.id;
    
    if (conversations.has(conversationId)) {
      conversations.delete(conversationId);
      res.json({ message: 'Conversation deleted' });
    } else {
      res.status(404).json({ error: 'Conversation not found' });
    }
  } catch (error) {
    logger.error('Failed to delete conversation:', error);
    res.status(500).json({
      error: 'Failed to delete conversation'
    });
  }
});

/**
 * POST /api/chat/cache/clear
 * Clear LLM caches
 */
router.post('/cache/clear', async (req: Request, res: Response) => {
  try {
    await llmManager.clearAllCaches();
    
    res.json({
      message: 'All LLM caches cleared successfully'
    });
  } catch (error) {
    logger.error('Failed to clear caches:', error);
    res.status(500).json({
      error: 'Failed to clear caches'
    });
  }
});

export default router;