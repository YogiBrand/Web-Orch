/**
 * Enhanced Real-time WebSocket Hook for WebOrchestrator
 * Provides enterprise-grade real-time communication with comprehensive error handling,
 * automatic reconnection, message queuing, and topic-based subscriptions.
 */

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";

// Enhanced Message Types
export interface RealtimeMessage {
  id: string;
  type: string;
  sessionId?: string;
  agentId?: string;
  taskId?: string;
  data: any;
  timestamp: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
}

export interface ConnectionConfig {
  path?: string;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  messageQueueSize?: number;
  debug?: boolean;
}

export interface RealtimeHookResult {
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastMessage: RealtimeMessage | null;
  sendMessage: (message: any) => boolean;
  subscribe: (topic: string) => () => void;
  unsubscribe: (topic: string) => void;
  reconnect: () => void;
  disconnect: () => void;
  messageQueue: number;
  connectionStats: {
    totalConnections: number;
    reconnectAttempts: number;
    messagesReceived: number;
    messagesSent: number;
    lastHeartbeat: Date | null;
    uptime: number;
  };
}

export class EnterpriseWebSocketClient {
  private ws: WebSocket | null = null;
  private config: Required<ConnectionConfig>;
  private subscriptions = new Set<string>();
  private messageQueue: any[] = [];
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private connectionStartTime = Date.now();
  private stats = {
    totalConnections: 0,
    messagesReceived: 0,
    messagesSent: 0,
    lastHeartbeat: null as Date | null,
  };

  // Event handlers
  private onOpen?: () => void;
  private onClose?: (code: number, reason: string) => void;
  private onError?: (error: Event) => void;
  private onMessage?: (message: RealtimeMessage) => void;
  private onStatusChange?: (status: string) => void;

  constructor(config: ConnectionConfig = {}) {
    this.config = {
      path: config.path || '/ws',
      reconnect: config.reconnect ?? true,
      reconnectInterval: config.reconnectInterval || 1000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
      heartbeatInterval: config.heartbeatInterval || 30000,
      messageQueueSize: config.messageQueueSize || 100,
      debug: config.debug || false,
    };
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      const wsUrl = this.buildWebSocketUrl();
      this.log(`Connecting to ${wsUrl}`);
      this.onStatusChange?.('connecting');

      this.ws = new WebSocket(wsUrl);
      
      const connectionTimeout = setTimeout(() => {
        if (this.ws?.readyState !== WebSocket.OPEN) {
          this.ws?.close();
          reject(new Error('Connection timeout'));
        }
      }, 10000); // 10 second timeout

      this.ws.onopen = () => {
        clearTimeout(connectionTimeout);
        this.log('WebSocket connected');
        this.stats.totalConnections++;
        this.reconnectAttempts = 0;
        this.onStatusChange?.('connected');
        this.onOpen?.();
        
        this.setupHeartbeat();
        this.processQueuedMessages();
        this.restoreSubscriptions();
        
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: RealtimeMessage = JSON.parse(event.data);
          this.stats.messagesReceived++;
          this.log('Message received:', message.type);
          
          // Handle system messages
          this.handleSystemMessage(message);
          
          // Call message handler
          this.onMessage?.(message);
          
        } catch (error) {
          this.log('Failed to parse message:', error);
        }
      };

      this.ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        this.log(`WebSocket closed: ${event.code} - ${event.reason}`);
        this.onStatusChange?.('disconnected');
        this.cleanup();
        this.onClose?.(event.code, event.reason);
        
        if (this.config.reconnect && event.code !== 1000 && this.reconnectAttempts < this.config.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        clearTimeout(connectionTimeout);
        this.log('WebSocket error:', error);
        this.onStatusChange?.('error');
        this.onError?.(error);
        reject(error);
      };
    });
  }

  private buildWebSocketUrl(): string {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    
    // Development: if on port 3000, connect to backend on 3002
    if (host.includes(':3000')) {
      return `${protocol}//${host.replace(':3000', ':3001')}${this.config.path}`;
    }
    
    return `${protocol}//${host}${this.config.path}`;
  }

  private setupHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.sendMessage({
          type: 'heartbeat',
          timestamp: Date.now()
        });
        this.stats.lastHeartbeat = new Date();
      }
    }, this.config.heartbeatInterval);
  }

  private handleSystemMessage(message: RealtimeMessage): void {
    switch (message.type) {
      case 'connection_established':
        this.log('Connection established:', message.data);
        break;
      case 'heartbeat_ack':
        // Heartbeat acknowledged
        break;
      case 'subscription_confirmed':
        this.log(`Subscription confirmed: ${message.data.topic}`);
        break;
      case 'error':
        this.log('Server error:', message.data);
        break;
    }
  }

  private processQueuedMessages(): void {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift();
      this.ws.send(JSON.stringify(message));
      this.stats.messagesSent++;
    }
  }

  private restoreSubscriptions(): void {
    for (const topic of this.subscriptions) {
      this.sendMessage({
        type: 'subscribe',
        topic
      });
    }
  }

  private scheduleReconnect(): void {
    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts),
      30000
    );
    
    this.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.config.maxReconnectAttempts})`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect().catch(() => {
        // Reconnection failed, will try again if attempts remaining
      });
    }, delay);
  }

  private cleanup(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  sendMessage(message: any): boolean {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
        this.stats.messagesSent++;
        return true;
      } catch (error) {
        this.log('Failed to send message:', error);
        return false;
      }
    } else {
      // Queue message if not connected
      if (this.messageQueue.length < this.config.messageQueueSize) {
        this.messageQueue.push(message);
        this.log('Message queued (not connected)');
      } else {
        this.log('Message queue full, dropping message');
      }
      return false;
    }
  }

  subscribe(topic: string): void {
    this.subscriptions.add(topic);
    this.sendMessage({
      type: 'subscribe',
      topic
    });
  }

  unsubscribe(topic: string): void {
    this.subscriptions.delete(topic);
    this.sendMessage({
      type: 'unsubscribe',
      topic
    });
  }

  disconnect(): void {
    this.cleanup();
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
  }

  reconnectNow(): void {
    this.reconnectAttempts = 0;
    this.disconnect();
    this.connect();
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getStats() {
    return {
      ...this.stats,
      reconnectAttempts: this.reconnectAttempts,
      uptime: Date.now() - this.connectionStartTime,
      queuedMessages: this.messageQueue.length
    };
  }

  // Event handler setters
  setOnOpen(handler: () => void): void { this.onOpen = handler; }
  setOnClose(handler: (code: number, reason: string) => void): void { this.onClose = handler; }
  setOnError(handler: (error: Event) => void): void { this.onError = handler; }
  setOnMessage(handler: (message: RealtimeMessage) => void): void { this.onMessage = handler; }
  setOnStatusChange(handler: (status: string) => void): void { this.onStatusChange = handler; }

  private log(message: string, data?: any): void {
    if (this.config.debug) {
      console.log(`[WSClient] ${message}`, data || '');
    }
  }
}

// React Hook for Real-time WebSocket
export function useRealtimeWebSocket(config: ConnectionConfig = {}): RealtimeHookResult {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [lastMessage, setLastMessage] = useState<RealtimeMessage | null>(null);
  const [messageQueue, setMessageQueue] = useState(0);
  const [connectionStats, setConnectionStats] = useState({
    totalConnections: 0,
    reconnectAttempts: 0,
    messagesReceived: 0,
    messagesSent: 0,
    lastHeartbeat: null as Date | null,
    uptime: 0
  });

  const wsClient = useRef<EnterpriseWebSocketClient | null>(null);
  const queryClient = useQueryClient();

  // Initialize WebSocket client
  useEffect(() => {
    wsClient.current = new EnterpriseWebSocketClient({
      debug: process.env.NODE_ENV === 'development',
      ...config
    });

    const client = wsClient.current;

    // Setup event handlers
    client.setOnOpen(() => {
      setIsConnected(true);
      setConnectionStatus('connected');
    });

    client.setOnClose((code, reason) => {
      setIsConnected(false);
      setConnectionStatus('disconnected');
    });

    client.setOnError(() => {
      setIsConnected(false);
      setConnectionStatus('error');
    });

    client.setOnMessage((message) => {
      setLastMessage(message);
      handleRealtimeMessage(message);
    });

    client.setOnStatusChange((status) => {
      setConnectionStatus(status as any);
    });

    // Connect
    client.connect().catch(error => {
      console.error('WebSocket connection failed:', error);
    });

    // Stats update interval
    const statsInterval = setInterval(() => {
      if (client) {
        const stats = client.getStats();
        setConnectionStats(stats);
        setMessageQueue(stats.queuedMessages);
      }
    }, 5000);

    return () => {
      clearInterval(statsInterval);
      client.disconnect();
    };
  }, []);

  const handleRealtimeMessage = useCallback((message: RealtimeMessage) => {
    // Handle query invalidation based on message type
    switch (message.type) {
      case 'session:update':
      case 'session-status-changed':
        queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
        if (message.sessionId) {
          queryClient.setQueryData(["/api/sessions", message.sessionId], (oldData: any) => {
            if (oldData) {
              return { ...oldData, ...message.data };
            }
            return oldData;
          });
        }
        break;
        
      case 'agent:update':
      case 'agent:status':
        queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
        break;
        
      case 'task:result':
      case 'task_completed':
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        break;
    }
  }, [queryClient]);

  // Public methods
  const sendMessage = useCallback((message: any): boolean => {
    return wsClient.current?.sendMessage(message) || false;
  }, []);

  const subscribe = useCallback((topic: string) => {
    wsClient.current?.subscribe(topic);
    
    return () => {
      wsClient.current?.unsubscribe(topic);
    };
  }, []);

  const unsubscribe = useCallback((topic: string) => {
    wsClient.current?.unsubscribe(topic);
  }, []);

  const reconnect = useCallback(() => {
    wsClient.current?.reconnectNow();
  }, []);

  const disconnect = useCallback(() => {
    wsClient.current?.disconnect();
  }, []);

  return {
    isConnected,
    connectionStatus,
    lastMessage,
    sendMessage,
    subscribe,
    unsubscribe,
    reconnect,
    disconnect,
    messageQueue,
    connectionStats
  };
}

// Specialized hooks for different use cases

export function useSessionRealtime(sessionId: string | null) {
  const { subscribe, ...rest } = useRealtimeWebSocket({
    path: '/ws',
    debug: true
  });

  useEffect(() => {
    if (sessionId && rest.isConnected) {
      const unsubscribe = subscribe(`session:${sessionId}`);
      return unsubscribe;
    }
  }, [sessionId, rest.isConnected, subscribe]);

  return rest;
}

export function useAgentRealtime(agentId: string | null) {
  const { subscribe, ...rest } = useRealtimeWebSocket({
    path: '/ws',
    debug: true
  });

  useEffect(() => {
    if (agentId && rest.isConnected) {
      const unsubscribe = subscribe(`agent:${agentId}`);
      return unsubscribe;
    }
  }, [agentId, rest.isConnected, subscribe]);

  return rest;
}

export function useSystemRealtime() {
  const { subscribe, ...rest } = useRealtimeWebSocket({
    path: '/ws',
    debug: true
  });

  useEffect(() => {
    if (rest.isConnected) {
      const unsubscribers = [
        subscribe('system:status'),
        subscribe('system:metrics'),
        subscribe('system:alerts')
      ];
      
      return () => {
        unsubscribers.forEach(unsub => unsub());
      };
    }
  }, [rest.isConnected, subscribe]);

  return rest;
}
