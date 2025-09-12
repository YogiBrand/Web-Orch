/**
 * 🚀 AGENT ORCHESTRATOR SERVICE
 * Coordinates multiple specialized agents for LibreChat integration
 */

import { EventEmitter } from 'events';
import winston from 'winston';
import MCPService from './mcp';
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

interface AgentTask {
  id: string;
  agentId: string;
  type: 'message' | 'tool_call' | 'analysis';
  payload: any;
  context: any;
  priority: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'timeout';
  result?: any;
  error?: string;
  retryCount: number;
  maxRetries: number;
}

interface AgentResponse {
  agentId: string;
  message?: string;
  response?: string;
  toolCalls?: any[];
  metadata?: Record<string, any>;
  status: 'success' | 'error' | 'timeout';
  executionTime: number;
  error?: string;
}

interface AgentStatus {
  agentId: string;
  status: 'idle' | 'busy' | 'error' | 'offline';
  currentTask?: string;
  lastActivity: Date;
  totalTasks: number;
  successfulTasks: number;
  failedTasks: number;
  averageResponseTime: number;
}

class AgentOrchestrator extends EventEmitter {
  private mcpService: MCPService;
  private agents: Map<string, AgentStatus> = new Map();
  private taskQueue: AgentTask[] = [];
  private activeTasks: Map<string, AgentTask> = new Map();
  private taskHistory: AgentTask[] = [];
  private isProcessing: boolean = false;
  private processingInterval?: NodeJS.Timeout;
  private readonly maxConcurrentTasks = 10;
  private readonly taskTimeout = 30000; // 30 seconds

  constructor(mcpService: MCPService) {
    super();
    this.mcpService = mcpService;
    this.setupAgentStatusTracking();
    this.startTaskProcessing();
  }

  private setupAgentStatusTracking(): void {
    // Initialize known agents
    const knownAgents = [
      'claude-code-ide',
      'google-cli-researcher', 
      'browser-automation',
      'crawl4ai',
      'system-architect',
      'database-engineer'
    ];

    knownAgents.forEach(agentId => {
      this.agents.set(agentId, {
        agentId,
        status: 'idle',
        lastActivity: new Date(),
        totalTasks: 0,
        successfulTasks: 0,
        failedTasks: 0,
        averageResponseTime: 0
      });
    });
  }

  private startTaskProcessing(): void {
    this.processingInterval = setInterval(() => {
      if (!this.isProcessing && this.taskQueue.length > 0) {
        this.processTasks().catch(error => {
          logger.error('Task processing error:', error);
        });
      }
    }, 100); // Check every 100ms
  }

  private async processTasks(): Promise<void> {
    if (this.isProcessing || this.activeTasks.size >= this.maxConcurrentTasks) {
      return;
    }

    this.isProcessing = true;

    try {
      // Sort tasks by priority
      this.taskQueue.sort((a, b) => b.priority - a.priority);

      const tasksToProcess = this.taskQueue.splice(0, this.maxConcurrentTasks - this.activeTasks.size);

      for (const task of tasksToProcess) {
        this.executeTask(task).catch(error => {
          logger.error(`Task execution failed for ${task.id}:`, error);
          this.handleTaskFailure(task, error.message);
        });
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async executeTask(task: AgentTask): Promise<void> {
    task.status = 'executing';
    task.startedAt = new Date();
    this.activeTasks.set(task.id, task);

    // Update agent status
    const agentStatus = this.agents.get(task.agentId);
    if (agentStatus) {
      agentStatus.status = 'busy';
      agentStatus.currentTask = task.id;
      agentStatus.totalTasks++;
      agentStatus.lastActivity = new Date();
    }

    // Set timeout
    const timeoutId = setTimeout(() => {
      if (this.activeTasks.has(task.id)) {
        this.handleTaskTimeout(task);
      }
    }, this.taskTimeout);

    try {
      let result;

      switch (task.type) {
        case 'message':
          result = await this.handleMessageTask(task);
          break;
        case 'tool_call':
          result = await this.handleToolCallTask(task);
          break;
        case 'analysis':
          result = await this.handleAnalysisTask(task);
          break;
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }

      // Task completed successfully
      clearTimeout(timeoutId);
      task.status = 'completed';
      task.completedAt = new Date();
      task.result = result;

      this.activeTasks.delete(task.id);
      this.taskHistory.push(task);

      // Update agent status
      if (agentStatus) {
        agentStatus.status = 'idle';
        agentStatus.currentTask = undefined;
        agentStatus.successfulTasks++;
        
        // Update average response time
        const responseTime = task.completedAt.getTime() - task.startedAt!.getTime();
        agentStatus.averageResponseTime = 
          (agentStatus.averageResponseTime * (agentStatus.successfulTasks - 1) + responseTime) / 
          agentStatus.successfulTasks;
      }

      this.emit('taskCompleted', { task, result });
      logger.info(`Task ${task.id} completed for agent ${task.agentId}`);

    } catch (error) {
      clearTimeout(timeoutId);
      this.handleTaskFailure(task, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async handleMessageTask(task: AgentTask): Promise<AgentResponse> {
    const startTime = Date.now();

    try {
      // Route message to agent via MCP
      const response = await this.mcpService.sendMessage(task.agentId, {
        type: 'message',
        content: task.payload.message.content,
        context: task.context
      });

      return {
        agentId: task.agentId,
        message: response.content,
        response: response.content,
        metadata: response.metadata,
        toolCalls: response.toolCalls,
        status: 'success',
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      return {
        agentId: task.agentId,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime
      };
    }
  }

  private async handleToolCallTask(task: AgentTask): Promise<AgentResponse> {
    const startTime = Date.now();

    try {
      const response = await this.mcpService.executeTool(
        task.agentId,
        task.payload.tool,
        task.payload.parameters
      );

      return {
        agentId: task.agentId,
        message: `Tool ${task.payload.tool} executed successfully`,
        toolCalls: [{
          id: task.payload.toolCallId,
          tool: task.payload.tool,
          result: response,
          status: 'completed'
        }],
        status: 'success',
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      return {
        agentId: task.agentId,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        toolCalls: [{
          id: task.payload.toolCallId,
          tool: task.payload.tool,
          status: 'failed'
        }],
        executionTime: Date.now() - startTime
      };
    }
  }

  private async handleAnalysisTask(task: AgentTask): Promise<AgentResponse> {
    const startTime = Date.now();

    try {
      // Send analysis request to agent
      const response = await this.mcpService.sendMessage(task.agentId, {
        type: 'analysis',
        data: task.payload.data,
        analysisType: task.payload.analysisType,
        context: task.context
      });

      return {
        agentId: task.agentId,
        message: response.content,
        metadata: {
          analysisType: task.payload.analysisType,
          ...response.metadata
        },
        status: 'success',
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      return {
        agentId: task.agentId,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime
      };
    }
  }

  private handleTaskFailure(task: AgentTask, error: string): void {
    task.status = 'failed';
    task.error = error;
    task.completedAt = new Date();

    this.activeTasks.delete(task.id);
    this.taskHistory.push(task);

    // Update agent status
    const agentStatus = this.agents.get(task.agentId);
    if (agentStatus) {
      agentStatus.status = 'error';
      agentStatus.currentTask = undefined;
      agentStatus.failedTasks++;
    }

    // Retry logic
    if (task.retryCount < task.maxRetries) {
      task.retryCount++;
      task.status = 'pending';
      task.startedAt = undefined;
      task.completedAt = undefined;
      task.error = undefined;
      
      // Add back to queue with lower priority
      task.priority = Math.max(1, task.priority - 1);
      this.taskQueue.push(task);
      
      logger.warn(`Retrying task ${task.id} (attempt ${task.retryCount}/${task.maxRetries})`);
    } else {
      this.emit('taskFailed', { task, error });
      logger.error(`Task ${task.id} failed permanently: ${error}`);
    }
  }

  private handleTaskTimeout(task: AgentTask): void {
    task.status = 'timeout';
    task.error = 'Task execution timeout';
    this.handleTaskFailure(task, 'Task execution timeout');
  }

  // =============================================
  // PUBLIC API
  // =============================================

  public async routeToAgent(agentId: string, payload: any): Promise<AgentResponse> {
    return new Promise((resolve, reject) => {
      const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const task: AgentTask = {
        id: taskId,
        agentId,
        type: 'message',
        payload,
        context: payload.context || {},
        priority: 5,
        createdAt: new Date(),
        status: 'pending',
        retryCount: 0,
        maxRetries: 2
      };

      // Listen for task completion
      const onTaskCompleted = (event: { task: AgentTask; result: AgentResponse }) => {
        if (event.task.id === taskId) {
          this.removeListener('taskCompleted', onTaskCompleted);
          this.removeListener('taskFailed', onTaskFailed);
          resolve(event.result);
        }
      };

      const onTaskFailed = (event: { task: AgentTask; error: string }) => {
        if (event.task.id === taskId) {
          this.removeListener('taskCompleted', onTaskCompleted);
          this.removeListener('taskFailed', onTaskFailed);
          reject(new Error(`Task failed: ${event.error}`));
        }
      };

      this.on('taskCompleted', onTaskCompleted);
      this.on('taskFailed', onTaskFailed);

      // Add task to queue
      this.taskQueue.push(task);

      logger.info(`Task ${taskId} queued for agent ${agentId}`);
    });
  }

  public async executeToolCall(agentId: string, toolCall: any): Promise<AgentResponse> {
    return new Promise((resolve, reject) => {
      const taskId = `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const task: AgentTask = {
        id: taskId,
        agentId,
        type: 'tool_call',
        payload: toolCall,
        context: {},
        priority: 7, // Higher priority for tool calls
        createdAt: new Date(),
        status: 'pending',
        retryCount: 0,
        maxRetries: 1
      };

      const onTaskCompleted = (event: { task: AgentTask; result: AgentResponse }) => {
        if (event.task.id === taskId) {
          this.removeListener('taskCompleted', onTaskCompleted);
          this.removeListener('taskFailed', onTaskFailed);
          resolve(event.result);
        }
      };

      const onTaskFailed = (event: { task: AgentTask; error: string }) => {
        if (event.task.id === taskId) {
          this.removeListener('taskCompleted', onTaskCompleted);
          this.removeListener('taskFailed', onTaskFailed);
          reject(new Error(`Tool call failed: ${event.error}`));
        }
      };

      this.on('taskCompleted', onTaskCompleted);
      this.on('taskFailed', onTaskFailed);

      this.taskQueue.push(task);
    });
  }

  public getAgentStatus(agentId: string): AgentStatus | undefined {
    return this.agents.get(agentId);
  }

  public getAllAgentStatuses(): AgentStatus[] {
    return Array.from(this.agents.values());
  }

  public getQueueSize(): number {
    return this.taskQueue.length;
  }

  public getActiveTaskCount(): number {
    return this.activeTasks.size;
  }

  public getTaskHistory(limit: number = 100): AgentTask[] {
    return this.taskHistory.slice(-limit);
  }

  public async healthCheck(): Promise<{
    status: string;
    agents: Record<string, any>;
    queue: { pending: number; active: number };
    performance: { averageResponseTime: number; successRate: number };
  }> {
    const agents: Record<string, any> = {};
    let totalTasks = 0;
    let successfulTasks = 0;
    let totalResponseTime = 0;

    for (const [agentId, status] of this.agents) {
      agents[agentId] = {
        status: status.status,
        currentTask: status.currentTask,
        totalTasks: status.totalTasks,
        successfulTasks: status.successfulTasks,
        failedTasks: status.failedTasks,
        averageResponseTime: status.averageResponseTime,
        lastActivity: status.lastActivity
      };

      totalTasks += status.totalTasks;
      successfulTasks += status.successfulTasks;
      totalResponseTime += status.averageResponseTime * status.successfulTasks;
    }

    const overallSuccessRate = totalTasks > 0 ? (successfulTasks / totalTasks) * 100 : 100;
    const averageResponseTime = successfulTasks > 0 ? totalResponseTime / successfulTasks : 0;

    return {
      status: overallSuccessRate > 80 ? 'healthy' : 'degraded',
      agents,
      queue: {
        pending: this.taskQueue.length,
        active: this.activeTasks.size
      },
      performance: {
        averageResponseTime,
        successRate: overallSuccessRate
      }
    };
  }

  public async close(): Promise<void> {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    // Cancel all active tasks
    for (const task of this.activeTasks.values()) {
      task.status = 'failed';
      task.error = 'Service shutdown';
      task.completedAt = new Date();
    }

    this.activeTasks.clear();
    this.taskQueue.length = 0;
    this.removeAllListeners();

    logger.info('Agent Orchestrator service closed');
  }
}

export default AgentOrchestrator;
export { AgentTask, AgentResponse, AgentStatus };