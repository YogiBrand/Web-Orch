/**
 * WebSocket Connection Test Component
 * Used to verify WebSocket connectivity and agent real-time updates
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWebSocket } from "@/hooks/use-websocket";
import { useAgentConnection } from "@/hooks/use-agent-connection";
import { Zap, Wifi, WifiOff, Activity, RefreshCw } from "lucide-react";

export function WebSocketTest() {
  const [messages, setMessages] = useState<any[]>([]);
  const [testAgentId] = useState("test-agent-123");
  
  const { 
    isConnected: wsConnected, 
    connectionStatus, 
    lastMessage, 
    sendMessage,
    connect: reconnect 
  } = useWebSocket();
  
  const { 
    status: agentStatus, 
    metrics: agentMetrics, 
    isConnected: agentConnected 
  } = useAgentConnection(testAgentId);

  useEffect(() => {
    if (lastMessage) {
      setMessages(prev => [lastMessage, ...prev].slice(0, 10));
    }
  }, [lastMessage]);

  const handleTestMessage = () => {
    sendMessage({
      id: `test_${Date.now()}`,
      type: 'test_message',
      data: { 
        message: 'Hello from frontend',
        timestamp: new Date().toISOString() 
      },
      timestamp: new Date().toISOString(),
      priority: 'normal'
    });
  };

  const handleAgentSubscribe = () => {
    sendMessage({
      id: `subscribe_${Date.now()}`,
      type: 'subscribe:agent',
      agentId: testAgentId,
      data: { agentId: testAgentId },
      timestamp: new Date().toISOString(),
      priority: 'normal'
    });
  };

  const getConnectionStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-100 text-green-800';
      case 'connecting': return 'bg-yellow-100 text-yellow-800';
      case 'disconnected': return 'bg-gray-100 text-gray-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            WebSocket Connection Test
          </CardTitle>
          <CardDescription>
            Test WebSocket connectivity and agent real-time updates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connection Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {wsConnected ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <span className="font-medium">WebSocket Status:</span>
            </div>
            <Badge className={getConnectionStatusColor(connectionStatus)}>
              {connectionStatus}
            </Badge>
          </div>

          {/* Agent Connection */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="font-medium">Agent Connection:</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={agentConnected ? "default" : "secondary"}>
                {agentConnected ? "Connected" : "Disconnected"}
              </Badge>
              {agentStatus && (
                <Badge variant="outline">
                  {agentStatus}
                </Badge>
              )}
            </div>
          </div>

          {/* Agent Metrics */}
          {agentMetrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-muted rounded-lg">
              <div className="text-center">
                <div className="font-bold text-lg">{agentMetrics.activeTasks}</div>
                <div className="text-xs text-muted-foreground">Active Tasks</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-lg">{agentMetrics.completedToday}</div>
                <div className="text-xs text-muted-foreground">Completed Today</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-lg">{agentMetrics.successRate}%</div>
                <div className="text-xs text-muted-foreground">Success Rate</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-lg">{agentMetrics.averageResponseTime}ms</div>
                <div className="text-xs text-muted-foreground">Avg Response</div>
              </div>
            </div>
          )}

          {/* Test Buttons */}
          <div className="flex gap-2">
            <Button 
              onClick={handleTestMessage}
              disabled={!wsConnected}
              size="sm"
            >
              Send Test Message
            </Button>
            <Button 
              onClick={handleAgentSubscribe}
              disabled={!wsConnected}
              variant="outline"
              size="sm"
            >
              Subscribe to Agent
            </Button>
            <Button 
              onClick={reconnect}
              disabled={wsConnected}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Reconnect
            </Button>
          </div>

          {/* Recent Messages */}
          <div>
            <h4 className="font-medium mb-2">Recent Messages ({messages.length}/10)</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">No messages received yet</p>
              ) : (
                messages.map((msg, index) => (
                  <div 
                    key={index}
                    className="text-xs p-2 bg-muted rounded border-l-2 border-l-blue-500"
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-mono font-bold">{msg.type}</span>
                      <span className="text-muted-foreground">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    {msg.data && (
                      <pre className="mt-1 text-xs overflow-x-auto">
                        {JSON.stringify(msg.data, null, 2)}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Debug Info */}
          <details className="text-xs">
            <summary className="cursor-pointer font-medium">Debug Information</summary>
            <div className="mt-2 p-2 bg-muted rounded">
              <div><strong>WebSocket URL:</strong> {(window as any).location.protocol === 'https:' ? 'wss:' : 'ws:'}//{(window as any).location.host.includes(':3000') ? (window as any).location.host.replace(':3000', ':3001') : (window as any).location.host}/ws</div>
              <div><strong>Connection Status:</strong> {connectionStatus}</div>
              <div><strong>Is Connected:</strong> {wsConnected ? 'Yes' : 'No'}</div>
              <div><strong>Agent ID:</strong> {testAgentId}</div>
              <div><strong>Agent Connected:</strong> {agentConnected ? 'Yes' : 'No'}</div>
            </div>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}

export default WebSocketTest;
