/**
 * 🚀 REVOLUTIONARY DEVELOPMENT WORKSPACE
 * The most advanced all-in-one development environment ever created
 * Combines the best of VS Code, Linear, Notion, Figma, and AI assistance
 */

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Page } from '@/components/page';
import {
  // Navigation & Layout
  Layers, Split, PanelLeft, PanelRight, Maximize2, Minimize2,
  // Development Tools  
  Code, Terminal, GitBranch, Database, Server, Settings,
  // Project Management
  Target, CheckSquare, Calendar, Users, MessageSquare, FileText,
  // AI & Automation
  Brain, Bot, Zap, Wand2, Search, Globe,
  // Status & Actions
  Play, Pause, Square, RotateCcw, Save, Upload, Download,
  Activity, Clock, CheckCircle, AlertCircle, XCircle,
  // UI Elements
  Plus, Minus, Edit3, Trash2, Copy, ExternalLink,
  ArrowRight, ArrowLeft, ChevronDown, ChevronRight,
  // Specific Tools
  TestTube, Shield, Rocket, Layers3, Box, Workflow
} from 'lucide-react';

// =============================================
// WORKSPACE TYPES & INTERFACES
// =============================================

interface WorkspaceProject {
  id: string;
  name: string;
  description: string;
  status: 'planning' | 'development' | 'testing' | 'deployed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  progress: number;
  team: string[];
  technologies: string[];
  repository: string;
  deployment: string;
  createdAt: Date;
  updatedAt: Date;
  tasks: WorkspaceTask[];
  files: WorkspaceFile[];
  agents: AssignedAgent[];
}

interface WorkspaceTask {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignee: string;
  estimatedHours: number;
  actualHours: number;
  dueDate: Date;
  tags: string[];
  dependencies: string[];
  comments: TaskComment[];
}

interface WorkspaceFile {
  id: string;
  name: string;
  path: string;
  type: 'code' | 'config' | 'docs' | 'assets';
  language: string;
  size: number;
  lastModified: Date;
  author: string;
  content?: string;
  isOpen: boolean;
  isDirty: boolean;
}

interface AssignedAgent {
  id: string;
  name: string;
  role: string;
  capabilities: string[];
  status: 'active' | 'idle' | 'busy';
  tasksCompleted: number;
  currentTask?: string;
}

interface TaskComment {
  id: string;
  author: string;
  content: string;
  timestamp: Date;
  isAIGenerated: boolean;
}

// =============================================
// MOCK DATA
// =============================================

const MOCK_PROJECTS: WorkspaceProject[] = [
  {
    id: 'project-1',
    name: 'E-commerce Platform',
    description: 'Next-gen e-commerce with AI recommendations',
    status: 'development',
    priority: 'high',
    progress: 65,
    team: ['john@company.com', 'sarah@company.com', 'mike@company.com'],
    technologies: ['React', 'Node.js', 'PostgreSQL', 'Redis', 'TypeScript'],
    repository: 'https://github.com/company/ecommerce-platform',
    deployment: 'https://ecommerce-staging.company.com',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date(),
    tasks: [],
    files: [],
    agents: [
      {
        id: 'claude-code',
        name: 'Claude Code',
        role: 'Full-Stack Developer',
        capabilities: ['React', 'Node.js', 'Database Design'],
        status: 'active',
        tasksCompleted: 23,
        currentTask: 'Implementing payment gateway'
      },
      {
        id: 'database-expert',
        name: 'Database Expert',
        role: 'Database Engineer',
        capabilities: ['PostgreSQL', 'Query Optimization', 'Migration'],
        status: 'idle',
        tasksCompleted: 12
      }
    ]
  },
  {
    id: 'project-2',
    name: 'AI Analytics Dashboard',
    description: 'Real-time analytics with predictive insights',
    status: 'planning',
    priority: 'medium',
    progress: 20,
    team: ['anna@company.com', 'david@company.com'],
    technologies: ['Vue.js', 'Python', 'MongoDB', 'Docker'],
    repository: 'https://github.com/company/analytics-dashboard',
    deployment: '',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date(),
    tasks: [],
    files: [],
    agents: [
      {
        id: 'data-scientist',
        name: 'Data Scientist',
        role: 'ML Engineer',
        capabilities: ['Python', 'TensorFlow', 'Data Analysis'],
        status: 'busy',
        tasksCompleted: 8,
        currentTask: 'Building prediction models'
      }
    ]
  }
];

const MOCK_TASKS: WorkspaceTask[] = [
  {
    id: 'task-1',
    title: 'Implement user authentication system',
    description: 'Create secure JWT-based auth with multi-factor authentication',
    status: 'in-progress',
    priority: 'high',
    assignee: 'Claude Code',
    estimatedHours: 16,
    actualHours: 12,
    dueDate: new Date('2024-03-01'),
    tags: ['backend', 'security', 'auth'],
    dependencies: [],
    comments: [
      {
        id: 'comment-1',
        author: 'Claude Code',
        content: 'I\'ve implemented the basic JWT structure. Working on MFA integration next.',
        timestamp: new Date(),
        isAIGenerated: true
      }
    ]
  },
  {
    id: 'task-2',
    title: 'Design product catalog UI',
    description: 'Create responsive product listing with filters and search',
    status: 'todo',
    priority: 'medium',
    assignee: 'UI Designer',
    estimatedHours: 24,
    actualHours: 0,
    dueDate: new Date('2024-03-05'),
    tags: ['frontend', 'ui', 'design'],
    dependencies: ['task-1'],
    comments: []
  },
  {
    id: 'task-3',
    title: 'Set up CI/CD pipeline',
    description: 'Configure GitHub Actions for automated testing and deployment',
    status: 'done',
    priority: 'high',
    assignee: 'DevOps Agent',
    estimatedHours: 8,
    actualHours: 10,
    dueDate: new Date('2024-02-20'),
    tags: ['devops', 'ci-cd', 'automation'],
    dependencies: [],
    comments: []
  }
];

// =============================================
// MAIN COMPONENT
// =============================================

export default function RevolutionaryWorkspace() {
  const { toast } = useToast();

  // State Management
  const [selectedProject, setSelectedProject] = useState<WorkspaceProject>(MOCK_PROJECTS[0]);
  const [activeView, setActiveView] = useState<'overview' | 'kanban' | 'code' | 'terminal' | 'ai'>('overview');
  const [openFiles, setOpenFiles] = useState<WorkspaceFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [rightPanelWidth, setRightPanelWidth] = useState(350);
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);
  const [tasks, setTasks] = useState<WorkspaceTask[]>(MOCK_TASKS);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // =============================================
  // PROJECT MANAGEMENT
  // =============================================

  const createNewProject = () => {
    // Implementation for creating new project
    toast({
      title: "Creating New Project",
      description: "Project wizard will guide you through the setup.",
    });
  };

  const switchProject = (project: WorkspaceProject) => {
    setSelectedProject(project);
    setOpenFiles([]);
    setActiveFileId(null);
    toast({
      title: `Switched to ${project.name}`,
      description: `Now working on ${project.name}`,
    });
  };

  // =============================================
  // TASK MANAGEMENT
  // =============================================

  const addNewTask = () => {
    if (!newTaskTitle.trim()) return;
    
    const newTask: WorkspaceTask = {
      id: `task-${Date.now()}`,
      title: newTaskTitle,
      description: '',
      status: 'todo',
      priority: 'medium',
      assignee: 'Unassigned',
      estimatedHours: 0,
      actualHours: 0,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      tags: [],
      dependencies: [],
      comments: []
    };
    
    setTasks([...tasks, newTask]);
    setNewTaskTitle('');
    
    toast({
      title: "Task Created",
      description: `Created "${newTask.title}"`,
    });
  };

  const updateTaskStatus = (taskId: string, newStatus: WorkspaceTask['status']) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, status: newStatus } : task
    ));
  };

  // =============================================
  // FILE MANAGEMENT
  // =============================================

  const openFile = (file: WorkspaceFile) => {
    if (!openFiles.find(f => f.id === file.id)) {
      setOpenFiles([...openFiles, { ...file, isOpen: true }]);
    }
    setActiveFileId(file.id);
  };

  const closeFile = (fileId: string) => {
    setOpenFiles(openFiles.filter(f => f.id !== fileId));
    if (activeFileId === fileId) {
      const remaining = openFiles.filter(f => f.id !== fileId);
      setActiveFileId(remaining.length > 0 ? remaining[remaining.length - 1].id : null);
    }
  };

  // =============================================
  // RENDER PROJECT SELECTOR
  // =============================================

  const renderProjectSelector = () => (
    <div className="p-4 border-b bg-gradient-to-r from-indigo-50 to-purple-50">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-gray-900">Development Workspace</h2>
        <Button size="sm" onClick={createNewProject}>
          <Plus className="w-4 h-4 mr-1" />
          New Project
        </Button>
      </div>
      
      <Select value={selectedProject.id} onValueChange={(value) => {
        const project = MOCK_PROJECTS.find(p => p.id === value);
        if (project) switchProject(project);
      }}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MOCK_PROJECTS.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  project.status === 'development' ? 'bg-blue-500' :
                  project.status === 'testing' ? 'bg-yellow-500' :
                  project.status === 'deployed' ? 'bg-green-500' : 'bg-gray-400'
                }`} />
                <span>{project.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  // =============================================
  // RENDER LEFT SIDEBAR
  // =============================================

  const renderLeftSidebar = () => (
    <div className={`bg-gray-50 border-r transition-all duration-200 ${
      isLeftPanelCollapsed ? 'w-12' : 'w-80'
    }`}>
      <div className="p-3 border-b flex items-center justify-between">
        {!isLeftPanelCollapsed && (
          <h3 className="font-semibold text-gray-900">Project Explorer</h3>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
        >
          {isLeftPanelCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelRight className="w-4 h-4" />}
        </Button>
      </div>
      
      {!isLeftPanelCollapsed && (
        <ScrollArea className="h-full">
          <div className="p-3">
            {/* Project Structure */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Files</h4>
              <div className="space-y-1 text-sm">
                {['src/', 'components/', 'pages/', 'utils/', 'config/'].map((folder) => (
                  <div key={folder} className="flex items-center gap-2 p-1 rounded hover:bg-gray-100 cursor-pointer">
                    <ChevronRight className="w-3 h-3" />
                    <span>{folder}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Agents */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">AI Agents</h4>
              <div className="space-y-2">
                {selectedProject.agents.map((agent) => (
                  <div key={agent.id} className="p-2 bg-white rounded border">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${
                        agent.status === 'active' ? 'bg-green-500' :
                        agent.status === 'busy' ? 'bg-yellow-500' : 'bg-gray-400'
                      }`} />
                      <span className="text-sm font-medium">{agent.name}</span>
                    </div>
                    <p className="text-xs text-gray-600">{agent.role}</p>
                    {agent.currentTask && (
                      <p className="text-xs text-blue-600 mt-1">→ {agent.currentTask}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Actions</h4>
              <div className="space-y-1">
                <Button size="sm" variant="ghost" className="w-full justify-start text-xs">
                  <Terminal className="w-3 h-3 mr-2" />
                  Open Terminal
                </Button>
                <Button size="sm" variant="ghost" className="w-full justify-start text-xs">
                  <GitBranch className="w-3 h-3 mr-2" />
                  Git Status
                </Button>
                <Button size="sm" variant="ghost" className="w-full justify-start text-xs">
                  <Rocket className="w-3 h-3 mr-2" />
                  Deploy
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  );

  // =============================================
  // RENDER MAIN WORKSPACE
  // =============================================

  const renderKanbanView = () => (
    <div className="h-full p-6 bg-gray-50">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Task Board</h2>
        <div className="flex items-center gap-2">
          <Input
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Add new task..."
            className="w-64"
            onKeyPress={(e) => e.key === 'Enter' && addNewTask()}
          />
          <Button onClick={addNewTask} disabled={!newTaskTitle.trim()}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-4 h-full">
        {(['todo', 'in-progress', 'review', 'done'] as const).map((status) => (
          <div key={status} className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 capitalize">
                {status.replace('-', ' ')}
              </h3>
              <Badge variant="secondary">
                {tasks.filter(task => task.status === status).length}
              </Badge>
            </div>
            
            <ScrollArea className="h-full">
              <div className="space-y-3">
                {tasks.filter(task => task.status === status).map((task) => (
                  <div key={task.id} className="p-3 bg-gray-50 rounded border hover:shadow-sm transition-shadow cursor-pointer">
                    <h4 className="font-medium text-sm text-gray-900 mb-2">
                      {task.title}
                    </h4>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={
                        task.priority === 'critical' ? 'destructive' :
                        task.priority === 'high' ? 'default' : 'secondary'
                      } className="text-xs">
                        {task.priority}
                      </Badge>
                      <span className="text-xs text-gray-500">{task.assignee}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {task.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        ))}
      </div>
    </div>
  );

  const renderOverview = () => (
    <div className="h-full p-6 space-y-6">
      {/* Project Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Progress</p>
                <p className="text-2xl font-bold text-gray-900">{selectedProject.progress}%</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tasks</p>
                <p className="text-2xl font-bold text-gray-900">{tasks.length}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckSquare className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Team</p>
                <p className="text-2xl font-bold text-gray-900">{selectedProject.team.length}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">AI Agents</p>
                <p className="text-2xl font-bold text-gray-900">{selectedProject.agents.length}</p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                <Bot className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Active Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-4">
                {[
                  { action: 'Task completed', details: 'Set up CI/CD pipeline', agent: 'DevOps Agent', time: '2 hours ago' },
                  { action: 'Code pushed', details: '15 commits to main branch', agent: 'Claude Code', time: '4 hours ago' },
                  { action: 'Issue created', details: 'Performance optimization needed', agent: 'Performance Agent', time: '6 hours ago' },
                  { action: 'Deployment', details: 'Staging environment updated', agent: 'Deploy Agent', time: '1 day ago' }
                ].map((activity, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm text-gray-900">{activity.action}</p>
                      <p className="text-sm text-gray-600">{activity.details}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-blue-600">{activity.agent}</span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-400">{activity.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              AI Agent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {selectedProject.agents.map((agent) => (
                  <div key={agent.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{agent.name}</span>
                      <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                        {agent.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">{agent.role}</p>
                    {agent.currentTask && (
                      <p className="text-xs text-blue-600">→ {agent.currentTask}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs text-gray-500">
                        {agent.tasksCompleted} tasks completed
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderMainContent = () => {
    switch (activeView) {
      case 'kanban':
        return renderKanbanView();
      case 'overview':
        return renderOverview();
      default:
        return renderOverview();
    }
  };

  // =============================================
  // RENDER RIGHT PANEL
  // =============================================

  const renderRightPanel = () => (
    <div className={`bg-gray-50 border-l transition-all duration-200 ${
      isRightPanelCollapsed ? 'w-12' : 'w-80'
    }`}>
      <div className="p-3 border-b flex items-center justify-between">
        {!isRightPanelCollapsed && (
          <h3 className="font-semibold text-gray-900">AI Assistant</h3>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsRightPanelCollapsed(!isRightPanelCollapsed)}
        >
          {isRightPanelCollapsed ? <PanelRight className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
        </Button>
      </div>
      
      {!isRightPanelCollapsed && (
        <ScrollArea className="h-full">
          <div className="p-3">
            {/* AI Suggestions */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Suggestions</h4>
              <div className="space-y-2 text-sm">
                <div className="p-2 bg-blue-50 rounded border-l-4 border-blue-400">
                  <p className="font-medium text-blue-900">Optimize Database Queries</p>
                  <p className="text-blue-700 text-xs">I found 3 queries that can be optimized for better performance.</p>
                </div>
                <div className="p-2 bg-green-50 rounded border-l-4 border-green-400">
                  <p className="font-medium text-green-900">Add Error Handling</p>
                  <p className="text-green-700 text-xs">Consider adding try-catch blocks to API endpoints.</p>
                </div>
              </div>
            </div>

            {/* Task Insights */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Task Insights</h4>
              <div className="space-y-2 text-sm">
                <div className="p-2 bg-yellow-50 rounded">
                  <p className="font-medium text-yellow-900">Behind Schedule</p>
                  <p className="text-yellow-700 text-xs">2 tasks are past their due date</p>
                </div>
                <div className="p-2 bg-purple-50 rounded">
                  <p className="font-medium text-purple-900">High Priority</p>
                  <p className="text-purple-700 text-xs">3 critical tasks need attention</p>
                </div>
              </div>
            </div>

            {/* Quick Commands */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Commands</h4>
              <div className="space-y-1">
                <Button size="sm" variant="ghost" className="w-full justify-start text-xs">
                  <Brain className="w-3 h-3 mr-2" />
                  AI Code Review
                </Button>
                <Button size="sm" variant="ghost" className="w-full justify-start text-xs">
                  <TestTube className="w-3 h-3 mr-2" />
                  Generate Tests
                </Button>
                <Button size="sm" variant="ghost" className="w-full justify-start text-xs">
                  <Rocket className="w-3 h-3 mr-2" />
                  Deploy to Staging
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  );

  // =============================================
  // MAIN RENDER
  // =============================================

  return (
    <Page>
      <div className="h-full flex flex-col bg-white">
        {/* Project Selector */}
        {renderProjectSelector()}
        
        {/* View Tabs */}
        <div className="border-b bg-white">
          <Tabs value={activeView} onValueChange={(value) => setActiveView(value as any)}>
            <div className="flex items-center justify-between px-4 py-2">
              <TabsList>
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="kanban" className="flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Tasks
                </TabsTrigger>
                <TabsTrigger value="code" className="flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  Code
                </TabsTrigger>
                <TabsTrigger value="terminal" className="flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  Terminal
                </TabsTrigger>
                <TabsTrigger value="ai" className="flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  AI Chat
                </TabsTrigger>
              </TabsList>
              
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Save className="w-4 h-4 mr-1" />
                  Save All
                </Button>
                <Button size="sm">
                  <Play className="w-4 h-4 mr-1" />
                  Run
                </Button>
              </div>
            </div>
          </Tabs>
        </div>
        
        {/* Main Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar */}
          {renderLeftSidebar()}
          
          {/* Main Content */}
          <div className="flex-1 overflow-hidden">
            {renderMainContent()}
          </div>
          
          {/* Right Panel */}
          {renderRightPanel()}
        </div>
      </div>
    </Page>
  );
}