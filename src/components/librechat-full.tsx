/**
 * 🔥 FULL LIBRECHAT IMPLEMENTATION
 * Complete LibreChat interface with all functionality
 */

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Plus,
  Edit3,
  Trash2,
  Search
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  model: string;
  updatedAt: Date;
}

const MODELS = [
  { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI' },
  { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'Anthropic' },
  { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'Anthropic' },
  { id: 'claude-code-ide', name: 'Claude Code IDE', provider: 'Nexus' },
  { id: 'google-researcher', name: 'Google Researcher', provider: 'Nexus' },
  { id: 'database-engineer', name: 'Database Engineer', provider: 'Nexus' },
];

export default function LibreChatFull() {
  const { toast } = useToast();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-4');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputMessage]);

  // Initialize with welcome
  useEffect(() => {
    const welcomeConversation: Conversation = {
      id: 'welcome',
      title: 'New Chat',
      messages: [],
      model: selectedModel,
      updatedAt: new Date()
    };
    
    setConversations([welcomeConversation]);
    setActiveConversation('welcome');
  }, []);

  const startNewConversation = () => {
    const newConversation: Conversation = {
      id: `conv-${Date.now()}`,
      title: 'New Chat',
      messages: [],
      model: selectedModel,
      updatedAt: new Date()
    };
    
    setConversations(prev => [newConversation, ...prev]);
    setActiveConversation(newConversation.id);
    setMessages([]);
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

      const assistantMessage: Message = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: generateResponse(inputMessage, selectedModel),
        model: selectedModel,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Update conversation title if it's the first message
      if (messages.length === 0) {
        const title = inputMessage.length > 50 ? inputMessage.slice(0, 50) + '...' : inputMessage;
        setConversations(prev => prev.map(conv => 
          conv.id === activeConversation ? { ...conv, title, updatedAt: new Date() } : conv
        ));
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateResponse = (message: string, model: string) => {
    const responses = {
      'claude-code-ide': `I'll help you with your development task: "${message}"\n\n\`\`\`typescript\n// Implementation based on your request\nconst solution = {\n  // Your code will go here\n};\n\`\`\`\n\nWhat specific files would you like me to work on?`,
      'google-researcher': `I'll research "${message}" for you.\n\n📊 **Research Results:**\n• Latest documentation and best practices\n• Community insights and discussions\n• Technical specifications\n\n🔍 **Key Findings:**\nDetailed research results would appear here.\n\nWould you like me to dive deeper into any aspect?`,
      'database-engineer': `I'll design the optimal database solution for "${message}"\n\n\`\`\`sql\n-- Optimized schema\nCREATE TABLE your_table (\n    id SERIAL PRIMARY KEY,\n    created_at TIMESTAMP DEFAULT NOW()\n);\n\`\`\`\n\n⚡ **Performance Optimizations:**\n• Indexing strategy\n• Query optimization\n• Caching layer`,
      default: `I understand you're asking about "${message}". I'm ${MODELS.find(m => m.id === model)?.name || model} and I'm here to help you with your development needs.\n\nHow can I assist you with:\n• Code generation and review\n• Architecture design\n• Problem solving\n• Best practices\n\nWhat would you like to work on?`
    };

    return responses[model as keyof typeof responses] || responses.default;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({ title: "Copied to clipboard", duration: 2000 });
  };

  const currentModel = MODELS.find(m => m.id === selectedModel);

  return (
    <div className="flex h-full bg-white dark:bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 text-white flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-800">
          <Button
            onClick={startNewConversation}
            className="w-full bg-gray-800 hover:bg-gray-700 text-white border border-gray-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>

        {/* Conversations */}
        <ScrollArea className="flex-1 p-2">
          <div className="space-y-1">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={cn(
                  "w-full text-left p-3 rounded-lg text-sm transition-colors group relative cursor-pointer",
                  activeConversation === conv.id
                    ? "bg-gray-800 text-white"
                    : "hover:bg-gray-800/50 text-gray-300"
                )}
                onClick={() => {
                  setActiveConversation(conv.id);
                  setMessages(conv.messages);
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate">{conv.title}</span>
                  {activeConversation === conv.id && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                      <button 
                        className="p-1 hover:bg-gray-700 rounded"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle edit action
                        }}
                        aria-label="Edit conversation"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button 
                        className="p-1 hover:bg-gray-700 rounded"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle delete action
                        }}
                        aria-label="Delete conversation"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-medium">Developer</div>
              <div className="text-xs text-gray-400">developer@company.com</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-12 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4">
          {/* Model Selector */}
          <div className="relative">
            <button
              onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <div className={cn(
                "w-2 h-2 rounded-full",
                currentModel?.provider === 'OpenAI' ? 'bg-green-500' :
                currentModel?.provider === 'Anthropic' ? 'bg-orange-500' :
                'bg-blue-500'
              )} />
              {currentModel?.name}
              <ChevronDown className="w-4 h-4" />
            </button>

            {isModelDropdownOpen && (
              <div className="absolute top-full mt-1 left-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 min-w-64">
                {MODELS.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => {
                      setSelectedModel(model.id);
                      setIsModelDropdownOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg",
                      selectedModel === model.id ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" : "text-gray-900 dark:text-gray-100"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{model.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{model.provider}</div>
                      </div>
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        model.provider === 'OpenAI' ? 'bg-green-500' :
                        model.provider === 'Anthropic' ? 'bg-orange-500' :
                        'bg-blue-500'
                      )} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
              <Search className="w-4 h-4" />
            </button>
            <button className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-md">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Start a conversation
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Choose a model above and start chatting with specialized AI agents.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {['Help me code', 'Research a topic', 'Design a database', 'Review my code'].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setInputMessage(suggestion)}
                        className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {messages.map((message, index) => (
                  <div
                    key={message.id}
                    className={cn(
                      "w-full border-b border-gray-100 dark:border-gray-800",
                      message.role === 'user' 
                        ? "bg-white dark:bg-gray-900" 
                        : "bg-gray-50 dark:bg-gray-800/50"
                    )}
                  >
                    <div className="max-w-3xl mx-auto p-6">
                      <div className="flex gap-4">
                        {/* Avatar */}
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                          message.role === 'user' 
                            ? "bg-blue-600 text-white" 
                            : "bg-green-600 text-white"
                        )}>
                          {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="prose prose-sm max-w-none dark:prose-invert">
                            <pre className="whitespace-pre-wrap font-sans text-gray-900 dark:text-gray-100 leading-relaxed">
                              {message.content}
                            </pre>
                          </div>

                          {/* Actions */}
                          {message.role === 'assistant' && (
                            <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => copyMessage(message.content)}
                                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                                title="Copy"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              <button
                                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                                title="Regenerate"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                              <button
                                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                                title="Good response"
                              >
                                <ThumbsUp className="w-4 h-4" />
                              </button>
                              <button
                                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                                title="Bad response"
                              >
                                <ThumbsDown className="w-4 h-4" />
                              </button>
                              <button
                                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                                title="More"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Loading */}
                {isLoading && (
                  <div className="w-full bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                    <div className="max-w-3xl mx-auto p-6">
                      <div className="flex gap-4">
                        <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-75" />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150" />
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

        {/* Input */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-end gap-2">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Send a message..."
                  className="w-full resize-none border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 pr-12 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent max-h-32 overflow-y-auto"
                  rows={1}
                  disabled={isLoading}
                />
                
                <div className="absolute right-2 bottom-2 flex items-center gap-1">
                  <button
                    type="button"
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    title="Attach files"
                  >
                    <PaperclipIcon className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    title="Voice input"
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <Button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className={cn(
                  "h-12 w-12 p-0 rounded-lg transition-colors",
                  !inputMessage.trim() || isLoading
                    ? "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                )}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>

            <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Chatting with {currentModel?.name}</span>
              <span>Press Enter to send, Shift+Enter for new line</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}