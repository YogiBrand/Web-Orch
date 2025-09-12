/**
 * 🚀 MCP (Model Context Protocol) SERVICE
 * Manages communication with agent MCP servers
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import winston from 'winston';
import { AppError } from '../types';

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

interface MCPServerConfig {
  command: string[];
  args?: string[];
  env?: Record<string, string>;
  tools: string[];
  cwd?: string;
}

interface MCPMessage {
  id: string;
  type: 'request' | 'response' | 'notification';
  method?: string;
  params?: any;
  result?: any;
  error?: any;
}

interface MCPServerInstance {
  id: string;
  process: ChildProcess;
  config: MCPServerConfig;
  status: 'starting' | 'ready' | 'error' | 'stopped';
  lastActivity: Date;
  messageQueue: MCPMessage[];
  pendingRequests: Map<string, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
    timeout: NodeJS.Timeout;
  }>;
}

class MCPService extends EventEmitter {
  private servers: Map<string, MCPServerInstance> = new Map();
  private messageIdCounter = 0;
  private readonly requestTimeout = 30000; // 30 seconds

  constructor() {
    super();
  }

  private generateMessageId(): string {
    return `mcp_${++this.messageIdCounter}_${Date.now()}`;
  }

  private setupServerProcess(serverId: string, server: MCPServerInstance): void {
    const process = server.process;

    process.stdout?.on('data', (data: Buffer) => {
      try {
        const lines = data.toString().split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          const message = JSON.parse(line) as MCPMessage;
          this.handleServerMessage(serverId, message);
        }
      } catch (error) {
        logger.warn(`Invalid JSON from server ${serverId}:`, data.toString());
      }
    });

    process.stderr?.on('data', (data: Buffer) => {
      logger.error(`Server ${serverId} stderr:`, data.toString());
    });

    process.on('error', (error) => {
      logger.error(`Server ${serverId} process error:`, error);
      server.status = 'error';
      this.emit('serverError', { serverId, error });
    });

    process.on('exit', (code, signal) => {
      logger.warn(`Server ${serverId} exited with code ${code}, signal ${signal}`);
      server.status = 'stopped';
      this.emit('serverExit', { serverId, code, signal });
      
      // Clean up pending requests
      for (const [requestId, request] of server.pendingRequests) {
        clearTimeout(request.timeout);
        request.reject(new Error(`Server ${serverId} exited unexpectedly`));
      }
      server.pendingRequests.clear();
    });

    // Send initialization message
    this.sendServerMessage(serverId, {
      id: this.generateMessageId(),
      type: 'request',
      method: 'initialize',
      params: {
        protocolVersion: '1.0.0',
        capabilities: {
          tools: true,
          resources: true,
          logging: true
        }
      }
    }).then(() => {
      server.status = 'ready';
      logger.info(`MCP server ${serverId} initialized successfully`);
      this.emit('serverReady', { serverId });
    }).catch(error => {
      logger.error(`Failed to initialize server ${serverId}:`, error);
      server.status = 'error';
      this.emit('serverError', { serverId, error });
    });
  }

  private handleServerMessage(serverId: string, message: MCPMessage): void {
    const server = this.servers.get(serverId);
    if (!server) return;

    server.lastActivity = new Date();

    if (message.type === 'response') {
      // Handle response to our request
      const pendingRequest = server.pendingRequests.get(message.id);
      if (pendingRequest) {
        clearTimeout(pendingRequest.timeout);
        server.pendingRequests.delete(message.id);

        if (message.error) {
          pendingRequest.reject(new Error(message.error.message || 'MCP server error'));
        } else {
          pendingRequest.resolve(message.result);
        }
      }
    } else if (message.type === 'notification') {
      // Handle server notification
      this.emit('serverNotification', { serverId, message });
      logger.info(`Server ${serverId} notification:`, message);
    } else if (message.type === 'request') {
      // Handle server request (e.g., tool execution from server side)
      this.handleServerRequest(serverId, message);
    }
  }

  private handleServerRequest(serverId: string, message: MCPMessage): void {
    // Handle requests from the server (if any)
    logger.info(`Server ${serverId} request:`, message);
    
    // Send acknowledgment for now
    this.sendServerMessage(serverId, {
      id: message.id,
      type: 'response',
      result: { acknowledged: true }
    }).catch(error => {
      logger.error(`Failed to acknowledge server request:`, error);
    });
  }

  private async sendServerMessage(serverId: string, message: MCPMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      const server = this.servers.get(serverId);
      if (!server) {
        reject(new Error(`Server ${serverId} not found`));
        return;
      }

      if (server.status !== 'ready' && message.method !== 'initialize') {
        reject(new Error(`Server ${serverId} not ready (status: ${server.status})`));
        return;
      }

      try {
        const messageStr = JSON.stringify(message) + '\n';
        server.process.stdin?.write(messageStr);

        if (message.type === 'request') {
          // Set up response handler
          const timeout = setTimeout(() => {
            server.pendingRequests.delete(message.id);
            reject(new Error(`Request timeout for server ${serverId}`));
          }, this.requestTimeout);

          server.pendingRequests.set(message.id, {
            resolve,
            reject,
            timeout
          });
        } else {
          // For notifications and responses, resolve immediately
          resolve(true);
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  // =============================================
  // PUBLIC API
  // =============================================

  public async registerServer(agentId: string, config: MCPServerConfig): Promise<void> {
    if (this.servers.has(agentId)) {
      throw new AppError(`Server ${agentId} already registered`, 400);
    }

    try {
      logger.info(`Starting MCP server for ${agentId}:`, config.command);

      const process = spawn(config.command[0], config.command.slice(1), {
        env: { ...process.env, ...config.env },
        cwd: config.cwd || process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      const server: MCPServerInstance = {
        id: agentId,
        process,
        config,
        status: 'starting',
        lastActivity: new Date(),
        messageQueue: [],
        pendingRequests: new Map()
      };

      this.servers.set(agentId, server);
      this.setupServerProcess(agentId, server);

      logger.info(`MCP server ${agentId} started with PID ${process.pid}`);

    } catch (error) {
      logger.error(`Failed to start MCP server for ${agentId}:`, error);
      throw new AppError(`Failed to start MCP server: ${error}`, 500);
    }
  }

  public async sendMessage(agentId: string, payload: any): Promise<any> {
    const server = this.servers.get(agentId);
    if (!server) {
      throw new AppError(`Agent ${agentId} not found`, 404);
    }

    if (server.status !== 'ready') {
      throw new AppError(`Agent ${agentId} not ready (status: ${server.status})`, 503);
    }

    const message: MCPMessage = {
      id: this.generateMessageId(),
      type: 'request',
      method: 'chat',
      params: payload
    };

    try {
      const result = await this.sendServerMessage(agentId, message);
      
      return {
        content: result.content || result.message || 'No response',
        metadata: result.metadata || {},
        toolCalls: result.toolCalls || []
      };
    } catch (error) {
      logger.error(`Failed to send message to agent ${agentId}:`, error);
      throw new AppError(`Agent communication failed: ${error}`, 500);
    }
  }

  public async executeTool(agentId: string, toolName: string, parameters: any): Promise<any> {
    const server = this.servers.get(agentId);
    if (!server) {
      throw new AppError(`Agent ${agentId} not found`, 404);
    }

    if (server.status !== 'ready') {
      throw new AppError(`Agent ${agentId} not ready`, 503);
    }

    // Check if tool is available
    if (!server.config.tools.includes(toolName)) {
      throw new AppError(`Tool ${toolName} not available for agent ${agentId}`, 400);
    }

    const message: MCPMessage = {
      id: this.generateMessageId(),
      type: 'request',
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: parameters
      }
    };

    try {
      const result = await this.sendServerMessage(agentId, message);
      return result;
    } catch (error) {
      logger.error(`Tool execution failed for ${agentId}.${toolName}:`, error);
      throw new AppError(`Tool execution failed: ${error}`, 500);
    }
  }

  public async getAvailableTools(agentId: string): Promise<string[]> {
    const server = this.servers.get(agentId);
    if (!server) {
      throw new AppError(`Agent ${agentId} not found`, 404);
    }

    const message: MCPMessage = {
      id: this.generateMessageId(),
      type: 'request',
      method: 'tools/list'
    };

    try {
      const result = await this.sendServerMessage(agentId, message);
      return result.tools?.map((tool: any) => tool.name) || server.config.tools;
    } catch (error) {
      // Fallback to configured tools
      return server.config.tools;
    }
  }

  public getServerStatus(agentId: string): {
    status: string;
    lastActivity: Date;
    pendingRequests: number;
  } | null {
    const server = this.servers.get(agentId);
    if (!server) return null;

    return {
      status: server.status,
      lastActivity: server.lastActivity,
      pendingRequests: server.pendingRequests.size
    };
  }

  public getAllServerStatuses(): Record<string, any> {
    const statuses: Record<string, any> = {};
    
    for (const [agentId, server] of this.servers) {
      statuses[agentId] = {
        status: server.status,
        lastActivity: server.lastActivity,
        pendingRequests: server.pendingRequests.size,
        availableTools: server.config.tools,
        pid: server.process.pid
      };
    }

    return statuses;
  }

  public async stopServer(agentId: string): Promise<void> {
    const server = this.servers.get(agentId);
    if (!server) {
      throw new AppError(`Agent ${agentId} not found`, 404);
    }

    try {
      // Send shutdown message if server is ready
      if (server.status === 'ready') {
        await this.sendServerMessage(agentId, {
          id: this.generateMessageId(),
          type: 'notification',
          method: 'shutdown'
        });
      }

      // Kill process
      server.process.kill('SIGTERM');
      
      // Wait for graceful shutdown, then force kill if needed
      setTimeout(() => {
        if (!server.process.killed) {
          server.process.kill('SIGKILL');
        }
      }, 5000);

      server.status = 'stopped';
      this.servers.delete(agentId);

      logger.info(`MCP server ${agentId} stopped`);
    } catch (error) {
      logger.error(`Error stopping server ${agentId}:`, error);
      throw new AppError(`Failed to stop server: ${error}`, 500);
    }
  }

  public async healthCheck(): Promise<{
    status: string;
    servers: Record<string, any>;
    totalServers: number;
    readyServers: number;
  }> {
    const servers = this.getAllServerStatuses();
    const totalServers = Object.keys(servers).length;
    const readyServers = Object.values(servers).filter((s: any) => s.status === 'ready').length;

    return {
      status: readyServers === totalServers ? 'healthy' : 'degraded',
      servers,
      totalServers,
      readyServers
    };
  }

  public async close(): Promise<void> {
    const shutdownPromises = Array.from(this.servers.keys()).map(agentId => 
      this.stopServer(agentId).catch(error => 
        logger.error(`Error stopping server ${agentId} during shutdown:`, error)
      )
    );

    await Promise.all(shutdownPromises);
    this.removeAllListeners();
    logger.info('MCP Service closed');
  }
}

export default MCPService;
export { MCPServerConfig, MCPMessage, MCPServerInstance };