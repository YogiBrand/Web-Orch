/**
 * 🚀 NEXUS AI WORKSPACE
 * Complete development environment with AI agents, project management, and tools
 */

import React, { useState, useEffect } from 'react';
import { Page } from '@/components/page';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import LibreChatExact from '@/components/librechat-exact';
import {
  Brain, Code, Terminal, Users, Settings, Play, Zap, Layers, Target,
  MessageSquare, FileText, Database, Shield, TestTube, Rocket, GitBranch,
  Search, Globe, Server, Activity, ArrowRight, Plus, Minimize2, Maximize2,
  CheckCircle, Clock, AlertTriangle, Edit3, Trash2, Copy, ExternalLink,
  Calendar, FolderPlus, BookOpen, TrendingUp, Workflow, Box, Gauge, X, Download
} from 'lucide-react';

// =============================================
// NEXUS WORKSPACE TYPES
// =============================================

interface NexusProject {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'completed' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'critical';
  progress: number;
  createdAt: Date;
  updatedAt: Date;
  technologies: string[];
  repository: string;
  deployment: string;
  team: TeamMember[];
  agents: AssignedAgent[];
  tasks: ProjectTask[];
  metrics: ProjectMetrics;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  status: 'online' | 'away' | 'offline';
}

interface AssignedAgent {
  id: string;
  name: string;
  type: 'development' | 'research' | 'testing' | 'deployment' | 'monitoring';
  status: 'active' | 'idle' | 'busy' | 'error';
  tasksCompleted: number;
  successRate: number;
  currentTask?: string;
  capabilities: string[];
  lastActivity: Date;
}

interface ProjectTask {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignee: string;
  assigneeType: 'human' | 'agent';
  estimatedHours: number;
  actualHours: number;
  dueDate: Date;
  createdAt: Date;
  tags: string[];
  dependencies: string[];
}

interface ProjectMetrics {
  totalTasks: number;
  completedTasks: number;
  averageTaskTime: number;
  teamProductivity: number;
  codeQuality: number;
  deploymentFrequency: number;
  bugRate: number;
}

interface WorkspaceTemplate {
  id: string;
  name: string;
  description: string;
  category: 'web' | 'mobile' | 'ai' | 'data' | 'devops';
  technologies: string[];
  agents: string[];
  estimatedSetupTime: string;
}

// =============================================
// MOCK DATA
// =============================================

const MOCK_PROJECTS: NexusProject[] = [
  {
    id: 'proj-1',
    name: 'E-commerce Platform',
    description: 'Next-generation e-commerce platform with AI-powered recommendations and real-time analytics',
    status: 'active',
    priority: 'high',
    progress: 68,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date(),
    technologies: ['React', 'Node.js', 'PostgreSQL', 'Redis', 'TypeScript', 'Docker'],
    repository: 'https://github.com/company/ecommerce-platform',
    deployment: 'https://ecommerce-staging.company.com',
    team: [
      { id: '1', name: 'Sarah Chen', email: 'sarah@company.com', role: 'Lead Developer', avatar: 'SC', status: 'online' },
      { id: '2', name: 'Mike Rodriguez', email: 'mike@company.com', role: 'Backend Developer', avatar: 'MR', status: 'online' },
      { id: '3', name: 'Emma Wilson', email: 'emma@company.com', role: 'Frontend Developer', avatar: 'EW', status: 'away' },
    ],
    agents: [
      {
        id: 'claude-code',
        name: 'Claude Code IDE',
        type: 'development',
        status: 'active',
        tasksCompleted: 47,
        successRate: 94,
        currentTask: 'Implementing payment gateway integration',
        capabilities: ['Code Generation', 'Debugging', 'Testing', 'Documentation'],
        lastActivity: new Date()
      },
      {
        id: 'database-expert',
        name: 'Database Engineer',
        type: 'development',
        status: 'idle',
        tasksCompleted: 23,
        successRate: 98,
        capabilities: ['Database Design', 'Query Optimization', 'Migration', 'Performance Tuning'],
        lastActivity: new Date(Date.now() - 30 * 60 * 1000)
      },
      {
        id: 'testing-specialist',
        name: 'Testing Specialist',
        type: 'testing',
        status: 'busy',
        tasksCompleted: 31,
        successRate: 96,
        currentTask: 'Running integration test suite',
        capabilities: ['Unit Testing', 'Integration Testing', 'E2E Testing', 'Performance Testing'],
        lastActivity: new Date()
      }
    ],
    tasks: [
      {
        id: 'task-1',
        title: 'Implement user authentication system',
        description: 'Create secure JWT-based authentication with OAuth2 integration',
        status: 'in-progress',
        priority: 'high',
        assignee: 'Claude Code IDE',
        assigneeType: 'agent',
        estimatedHours: 16,
        actualHours: 12,
        dueDate: new Date('2024-03-01'),
        createdAt: new Date('2024-02-15'),
        tags: ['backend', 'security', 'auth'],
        dependencies: []
      },
      {
        id: 'task-2',
        title: 'Design product catalog UI',
        description: 'Create responsive product listing with advanced filtering and search',
        status: 'review',
        priority: 'medium',
        assignee: 'Emma Wilson',
        assigneeType: 'human',
        estimatedHours: 24,
        actualHours: 28,
        dueDate: new Date('2024-03-05'),
        createdAt: new Date('2024-02-10'),
        tags: ['frontend', 'ui', 'design'],
        dependencies: ['task-1']
      }
    ],
    metrics: {
      totalTasks: 15,
      completedTasks: 8,
      averageTaskTime: 18.5,
      teamProductivity: 87,
      codeQuality: 92,
      deploymentFrequency: 12,
      bugRate: 2.3
    }
  },
  {
    id: 'proj-2',
    name: 'AI Analytics Dashboard',
    description: 'Real-time analytics dashboard with predictive insights and automated reporting',
    status: 'active',
    priority: 'medium',
    progress: 34,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date(),
    technologies: ['Vue.js', 'Python', 'FastAPI', 'MongoDB', 'Docker', 'TensorFlow'],
    repository: 'https://github.com/company/analytics-dashboard',
    deployment: 'https://analytics-dev.company.com',
    team: [
      { id: '4', name: 'David Kim', email: 'david@company.com', role: 'Data Scientist', avatar: 'DK', status: 'online' },
      { id: '5', name: 'Anna Martinez', email: 'anna@company.com', role: 'ML Engineer', avatar: 'AM', status: 'online' },
    ],
    agents: [
      {
        id: 'data-scientist',
        name: 'AI Data Scientist',
        type: 'development',
        status: 'busy',
        tasksCompleted: 19,
        successRate: 91,
        currentTask: 'Building predictive models for user behavior',
        capabilities: ['Data Analysis', 'ML Model Development', 'Statistical Analysis', 'Visualization'],
        lastActivity: new Date()
      },
      {
        id: 'python-backend',
        name: 'Python Backend Specialist',
        type: 'development',
        status: 'active',
        tasksCompleted: 14,
        successRate: 95,
        capabilities: ['FastAPI', 'Data Processing', 'API Development', 'Performance Optimization'],
        lastActivity: new Date()
      }
    ],
    tasks: [
      {
        id: 'task-3',
        title: 'Implement real-time data pipeline',
        description: 'Set up streaming data pipeline with Kafka and MongoDB',
        status: 'in-progress',
        priority: 'high',
        assignee: 'Python Backend Specialist',
        assigneeType: 'agent',
        estimatedHours: 32,
        actualHours: 24,
        dueDate: new Date('2024-03-10'),
        createdAt: new Date('2024-02-20'),
        tags: ['backend', 'data', 'streaming'],
        dependencies: []
      }
    ],
    metrics: {
      totalTasks: 12,
      completedTasks: 4,
      averageTaskTime: 22.3,
      teamProductivity: 78,
      codeQuality: 88,
      deploymentFrequency: 8,
      bugRate: 3.1
    }
  }
];

const WORKSPACE_TEMPLATES: WorkspaceTemplate[] = [
  {
    id: 'template-1',
    name: 'Full-Stack Web App',
    description: 'Complete web application with frontend, backend, and database',
    category: 'web',
    technologies: ['React', 'Node.js', 'PostgreSQL', 'Redis', 'Docker'],
    agents: ['Claude Code IDE', 'Database Engineer', 'Testing Specialist'],
    estimatedSetupTime: '30 minutes'
  },
  {
    id: 'template-2',
    name: 'AI/ML Project',
    description: 'Machine learning project with data processing and model deployment',
    category: 'ai',
    technologies: ['Python', 'TensorFlow', 'FastAPI', 'MongoDB', 'Docker'],
    agents: ['AI Data Scientist', 'Python Backend Specialist', 'Testing Specialist'],
    estimatedSetupTime: '45 minutes'
  },
  {
    id: 'template-3',
    name: 'Mobile App Backend',
    description: 'Scalable backend API for mobile applications',
    category: 'mobile',
    technologies: ['Node.js', 'Express', 'MongoDB', 'Firebase', 'Docker'],
    agents: ['Backend Specialist', 'Database Engineer', 'Security Expert'],
    estimatedSetupTime: '25 minutes'
  },
  {
    id: 'template-4',
    name: 'DevOps Pipeline',
    description: 'Complete CI/CD pipeline with monitoring and deployment',
    category: 'devops',
    technologies: ['Docker', 'Kubernetes', 'GitHub Actions', 'Prometheus', 'Grafana'],
    agents: ['DevOps Specialist', 'Security Expert', 'Monitoring Agent'],
    estimatedSetupTime: '60 minutes'
  }
];

// =============================================
// MAIN COMPONENT
// =============================================

export default function NexusWorkspace() {
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<NexusProject>(MOCK_PROJECTS[0]);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  // =============================================
  // PROJECT MANAGEMENT
  // =============================================

  const createProject = () => {
    if (!newProjectName.trim()) {
      toast({
        title: "Error",
        description: "Project name is required",
        variant: "destructive",
      });
      return;
    }

    const template = WORKSPACE_TEMPLATES.find(t => t.id === selectedTemplate);
    
    const newProject: NexusProject = {
      id: `proj-${Date.now()}`,
      name: newProjectName,
      description: newProjectDescription || `New ${template?.name || 'project'} created from Nexus Workspace`,
      status: 'active',
      priority: 'medium',
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      technologies: template?.technologies || [],
      repository: '',
      deployment: '',
      team: [],
      agents: [],
      tasks: [],
      metrics: {
        totalTasks: 0,
        completedTasks: 0,
        averageTaskTime: 0,
        teamProductivity: 0,
        codeQuality: 0,
        deploymentFrequency: 0,
        bugRate: 0
      }
    };

    // Add to projects (in real app, this would be an API call)
    MOCK_PROJECTS.unshift(newProject);
    setSelectedProject(newProject);
    
    // Reset form
    setNewProjectName('');
    setNewProjectDescription('');
    setSelectedTemplate('');
    setIsCreatingProject(false);
    
    toast({
      title: "Project Created",
      description: `${newProject.name} has been created successfully`,
    });
  };

  // =============================================
  // RENDER OVERVIEW TAB
  // =============================================

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Project Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Progress</p>
                <p className="text-3xl font-bold">{selectedProject.progress}%</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <Target className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tasks</p>
                <p className="text-3xl font-bold">{selectedProject.metrics.completedTasks}/{selectedProject.metrics.totalTasks}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Team</p>
                <p className="text-3xl font-bold">{selectedProject.team.length + selectedProject.agents.length}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Quality</p>
                <p className="text-3xl font-bold">{selectedProject.metrics.codeQuality}%</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                <Gauge className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Info & Team */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5" />
              Project Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">{selectedProject.name}</h3>
              <p className="text-muted-foreground">{selectedProject.description}</p>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant={
                selectedProject.status === 'active' ? 'default' :
                selectedProject.status === 'completed' ? 'secondary' : 'outline'
              }>
                {selectedProject.status}
              </Badge>
              <Badge variant={
                selectedProject.priority === 'critical' ? 'destructive' :
                selectedProject.priority === 'high' ? 'default' : 'secondary'
              }>
                {selectedProject.priority} priority
              </Badge>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Technologies</p>
              <div className="flex flex-wrap gap-1">
                {selectedProject.technologies.map((tech) => (
                  <Badge key={tech} variant="outline" className="text-xs">
                    {tech}
                  </Badge>
                ))}
              </div>
            </div>

            {selectedProject.repository && (
              <div>
                <p className="text-sm font-medium mb-1">Repository</p>
                <a 
                  href={selectedProject.repository} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                >
                  {selectedProject.repository.replace('https://github.com/', '')}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Agents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {selectedProject.agents.map((agent) => (
                  <div key={agent.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{agent.name}</span>
                        <Badge variant={
                          agent.status === 'active' ? 'default' :
                          agent.status === 'busy' ? 'secondary' : 'outline'
                        } className="text-xs">
                          {agent.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {agent.tasksCompleted} tasks • {agent.successRate}% success rate
                      </p>
                      {agent.currentTask && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          → {agent.currentTask}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                
                {selectedProject.agents.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bot className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No AI agents assigned</p>
                    <Button size="sm" className="mt-2">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Agent
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { action: 'Task completed', details: 'User authentication system implemented', agent: 'Claude Code IDE', time: '2 hours ago', type: 'success' },
              { action: 'Code review', details: '15 files reviewed with 3 suggestions', agent: 'Code Quality Agent', time: '4 hours ago', type: 'info' },
              { action: 'Deployment', details: 'Staging environment updated successfully', agent: 'DevOps Specialist', time: '6 hours ago', type: 'success' },
              { action: 'Issue detected', details: 'Performance bottleneck in user dashboard', agent: 'Monitoring Agent', time: '8 hours ago', type: 'warning' }
            ].map((activity, index) => (
              <div key={index} className="flex items-start gap-3 pb-3 border-b last:border-0">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  activity.type === 'success' ? 'bg-green-100 dark:bg-green-900' :
                  activity.type === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900' :
                  'bg-blue-100 dark:bg-blue-900'
                }`}>
                  {activity.type === 'success' ? <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" /> :
                   activity.type === 'warning' ? <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" /> :
                   <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{activity.action}</p>
                  <p className="text-sm text-muted-foreground">{activity.details}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-blue-600 dark:text-blue-400">{activity.agent}</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">{activity.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // =============================================
  // RENDER WORKSPACES TAB
  // =============================================

  const renderWorkspaces = () => (
    <div className="space-y-6">
      {/* Project Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Development Workspaces</h2>
          <p className="text-muted-foreground">Manage your AI-powered development projects</p>
        </div>
        <Button onClick={() => setIsCreatingProject(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MOCK_PROJECTS.map((project) => (
          <Card key={project.id} className={`cursor-pointer transition-all hover:shadow-lg ${
            selectedProject.id === project.id ? 'ring-2 ring-blue-500' : ''
          }`} onClick={() => setSelectedProject(project)}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{project.name}</CardTitle>
                <Badge variant={
                  project.status === 'active' ? 'default' :
                  project.status === 'completed' ? 'secondary' : 'outline'
                }>
                  {project.status}
                </Badge>
              </div>
              <CardDescription className="line-clamp-2">
                {project.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{project.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>{project.team.length}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Bot className="h-3 w-3" />
                    <span>{project.agents.length}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckSquare className="h-3 w-3" />
                    <span>{project.metrics.completedTasks}/{project.metrics.totalTasks}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {project.technologies.slice(0, 3).map((tech) => (
                    <Badge key={tech} variant="outline" className="text-xs">
                      {tech}
                    </Badge>
                  ))}
                  {project.technologies.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{project.technologies.length - 3}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Project Modal Content */}
      {isCreatingProject && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Create New Project</CardTitle>
            <CardDescription>Set up a new development workspace with AI agents</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Project Name</label>
                <Input
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="My awesome project"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Template</label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {WORKSPACE_TEMPLATES.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {template.category}
                          </Badge>
                          {template.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                placeholder="Describe your project..."
                rows={3}
              />
            </div>

            {selectedTemplate && (
              <div className="p-4 bg-muted rounded-lg">
                {(() => {
                  const template = WORKSPACE_TEMPLATES.find(t => t.id === selectedTemplate);
                  return template ? (
                    <div>
                      <h4 className="font-medium mb-2">{template.name}</h4>
                      <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                      <div className="space-y-2">
                        <div>
                          <span className="text-xs font-medium">Technologies: </span>
                          <span className="text-xs">{template.technologies.join(', ')}</span>
                        </div>
                        <div>
                          <span className="text-xs font-medium">AI Agents: </span>
                          <span className="text-xs">{template.agents.join(', ')}</span>
                        </div>
                        <div>
                          <span className="text-xs font-medium">Setup Time: </span>
                          <span className="text-xs">{template.estimatedSetupTime}</span>
                        </div>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreatingProject(false)}>
                Cancel
              </Button>
              <Button onClick={createProject}>
                Create Project
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // =============================================
  // DEVELOPMENT STUDIO STATE
  // =============================================

  const [developmentStudioState, setDevelopmentStudioState] = useState({
    activePanel: 'explorer', // explorer, search, git, debug, extensions
    activeEditor: null,
    openFiles: [
      { name: 'App.tsx', path: '/src/App.tsx', content: '', isModified: false, language: 'typescript' },
      { name: 'components/Button.tsx', path: '/src/components/Button.tsx', content: '', isModified: true, language: 'typescript' },
      { name: 'package.json', path: '/package.json', content: '', isModified: false, language: 'json' }
    ],
    terminalVisible: true,
    sidebarVisible: true,
    selectedFile: null,
    currentMode: 'architect', // architect, code, tdd, debug
    teamAgents: [] as AssignedAgent[],
    projectFiles: [] as any[],
    terminalHistory: [
      { command: 'npm install', output: 'Installing dependencies...', status: 'success', timestamp: new Date() },
      { command: 'npm run dev', output: 'Starting development server...', status: 'running', timestamp: new Date() }
    ],
    searchResults: [] as any[],
    breakpoints: [] as any[],
    gitStatus: {
      branch: 'main',
      commits: 42,
      changes: 3,
      additions: 156,
      deletions: 23,
      staged: 2,
      unstaged: 1,
      untracked: 0
    },
    isDevelopmentRunning: false,
    currentTask: null,
    taskProgress: 0,
    showCommandPalette: false,
    commandPaletteQuery: '',
    agentCollaboration: {
      activeConversations: [],
      taskAssignments: [],
      codeReviews: [],
      suggestions: []
    }
  });

  // =============================================
  // AGENT ORCHESTRATION FUNCTIONS
  // =============================================

  const assignAgent = (agentId: string) => {
    const agent = [
      {
        id: 'claude-code',
        name: 'Claude Code IDE',
        type: 'development',
        status: 'active',
        tasksCompleted: 1250,
        successRate: 94,
        currentTask: 'Ready for coding tasks',
        capabilities: ['Code Generation', 'Refactoring', 'Documentation'],
        lastActivity: new Date()
      },
      {
        id: 'python-expert',
        name: 'Python Specialist',
        type: 'development',
        status: 'active',
        tasksCompleted: 892,
        successRate: 95,
        currentTask: 'Ready for Python development',
        capabilities: ['Python', 'Data Science', 'ML', 'FastAPI'],
        lastActivity: new Date()
      },
      {
        id: 'database-engineer',
        name: 'Database Engineer',
        type: 'development',
        status: 'active',
        tasksCompleted: 634,
        successRate: 98,
        currentTask: 'Ready for database tasks',
        capabilities: ['PostgreSQL', 'MongoDB', 'Redis', 'Optimization'],
        lastActivity: new Date()
      },
      {
        id: 'testing-specialist',
        name: 'Testing Specialist',
        type: 'testing',
        status: 'active',
        tasksCompleted: 445,
        successRate: 96,
        currentTask: 'Ready for testing tasks',
        capabilities: ['Unit Tests', 'Integration', 'E2E', 'Performance'],
        lastActivity: new Date()
      },
      {
        id: 'security-expert',
        name: 'Security Expert',
        type: 'security',
        status: 'active',
        tasksCompleted: 312,
        successRate: 98,
        currentTask: 'Ready for security audits',
        capabilities: ['Security Audit', 'Vulnerability Scan', 'Best Practices'],
        lastActivity: new Date()
      },
      {
        id: 'devops-engineer',
        name: 'DevOps Engineer',
        type: 'deployment',
        status: 'active',
        tasksCompleted: 578,
        successRate: 92,
        currentTask: 'Ready for deployment tasks',
        capabilities: ['Docker', 'Kubernetes', 'AWS', 'CI/CD'],
        lastActivity: new Date()
      }
    ].find(a => a.id === agentId);

    if (agent) {
      setDevelopmentStudioState(prev => ({
        ...prev,
        teamAgents: [...prev.teamAgents, agent]
      }));

      // Add to terminal history
      setDevelopmentStudioState(prev => ({
        ...prev,
        terminalHistory: [...prev.terminalHistory, {
          command: `Agent assigned: ${agent.name}`,
          output: `✓ ${agent.name} joined the development team`,
          status: 'success',
          timestamp: new Date()
        }]
      }));

      toast({
        title: "Agent Assigned",
        description: `${agent.name} has been added to your development team`,
      });
    }
  };

  const removeAgent = (agentId: string) => {
    setDevelopmentStudioState(prev => ({
      ...prev,
      teamAgents: prev.teamAgents.filter(a => a.id !== agentId)
    }));

    const agent = developmentStudioState.teamAgents.find(a => a.id === agentId);
    if (agent) {
      setDevelopmentStudioState(prev => ({
        ...prev,
        terminalHistory: [...prev.terminalHistory, {
          command: `Agent removed: ${agent.name}`,
          output: `✓ ${agent.name} left the development team`,
          status: 'info',
          timestamp: new Date()
        }]
      }));

      toast({
        title: "Agent Removed",
        description: `${agent.name} has been removed from your team`,
      });
    }
  };

  const startDevelopment = async () => {
    if (developmentStudioState.teamAgents.length === 0) {
      toast({
        title: "No Agents Selected",
        description: "Please add at least one agent to your development team",
        variant: "destructive",
      });
      return;
    }

    setDevelopmentStudioState(prev => ({
      ...prev,
      isDevelopmentRunning: true,
      currentTask: 'Initializing development environment...',
      taskProgress: 0
    }));

    // Simulate development workflow
    const phases = [
      'Setting up development environment',
      'Analyzing project requirements',
      'Generating project structure',
      'Implementing core features',
      'Running tests',
      'Code review and optimization',
      'Final deployment preparation'
    ];

    for (let i = 0; i < phases.length; i++) {
      setDevelopmentStudioState(prev => ({
        ...prev,
        currentTask: phases[i],
        taskProgress: ((i + 1) / phases.length) * 100
      }));

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Add terminal output
      setDevelopmentStudioState(prev => ({
        ...prev,
        terminalHistory: [...prev.terminalHistory, {
          command: `Phase ${i + 1}: ${phases[i]}`,
          output: `✓ Completed: ${phases[i]}`,
          status: 'success',
          timestamp: new Date()
        }]
      }));
    }

    setDevelopmentStudioState(prev => ({
      ...prev,
      isDevelopmentRunning: false,
      currentTask: null,
      taskProgress: 100
    }));

    toast({
      title: "Development Complete",
      description: "Your project has been successfully developed by the AI team!",
    });
  };

  const executeCommand = (command: string) => {
    setDevelopmentStudioState(prev => ({
      ...prev,
      terminalHistory: [...prev.terminalHistory, {
        command,
        output: `Executing: ${command}`,
        status: 'running',
        timestamp: new Date()
      }]
    }));

    // Simulate command execution
    setTimeout(() => {
      setDevelopmentStudioState(prev => {
        const newHistory = [...prev.terminalHistory];
        const lastCommand = newHistory[newHistory.length - 1];
        lastCommand.output = `✓ ${command} completed successfully`;
        lastCommand.status = 'success';

        return {
          ...prev,
          terminalHistory: newHistory
        };
      });
    }, 1000);
  };

  // =============================================
  // COMMAND PALETTE FUNCTIONS
  // =============================================

  const toggleCommandPalette = () => {
    setDevelopmentStudioState(prev => ({
      ...prev,
      showCommandPalette: !prev.showCommandPalette,
      commandPaletteQuery: ''
    }));
  };

  const getCommandSuggestions = () => {
    const allCommands = [
      { id: 'run-dev', label: 'Run Development Server', command: 'npm run dev', icon: Play, category: 'npm' },
      { id: 'run-build', label: 'Build Project', command: 'npm run build', icon: Zap, category: 'npm' },
      { id: 'run-test', label: 'Run Tests', command: 'npm test', icon: TestTube, category: 'npm' },
      { id: 'install-deps', label: 'Install Dependencies', command: 'npm install', icon: Download, category: 'npm' },
      { id: 'git-status', label: 'Git Status', command: 'git status', icon: GitBranch, category: 'git' },
      { id: 'git-commit', label: 'Git Commit', command: 'git commit -m "updates"', icon: GitBranch, category: 'git' },
      { id: 'git-push', label: 'Git Push', command: 'git push', icon: GitBranch, category: 'git' },
      { id: 'toggle-terminal', label: 'Toggle Terminal', action: () => setDevelopmentStudioState(prev => ({ ...prev, terminalVisible: !prev.terminalVisible })), icon: Terminal, category: 'view' },
      { id: 'toggle-sidebar', label: 'Toggle Sidebar', action: () => setDevelopmentStudioState(prev => ({ ...prev, sidebarVisible: !prev.sidebarVisible })), icon: Settings, category: 'view' },
      { id: 'new-file', label: 'New File', action: () => {
        const newFile = { name: 'new-file.tsx', path: '/src/new-file.tsx', content: '', isModified: false, language: 'typescript' };
        setDevelopmentStudioState(prev => ({ ...prev, openFiles: [...prev.openFiles, newFile] }));
      }, icon: FileText, category: 'file' },
      { id: 'start-dev', label: 'Start AI Development', action: startDevelopment, icon: Brain, category: 'ai' },
      { id: 'clear-terminal', label: 'Clear Terminal', action: () => setDevelopmentStudioState(prev => ({ ...prev, terminalHistory: [] })), icon: Trash2, category: 'terminal' }
    ];

    if (!developmentStudioState.commandPaletteQuery) return allCommands;

    return allCommands.filter(cmd =>
      cmd.label.toLowerCase().includes(developmentStudioState.commandPaletteQuery.toLowerCase()) ||
      cmd.category.toLowerCase().includes(developmentStudioState.commandPaletteQuery.toLowerCase())
    );
  };

  const executeCommandPaletteAction = (command: any) => {
    if (command.command) {
      executeCommand(command.command);
    } else if (command.action) {
      command.action();
    }
    setDevelopmentStudioState(prev => ({ ...prev, showCommandPalette: false }));
  };

  // =============================================
  // KEYBOARD SHORTCUTS
  // =============================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + P for command palette
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        toggleCommandPalette();
      }

      // Ctrl/Cmd + ` for terminal toggle
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault();
        setDevelopmentStudioState(prev => ({ ...prev, terminalVisible: !prev.terminalVisible }));
      }

      // Ctrl/Cmd + B for sidebar toggle
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setDevelopmentStudioState(prev => ({ ...prev, sidebarVisible: !prev.sidebarVisible }));
      }

      // Escape to close command palette
      if (e.key === 'Escape' && developmentStudioState.showCommandPalette) {
        setDevelopmentStudioState(prev => ({ ...prev, showCommandPalette: false }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [developmentStudioState.showCommandPalette]);

  // =============================================
  // VS CODE-LIKE DEVELOPMENT STUDIO
  // =============================================

  const renderDevelopmentStudio = () => (
    <div className="h-[800px] bg-background border rounded-lg overflow-hidden relative">
      {/* VS Code-like Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <span className="text-sm font-medium">Nexus Code IDE</span>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-xs">
            {developmentStudioState.currentMode}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {developmentStudioState.gitStatus.branch}
          </Badge>
          <div className="text-xs text-muted-foreground">
            {developmentStudioState.gitStatus.changes} changes • {developmentStudioState.gitStatus.additions}+ {developmentStudioState.gitStatus.deletions}-
          </div>
        </div>
      </div>

      {/* Command Palette */}
      {developmentStudioState.showCommandPalette && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-start justify-center pt-20">
          <div className="bg-background border rounded-lg shadow-lg w-96 max-w-lg">
            <div className="p-4 border-b">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Type a command or search..."
                  value={developmentStudioState.commandPaletteQuery}
                  onChange={(e) => setDevelopmentStudioState(prev => ({ ...prev, commandPaletteQuery: e.target.value }))}
                  className="border-0 shadow-none focus-visible:ring-0 text-sm"
                  autoFocus
                />
              </div>
            </div>
            <ScrollArea className="max-h-80">
              <div className="p-2">
                {getCommandSuggestions().map((command, index) => (
                  <div
                    key={command.id}
                    className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-muted ${
                      index === 0 ? 'bg-muted' : ''
                    }`}
                    onClick={() => executeCommandPaletteAction(command)}
                  >
                    <command.icon className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{command.label}</div>
                      <div className="text-xs text-muted-foreground">{command.category}</div>
                    </div>
                    {command.command && (
                      <Badge variant="outline" className="text-xs">
                        {command.command}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="p-2 border-t text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>↑↓ to navigate • ↵ to select • ⎋ to close</span>
                <span>Ctrl+Shift+P</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex h-full">
        {/* VS Code-like Sidebar */}
        {developmentStudioState.sidebarVisible && (
          <div className="w-64 bg-muted/30 border-r flex flex-col">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between p-3 border-b">
              <h3 className="text-sm font-medium">Explorer</h3>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                  <Plus className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                  <FolderPlus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* File Tree */}
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {[
                  {
                    name: 'src',
                    type: 'directory',
                    children: [
                      { name: 'components', type: 'directory' },
                      { name: 'pages', type: 'directory' },
                      { name: 'hooks', type: 'directory' },
                      { name: 'lib', type: 'directory' },
                      { name: 'App.tsx', type: 'file' },
                      { name: 'main.tsx', type: 'file' }
                    ]
                  },
                  {
                    name: 'public',
                    type: 'directory',
                    children: [
                      { name: 'index.html', type: 'file' },
                      { name: 'vite.svg', type: 'file' }
                    ]
                  },
                  {
                    name: 'package.json',
                    type: 'file'
                  },
                  {
                    name: 'tsconfig.json',
                    type: 'file'
                  },
                  {
                    name: 'README.md',
                    type: 'file'
                  }
                ].map((item, index) => (
                  <div key={index}>
                    <div className="flex items-center gap-2 px-2 py-1 hover:bg-muted rounded text-sm cursor-pointer">
                      {item.type === 'directory' ? (
                        <ChevronRight className="h-3 w-3" />
                      ) : (
                        <FileText className="h-3 w-3" />
                      )}
                      <span>{item.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Bottom Section - Team Agents */}
            <div className="border-t p-3">
              <h4 className="text-xs font-medium mb-2 text-muted-foreground">TEAM AGENTS</h4>
              <ScrollArea className="h-32">
                <div className="space-y-2">
                  {selectedProject.agents.map((agent) => (
                    <div key={agent.id} className="flex items-center gap-2 p-2 bg-background rounded text-xs">
                      <div className={`w-2 h-2 rounded-full ${
                        agent.status === 'active' ? 'bg-green-500' :
                        agent.status === 'busy' ? 'bg-blue-500' : 'bg-gray-400'
                      }`} />
                      <div className="flex-1">
                        <div className="font-medium">{agent.name}</div>
                        <div className="text-muted-foreground text-xs">
                          {agent.currentTask || 'Available'}
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" className="w-full text-xs">
                    <Plus className="h-3 w-3 mr-1" />
                    Add Agent
                  </Button>
                </div>
              </ScrollArea>
            </div>
          </div>
        )}

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col">
          {/* Editor Tabs */}
          <div className="flex items-center bg-muted/30 border-b">
            <ScrollArea className="flex-1">
              <div className="flex">
                {developmentStudioState.openFiles.map((file, index) => (
                  <div key={file.name} className={`flex items-center gap-2 px-4 py-2 border-r cursor-pointer hover:bg-muted ${
                    index === 0 ? 'bg-background' : ''
                  }`}>
                    <FileText className="h-3 w-3" />
                    <span className="text-sm">{file.name}</span>
                    {file.isModified && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-4 w-4 p-0 ml-1 opacity-50 hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDevelopmentStudioState(prev => ({
                          ...prev,
                          openFiles: prev.openFiles.filter((_, i) => i !== index)
                        }));
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="flex items-center gap-1 p-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() => executeCommand('npm run build')}
              >
                <Play className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() => executeCommand('npm test')}
              >
                <TestTube className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                <Settings className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Editor Content */}
          <div className="flex-1 bg-background p-4">
            <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm h-full overflow-auto">
              <div className="text-muted-foreground">
                <div className="flex">
                  <div className="text-muted-foreground text-xs mr-4 select-none w-8 text-right">
                    {Array.from({length: 25}, (_, i) => (
                      <div key={i+1} className="leading-6">{i+1}</div>
                    ))}
                  </div>
                  <div className="flex-1">
                    <pre className="text-foreground">
{`import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export function App() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch users from API
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">User Management</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {users.map(user => (
          <Card key={user.id} className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                {user.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-medium">{user.name}</h3>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Panel - Terminal */}
          {developmentStudioState.terminalVisible && (
            <div className="h-64 border-t bg-black text-green-400 font-mono text-sm">
              <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4" />
                  <span className="text-xs">Terminal</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-green-400">
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-green-400">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="p-4 h-full overflow-auto">
                <div className="space-y-1">
                  {developmentStudioState.terminalHistory.map((entry, index) => (
                    <div key={index} className="space-y-1">
                      <div>
                        <span className="text-green-400">$ </span>
                        <span className="text-white">{entry.command}</span>
                      </div>
                      <div className={`text-sm ${
                        entry.status === 'success' ? 'text-green-300' :
                        entry.status === 'error' ? 'text-red-300' :
                        entry.status === 'running' ? 'text-yellow-300' : 'text-gray-300'
                      }`}>
                        {entry.output}
                      </div>
                    </div>
                  ))}
                  {!developmentStudioState.isDevelopmentRunning && (
                    <div>
                      <span className="text-green-400">$ </span>
                      <span className="animate-pulse">_</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Agent Selection */}
        <div className="w-80 bg-muted/30 border-l">
          {/* Agent Selection Header */}
          <div className="p-4 border-b">
            <h3 className="font-medium mb-2">AI Development Team</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Build your perfect development team with specialized AI agents
            </p>
            <Select value={developmentStudioState.currentMode} onValueChange={(value) =>
              setDevelopmentStudioState(prev => ({ ...prev, currentMode: value }))
            }>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="architect">🏗️ Architect</SelectItem>
                <SelectItem value="code">💻 Code</SelectItem>
                <SelectItem value="tdd">🧪 TDD</SelectItem>
                <SelectItem value="debug">🔧 Debug</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Available Agents */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {[
                {
                  id: 'claude-code',
                  name: 'Claude Code IDE',
                  type: 'development',
                  description: 'AI-powered code generation and editing',
                  capabilities: ['Code Generation', 'Refactoring', 'Documentation'],
                  status: 'available',
                  rating: 4.9,
                  tasksCompleted: 1250
                },
                {
                  id: 'python-expert',
                  name: 'Python Specialist',
                  type: 'development',
                  description: 'Python development and data science',
                  capabilities: ['Python', 'Data Science', 'ML', 'FastAPI'],
                  status: 'available',
                  rating: 4.8,
                  tasksCompleted: 892
                },
                {
                  id: 'frontend-architect',
                  name: 'Frontend Architect',
                  type: 'development',
                  description: 'React, Vue, and modern frontend development',
                  capabilities: ['React', 'TypeScript', 'UI/UX', 'Performance'],
                  status: 'busy',
                  rating: 4.7,
                  tasksCompleted: 756
                },
                {
                  id: 'database-engineer',
                  name: 'Database Engineer',
                  type: 'development',
                  description: 'Database design, optimization, and migration',
                  capabilities: ['PostgreSQL', 'MongoDB', 'Redis', 'Optimization'],
                  status: 'available',
                  rating: 4.9,
                  tasksCompleted: 634
                },
                {
                  id: 'testing-specialist',
                  name: 'Testing Specialist',
                  type: 'testing',
                  description: 'Comprehensive testing and quality assurance',
                  capabilities: ['Unit Tests', 'Integration', 'E2E', 'Performance'],
                  status: 'available',
                  rating: 4.6,
                  tasksCompleted: 445
                },
                {
                  id: 'security-expert',
                  name: 'Security Expert',
                  type: 'security',
                  description: 'Security audits, vulnerability assessment, and best practices',
                  capabilities: ['Security Audit', 'Vulnerability Scan', 'Best Practices'],
                  status: 'available',
                  rating: 4.8,
                  tasksCompleted: 312
                },
                {
                  id: 'devops-engineer',
                  name: 'DevOps Engineer',
                  type: 'deployment',
                  description: 'CI/CD, containerization, and cloud deployment',
                  capabilities: ['Docker', 'Kubernetes', 'AWS', 'CI/CD'],
                  status: 'available',
                  rating: 4.7,
                  tasksCompleted: 578
                },
                {
                  id: 'documentation-writer',
                  name: 'Documentation Specialist',
                  type: 'development',
                  description: 'Technical writing and API documentation',
                  capabilities: ['API Docs', 'README', 'Technical Writing'],
                  status: 'available',
                  rating: 4.5,
                  tasksCompleted: 234
                }
              ].map((agent) => (
                <Card key={agent.id} className="p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm">{agent.name}</h4>
                        <Badge variant={
                          agent.status === 'available' ? 'default' :
                          agent.status === 'busy' ? 'secondary' : 'outline'
                        } className="text-xs">
                          {agent.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{agent.description}</p>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {agent.capabilities.slice(0, 2).map((cap) => (
                          <Badge key={cap} variant="outline" className="text-xs px-1 py-0">
                            {cap}
                          </Badge>
                        ))}
                        {agent.capabilities.length > 2 && (
                          <Badge variant="outline" className="text-xs px-1 py-0">
                            +{agent.capabilities.length - 2}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>⭐ {agent.rating}</span>
                        <span>•</span>
                        <span>{agent.tasksCompleted} tasks</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      onClick={() => assignAgent(agent.id)}
                    >
                      Add
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>

          {/* Team Management */}
          <div className="p-4 border-t">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-sm">Current Team</h4>
              <Badge variant="secondary" className="text-xs">
                {developmentStudioState.teamAgents.length} agents
              </Badge>
            </div>
            <ScrollArea className="h-24">
              <div className="space-y-2">
                {developmentStudioState.teamAgents.map((agent) => (
                  <div key={agent.id} className="flex items-center justify-between p-2 bg-background rounded text-xs">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        agent.status === 'active' ? 'bg-green-500' :
                        agent.status === 'busy' ? 'bg-blue-500' : 'bg-gray-400'
                      }`} />
                      <span className="font-medium">{agent.name}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => removeAgent(agent.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Development Progress */}
            {developmentStudioState.isDevelopmentRunning && (
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Development in Progress</span>
                  <span className="text-xs text-muted-foreground">{Math.round(developmentStudioState.taskProgress)}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${developmentStudioState.taskProgress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{developmentStudioState.currentTask}</p>
              </div>
            )}

            <Button
              className="w-full mt-3"
              size="sm"
              onClick={startDevelopment}
              disabled={developmentStudioState.isDevelopmentRunning}
            >
              <Zap className="h-3 w-3 mr-1" />
              {developmentStudioState.isDevelopmentRunning ? 'Developing...' : 'Start Development'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  // =============================================
  // RENDER CONTAINERS TAB
  // =============================================

  const renderContainers = () => (
    <div className="space-y-6">
      {/* Container Management */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Container Management</h2>
          <p className="text-muted-foreground">Manage Docker containers for development environments</p>
        </div>
        <div className="flex items-center gap-2">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Container
          </Button>
          <Button variant="outline">
            <Box className="h-4 w-4 mr-2" />
            Docker Hub
          </Button>
        </div>
      </div>

      {/* Active Containers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Box className="h-5 w-5" />
              Active Containers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                {
                  name: 'claude-code-ide',
                  image: 'anthropic/claude-code:latest',
                  status: 'running',
                  ports: '3000:3000',
                  memory: '256MB',
                  cpu: '15%'
                },
                {
                  name: 'python-sandbox',
                  image: 'python:3.11-slim',
                  status: 'running',
                  ports: '8001:8000',
                  memory: '128MB',
                  cpu: '8%'
                },
                {
                  name: 'postgres-dev',
                  image: 'postgres:15-alpine',
                  status: 'running',
                  ports: '5432:5432',
                  memory: '512MB',
                  cpu: '22%'
                }
              ].map((container) => (
                <div key={container.name} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{container.name}</span>
                      <Badge variant={container.status === 'running' ? 'default' : 'outline'}>
                        {container.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {container.image} • {container.ports}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{container.memory}</p>
                    <p className="text-xs text-muted-foreground">{container.cpu} CPU</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Container Templates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                {
                  name: 'Claude Code IDE',
                  description: 'AI-powered code editor and development environment',
                  image: 'anthropic/claude-code',
                  tags: ['AI', 'Development', 'IDE']
                },
                {
                  name: 'Python Sandbox',
                  description: 'Secure Python execution environment',
                  image: 'python-sandbox',
                  tags: ['Python', 'Sandbox', 'Security']
                },
                {
                  name: 'Node.js Development',
                  description: 'Full-stack Node.js development environment',
                  image: 'node-dev',
                  tags: ['Node.js', 'Development', 'Full-stack']
                },
                {
                  name: 'Database Lab',
                  description: 'Multi-database development environment',
                  image: 'db-lab',
                  tags: ['Database', 'PostgreSQL', 'Redis']
                }
              ].map((template) => (
                <div key={template.name} className="p-3 border rounded-lg hover:bg-muted transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium">{template.name}</h4>
                    <Button size="sm" variant="outline">
                      <Play className="h-3 w-3 mr-1" />
                      Launch
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{template.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {template.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Docker Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Docker Integration
          </CardTitle>
          <CardDescription>
            Direct integration with Docker for container management and development workflows
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <Box className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                <h4 className="font-medium mb-1">Containers</h4>
                <p className="text-2xl font-bold">8</p>
                <p className="text-xs text-muted-foreground">Running</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <Database className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <h4 className="font-medium mb-1">Images</h4>
                <p className="text-2xl font-bold">24</p>
                <p className="text-xs text-muted-foreground">Available</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <Zap className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                <h4 className="font-medium mb-1">Networks</h4>
                <p className="text-2xl font-bold">3</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-2">
                <Button size="sm">
                  <Terminal className="h-4 w-4 mr-1" />
                  Docker CLI
                </Button>
                <Button size="sm" variant="outline">
                  <Settings className="h-4 w-4 mr-1" />
                  Docker Settings
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">
                Docker Engine • Container Runtime • Development Tools
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // =============================================
  // MAIN RENDER
  // =============================================

  return (
    <Page>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Nexus AI Workspace</h1>
            <p className="text-muted-foreground">
              AI-powered development environment with specialized agents
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedProject.id} onValueChange={(value) => {
              const project = MOCK_PROJECTS.find(p => p.id === value);
              if (project) setSelectedProject(project);
            }}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MOCK_PROJECTS.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        project.status === 'active' ? 'bg-green-500' :
                        project.status === 'completed' ? 'bg-blue-500' : 'bg-gray-400'
                      }`} />
                      {project.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="workspaces" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Workspaces
            </TabsTrigger>
            <TabsTrigger value="librechat" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              LibreChat Hub
            </TabsTrigger>
            <TabsTrigger value="development" className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              Development Studio
            </TabsTrigger>
            <TabsTrigger value="containers" className="flex items-center gap-2">
              <Box className="h-4 w-4" />
              Containers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {renderOverview()}
          </TabsContent>

          <TabsContent value="workspaces" className="space-y-6">
            {renderWorkspaces()}
          </TabsContent>

          <TabsContent value="librechat" className="space-y-6">
            <Card className="h-[600px]">
              <LibreChatExact />
            </Card>
          </TabsContent>

          <TabsContent value="development" className="space-y-6">
            {renderDevelopmentStudio()}
          </TabsContent>

          <TabsContent value="containers" className="space-y-6">
            {renderContainers()}
          </TabsContent>
        </Tabs>
      </div>
    </Page>
  );
}