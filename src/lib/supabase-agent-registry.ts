// Minimal fallback implementation used in Docker build
// Provides demo data when Supabase is not configured

export type Agent = {
  id: string;
  name: string;
  type: 'api' | 'mcp' | 'automation' | 'chat' | 'workflow';
  endpoint?: string;
  description?: string;
  model?: string;
  apiKey?: string;
  tags?: string[];
  stats?: {
    totalRequests: number;
    successfulRequests: number;
    averageResponseTime: number;
  };
};

export type Project = {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  agents?: Agent[];
};

function makeDemoAgents(): Agent[] {
  return [
    {
      id: 'agent-001',
      name: 'Form Submission Agent',
      type: 'automation',
      description: 'Automates web form submissions',
      tags: ['forms', 'automation'],
      stats: { totalRequests: 42, successfulRequests: 40, averageResponseTime: 820 }
    },
    {
      id: 'agent-002',
      name: 'Data Extractor',
      type: 'automation',
      description: 'Extracts structured data from websites',
      tags: ['extraction', 'scraping'],
      stats: { totalRequests: 128, successfulRequests: 125, averageResponseTime: 640 }
    }
  ];
}

function makeDemoProjects(): Project[] {
  const agents = makeDemoAgents();
  return [
    {
      id: 'proj-001',
      name: 'Lead Gen Pipeline',
      description: 'End-to-end lead generation workflow',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      agents
    }
  ];
}

export const supabaseAgentRegistry = {
  async getAllAgents(): Promise<Agent[]> {
    return makeDemoAgents();
  },
  async getAllProjects(): Promise<Project[]> {
    return makeDemoProjects();
  }
};

