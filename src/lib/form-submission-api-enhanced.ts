/**
 * Enhanced Production Form Submission API Client
 * Handles all 7 form submission agents with intelligent routing and monitoring
 */

import { api } from './api';

// Agent type definitions matching our Docker setup
export type FormAgentType = 
  | 'standard-form' 
  | 'mcp-intelligence' 
  | 'vision-analysis' 
  | 'skyvern-browser' 
  | 'browser-use' 
  | 'playwright-enhanced' 
  | 'selenium-grid'
  | 'auto'; // Let orchestrator decide

// Enhanced job interface with agent-specific details
export interface FormSubmissionJob {
  id: string;
  url: string;
  agent: FormAgentType;
  agentName: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';
  priority: number;
  progress: number;
  fieldsFound: number;
  fieldsCompleted: number;
  customData?: Record<string, string>;
  formData?: Record<string, string>;
  result?: {
    success: boolean;
    data?: any;
    screenshot?: string;
    executionTime?: number;
    retryCount?: number;
  };
  error?: string;
  screenshot?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  sessionId?: string;
  createdBy?: string;
  
  // Agent-specific metrics
  expectedSuccessRate?: number;
  expectedResponseTime?: number;
  actualResponseTime?: number;
}

// Agent status and capabilities
export interface FormAgent {
  id: string;
  name: string;
  type: FormAgentType;
  description: string;
  endpoint: string;
  status: 'online' | 'offline' | 'error' | 'maintenance';
  capabilities: string[];
  performance: {
    successRate: number;
    averageResponseTime: number;
    currentSessions: number;
    maxSessions: number;
    queueDepth: number;
  };
  configuration: {
    successRateTarget: number;
    responseTimeTarget: number;
    maxConcurrentSessions: number;
    timeout: number;
    specialFeatures?: string[];
  };
  healthStatus: 'healthy' | 'unhealthy' | 'unknown';
  lastHealthCheck?: string;
}

// Enhanced template interface
export interface FormSubmissionTemplate {
  id: string;
  name: string;
  description: string;
  urlPattern: string;
  fieldMappings: Record<string, string>;
  validationRules?: Record<string, any>;
  successIndicators?: string[];
  preferredAgents: FormAgentType[];
  usageCount: number;
  successRate: number;
  createdAt: string;
  updatedAt: string;
}

// Orchestration configuration
export interface OrchestrationConfig {
  strategy: 'round-robin' | 'performance' | 'weighted' | 'least-connections' | 'adaptive';
  loadBalancing: {
    enabled: boolean;
    weights: Record<FormAgentType, number>;
  };
  failover: {
    enabled: boolean;
    maxFailures: number;
    recoveryTimeout: number;
  };
  healthChecks: {
    interval: number;
    timeout: number;
    retries: number;
  };
}

// Performance metrics
export interface AgentMetrics {
  agent: FormAgentType;
  timestamp: string;
  successRate: number;
  averageResponseTime: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  currentSessions: number;
  queueDepth: number;
  cpuUsage?: number;
  memoryUsage?: number;
}

// WebSocket event types
interface WebSocketEvent {
  type: string;
  payload: any;
  timestamp: string;
}

class EnhancedFormSubmissionAPI {
  private baseUrl = '/api/form-submission';
  private orchestratorUrl = '/api/orchestration';
  private wsConnection?: WebSocket;
  private listeners: Set<(job: FormSubmissionJob) => void> = new Set();
  private agentListeners: Set<(agents: FormAgent[]) => void> = new Set();
  private metricsListeners: Set<(metrics: AgentMetrics[]) => void> = new Set();

  // ===== JOB MANAGEMENT =====

  /**
   * Submit a form with intelligent agent selection
   */
  async startSubmission(params: {
    url: string;
    customData?: Record<string, string>;
    formData?: Record<string, string>;
    agent?: FormAgentType;
    template?: string;
    priority?: number;
    sessionId?: string;
  }): Promise<FormSubmissionJob> {
    const response = await api.post(`${this.baseUrl}/start`, {
      url: params.url,
      customData: params.customData || {},
      formData: params.formData || {},
      agent: params.agent || 'auto',
      template: params.template,
      priority: params.priority || 5,
      sessionId: params.sessionId
    });
    
    return response.data;
  }

  /**
   * Get job status and details
   */
  async getJob(jobId: string): Promise<FormSubmissionJob> {
    const response = await api.get(`${this.baseUrl}/job/${jobId}`);
    return response.data;
  }

  /**
   * Get all jobs with filtering and pagination
   */
  async getAllJobs(params?: {
    status?: string;
    agent?: FormAgentType;
    limit?: number;
    offset?: number;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{
    jobs: FormSubmissionJob[];
    total: number;
    page: number;
    limit: number;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.agent) queryParams.append('agent', params.agent);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    if (params?.dateFrom) queryParams.append('dateFrom', params.dateFrom);
    if (params?.dateTo) queryParams.append('dateTo', params.dateTo);

    const response = await api.get(`${this.baseUrl}/jobs?${queryParams}`);
    return response.data;
  }

  /**
   * Cancel a running job
   */
  async cancelJob(jobId: string): Promise<void> {
    await api.post(`${this.baseUrl}/job/${jobId}/cancel`);
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId: string, newAgent?: FormAgentType): Promise<FormSubmissionJob> {
    const response = await api.post(`${this.baseUrl}/job/${jobId}/retry`, {
      agent: newAgent
    });
    return response.data;
  }

  // ===== AGENT MANAGEMENT =====

  /**
   * Get all available agents with their status
   */
  async getAgents(): Promise<FormAgent[]> {
    const response = await api.get(`${this.orchestratorUrl}/agents`);
    return response.data.agents;
  }

  /**
   * Get specific agent details
   */
  async getAgent(agentType: FormAgentType): Promise<FormAgent> {
    const response = await api.get(`${this.orchestratorUrl}/agents/${agentType}`);
    return response.data;
  }

  /**
   * Check health of all agents
   */
  async checkAgentsHealth(): Promise<Record<FormAgentType, 'healthy' | 'unhealthy'>> {
    const response = await api.get(`${this.orchestratorUrl}/health`);
    return response.data.agents;
  }

  /**
   * Get agent performance metrics
   */
  async getAgentMetrics(
    agentType?: FormAgentType,
    timeRange: 'hour' | 'day' | 'week' = 'hour'
  ): Promise<AgentMetrics[]> {
    const params = new URLSearchParams({ timeRange });
    if (agentType) params.append('agent', agentType);

    const response = await api.get(`${this.orchestratorUrl}/metrics?${params}`);
    return response.data.metrics;
  }

  // ===== ORCHESTRATION MANAGEMENT =====

  /**
   * Get orchestration configuration
   */
  async getOrchestrationConfig(): Promise<OrchestrationConfig> {
    const response = await api.get(`${this.orchestratorUrl}/config`);
    return response.data;
  }

  /**
   * Update orchestration configuration
   */
  async updateOrchestrationConfig(config: Partial<OrchestrationConfig>): Promise<OrchestrationConfig> {
    const response = await api.put(`${this.orchestratorUrl}/config`, config);
    return response.data;
  }

  /**
   * Get load balancing status
   */
  async getLoadBalancingStatus(): Promise<{
    strategy: string;
    agentLoads: Record<FormAgentType, number>;
    totalRequests: number;
    queueDepth: number;
  }> {
    const response = await api.get(`${this.orchestratorUrl}/load-balancing`);
    return response.data;
  }

  // ===== TEMPLATE MANAGEMENT =====

  /**
   * Get all form templates
   */
  async getTemplates(): Promise<FormSubmissionTemplate[]> {
    const response = await api.get(`${this.baseUrl}/templates`);
    return response.data;
  }

  /**
   * Create a new template
   */
  async createTemplate(template: Omit<FormSubmissionTemplate, 'id' | 'usageCount' | 'successRate' | 'createdAt' | 'updatedAt'>): Promise<FormSubmissionTemplate> {
    const response = await api.post(`${this.baseUrl}/templates`, template);
    return response.data;
  }

  /**
   * Update an existing template
   */
  async updateTemplate(id: string, template: Partial<FormSubmissionTemplate>): Promise<FormSubmissionTemplate> {
    const response = await api.put(`${this.baseUrl}/templates/${id}`, template);
    return response.data;
  }

  /**
   * Delete a template
   */
  async deleteTemplate(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}/templates/${id}`);
  }

  // ===== ANALYTICS =====

  /**
   * Get success rate analytics
   */
  async getSuccessRateAnalytics(timeRange: 'hour' | 'day' | 'week' | 'month' = 'day'): Promise<{
    overall: number;
    byAgent: Record<FormAgentType, number>;
    trend: Array<{ timestamp: string; rate: number; agent: FormAgentType }>;
  }> {
    const response = await api.get(`${this.baseUrl}/analytics/success-rate?timeRange=${timeRange}`);
    return response.data;
  }

  /**
   * Get performance analytics
   */
  async getPerformanceAnalytics(timeRange: 'hour' | 'day' | 'week' | 'month' = 'day'): Promise<{
    averageResponseTime: number;
    byAgent: Record<FormAgentType, number>;
    trend: Array<{ timestamp: string; responseTime: number; agent: FormAgentType }>;
  }> {
    const response = await api.get(`${this.baseUrl}/analytics/performance?timeRange=${timeRange}`);
    return response.data;
  }

  /**
   * Get usage statistics
   */
  async getUsageStatistics(timeRange: 'hour' | 'day' | 'week' | 'month' = 'day'): Promise<{
    totalSubmissions: number;
    byAgent: Record<FormAgentType, number>;
    byStatus: Record<string, number>;
    topDomains: Array<{ domain: string; count: number }>;
  }> {
    const response = await api.get(`${this.baseUrl}/analytics/usage?timeRange=${timeRange}`);
    return response.data;
  }

  // ===== WEBSOCKET REAL-TIME UPDATES =====

  /**
   * Connect to WebSocket for real-time updates
   */
  connectWebSocket(callbacks?: {
    onJobUpdate?: (job: FormSubmissionJob) => void;
    onAgentUpdate?: (agents: FormAgent[]) => void;
    onMetricsUpdate?: (metrics: AgentMetrics[]) => void;
    onError?: (error: Error) => void;
  }): () => void {
    // Add listeners
    if (callbacks?.onJobUpdate) this.listeners.add(callbacks.onJobUpdate);
    if (callbacks?.onAgentUpdate) this.agentListeners.add(callbacks.onAgentUpdate);
    if (callbacks?.onMetricsUpdate) this.metricsListeners.add(callbacks.onMetricsUpdate);

    if (!this.wsConnection || this.wsConnection.readyState !== WebSocket.OPEN) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const base = (import.meta as any).env?.VITE_WS_BASE_URL as string;
      const wsUrl = base && (base.startsWith('ws://') || base.startsWith('wss://'))
        ? base
        : `${protocol}//${window.location.host}/ws`;

      this.wsConnection = new WebSocket(wsUrl);

      this.wsConnection.onopen = () => {
        console.log('WebSocket connected to Form Submission system');
        
        // Subscribe to all relevant events
        try {
          this.wsConnection?.send(JSON.stringify({
            type: 'subscribe',
            channels: ['form_submission', 'agent_status', 'metrics', 'orchestration']
          }));
        } catch (error) {
          console.error('Failed to subscribe to WebSocket channels:', error);
        }
      };

      this.wsConnection.onmessage = (event) => {
        try {
          const message: WebSocketEvent = JSON.parse(event.data);
          this.handleWebSocketMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
          callbacks?.onError?.(error as Error);
        }
      };

      this.wsConnection.onclose = (event) => {
        console.log('WebSocket connection closed:', event.reason);
        if (!event.wasClean) {
          console.log('WebSocket closed unexpectedly, attempting to reconnect...');
          setTimeout(() => this.connectWebSocket(callbacks), 3000);
        }
      };

      this.wsConnection.onerror = (error) => {
        console.error('WebSocket error:', error);
        callbacks?.onError?.(error as Error);
      };
    }

    // Return cleanup function
    return () => {
      if (callbacks?.onJobUpdate) this.listeners.delete(callbacks.onJobUpdate);
      if (callbacks?.onAgentUpdate) this.agentListeners.delete(callbacks.onAgentUpdate);
      if (callbacks?.onMetricsUpdate) this.metricsListeners.delete(callbacks.onMetricsUpdate);

      if (this.listeners.size === 0 && this.agentListeners.size === 0 && this.metricsListeners.size === 0) {
        this.wsConnection?.close();
        this.wsConnection = undefined;
      }
    };
  }

  private handleWebSocketMessage(message: WebSocketEvent): void {
    switch (message.type) {
      case 'form_submission.job_created':
      case 'form_submission.job_started':
      case 'form_submission.job_progress':
      case 'form_submission.job_completed':
      case 'form_submission.job_failed':
        this.notifyJobListeners(this.transformJobMessage(message));
        break;
        
      case 'agent_status.update':
      case 'agent_status.health_change':
        this.notifyAgentListeners(message.payload.agents || []);
        break;
        
      case 'metrics.agent_performance':
      case 'metrics.system_performance':
        this.notifyMetricsListeners(message.payload.metrics || []);
        break;
        
      case 'orchestration.load_balancing':
      case 'orchestration.failover':
        console.log('Orchestration event:', message.type, message.payload);
        break;
        
      default:
        console.debug('Unhandled WebSocket message type:', message.type);
    }
  }

  private transformJobMessage(message: WebSocketEvent): FormSubmissionJob {
    const payload = message.payload;
    
    return {
      id: payload.jobId || payload.id || 'unknown',
      url: payload.url || payload.currentUrl || '',
      agent: payload.agent || 'auto',
      agentName: payload.agentName || payload.agent || 'Unknown',
      status: this.normalizeJobStatus(payload.status, message.type),
      priority: payload.priority || 5,
      progress: this.calculateProgress(payload, message.type),
      fieldsFound: payload.fieldsFound || 0,
      fieldsCompleted: payload.fieldsCompleted || 0,
      customData: payload.customData || {},
      formData: payload.formData || {},
      result: payload.result || undefined,
      error: payload.error || payload.errorMessage || undefined,
      screenshot: payload.screenshot || payload.screenshotPath || undefined,
      createdAt: payload.createdAt || payload.scheduledAt || new Date().toISOString(),
      startedAt: payload.startedAt || undefined,
      completedAt: payload.completedAt || undefined,
      sessionId: payload.sessionId || undefined,
      createdBy: payload.createdBy || undefined,
      expectedSuccessRate: payload.expectedSuccessRate || undefined,
      expectedResponseTime: payload.expectedResponseTime || undefined,
      actualResponseTime: payload.executionTime || payload.responseTime || undefined
    };
  }

  private normalizeJobStatus(status: string, messageType: string): FormSubmissionJob['status'] {
    if (status) return status as FormSubmissionJob['status'];
    
    // Infer status from message type
    if (messageType.includes('job_started')) return 'running';
    if (messageType.includes('job_completed')) return 'completed';
    if (messageType.includes('job_failed')) return 'failed';
    if (messageType.includes('job_created')) return 'pending';
    
    return 'pending';
  }

  private calculateProgress(payload: any, messageType: string): number {
    if (typeof payload.progress === 'number') return payload.progress;
    
    const { completed = 0, total = 0, fieldsCompleted = 0, fieldsFound = 0 } = payload;
    
    if (total > 0) return Math.round((completed / total) * 100);
    if (fieldsFound > 0) return Math.round((fieldsCompleted / fieldsFound) * 100);
    
    // Infer progress from message type
    if (messageType.includes('job_completed')) return 100;
    if (messageType.includes('job_started')) return 10;
    if (messageType.includes('job_progress')) return 50;
    
    return 0;
  }

  private notifyJobListeners(job: FormSubmissionJob): void {
    this.listeners.forEach(listener => {
      try {
        listener(job);
      } catch (error) {
        console.error('Error in job listener:', error);
      }
    });
  }

  private notifyAgentListeners(agents: FormAgent[]): void {
    this.agentListeners.forEach(listener => {
      try {
        listener(agents);
      } catch (error) {
        console.error('Error in agent listener:', error);
      }
    });
  }

  private notifyMetricsListeners(metrics: AgentMetrics[]): void {
    this.metricsListeners.forEach(listener => {
      try {
        listener(metrics);
      } catch (error) {
        console.error('Error in metrics listener:', error);
      }
    });
  }

  // ===== UTILITY METHODS =====

  /**
   * Get recommended agent for a specific URL
   */
  async getRecommendedAgent(url: string): Promise<{
    agent: FormAgentType;
    confidence: number;
    reasoning: string;
    alternatives: Array<{ agent: FormAgentType; confidence: number }>;
  }> {
    const response = await api.post(`${this.orchestratorUrl}/recommend`, { url });
    return response.data;
  }

  /**
   * Test agent connectivity and performance
   */
  async testAgent(agentType: FormAgentType, testUrl?: string): Promise<{
    agent: FormAgentType;
    available: boolean;
    responseTime: number;
    error?: string;
  }> {
    const response = await api.post(`${this.orchestratorUrl}/test`, {
      agent: agentType,
      testUrl: testUrl || 'https://httpbin.org/get'
    });
    return response.data;
  }

  /**
   * Get system status overview
   */
  async getSystemStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'down';
    totalAgents: number;
    healthyAgents: number;
    activeJobs: number;
    queueDepth: number;
    averageResponseTime: number;
    overallSuccessRate: number;
    lastUpdated: string;
  }> {
    const response = await api.get(`${this.orchestratorUrl}/status`);
    return response.data;
  }
}

// Export singleton instance
export const formSubmissionAPI = new EnhancedFormSubmissionAPI();

// Export types for use in components
export type {
  FormAgentType,
  FormSubmissionJob,
  FormAgent,
  FormSubmissionTemplate,
  OrchestrationConfig,
  AgentMetrics
};