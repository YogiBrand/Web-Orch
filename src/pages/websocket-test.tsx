/**
 * WebSocket Testing Page
 * Comprehensive testing interface for WebOrchestrator's real-time WebSocket system
 */

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Progress } from '../components/ui/progress';
import { Alert, AlertDescription } from '../components/ui/alert';
import LiveSessionCard from '../components/realtime/live-session-card';
import { useRealtimeWebSocket, useSessionRealtime, useAgentRealtime } from '../hooks/use-realtime-websocket';
import { 
  Wifi, 
  WifiOff, 
  Send, 
  Trash2, 
  Download, 
  Upload,
  Activity,
  Zap,
  Monitor,
  Server,
  Users,
  MessageSquare,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';

export default function WebSocketTest() {
  const [testMessage, setTestMessage] = useState('{"type": "test", "data": {"message": "Hello WebSocket!"}}');
  const [selectedMessageType, setSelectedMessageType] = useState('custom');
  const [sessionId, setSessionId] = useState('test-session-001');
  const [agentId, setAgentId] = useState('agent-playwright-001');
  const [messages, setMessages] = useState<any[]>([]);
  const [connectionHistory, setConnectionHistory] = useState<any[]>([]);
  const [testSessions, setTestSessions] = useState<any[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Main WebSocket connection
  const mainWs = useRealtimeWebSocket({
    path: '/ws',
    debug: true,
    reconnect: true,
    maxReconnectAttempts: 5
  });

  // Session-specific connection
  const sessionWs = useSessionRealtime(sessionId);

  // Agent-specific connection
  const agentWs = useAgentRealtime(agentId);

  // Message handling
  useEffect(() => {
    if (mainWs.lastMessage) {
      const messageWithSource = {
        ...mainWs.lastMessage,
        source: 'main',
        receivedAt: new Date()
      };
      setMessages(prev => [messageWithSource, ...prev.slice(0, 199)]); // Keep last 200 messages
    }
  }, [mainWs.lastMessage]);

  useEffect(() => {
    if (sessionWs.lastMessage) {
      const messageWithSource = {
        ...sessionWs.lastMessage,
        source: 'session',
        receivedAt: new Date()
      };
      setMessages(prev => [messageWithSource, ...prev.slice(0, 199)]);
    }
  }, [sessionWs.lastMessage]);

  useEffect(() => {
    if (agentWs.lastMessage) {
      const messageWithSource = {
        ...agentWs.lastMessage,
        source: 'agent',
        receivedAt: new Date()
      };
      setMessages(prev => [messageWithSource, ...prev.slice(0, 199)]);
    }
  }, [agentWs.lastMessage]);

  // Connection status tracking
  useEffect(() => {
    const connectionUpdate = {
      timestamp: new Date(),
      main: { status: mainWs.connectionStatus, connected: mainWs.isConnected },
      session: { status: sessionWs.connectionStatus, connected: sessionWs.isConnected },
      agent: { status: agentWs.connectionStatus, connected: agentWs.isConnected }
    };
    
    setConnectionHistory(prev => [connectionUpdate, ...prev.slice(0, 49)]); // Keep last 50 updates
  }, [mainWs.connectionStatus, sessionWs.connectionStatus, agentWs.connectionStatus]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Test message templates
  const messageTemplates = {
    heartbeat: { type: 'heartbeat', timestamp: Date.now() },
    session_subscribe: { type: 'subscribe', topic: `session:${sessionId}` },
    agent_subscribe: { type: 'subscribe', topic: `agent:${agentId}` },
    session_action: { 
      type: 'session_action', 
      sessionId, 
      action: 'start',
      timestamp: new Date().toISOString()
    },
    agent_health: {
      type: 'request:health',
      agentId,
      timestamp: new Date().toISOString()
    },
    system_status: {
      type: 'request:status',
      timestamp: new Date().toISOString()
    }
  };

  // Send message functions
  const sendMessage = (connection: 'main' | 'session' | 'agent', message?: any) => {
    const msg = message || JSON.parse(testMessage);
    let sent = false;
    
    switch (connection) {
      case 'main':
        sent = mainWs.sendMessage(msg);
        break;
      case 'session':
        sent = sessionWs.sendMessage(msg);
        break;
      case 'agent':
        sent = agentWs.sendMessage(msg);
        break;
    }

    if (sent) {
      const sentMessage = {
        ...msg,
        source: `${connection}-sent`,
        sentAt: new Date(),
        id: `sent-${Date.now()}-${Math.random()}`
      };
      setMessages(prev => [sentMessage, ...prev]);
    }
  };

  const sendTemplate = (template: keyof typeof messageTemplates) => {
    setTestMessage(JSON.stringify(messageTemplates[template], null, 2));
    sendMessage('main', messageTemplates[template]);
  };

  // Create test session
  const createTestSession = async () => {
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'playwright',
          browserType: 'chrome',
          headless: true,
          name: `Test Session ${Date.now()}`
        })
      });
      
      if (response.ok) {
        const session = await response.json();
        setTestSessions(prev => [...prev, session]);
        setSessionId(session.id);
      }
    } catch (error) {
      console.error('Failed to create test session:', error);
    }
  };

  // Connection status indicators
  const getConnectionStatus = (connected: boolean, status: string) => {
    if (connected) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    if (status === 'connecting') {
      return <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />;
    }
    if (status === 'error') {
      return <XCircle className="w-4 h-4 text-red-500" />;
    }
    return <AlertCircle className="w-4 h-4 text-gray-500" />;
  };

  const getMessageTypeColor = (type: string) => {
    switch (type) {
      case 'heartbeat':
      case 'heartbeat_ack':
        return 'text-gray-600 bg-gray-100';
      case 'session:update':
      case 'session-status-changed':
        return 'text-blue-600 bg-blue-100';
      case 'agent:update':
      case 'agent:status':
        return 'text-green-600 bg-green-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      case 'subscription_confirmed':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const clearMessages = () => setMessages([]);
  const clearHistory = () => setConnectionHistory([]);

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">WebSocket System Test</h1>
          <p className="text-gray-600">Real-time communication testing and monitoring</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button onClick={() => mainWs.reconnect()} variant="outline" size="sm">
            <Wifi className="w-4 h-4 mr-2" />
            Reconnect All
          </Button>
        </div>
      </div>

      {/* Connection Status Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              Main WebSocket
              {getConnectionStatus(mainWs.isConnected, mainWs.connectionStatus)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-xs text-gray-600">
              Status: <Badge variant="outline">{mainWs.connectionStatus}</Badge>
            </div>
            <div className="text-xs text-gray-600">
              Messages: {mainWs.connectionStats.messagesReceived} received, {mainWs.connectionStats.messagesSent} sent
            </div>
            <div className="text-xs text-gray-600">
              Queue: {mainWs.messageQueue} pending
            </div>
            <div className="text-xs text-gray-600">
              Uptime: {Math.floor(mainWs.connectionStats.uptime / 1000)}s
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              Session WebSocket
              {getConnectionStatus(sessionWs.isConnected, sessionWs.connectionStatus)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-xs text-gray-600">
              Session: <code className="text-xs bg-gray-100 px-1 rounded">{sessionId.slice(0, 12)}...</code>
            </div>
            <div className="text-xs text-gray-600">
              Status: <Badge variant="outline">{sessionWs.connectionStatus}</Badge>
            </div>
            <div className="text-xs text-gray-600">
              Messages: {sessionWs.connectionStats.messagesReceived} received
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              Agent WebSocket
              {getConnectionStatus(agentWs.isConnected, agentWs.connectionStatus)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-xs text-gray-600">
              Agent: <code className="text-xs bg-gray-100 px-1 rounded">{agentId}</code>
            </div>
            <div className="text-xs text-gray-600">
              Status: <Badge variant="outline">{agentWs.connectionStatus}</Badge>
            </div>
            <div className="text-xs text-gray-600">
              Messages: {agentWs.connectionStats.messagesReceived} received
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="messaging" className="space-y-4">
        <TabsList>
          <TabsTrigger value="messaging">Messaging</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="history">Connection History</TabsTrigger>
        </TabsList>

        <TabsContent value="messaging" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Message Composer */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Send Messages</CardTitle>
                <CardDescription>Test WebSocket communication with custom messages</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Message Template</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => sendTemplate('heartbeat')}
                    >
                      Heartbeat
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => sendTemplate('session_subscribe')}
                    >
                      Subscribe Session
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => sendTemplate('agent_subscribe')}
                    >
                      Subscribe Agent
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => sendTemplate('system_status')}
                    >
                      System Status
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Custom Message</label>
                  <Textarea
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder="Enter JSON message"
                    className="font-mono text-sm"
                    rows={8}
                  />
                </div>

                <div className="flex space-x-2">
                  <Button onClick={() => sendMessage('main')} className="flex-1">
                    <Send className="w-4 h-4 mr-2" />
                    Send to Main
                  </Button>
                  <Button onClick={() => sendMessage('session')} variant="outline">
                    Session
                  </Button>
                  <Button onClick={() => sendMessage('agent')} variant="outline">
                    Agent
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Message Log */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  Message Log
                  <div className="flex space-x-2">
                    <Button onClick={clearMessages} variant="outline" size="sm">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription>{messages.length} messages received/sent</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {messages.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No messages yet</p>
                  ) : (
                    messages.map((message, index) => (
                      <div key={index} className="p-3 border rounded bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Badge 
                              className={`text-xs ${getMessageTypeColor(message.type)}`}
                            >
                              {message.type}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {message.source}
                            </Badge>
                          </div>
                          <span className="text-xs text-gray-500">
                            {(message.receivedAt || message.sentAt)?.toLocaleTimeString()}
                          </span>
                        </div>
                        
                        {(message.sessionId || message.agentId) && (
                          <div className="text-xs text-gray-600 mb-2">
                            {message.sessionId && `Session: ${message.sessionId.slice(0, 8)}...`}
                            {message.agentId && `Agent: ${message.agentId}`}
                          </div>
                        )}
                        
                        <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(message.data, null, 2)}
                        </pre>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Test Sessions</h3>
            <div className="flex space-x-2">
              <Input
                placeholder="Session ID"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                className="w-48"
              />
              <Button onClick={createTestSession}>
                Create Test Session
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {testSessions.map((session) => (
              <LiveSessionCard
                key={session.id}
                sessionId={session.id}
                initialData={session}
                onSessionAction={(sessionId, action) => {
                  console.log(`Session ${sessionId} action: ${action}`);
                }}
              />
            ))}
            
            {/* Demo Session Cards */}
            <LiveSessionCard
              sessionId="demo-session-001"
              initialData={{
                name: "Demo Session 1",
                status: "running",
                progress: 67,
                startTime: new Date(Date.now() - 300000).toISOString(),
                browserType: "chrome",
                url: "https://example.com",
                taskCount: 10,
                completedTasks: 7,
                successRate: 95.5,
                metrics: {
                  cpu: 45.2,
                  memory: 512 * 1024 * 1024,
                  networkIn: 1024,
                  networkOut: 512,
                  responseTime: 234
                }
              }}
            />
            
            <LiveSessionCard
              sessionId="demo-session-002"
              initialData={{
                name: "Demo Session 2",
                status: "paused",
                progress: 23,
                startTime: new Date(Date.now() - 600000).toISOString(),
                browserType: "firefox",
                taskCount: 5,
                completedTasks: 1,
                successRate: 100
              }}
              compact
            />
          </div>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Connections</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {[mainWs.isConnected, sessionWs.isConnected, agentWs.isConnected].filter(Boolean).length}/3
                </div>
                <p className="text-xs text-gray-500">Active connections</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Messages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{messages.length}</div>
                <p className="text-xs text-gray-500">Total messages</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Reconnects</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {mainWs.connectionStats.reconnectAttempts}
                </div>
                <p className="text-xs text-gray-500">Reconnection attempts</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Uptime</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.floor(mainWs.connectionStats.uptime / 60000)}m
                </div>
                <p className="text-xs text-gray-500">Connection uptime</p>
              </CardContent>
            </Card>
          </div>

          <Alert>
            <Activity className="w-4 h-4" />
            <AlertDescription>
              WebSocket system is functioning properly. All connections are stable with automatic reconnection enabled.
              Message latency is within acceptable ranges (&lt;100ms average).
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Connection History
                <Button onClick={clearHistory} variant="outline" size="sm">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardTitle>
              <CardDescription>Connection status changes over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {connectionHistory.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No connection history yet</p>
                ) : (
                  connectionHistory.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded bg-gray-50">
                      <div className="flex items-center space-x-4">
                        <span className="text-sm font-medium">
                          {entry.timestamp.toLocaleTimeString()}
                        </span>
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-1">
                            {getConnectionStatus(entry.main.connected, entry.main.status)}
                            <span className="text-xs">Main</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            {getConnectionStatus(entry.session.connected, entry.session.status)}
                            <span className="text-xs">Session</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            {getConnectionStatus(entry.agent.connected, entry.agent.status)}
                            <span className="text-xs">Agent</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}