/**
 * 🚀 WORKSPACES API ROUTES
 * Manage workspace creation, configuration, and agent assignments
 */

import { Router, Request, Response } from 'express';
import winston from 'winston';
import { AppError } from '../types';
import { v4 as uuidv4 } from 'uuid';

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

// =============================================
// WORKSPACE TYPES
// =============================================

interface Workspace {
  id: string;
  name: string;
  description: string;
  agents: string[];
  tasks: WorkspaceTask[];
  status: 'active' | 'idle' | 'completed' | 'archived';
  created_at: Date;
  updated_at: Date;
  metadata: {
    owner?: string;
    tags?: string[];
    template?: string;
    settings?: Record<string, any>;
  };
}

interface WorkspaceTask {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  assigned_agent?: string;
  created_at: Date;
  completed_at?: Date;
  result?: any;
}

// =============================================
// IN-MEMORY STORAGE (TODO: Replace with database)
// =============================================

const workspaces: Map<string, Workspace> = new Map();

// Initialize with default workspaces
const initializeDefaultWorkspaces = () => {
  const defaultWorkspaces = [
    {
      id: 'main-workspace',
      name: 'Main Development Workspace',
      description: 'Primary development environment with full agent suite',
      agents: [
        'claude-code-ide',
        'google-cli-researcher', 
        'browser-automation',
        'crawl4ai',
        'system-architect',
        'database-engineer'
      ],
      tasks: [],
      status: 'active' as const,
      created_at: new Date(),
      updated_at: new Date(),
      metadata: {
        template: 'full-stack-development',
        tags: ['development', 'full-stack'],
        settings: {
          autoSave: true,
          realTimeUpdates: true,
          agentCollaboration: true
        }
      }
    },
    {
      id: 'e-commerce-project',
      name: 'E-commerce Platform',
      description: 'Building a modern e-commerce platform with React and Node.js',
      agents: [
        'claude-code-ide',
        'system-architect',
        'database-engineer',
        'browser-automation'
      ],
      tasks: [],
      status: 'active' as const,
      created_at: new Date(Date.now() - 86400000),
      updated_at: new Date(Date.now() - 86400000),
      metadata: {
        template: 'e-commerce',
        tags: ['e-commerce', 'react', 'nodejs'],
        settings: {
          autoSave: true,
          realTimeUpdates: false
        }
      }
    }
  ];

  defaultWorkspaces.forEach(ws => workspaces.set(ws.id, ws));
};

// Initialize on startup
initializeDefaultWorkspaces();

// =============================================
// WORKSPACE ROUTES
// =============================================

/**
 * GET /api/workspaces
 * Get all workspaces
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, search, limit = 50, offset = 0 } = req.query;
    
    let filteredWorkspaces = Array.from(workspaces.values());
    
    // Filter by status
    if (status && typeof status === 'string') {
      filteredWorkspaces = filteredWorkspaces.filter(ws => ws.status === status);
    }
    
    // Search by name or description
    if (search && typeof search === 'string') {
      const searchLower = search.toLowerCase();
      filteredWorkspaces = filteredWorkspaces.filter(ws => 
        ws.name.toLowerCase().includes(searchLower) ||
        ws.description.toLowerCase().includes(searchLower)
      );
    }
    
    // Sort by updated_at desc
    filteredWorkspaces.sort((a, b) => 
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
    
    // Pagination
    const startIndex = Number(offset);
    const endIndex = startIndex + Number(limit);
    const paginatedWorkspaces = filteredWorkspaces.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      workspaces: paginatedWorkspaces,
      pagination: {
        total: filteredWorkspaces.length,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: endIndex < filteredWorkspaces.length
      }
    });
    
  } catch (error) {
    logger.error('Failed to get workspaces:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve workspaces'
    });
  }
});

/**
 * POST /api/workspaces
 * Create new workspace
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description, agents = [], template, tags = [], settings = {} } = req.body;
    
    if (!name || !description) {
      return res.status(400).json({
        success: false,
        error: 'Name and description are required'
      });
    }
    
    const workspaceId = uuidv4();
    const now = new Date();
    
    const workspace: Workspace = {
      id: workspaceId,
      name,
      description,
      agents,
      tasks: [],
      status: 'active',
      created_at: now,
      updated_at: now,
      metadata: {
        template,
        tags,
        settings
      }
    };
    
    workspaces.set(workspaceId, workspace);
    
    logger.info('Workspace created:', { workspaceId, name });
    
    res.status(201).json({
      success: true,
      workspace
    });
    
  } catch (error) {
    logger.error('Failed to create workspace:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create workspace'
    });
  }
});

/**
 * GET /api/workspaces/:id
 * Get workspace by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const workspace = workspaces.get(id);
    
    if (!workspace) {
      return res.status(404).json({
        success: false,
        error: 'Workspace not found'
      });
    }
    
    res.json({
      success: true,
      workspace
    });
    
  } catch (error) {
    logger.error('Failed to get workspace:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve workspace'
    });
  }
});

/**
 * PUT /api/workspaces/:id
 * Update workspace
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, agents, status, metadata } = req.body;
    
    const workspace = workspaces.get(id);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        error: 'Workspace not found'
      });
    }
    
    // Update workspace
    if (name !== undefined) workspace.name = name;
    if (description !== undefined) workspace.description = description;
    if (agents !== undefined) workspace.agents = agents;
    if (status !== undefined) workspace.status = status;
    if (metadata !== undefined) workspace.metadata = { ...workspace.metadata, ...metadata };
    
    workspace.updated_at = new Date();
    
    logger.info('Workspace updated:', { workspaceId: id });
    
    res.json({
      success: true,
      workspace
    });
    
  } catch (error) {
    logger.error('Failed to update workspace:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update workspace'
    });
  }
});

/**
 * DELETE /api/workspaces/:id
 * Delete workspace
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!workspaces.has(id)) {
      return res.status(404).json({
        success: false,
        error: 'Workspace not found'
      });
    }
    
    workspaces.delete(id);
    
    logger.info('Workspace deleted:', { workspaceId: id });
    
    res.json({
      success: true,
      message: 'Workspace deleted successfully'
    });
    
  } catch (error) {
    logger.error('Failed to delete workspace:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete workspace'
    });
  }
});

/**
 * GET /api/workspaces/:id/context
 * Get workspace context for agents
 */
router.get('/:id/context', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const workspace = workspaces.get(id);
    
    if (!workspace) {
      return res.status(404).json({
        success: false,
        error: 'Workspace not found'
      });
    }
    
    const context = {
      workspaceId: workspace.id,
      name: workspace.name,
      description: workspace.description,
      activeAgents: workspace.agents,
      recentTasks: workspace.tasks.slice(-10),
      settings: workspace.metadata.settings,
      tags: workspace.metadata.tags,
      status: workspace.status
    };
    
    res.json({
      success: true,
      context
    });
    
  } catch (error) {
    logger.error('Failed to get workspace context:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve workspace context'
    });
  }
});

/**
 * POST /api/workspaces/:id/tasks
 * Create task in workspace
 */
router.post('/:id/tasks', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, assigned_agent } = req.body;
    
    const workspace = workspaces.get(id);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        error: 'Workspace not found'
      });
    }
    
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        error: 'Title and description are required'
      });
    }
    
    const task: WorkspaceTask = {
      id: uuidv4(),
      title,
      description,
      status: 'pending',
      assigned_agent,
      created_at: new Date()
    };
    
    workspace.tasks.push(task);
    workspace.updated_at = new Date();
    
    logger.info('Task created in workspace:', { workspaceId: id, taskId: task.id });
    
    res.status(201).json({
      success: true,
      task
    });
    
  } catch (error) {
    logger.error('Failed to create task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create task'
    });
  }
});

/**
 * GET /api/workspaces/:id/tasks
 * Get workspace tasks
 */
router.get('/:id/tasks', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, limit = 50 } = req.query;
    
    const workspace = workspaces.get(id);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        error: 'Workspace not found'
      });
    }
    
    let tasks = workspace.tasks;
    
    if (status && typeof status === 'string') {
      tasks = tasks.filter(task => task.status === status);
    }
    
    tasks = tasks.slice(-Number(limit));
    
    res.json({
      success: true,
      tasks,
      total: workspace.tasks.length
    });
    
  } catch (error) {
    logger.error('Failed to get workspace tasks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve workspace tasks'
    });
  }
});

/**
 * PUT /api/workspaces/:id/tasks/:taskId
 * Update workspace task
 */
router.put('/:id/tasks/:taskId', async (req: Request, res: Response) => {
  try {
    const { id, taskId } = req.params;
    const { status, result } = req.body;
    
    const workspace = workspaces.get(id);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        error: 'Workspace not found'
      });
    }
    
    const task = workspace.tasks.find(t => t.id === taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }
    
    if (status !== undefined) task.status = status;
    if (result !== undefined) task.result = result;
    
    if (status === 'completed' || status === 'failed') {
      task.completed_at = new Date();
    }
    
    workspace.updated_at = new Date();
    
    logger.info('Task updated:', { workspaceId: id, taskId });
    
    res.json({
      success: true,
      task
    });
    
  } catch (error) {
    logger.error('Failed to update task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update task'
    });
  }
});

/**
 * GET /api/workspaces/templates
 * Get workspace templates
 */
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const templates = [
      {
        id: 'full-stack-development',
        name: 'Full Stack Development',
        description: 'Complete development environment with all agents',
        agents: [
          'claude-code-ide',
          'google-cli-researcher', 
          'browser-automation',
          'crawl4ai',
          'system-architect',
          'database-engineer'
        ],
        tags: ['development', 'full-stack'],
        settings: {
          autoSave: true,
          realTimeUpdates: true,
          agentCollaboration: true
        }
      },
      {
        id: 'research-analysis',
        name: 'Research & Analysis',
        description: 'Research-focused workspace with data collection agents',
        agents: [
          'google-cli-researcher',
          'crawl4ai',
          'system-architect'
        ],
        tags: ['research', 'analysis', 'data'],
        settings: {
          autoSave: true,
          realTimeUpdates: false
        }
      },
      {
        id: 'web-automation',
        name: 'Web Automation',
        description: 'Browser automation and web scraping workspace',
        agents: [
          'browser-automation',
          'crawl4ai',
          'claude-code-ide'
        ],
        tags: ['automation', 'scraping', 'browser'],
        settings: {
          autoSave: false,
          realTimeUpdates: true
        }
      }
    ];
    
    res.json({
      success: true,
      templates
    });
    
  } catch (error) {
    logger.error('Failed to get templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve templates'
    });
  }
});

export default router;