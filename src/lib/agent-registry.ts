/**
 * 🤖 AGENT REGISTRY SYSTEM
 * Real agent management with API/MCP server integration
 */

export interface Agent {
  id: string;
  name: string;
  type: 'api' | 'mcp' | 'webhook' | 'local';
  status: 'online' | 'offline' | 'connecting' | 'error';
  endpoint?: string;
  apiKey?: string;
  capabilities: string[];
  description: string;
  model?: string;
  provider?: string;
  config: Record<string, any>;
  createdAt: Date;
  lastSeen?: Date;
  stats: {
    totalRequests: number;
    successfulRequests: number;
    averageResponseTime: number;
  };
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'completed' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  assignedAgents: string[]; // Agent IDs
  settings: Record<string, any>;
}

class AgentRegistryService {
  private agents: Map<string, Agent> = new Map();
  private projects: Map<string, Project> = new Map();
  private listeners: Set<() => void> = new Set();

  // Agent Management
  addAgent(agentData: Omit<Agent, 'id' | 'createdAt' | 'stats'>): Agent {
    const agent: Agent = {
      ...agentData,
      id: `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      stats: {
        totalRequests: 0,
        successfulRequests: 0,
        averageResponseTime: 0
      }
    };

    this.agents.set(agent.id, agent);
    this.notifyListeners();
    return agent;
  }

  updateAgent(id: string, updates: Partial<Agent>): Agent | null {
    const agent = this.agents.get(id);
    if (!agent) return null;

    const updatedAgent = { ...agent, ...updates };
    this.agents.set(id, updatedAgent);
    this.notifyListeners();
    return updatedAgent;
  }

  removeAgent(id: string): boolean {
    const success = this.agents.delete(id);
    if (success) {
      this.notifyListeners();
    }
    return success;
  }

  getAgent(id: string): Agent | null {
    return this.agents.get(id) || null;
  }

  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  getAgentsByType(type: Agent['type']): Agent[] {
    return this.getAllAgents().filter(agent => agent.type === type);
  }

  // Project Management
  createProject(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Project {
    const project: Project = {
      ...projectData,
      id: `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.projects.set(project.id, project);
    this.notifyListeners();
    return project;
  }

  updateProject(id: string, updates: Partial<Project>): Project | null {
    const project = this.projects.get(id);
    if (!project) return null;

    const updatedProject = { 
      ...project, 
      ...updates, 
      updatedAt: new Date() 
    };
    this.projects.set(id, updatedProject);
    this.notifyListeners();
    return updatedProject;
  }

  deleteProject(id: string): boolean {
    const success = this.projects.delete(id);
    if (success) {
      this.notifyListeners();
    }
    return success;
  }

  getProject(id: string): Project | null {
    return this.projects.get(id) || null;
  }

  getAllProjects(): Project[] {
    return Array.from(this.projects.values());
  }

  assignAgentToProject(projectId: string, agentId: string): boolean {
    const project = this.projects.get(projectId);
    const agent = this.agents.get(agentId);
    
    if (!project || !agent) return false;

    if (!project.assignedAgents.includes(agentId)) {
      project.assignedAgents.push(agentId);
      project.updatedAt = new Date();
      this.notifyListeners();
    }
    return true;
  }

  unassignAgentFromProject(projectId: string, agentId: string): boolean {
    const project = this.projects.get(projectId);
    if (!project) return false;

    const index = project.assignedAgents.indexOf(agentId);
    if (index > -1) {
      project.assignedAgents.splice(index, 1);
      project.updatedAt = new Date();
      this.notifyListeners();
      return true;
    }
    return false;
  }

  getProjectAgents(projectId: string): Agent[] {
    const project = this.projects.get(projectId);
    if (!project) return [];

    return project.assignedAgents
      .map(id => this.agents.get(id))
      .filter((agent): agent is Agent => agent !== undefined);
  }

  // Agent Communication
  async sendMessage(agentId: string, message: string): Promise<string> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    agent.stats.totalRequests++;
    const startTime = Date.now();

    try {
      let response: string;

      switch (agent.type) {
        case 'api':
          response = await this.callApiAgent(agent, message);
          break;
        case 'mcp':
          response = await this.callMcpAgent(agent, message);
          break;
        case 'webhook':
          response = await this.callWebhookAgent(agent, message);
          break;
        case 'local':
          response = await this.callLocalAgent(agent, message);
          break;
        default:
          throw new Error(`Unsupported agent type: ${agent.type}`);
      }

      agent.stats.successfulRequests++;
      agent.lastSeen = new Date();
      agent.status = 'online';
      
      const responseTime = Date.now() - startTime;
      agent.stats.averageResponseTime = 
        (agent.stats.averageResponseTime * (agent.stats.successfulRequests - 1) + responseTime) / 
        agent.stats.successfulRequests;

      this.notifyListeners();
      return response;

    } catch (error) {
      agent.status = 'error';
      this.notifyListeners();
      throw error;
    }
  }

  private async callApiAgent(agent: Agent, message: string): Promise<string> {
    if (!agent.endpoint) {
      throw new Error('API agent requires endpoint configuration');
    }

    const response = await fetch(agent.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(agent.apiKey && { 'Authorization': `Bearer ${agent.apiKey}` })
      },
      body: JSON.stringify({
        message,
        model: agent.model,
        ...agent.config
      })
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.response || data.message || JSON.stringify(data);
  }

  private async callMcpAgent(agent: Agent, message: string): Promise<string> {
    // MCP (Model Context Protocol) implementation
    // This would connect to MCP servers
    return `MCP Agent ${agent.name} processed: "${message}"`;
  }

  private async callWebhookAgent(agent: Agent, message: string): Promise<string> {
    if (!agent.endpoint) {
      throw new Error('Webhook agent requires endpoint configuration');
    }

    const response = await fetch(agent.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, ...agent.config })
    });

    if (!response.ok) {
      throw new Error(`Webhook call failed: ${response.statusText}`);
    }

    const text = await response.text();
    return text;
  }

  private async callLocalAgent(agent: Agent, message: string): Promise<string> {
    // Local agent simulation - replace with actual local agent implementation
    return `Local Agent ${agent.name} processed: "${message}"`;
  }

  // Health checks
  async checkAgentHealth(agentId: string): Promise<boolean> {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    try {
      await this.sendMessage(agentId, 'health-check');
      return true;
    } catch {
      agent.status = 'error';
      this.notifyListeners();
      return false;
    }
  }

  async checkAllAgentsHealth(): Promise<void> {
    const healthChecks = this.getAllAgents().map(agent => 
      this.checkAgentHealth(agent.id)
    );
    await Promise.all(healthChecks);
  }

  // Event system
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  // Data persistence (in a real app, this would use a backend)
  exportData(): { agents: Agent[], projects: Project[] } {
    return {
      agents: this.getAllAgents(),
      projects: this.getAllProjects()
    };
  }

  importData(data: { agents: Agent[], projects: Project[] }): void {
    this.agents.clear();
    this.projects.clear();

    data.agents.forEach(agent => this.agents.set(agent.id, agent));
    data.projects.forEach(project => this.projects.set(project.id, project));
    
    this.notifyListeners();
  }
}

// Singleton instance
export const agentRegistry = new AgentRegistryService();

// Initialize with some default agents for demo purposes
agentRegistry.addAgent({
  name: 'Claude Code IDE',
  type: 'api',
  status: 'offline',
  endpoint: 'https://api.anthropic.com/v1/messages',
  capabilities: ['code-generation', 'debugging', 'testing', 'documentation'],
  description: 'Advanced AI coding assistant for development tasks',
  model: 'claude-3-sonnet-20240229',
  provider: 'Anthropic',
  config: {
    temperature: 0.1,
    max_tokens: 4000
  }
});

agentRegistry.addAgent({
  name: 'OpenAI GPT-4',
  type: 'api', 
  status: 'offline',
  endpoint: 'https://api.openai.com/v1/chat/completions',
  capabilities: ['general-ai', 'reasoning', 'writing', 'analysis'],
  description: 'Advanced general-purpose AI assistant',
  model: 'gpt-4',
  provider: 'OpenAI',
  config: {
    temperature: 0.7,
    max_tokens: 2000
  }
});