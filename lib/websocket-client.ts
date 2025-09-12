/**
 * Enhanced WebSocket Client for WebOrchestrator Frontend
 * Provides automatic reconnection, error handling, and subscription management
 */

export interface WebSocketMessage {
  id: string;
  type: string;
  sessionId?: string;
  agentId?: string;
  taskId?: string;
  data: any;
  timestamp: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
}

export interface WebSocketOptions {
  url?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  connectionTimeout?: number;
  debug?: boolean;
}

export interface SubscriptionCallback {
  (message: WebSocketMessage): void;
}

export class EnhancedWebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private options: Required<WebSocketOptions>;
  private reconnectAttempts = 0;
  private reconnectTimeout?: number;
  private heartbeatInterval?: number;
  private connectionPromise?: Promise<void>;
  private subscriptions = new Map<string, Set<SubscriptionCallback>>();
  private messageQueue: WebSocketMessage[] = [];
  private isConnected = false;
  private isConnecting = false;
  private clientId?: string;
  private lastHeartbeat = 0;

  constructor(options: WebSocketOptions = {}) {
    this.options = {
      url: options.url || this.getDefaultWebSocketUrl(),
      reconnectInterval: options.reconnectInterval || 3000,
      maxReconnectAttempts: options.maxReconnectAttempts || 10,
      heartbeatInterval: options.heartbeatInterval || 30000,
      connectionTimeout: options.connectionTimeout || 10000,
      debug: options.debug || false
    };

    this.url = this.options.url;
    this.log('WebSocket client initialized', { url: this.url });
  }

  private getDefaultWebSocketUrl(): string {
    if (typeof window === 'undefined') {
      return 'ws://localhost:3001/ws';
    }

    // Check for environment variable first
    const envWsUrl = (import.meta as any).env?.VITE_WS_BASE_URL;
    if (envWsUrl) {
      // If it's a full URL, use it directly
      if (envWsUrl.startsWith('ws://') || envWsUrl.startsWith('wss://')) {
        return envWsUrl;
      }
      // If it's a path, construct full URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      return `${protocol}//${host}${envWsUrl}`;
    }

    // Fallback to auto-detection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    
    // If development server (port 3000), connect to backend port (3001)
    if (host.includes(':3000')) {
      return `${protocol}//${host.replace(':3000', ':3001')}/ws`;
    }
    
    return `${protocol}//${host}/ws`;
  }

  private log(message: string, data?: any): void {
    if (this.options.debug) {
      console.log(`[WebSocket] ${message}`, data || '');
    }
  }

  private logError(message: string, error?: any): void {
    console.error(`[WebSocket] ${message}`, error || '');
  }

  public async connect(): Promise<void> {
    if (this.isConnected || this.isConnecting) {
      return this.connectionPromise || Promise.resolve();
    }

    this.isConnecting = true;
    this.connectionPromise = this.performConnection();
    
    try {
      await this.connectionPromise;
    } finally {
      this.isConnecting = false;
    }

    return this.connectionPromise;
  }

  private async performConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.log('Attempting to connect to WebSocket server');
        this.ws = new WebSocket(this.url);

        const connectionTimeout = setTimeout(() => {
          this.logError('Connection timeout');
          this.ws?.close();
          reject(new Error('Connection timeout'));
        }, this.options.connectionTimeout);

        this.ws.onopen = () => {
          clearTimeout(connectionTimeout);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.log('WebSocket connected successfully');
          
          this.startHeartbeat();
          this.processMessageQueue();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws.onclose = (event) => {
          clearTimeout(connectionTimeout);
          this.handleDisconnection(event);
        };

        this.ws.onerror = (event) => {
          clearTimeout(connectionTimeout);
          this.logError('WebSocket error', event);
          if (!this.isConnected) {
            reject(new Error('Connection failed'));
          }
        };

      } catch (error) {
        this.logError('Failed to create WebSocket connection', error);
        reject(error);
      }
    });
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      this.log('Received message', { type: message.type, id: message.id });

      // Handle system messages
      switch (message.type) {
        case 'connection_established':
          this.clientId = message.data.clientId;
          this.log('Client ID assigned', this.clientId);
          break;

        case 'heartbeat_ack':
          this.lastHeartbeat = Date.now();
          break;

        case 'subscription_confirmed':
          this.log('Subscription confirmed', message.data.topic);
          break;

        case 'error':
          this.logError('Server error message', message.data);
          break;

        default:
          // Handle custom messages and topic subscriptions
          this.notifySubscribers(message);
      }

    } catch (error) {
      this.logError('Failed to parse WebSocket message', error);
    }
  }

  private notifySubscribers(message: WebSocketMessage): void {
    // Notify general subscribers
    const generalSubscribers = this.subscriptions.get('*');
    if (generalSubscribers) {
      generalSubscribers.forEach(callback => {
        try {
          callback(message);
        } catch (error) {
          this.logError('Error in subscriber callback', error);
        }
      });
    }

    // Notify specific topic subscribers
    const topicSubscribers = this.subscriptions.get(message.type);
    if (topicSubscribers) {
      topicSubscribers.forEach(callback => {
        try {
          callback(message);
        } catch (error) {
          this.logError('Error in topic subscriber callback', error);
        }
      });
    }

    // Notify session-specific subscribers
    if (message.sessionId) {
      const sessionSubscribers = this.subscriptions.get(`session:${message.sessionId}`);
      if (sessionSubscribers) {
        sessionSubscribers.forEach(callback => {
          try {
            callback(message);
          } catch (error) {
            this.logError('Error in session subscriber callback', error);
          }
        });
      }
    }

    // Notify agent-specific subscribers
    if (message.agentId) {
      const agentSubscribers = this.subscriptions.get(`agent:${message.agentId}`);
      if (agentSubscribers) {
        agentSubscribers.forEach(callback => {
          try {
            callback(message);
          } catch (error) {
            this.logError('Error in agent subscriber callback', error);
          }
        });
      }
    }
  }

  private handleDisconnection(event: CloseEvent): void {
    this.isConnected = false;
    this.stopHeartbeat();
    
    this.log('WebSocket disconnected', { 
      code: event.code, 
      reason: event.reason, 
      wasClean: event.wasClean 
    });

    // Only attempt reconnection for unexpected disconnections
    if (!event.wasClean && this.reconnectAttempts < this.options.maxReconnectAttempts) {
      this.scheduleReconnection();
    } else if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      this.logError('Max reconnection attempts reached');
    }
  }

  private scheduleReconnection(): void {
    const delay = this.options.reconnectInterval * Math.pow(2, Math.min(this.reconnectAttempts, 5));
    this.reconnectAttempts++;
    
    this.log(`Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimeout = window.setTimeout(() => {
      this.connect().catch(error => {
        this.logError('Reconnection failed', error);
      });
    }, delay);
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = window.setInterval(() => {
      if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
        this.sendMessage({
          id: `heartbeat_${Date.now()}`,
          type: 'heartbeat',
          data: { timestamp: Date.now() },
          timestamp: new Date().toISOString(),
          priority: 'low'
        });
      }
    }, this.options.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }

  private processMessageQueue(): void {
    if (this.messageQueue.length === 0) return;

    this.log(`Processing ${this.messageQueue.length} queued messages`);
    
    const messages = [...this.messageQueue];
    this.messageQueue = [];
    
    messages.forEach(message => {
      this.sendMessage(message);
    });
  }

  public sendMessage(message: WebSocketMessage): boolean {
    if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // Queue message for later delivery
      this.messageQueue.push(message);
      
      // Limit queue size
      if (this.messageQueue.length > 100) {
        this.messageQueue.shift(); // Remove oldest message
      }
      
      return false;
    }

    try {
      this.ws.send(JSON.stringify(message));
      this.log('Message sent', { type: message.type, id: message.id });
      return true;
    } catch (error) {
      this.logError('Failed to send message', error);
      this.messageQueue.push(message);
      return false;
    }
  }

  public subscribe(topic: string, callback: SubscriptionCallback): () => void {
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Set());
    }

    this.subscriptions.get(topic)!.add(callback);

    // Send subscription message to server
    this.sendMessage({
      id: `subscribe_${Date.now()}`,
      type: 'subscribe',
      data: { topic },
      timestamp: new Date().toISOString(),
      priority: 'normal'
    });

    this.log('Subscribed to topic', topic);

    // Return unsubscribe function
    return () => {
      this.unsubscribe(topic, callback);
    };
  }

  public unsubscribe(topic: string, callback: SubscriptionCallback): void {
    const subscribers = this.subscriptions.get(topic);
    if (subscribers) {
      subscribers.delete(callback);
      
      if (subscribers.size === 0) {
        this.subscriptions.delete(topic);
        
        // Send unsubscribe message to server
        this.sendMessage({
          id: `unsubscribe_${Date.now()}`,
          type: 'unsubscribe',
          data: { topic },
          timestamp: new Date().toISOString(),
          priority: 'normal'
        });
      }
    }

    this.log('Unsubscribed from topic', topic);
  }

  public subscribeToSession(sessionId: string, callback: SubscriptionCallback): () => void {
    // Send session connect message
    this.sendMessage({
      id: `session_connect_${Date.now()}`,
      type: 'session_connect',
      sessionId,
      data: { sessionId },
      timestamp: new Date().toISOString(),
      priority: 'normal'
    });

    return this.subscribe(`session:${sessionId}`, callback);
  }

  public subscribeToAgent(agentId: string, callback: SubscriptionCallback): () => void {
    // Send agent connect message
    this.sendMessage({
      id: `agent_connect_${Date.now()}`,
      type: 'agent_connect',
      agentId,
      data: { agentId },
      timestamp: new Date().toISOString(),
      priority: 'normal'
    });

    return this.subscribe(`agent:${agentId}`, callback);
  }

  public getConnectionStatus(): {
    isConnected: boolean;
    clientId?: string;
    reconnectAttempts: number;
    lastHeartbeat: number;
    queuedMessages: number;
  } {
    return {
      isConnected: this.isConnected,
      clientId: this.clientId,
      reconnectAttempts: this.reconnectAttempts,
      lastHeartbeat: this.lastHeartbeat,
      queuedMessages: this.messageQueue.length
    };
  }

  public disconnect(): void {
    this.log('Disconnecting WebSocket');
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = undefined;
    }

    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }

    this.isConnected = false;
    this.subscriptions.clear();
    this.messageQueue = [];
  }
}

// Global WebSocket client instance
let globalWebSocketClient: EnhancedWebSocketClient | null = null;

export function getWebSocketClient(options?: WebSocketOptions): EnhancedWebSocketClient {
  if (!globalWebSocketClient) {
    globalWebSocketClient = new EnhancedWebSocketClient(options);
  }
  return globalWebSocketClient;
}

export function disconnectWebSocketClient(): void {
  if (globalWebSocketClient) {
    globalWebSocketClient.disconnect();
    globalWebSocketClient = null;
  }
}

export default EnhancedWebSocketClient;
