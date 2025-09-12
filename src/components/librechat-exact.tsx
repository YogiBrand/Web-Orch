/**
 * 🚀 EXACT LIBRECHAT INTERFACE
 * Pixel-perfect replica of LibreChat's UI using their exact styling patterns
 */

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import {
  Send,
  User,
  Bot,
  Copy,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  MoreHorizontal,
  PaperclipIcon,
  Mic,
  Square,
  ChevronDown,
  Settings,
  MessageSquare,
  Edit3,
  Trash2,
  Plus,
  Search
} from 'lucide-react';

// =============================================
// EXACT LIBRECHAT TYPES
// =============================================

interface LibreChatMessage {
  messageId: string;
  conversationId: string;
  parentMessageId?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  finish_reason?: string;
  createdAt: Date;
  updatedAt: Date;
  isCreatedByUser: boolean;
}

interface LibreChatConversation {
  conversationId: string;
  title: string;
  messages: LibreChatMessage[];
  model: string;
  chatGptLabel?: string;
  promptPrefix?: string;
  temperature?: number;
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  createdAt: Date;
  updatedAt: Date;
}

interface LibreChatEndpoint {
  name: string;
  type: 'openAI' | 'anthropic' | 'google' | 'chatGPTBrowser' | 'azureOpenAI' | 'bingAI';
  models: string[];
  userProvide: boolean;
  userProvideURL?: boolean;
}

// =============================================
// EXACT LIBRECHAT STYLING CONSTANTS
// =============================================

const LIBRECHAT_STYLES = {
  // Main container
  chatContainer: "flex h-full flex-col bg-white dark:bg-gray-800",
  
  // Header
  header: "sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-800",
  headerTitle: "text-lg font-semibold text-gray-900 dark:text-gray-100",
  
  // Message container
  messagesContainer: "flex-1 overflow-hidden",
  messagesList: "h-full px-0",
  
  // Individual message
  messageWrapper: "group w-full text-token-text-primary",
  messageContent: "flex p-4 gap-4 text-base md:gap-6 md:py-6",
  
  // User message
  userMessage: "w-full border-b border-black/10 bg-gray-50 dark:border-gray-900/50 dark:bg-[#444654] dark:text-gray-100",
  
  // Assistant message  
  assistantMessage: "w-full border-b border-black/10 bg-white dark:border-gray-900/50 dark:bg-gray-800 dark:text-gray-100",
  
  // Avatar
  avatar: "flex h-8 w-8 items-center justify-center rounded-full",
  userAvatar: "bg-blue-500 text-white",
  assistantAvatar: "bg-green-500 text-white",
  
  // Message text
  messageText: "prose break-words dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 w-full max-w-none",
  
  // Input form
  inputForm: "stretch mx-2 flex flex-row gap-3 last:mb-2 md:mx-4 md:last:mb-6 lg:mx-auto lg:max-w-2xl xl:max-w-3xl",
  inputContainer: "relative flex h-full flex-1 items-stretch md:flex-col",
  inputWrapper: "flex flex-col w-full py-[10px] flex-grow md:py-4 md:pl-4 relative border border-black/10 bg-white dark:border-gray-900/50 dark:text-white dark:bg-gray-700 rounded-xl shadow-xs dark:shadow-xs",
  textarea: "m-0 w-full resize-none border-0 bg-transparent p-0 pr-10 focus:ring-0 focus-visible:ring-0 dark:bg-transparent md:pr-12 pl-3 md:pl-0 text-black dark:text-white",
  
  // Send button
  sendButton: "absolute p-1 rounded-md md:bottom-3 md:p-2 md:right-3 dark:hover:bg-gray-900 dark:disabled:hover:bg-transparent right-2 disabled:text-gray-400 enabled:bg-brand-purple text-white bottom-1.5 transition-colors disabled:opacity-40",
  
  // Model selector
  modelSelector: "group flex cursor-pointer items-center gap-1 rounded-lg py-1.5 px-3 text-lg font-medium hover:bg-gray-100 radix-state-open:bg-gray-100 dark:hover:bg-gray-900 dark:radix-state-open:bg-gray-900",
  
  // Conversation list
  conversationList: "flex h-full w-full flex-col px-2",
  conversationItem: "group relative rounded-lg active:opacity-90 hover:bg-[#2A2B32] cursor-pointer break-all bg-gray-800 py-2 px-2 text-gray-100",
  
  // Action buttons
  actionButton: "p-1 text-gray-400 hover:text-gray-900 dark:text-gray-500 dark:hover:text-gray-300",
  
  // Loading
  loadingDots: "flex space-x-1 justify-center items-center",
  loadingDot: "h-2 w-2 bg-gray-500 rounded-full animate-pulse"
};

// Mock endpoints matching LibreChat structure
const MOCK_ENDPOINTS: LibreChatEndpoint[] = [
  {
    name: 'OpenAI',
    type: 'openAI',
    models: ['gpt-4', 'gpt-4-turbo-preview', 'gpt-3.5-turbo'],
    userProvide: false
  },
  {
    name: 'Claude',
    type: 'anthropic', 
    models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
    userProvide: false
  },
  {
    name: 'Nexus Agents',
    type: 'openAI',
    models: ['claude-code-ide', 'google-researcher', 'database-engineer', 'browser-automation'],
    userProvide: true
  }
];

// =============================================
// MESSAGE COMPONENT (Exact LibreChat)
// =============================================

interface MessageProps {
  message: LibreChatMessage;
  isLast: boolean;
}

function LibreChatMessage({ message, isLast }: MessageProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { toast } = useToast();

  const copyMessage = () => {
    navigator.clipboard.writeText(message.content);
    toast({
      title: "Copied to clipboard",
      duration: 2000,
    });
  };

  const isUser = message.isCreatedByUser;

  return (
    <div 
      className={cn(
        LIBRECHAT_STYLES.messageWrapper,
        isUser ? LIBRECHAT_STYLES.userMessage : LIBRECHAT_STYLES.assistantMessage
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={LIBRECHAT_STYLES.messageContent}>
        {/* Avatar */}
        <div className={cn(
          LIBRECHAT_STYLES.avatar,
          isUser ? LIBRECHAT_STYLES.userAvatar : LIBRECHAT_STYLES.assistantAvatar
        )}>
          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </div>
        
        {/* Message Content */}
        <div className="flex-1 overflow-hidden">
          <div className={LIBRECHAT_STYLES.messageText}>
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
          
          {/* Action Buttons (LibreChat style) */}
          {(isHovered || isLast) && !isUser && (
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={copyMessage}
                className={LIBRECHAT_STYLES.actionButton}
                title="Copy"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button className={LIBRECHAT_STYLES.actionButton} title="Regenerate">
                <RotateCcw className="w-4 h-4" />
              </button>
              <button className={LIBRECHAT_STYLES.actionButton} title="Good response">
                <ThumbsUp className="w-4 h-4" />
              </button>
              <button className={LIBRECHAT_STYLES.actionButton} title="Bad response">
                <ThumbsDown className="w-4 h-4" />
              </button>
              <button className={LIBRECHAT_STYLES.actionButton} title="More">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================
// INPUT FORM (Exact LibreChat)
// =============================================

interface ChatFormProps {
  onSendMessage: (content: string) => void;
  isLoading: boolean;
  selectedModel: string;
}

function LibreChatForm({ onSendMessage, isLoading, selectedModel }: ChatFormProps) {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;
    
    onSendMessage(message);
    setMessage('');
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);

  return (
    <div className={LIBRECHAT_STYLES.inputForm}>
      <form onSubmit={handleSubmit} className={LIBRECHAT_STYLES.inputContainer}>
        <div className={LIBRECHAT_STYLES.inputWrapper}>
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a message..."
            className={LIBRECHAT_STYLES.textarea}
            rows={1}
            disabled={isLoading}
            style={{
              maxHeight: '200px',
              overflowY: message.split('\n').length > 10 ? 'auto' : 'hidden'
            }}
          />
          
          {/* Action buttons */}
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            {/* File attachment */}
            <button
              type="button"
              className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              title="Attach files"
            >
              <PaperclipIcon className="w-4 h-4" />
            </button>
            
            {/* Voice recording */}
            <button
              type="button"
              onClick={() => setIsRecording(!isRecording)}
              className={cn(
                "p-1 hover:text-gray-600 dark:hover:text-gray-300",
                isRecording ? "text-red-500" : "text-gray-400 dark:text-gray-500"
              )}
              title={isRecording ? "Stop recording" : "Record voice"}
            >
              {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            
            {/* Send button */}
            <button
              type="submit"
              disabled={!message.trim() || isLoading}
              className={cn(
                LIBRECHAT_STYLES.sendButton,
                !message.trim() || isLoading
                  ? "cursor-not-allowed opacity-40"
                  : "bg-green-600 hover:bg-green-700"
              )}
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// =============================================
// MODEL SELECTOR (Exact LibreChat)
// =============================================

interface ModelSelectorProps {
  selectedEndpoint: string;
  selectedModel: string;
  onEndpointChange: (endpoint: string) => void;
  onModelChange: (model: string) => void;
}

function LibreChatModelSelector({ 
  selectedEndpoint, 
  selectedModel, 
  onEndpointChange, 
  onModelChange 
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const currentEndpoint = MOCK_ENDPOINTS.find(e => e.name === selectedEndpoint);
  const currentModel = currentEndpoint?.models.find(m => m === selectedModel) || currentEndpoint?.models[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={LIBRECHAT_STYLES.modelSelector}
      >
        <span className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          {currentModel || 'Select Model'}
        </span>
        <ChevronDown className={cn(
          "w-4 h-4 transition-transform",
          isOpen ? "rotate-180" : "rotate-0"
        )} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
          {MOCK_ENDPOINTS.map((endpoint) => (
            <div key={endpoint.name}>
              <div className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
                {endpoint.name}
              </div>
              {endpoint.models.map((model) => (
                <button
                  key={model}
                  onClick={() => {
                    onEndpointChange(endpoint.name);
                    onModelChange(model);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700",
                    selectedModel === model ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" : "text-gray-900 dark:text-gray-100"
                  )}
                >
                  {model}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================
// MAIN LIBRECHAT INTERFACE
// =============================================

export default function LibreChatExact() {
  const [conversations, setConversations] = useState<LibreChatConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<LibreChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState('OpenAI');
  const [selectedModel, setSelectedModel] = useState('gpt-4');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize with welcome conversation
  useEffect(() => {
    const welcomeConversation: LibreChatConversation = {
      conversationId: 'welcome',
      title: 'New Chat',
      messages: [],
      model: selectedModel,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    setConversations([welcomeConversation]);
    setActiveConversation('welcome');
  }, []);

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage: LibreChatMessage = {
      messageId: `msg-${Date.now()}`,
      conversationId: activeConversation || 'welcome',
      role: 'user',
      content,
      createdAt: new Date(),
      updatedAt: new Date(),
      isCreatedByUser: true
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

      const assistantMessage: LibreChatMessage = {
        messageId: `msg-${Date.now()}-assistant`,
        conversationId: activeConversation || 'welcome',
        parentMessageId: userMessage.messageId,
        role: 'assistant',
        content: generateResponse(content, selectedModel),
        model: selectedModel,
        createdAt: new Date(),
        updatedAt: new Date(),
        isCreatedByUser: false
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateResponse = (userMessage: string, model: string): string => {
    // Agent-specific responses based on model
    if (model === 'claude-code-ide') {
      return `I'll help you with your code request: "${userMessage.slice(0, 50)}${userMessage.length > 50 ? '...' : ''}"\n\nHere's what I can do:\n\n\`\`\`typescript\n// Code implementation would go here\n// Based on your specific requirements\n\`\`\`\n\nWould you like me to:\n- Create/edit files in your workspace\n- Run specific commands\n- Set up project structure\n\nWhat would you like to work on next?`;
    }
    
    if (model === 'google-researcher') {
      return `I'll research "${userMessage.slice(0, 50)}${userMessage.length > 50 ? '...' : ''}" for you.\n\n📊 **Research Results:**\n\n• **Latest Documentation**: Found current best practices and updates\n• **Community Insights**: Analyzed recent discussions and solutions\n• **Technical Specifications**: Reviewed official documentation\n\n🔍 **Key Findings:**\n[Detailed research results would be displayed here]\n\n**Sources:** Latest documentation, Stack Overflow, GitHub repositories, and expert discussions.\n\nWould you like me to dive deeper into any specific aspect?`;
    }
    
    if (model === 'database-engineer') {
      return `I'll design the optimal database solution for "${userMessage.slice(0, 50)}${userMessage.length > 50 ? '...' : ''}"\n\n🗃️ **Database Design:**\n\n\`\`\`sql\n-- Optimized schema design\nCREATE TABLE your_table (\n    id SERIAL PRIMARY KEY,\n    -- Additional columns based on requirements\n    created_at TIMESTAMP DEFAULT NOW()\n);\n\n-- Indexes for performance\nCREATE INDEX idx_your_table_lookup ON your_table(lookup_column);\n\`\`\`\n\n⚡ **Performance Strategy:**\n• Indexing optimization\n• Query performance tuning\n• Caching implementation\n\nShall I implement these database changes?`;
    }
    
    // Default response for other models
    return `Thank you for your message: "${userMessage}"\n\nI'm ${model} and I'm here to help you with your development needs. I can assist with:\n\n• Code generation and review\n• Architecture and system design\n• Problem solving and debugging\n• Best practices and optimization\n\nWhat specific task would you like to work on together?`;
  };

  const startNewConversation = () => {
    const newConversation: LibreChatConversation = {
      conversationId: `conv-${Date.now()}`,
      title: 'New Chat',
      messages: [],
      model: selectedModel,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    setConversations(prev => [newConversation, ...prev]);
    setActiveConversation(newConversation.conversationId);
    setMessages([]);
  };

  return (
    <div className={LIBRECHAT_STYLES.chatContainer}>
      {/* Header with Model Selector */}
      <div className={LIBRECHAT_STYLES.header}>
        <LibreChatModelSelector
          selectedEndpoint={selectedEndpoint}
          selectedModel={selectedModel}
          onEndpointChange={setSelectedEndpoint}
          onModelChange={setSelectedModel}
        />
        
        <div className="flex items-center gap-2">
          <button
            onClick={startNewConversation}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            title="New chat"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className={LIBRECHAT_STYLES.messagesContainer}>
        <ScrollArea className={LIBRECHAT_STYLES.messagesList}>
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Start a conversation
                </h2>
                <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                  Choose a model above and start chatting with AI assistants tailored for development.
                </p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <LibreChatMessage
                  key={message.messageId}
                  message={message}
                  isLast={index === messages.length - 1}
                />
              ))}
              
              {/* Loading indicator */}
              {isLoading && (
                <div className={cn(LIBRECHAT_STYLES.messageWrapper, LIBRECHAT_STYLES.assistantMessage)}>
                  <div className={LIBRECHAT_STYLES.messageContent}>
                    <div className={cn(LIBRECHAT_STYLES.avatar, LIBRECHAT_STYLES.assistantAvatar)}>
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className={LIBRECHAT_STYLES.loadingDots}>
                        <div className={cn(LIBRECHAT_STYLES.loadingDot, "animate-pulse delay-0")} />
                        <div className={cn(LIBRECHAT_STYLES.loadingDot, "animate-pulse delay-75")} />
                        <div className={cn(LIBRECHAT_STYLES.loadingDot, "animate-pulse delay-150")} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </>
          )}
        </ScrollArea>
      </div>

      {/* Input Form */}
      <LibreChatForm
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        selectedModel={selectedModel}
      />
    </div>
  );
}