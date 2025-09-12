import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  useStreamingWebSocket, 
  useAgentWebSocket, 
  useTaskWebSocket,
  useSessionWebSocket,
  useLogWebSocket 
} from '../hooks/use-websocket-enhanced';

interface StreamingMessage {
  id: string;
  type: string;
  source: string;
  agentId?: string;
  taskId?: string;
  sessionId?: string;
  data: any;
  timestamp: string;
  priority: string;
}

interface AgentStatus {
  agentId: string;
  status: string;
  connectionInfo?: {
    responseTime: number;
    lastHealthCheck: string;
    uptime: number;
  };
  metrics: {
    activeTasks: number;
    queuedTasks: number;
    completedTasks: number;
    errorRate: number;
    averageResponseTime: number;
  };
}

interface TaskProgress {
  taskId: string;
  agentId: string;
  current: number;
  total: number;
  percentage: number;
  step: string;
  screenshot?: string;
  timing: {
    started: string;
    elapsed: number;
  };
}

export function StreamingDashboard() {
  const [messages, setMessages] = useState<StreamingMessage[]>([]);
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>({});
  const [taskProgress, setTaskProgress] = useState<Record<string, TaskProgress>>({});
  const [screenshots, setScreenshots] = useState<Record<string, string>>({});
  const [logs, setLogs] = useState<StreamingMessage[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [selectedTask, setSelectedTask] = useState<string>('');
  const [selectedSession, setSelectedSession] = useState<string>('');

  // Main streaming connection for all messages
  const { 
    isConnected: mainConnected, 
    sendMessage: sendMainMessage,
    subscribe: subscribeMain,
    unsubscribe: unsubscribeMain,
    reconnectAttempts: mainReconnectAttempts
  } = useStreamingWebSocket('all', {
    onMessage: useCallback((data: StreamingMessage) => {
      console.log('[StreamingDashboard] Main message:', data);
      
      setMessages(prev => [...prev.slice(-99), data]); // Keep last 100 messages
      
      // Update agent statuses
      if (data.type === 'status' && data.source === 'agent' && data.agentId) {
        setAgentStatuses(prev => ({
          ...prev,
          [data.agentId!]: data.data
        }));
      }
      
      // Update task progress
      if (data.type === 'progress' && data.source === 'task' && data.taskId) {
        setTaskProgress(prev => ({
          ...prev,
          [data.taskId!]: data.data
        }));
      }
      
      // Update logs
      if (data.type === 'log' || data.type === 'error') {
        setLogs(prev => [...prev.slice(-49), data]); // Keep last 50 logs
      }
    }, []),
    onConnectionChange: useCallback((connected: boolean) => {
      console.log('[StreamingDashboard] Connection changed:', connected);
    }, [])
  });

  // Agent-specific streaming
  const { isConnected: agentConnected } = useAgentWebSocket(selectedAgent, {
    onStatusChange: useCallback((data: any) => {
      console.log('[StreamingDashboard] Agent status:', data);
      if (data.agentId) {
        setAgentStatuses(prev => ({
          ...prev,
          [data.agentId]: data.data
        }));
      }
    }, []),
    onProgress: useCallback((data: any) => {
      console.log('[StreamingDashboard] Agent progress:', data);
    }, []),
    onError: useCallback((error: any) => {
      console.error('[StreamingDashboard] Agent error:', error);
    }, [])
  });

  // Task-specific streaming
  const { isConnected: taskConnected } = useTaskWebSocket(selectedTask, {
    onProgress: useCallback((data: any) => {
      console.log('[StreamingDashboard] Task progress:', data);
      if (data.taskId) {
        setTaskProgress(prev => ({
          ...prev,
          [data.taskId]: data.data
        }));
      }
    }, []),
    onComplete: useCallback((data: any) => {
      console.log('[StreamingDashboard] Task complete:', data);
    }, []),
    onError: useCallback((error: any) => {
      console.error('[StreamingDashboard] Task error:', error);
    }, [])
  });

  // Session-specific streaming for browser previews
  const { isConnected: sessionConnected } = useSessionWebSocket(selectedSession, {
    onScreenshot: useCallback((data: any) => {
      console.log('[StreamingDashboard] Screenshot received:', data);
      if (data.sessionId && data.data.payload.screenshot) {
        setScreenshots(prev => ({
          ...prev,
          [data.sessionId]: data.data.payload.screenshot
        }));
      }
    }, []),
    onBrowserUpdate: useCallback((data: any) => {
      console.log('[StreamingDashboard] Browser update:', data);
    }, []),
    onError: useCallback((error: any) => {
      console.error('[StreamingDashboard] Session error:', error);
    }, [])
  });

  // Log streaming
  const { isConnected: logConnected } = useLogWebSocket({
    onLog: useCallback((data: any) => {
      console.log('[StreamingDashboard] Log received:', data);
      setLogs(prev => [...prev.slice(-49), data]);
    }, []),
    onError: useCallback((error: any) => {
      console.error('[StreamingDashboard] Log error:', error);
    }, []),
    filters: {
      levels: ['info', 'warn', 'error'],
      sources: ['agent', 'task', 'browser', 'system']
    }
  });

  // Test functions
  const handleSubscribeToAgent = useCallback((agentId: string) => {
    if (agentId && subscribeMain) {
      subscribeMain('agent', agentId);
      setSelectedAgent(agentId);
    }
  }, [subscribeMain]);

  const handleSubscribeToTask = useCallback((taskId: string) => {
    if (taskId && subscribeMain) {
      subscribeMain('task', taskId);
      setSelectedTask(taskId);
    }
  }, [subscribeMain]);

  const handleCreateBrowserSession = useCallback(async (agentId: string) => {
    try {
      const response = await fetch('/api/streaming/browser/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId })
      });
      
      if (response.ok) {
        const data = await response.json();
        setSelectedSession(data.sessionId);
        console.log('[StreamingDashboard] Browser session created:', data);
      }
    } catch (error) {
      console.error('[StreamingDashboard] Failed to create browser session:', error);
    }
  }, []);

  const handleSendTestMessage = useCallback(() => {
    if (sendMainMessage) {
      sendMainMessage({
        type: 'heartbeat',
        payload: { test: true, timestamp: new Date().toISOString() }
      });
    }
  }, [sendMainMessage]);

  const getConnectionStatusColor = (connected: boolean, reconnectAttempts?: number) => {
    if (connected) return 'bg-green-500';
    if (reconnectAttempts && reconnectAttempts > 0) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Streaming Dashboard</h1>
        <div className="flex items-center gap-4">
          <Badge className={`${getConnectionStatusColor(mainConnected, mainReconnectAttempts)} text-white`}>
            Main: {mainConnected ? 'Connected' : `Disconnected (${mainReconnectAttempts} retries)`}
          </Badge>
          <Badge className={`${getConnectionStatusColor(agentConnected)} text-white`}>
            Agent: {agentConnected ? 'Connected' : 'Disconnected'}
          </Badge>
          <Badge className={`${getConnectionStatusColor(taskConnected)} text-white`}>
            Task: {taskConnected ? 'Connected' : 'Disconnected'}
          </Badge>
          <Badge className={`${getConnectionStatusColor(sessionConnected)} text-white`}>
            Session: {sessionConnected ? 'Connected' : 'Disconnected'}
          </Badge>
          <Badge className={`${getConnectionStatusColor(logConnected)} text-white`}>
            Logs: {logConnected ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>
      </div>

      {/* Connection Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Connection Controls</CardTitle>
          <CardDescription>Test streaming connections and subscriptions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Agent ID (e.g. agent-123)"
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="w-48"
            />
            <Button onClick={() => handleSubscribeToAgent(selectedAgent)}>
              Subscribe to Agent
            </Button>
            <Button onClick={() => handleCreateBrowserSession(selectedAgent)} variant="outline">
              Create Browser Session
            </Button>
          </div>
          
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Task ID (e.g. task-456)"
              value={selectedTask}
              onChange={(e) => setSelectedTask(e.target.value)}
              className="w-48"
            />
            <Button onClick={() => handleSubscribeToTask(selectedTask)}>
              Subscribe to Task
            </Button>
          </div>

          <div className="flex gap-2 items-center">
            <Input
              placeholder="Session ID (e.g. browser-789)"
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="w-48"
            />
            <Button onClick={handleSendTestMessage} variant="outline">
              Send Test Message
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agent Statuses */}
        <Card>
          <CardHeader>
            <CardTitle>Agent Status ({Object.keys(agentStatuses).length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-auto">
            {Object.entries(agentStatuses).map(([agentId, status]) => (
              <div key={agentId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center gap-2">
                  <Badge variant={status.status === 'connected' ? 'default' : 'destructive'}>
                    {agentId}
                  </Badge>
                  <span className="text-sm text-gray-600">{status.status}</span>
                </div>
                <div className="text-xs text-gray-500">
                  {status.metrics.activeTasks} active | {status.metrics.completedTasks} completed
                  {status.connectionInfo && (
                    <> | {status.connectionInfo.responseTime}ms</>
                  )}
                </div>
              </div>
            ))}
            {Object.keys(agentStatuses).length === 0 && (
              <p className="text-gray-500 text-center py-4">No agent statuses received</p>
            )}
          </CardContent>
        </Card>

        {/* Task Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Task Progress ({Object.keys(taskProgress).length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-96 overflow-auto">
            {Object.entries(taskProgress).map(([taskId, progress]) => (
              <div key={taskId} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{taskId}</Badge>
                  <span className="text-sm text-gray-600">{progress.percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>
                <div className="text-sm text-gray-600">
                  {progress.step} ({progress.current}/{progress.total})
                </div>
                <div className="text-xs text-gray-500">
                  Agent: {progress.agentId} | Started: {new Date(progress.timing.started).toLocaleTimeString()}
                </div>
              </div>
            ))}
            {Object.keys(taskProgress).length === 0 && (
              <p className="text-gray-500 text-center py-4">No task progress received</p>
            )}
          </CardContent>
        </Card>

        {/* Screenshots */}
        <Card>
          <CardHeader>
            <CardTitle>Browser Screenshots ({Object.keys(screenshots).length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-96 overflow-auto">
            {Object.entries(screenshots).map(([sessionId, screenshot]) => (
              <div key={sessionId} className="space-y-2">
                <Badge variant="outline">{sessionId}</Badge>
                <div className="border rounded-lg overflow-hidden">
                  <img 
                    src={screenshot} 
                    alt={`Screenshot from ${sessionId}`}
                    className="w-full h-32 object-cover"
                  />
                </div>
              </div>
            ))}
            {Object.keys(screenshots).length === 0 && (
              <p className="text-gray-500 text-center py-4">No screenshots received</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Messages */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Messages ({messages.length})</CardTitle>
          </CardHeader>
          <CardContent className="max-h-96 overflow-auto">
            <div className="space-y-2">
              {messages.slice(-10).map((message, index) => (
                <div key={`${message.id}-${index}`} className="text-xs p-2 bg-gray-50 rounded font-mono">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {message.type}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {message.source}
                      </Badge>
                      {message.priority === 'high' && (
                        <Badge variant="destructive" className="text-xs">HIGH</Badge>
                      )}
                    </div>
                    <span className="text-gray-500">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-gray-700">
                    {message.agentId && <span className="text-blue-600">Agent: {message.agentId} </span>}
                    {message.taskId && <span className="text-green-600">Task: {message.taskId} </span>}
                    {message.sessionId && <span className="text-purple-600">Session: {message.sessionId} </span>}
                  </div>
                  <div className="mt-1 text-gray-800">
                    {JSON.stringify(message.data, null, 2).substring(0, 200)}
                    {JSON.stringify(message.data).length > 200 && '...'}
                  </div>
                </div>
              ))}
              {messages.length === 0 && (
                <p className="text-gray-500 text-center py-4">No messages received</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Logs */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Log Stream ({logs.length})</CardTitle>
          </CardHeader>
          <CardContent className="max-h-96 overflow-auto">
            <div className="space-y-1 font-mono text-sm">
              {logs.slice(-20).map((log, index) => (
                <div key={`${log.id}-${index}`} className="flex items-start gap-2 p-1">
                  <span className="text-gray-500 text-xs w-16">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <Badge 
                    variant={log.data.level === 'error' ? 'destructive' : 
                            log.data.level === 'warn' ? 'secondary' : 'outline'} 
                    className="text-xs"
                  >
                    {log.data.level}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {log.source}
                  </Badge>
                  {log.agentId && (
                    <span className="text-blue-600 text-xs">
                      {log.agentId}
                    </span>
                  )}
                  <span className="text-gray-800 flex-1">
                    {log.data.message}
                  </span>
                </div>
              ))}
              {logs.length === 0 && (
                <p className="text-gray-500 text-center py-4">No logs received</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}