/**
 * 🚀 NEXUS UNIFIED TERMINAL
 * Claude Code-style Terminal with Multi-Agent Integration
 * World-Breaking Development Environment
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useEvents } from '@/hooks/use-events';
import { api } from '@/lib/api';
import {
  Terminal,
  Play,
  Square,
  RotateCcw,
  Search,
  Code,
  Brain,
  Globe,
  Server,
  Database,
  Shield,
  TestTube,
  Rocket,
  GitBranch,
  Settings,
  Zap,
  Target,
  Users,
  Layers,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';

// =============================================
// TERMINAL COMMAND TYPES
// =============================================

interface TerminalCommand {
  id: string;
  command: string;
  output: string[];
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  agent?: string;
  timestamp: Date;
  duration?: number;
}

interface TerminalSession {
  id: string;
  name: string;
  commands: TerminalCommand[];
  activeCommand?: string;
  status: 'active' | 'idle' | 'busy';
  agents: string[];
  workingDirectory: string;
}

// =============================================
// COMMAND PARSER & AGENT MAPPER
// =============================================

const AGENT_COMMAND_MAPPING = {
  // Architecture & Planning
  'architect': 'system-architect',
  'design': 'system-architect',
  'plan': 'system-architect',

  // Development
  'code': 'claude-code-ide',
  'implement': 'fullstack-developer',
  'develop': 'fullstack-developer',
  'frontend': 'frontend-specialist',
  'backend': 'backend-specialist',
  'fullstack': 'fullstack-developer',

  // Research & Data
  'research': 'google-cli-researcher',
  'search': 'google-cli-researcher',
  'find': 'google-cli-researcher',
  'database': 'database-engineer',
  'db': 'database-engineer',
  'query': 'database-engineer',

  // Quality Assurance
  'test': 'testing-specialist',
  'testing': 'testing-specialist',
  'spec': 'testing-specialist',
  'security': 'security-auditor',
  'audit': 'security-auditor',
  'secure': 'security-auditor',

  // DevOps & Infrastructure
  'deploy': 'devops-engineer',
  'ci': 'devops-engineer',
  'cd': 'devops-engineer',
  'docker': 'devops-engineer',
  'infra': 'devops-engineer',

  // Leadership & Management
  'review': 'tech-lead',
  'lead': 'tech-lead',
  'mentor': 'tech-lead',
  'docs': 'documentation-specialist',
  'document': 'documentation-specialist',

  // Performance
  'optimize': 'performance-optimizer',
  'performance': 'performance-optimizer',
  'speed': 'performance-optimizer',
  'monitor': 'performance-optimizer'
};

const COMMAND_PATTERNS = {
  // File operations
  'ls': { agent: 'claude-code-ide', description: 'List directory contents' },
  'cat': { agent: 'claude-code-ide', description: 'Display file contents' },
  'grep': { agent: 'claude-code-ide', description: 'Search text in files' },
  'find': { agent: 'claude-code-ide', description: 'Find files and directories' },
  'git': { agent: 'claude-code-ide', description: 'Git version control' },

  // Development commands
  'npm': { agent: 'claude-code-ide', description: 'Node package manager' },
  'yarn': { agent: 'claude-code-ide', description: 'Yarn package manager' },
  'node': { agent: 'claude-code-ide', description: 'Run Node.js scripts' },
  'python': { agent: 'claude-code-ide', description: 'Run Python scripts' },
  'docker': { agent: 'devops-engineer', description: 'Docker container management' },

  // Database commands
  'psql': { agent: 'database-engineer', description: 'PostgreSQL client' },
  'mysql': { agent: 'database-engineer', description: 'MySQL client' },
  'redis-cli': { agent: 'database-engineer', description: 'Redis client' },

  // Testing commands
  'jest': { agent: 'testing-specialist', description: 'Run Jest tests' },
  'cypress': { agent: 'testing-specialist', description: 'Run Cypress tests' },
  'playwright': { agent: 'testing-specialist', description: 'Run Playwright tests' },

  // Deployment commands
  'kubectl': { agent: 'devops-engineer', description: 'Kubernetes management' },
  'terraform': { agent: 'devops-engineer', description: 'Infrastructure as Code' },
  'ansible': { agent: 'devops-engineer', description: 'Configuration management' }
};

// =============================================
// UNIFIED TERMINAL COMPONENT
// =============================================

interface UnifiedTerminalProps {
  workspaceId: string;
  initialDirectory?: string;
  onCommandExecute?: (command: TerminalCommand) => void;
  onAgentResponse?: (response: any) => void;
  className?: string;
}

const UnifiedTerminal: React.FC<UnifiedTerminalProps> = ({
  workspaceId,
  initialDirectory = '/workspace',
  onCommandExecute,
  onAgentResponse,
  className = ''
}) => {
  const [sessions, setSessions] = useState<TerminalSession[]>([]);
  const [activeSession, setActiveSession] = useState<TerminalSession | null>(null);
  const [commandInput, setCommandInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeAgents, setActiveAgents] = useState<string[]>([]);
  const [workingDirectory, setWorkingDirectory] = useState(initialDirectory);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { events, isConnected } = useEvents({ config: { enableFilters: true } });

  // Initialize terminal session
  useEffect(() => {
    initializeTerminalSession();
  }, [workspaceId]);

  // Handle real-time events
  useEffect(() => {
    if (events.length > 0) {
      const latestEvent = events[events.length - 1];
      handleTerminalEvent(latestEvent);
    }
  }, [events]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [activeSession?.commands]);

  const initializeTerminalSession = () => {
    const session: TerminalSession = {
      id: `session_${Date.now()}`,
      name: 'Nexus Terminal',
      commands: [],
      status: 'active',
      agents: Object.values(AGENT_COMMAND_MAPPING),
      workingDirectory: initialDirectory
    };

    // Add welcome message
    const welcomeCommand: TerminalCommand = {
      id: 'welcome',
      command: 'welcome',
      output: [
        '🚀 Welcome to Nexus Unified Terminal',
        '======================================',
        '',
        'Available agents:',
        '  • System Architect     - Architecture & design',
        '  • Claude Code IDE      - Code editing & development',
        '  • Full Stack Developer - Complete feature development',
        '  • Frontend Specialist  - React, UI/UX development',
        '  • Backend Specialist   - API & server development',
        '  • Database Engineer    - Database design & optimization',
        '  • Testing Specialist   - Automated testing',
        '  • Security Auditor     - Security analysis & auditing',
        '  • Performance Optimizer- Performance analysis & optimization',
        '  • DevOps Engineer      - Infrastructure & deployment',
        '  • Tech Lead           - Code review & mentoring',
        '  • Documentation Specialist - Technical documentation',
        '  • Google CLI Researcher - Research & data collection',
        '',
        'Type "help" for more information or start with any command!',
        ''
      ],
      status: 'completed',
      timestamp: new Date()
    };

    session.commands.push(welcomeCommand);
    setSessions([session]);
    setActiveSession(session);
    setActiveAgents(session.agents);
  };

  const parseCommand = (input: string): { agent: string; command: string; args: string[] } => {
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

    // Check command patterns
    if (COMMAND_PATTERNS[baseCommand as keyof typeof COMMAND_PATTERNS]) {
      return {
        agent: COMMAND_PATTERNS[baseCommand as keyof typeof COMMAND_PATTERNS].agent,
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
  };

  const executeCommand = async (input: string) => {
    if (!activeSession || !input.trim()) return;

    const parsedCommand = parseCommand(input);
    const commandId = `cmd_${Date.now()}`;

    // Create command object
    const command: TerminalCommand = {
      id: commandId,
      command: input,
      output: [`🔄 Executing: ${input}`, `🤖 Agent: ${parsedCommand.agent}`],
      status: 'running',
      agent: parsedCommand.agent,
      timestamp: new Date()
    };

    // Add command to session
    setActiveSession(prev => prev ? {
      ...prev,
      commands: [...prev.commands, command],
      activeCommand: commandId,
      status: 'busy'
    } : null);

    // Add to command history
    setCommandHistory(prev => [input, ...prev.filter(cmd => cmd !== input)]);
    setHistoryIndex(-1);
    setIsExecuting(true);

    try {
      // Execute command via agent
      const startTime = Date.now();
      const response = await api.post('/api/terminal/execute', {
        commandId,
        agent: parsedCommand.agent,
        command: parsedCommand.command,
        args: parsedCommand.args,
        workingDirectory,
        workspaceId,
        sessionId: activeSession.id
      });

      const duration = Date.now() - startTime;

      // Update command with results
      setActiveSession(prev => {
        if (!prev) return null;

        const updatedCommands = prev.commands.map(cmd =>
          cmd.id === commandId
            ? {
                ...cmd,
                output: [
                  ...cmd.output,
                  '',
                  '✅ Command completed successfully',
                  `⏱️ Duration: ${duration}ms`,
                  '',
                  ...response.data.output
                ],
                status: 'completed',
                duration
              }
            : cmd
        );

        return {
          ...prev,
          commands: updatedCommands,
          activeCommand: undefined,
          status: 'active'
        };
      });

      // Update working directory if changed
      if (response.data.workingDirectory) {
        setWorkingDirectory(response.data.workingDirectory);
      }

      onCommandExecute?.(command);

    } catch (error: any) {
      console.error('Command execution failed:', error);

      // Update command with error
      setActiveSession(prev => {
        if (!prev) return null;

        const updatedCommands = prev.commands.map(cmd =>
          cmd.id === commandId
            ? {
                ...cmd,
                output: [
                  ...cmd.output,
                  '',
                  '❌ Command failed',
                  `Error: ${error.message || 'Unknown error'}`,
                  '',
                  'Try "help" for available commands or "@agent-name help" for agent-specific help'
                ],
                status: 'failed'
              }
            : cmd
        );

        return {
          ...prev,
          commands: updatedCommands,
          activeCommand: undefined,
          status: 'active'
        };
      });

      toast({
        title: 'Command Failed',
        description: error.message || 'Unknown error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleTerminalEvent = (event: any) => {
    switch (event.type) {
      case 'agent.message':
        handleAgentMessage(event);
        break;
      case 'command.progress':
        handleCommandProgress(event);
        break;
      case 'agent.status':
        handleAgentStatusUpdate(event);
        break;
    }
  };

  const handleAgentMessage = (event: any) => {
    if (!activeSession) return;

    const messageCommand: TerminalCommand = {
      id: `msg_${Date.now()}`,
      command: `[${event.data.agentName}]`,
      output: [event.data.message],
      status: 'completed',
      agent: event.data.agentId,
      timestamp: new Date(event.data.timestamp)
    };

    setActiveSession(prev => prev ? {
      ...prev,
      commands: [...prev.commands, messageCommand]
    } : null);

    onAgentResponse?.(event.data);
  };

  const handleCommandProgress = (event: any) => {
    if (!activeSession) return;

    setActiveSession(prev => {
      if (!prev) return null;

      const updatedCommands = prev.commands.map(cmd =>
        cmd.id === event.data.commandId
          ? {
              ...cmd,
              output: [...cmd.output, event.data.progress]
            }
          : cmd
      );

      return {
        ...prev,
        commands: updatedCommands
      };
    });
  };

  const handleAgentStatusUpdate = (event: any) => {
    if (event.data.status === 'active') {
      setActiveAgents(prev => [...prev.filter(id => id !== event.data.agentId), event.data.agentId]);
    } else if (event.data.status === 'inactive') {
      setActiveAgents(prev => prev.filter(id => id !== event.data.agentId));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeCommand(commandInput);
      setCommandInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCommandInput(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCommandInput(commandHistory[newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommandInput('');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const parts = commandInput.split(' ');
      
      // Auto-complete agent names
      if (parts.length === 1 && parts[0].startsWith('@')) {
        const partial = parts[0].slice(1).toLowerCase();
        const agentMatches = Object.values(AGENT_COMMAND_MAPPING).filter(agentId =>
          agentId.toLowerCase().startsWith(partial)
        );
        
        if (agentMatches.length === 1) {
          setCommandInput(`@${agentMatches[0]} `);
        } else if (agentMatches.length > 1) {
          // Show available options in terminal
          const suggestion = `Available agents: ${agentMatches.join(', ')}`;
          if (activeSession) {
            const suggestionCommand: TerminalCommand = {
              id: `suggestion_${Date.now()}`,
              command: 'autocomplete',
              output: [suggestion],
              status: 'completed',
              timestamp: new Date()
            };
            
            setActiveSession(prev => prev ? {
              ...prev,
              commands: [...prev.commands, suggestionCommand]
            } : null);
          }
        }
      } 
      // Auto-complete command names
      else if (parts.length === 1) {
        const partial = parts[0].toLowerCase();
        const commandMatches = Object.keys(COMMAND_PATTERNS).filter(cmd =>
          cmd.toLowerCase().startsWith(partial)
        );
        
        if (commandMatches.length === 1) {
          setCommandInput(`${commandMatches[0]} `);
        } else if (commandMatches.length > 1) {
          // Show available commands
          const suggestion = `Available commands: ${commandMatches.join(', ')}`;
          if (activeSession) {
            const suggestionCommand: TerminalCommand = {
              id: `suggestion_${Date.now()}`,
              command: 'autocomplete',
              output: [suggestion],
              status: 'completed',
              timestamp: new Date()
            };
            
            setActiveSession(prev => prev ? {
              ...prev,
              commands: [...prev.commands, suggestionCommand]
            } : null);
          }
        }
      }
    }
  };

  const getAgentIcon = (agentId: string) => {
    switch (agentId) {
      case 'system-architect': return <Layers className="w-4 h-4" />;
      case 'claude-code-ide': return <Code className="w-4 h-4" />;
      case 'fullstack-developer': return <Rocket className="w-4 h-4" />;
      case 'frontend-specialist': return <Globe className="w-4 h-4" />;
      case 'backend-specialist': return <Server className="w-4 h-4" />;
      case 'database-engineer': return <Database className="w-4 h-4" />;
      case 'testing-specialist': return <TestTube className="w-4 h-4" />;
      case 'security-auditor': return <Shield className="w-4 h-4" />;
      case 'performance-optimizer': return <Zap className="w-4 h-4" />;
      case 'devops-engineer': return <Settings className="w-4 h-4" />;
      case 'tech-lead': return <Users className="w-4 h-4" />;
      case 'documentation-specialist': return <FileText className="w-4 h-4" />;
      case 'google-cli-researcher': return <Search className="w-4 h-4" />;
      default: return <Terminal className="w-4 h-4" />;
    }
  };

  const getStatusIcon = (status: TerminalCommand['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-400" />;
      case 'running': return <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />;
      case 'cancelled': return <AlertCircle className="w-4 h-4 text-yellow-400" />;
    }
  };

  return (
    <Card className={`h-full flex flex-col bg-slate-900/50 border-slate-700 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-green-400" />
            Nexus Unified Terminal
            <Badge variant="secondary" className="bg-purple-500/20 text-purple-300">
              {activeAgents.length} agents active
            </Badge>
          </CardTitle>

          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className={
                activeSession?.status === 'active'
                  ? 'bg-green-500/20 text-green-400'
                  : activeSession?.status === 'busy'
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-gray-500/20 text-gray-400'
              }
            >
              {activeSession?.status || 'idle'}
            </Badge>

            <div className="flex -space-x-1">
              {activeAgents.slice(0, 5).map(agentId => (
                <div
                  key={agentId}
                  className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center border-2 border-slate-800"
                  title={agentId}
                >
                  {getAgentIcon(agentId)}
                </div>
              ))}
              {activeAgents.length > 5 && (
                <div className="w-6 h-6 bg-slate-600 rounded-full flex items-center justify-center border-2 border-slate-800 text-xs text-white">
                  +{activeAgents.length - 5}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="text-sm text-slate-400">
          <span className="text-green-400">nexus@workspace</span>:<span className="text-blue-400">{workingDirectory}</span>$ █
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* Terminal Output */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
          <div className="font-mono text-sm space-y-2">
            {activeSession?.commands.map((cmd) => (
              <div key={cmd.id} className="space-y-1">
                {/* Command Prompt */}
                {cmd.command !== 'welcome' && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="text-green-400">nexus@workspace</span>
                    <span className="text-slate-500">:</span>
                    <span className="text-blue-400">{workingDirectory}</span>
                    <span className="text-slate-500">$</span>
                    <span className="flex-1">{cmd.command}</span>
                    {cmd.agent && (
                      <div className="flex items-center gap-1 text-xs text-purple-300">
                        {getAgentIcon(cmd.agent)}
                        <span>{cmd.agent}</span>
                      </div>
                    )}
                    {getStatusIcon(cmd.status)}
                  </div>
                )}

                {/* Command Output */}
                <div className="ml-4 space-y-0.5">
                  {cmd.output.map((line, index) => (
                    <div
                      key={index}
                      className={`${
                        line.includes('✅') ? 'text-green-400' :
                        line.includes('❌') ? 'text-red-400' :
                        line.includes('🔄') ? 'text-blue-400' :
                        line.includes('🤖') ? 'text-purple-400' :
                        line.includes('🚀') ? 'text-yellow-400' :
                        'text-slate-300'
                      }`}
                    >
                      {line}
                    </div>
                  ))}
                </div>

                {/* Command Footer */}
                {cmd.status !== 'running' && cmd.command !== 'welcome' && (
                  <div className="ml-4 text-xs text-slate-500 border-b border-slate-700/50 pb-2">
                    {cmd.duration && `Duration: ${cmd.duration}ms • `}
                    {cmd.timestamp.toLocaleTimeString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Command Input */}
        <div className="border-t border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-slate-300 font-mono text-sm flex-shrink-0">
              <span className="text-green-400">nexus@workspace</span>
              <span className="text-slate-500">:</span>
              <span className="text-blue-400">{workingDirectory}</span>
              <span className="text-slate-500">$</span>
            </div>

            <Input
              ref={inputRef}
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Enter command or @agent-name to specify agent..."
              className="flex-1 bg-slate-800/50 border-slate-600 text-white font-mono"
              disabled={isExecuting}
            />

            <Button
              onClick={() => executeCommand(commandInput)}
              disabled={!commandInput.trim() || isExecuting}
              className="bg-purple-600 hover:bg-purple-700 px-6"
            >
              {isExecuting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Quick Commands */}
          <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
            <span>Quick:</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCommandInput('ls')}
              className="h-6 px-2 text-xs"
            >
              ls
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCommandInput('@claude-code help')}
              className="h-6 px-2 text-xs"
            >
              @claude-code help
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCommandInput('git status')}
              className="h-6 px-2 text-xs"
            >
              git status
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCommandInput('help')}
              className="h-6 px-2 text-xs"
            >
              help
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UnifiedTerminal;

