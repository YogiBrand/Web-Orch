import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import http from 'http';
import { WebSocketServer } from 'ws';

// Minimal, safe HTTP + WS server to support the frontend UI and marketplace
const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.HOST || '0.0.0.0';

const app = express();

app.use(helmet({ crossOriginEmbedderPolicy: false }));
app.use(compression());
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health endpoint
app.get('/health', (req, res) => {
  const mu = process.memoryUsage();
  res.json({
    success: true,
    data: {
      status: 'healthy',
      uptime_seconds: Math.floor(process.uptime()),
      memory_mb: {
        heap_used: Math.round(mu.heapUsed / 1024 / 1024),
        heap_total: Math.round(mu.heapTotal / 1024 / 1024),
        rss: Math.round(mu.rss / 1024 / 1024),
      },
      node: process.version,
    },
    timestamp: new Date().toISOString(),
  });
});

// Metrics (basic) + alias under /api
const basicMetrics = (req: express.Request, res: express.Response) => {
  res.json({
    success: true,
    data: {
      system: { cpu: 0, memory: 0 },
      application: { requests: 0 },
      performance: { avg_latency_ms: 0 },
      timestamp: new Date().toISOString(),
    },
  });
};
app.get('/metrics', basicMetrics);
app.get('/api/metrics', basicMetrics);

// Orchestrator status
app.get('/api/orchestrator/status', (req, res) => {
  const mu = process.memoryUsage();
  const uptime = process.uptime();
  res.json({
    success: true,
    data: {
      orchestrator: {
        status: 'healthy',
        version: '1.0.0',
        uptime_seconds: Math.floor(uptime),
        environment: process.env.NODE_ENV || 'development',
        node_version: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
      },
      system: {
        memory: {
          heap_used_mb: Math.round(mu.heapUsed / 1024 / 1024),
          heap_total_mb: Math.round(mu.heapTotal / 1024 / 1024),
          rss_mb: Math.round(mu.rss / 1024 / 1024),
        },
      },
      services: {
        database: { status: 'not_configured' },
        redis: { status: 'not_configured' },
        websocket: { status: 'healthy' },
      },
      metrics: { websocket: { connectedClients: 0 } },
      agents: { total_available: 0, active_sessions: 0, queue_size: 0, status: 'ready' },
    },
    timestamp: new Date().toISOString(),
  });
});

// Minimal Marketplace catalog used by the integrated UI
const CATALOG = [
  {
    id: 'mcp-filesystem',
    name: 'MCP Filesystem Server',
    slug: 'mcp-filesystem-server',
    description: 'Model Context Protocol server for filesystem operations',
    longDescription: 'Secure filesystem access for AI agents.',
    provider: 'modelcontextprotocol',
    category: 'MCP Server',
    tags: ['filesystem', 'mcp', 'file-management'],
    version: '1.0.0',
    rating: 4.6,
    reviews: 24,
    downloads: 1500,
    runtime: 'local',
    capabilities: ['file-read', 'file-write', 'directory-listing', 'file-search'],
    requirements: ['Node.js 16+'],
    ports: { default: 3002 },
    pricing: { free: true },
    installation: { steps: ['Install deps', 'Configure paths', 'Start server', 'Register in client'] },
    documentation: 'https://github.com/modelcontextprotocol',
    defaultConfig: { base_url: 'http://localhost:3002', protocol: 'http', port: 3002, timeout: 15000, concurrency: 3 },
    created_at: new Date().toISOString(),
  },
  {
    id: 'ai-claude-assistant',
    name: 'Claude Code Assistant',
    slug: 'claude-code-assistant',
    description: 'AI-powered code assistant using Claude',
    longDescription: 'Advanced code generation and review with Claude.',
    provider: 'Anthropic',
    category: 'AI Agent',
    tags: ['ai', 'coding', 'assistant'],
    version: '2.0.0',
    rating: 4.8,
    reviews: 156,
    downloads: 5200,
    runtime: 'hosted',
    capabilities: ['code-generation', 'code-review', 'debugging'],
    requirements: ['Anthropic API key'],
    pricing: { free: false, plans: [{ name: 'Pro', price: '$20/mo', features: ['Unlimited requests'] }] },
    installation: { steps: ['Get API key', 'Configure credentials', 'Use in IDE/app'] },
    documentation: 'https://docs.anthropic.com',
    defaultConfig: { timeout: 60000 },
    created_at: new Date().toISOString(),
  },
];

app.get('/api/marketplace/templates', (req, res) => {
  const { category, search } = req.query as { category?: string; search?: string };
  let items = [...CATALOG];
  if (category) items = items.filter(t => t.category === category);
  if (search) {
    const q = String(search).toLowerCase();
    items = items.filter(t => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.tags.some(tag => tag.toLowerCase().includes(q)));
  }
  res.json(items);
});

app.get('/api/marketplace/templates/:slug', (req, res) => {
  const { slug } = req.params as { slug: string };
  const item = CATALOG.find(t => t.slug === slug);
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

app.post('/api/marketplace/install', (req, res) => {
  const { templateSlug } = req.body || {};
  const item = CATALOG.find(t => t.slug === templateSlug);
  if (!item) return res.status(400).json({ success: false, error: 'Invalid template' });
  res.json({ success: true, agentId: `agent_${Date.now()}`, containerId: `container_${Date.now()}` });
});

// File offloading routes
import fileOffloadRouter from './routes/file-offload.js';
app.use('/api/file-offload', fileOffloadRouter);

// Session management routes
import sessionRouter from './routes/sessions.ts';
app.use('/api/sessions', sessionRouter);

// Root
app.get('/', (req, res) => {
  res.json({
    name: 'Agent Backend (minimal)',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Create HTTP server and attach WebSocket on /ws (same port)
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    // Accept any message; reply to ping-like events if needed
    try {
      const msg = JSON.parse(String(data));
      if (msg?.type === 'heartbeat' || msg?.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      }
    } catch {
      // ignore
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`HTTP + WS server listening on http://${HOST}:${PORT} (WS path /ws)`);
});
