/**
 * 🚀 LIBRECHAT INTEGRATION ROUTES
 * Complete LibreChat-compatible API with agent orchestration
 * Matching LibreChat GitHub functionality with WebOrchestrator agents
 */

import { Router, Request, Response } from 'express';
import WebSocketService from '../services/websocket';
import AgentOrchestrator from '../services/agent-orchestrator';
import MCPService from '../services/mcp';
import LLMManager, { ChatMessage, LLMProvider } from '../services/llm-manager';
import { AppError } from '../types';
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

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

// =============================================
// LIBRECHAT MESSAGE TYPES
// =============================================

interface LibreChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'agent' | 'system';
  content: string;
  timestamp: Date;
  agentId?: string;
  agentName?: string;
  toolCalls?: ToolCall[];
  metadata?: Record<string, any>;
  workspaceId?: string;
  conversationId?: string;
}

interface ToolCall {
  id: string;
  tool: string;
  parameters: Record<string, any>;
  result?: any;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  agentId: string;
}

interface LibreChatConversation {
  id: string;
  workspaceId: string;
  title: string;
  messages: LibreChatMessage[];
  activeAgents: string[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

interface ChatRequest {
  message: string;
  workspaceId: string;
  conversationId?: string;
  relevantAgents?: string[];
  context?: {
    activeAgents: string[];
    recentMessages: LibreChatMessage[];
    workspaceContext: Record<string, any>;
  };
}

// =============================================
// IN-MEMORY STORAGE (TODO: Replace with database)
// =============================================

const conversations: Map<string, LibreChatConversation> = new Map();
const activeToolCalls: Map<string, ToolCall> = new Map();

// =============================================
// AGENT DEFINITIONS
// =============================================

const AVAILABLE_AGENTS = {
  'claude-code-ide': {
    name: 'Claude Code IDE',
    description: 'Advanced code editor with file operations and terminal commands',
    capabilities: ['code-editing', 'file-operations', 'terminal-commands'],
    provider: 'anthropic',
    mcp_config: {
      command: ['node', '/app/agents/claude-code/agent.js'],
      env: { ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '' },
      tools: ['code-execute', 'file-read', 'file-write', 'terminal-run']
    }
  },
  'google-cli-researcher': {
    name: 'Google CLI Researcher',
    description: 'Research specialist with Google services integration',
    capabilities: ['web-research', 'data-collection', 'market-analysis'],
    provider: 'google-cli',
    mcp_config: {
      command: ['node', '/app/agents/google-cli/agent.js'],
      env: { 
        GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || '',
        SEARCH_ENGINE_ID: process.env.SEARCH_ENGINE_ID || ''
      },
      tools: ['google-search', 'gmail-search', 'drive-search', 'scholar-search']
    }
  },
  'browser-automation': {
    name: 'Browser Automation Specialist',
    description: 'Expert in browser automation and web scraping',
    capabilities: ['browser-control', 'web-scraping', 'form-automation'],
    provider: 'playwright',
    mcp_config: {
      command: ['node', '/app/agents/browser-automation/agent.js'],
      env: { BROWSER_TYPE: 'chromium' },
      tools: ['page-navigate', 'element-click', 'form-fill', 'extract-data']
    }
  },
  'crawl4ai': {
    name: 'Crawl4AI Data Extractor',
    description: 'Advanced AI-powered web crawling and data extraction',
    capabilities: ['ai-crawling', 'content-extraction', 'structured-data'],
    provider: 'crawl4ai',
    mcp_config: {
      command: ['python', '/app/agents/crawl4ai/agent.py'],
      env: { OPENAI_API_KEY: process.env.OPENAI_API_KEY || '' },
      tools: ['crawl-website', 'extract-content', 'structure-data']
    }
  },
  'system-architect': {
    name: 'System Architect',
    description: 'Software architecture and system design specialist',
    capabilities: ['system-design', 'architecture-planning', 'scalability-analysis'],
    provider: 'claude-3-opus',
    mcp_config: {
      command: ['node', '/app/agents/system-architect/agent.js'],
      env: { ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '' },
      tools: ['design-system', 'analyze-architecture', 'create-diagrams']
    }
  },
  'database-engineer': {
    name: 'Database Engineer',
    description: 'Database design, optimization, and management expert',
    capabilities: ['database-design', 'query-optimization', 'data-modeling'],
    provider: 'deepseek',
    mcp_config: {
      command: ['node', '/app/agents/database/agent.js'],
      env: { DATABASE_URL: process.env.DATABASE_URL || '' },
      tools: ['db-query', 'db-migrate', 'db-optimize', 'schema-design']
    }
  }
};

// =============================================
// LIBRECHAT ENDPOINTS
// =============================================

/**
 * POST /api/librechat/chat
 * Main chat endpoint with agent orchestration
 */
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, workspaceId, conversationId, relevantAgents, context }: ChatRequest = req.body;

    if (!message || !workspaceId) {
      return res.status(400).json({
        success: false,
        error: 'Message and workspaceId are required'
      });
    }

    // Get or create conversation
    let conversation = conversationId ? conversations.get(conversationId) : null;
    if (!conversation) {
      const newConversationId = conversationId || uuidv4();
      conversation = {
        id: newConversationId,
        workspaceId,
        title: message.length > 50 ? `${message.substring(0, 50)}...` : message,
        messages: [],
        activeAgents: relevantAgents || [],
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: context
      };
      conversations.set(newConversationId, conversation);
    }

    // Create user message
    const userMessage: LibreChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: message,
      timestamp: new Date(),
      workspaceId,
      conversationId: conversation.id
    };
    
    conversation.messages.push(userMessage);

    // Analyze message for agent mentions and intent
    const agentAnalysis = analyzeMessageForAgents(message, relevantAgents);
    
    // Get orchestrator instance
    const orchestrator = req.app.locals.agentOrchestrator as AgentOrchestrator;
    if (!orchestrator) {
      throw new AppError('Agent orchestrator not initialized', 500);
    }

    // Route message to appropriate agents
    const startTime = Date.now();
    const agentResponses = await Promise.allSettled(
      agentAnalysis.agents.map(agentId => 
        orchestrator.routeToAgent(agentId, {
          message: userMessage,
          context: {
            conversation: conversation.messages.slice(-10),
            workspace: context?.workspaceContext,
            intent: agentAnalysis.intent
          }
        })
      )
    );

    // Process agent responses
    const responses: LibreChatMessage[] = [];
    const toolCalls: ToolCall[] = [];

    for (let i = 0; i < agentResponses.length; i++) {
      const response = agentResponses[i];
      const agentId = agentAnalysis.agents[i];

      if (response.status === 'fulfilled' && response.value) {
        const agentResponse: LibreChatMessage = {
          id: uuidv4(),
          role: 'agent',
          content: response.value.message || response.value.response,
          timestamp: new Date(),
          agentId,
          agentName: AVAILABLE_AGENTS[agentId as keyof typeof AVAILABLE_AGENTS]?.name,
          workspaceId,
          conversationId: conversation.id,
          toolCalls: response.value.toolCalls,
          metadata: response.value.metadata
        };

        responses.push(agentResponse);
        conversation.messages.push(agentResponse);

        // Track tool calls
        if (response.value.toolCalls) {
          toolCalls.push(...response.value.toolCalls);
          response.value.toolCalls.forEach(tc => activeToolCalls.set(tc.id, tc));
        }
      }
    }

    // Generate unified response if multiple agents responded
    let unifiedResponse: LibreChatMessage;
    
    if (responses.length === 1) {
      unifiedResponse = responses[0];
    } else if (responses.length > 1) {
      // Combine multiple agent responses
      const combinedContent = responses.map(r => 
        `**${r.agentName}**: ${r.content}`
      ).join('\n\n---\n\n');

      unifiedResponse = {
        id: uuidv4(),
        role: 'assistant',
        content: combinedContent,
        timestamp: new Date(),
        workspaceId,
        conversationId: conversation.id,
        toolCalls,
        metadata: { multiAgent: true, agentCount: responses.length }
      };
    } else {
      // Fallback to standard LLM response
      const llmManager = req.app.locals.llmManager as LLMManager;
      const llmResponse = await llmManager.generateChatResponse([
        { role: 'system', content: 'You are a helpful AI assistant for the WebOrchestrator platform.' },
        ...conversation.messages.slice(-10).map(m => ({ role: m.role as any, content: m.content }))
      ]);

      unifiedResponse = {
        id: uuidv4(),
        role: 'assistant',
        content: llmResponse.response,
        timestamp: new Date(),
        workspaceId,
        conversationId: conversation.id,
        metadata: { 
          provider: llmResponse.provider,
          model: llmResponse.model,
          tokensUsed: llmResponse.tokens_used
        }
      };
    }

    conversation.messages.push(unifiedResponse);
    conversation.updatedAt = new Date();
    conversation.activeAgents = agentAnalysis.agents;

    // Broadcast to WebSocket clients
    const wsService = req.app.locals.websocketService as WebSocketService;
    if (wsService) {
      wsService.broadcastToWorkspace(workspaceId, {
        type: 'librechat.message',
        data: {
          conversationId: conversation.id,
          message: unifiedResponse,
          toolCalls
        }
      });
    }

    const totalTime = Date.now() - startTime;

    logger.info('LibreChat message processed', {
      workspaceId,
      conversationId: conversation.id,
      agentsInvolved: agentAnalysis.agents.length,
      responseTime: totalTime,
      toolCalls: toolCalls.length
    });

    res.json({
      success: true,
      messageId: unifiedResponse.id,
      message: unifiedResponse.content,
      conversationId: conversation.id,
      toolCalls,
      metadata: {
        responseTime: totalTime,
        agentsInvolved: agentAnalysis.agents,
        multiAgent: responses.length > 1
      }
    });

  } catch (error) {
    logger.error('LibreChat processing failed:', error);
    
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error during LibreChat processing'
    });
  }
});

/**
 * POST /api/librechat/mcp/register
 * Register MCP server for agent
 */
router.post('/mcp/register', async (req: Request, res: Response) => {
  try {
    const { agentId, config, workspaceId } = req.body;

    if (!agentId || !config || !workspaceId) {
      return res.status(400).json({
        success: false,
        error: 'agentId, config, and workspaceId are required'
      });
    }

    const mcpService = req.app.locals.mcpService as MCPService;
    if (!mcpService) {
      throw new AppError('MCP service not initialized', 500);
    }

    await mcpService.registerServer(agentId, config);

    logger.info('MCP server registered', { agentId, workspaceId });

    res.json({
      success: true,
      message: `MCP server registered for ${agentId}`,
      agentId
    });

  } catch (error) {
    logger.error('MCP registration failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register MCP server'
    });
  }
});

/**
 * GET /api/librechat/conversations
 * Get conversations for workspace
 */
router.get('/conversations', async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.query;

    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        error: 'workspaceId is required'
      });
    }

    const workspaceConversations = Array.from(conversations.values())
      .filter(conv => conv.workspaceId === workspaceId)
      .map(conv => ({
        id: conv.id,
        title: conv.title,
        messageCount: conv.messages.length,
        activeAgents: conv.activeAgents,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        lastMessage: conv.messages[conv.messages.length - 1]?.content.substring(0, 100)
      }))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    res.json({
      success: true,
      conversations: workspaceConversations,
      total: workspaceConversations.length
    });

  } catch (error) {
    logger.error('Failed to get conversations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve conversations'
    });
  }
});

/**
 * GET /api/librechat/conversations/:id
 * Get conversation by ID
 */
router.get('/conversations/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const conversation = conversations.get(id);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    res.json({
      success: true,
      conversation
    });

  } catch (error) {
    logger.error('Failed to get conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve conversation'
    });
  }
});

/**
 * DELETE /api/librechat/conversations/:id
 * Delete conversation
 */
router.delete('/conversations/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (conversations.has(id)) {
      conversations.delete(id);
      
      logger.info('Conversation deleted', { conversationId: id });
      
      res.json({
        success: true,
        message: 'Conversation deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

  } catch (error) {
    logger.error('Failed to delete conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete conversation'
    });
  }
});

/**
 * GET /api/librechat/agents
 * Get available agents
 */
router.get('/agents', async (req: Request, res: Response) => {
  try {
    const agents = Object.entries(AVAILABLE_AGENTS).map(([id, agent]) => ({
      id,
      ...agent,
      status: 'available' // TODO: Get actual status from orchestrator
    }));

    res.json({
      success: true,
      agents,
      total: agents.length
    });

  } catch (error) {
    logger.error('Failed to get agents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve agents'
    });
  }
});

/**
 * GET /api/librechat/tools/:agentId
 * Get tools for specific agent
 */
router.get('/tools/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const agent = AVAILABLE_AGENTS[agentId as keyof typeof AVAILABLE_AGENTS];

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    res.json({
      success: true,
      agentId,
      tools: agent.mcp_config.tools || [],
      capabilities: agent.capabilities
    });

  } catch (error) {
    logger.error('Failed to get agent tools:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve agent tools'
    });
  }
});

// =============================================
// HELPER FUNCTIONS
// =============================================

function analyzeMessageForAgents(message: string, providedAgents?: string[]): {
  agents: string[];
  intent: string;
  confidence: number;
} {
  const lowerMessage = message.toLowerCase();
  const agents: string[] = [];
  let intent = 'general';
  let confidence = 0.5;

  // Check for explicit agent mentions (@agent-name)
  const mentionPattern = /@([a-zA-Z-]+(?:-[a-zA-Z]+)*)/g;
  const mentions = message.match(mentionPattern);
  
  if (mentions) {
    mentions.forEach(mention => {
      const agentName = mention.slice(1);
      if (AVAILABLE_AGENTS[agentName as keyof typeof AVAILABLE_AGENTS]) {
        agents.push(agentName);
        confidence = 0.9;
      }
    });
  }

  // Use provided agents if no mentions found
  if (agents.length === 0 && providedAgents) {
    agents.push(...providedAgents);
    confidence = 0.7;
  }

  // If still no agents, use keyword analysis
  if (agents.length === 0) {
    // Architecture & Design
    if (lowerMessage.includes('architecture') || lowerMessage.includes('design') || lowerMessage.includes('system')) {
      agents.push('system-architect');
      intent = 'architecture';
      confidence = 0.8;
    }

    // Development & Coding
    if (lowerMessage.includes('code') || lowerMessage.includes('implement') || lowerMessage.includes('develop')) {
      agents.push('claude-code-ide');
      intent = 'development';
      confidence = 0.8;
    }

    // Research
    if (lowerMessage.includes('research') || lowerMessage.includes('search') || lowerMessage.includes('find')) {
      agents.push('google-cli-researcher');
      intent = 'research';
      confidence = 0.8;
    }

    // Browser automation
    if (lowerMessage.includes('browser') || lowerMessage.includes('automate') || lowerMessage.includes('scrape')) {
      agents.push('browser-automation');
      intent = 'automation';
      confidence = 0.8;
    }

    // Web crawling
    if (lowerMessage.includes('crawl') || lowerMessage.includes('extract') || lowerMessage.includes('website')) {
      agents.push('crawl4ai');
      intent = 'crawling';
      confidence = 0.8;
    }

    // Database
    if (lowerMessage.includes('database') || lowerMessage.includes('sql') || lowerMessage.includes('data')) {
      agents.push('database-engineer');
      intent = 'database';
      confidence = 0.8;
    }
  }

  // Default fallback
  if (agents.length === 0) {
    agents.push('claude-code-ide'); // Default to code assistant
    intent = 'general';
    confidence = 0.3;
  }

  return { agents, intent, confidence };
}

export default router;