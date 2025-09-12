/**
 * 🚀 LIBRECHAT INTEGRATION WITH NEXUS AGENTS
 * World-Breaking AI Chat with Specialized Development Agents
 */

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useEvents } from '@/hooks/use-events';
import { api } from '@/lib/api';
import {
  MessageSquare,
  Send,
  User,
  Bot,
  Code,
  Brain,
  Globe,
  Server,
  Terminal,
  Search,
  Database,
  Shield,
  TestTube,
  Rocket,
  GitBranch,
  Settings,
  Zap,
  Target,
  Users,
  Layers,
  FileText,
  Download
} from 'lucide-react';

// =============================================
// LIBRECHAT MESSAGE TYPES
// =============================================

interface LibreChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'agent';
  content: string;
  timestamp: Date;
  agentId?: string;
  agentName?: string;
  toolCalls?: ToolCall[];
  metadata?: Record<string, any>;
}

interface ToolCall {
  id: string;
  tool: string;
  parameters: Record<string, any>;
  result?: any;
  status: 'pending' | 'executing' | 'completed' | 'failed';
}

// =============================================
// AGENT MCP SERVER CONFIGURATION
// =============================================

const MCP_SERVERS = {
  'google-cli-researcher': {
    command: ['node', '/app/agents/google-cli/agent.js'],
    args: [],
    env: {
      GOOGLE_API_KEY: import.meta.env.VITE_GOOGLE_API_KEY || '',
      SEARCH_ENGINE_ID: import.meta.env.VITE_SEARCH_ENGINE_ID || ''
    },
    tools: ['google-search', 'gmail-search', 'drive-search', 'scholar-search']
  },
  'claude-code-ide': {
    command: ['node', '/app/agents/claude-code/agent.js'],
    args: [],
    env: {
      ANTHROPIC_API_KEY: import.meta.env.VITE_ANTHROPIC_API_KEY || '',
      WORKING_DIR: '/workspace'
    },
    tools: ['code-execute', 'file-read', 'file-write', 'terminal-run']
  },
  'database-engineer': {
    command: ['node', '/app/agents/database/agent.js'],
    args: [],
    env: {
      DATABASE_URL: import.meta.env.VITE_DATABASE_URL || ''
    },
    tools: ['db-query', 'db-migrate', 'db-optimize']
  },
  'testing-specialist': {
    command: ['node', '/app/agents/testing/agent.js'],
    args: [],
    env: {
      TEST_ENV: 'development'
    },
    tools: ['run-tests', 'generate-tests', 'analyze-coverage']
  }
};

// =============================================
// LIBRECHAT INTEGRATION COMPONENT
// =============================================

interface LibreChatIntegrationProps {
  workspaceId: string;
  onAgentMessage?: (message: LibreChatMessage) => void;
  onToolCall?: (toolCall: ToolCall) => void;
  className?: string;
}

const LibreChatIntegration: React.FC<LibreChatIntegrationProps> = ({
  workspaceId,
  onAgentMessage,
  onToolCall,
  className = ''
}) => {
  const [messages, setMessages] = useState<LibreChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeAgents, setActiveAgents] = useState<string[]>([]);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { events, isConnected } = useEvents({ config: { enableFilters: true } });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle real-time events from agents
  useEffect(() => {
    if (events.length > 0) {
      const latestEvent = events[events.length - 1];
      handleAgentEvent(latestEvent);
    }
  }, [events]);

  // Initialize LibreChat with MCP servers
  useEffect(() => {
    initializeLibreChat();
  }, [workspaceId]);

  const initializeLibreChat = async () => {
    try {
      // Register MCP servers with LibreChat
      await Promise.all(
        Object.entries(MCP_SERVERS).map(([agentId, config]) =>
          registerMCPServer(agentId, config)
        )
      );

      // Initialize with welcome message
      const welcomeMessage: LibreChatMessage = {
        id: 'welcome',
        role: 'assistant',
        content: `🚀 **Welcome to Nexus Development Workspace!**

I'm your AI assistant integrated with ${Object.keys(MCP_SERVERS).length} specialized development agents:

🧠 **System Architect** - Design scalable architectures
👨‍💻 **Claude Code IDE** - Write and refactor code
🔍 **Google CLI Researcher** - Research and gather information
🗄️ **Database Engineer** - Design and optimize databases
🧪 **Testing Specialist** - Write and run comprehensive tests
🔒 **Security Auditor** - Identify and fix security issues
⚡ **Performance Optimizer** - Optimize application performance

How can I help you with your development project today?`,
        timestamp: new Date()
      };

      setMessages([welcomeMessage]);
      setActiveAgents(Object.keys(MCP_SERVERS));

      toast({
        title: 'LibreChat Initialized',
        description: `Connected to ${Object.keys(MCP_SERVERS).length} specialized agents`
      });

    } catch (error) {
      console.error('Failed to initialize LibreChat:', error);
      toast({
        title: 'Initialization Failed',
        description: 'Failed to connect to development agents',
        variant: 'destructive'
      });
    }
  };

  const registerMCPServer = async (agentId: string, config: any) => {
    try {
      const response = await api.post('/api/librechat/mcp/register', {
        agentId,
        config,
        workspaceId
      });

      if (response.data.success) {
        console.log(`Registered MCP server for ${agentId}`);
      }
    } catch (error) {
      console.error(`Failed to register MCP server for ${agentId}:`, error);
    }
  };

  const handleAgentEvent = (event: any) => {
    switch (event.type) {
      case 'agent.message':
        handleIncomingAgentMessage(event);
        break;
      case 'tool.call':
        handleToolCall(event);
        break;
      case 'tool.result':
        handleToolResult(event);
        break;
      case 'agent.status':
        handleAgentStatusUpdate(event);
        break;
      default:
        console.log('LibreChat event:', event);
    }
  };

  const handleIncomingAgentMessage = (event: any) => {
    const agentMessage: LibreChatMessage = {
      id: event.data.messageId || `msg_${Date.now()}`,
      role: 'agent',
      content: event.data.content,
      timestamp: new Date(event.data.timestamp || Date.now()),
      agentId: event.data.agentId,
      agentName: event.data.agentName,
      metadata: event.data.metadata
    };

    setMessages(prev => [...prev, agentMessage]);
    onAgentMessage?.(agentMessage);
  };

  const handleToolCall = (event: any) => {
    const toolCall: ToolCall = {
      id: event.data.toolCallId,
      tool: event.data.tool,
      parameters: event.data.parameters,
      status: 'executing'
    };

    setToolCalls(prev => [...prev, toolCall]);
    onToolCall?.(toolCall);
  };

  const handleToolResult = (event: any) => {
    setToolCalls(prev =>
      prev.map(tc =>
        tc.id === event.data.toolCallId
          ? { ...tc, result: event.data.result, status: 'completed' }
          : tc
      )
    );
  };

  const handleAgentStatusUpdate = (event: any) => {
    if (event.data.status === 'active') {
      setActiveAgents(prev => [...prev.filter(id => id !== event.data.agentId), event.data.agentId]);
    } else if (event.data.status === 'inactive') {
      setActiveAgents(prev => prev.filter(id => id !== event.data.agentId));
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: LibreChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Analyze message and determine which agents to involve
      const relevantAgents = analyzeMessageForAgents(input);

      // Send to LibreChat for processing
      const response = await api.post('/api/librechat/chat', {
        message: input,
        workspaceId,
        relevantAgents,
        context: {
          activeAgents,
          recentMessages: messages.slice(-10),
          workspaceContext: await getWorkspaceContext()
        }
      });

      if (response.data.message) {
        const assistantMessage: LibreChatMessage = {
          id: response.data.messageId,
          role: 'assistant',
          content: response.data.message,
          timestamp: new Date(),
          toolCalls: response.data.toolCalls
        };

        setMessages(prev => [...prev, assistantMessage]);
      }

    } catch (error) {
      console.error('Failed to send message:', error);

      const errorMessage: LibreChatMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: '❌ Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);

      toast({
        title: 'Message Failed',
        description: 'Failed to send message to agents',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeMessageForAgents = (message: string): string[] => {
    const lowerMessage = message.toLowerCase();
    const relevantAgents: string[] = [];

    // Enhanced agent mention parsing with @agent-name pattern
    const mentionPattern = /@([a-zA-Z-]+(?:-[a-zA-Z]+)*)/g;
    const mentions = message.match(mentionPattern);
    
    if (mentions) {
      mentions.forEach(mention => {
        const agentName = mention.slice(1); // Remove @ symbol
        if (Object.keys(MCP_SERVERS).includes(agentName) || activeAgents.includes(agentName)) {
          relevantAgents.push(agentName);
        }
      });
    }

    // If no mentions found, use intelligent keyword analysis
    if (relevantAgents.length === 0) {
      // Architecture & Planning
      if (lowerMessage.includes('architecture') || lowerMessage.includes('design') || lowerMessage.includes('system') || lowerMessage.includes('plan')) {
        relevantAgents.push('system-architect');
      }

      // Development & Coding
      if (lowerMessage.includes('code') || lowerMessage.includes('implement') || lowerMessage.includes('write') || lowerMessage.includes('develop')) {
        relevantAgents.push('claude-code-ide');
        relevantAgents.push('fullstack-developer');
      }

      // Frontend specific
      if (lowerMessage.includes('frontend') || lowerMessage.includes('react') || lowerMessage.includes('ui') || lowerMessage.includes('component')) {
        relevantAgents.push('frontend-specialist');
      }

      // Backend specific
      if (lowerMessage.includes('backend') || lowerMessage.includes('api') || lowerMessage.includes('server') || lowerMessage.includes('endpoint')) {
        relevantAgents.push('backend-specialist');
      }

      // Research & Data
      if (lowerMessage.includes('research') || lowerMessage.includes('search') || lowerMessage.includes('find') || lowerMessage.includes('analyze')) {
        relevantAgents.push('google-cli-researcher');
      }

      // Database
      if (lowerMessage.includes('database') || lowerMessage.includes('data') || lowerMessage.includes('query') || lowerMessage.includes('sql')) {
        relevantAgents.push('database-engineer');
      }

      // Testing
      if (lowerMessage.includes('test') || lowerMessage.includes('testing') || lowerMessage.includes('spec') || lowerMessage.includes('coverage')) {
        relevantAgents.push('testing-specialist');
      }

      // Security
      if (lowerMessage.includes('security') || lowerMessage.includes('vulnerability') || lowerMessage.includes('audit') || lowerMessage.includes('secure')) {
        relevantAgents.push('security-auditor');
      }

      // Performance
      if (lowerMessage.includes('performance') || lowerMessage.includes('optimize') || lowerMessage.includes('speed') || lowerMessage.includes('fast')) {
        relevantAgents.push('performance-optimizer');
      }

      // DevOps
      if (lowerMessage.includes('deploy') || lowerMessage.includes('docker') || lowerMessage.includes('kubernetes') || lowerMessage.includes('ci/cd')) {
        relevantAgents.push('devops-engineer');
      }

      // Documentation
      if (lowerMessage.includes('document') || lowerMessage.includes('docs') || lowerMessage.includes('readme') || lowerMessage.includes('guide')) {
        relevantAgents.push('documentation-specialist');
      }

      // If no specific agents matched, include general purpose agents
      if (relevantAgents.length === 0) {
        relevantAgents.push('tech-lead', 'fullstack-developer');
      }
    }

    return [...new Set(relevantAgents)]; // Remove duplicates
  };

  const getWorkspaceContext = async () => {
    try {
      const response = await api.get(`/api/workspaces/${workspaceId}/context`);
      return response.data;
    } catch (error) {
      console.error('Failed to get workspace context:', error);
      return {};
    }
  };

  const exportConversation = (format: 'json' | 'markdown' | 'txt' = 'json') => {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `nexus-conversation-${timestamp}`;

    if (format === 'json') {
      const dataStr = JSON.stringify(messages, null, 2);
      downloadFile(dataStr, `${filename}.json`, 'application/json');
    } else if (format === 'markdown') {
      const markdown = messages.map(msg => {
        const role = msg.role === 'user' ? '**User**' : 
                    msg.agentName ? `**${msg.agentName}**` : 
                    '**Assistant**';
        const timestamp = msg.timestamp.toLocaleString();
        
        let content = `${role} (${timestamp}):\n${msg.content}`;
        
        if (msg.toolCalls && msg.toolCalls.length > 0) {
          content += '\n\n*Tool Calls:*\n';
          msg.toolCalls.forEach(tc => {
            content += `- ${tc.tool}: ${tc.status}\n`;
          });
        }
        
        return content;
      }).join('\n\n---\n\n');
      
      downloadFile(markdown, `${filename}.md`, 'text/markdown');
    } else if (format === 'txt') {
      const text = messages.map(msg => {
        const role = msg.role === 'user' ? 'User' : 
                    msg.agentName ? msg.agentName : 
                    'Assistant';
        return `[${msg.timestamp.toLocaleString()}] ${role}: ${msg.content}`;
      }).join('\n\n');
      
      downloadFile(text, `${filename}.txt`, 'text/plain');
    }

    toast({
      title: 'Conversation Exported',
      description: `Successfully exported conversation as ${format.toUpperCase()}`
    });
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getAgentIcon = (agentId: string) => {
    switch (agentId) {
      case 'system-architect': return <Layers className="w-4 h-4" />;
      case 'claude-code-ide': return <Code className="w-4 h-4" />;
      case 'google-cli-researcher': return <Search className="w-4 h-4" />;
      case 'database-engineer': return <Database className="w-4 h-4" />;
      case 'testing-specialist': return <TestTube className="w-4 h-4" />;
      case 'security-auditor': return <Shield className="w-4 h-4" />;
      case 'performance-optimizer': return <Zap className="w-4 h-4" />;
      default: return <Bot className="w-4 h-4" />;
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header with Active Agents */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-6 h-6 text-purple-400" />
          <div>
            <h3 className="font-semibold text-white">LibreChat + Nexus Agents</h3>
            <p className="text-sm text-slate-400">
              {activeAgents.length} active agents • {messages.length} messages
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-green-500/20 text-green-400">
            <Zap className="w-3 h-3 mr-1" />
            Connected
          </Badge>
          
          {/* Export Dropdown */}
          <div className="relative">
            <Button size="sm" variant="ghost" className="px-2">
              <FileText className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex -space-x-2">
            {activeAgents.slice(0, 5).map(agentId => (
              <div
                key={agentId}
                className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center border-2 border-slate-800"
                title={agentId}
              >
                {getAgentIcon(agentId)}
              </div>
            ))}
            {activeAgents.length > 5 && (
              <div className="w-6 h-6 bg-slate-600 rounded-full flex items-center justify-center border-2 border-slate-800 text-xs text-white">
                +{activeAgents.length - 5}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role !== 'user' && (
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  {message.agentId ? getAgentIcon(message.agentId) : <Bot className="w-4 h-4" />}
                </div>
              )}

              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-purple-600 text-white'
                    : message.role === 'agent'
                    ? 'bg-slate-700/50 text-white border border-slate-600'
                    : 'bg-slate-800/50 text-white'
                }`}
              >
                {message.agentName && (
                  <div className="text-xs text-purple-300 mb-1 font-medium">
                    {message.agentName}
                  </div>
                )}

                <div className="text-sm whitespace-pre-wrap">
                  {message.content}
                </div>

                {message.toolCalls && message.toolCalls.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {message.toolCalls.map((toolCall, index) => (
                      <div key={index} className="text-xs bg-slate-600/50 rounded px-2 py-1">
                        <span className="text-purple-300">Tool:</span> {toolCall.tool}
                        {toolCall.status && (
                          <Badge
                            variant="secondary"
                            className={`ml-2 text-xs ${
                              toolCall.status === 'completed'
                                ? 'bg-green-500/20 text-green-400'
                                : toolCall.status === 'executing'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            {toolCall.status}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="text-xs text-slate-400 mt-2">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>

              {message.role === 'user' && (
                <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full"></div>
                  <span className="text-sm text-slate-300">Processing with agents...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Tool Calls Panel */}
      {toolCalls.length > 0 && (
        <div className="border-t border-slate-700 p-4">
          <h4 className="text-sm font-medium text-purple-300 mb-2">Active Tool Calls</h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {toolCalls.slice(-5).map((toolCall) => (
              <div key={toolCall.id} className="text-xs bg-slate-700/50 rounded p-2">
                <div className="flex items-center justify-between">
                  <span className="text-purple-300 font-medium">{toolCall.tool}</span>
                  <Badge
                    variant="secondary"
                    className={
                      toolCall.status === 'completed'
                        ? 'bg-green-500/20 text-green-400'
                        : toolCall.status === 'executing'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-red-500/20 text-red-400'
                    }
                  >
                    {toolCall.status}
                  </Badge>
                </div>
                {toolCall.result && (
                  <div className="mt-1 text-slate-300 truncate">
                    Result: {JSON.stringify(toolCall.result).substring(0, 100)}...
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-slate-700 p-4">
        <div className="flex gap-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask your development team anything... (e.g., 'Build a user authentication system')"
            className="flex-1 bg-slate-800/50 border-slate-600 text-white resize-none"
            rows={2}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="bg-purple-600 hover:bg-purple-700 px-6"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
          <span>💡 Tip:</span>
          <span>Mention specific agents like "@claude-code" or describe tasks like "implement authentication"</span>
        </div>
      </div>
    </div>
  );
};

// =============================================
// AGENT BRIDGE COMPONENT
// =============================================

interface AgentBridgeProps {
  agentId: string;
  workspaceId: string;
  onMessage?: (message: any) => void;
  onToolResult?: (result: any) => void;
}

export const AgentBridge: React.FC<AgentBridgeProps> = ({
  agentId,
  workspaceId,
  onMessage,
  onToolResult
}) => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [lastActivity, setLastActivity] = useState<Date | null>(null);
  const { events } = useEvents({ config: { enableFilters: true } });

  useEffect(() => {
    connectToAgent();
  }, [agentId, workspaceId]);

  useEffect(() => {
    if (events.length > 0) {
      const latestEvent = events[events.length - 1];
      handleAgentEvent(latestEvent);
    }
  }, [events]);

  const connectToAgent = async () => {
    try {
      const response = await api.post('/api/agents/bridge/connect', {
        agentId,
        workspaceId
      });

      if (response.data.success) {
        setStatus('connected');
        setLastActivity(new Date());
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error('Failed to connect to agent:', error);
      setStatus('error');
    }
  };

  const handleAgentEvent = (event: any) => {
    setLastActivity(new Date());

    switch (event.type) {
      case 'agent.message':
        onMessage?.(event.data);
        break;
      case 'tool.result':
        onToolResult?.(event.data);
        break;
      case 'agent.error':
        setStatus('error');
        break;
    }
  };

  const executeTool = async (tool: string, parameters: Record<string, any>) => {
    try {
      const response = await api.post('/api/agents/bridge/execute', {
        agentId,
        workspaceId,
        tool,
        parameters
      });

      return response.data.result;
    } catch (error) {
      console.error('Failed to execute tool:', error);
      throw error;
    }
  };

  return (
    <div className="agent-bridge">
      <div className="flex items-center gap-2 text-sm">
        <div className={`w-2 h-2 rounded-full ${
          status === 'connected' ? 'bg-green-400' :
          status === 'connecting' ? 'bg-yellow-400' : 'bg-red-400'
        }`} />
        <span className="text-slate-300">{agentId}</span>
        {lastActivity && (
          <span className="text-xs text-slate-500">
            {lastActivity.toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  );
};

export default LibreChatIntegration;

