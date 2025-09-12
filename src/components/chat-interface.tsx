import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  Settings,
  Trash2,
  Copy,
  RefreshCw,
  Zap
} from 'lucide-react';
import { api } from '@/lib/api';

interface Message {
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

interface Provider {
  name: string;
  provider: string;
  models: string[];
  status: 'healthy' | 'unhealthy' | 'unknown';
  cost_per_1k_tokens?: number;
  max_tokens?: number;
  features: string[];
  health?: any;
  stats?: any;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [defaultProvider, setDefaultProvider] = useState<string>('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadProviders();
    createConversation();
  }, []);

  const loadProviders = async () => {
    try {
      const response = await api.get('/chat/providers');
      setProviders(response.data.providers);
      setDefaultProvider(response.data.default_provider);
      setSelectedProvider(response.data.default_provider);
    } catch (error) {
      console.error('Failed to load providers:', error);
    }
  };

  const createConversation = async () => {
    try {
      const response = await api.post('/chat/conversations');
      setConversationId(response.data.conversation_id);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !conversationId || isLoading) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: input.trim(),
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await api.post(`/chat/conversations/${conversationId}/messages`, {
        content: input.trim(),
        provider: selectedProvider !== defaultProvider ? selectedProvider : undefined
      });

      setMessages(prev => [...prev, response.data.message]);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Add error message
      const errorMessage: Message = {
        id: `msg_${Date.now()}_error`,
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your message. Please try again.',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearConversation = () => {
    setMessages([]);
    createConversation();
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getProviderBadgeColor = (provider: string) => {
    switch (provider) {
      case 'deepseek':
        return 'bg-blue-100 text-blue-800';
      case 'openrouter':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'deepseek':
        return <Zap className="w-3 h-3" />;
      default:
        return <Bot className="w-3 h-3" />;
    }
  };

  return (
    <div className="flex flex-col h-[600px] max-w-4xl mx-auto">
      <Card className="flex-1 flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-5 h-5 text-blue-500" />
              <CardTitle>AI Chat Assistant</CardTitle>
              {conversationId && (
                <Badge variant="outline" className="text-xs">
                  {messages.length} messages
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Select
                value={selectedProvider}
                onValueChange={setSelectedProvider}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((provider) => (
                    <SelectItem key={provider.provider} value={provider.provider}>
                      <div className="flex items-center gap-2">
                        {getProviderIcon(provider.provider)}
                        <span>{provider.name}</span>
                        {provider.status === 'healthy' && (
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={clearConversation}
                disabled={messages.length === 0}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Provider info */}
          {selectedProvider && (
            <div className="flex flex-wrap gap-2 mt-2">
              {providers
                .filter(p => p.provider === selectedProvider)
                .map((provider) => (
                  <div key={provider.provider} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge className={getProviderBadgeColor(provider.provider)}>
                      {provider.name}
                    </Badge>
                    <span>Max: {provider.max_tokens} tokens</span>
                    {provider.cost_per_1k_tokens !== undefined && (
                      <span>
                        Cost: {provider.cost_per_1k_tokens === 0 ? 'Free' : `$${provider.cost_per_1k_tokens}/1k`}
                      </span>
                    )}
                    <div className={`w-2 h-2 rounded-full ${
                      provider.status === 'healthy' ? 'bg-green-500' : 
                      provider.status === 'unhealthy' ? 'bg-red-500' : 'bg-gray-400'
                    }`} />
                  </div>
                ))}
            </div>
          )}
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-4">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Bot className="w-12 h-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">
                    Welcome to WebOrchestrator AI Chat
                  </h3>
                  <p className="text-gray-500 mb-4 max-w-md">
                    Ask me anything about browser automation, web scraping, or general questions. 
                    I'm powered by your local DeepSeek model for fast, private responses.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {['How do I scrape a website?', 'Help with form automation', 'Explain browser sessions'].map((prompt) => (
                      <Button
                        key={prompt}
                        variant="outline"
                        size="sm"
                        onClick={() => setInput(prompt)}
                        className="text-xs"
                      >
                        {prompt}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {message.role === 'assistant' && (
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Bot className="w-4 h-4 text-blue-600" />
                        </div>
                      </div>
                    )}
                    
                    <div className={`max-w-[80%] ${message.role === 'user' ? 'order-2' : ''}`}>
                      <div className={`rounded-lg p-3 ${
                        message.role === 'user' 
                          ? 'bg-blue-600 text-white ml-auto' 
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        <div className="whitespace-pre-wrap break-words">{message.content}</div>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        <span>{formatTime(message.timestamp)}</span>
                        
                        {message.provider && (
                          <>
                            <span>•</span>
                            <Badge className={`${getProviderBadgeColor(message.provider)} text-xs py-0`}>
                              {message.provider === 'deepseek' ? 'DeepSeek Local' : 'OpenRouter'}
                            </Badge>
                          </>
                        )}
                        
                        {message.response_time_ms && (
                          <>
                            <span>•</span>
                            <span>{Math.round(message.response_time_ms)}ms</span>
                          </>
                        )}
                        
                        {message.cost_usd !== undefined && (
                          <>
                            <span>•</span>
                            <span>{message.cost_usd === 0 ? 'Free' : `$${message.cost_usd.toFixed(4)}`}</span>
                          </>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-1 ml-auto"
                          onClick={() => copyMessage(message.content)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    {message.role === 'user' && (
                      <div className="flex-shrink-0 order-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-600" />
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
              
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Bot className="w-4 h-4 text-blue-600" />
                    </div>
                  </div>
                  <div className="bg-gray-100 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span className="text-gray-600">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </ScrollArea>

          <div className="flex gap-2 mt-4">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={isLoading || !conversationId}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading || !conversationId}
              className="px-4"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}