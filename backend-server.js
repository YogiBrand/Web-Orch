import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3002;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory data store (can be replaced with a database later)
let agents = [
  {
    id: 'hybrid-ai-agent',
    name: 'Hybrid AI Agent',
    type: 'internal',
    runtime: 'hosted',
    status: 'running',
    version: '1.0.0',
    latency: 45,
    provider: 'internal',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    config: {
      base_url: 'http://localhost:3001',
      protocol: 'http',
      port: 3001,
      timeout: 30000,
      concurrency: 5
    },
    capabilities: ['form-automation', 'browser-automation', 'ai-vision', 'data-extraction'],
    endpoints: ['/api/hybrid-ai']
  },
  {
    id: 'mcp-filesystem',
    name: 'MCP Filesystem Server',
    type: 'mcp',
    runtime: 'local',
    status: 'running',
    version: '1.0.0',
    latency: 12,
    provider: 'modelcontextprotocol',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    config: {
      base_url: 'http://localhost:3002',
      protocol: 'http',
      port: 3002,
      timeout: 15000,
      concurrency: 3
    },
    capabilities: ['file-read', 'file-write', 'directory-listing'],
    endpoints: ['/mcp/filesystem']
  },
  {
    id: 'claude-assistant',
    name: 'Claude Code Assistant',
    type: 'api',
    runtime: 'hosted',
    status: 'stopped',
    version: '2.0.0',
    latency: 120,
    provider: 'anthropic',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    config: {
      base_url: 'https://api.anthropic.com',
      protocol: 'https',
      timeout: 60000,
      concurrency: 2,
      credentials: {
        api_key: '••••••••'
      }
    },
    capabilities: ['code-generation', 'code-review', 'debugging'],
    endpoints: ['https://api.anthropic.com/v1/messages']
  }
];

let agentLogs = [];
let agentMetrics = [];
let marketplaceTemplates = [
  {
    id: 'mcp-filesystem-template',
    name: 'MCP Filesystem Server',
    slug: 'mcp-filesystem-server',
    description: 'Model Context Protocol server for filesystem operations',
    longDescription: 'A powerful MCP server that provides secure access to filesystem operations including reading, writing, and directory management.',
    provider: 'modelcontextprotocol',
    category: 'MCP Server',
    tags: ['filesystem', 'mcp', 'file-management'],
    logoUrl: '/logos/mcp-filesystem.png',
    version: '1.0.0',
    rating: 4.5,
    reviews: 23,
    downloads: 1500,
    runtime: 'local',
    capabilities: ['file-read', 'file-write', 'directory-listing', 'file-search'],
    requirements: ['Node.js 16+', 'File system access'],
    ports: { default: 3002 },
    pricing: { free: true },
    installation: {
      steps: [
        'Install Node.js dependencies',
        'Configure allowed paths',
        'Start the server',
        'Register with MCP client'
      ]
    },
    documentation: 'https://github.com/modelcontextprotocol/filesystem-server',
    defaultConfig: {
      base_url: 'http://localhost:3002',
      protocol: 'http',
      port: 3002,
      timeout: 15000,
      concurrency: 3,
      allowedPaths: ['/tmp', '/home/user']
    },
    ideIntegration: {
      vscode: {
        extensionId: 'modelcontextprotocol.vscode-filesystem',
        config: {
          serverUrl: 'http://localhost:3002'
        }
      },
      cursor: {
        config: {
          mcpServer: 'filesystem',
          endpoint: 'http://localhost:3002'
        }
      }
    },
    created_at: new Date().toISOString()
  },
  {
    id: 'claude-assistant-template',
    name: 'Claude Code Assistant',
    slug: 'claude-code-assistant',
    description: 'AI-powered code assistant using Claude API',
    longDescription: 'Advanced code assistant powered by Anthropic\'s Claude API, providing intelligent code generation, review, and debugging capabilities.',
    provider: 'anthropic',
    category: 'AI Assistant',
    tags: ['ai', 'coding', 'claude', 'assistant'],
    logoUrl: '/logos/claude.png',
    version: '2.0.0',
    rating: 4.8,
    reviews: 156,
    downloads: 5200,
    runtime: 'hosted',
    capabilities: ['code-generation', 'code-review', 'debugging', 'refactoring'],
    requirements: ['Anthropic API key', 'Internet connection'],
    ports: {},
    pricing: {
      free: false,
      plans: [
        { name: 'Free', price: '$0', features: ['100 requests/day', 'Basic features'] },
        { name: 'Pro', price: '$20/month', features: ['Unlimited requests', 'Advanced features', 'Priority support'] }
      ]
    },
    installation: {
      steps: [
        'Get Anthropic API key',
        'Configure API credentials',
        'Install the assistant',
        'Start coding with AI help'
      ]
    },
    documentation: 'https://docs.anthropic.com/claude/docs/code-assistant',
    defaultConfig: {
      base_url: 'https://api.anthropic.com',
      protocol: 'https',
      timeout: 60000,
      concurrency: 2,
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.7,
      maxTokens: 4096
    },
    ideIntegration: {
      vscode: {
        extensionId: 'anthropic.claude-assistant',
        config: {
          apiKey: '${API_KEY}',
          model: 'claude-3-5-sonnet-20241022'
        }
      },
      cursor: {
        config: {
          provider: 'anthropic',
          model: 'claude-3-5-sonnet-20241022',
          apiKey: '${API_KEY}'
        }
      }
    },
    created_at: new Date().toISOString()
  }
];

// API Routes

// Agents CRUD
app.get('/api/agents', (req, res) => {
  res.json(agents);
});

app.get('/api/agents/:id', (req, res) => {
  const agent = agents.find(a => a.id === req.params.id);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  res.json(agent);
});

app.post('/api/agents', (req, res) => {
  const newAgent = {
    id: uuidv4(),
    ...req.body,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  agents.push(newAgent);
  res.status(201).json(newAgent);
});

app.put('/api/agents/:id', (req, res) => {
  const index = agents.findIndex(a => a.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  agents[index] = {
    ...agents[index],
    ...req.body,
    updated_at: new Date().toISOString()
  };
  res.json(agents[index]);
});

app.delete('/api/agents/:id', (req, res) => {
  const index = agents.findIndex(a => a.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  agents.splice(index, 1);
  res.status(204).send();
});

// Agent actions
app.post('/api/agents/:id/start', (req, res) => {
  const agent = agents.find(a => a.id === req.params.id);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  agent.status = 'running';
  agent.updated_at = new Date().toISOString();

  // Add log entry
  agentLogs.push({
    id: uuidv4(),
    agent_id: agent.id,
    level: 'info',
    message: 'Agent started',
    source: 'user-action',
    metadata: { action: 'start' },
    created_at: new Date().toISOString()
  });

  res.json({ success: true });
});

app.post('/api/agents/:id/stop', (req, res) => {
  const agent = agents.find(a => a.id === req.params.id);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  agent.status = 'stopped';
  agent.updated_at = new Date().toISOString();

  // Add log entry
  agentLogs.push({
    id: uuidv4(),
    agent_id: agent.id,
    level: 'info',
    message: 'Agent stopped',
    source: 'user-action',
    metadata: { action: 'stop' },
    created_at: new Date().toISOString()
  });

  res.json({ success: true });
});

app.post('/api/agents/:id/restart', (req, res) => {
  const agent = agents.find(a => a.id === req.params.id);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  agent.status = 'restarting';
  agent.updated_at = new Date().toISOString();

  // Add log entry
  agentLogs.push({
    id: uuidv4(),
    agent_id: agent.id,
    level: 'info',
    message: 'Agent restarted',
    source: 'user-action',
    metadata: { action: 'restart' },
    created_at: new Date().toISOString()
  });

  // Simulate restart delay
  setTimeout(() => {
    agent.status = 'running';
    agent.updated_at = new Date().toISOString();
  }, 2000);

  res.json({ success: true });
});

// Agent logs
app.get('/api/agents/:id/logs', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const logs = agentLogs
    .filter(log => log.agent_id === req.params.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit);

  res.json(logs.map(log => `[${log.created_at}] ${log.message}`));
});

// Agent metrics
app.get('/api/agents/:id/metrics', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const metrics = agentMetrics
    .filter(metric => metric.agent_id === req.params.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit);

  res.json(metrics);
});

// Marketplace templates
app.get('/api/marketplace/templates', (req, res) => {
  const { category, search } = req.query;
  let filtered = [...marketplaceTemplates];

  if (category) {
    filtered = filtered.filter(t => t.category === category);
  }

  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(t =>
      t.name.toLowerCase().includes(searchLower) ||
      t.description.toLowerCase().includes(searchLower) ||
      t.tags.some(tag => tag.toLowerCase().includes(searchLower))
    );
  }

  res.json(filtered);
});

app.get('/api/marketplace/templates/:slug', (req, res) => {
  const template = marketplaceTemplates.find(t => t.slug === req.params.slug);
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }
  res.json(template);
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    agents: agents.length,
    templates: marketplaceTemplates.length
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🤖 Agents API: http://localhost:${PORT}/api/agents`);
  console.log(`🏪 Marketplace API: http://localhost:${PORT}/api/marketplace/templates`);
});
