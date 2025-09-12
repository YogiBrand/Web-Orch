```typescript
import { Agent } from '../model/types';
import {
  AgentSchema,
  AgentListResponseSchema,
  AgentCreateResponseSchema,
  AgentUpdateResponseSchema,
  AgentDeleteResponseSchema,
  AgentActionResponseSchema,
  AgentTestResponseSchema,
} from '../model/zod';

const API_BASE_URL = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
const MOCK_API = import.meta.env.VITE_API_MOCK === '1';

// Mock data for development
let mockAgents: Agent[] = [
  {
    id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    name: 'Browser Use Agent',
    type: 'browser-use',
    runtime: 'hosted',
    status: 'running',
    version: '2.1.0',
    latency: 85,
    provider: 'Browser Use Team',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date().toISOString(),
    config: {
      base_url: 'https://browser.use.bolt.new',
      protocol: 'https',
      port: 443,
      timeout: 30000,
      concurrency: 1,
    },
    capabilities: ['Web Navigation', 'Form Automation'],
    endpoints: ['/navigate', '/fill-form'],
  },
  {
    id: 'f0e9d8c7-b6a5-4321-9876-543210fedcba',
    name: 'Ollama Local LLM',
    type: 'ollama',
    runtime: 'local',
    status: 'running',
    version: '0.1.17',
    latency: 12,
    provider: 'Ollama Team',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date().toISOString(),
    config: {
      base_url: 'http://localhost:11434',
      protocol: 'http',
      port: 11434,
      timeout: 120000,
      concurrency: 1,
    },
    capabilities: ['Local LLM Inference', 'Multiple Model Support'],
    endpoints: ['/generate', '/chat'],
  },
  {
    id: '1a2b3c4d-5e6f-7890-abcd-ef1234567890',
    name: 'Degraded Agent',
    type: 'custom-agent',
    runtime: 'hosted',
    status: 'error',
    version: '1.0.0',
    latency: 500,
    provider: 'Acme Corp',
    created_at: new Date(Date.now() - 10800000).toISOString(),
    updated_at: new Date().toISOString(),
    config: {
      base_url: 'https://degraded.bolt.new',
      protocol: 'https',
      port: 443,
      timeout: 30000,
      concurrency: 1,
    },
    capabilities: ['Data Processing'],
    endpoints: ['/process'],
  },
  {
    id: '9f8e7d6c-5b4a-3210-fedc-ba9876543210',
    name: 'Stopped Agent',
    type: 'data-connector',
    runtime: 'local',
    status: 'stopped',
    version: '1.2.0',
    provider: 'Data Solutions Inc.',
    created_at: new Date(Date.now() - 14400000).toISOString(),
    updated_at: new Date().toISOString(),
    config: {
      base_url: 'http://localhost:9000',
      protocol: 'http',
      port: 9000,
      timeout: 60000,
      concurrency: 2,
    },
    capabilities: ['Database Sync'],
    endpoints: ['/sync'],
  },
  {
    id: 'mcp-intelligence-001',
    name: 'MCP Intelligence Agent',
    type: 'mcp-intelligence',
    runtime: 'hosted',
    status: 'running',
    version: '1.0.0',
    latency: 45,
    provider: 'WebOrchestrator Platform',
    created_at: new Date(Date.now() - 1800000).toISOString(),
    updated_at: new Date().toISOString(),
    config: {
      base_url: 'http://mcp-intelligence:8004',
      protocol: 'http',
      port: 8004,
      timeout: 120000,
      concurrency: 5,
      ai_providers: {
        anthropic: true,
        openai: true
      },
      vision_model: 'claude-3-haiku-20240307',
      captcha_solver: 'anthropic'
    },
    capabilities: [
      'AI Vision Analysis',
      'Form Structure Detection',
      'Intelligent Field Mapping',
      'Captcha Solving',
      'Complex Form Handling',
      'Screenshot Analysis',
      'Semantic Field Matching'
    ],
    endpoints: [
      '/mcp/tools/call',
      '/api/intelligence/analyze-form',
      '/api/intelligence/submit-form',
      '/api/intelligence/solve-captcha'
    ],
    performance: {
      success_rate: '92%',
      avg_processing_time: '5200ms',
      captcha_solve_rate: '85%',
      complex_forms: true
    }
  },
];

const simulateApiCall = async <T>(
  data: T,
  delay: number = 500,
  successRate: number = 1
): Promise<{ success: boolean; data?: T; message?: string }> => {
  return new Promise(resolve => {
    setTimeout(() => {
      if (Math.random() < successRate) {
        resolve({ success: true, data });
      } else {
        resolve({ success: false, message: 'Simulated API error' });
      }
    }, delay);
  });
};

export const agentsApi = {
  list: async (): Promise<Agent[]> => {
    if (MOCK_API) {
      const { data } = await simulateApiCall(mockAgents);
      return AgentListResponseSchema.parse(data);
    }
    const response = await fetch(`${API_BASE_URL}/api/agents`);
    const data = await response.json();
    return AgentListResponseSchema.parse(data);
  },

  getById: async (id: string): Promise<Agent | null> => {
    if (MOCK_API) {
      const agent = mockAgents.find(a => a.id === id);
      const { data } = await simulateApiCall(agent);
      return data ? AgentSchema.parse(data) : null;
    }
    const response = await fetch(`${API_BASE_URL}/api/agents/${id}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Error fetching agent: ${response.statusText}`);
    }
    const data = await response.json();
    return AgentSchema.parse(data);
  },

  create: async (agent: Omit<Agent, 'id' | 'created_at' | 'updated_at' | 'status'>): Promise<{ success: boolean; agentId?: string; message?: string }> => {
    if (MOCK_API) {
      const newAgent: Agent = {
        ...agent,
        id: `agent_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'deploying', // Always deploying initially for new agents
      };
      mockAgents.push(newAgent);
      const { success, message } = await simulateApiCall({ agentId: newAgent.id }, 1500);
      return AgentCreateResponseSchema.parse({ success, agentId: newAgent.id, message });
    }
    const response = await fetch(`${API_BASE_URL}/api/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agent),
    });
    const data = await response.json();
    return AgentCreateResponseSchema.parse(data);
  },

  update: async (id: string, updates: Partial<Agent>): Promise<{ success: boolean; message?: string }> => {
    if (MOCK_API) {
      const index = mockAgents.findIndex(a => a.id === id);
      if (index !== -1) {
        mockAgents[index] = { ...mockAgents[index], ...updates, updated_at: new Date().toISOString() };
        const { success, message } = await simulateApiCall({}, 500);
        return AgentUpdateResponseSchema.parse({ success, message });
      }
      return { success: false, message: 'Agent not found' };
    }
    const response = await fetch(`${API_BASE_URL}/api/agents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await response.json();
    return AgentUpdateResponseSchema.parse(data);
  },

  remove: async (id: string): Promise<{ success: boolean; message?: string }> => {
    if (MOCK_API) {
      mockAgents = mockAgents.filter(a => a.id !== id);
      const { success, message } = await simulateApiCall({}, 500);
      return AgentDeleteResponseSchema.parse({ success, message });
    }
    const response = await fetch(`${API_BASE_URL}/api/agents/${id}`, {
      method: 'DELETE',
    });
    const data = await response.json();
    return AgentDeleteResponseSchema.parse(data);
  },

  test: async (id: string, config?: any): Promise<{ success: boolean; message?: string; results?: any[] }> => {
    if (MOCK_API) {
      const success = Math.random() > 0.1; // 90% success rate for test
      const results = [
        { name: 'Connection Test', status: success ? 'success' : 'error', latency: success ? Math.floor(50 + Math.random() * 200) : undefined, message: success ? undefined : 'Failed to connect' },
        { name: 'Authentication', status: success ? 'success' : 'error', latency: success ? Math.floor(20 + Math.random() * 50) : undefined, message: success ? undefined : 'Invalid credentials' },
        { name: 'API Endpoints', status: success ? 'success' : 'error', latency: success ? Math.floor(100 + Math.random() * 300) : undefined, message: success ? undefined : 'Endpoint not found' },
        { name: 'Health Check', status: success ? 'success' : 'error', latency: success ? Math.floor(30 + Math.random() * 100) : undefined, message: success ? undefined : 'Agent unhealthy' },
      ];
      const overallSuccess = results.every(r => r.status === 'success');
      const { data } = await simulateApiCall({ results }, 2000);
      return AgentTestResponseSchema.parse({ success: overallSuccess, results: data?.results, message: overallSuccess ? 'All tests passed' : 'Some tests failed' });
    }
    const response = await fetch(`${API_BASE_URL}/api/agents/${id}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    const data = await response.json();
    return AgentTestResponseSchema.parse(data);
  },

  rotateCredentials: async (id: string, newCredentials: Record<string, string>): Promise<{ success: boolean; message?: string }> => {
    if (MOCK_API) {
      const index = mockAgents.findIndex(a => a.id === id);
      if (index !== -1) {
        mockAgents[index].credentials = newCredentials;
        const { success, message } = await simulateApiCall({}, 500);
        return AgentActionResponseSchema.parse({ success, message });
      }
      return { success: false, message: 'Agent not found' };
    }
    const response = await fetch(`${API_BASE_URL}/api/agents/${id}/rotate-credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCredentials),
    });
    const data = await response.json();
    return AgentActionResponseSchema.parse(data);
  },

  healthcheck: async (id: string): Promise<{ success: boolean; message?: string; status?: 'running' | 'stopped' | 'error' | 'deploying' }> => {
    if (MOCK_API) {
      const agent = mockAgents.find(a => a.id === id);
      if (agent) {
        const newStatus = Math.random() > 0.2 ? 'running' : 'error'; // 80% chance of running
        agent.status = newStatus;
        agent.latency = newStatus === 'running' ? Math.floor(50 + Math.random() * 200) : undefined;
        const { success, message } = await simulateApiCall({}, 500);
        return AgentActionResponseSchema.parse({ success, message, status: newStatus });
      }
      return { success: false, message: 'Agent not found' };
    }
    const response = await fetch(`${API_BASE_URL}/api/agents/${id}/healthcheck`, {
      method: 'POST',
    });
    const data = await response.json();
    return AgentActionResponseSchema.parse(data);
  },

  deploy: async (id: string): Promise<{ success: boolean; message?: string }> => {
    if (MOCK_API) {
      const agent = mockAgents.find(a => a.id === id);
      if (agent) {
        agent.status = 'deploying';
        const { success, message } = await simulateApiCall({}, 2000);
        if (success) agent.status = 'running';
        return AgentActionResponseSchema.parse({ success, message });
      }
      return { success: false, message: 'Agent not found' };
    }
    const response = await fetch(`${API_BASE_URL}/api/agents/${id}/deploy`, {
      method: 'POST',
    });
    const data = await response.json();
    return AgentActionResponseSchema.parse(data);
  },

  stop: async (id: string): Promise<{ success: boolean; message?: string }> => {
    if (MOCK_API) {
      const agent = mockAgents.find(a => a.id === id);
      if (agent) {
        agent.status = 'stopped';
        const { success, message } = await simulateApiCall({}, 500);
        return AgentActionResponseSchema.parse({ success, message });
      }
      return { success: false, message: 'Agent not found' };
    }
    const response = await fetch(`${API_BASE_URL}/api/agents/${id}/stop`, {
      method: 'POST',
    });
    const data = await response.json();
    return AgentActionResponseSchema.parse(data);
  },

  redeploy: async (id: string): Promise<{ success: boolean; message?: string }> => {
    if (MOCK_API) {
      const agent = mockAgents.find(a => a.id === id);
      if (agent) {
        agent.status = 'deploying';
        const { success, message } = await simulateApiCall({}, 2000);
        if (success) agent.status = 'running';
        return AgentActionResponseSchema.parse({ success, message });
      }
      return { success: false, message: 'Agent not found' };
    }
    const response = await fetch(`${API_BASE_URL}/api/agents/${id}/redeploy`, {
      method: 'POST',
    });
    const data = await response.json();
    return AgentActionResponseSchema.parse(data);
  },
};
```