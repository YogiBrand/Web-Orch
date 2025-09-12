import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Page } from "@/components/page";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Play, 
  Bot, 
  Globe, 
  Monitor, 
  Activity, 
  TrendingUp, 
  Users, 
  Zap, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  Database,
  Settings,
  PlayCircle
} from "lucide-react";

export function Overview() {
  const { data: metrics } = useQuery({
    queryKey: ['/api/metrics'],
    refetchInterval: 5000
  });

  const { data: tasks } = useQuery({
    queryKey: ['/api/tasks'],
    refetchInterval: 5000
  });

  const quickStartActions = [
    {
      title: "Start Browser Automation",
      description: "Create and run intelligent browser automation tasks",
      icon: PlayCircle,
      action: "playground",
      accentBg: "bg-blue-100",
      accentText: "text-blue-600",
    },
    {
      title: "Manage Sessions",
      description: "Monitor and control active browser sessions",
      icon: Monitor,
      action: "sessions",
      accentBg: "bg-green-100",
      accentText: "text-green-600",
    },
    {
      title: "Configure Agents",
      description: "Set up automation agents and their behaviors",
      icon: Bot,
      action: "agents",
      accentBg: "bg-purple-100",
      accentText: "text-purple-600",
    },
    {
      title: "Extract Data",
      description: "Configure data extraction rules and pipelines",
      icon: Database,
      action: "data-extraction",
      accentBg: "bg-orange-100",
      accentText: "text-orange-600",
    }
  ];

  const recentActivities = [
    { action: "Task completed", target: "Extract GitHub repos", time: "2 minutes ago", status: "success" },
    { action: "Session started", target: "Browser automation", time: "5 minutes ago", status: "active" },
    { action: "Agent configured", target: "Data scraper", time: "1 hour ago", status: "success" },
    { action: "Crawl finished", target: "Product listings", time: "2 hours ago", status: "success" }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success": return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "active": return <Activity className="w-4 h-4 text-blue-500 animate-pulse" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <Page title="Welcome to WebOrchestrator" subtitle="Your intelligent browser automation platform" actions={
      <Button className="bg-blue-600 hover:bg-blue-700" data-testid="button-start-automation">
        <Play className="w-4 h-4 mr-2" />
        Start Automation
      </Button>
    }>

      {/* Quick Start Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <Zap className="w-5 h-5 mr-2 text-blue-600" />
                  Quick start
                </CardTitle>
                <CardDescription>Get started with browser automation in seconds</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quickStartActions.map((action, index) => (
                <Card
                  key={index}
                  className="cursor-pointer transition-colors rounded-xl hover:shadow-md"
                  data-testid={`quick-action-${action.action}`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg grid place-items-center ${action.accentBg}`}>
                        <action.icon className={`w-5 h-5 ${action.accentText}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="card-title mb-1">{action.title}</h3>
                        <p className="card-description mb-3">{action.description}</p>
                        <Button variant="outline" size="sm">
                          Get started
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Platform Stats */}
        <div className="lg:col-span-2 space-y-4">
          <h2>Platform activity</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Activity className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{(metrics as any)?.activeSessions || 0}</div>
                <div className="text-sm text-gray-600">Active Sessions</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{(tasks as any)?.length || 0}</div>
                <div className="text-sm text-gray-600">Tasks Today</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <Globe className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{(metrics as any)?.pagesScraped || 0}</div>
                <div className="text-sm text-gray-600">Pages Scraped</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{(metrics as any)?.browserMinutes?.toFixed(1) || 0}</div>
                <div className="text-sm text-gray-600">Browser Minutes</div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activities */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(activity.status)}
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {activity.action}
                        </div>
                        <div className="text-xs text-gray-600">{activity.target}</div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">{activity.time}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links & System Status */}
        <div className="space-y-4">
          <h2>System status</h2>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Services</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Browser Grid</span>
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                  Online
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Crawl4AI</span>
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                  Active
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Skyvern</span>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mr-1"></div>
                  Offline
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resource Usage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">API Usage</span>
                  <span className="text-gray-900">324/1000</span>
                </div>
                <Progress value={32} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Browser Sessions</span>
                  <span className="text-gray-900">2/10</span>
                </div>
                <Progress value={20} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Storage</span>
                  <span className="text-gray-900">1.2GB/5GB</span>
                </div>
                <Progress value={24} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Page>
  );
}