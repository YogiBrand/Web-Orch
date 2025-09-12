import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { 
  PlayIcon, 
  StopCircle, 
  RefreshCw, 
  Share2, 
  Copy,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Terminal,
  Database,
  Eye,
  List
} from 'lucide-react';
import { cn } from '../lib/utils';
import { SimpleVNCViewer } from './simple-vnc-viewer';
import { TaskStepsView } from './task-steps-view';
import { TaskStreamPreview } from './task-stream-preview';
import { toast } from '@/hooks/use-toast';

interface Task {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  url: string;
  navigationGoal: string;
  dataExtractionGoal?: string;
  createdAt: Date;
  updatedAt: Date;
  agentId?: string;
  sessionId?: string;
  extractedData?: any;
  error?: string;
  recordingUrl?: string;
  screenshotUrl?: string;
}

interface Action {
  id: string;
  timestamp: Date;
  type: string;
  description: string;
  status: 'completed' | 'failed' | 'pending';
  reasoning?: string;
  element?: string;
  value?: string;
}

interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'action';
  message: string;
  metadata?: any;
}

interface EnhancedTaskViewProps {
  taskId: string;
  onClose?: () => void;
}

export function EnhancedTaskView({ taskId, onClose }: EnhancedTaskViewProps) {
  const queryClient = useQueryClient();
  const [activeTopTab, setActiveTopTab] = useState<'actions' | 'steps' | 'recording' | 'parameters' | 'diagnostics'>('actions');
  const [activeBottomTab, setActiveBottomTab] = useState<'logs' | 'extraction'>('logs');
  const [isControlling, setIsControlling] = useState(false);
  
  // Fetch task data
  const { data: task, isLoading: taskLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${taskId}`);
      if (!response.ok) throw new Error('Failed to fetch task');
      return response.json();
    },
    refetchInterval: (data) => {
      if (data?.status === 'running' || data?.status === 'queued') {
        return 2000; // Poll every 2 seconds for active tasks
      }
      return false;
    }
  });

  // Fetch actions
  const { data: actions = [] } = useQuery({
    queryKey: ['task', taskId, 'actions'],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${taskId}/actions`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!task,
    refetchInterval: task?.status === 'running' ? 2000 : false
  });

  // Fetch logs
  const { data: logs = [] } = useQuery({
    queryKey: ['task', taskId, 'logs'],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${taskId}/logs`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!task,
    refetchInterval: task?.status === 'running' ? 1000 : false
  });

  // Cancel task mutation
  const cancelTask = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/tasks/${taskId}/cancel`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to cancel task');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      toast({
        title: 'Task cancelled',
        description: 'The task has been cancelled successfully.'
      });
    },
    onError: () => {
      toast({
        title: 'Failed to cancel task',
        description: 'An error occurred while cancelling the task.',
        variant: 'destructive'
      });
    }
  });

  // Rerun task mutation
  const rerunTask = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/tasks/${taskId}/rerun`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to rerun task');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({
        title: 'Task rerun initiated',
        description: `New task created with ID: ${data.id}`
      });
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'queued':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      completed: 'default',
      failed: 'destructive',
      running: 'secondary',
      queued: 'outline'
    };
    
    return (
      <Badge variant={variants[status] || 'outline'} className="flex items-center gap-1">
        {getStatusIcon(status)}
        <span className="capitalize">{status}</span>
      </Badge>
    );
  };

  if (taskLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Task not found</p>
      </div>
    );
  }

  const isActive = task.status === 'running' || task.status === 'queued';

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between px-4 pt-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              {isActive && (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="font-medium text-gray-700">Live Browser</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Task ID: {task.id}</span>
              <span>•</span>
              {getStatusBadge(task.status)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              toast({ title: 'Link copied to clipboard' });
            }}>
              <Share2 className="h-3 w-3 mr-1" />
              Share
            </Button>
            
            {isActive ? (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => cancelTask.mutate()}
                disabled={cancelTask.isPending}
              >
                <StopCircle className="h-3 w-3 mr-1" />
                Stop
              </Button>
            ) : (
              task.status === 'completed' || task.status === 'failed' ? (
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => rerunTask.mutate()}
                  disabled={rerunTask.isPending}
                >
                  <PlayIcon className="h-3 w-3 mr-1" />
                  Rerun
                </Button>
              ) : null
            )}
            
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </div>
        
        {/* Navigation tabs */}
        <div className="flex px-4 mt-3">
          <button
            onClick={() => setActiveTopTab('actions')}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeTopTab === 'actions'
                ? "text-blue-600 border-blue-600"
                : "text-gray-600 border-transparent hover:text-gray-800"
            )}
          >
            Actions
          </button>
          <button
            onClick={() => setActiveTopTab('steps')}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-1",
              activeTopTab === 'steps'
                ? "text-blue-600 border-blue-600"
                : "text-gray-600 border-transparent hover:text-gray-800"
            )}
          >
            <List className="h-3 w-3" />
            Task Steps
          </button>
          <button
            onClick={() => setActiveTopTab('recording')}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeTopTab === 'recording'
                ? "text-blue-600 border-blue-600"
                : "text-gray-600 border-transparent hover:text-gray-800"
            )}
          >
            Recording
          </button>
          <button
            onClick={() => setActiveTopTab('parameters')}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeTopTab === 'parameters'
                ? "text-blue-600 border-blue-600"
                : "text-gray-600 border-transparent hover:text-gray-800"
            )}
          >
            Parameters
          </button>
          <button
            onClick={() => setActiveTopTab('diagnostics')}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeTopTab === 'diagnostics'
                ? "text-blue-600 border-blue-600"
                : "text-gray-600 border-transparent hover:text-gray-800"
            )}
          >
            Diagnostics
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {activeTopTab === 'actions' && (
          <>
            {/* Left Column - Task Progress Cards */}
            <div className="w-2/5 border-r border-gray-200 overflow-y-auto">
              <div className="p-4 space-y-4">
                {/* Task Info Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Task Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">URL</p>
                      <p className="text-sm font-medium truncate">{task.url}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Navigation Goal</p>
                      <p className="text-sm">{task.navigationGoal}</p>
                    </div>
                    {task.dataExtractionGoal && (
                      <div>
                        <p className="text-sm text-muted-foreground">Data Extraction Goal</p>
                        <p className="text-sm">{task.dataExtractionGoal}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Actions Progress Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>Actions Progress</span>
                      <Badge variant="outline">{actions.length} actions</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-2">
                        {actions.map((action: Action) => (
                          <div key={action.id} className="flex items-start gap-2 p-2 rounded hover:bg-gray-50">
                            {getStatusIcon(action.status)}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{action.type}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {action.description}
                              </p>
                              {action.reasoning && (
                                <p className="text-xs text-gray-500 mt-1">{action.reasoning}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Right Column - Browser Preview and Logs */}
            <div className="w-3/5 flex flex-col bg-gray-50">
              {/* Browser Preview */}
              <div className="flex-[2] min-h-0 p-2">
                <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                  {isActive ? (
                    <TaskStreamPreview
                      taskId={task.id}
                      provider={
                        task.agentId === 'skyvern' || task.agentId?.includes('skyvern') ? 'skyvern' :
                        task.agentId?.includes('browser-use') ? 'browser-use' :
                        'local'
                      }
                      className="h-full"
                    />
                  ) : task.recordingUrl ? (
                    <video
                      src={task.recordingUrl}
                      controls
                      className="h-full w-full object-contain bg-black"
                      autoPlay
                      muted
                      loop
                    />
                  ) : task.screenshotUrl ? (
                    <img
                      src={task.screenshotUrl}
                      alt="Task screenshot"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <Eye className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                        <p>No preview available</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Tabs - Logs and Extracted Data */}
              <div className="flex-1 flex flex-col bg-white border-t border-gray-200 max-h-96">
                <div className="flex-shrink-0 flex border-b border-gray-200 bg-gray-50">
                  <button
                    onClick={() => setActiveBottomTab('logs')}
                    className={cn(
                      "px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2",
                      activeBottomTab === 'logs'
                        ? "text-blue-600 border-b-2 border-blue-600 bg-white"
                        : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                    )}
                  >
                    <Terminal className="h-4 w-4" />
                    Browser Logs
                  </button>
                  <button
                    onClick={() => setActiveBottomTab('extraction')}
                    className={cn(
                      "px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2",
                      activeBottomTab === 'extraction'
                        ? "text-blue-600 border-b-2 border-blue-600 bg-white"
                        : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                    )}
                  >
                    <Database className="h-4 w-4" />
                    Extracted Data
                  </button>
                </div>

                <div className="flex-1 p-2 overflow-hidden">
                  {activeBottomTab === 'logs' ? (
                    <ScrollArea className="h-full">
                      <div className="space-y-1 font-mono text-xs">
                        {logs.map((log: LogEntry) => (
                          <div
                            key={log.id}
                            className={cn(
                              "px-2 py-1 rounded",
                              log.level === 'error' && "bg-red-50 text-red-900",
                              log.level === 'warning' && "bg-yellow-50 text-yellow-900",
                              log.level === 'action' && "bg-blue-50 text-blue-900",
                              log.level === 'info' && "bg-gray-50 text-gray-900"
                            )}
                          >
                            <span className="opacity-50">
                              [{new Date(log.timestamp).toLocaleTimeString()}]
                            </span>
                            <span className="ml-2">{log.message}</span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <ScrollArea className="h-full">
                      {task.extractedData ? (
                        <pre className="text-xs p-2">
                          {JSON.stringify(task.extractedData, null, 2)}
                        </pre>
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          <p className="text-sm">No data extracted yet</p>
                        </div>
                      )}
                    </ScrollArea>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTopTab === 'steps' && (
          <div className="flex-1">
            <TaskStepsView taskId={taskId} className="h-full" />
          </div>
        )}

        {activeTopTab === 'recording' && (
          <div className="flex-1 bg-gray-50 p-2">
            <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              {task.recordingUrl ? (
                <video
                  src={task.recordingUrl}
                  controls
                  className="h-full w-full object-contain bg-black"
                />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <p>Recording not available</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTopTab === 'parameters' && (
          <div className="flex-1 p-4">
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle>Task Parameters</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-sm bg-gray-50 p-4 rounded">
                  {JSON.stringify({
                    url: task.url,
                    navigationGoal: task.navigationGoal,
                    dataExtractionGoal: task.dataExtractionGoal,
                    agentId: task.agentId,
                    sessionId: task.sessionId,
                    createdAt: task.createdAt,
                    updatedAt: task.updatedAt
                  }, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTopTab === 'diagnostics' && (
          <div className="flex-1 p-4">
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle>Task Diagnostics</CardTitle>
              </CardHeader>
              <CardContent>
                {task.error ? (
                  <div className="space-y-2">
                    <div className="bg-red-50 border border-red-200 rounded p-3">
                      <p className="text-sm font-medium text-red-900">Error</p>
                      <p className="text-sm text-red-700 mt-1">{task.error}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No diagnostic information available</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}