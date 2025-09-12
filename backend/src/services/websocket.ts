import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage, Server as HttpServer } from 'http';
import { URL } from 'url';
import winston from 'winston';
import jwt from 'jsonwebtoken';
import { EventEmitter } from 'events';
import { 
  WebSocketMessage, 
  TaskProgressMessage, 
  LogEvent, 
  TaskStatus,
  AppError 
} from '../types';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'websocket.log' })
  ]
});

interface WebSocketClient {
  id: string;
  ws: WebSocket;
  authenticated: boolean;
  user_id?: string;
  subscriptions: Set<string>;
  last_ping: number;
  created_at: number;
  message_count: number;
  ip_address: string;
  user_agent?: string;
}

interface SubscriptionFilter {
  run_id?: string;
  session_id?: string;
  tool?: string;
  event_type?: string;
  status?: TaskStatus;
}

export class WebSocketService extends EventEmitter {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WebSocketClient> = new Map();
  private subscriptions: Map<string, Set<string>> = new Map(); // subscription_key -> client_ids
  private messageQueue: Map<string, WebSocketMessage[]> = new Map(); // client_id -> messages
  private pingInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private jwtSecret: string;
  private maxConnections: number = 1000;
  private messageRateLimit: number = 100; // messages per minute
  private rateLimitWindow: number = 60000; // 1 minute

  constructor(jwtSecret: string, maxConnections = 1000) {
    super();
    this.jwtSecret = jwtSecret;
    this.maxConnections = maxConnections;
  }

  initialize(port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.wss = new WebSocketServer({
          port,
          perMessageDeflate: {
            zlibDeflateOptions: {
              level: 1
            }
          },
          maxPayload: 1024 * 1024 // 1MB max message size
        });

        this.wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
          this.handleConnection(ws, request);
        });

        this.wss.on('error', (error) => {
          logger.error('WebSocket server error:', error);
          this.emit('error', error);
        });

        // Start periodic ping to keep connections alive
        this.pingInterval = setInterval(() => {
          this.pingClients();
        }, 30000); // 30 seconds

        // Start cleanup for dead connections
        this.cleanupInterval = setInterval(() => {
          this.cleanupConnections();
        }, 60000); // 1 minute

        logger.info(`WebSocket server started on port ${port}`);
        resolve();
      } catch (error) {
        logger.error('Failed to initialize WebSocket server:', error);
        reject(error);
      }
    });
  }

  // Initialize WebSocket on an existing HTTP server (same port) with optional path
  initializeOnServer(server: HttpServer, path: string = '/ws'): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.wss = new WebSocketServer({
          server,
          path,
          perMessageDeflate: {
            zlibDeflateOptions: { level: 1 }
          },
          maxPayload: 1024 * 1024,
        });

        this.wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
          this.handleConnection(ws, request);
        });

        this.wss.on('error', (error) => {
          logger.error('WebSocket server error:', error);
          this.emit('error', error);
        });

        this.pingInterval = setInterval(() => this.pingClients(), 30000);
        this.cleanupInterval = setInterval(() => this.cleanupConnections(), 60000);

        logger.info(`WebSocket server attached to existing HTTP server at path ${path}`);
        resolve();
      } catch (error) {
        logger.error('Failed to attach WebSocket server:', error);
        reject(error);
      }
    });
  }

  async close(): Promise<void> {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.wss) {
      // Close all client connections
      this.clients.forEach(client => {
        client.ws.close(1000, 'Server shutting down');
      });

      this.wss.close();
      this.wss = null;
    }

    this.clients.clear();
    this.subscriptions.clear();
    this.messageQueue.clear();

    logger.info('WebSocket service closed');
  }

  private handleConnection(ws: WebSocket, request: IncomingMessage): void {
    const clientId = this.generateClientId();
    const ipAddress = request.socket.remoteAddress || 'unknown';
    const userAgent = request.headers['user-agent'];

    // Check connection limit
    if (this.clients.size >= this.maxConnections) {
      logger.warn('Connection limit exceeded', { ip: ipAddress });
      ws.close(1013, 'Server overloaded');
      return;
    }

    const client: WebSocketClient = {
      id: clientId,
      ws,
      authenticated: false,
      subscriptions: new Set(),
      last_ping: Date.now(),
      created_at: Date.now(),
      message_count: 0,
      ip_address: ipAddress,
      user_agent: userAgent
    };

    this.clients.set(clientId, client);

    // Parse query parameters for authentication
    if (request.url) {
      const url = new URL(request.url, 'http://localhost');
      const token = url.searchParams.get('token');
      if (token) {
        this.authenticateClient(client, token);
      }
    }

    ws.on('message', (data: Buffer) => {
      this.handleMessage(client, data);
    });

    ws.on('pong', () => {
      client.last_ping = Date.now();
    });

    ws.on('close', (code: number, reason: string) => {
      this.handleDisconnection(client, code, reason.toString());
    });

    ws.on('error', (error: Error) => {
      logger.error('WebSocket client error:', { client_id: clientId, error: error.message });
      this.handleDisconnection(client, 1006, 'Connection error');
    });

    logger.info('WebSocket client connected', {
      client_id: clientId,
      ip: ipAddress,
      total_clients: this.clients.size
    });

    // Send welcome message
    this.sendToClient(client, {
      type: 'system_alert',
      payload: {
        message: 'Connected to agent logging system',
        client_id: clientId,
        authenticated: client.authenticated
      },
      timestamp: new Date().toISOString()
    });
  }

  private handleMessage(client: WebSocketClient, data: Buffer): void {
    try {
      // Rate limiting check
      if (!this.checkRateLimit(client)) {
        this.sendError(client, 'Rate limit exceeded', 429);
        return;
      }

      const message = JSON.parse(data.toString());
      client.message_count++;

      logger.debug('WebSocket message received', {
        client_id: client.id,
        type: message.type,
        authenticated: client.authenticated
      });

      switch (message.type) {
        case 'authenticate':
          this.authenticateClient(client, message.token);
          break;

        case 'subscribe':
          this.handleSubscription(client, message.subscription, message.filters);
          break;

        case 'unsubscribe':
          this.handleUnsubscription(client, message.subscription);
          break;

        case 'ping':
          this.sendToClient(client, {
            type: 'system_alert',
            payload: { message: 'pong' },
            timestamp: new Date().toISOString()
          });
          break;

        case 'get_status':
          this.sendStatus(client);
          break;

        default:
          this.sendError(client, `Unknown message type: ${message.type}`, 400);
      }
    } catch (error) {
      logger.error('Message handling error:', {
        client_id: client.id,
        error: error.message
      });
      this.sendError(client, 'Invalid message format', 400);
    }
  }

  private authenticateClient(client: WebSocketClient, token: string): void {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      client.authenticated = true;
      client.user_id = decoded.user_id || decoded.sub;

      logger.info('Client authenticated', {
        client_id: client.id,
        user_id: client.user_id
      });

      this.sendToClient(client, {
        type: 'system_alert',
        payload: {
          message: 'Authentication successful',
          user_id: client.user_id
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.warn('Authentication failed', {
        client_id: client.id,
        error: error.message
      });

      this.sendError(client, 'Authentication failed', 401);
    }
  }

  private handleSubscription(client: WebSocketClient, subscription: string, filters?: SubscriptionFilter): void {
    if (!client.authenticated) {
      this.sendError(client, 'Authentication required for subscriptions', 401);
      return;
    }

    const subscriptionKey = this.generateSubscriptionKey(subscription, filters);
    
    // Add client to subscription
    if (!this.subscriptions.has(subscriptionKey)) {
      this.subscriptions.set(subscriptionKey, new Set());
    }
    this.subscriptions.get(subscriptionKey)!.add(client.id);
    client.subscriptions.add(subscriptionKey);

    logger.info('Client subscribed', {
      client_id: client.id,
      subscription: subscription,
      filters: filters,
      subscription_key: subscriptionKey
    });

    this.sendToClient(client, {
      type: 'system_alert',
      payload: {
        message: `Subscribed to ${subscription}`,
        subscription_key: subscriptionKey,
        filters: filters
      },
      timestamp: new Date().toISOString()
    });
  }

  private handleUnsubscription(client: WebSocketClient, subscription: string): void {
    const keysToRemove = Array.from(client.subscriptions).filter(key => 
      key.includes(subscription)
    );

    for (const key of keysToRemove) {
      client.subscriptions.delete(key);
      const subscribers = this.subscriptions.get(key);
      if (subscribers) {
        subscribers.delete(client.id);
        if (subscribers.size === 0) {
          this.subscriptions.delete(key);
        }
      }
    }

    logger.info('Client unsubscribed', {
      client_id: client.id,
      subscription: subscription,
      removed_keys: keysToRemove.length
    });

    this.sendToClient(client, {
      type: 'system_alert',
      payload: {
        message: `Unsubscribed from ${subscription}`,
        removed_subscriptions: keysToRemove.length
      },
      timestamp: new Date().toISOString()
    });
  }

  private handleDisconnection(client: WebSocketClient, code: number, reason: string): void {
    // Remove client from all subscriptions
    for (const subscriptionKey of client.subscriptions) {
      const subscribers = this.subscriptions.get(subscriptionKey);
      if (subscribers) {
        subscribers.delete(client.id);
        if (subscribers.size === 0) {
          this.subscriptions.delete(subscriptionKey);
        }
      }
    }

    // Clear message queue
    this.messageQueue.delete(client.id);
    
    // Remove client
    this.clients.delete(client.id);

    logger.info('WebSocket client disconnected', {
      client_id: client.id,
      code,
      reason,
      session_duration_ms: Date.now() - client.created_at,
      message_count: client.message_count,
      total_clients: this.clients.size
    });
  }

  // Public methods for broadcasting messages
  broadcastLogUpdate(logEvent: LogEvent): void {
    const message: WebSocketMessage = {
      type: 'log_update',
      payload: logEvent,
      timestamp: new Date().toISOString()
    };

    // Find matching subscriptions
    const matchingKeys = this.findMatchingSubscriptions('logs', {
      run_id: logEvent.run_id,
      tool: logEvent.tool,
      event_type: logEvent.event_type,
      status: logEvent.status
    });

    this.broadcastToSubscriptions(matchingKeys, message);
  }

  broadcastTaskProgress(progress: TaskProgressMessage): void {
    const message: WebSocketMessage = {
      type: 'task_progress',
      payload: progress,
      timestamp: new Date().toISOString()
    };

    // Find matching subscriptions
    const matchingKeys = this.findMatchingSubscriptions('tasks', {
      run_id: progress.run_id,
      status: progress.status
    });

    this.broadcastToSubscriptions(matchingKeys, message);
  }

  broadcastSystemAlert(alert: { message: string; level: 'info' | 'warn' | 'error'; data?: any }): void {
    const message: WebSocketMessage = {
      type: 'system_alert',
      payload: alert,
      timestamp: new Date().toISOString()
    };

    // Broadcast to all authenticated clients
    const authenticatedClients = Array.from(this.clients.values())
      .filter(client => client.authenticated);

    for (const client of authenticatedClients) {
      this.sendToClient(client, message);
    }
  }

  broadcastAnalyticsUpdate(analytics: any): void {
    const message: WebSocketMessage = {
      type: 'analytics_update',
      payload: analytics,
      timestamp: new Date().toISOString()
    };

    // Find analytics subscriptions
    const matchingKeys = this.findMatchingSubscriptions('analytics', {});
    this.broadcastToSubscriptions(matchingKeys, message);
  }

  // Private helper methods
  private broadcastToSubscriptions(subscriptionKeys: string[], message: WebSocketMessage): void {
    const clientIds = new Set<string>();
    
    for (const key of subscriptionKeys) {
      const subscribers = this.subscriptions.get(key);
      if (subscribers) {
        for (const clientId of subscribers) {
          clientIds.add(clientId);
        }
      }
    }

    for (const clientId of clientIds) {
      const client = this.clients.get(clientId);
      if (client) {
        this.sendToClient(client, message);
      }
    }
  }

  private findMatchingSubscriptions(type: string, filters: SubscriptionFilter): string[] {
    const matchingKeys: string[] = [];
    
    for (const subscriptionKey of this.subscriptions.keys()) {
      if (subscriptionKey.includes(type)) {
        // Parse the subscription key to check if it matches filters
        if (this.subscriptionMatches(subscriptionKey, filters)) {
          matchingKeys.push(subscriptionKey);
        }
      }
    }
    
    return matchingKeys;
  }

  private subscriptionMatches(subscriptionKey: string, filters: SubscriptionFilter): boolean {
    try {
      // Simple matching logic - in production, you might want more sophisticated filtering
      if (filters.run_id && !subscriptionKey.includes(filters.run_id)) {
        return false;
      }
      if (filters.tool && !subscriptionKey.includes(filters.tool)) {
        return false;
      }
      return true;
    } catch {
      return true; // Default to match if parsing fails
    }
  }

  private sendToClient(client: WebSocketClient, message: WebSocketMessage): void {
    if (client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(message));
      } catch (error) {
        logger.error('Failed to send message to client:', {
          client_id: client.id,
          error: error.message
        });
        // Queue message for retry if connection is temporarily unavailable
        this.queueMessage(client.id, message);
      }
    } else {
      // Queue message if connection is not open
      this.queueMessage(client.id, message);
    }
  }

  private queueMessage(clientId: string, message: WebSocketMessage): void {
    if (!this.messageQueue.has(clientId)) {
      this.messageQueue.set(clientId, []);
    }
    
    const queue = this.messageQueue.get(clientId)!;
    queue.push(message);
    
    // Limit queue size
    if (queue.length > 100) {
      queue.shift(); // Remove oldest message
    }
  }

  private sendError(client: WebSocketClient, error: string, code: number): void {
    this.sendToClient(client, {
      type: 'system_alert',
      payload: {
        error,
        code,
        level: 'error'
      },
      timestamp: new Date().toISOString()
    });
  }

  private sendStatus(client: WebSocketClient): void {
    const status = {
      client_id: client.id,
      authenticated: client.authenticated,
      user_id: client.user_id,
      subscriptions: Array.from(client.subscriptions),
      connected_at: new Date(client.created_at).toISOString(),
      message_count: client.message_count,
      server_stats: {
        total_clients: this.clients.size,
        total_subscriptions: this.subscriptions.size,
        authenticated_clients: Array.from(this.clients.values())
          .filter(c => c.authenticated).length
      }
    };

    this.sendToClient(client, {
      type: 'system_alert',
      payload: status,
      timestamp: new Date().toISOString()
    });
  }

  private checkRateLimit(client: WebSocketClient): boolean {
    const now = Date.now();
    const windowStart = now - this.rateLimitWindow;
    
    // Simple rate limiting - count messages in the last minute
    // In production, you might want a more sophisticated sliding window
    if (client.message_count > this.messageRateLimit) {
      return false;
    }
    
    return true;
  }

  private pingClients(): void {
    const now = Date.now();
    const staleThreshold = 60000; // 1 minute
    
    for (const client of this.clients.values()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        if (now - client.last_ping > staleThreshold) {
          client.ws.ping();
        }
        
        // Send queued messages
        const queue = this.messageQueue.get(client.id);
        if (queue && queue.length > 0) {
          const messages = queue.splice(0, 10); // Send up to 10 messages at once
          for (const message of messages) {
            this.sendToClient(client, message);
          }
        }
      }
    }
  }

  private cleanupConnections(): void {
    const now = Date.now();
    const timeout = 120000; // 2 minutes
    
    const clientsToRemove: string[] = [];
    
    for (const [clientId, client] of this.clients.entries()) {
      if (client.ws.readyState === WebSocket.CLOSED || 
          client.ws.readyState === WebSocket.CLOSING ||
          now - client.last_ping > timeout) {
        clientsToRemove.push(clientId);
      }
    }
    
    for (const clientId of clientsToRemove) {
      const client = this.clients.get(clientId);
      if (client) {
        this.handleDisconnection(client, 1006, 'Cleanup timeout');
      }
    }
    
    if (clientsToRemove.length > 0) {
      logger.info('Cleaned up stale connections', { count: clientsToRemove.length });
    }
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private generateSubscriptionKey(subscription: string, filters?: SubscriptionFilter): string {
    const parts = [subscription];
    
    if (filters) {
      if (filters.run_id) parts.push(`run:${filters.run_id}`);
      if (filters.tool) parts.push(`tool:${filters.tool}`);
      if (filters.event_type) parts.push(`event:${filters.event_type}`);
      if (filters.status) parts.push(`status:${filters.status}`);
    }
    
    return parts.join('|');
  }

  // Public getters for service statistics
  getStats(): {
    total_clients: number;
    authenticated_clients: number;
    total_subscriptions: number;
    total_messages_sent: number;
    queued_messages: number;
  } {
    const authenticatedCount = Array.from(this.clients.values())
      .filter(client => client.authenticated).length;
    
    const totalMessagesSent = Array.from(this.clients.values())
      .reduce((sum, client) => sum + client.message_count, 0);
    
    const queuedMessages = Array.from(this.messageQueue.values())
      .reduce((sum, queue) => sum + queue.length, 0);
    
    return {
      total_clients: this.clients.size,
      authenticated_clients: authenticatedCount,
      total_subscriptions: this.subscriptions.size,
      total_messages_sent: totalMessagesSent,
      queued_messages: queuedMessages
    };
  }

  getClientInfo(clientId: string): WebSocketClient | null {
    return this.clients.get(clientId) || null;
  }

  disconnectClient(clientId: string, reason = 'Server request'): boolean {
    const client = this.clients.get(clientId);
    if (client) {
      client.ws.close(1000, reason);
      return true;
    }
    return false;
  }
}

export default WebSocketService;
