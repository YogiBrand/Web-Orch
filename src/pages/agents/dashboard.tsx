import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Activity, TrendingUp, Users, Play, Square, Settings } from 'lucide-react';
import { Sidebar } from '@/components/sidebar';
import { useLocation } from 'wouter';

const AgentsDashboardPage = () => {
  const [, setLocation] = useLocation();

  const handleSectionChange = (section: string) => {
    if (section === 'agents-dashboard') {
      return; // already here
    } else if (section === 'agents-marketplace') {
      setLocation('/agents/marketplace');
    } else if (section === 'agents-create') {
      setLocation('/agents/create');
    } else if (section === 'tasks') {
      setLocation('/tasks');
    } else if (section === 'sessions') {
      setLocation('/sessions');
    } else {
      setLocation(`/?section=${section}`);
    }
  };

  const stats = [
    {
      title: 'Total Agents',
      value: '24',
      description: '+2 from last week',
      icon: Bot,
      color: 'text-blue-600'
    },
    {
      title: 'Active Sessions',
      value: '8',
      description: 'Currently running',
      icon: Activity,
      color: 'text-green-600'
    },
    {
      title: 'Tasks Completed',
      value: '1,247',
      description: '+12% from yesterday',
      icon: TrendingUp,
      color: 'text-purple-600'
    },
    {
      title: 'Team Members',
      value: '12',
      description: 'Active contributors',
      icon: Users,
      color: 'text-orange-600'
    }
  ];

  const recentAgents = [
    { id: '1', name: 'Web Scraper Pro', status: 'running', tasks: 45, lastActive: '2 minutes ago' },
    { id: '2', name: 'Data Extractor', status: 'idle', tasks: 23, lastActive: '1 hour ago' },
    { id: '3', name: 'Form Filler Bot', status: 'running', tasks: 67, lastActive: '5 minutes ago' },
    { id: '4', name: 'Content Analyzer', status: 'idle', tasks: 12, lastActive: '3 hours ago' }
  ];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar activeSection="agents-dashboard" onSectionChange={handleSectionChange} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 border-b">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-foreground">Agent Dashboard</h1>
            <p className="text-muted-foreground mt-2">Monitor and manage your AI agents</p>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <Card key={index}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <p className="text-xs text-muted-foreground">{stat.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Recent Agents */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Agents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentAgents.map((agent) => (
                    <div key={agent.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                          <Bot className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <div>
                          <h3 className="font-medium">{agent.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {agent.tasks} tasks • Last active {agent.lastActive}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          agent.status === 'running'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {agent.status}
                        </span>
                        <button className="p-1 hover:bg-gray-100 rounded">
                          <Settings className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Play className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">Create New Agent</h3>
                      <p className="text-sm text-muted-foreground">Build a custom AI agent</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <Bot className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">Browse Marketplace</h3>
                      <p className="text-sm text-muted-foreground">Find pre-built agents</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Activity className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">View Analytics</h3>
                      <p className="text-sm text-muted-foreground">Monitor agent performance</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentsDashboardPage;

