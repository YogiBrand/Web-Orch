/**
 * 🚀 TERMINAL API ROUTES
 * Handle unified terminal commands with agent routing
 */

import { Router, Request, Response } from 'express';
import AgentOrchestrator from '../services/agent-orchestrator';
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
// TERMINAL COMMAND TYPES
// =============================================

interface TerminalCommand {
  id: string;
  command: string;
  args: string[];
  agent: string;
  workingDirectory: string;
  workspaceId: string;
  sessionId: string;
  timestamp: Date;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled';
  output: string[];
  error?: string;
  duration?: number;
}

// =============================================
// COMMAND ROUTING LOGIC
// =============================================

const COMMAND_PATTERNS: Record<string, { agent: string; description: string }> = {
  // File operations
  'ls': { agent: 'claude-code-ide', description: 'List directory contents' },
  'cat': { agent: 'claude-code-ide', description: 'Display file contents' },
  'grep': { agent: 'claude-code-ide', description: 'Search text in files' },
  'find': { agent: 'claude-code-ide', description: 'Find files and directories' },
  'git': { agent: 'claude-code-ide', description: 'Git version control' },
  'tree': { agent: 'claude-code-ide', description: 'Display directory tree' },
  'mkdir': { agent: 'claude-code-ide', description: 'Create directories' },
  'rm': { agent: 'claude-code-ide', description: 'Remove files and directories' },
  'cp': { agent: 'claude-code-ide', description: 'Copy files and directories' },
  'mv': { agent: 'claude-code-ide', description: 'Move/rename files' },

  // Development commands
  'npm': { agent: 'claude-code-ide', description: 'Node package manager' },
  'yarn': { agent: 'claude-code-ide', description: 'Yarn package manager' },
  'node': { agent: 'claude-code-ide', description: 'Run Node.js scripts' },
  'python': { agent: 'claude-code-ide', description: 'Run Python scripts' },
  'pip': { agent: 'claude-code-ide', description: 'Python package manager' },
  'cargo': { agent: 'claude-code-ide', description: 'Rust package manager' },
  'go': { agent: 'claude-code-ide', description: 'Go language tools' },

  // Database commands
  'psql': { agent: 'database-engineer', description: 'PostgreSQL client' },
  'mysql': { agent: 'database-engineer', description: 'MySQL client' },
  'redis-cli': { agent: 'database-engineer', description: 'Redis client' },
  'mongo': { agent: 'database-engineer', description: 'MongoDB client' },
  'sqlite3': { agent: 'database-engineer', description: 'SQLite client' },

  // Testing commands
  'jest': { agent: 'claude-code-ide', description: 'Run Jest tests' },
  'cypress': { agent: 'browser-automation', description: 'Run Cypress tests' },
  'playwright': { agent: 'browser-automation', description: 'Run Playwright tests' },
  'pytest': { agent: 'claude-code-ide', description: 'Run Python tests' },

  // DevOps commands
  'docker': { agent: 'claude-code-ide', description: 'Docker container management' },
  'kubectl': { agent: 'claude-code-ide', description: 'Kubernetes management' },
  'terraform': { agent: 'claude-code-ide', description: 'Infrastructure as Code' },
  'ansible': { agent: 'claude-code-ide', description: 'Configuration management' },

  // System commands
  'ps': { agent: 'claude-code-ide', description: 'Show running processes' },
  'top': { agent: 'claude-code-ide', description: 'Display system processes' },
  'htop': { agent: 'claude-code-ide', description: 'Interactive process viewer' },
  'df': { agent: 'claude-code-ide', description: 'Show disk usage' },
  'free': { agent: 'claude-code-ide', description: 'Show memory usage' },
  'curl': { agent: 'claude-code-ide', description: 'Transfer data from servers' },
  'wget': { agent: 'claude-code-ide', description: 'Download files from web' }
};

const AGENT_COMMAND_MAPPING: Record<string, string> = {
  // Architecture & Planning
  'architect': 'system-architect',
  'design': 'system-architect',
  'plan': 'system-architect',

  // Development
  'code': 'claude-code-ide',
  'implement': 'claude-code-ide',
  'develop': 'claude-code-ide',
  'frontend': 'claude-code-ide',
  'backend': 'claude-code-ide',
  'fullstack': 'claude-code-ide',

  // Research & Data
  'research': 'google-cli-researcher',
  'search': 'google-cli-researcher',
  'analyze': 'google-cli-researcher',
  'database': 'database-engineer',
  'db': 'database-engineer',
  'query': 'database-engineer',

  // Automation
  'browser': 'browser-automation',
  'automate': 'browser-automation',
  'scrape': 'browser-automation',
  'crawl': 'crawl4ai',
  'extract': 'crawl4ai'
};

// =============================================
// COMMAND PARSING FUNCTIONS
// =============================================

function parseCommand(input: string): { agent: string; command: string; args: string[] } {
  const parts = input.trim().split(' ');
  const baseCommand = parts[0].toLowerCase();

  // Check for direct agent specification (e.g., "@claude-code code something")
  if (baseCommand.startsWith('@')) {
    const agentName = baseCommand.slice(1);
    return {
      agent: agentName,
      command: parts.slice(1).join(' '),
      args: parts.slice(1)
    };
  }

  // Check command patterns first
  if (COMMAND_PATTERNS[baseCommand]) {
    return {
      agent: COMMAND_PATTERNS[baseCommand].agent,
      command: input,
      args: parts.slice(1)
    };
  }

  // Check keyword mapping
  for (const [keyword, agent] of Object.entries(AGENT_COMMAND_MAPPING)) {
    if (input.toLowerCase().includes(keyword)) {
      return {
        agent,
        command: input,
        args: parts.slice(1)
      };
    }
  }

  // Default to Claude Code for general commands
  return {
    agent: 'claude-code-ide',
    command: input,
    args: parts.slice(1)
  };
}

function generateHelpMessage(): string[] {
  const help = [
    '🚀 Nexus Unified Terminal - Help',
    '===============================',
    '',
    'AGENT COMMANDS:',
    '  @agent-name [command]  - Execute command with specific agent',
    '  @claude-code help      - Get help from Claude Code IDE',
    '  @google-cli search X   - Search using Google CLI',
    '',
    'AVAILABLE COMMANDS:',
    ''
  ];

  // Group commands by category
  const categories: Record<string, Array<{cmd: string, desc: string}>> = {
    'File Operations': [],
    'Development': [],
    'Database': [],
    'Testing': [],
    'DevOps': [],
    'System': []
  };

  for (const [cmd, info] of Object.entries(COMMAND_PATTERNS)) {
    if (cmd.match(/^(ls|cat|grep|find|git|tree|mkdir|rm|cp|mv)$/)) {
      categories['File Operations'].push({ cmd, desc: info.description });
    } else if (cmd.match(/^(npm|yarn|node|python|pip|cargo|go)$/)) {
      categories['Development'].push({ cmd, desc: info.description });
    } else if (cmd.match(/^(psql|mysql|redis-cli|mongo|sqlite3)$/)) {
      categories['Database'].push({ cmd, desc: info.description });
    } else if (cmd.match(/^(jest|cypress|playwright|pytest)$/)) {
      categories['Testing'].push({ cmd, desc: info.description });
    } else if (cmd.match(/^(docker|kubectl|terraform|ansible)$/)) {
      categories['DevOps'].push({ cmd, desc: info.description });
    } else {
      categories['System'].push({ cmd, desc: info.description });
    }
  }

  for (const [category, commands] of Object.entries(categories)) {
    if (commands.length > 0) {
      help.push(`${category}:`);
      commands.forEach(({ cmd, desc }) => {
        help.push(`  ${cmd.padEnd(12)} - ${desc}`);
      });
      help.push('');
    }
  }

  help.push('EXAMPLES:');
  help.push('  ls -la              - List files with details');
  help.push('  git status          - Check git repository status');
  help.push('  npm install         - Install npm packages');
  help.push('  @google-cli search "React best practices"');
  help.push('  @database-engineer create table users');
  help.push('');

  return help;
}

// =============================================
// TERMINAL ROUTES
// =============================================

/**
 * POST /api/terminal/execute
 * Execute terminal command with agent routing
 */
router.post('/execute', async (req: Request, res: Response) => {
  try {
    const {
      commandId,
      agent: suggestedAgent,
      command,
      args,
      workingDirectory = '/workspace',
      workspaceId,
      sessionId
    } = req.body;

    if (!command || !workspaceId || !sessionId) {
      return res.status(400).json({
        success: false,
        error: 'command, workspaceId, and sessionId are required'
      });
    }

    // Handle special commands
    if (command.toLowerCase() === 'help') {
      return res.json({
        success: true,
        output: generateHelpMessage(),
        workingDirectory,
        metadata: { commandType: 'help' }
      });
    }

    if (command.toLowerCase() === 'clear') {
      return res.json({
        success: true,
        output: ['Terminal cleared'],
        workingDirectory,
        metadata: { commandType: 'clear' }
      });
    }

    // Parse command to determine routing
    const parsedCommand = parseCommand(command);
    const finalAgent = suggestedAgent || parsedCommand.agent;

    // Get orchestrator service
    const orchestrator = req.app.locals.agentOrchestrator as AgentOrchestrator;
    if (!orchestrator) {
      throw new AppError('Agent orchestrator not initialized', 500);
    }

    const terminalCommand: TerminalCommand = {
      id: commandId || uuidv4(),
      command,
      args: args || parsedCommand.args,
      agent: finalAgent,
      workingDirectory,
      workspaceId,
      sessionId,
      timestamp: new Date(),
      status: 'executing',
      output: []
    };

    // Route command to agent
    const startTime = Date.now();
    
    try {
      const agentResponse = await orchestrator.routeToAgent(finalAgent, {
        type: 'terminal',
        command: parsedCommand.command,
        args: parsedCommand.args,
        workingDirectory,
        context: {
          sessionId,
          workspaceId,
          commandId: terminalCommand.id
        }
      });

      terminalCommand.status = 'completed';
      terminalCommand.duration = Date.now() - startTime;
      
      // Process agent response
      let output: string[] = [];
      
      if (agentResponse.message) {
        output = agentResponse.message.split('\n');
      } else if (agentResponse.response) {
        output = agentResponse.response.split('\n');
      } else {
        output = ['Command executed successfully'];
      }

      terminalCommand.output = output;

      logger.info('Terminal command executed', {
        commandId: terminalCommand.id,
        command,
        agent: finalAgent,
        duration: terminalCommand.duration,
        workspaceId,
        sessionId
      });

      res.json({
        success: true,
        output,
        workingDirectory,
        agent: finalAgent,
        duration: terminalCommand.duration,
        metadata: {
          agentResponse: agentResponse.metadata,
          toolCalls: agentResponse.toolCalls
        }
      });

    } catch (agentError) {
      terminalCommand.status = 'failed';
      terminalCommand.error = agentError instanceof Error ? agentError.message : 'Unknown error';
      terminalCommand.duration = Date.now() - startTime;

      logger.error('Terminal command failed', {
        commandId: terminalCommand.id,
        command,
        agent: finalAgent,
        error: terminalCommand.error
      });

      // Return error but with proper terminal formatting
      res.json({
        success: true, // We still successfully processed the request
        output: [
          `❌ Command failed: ${terminalCommand.error}`,
          '',
          'Suggestions:',
          '  • Check if the command is valid',
          '  • Try using a different agent with @agent-name',
          '  • Type "help" for available commands'
        ],
        workingDirectory,
        agent: finalAgent,
        duration: terminalCommand.duration,
        metadata: { error: true, errorMessage: terminalCommand.error }
      });
    }

  } catch (error) {
    logger.error('Terminal execution error:', error);

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error during terminal execution'
    });
  }
});

/**
 * GET /api/terminal/commands
 * Get available commands and agents
 */
router.get('/commands', async (req: Request, res: Response) => {
  try {
    const commands = Object.entries(COMMAND_PATTERNS).map(([cmd, info]) => ({
      command: cmd,
      agent: info.agent,
      description: info.description
    }));

    const agents = Array.from(new Set(Object.values(COMMAND_PATTERNS).map(p => p.agent)));

    const agentMappings = Object.entries(AGENT_COMMAND_MAPPING).map(([keyword, agent]) => ({
      keyword,
      agent
    }));

    res.json({
      success: true,
      commands,
      agents,
      agentMappings,
      totalCommands: commands.length
    });

  } catch (error) {
    logger.error('Failed to get terminal commands:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve terminal commands'
    });
  }
});

/**
 * POST /api/terminal/autocomplete
 * Get command autocomplete suggestions
 */
router.post('/autocomplete', async (req: Request, res: Response) => {
  try {
    const { input, sessionId, workspaceId } = req.body;

    if (!input) {
      return res.json({
        success: true,
        suggestions: []
      });
    }

    const inputLower = input.toLowerCase();
    const suggestions: Array<{
      text: string;
      type: 'command' | 'agent' | 'keyword';
      description: string;
    }> = [];

    // Agent suggestions
    if (input.startsWith('@')) {
      const agentPrefix = input.slice(1).toLowerCase();
      const agents = [
        'claude-code-ide',
        'google-cli-researcher', 
        'browser-automation',
        'crawl4ai',
        'system-architect',
        'database-engineer'
      ];

      agents.forEach(agent => {
        if (agent.toLowerCase().startsWith(agentPrefix)) {
          suggestions.push({
            text: `@${agent}`,
            type: 'agent',
            description: `Execute with ${agent}`
          });
        }
      });
    } else {
      // Command suggestions
      Object.entries(COMMAND_PATTERNS).forEach(([cmd, info]) => {
        if (cmd.toLowerCase().startsWith(inputLower)) {
          suggestions.push({
            text: cmd,
            type: 'command',
            description: info.description
          });
        }
      });

      // Keyword suggestions
      Object.entries(AGENT_COMMAND_MAPPING).forEach(([keyword, agent]) => {
        if (keyword.toLowerCase().includes(inputLower)) {
          suggestions.push({
            text: keyword,
            type: 'keyword',
            description: `Routes to ${agent}`
          });
        }
      });
    }

    // Limit suggestions
    const limitedSuggestions = suggestions.slice(0, 10);

    res.json({
      success: true,
      suggestions: limitedSuggestions,
      total: suggestions.length
    });

  } catch (error) {
    logger.error('Autocomplete error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get autocomplete suggestions'
    });
  }
});

/**
 * GET /api/terminal/sessions/:sessionId/history
 * Get command history for session
 */
router.get('/sessions/:sessionId/history', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { limit = 50 } = req.query;

    // In a real implementation, this would come from database
    // For now, return empty history
    const history: TerminalCommand[] = [];

    res.json({
      success: true,
      history: history.slice(-Number(limit)),
      sessionId,
      total: history.length
    });

  } catch (error) {
    logger.error('Failed to get terminal history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve terminal history'
    });
  }
});

export default router;