import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { WebSocketStatus, WebSocketStatusDashboard } from '../components/websocket-status';
import { RealTimeSessionMonitor, GridStatusMonitor } from '../components/real-time-session-monitor';
import { 
  useSessionsWebSocket,
  useSessionMonitor,
  useGridMonitor,
  useAppWebSocket,
  type SessionStatusMessage,
  type SessionMetricsMessage,
  type GridNodeStatusMessage 
} from '../hooks/use-websocket';

export default function WebSocketDemo() {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [testSessionId, setTestSessionId] = useState('demo-session-123');
  const [sessionMessages, setSessionMessages] = useState<any[]>([]);
  const [gridMessages, setGridMessages] = useState<any[]>([]);
  
  const { 
    isConnected: sessionsConnected, 
    sendMessage: sendSessionsMessage,
    addMessageHandler: addSessionsHandler,
    removeMessageHandler: removeSessionsHandler
  } = useSessionsWebSocket();
  
  const { isConnected: appConnected } = useAppWebSocket();
  
  const { gridNodes, totalSessions, totalCapacity, onlineNodes } = useGridMonitor();

  // Test session creation
  const createTestSession = async () => {
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'browser-use',
          browserType: 'chrome',
          headless: true,
          taskId: 'demo-task'
        })
      });
      
      if (response.ok) {
        const session = await response.json();
        setSelectedSessionId(session.id);
        console.log('Test session created:', session);
      }
    } catch (error) {
      console.error('Failed to create test session:', error);
    }
  };

  const simulateSessionStart = async () => {
    if (!selectedSessionId) return;
    
    try {
      await fetch(`/api/sessions/${selectedSessionId}/start`, {
        method: 'POST'
      });
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  };

  const simulateSessionStop = async () => {
    if (!selectedSessionId) return;
    
    try {
      await fetch(`/api/sessions/${selectedSessionId}/stop`, {
        method: 'POST'
      });
    } catch (error) {
      console.error('Failed to stop session:', error);
    }
  };

  // Message handlers
  useEffect(() => {
    const handleSessionMessage = (message: any) => {
      if (message.type.startsWith('session-')) {
        setSessionMessages(prev => [
          { ...message, receivedAt: new Date() },
          ...prev.slice(0, 49) // Keep last 50 messages
        ]);
      }
    };

    addSessionsHandler('*', handleSessionMessage);
    
    return () => {
      removeSessionsHandler('*', handleSessionMessage);
    };
  }, [addSessionsHandler, removeSessionsHandler]);

  const sendTestMessage = () => {
    sendSessionsMessage({
      type: 'test',
      payload: {
        message: 'Hello WebSocket!',
        timestamp: new Date().toISOString()
      }
    });
  };

  const simulateMetricsUpdate = () => {
    if (!selectedSessionId) return;
    
    // This would normally be sent from the server
    const mockMetrics = {
      cpu: Math.random() * 100,
      memory: Math.random() * 1024,
      networkIn: Math.random() * 1000,
      networkOut: Math.random() * 500,
      requestCount: Math.floor(Math.random() * 50),
      responseTime: Math.random() * 1000,
      timestamp: new Date().toISOString()
    };
    
    console.log('Simulated metrics update:', mockMetrics);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">WebSocket System Demo</h1>
        <WebSocketStatus channel="app" showMetrics className="ml-4" />
      </div>
      
      <div className="text-sm text-gray-600">
        This page demonstrates the comprehensive WebSocket system for real-time session updates, 
        metrics streaming, and grid monitoring in WebOrchestrator.
      </div>

      {/* Connection Status Dashboard */}
      <WebSocketStatusDashboard />

      {/* Test Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Test Controls</CardTitle>
          <CardDescription>
            Create test sessions and simulate events to see WebSocket system in action
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <h4 className="font-medium">Session Management</h4>
              <div className="flex space-x-2">
                <Button onClick={createTestSession} size="sm">
                  Create Test Session
                </Button>
                <Button 
                  onClick={simulateSessionStart} 
                  disabled={!selectedSessionId}
                  size="sm"
                  variant="outline"
                >
                  Start Session
                </Button>
                <Button 
                  onClick={simulateSessionStop} 
                  disabled={!selectedSessionId}
                  size="sm"
                  variant="outline"
                >
                  Stop Session
                </Button>
              </div>
              
              <div className="flex space-x-2">
                <Input 
                  placeholder="Session ID" 
                  value={testSessionId}
                  onChange={(e) => setTestSessionId(e.target.value)}
                  className="text-sm"
                />
                <Button 
                  onClick={() => setSelectedSessionId(testSessionId)}
                  size="sm"
                  variant="outline"
                >
                  Monitor
                </Button>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium">WebSocket Testing</h4>
              <div className="flex space-x-2">
                <Button onClick={sendTestMessage} size="sm">
                  Send Test Message
                </Button>
                <Button onClick={simulateMetricsUpdate} size="sm" variant="outline">
                  Simulate Metrics
                </Button>
              </div>
              
              <div className="text-sm text-gray-600">
                Status: Sessions {sessionsConnected ? '✅' : '❌'} | 
                App {appConnected ? '✅' : '❌'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Session Monitor */}
      {selectedSessionId && (
        <RealTimeSessionMonitor sessionId={selectedSessionId} />
      )}

      {/* Grid Status Monitor */}
      <GridStatusMonitor />

      {/* Message Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Session Messages */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Session Messages
              <Badge variant="outline">
                {sessionMessages.length} messages
              </Badge>
            </CardTitle>
            <CardDescription>
              Real-time session events and status changes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {sessionMessages.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No session messages yet. Create a session to see real-time updates.
                </p>
              ) : (
                sessionMessages.map((message, index) => (
                  <div 
                    key={index} 
                    className="p-3 bg-gray-50 rounded border text-sm"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Badge className="text-xs">
                        {message.type}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {message.receivedAt.toLocaleTimeString()}
                      </span>
                    </div>
                    
                    {message.sessionId && (
                      <div className="text-xs text-gray-600 mb-1">
                        Session: {message.sessionId}
                      </div>
                    )}
                    
                    <div className="text-xs">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(message.data, null, 2)}
                      </pre>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* System Information */}
        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
            <CardDescription>
              Current WebSocket system status and capabilities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-sm mb-2">Supported Channels</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-gray-50 rounded">
                    <div className="font-medium">/ws/sessions</div>
                    <div className="text-gray-600">Global session updates</div>
                  </div>
                  <div className="p-2 bg-gray-50 rounded">
                    <div className="font-medium">/ws/sessions/:id</div>
                    <div className="text-gray-600">Individual session</div>
                  </div>
                  <div className="p-2 bg-gray-50 rounded">
                    <div className="font-medium">/ws/grid</div>
                    <div className="text-gray-600">Grid status updates</div>
                  </div>
                  <div className="p-2 bg-gray-50 rounded">
                    <div className="font-medium">/ws/recordings/:id</div>
                    <div className="text-gray-600">Recording progress</div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-2">Message Types</h4>
                <div className="grid grid-cols-1 gap-1 text-xs">
                  {[
                    'session-status-changed',
                    'session-metrics-updated', 
                    'session-action-logged',
                    'recording-progress-updated',
                    'grid-node-status-changed',
                    'session-screenshot-ready'
                  ].map(type => (
                    <Badge key={type} variant="outline" className="text-xs justify-start">
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-2">Features</h4>
                <div className="text-xs text-gray-600 space-y-1">
                  <div>✅ Automatic reconnection with exponential backoff</div>
                  <div>✅ Message queuing for offline scenarios</div>
                  <div>✅ Rate limiting (100 req/min per connection)</div>
                  <div>✅ Authentication for protected channels</div>
                  <div>✅ Heartbeat monitoring</div>
                  <div>✅ Connection status indicators</div>
                  <div>✅ Real-time metrics streaming</div>
                  <div>✅ Session action logging</div>
                  <div>✅ Grid node monitoring</div>
                  <div>✅ Recording progress tracking</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}