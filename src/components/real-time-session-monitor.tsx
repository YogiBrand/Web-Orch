import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
  useSessionMonitor, 
  useGridMonitor,
  type SessionMetricsMessage,
  type SessionActionLogMessage 
} from '../hooks/use-websocket';

interface RealTimeSessionMonitorProps {
  sessionId: string | null;
}

export function RealTimeSessionMonitor({ sessionId }: RealTimeSessionMonitorProps) {
  const {
    isConnected,
    connectionStatus,
    sessionStatus,
    sessionMetrics,
    lastAction,
    lastScreenshot,
    requestScreenshot,
    pauseSession,
    resumeSession,
    terminateSession,
  } = useSessionMonitor(sessionId);

  const [actionHistory, setActionHistory] = useState<SessionActionLogMessage['data'][]>([]);

  useEffect(() => {
    if (lastAction) {
      setActionHistory(prev => [lastAction, ...prev].slice(0, 20)); // Keep last 20 actions
    }
  }, [lastAction]);

  if (!sessionId) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          Select a session to monitor in real-time
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'created': return 'bg-blue-500';
      case 'running': return 'bg-green-500';
      case 'paused': return 'bg-yellow-500';
      case 'completed': return 'bg-gray-500';
      case 'error': return 'bg-red-500';
      case 'terminated': return 'bg-red-600';
      default: return 'bg-gray-400';
    }
  };

  const formatMetric = (value: number, unit: string) => {
    if (unit === 'MB') {
      return `${value.toFixed(1)} ${unit}`;
    } else if (unit === 'ms') {
      return `${Math.round(value)} ${unit}`;
    } else if (unit === '%') {
      return `${Math.round(value)}${unit}`;
    }
    return `${Math.round(value)} ${unit}`;
  };

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Session Monitor</CardTitle>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-600">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
          <CardDescription>
            Session ID: {sessionId}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Status:</span>
              <Badge 
                className={`text-white ${getStatusColor(sessionStatus)}`}
              >
                {sessionStatus}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={requestScreenshot}
                disabled={!isConnected || sessionStatus !== 'running'}
              >
                📸 Screenshot
              </Button>
              
              {sessionStatus === 'running' ? (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={pauseSession}
                  disabled={!isConnected}
                >
                  ⏸️ Pause
                </Button>
              ) : sessionStatus === 'paused' ? (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={resumeSession}
                  disabled={!isConnected}
                >
                  ▶️ Resume
                </Button>
              ) : null}
              
              <Button 
                size="sm" 
                variant="destructive" 
                onClick={terminateSession}
                disabled={!isConnected || sessionStatus === 'completed' || sessionStatus === 'terminated'}
              >
                🛑 Terminate
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Metrics */}
      {sessionMetrics && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Live Metrics</CardTitle>
            <CardDescription>
              Last updated: {new Date(sessionMetrics.timestamp).toLocaleTimeString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {formatMetric(sessionMetrics.cpu, '%')}
                </div>
                <div className="text-sm text-gray-500">CPU Usage</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatMetric(sessionMetrics.memory, 'MB')}
                </div>
                <div className="text-sm text-gray-500">Memory</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {sessionMetrics.requestCount}
                </div>
                <div className="text-sm text-gray-500">Requests</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {formatMetric(sessionMetrics.responseTime, 'ms')}
                </div>
                <div className="text-sm text-gray-500">Response Time</div>
              </div>
            </div>
            
            {sessionMetrics.gridNodeId && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Grid Node:</span>
                  <Badge variant="outline">{sessionMetrics.gridNodeId}</Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Latest Screenshot */}
      {lastScreenshot && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Latest Screenshot</CardTitle>
            <CardDescription>
              Live browser view
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden bg-gray-100">
              <img 
                src={`data:image/png;base64,${lastScreenshot}`}
                alt="Session screenshot" 
                className="w-full h-auto max-h-96 object-contain"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Action History</CardTitle>
          <CardDescription>
            Real-time browser actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {actionHistory.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No actions recorded yet</p>
            ) : (
              actionHistory.map((action, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-3 bg-gray-50 rounded border"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={action.success ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {action.action}
                      </Badge>
                      {action.element && (
                        <span className="text-sm text-gray-600">
                          on {action.element}
                        </span>
                      )}
                    </div>
                    
                    {action.url && (
                      <div className="text-xs text-gray-500 mt-1">
                        {action.url}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span>{formatMetric(action.duration, 'ms')}</span>
                    <span>{new Date(action.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Grid monitor component
export function GridStatusMonitor() {
  const { 
    isConnected, 
    gridNodes, 
    totalSessions, 
    totalCapacity, 
    onlineNodes, 
    totalNodes 
  } = useGridMonitor();

  const getNodeStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'busy': return 'bg-yellow-500';
      case 'offline': return 'bg-red-500';
      case 'error': return 'bg-red-600';
      default: return 'bg-gray-400';
    }
  };

  const utilizationPercentage = totalCapacity > 0 ? (totalSessions / totalCapacity) * 100 : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Grid Status Monitor</CardTitle>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-600">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
        <CardDescription>
          Selenium Grid real-time status
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Grid Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{onlineNodes}</div>
              <div className="text-sm text-gray-500">Online Nodes</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{totalSessions}</div>
              <div className="text-sm text-gray-500">Active Sessions</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{totalCapacity}</div>
              <div className="text-sm text-gray-500">Total Capacity</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {utilizationPercentage.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500">Utilization</div>
            </div>
          </div>

          {/* Node List */}
          <div className="space-y-2">
            <h4 className="font-medium text-gray-700">Grid Nodes</h4>
            {gridNodes.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No grid nodes available</p>
            ) : (
              gridNodes.map((node) => (
                <div 
                  key={node.nodeId} 
                  className="flex items-center justify-between p-3 bg-gray-50 rounded border"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${getNodeStatusColor(node.status)}`} />
                    <div>
                      <div className="font-medium">{node.nodeId}</div>
                      <div className="text-sm text-gray-500">
                        {node.activeSessions}/{node.maxSessions} sessions
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="text-center">
                      <div className="font-medium">{Math.round(node.cpu)}%</div>
                      <div className="text-gray-500">CPU</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="font-medium">{Math.round(node.memory)}%</div>
                      <div className="text-gray-500">Memory</div>
                    </div>
                    
                    <Badge 
                      className={`text-white ${getNodeStatusColor(node.status)}`}
                    >
                      {node.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}