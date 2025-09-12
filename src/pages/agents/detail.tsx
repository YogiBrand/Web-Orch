import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, Play, Square, Settings, Activity, BarChart3, FileText, AlertTriangle } from 'lucide-react';
import { Sidebar } from '@/components/sidebar';
import { useLocation } from 'wouter';

const AgentDetailPage = () => {
  const [, setLocation] = useLocation();

  const handleSectionChange = (section: string) => {
    if (section.startsWith('agents-')) {
      if (section === 'agents-dashboard') {
        setLocation('/agents/dashboard');
      } else if (section === 'agents-marketplace') {
        setLocation('/agents/marketplace');
      } else if (section === 'agents-create') {
        setLocation('/agents/create');
      }
    } else if (section === 'tasks') {
      setLocation('/tasks');
    } else if (section === 'sessions') {
      setLocation('/sessions');
    } else {
      setLocation(`/?section=${section}`);
    }
  };

  // Mock agent data - in real app this would come from API based on route param
  const agent = {
    id: '1',
    name: 'Web Scraper Pro',
    description: 'Advanced web scraping agent with intelligent data extraction capabilities. This agent can navigate complex websites, handle JavaScript rendering, and extract structured data with high accuracy.',
    category: 'Data Processing',
    status: 'running',
    version: '2.1.0',
    author: 'WebOrchestrator Team',
    createdAt: '2024-01-15',
    lastActive: '2 minutes ago',
    tags: ['scraping', 'data', 'automation', 'web'],
    capabilities: ['Web Navigation', 'Data Extraction', 'JavaScript Handling', 'Anti-Detection'],
    stats: {
      totalTasks: 1247,
      successRate: 94.2,
      averageResponseTime: 245,
      uptime: '99.8%'
    },
    configuration: {
      maxConcurrentTasks: 5,
      timeout: 300,
      retryAttempts: 3,
      memoryLimit: 512
    }
  };

  const recentTasks = [
    { id: '1', name: 'Scrape product catalog', status: 'completed', duration: '45s', result: 'success' },
    { id: '2', name: 'Extract contact information', status: 'running', duration: '12s', result: 'pending' },
    { id: '3', name: 'Process user reviews', status: 'completed', duration: '89s', result: 'success' },
    { id: '4', name: 'Validate data quality', status: 'failed', duration: '23s', result: 'error' }
  ];

  const logs = [
    { timestamp: '2024-01-20 14:32:15', level: 'info', message: 'Task started: Scrape product catalog' },
    { timestamp: '2024-01-20 14:32:18', level: 'info', message: 'Navigation to https://example.com/products' },
    { timestamp: '2024-01-20 14:32:25', level: 'info', message: 'Extracted 150 product records' },
    { timestamp: '2024-01-20 14:33:00', level: 'info', message: 'Task completed successfully' },
    { timestamp: '2024-01-20 14:35:12', level: 'warn', message: 'Rate limit detected, slowing down' }
  ];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar activeSection="agents-dashboard" onSectionChange={handleSectionChange} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 border-b">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center">
                  <Bot className="w-8 h-8 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-foreground">{agent.name}</h1>
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge variant={agent.status === 'running' ? 'default' : 'secondary'}>
                      {agent.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">v{agent.version}</span>
                    <span className="text-sm text-muted-foreground">•</span>
                    <span className="text-sm text-muted-foreground">by {agent.author}</span>
                  </div>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline">
                  <Settings className="w-4 h-4 mr-2" />
                  Configure
                </Button>
                <Button variant={agent.status === 'running' ? 'destructive' : 'default'}>
                  {agent.status === 'running' ? (
                    <>
                      <Square className="w-4 h-4 mr-2" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Start
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <BarChart3 className="w-8 h-8 text-blue-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-muted-foreground">Total Tasks</p>
                      <p className="text-2xl font-bold">{agent.stats.totalTasks.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Activity className="w-8 h-8 text-green-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                      <p className="text-2xl font-bold">{agent.stats.successRate}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <FileText className="w-8 h-8 text-purple-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-muted-foreground">Avg Response</p>
                      <p className="text-2xl font-bold">{agent.stats.averageResponseTime}ms</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <AlertTriangle className="w-8 h-8 text-orange-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-muted-foreground">Uptime</p>
                      <p className="text-2xl font-bold">{agent.stats.uptime}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="tasks">Recent Tasks</TabsTrigger>
                <TabsTrigger value="logs">Logs</TabsTrigger>
                <TabsTrigger value="config">Configuration</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{agent.description}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Capabilities</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {agent.capabilities.map((capability) => (
                          <Badge key={capability} variant="outline">
                            {capability}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="tasks">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Tasks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {recentTasks.map((task) => (
                        <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className={`w-3 h-3 rounded-full ${
                              task.status === 'completed' ? 'bg-green-500' :
                              task.status === 'running' ? 'bg-blue-500' :
                              task.status === 'failed' ? 'bg-red-500' : 'bg-gray-500'
                            }`} />
                            <div>
                              <h4 className="font-medium">{task.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                Duration: {task.duration} • Result: {task.result}
                              </p>
                            </div>
                          </div>
                          <Badge variant={
                            task.status === 'completed' ? 'default' :
                            task.status === 'running' ? 'secondary' :
                            'destructive'
                          }>
                            {task.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="logs">
                <Card>
                  <CardHeader>
                    <CardTitle>Activity Logs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {logs.map((log, index) => (
                        <div key={index} className="flex items-start space-x-4 p-2 rounded text-sm">
                          <span className="text-muted-foreground text-xs w-32">{log.timestamp}</span>
                          <Badge variant={
                            log.level === 'error' ? 'destructive' :
                            log.level === 'warn' ? 'secondary' : 'outline'
                          } className="w-12 justify-center">
                            {log.level}
                          </Badge>
                          <span className="flex-1">{log.message}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="config">
                <Card>
                  <CardHeader>
                    <CardTitle>Configuration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium mb-2">Performance Settings</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Max Concurrent Tasks:</span>
                            <span>{agent.configuration.maxConcurrentTasks}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Timeout:</span>
                            <span>{agent.configuration.timeout}s</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Retry Attempts:</span>
                            <span>{agent.configuration.retryAttempts}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Memory Limit:</span>
                            <span>{agent.configuration.memoryLimit}MB</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Tags</h4>
                        <div className="flex flex-wrap gap-2">
                          {agent.tags.map((tag) => (
                            <Badge key={tag} variant="outline">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentDetailPage;

