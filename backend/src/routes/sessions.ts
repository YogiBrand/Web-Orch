import { Router, Request, Response } from 'express';
import winston from 'winston';

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

const router = Router();

// In-memory session storage (in production, this would be in a database)
let sessions: any[] = [
  {
    id: 'session-001',
    sessionKey: 'chrome-session-1',
    browserType: 'chromium',
    status: 'running',
    agentType: 'browser-use',
    taskId: null,
    taskName: null,
    concurrency: 1,
    viewportConfig: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    proxyConfig: null,
    createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    startedAt: new Date(Date.now() - 3600000).toISOString(),
    endedAt: null,
    totalDuration: 3600,
    totalActions: 45,
    errorCount: 0,
    lastActivityAt: new Date(Date.now() - 30000).toISOString(), // 30 seconds ago
    vncUrl: 'http://localhost:5900',
    debugUrl: 'http://localhost:9222',
    screenshotUrl: null,
    recordingUrl: null
  },
  {
    id: 'session-002',
    sessionKey: 'firefox-session-1',
    browserType: 'firefox',
    status: 'completed',
    agentType: 'playwright',
    taskId: 'task-001',
    taskName: 'Data extraction task',
    concurrency: 1,
    viewportConfig: { width: 1366, height: 768 },
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0',
    proxyConfig: null,
    createdAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    startedAt: new Date(Date.now() - 7200000).toISOString(),
    endedAt: new Date(Date.now() - 1800000).toISOString(), // 30 min ago
    totalDuration: 5400,
    totalActions: 120,
    errorCount: 2,
    lastActivityAt: new Date(Date.now() - 1800000).toISOString(),
    vncUrl: null,
    debugUrl: null,
    screenshotUrl: null,
    recordingUrl: null
  }
];

// Helper function to create API response
const createApiResponse = (data: any, message?: string) => {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    request_id: Math.random().toString(36).substring(2, 15)
  };
};

// GET /api/sessions - Get all sessions with optional filtering
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, browserType, agentType, search, limit = '50', offset = '0' } = req.query;

    let filteredSessions = [...sessions];

    // Apply filters
    if (status) {
      filteredSessions = filteredSessions.filter(s => s.status === status);
    }
    if (browserType) {
      filteredSessions = filteredSessions.filter(s => s.browserType === browserType);
    }
    if (agentType) {
      filteredSessions = filteredSessions.filter(s => s.agentType === agentType);
    }
    if (search) {
      const searchTerm = search.toString().toLowerCase();
      filteredSessions = filteredSessions.filter(s =>
        s.sessionKey?.toLowerCase().includes(searchTerm) ||
        s.taskName?.toLowerCase().includes(searchTerm)
      );
    }

    // Apply pagination
    const limitNum = parseInt(limit.toString(), 10);
    const offsetNum = parseInt(offset.toString(), 10);
    const paginatedSessions = filteredSessions.slice(offsetNum, offsetNum + limitNum);

    logger.info('Sessions requested', {
      total_count: sessions.length,
      filtered_count: filteredSessions.length,
      returned_count: paginatedSessions.length,
      filters: { status, browserType, agentType, search }
    });

    res.json(createApiResponse({
      sessions: paginatedSessions,
      total: filteredSessions.length,
      limit: limitNum,
      offset: offsetNum
    }, 'Sessions retrieved successfully'));
  } catch (error: any) {
    logger.error('Failed to get sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve sessions',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/sessions/stats - Get session statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const total = sessions.length;
    const running = sessions.filter(s => s.status === 'running').length;
    const paused = sessions.filter(s => s.status === 'paused').length;
    const completed = sessions.filter(s => s.status === 'completed').length;
    const failed = sessions.filter(s => s.status === 'failed').length;

    const durations = sessions
      .filter(s => s.totalDuration)
      .map(s => s.totalDuration);
    const avgDuration = durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : 0;

    const totalActions = sessions.reduce((sum, s) => sum + (s.totalActions || 0), 0);
    const totalErrors = sessions.reduce((sum, s) => sum + (s.errorCount || 0), 0);
    const successRate = total > 0 ? ((total - failed) / total) * 100 : 0;

    const activeUsers = new Set(sessions
      .filter(s => s.status === 'running')
      .map(s => s.agentType)
    ).size;

    const resourceUsage = {
      cpu: Math.random() * 80, // Mock CPU usage
      memory: Math.random() * 85, // Mock memory usage
      network: Math.random() * 50  // Mock network usage
    };

    const stats = {
      total,
      running,
      paused,
      completed,
      failed,
      avgDuration,
      successRate,
      activeUsers,
      resourceUsage,
      totalActions,
      totalErrors
    };

    logger.info('Session stats requested', stats);

    res.json(createApiResponse(stats, 'Session statistics retrieved successfully'));
  } catch (error: any) {
    logger.error('Failed to get session stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve session statistics',
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/sessions - Create a new session
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      browserConfig,
      sessionKey,
      agentType = 'browser-use',
      taskId,
      taskName,
      concurrency = 1
    } = req.body;

    const newSession = {
      id: `session-${Date.now()}`,
      sessionKey: sessionKey || `session-${Date.now()}`,
      browserType: browserConfig?.browserType || 'chromium',
      status: 'pending',
      agentType,
      taskId,
      taskName,
      concurrency,
      viewportConfig: browserConfig?.viewport || { width: 1920, height: 1080 },
      userAgent: browserConfig?.userAgent || 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      proxyConfig: browserConfig?.proxy,
      createdAt: new Date().toISOString(),
      startedAt: null,
      endedAt: null,
      totalDuration: 0,
      totalActions: 0,
      errorCount: 0,
      lastActivityAt: new Date().toISOString(),
      vncUrl: null,
      debugUrl: null,
      screenshotUrl: null,
      recordingUrl: null
    };

    sessions.push(newSession);

    // Simulate session starting after a short delay
    setTimeout(() => {
      const sessionIndex = sessions.findIndex(s => s.id === newSession.id);
      if (sessionIndex !== -1) {
        sessions[sessionIndex].status = 'running';
        sessions[sessionIndex].startedAt = new Date().toISOString();
        logger.info('Session started', { sessionId: newSession.id });
      }
    }, 2000);

    logger.info('Session created', {
      sessionId: newSession.id,
      browserType: newSession.browserType,
      agentType: newSession.agentType
    });

    res.status(201).json(createApiResponse(newSession, 'Session created successfully'));
  } catch (error: any) {
    logger.error('Failed to create session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create session',
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/sessions/:id/terminate - Terminate a session
router.post('/:id/terminate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const sessionIndex = sessions.findIndex(s => s.id === id);

    if (sessionIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        timestamp: new Date().toISOString()
      });
    }

    sessions[sessionIndex].status = 'terminated';
    sessions[sessionIndex].endedAt = new Date().toISOString();
    sessions[sessionIndex].totalDuration = Math.floor(
      (new Date().getTime() - new Date(sessions[sessionIndex].createdAt).getTime()) / 1000
    );

    logger.info('Session terminated', { sessionId: id });

    res.json(createApiResponse(sessions[sessionIndex], 'Session terminated successfully'));
  } catch (error: any) {
    logger.error('Failed to terminate session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to terminate session',
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/sessions/:id/pause - Pause a session
router.post('/:id/pause', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const sessionIndex = sessions.findIndex(s => s.id === id);

    if (sessionIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        timestamp: new Date().toISOString()
      });
    }

    sessions[sessionIndex].status = 'paused';

    logger.info('Session paused', { sessionId: id });

    res.json(createApiResponse(sessions[sessionIndex], 'Session paused successfully'));
  } catch (error: any) {
    logger.error('Failed to pause session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to pause session',
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/sessions/:id/resume - Resume a session
router.post('/:id/resume', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const sessionIndex = sessions.findIndex(s => s.id === id);

    if (sessionIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        timestamp: new Date().toISOString()
      });
    }

    sessions[sessionIndex].status = 'running';

    logger.info('Session resumed', { sessionId: id });

    res.json(createApiResponse(sessions[sessionIndex], 'Session resumed successfully'));
  } catch (error: any) {
    logger.error('Failed to resume session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resume session',
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/sessions/:id/screenshot - Take screenshot of session
router.post('/:id/screenshot', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const sessionIndex = sessions.findIndex(s => s.id === id);

    if (sessionIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        timestamp: new Date().toISOString()
      });
    }

    // Mock screenshot URL
    sessions[sessionIndex].screenshotUrl = `http://localhost:3001/screenshots/session-${id}-${Date.now()}.png`;

    logger.info('Screenshot taken', { sessionId: id });

    res.json(createApiResponse({
      sessionId: id,
      screenshotUrl: sessions[sessionIndex].screenshotUrl
    }, 'Screenshot taken successfully'));
  } catch (error: any) {
    logger.error('Failed to take screenshot:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to take screenshot',
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/sessions/bulk - Bulk operations on sessions
router.post('/bulk', async (req: Request, res: Response) => {
  try {
    const { action, sessionIds } = req.body;

    if (!action || !sessionIds || !Array.isArray(sessionIds)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request: action and sessionIds are required',
        timestamp: new Date().toISOString()
      });
    }

    const updatedSessions: any[] = [];

    for (const sessionId of sessionIds) {
      const sessionIndex = sessions.findIndex(s => s.id === sessionId);
      if (sessionIndex !== -1) {
        switch (action) {
          case 'terminate':
          case 'stop':
            sessions[sessionIndex].status = 'terminated';
            sessions[sessionIndex].endedAt = new Date().toISOString();
            break;
          case 'pause':
            sessions[sessionIndex].status = 'paused';
            break;
          case 'resume':
            sessions[sessionIndex].status = 'running';
            break;
          case 'delete':
            sessions.splice(sessionIndex, 1);
            continue; // Skip adding to updated sessions for delete
        }
        updatedSessions.push(sessions[sessionIndex]);
      }
    }

    logger.info('Bulk session operation completed', {
      action,
      sessionCount: sessionIds.length,
      updatedCount: updatedSessions.length
    });

    res.json(createApiResponse({
      action,
      updatedSessions,
      totalUpdated: updatedSessions.length
    }, `Bulk ${action} operation completed successfully`));
  } catch (error: any) {
    logger.error('Failed to perform bulk session operation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform bulk operation',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;

