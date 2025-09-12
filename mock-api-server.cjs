/**
 * Mock API Server
 * Provides basic endpoints to prevent 403 errors
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3006;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    service: 'mock-api-server',
    timestamp: new Date().toISOString()
  });
});

// Mock metrics endpoint
app.get('/api/metrics', (req, res) => {
  res.json({
    totalSessions: 0,
    activeSessions: 0,
    completedTasks: 0,
    failedTasks: 0,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Mock tasks endpoint
app.get('/api/tasks', (req, res) => {
  res.json([]);
});

// In-memory session store
const sessions = new Map();

// Mock sessions endpoints
app.get('/api/sessions', (req, res) => {
  res.json(Array.from(sessions.values()));
});

app.post('/api/sessions', (req, res) => {
  const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const session = {
    id: sessionId,
    ...req.body,
    status: 'created',
    createdAt: new Date().toISOString()
  };
  sessions.set(sessionId, session);
  console.log(`📋 Created session: ${session.name} (${sessionId})`);
  res.json(session);
});

app.get('/api/sessions/:id', (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json(session);
});

app.patch('/api/sessions/:id', (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  const updatedSession = { ...session, ...req.body, updatedAt: new Date().toISOString() };
  sessions.set(req.params.id, updatedSession);
  console.log(`🔄 Updated session: ${session.name} -> ${updatedSession.status}`);
  res.json(updatedSession);
});

app.post('/api/sessions/:id/start', (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  session.status = 'running';
  session.startedAt = new Date().toISOString();
  console.log(`▶️ Started session: ${session.name}`);
  res.json({ success: true });
});

app.post('/api/sessions/:id/stop', (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  session.status = 'completed';
  session.endedAt = new Date().toISOString();
  console.log(`⏹️ Stopped session: ${session.name}`);
  res.json({ success: true });
});

app.get('/api/sessions/:id/logs', (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  // Mock session logs
  const logs = [
    {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `Session ${session.name} initialized`,
      source: 'session-manager'
    },
    {
      timestamp: new Date().toISOString(),
      level: 'info', 
      message: 'Browser launched successfully',
      source: 'browser'
    },
    {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `Navigating to ${session.metadata?.formUrl || 'target URL'}`,
      source: 'automation'
    }
  ];
  
  res.json(logs);
});

// Mock agents endpoint
app.get('/api/agents', (req, res) => {
  res.json([
    {
      id: 'hybrid-ai',
      name: 'Hybrid AI Agent',
      type: 'internal',
      status: 'active',
      capabilities: ['form-automation', 'browser-automation', 'ai-vision']
    },
    {
      id: 'ai-vision',
      name: 'AI Vision Agent', 
      type: 'internal',
      status: 'active',
      capabilities: ['form-automation', 'screenshot-analysis', 'ai-vision']
    },
    {
      id: 'skyvern',
      name: 'Skyvern Agent',
      type: 'internal', 
      status: 'active',
      capabilities: ['form-automation', 'browser-automation']
    }
  ]);
});

// Start server
app.listen(PORT, () => {
  console.log(`🔧 Mock API Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = { app };