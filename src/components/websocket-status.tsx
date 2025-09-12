import { useState, useEffect } from 'react';
import { Badge } from './ui/badge';
import { 
  useAppWebSocket, 
  useSessionsWebSocket, 
  useGridWebSocket,
  type WebSocketMessage 
} from '../hooks/use-websocket';

interface WebSocketStatusProps {
  channel?: 'app' | 'sessions' | 'grid' | 'custom';
  customPath?: string;
  showMetrics?: boolean;
  className?: string;
}

export function WebSocketStatus({ 
  channel = 'app', 
  customPath,
  showMetrics = false,
  className = '' 
}: WebSocketStatusProps) {
  const [messageCount, setMessageCount] = useState(0);
  const [lastActivity, setLastActivity] = useState<Date | null>(null);

  // Select the appropriate WebSocket hook based on channel
  const getWebSocketHook = () => {
    switch (channel) {
      case 'sessions':
        return useSessionsWebSocket();
      case 'grid':
        return useGridWebSocket();
      case 'custom':
        return useAppWebSocket({ reconnect: true });
      default:
        return useAppWebSocket();
    }
  };

  const { 
    isConnected, 
    connectionStatus, 
    lastMessage,
    addMessageHandler,
    removeMessageHandler,
    messageQueue
  } = getWebSocketHook();

  useEffect(() => {
    if (!lastMessage) return;
    
    setMessageCount(prev => prev + 1);
    setLastActivity(new Date());
  }, [lastMessage]);

  useEffect(() => {
    const handleMessage = (message: WebSocketMessage) => {
      console.log(`[${channel}] WebSocket message:`, message.type);
    };

    addMessageHandler('*', handleMessage);
    
    return () => {
      removeMessageHandler('*', handleMessage);
    };
  }, [addMessageHandler, removeMessageHandler, channel]);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500';
      case 'disconnected':
        return 'bg-gray-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'disconnected':
        return 'Disconnected';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  const formatChannel = () => {
    if (channel === 'custom' && customPath) {
      return customPath.replace('/ws/', '').toUpperCase();
    }
    return channel.toUpperCase();
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="flex items-center space-x-1">
        <div 
          className={`w-2 h-2 rounded-full ${getStatusColor()}`}
          title={`${formatChannel()} WebSocket: ${getStatusText()}`}
        />
        <span className="text-xs font-medium text-gray-600">
          {formatChannel()} WS
        </span>
      </div>
      
      <Badge variant="outline" className="text-xs">
        {getStatusText()}
      </Badge>

      {showMetrics && (
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <span title="Messages received">📨 {messageCount}</span>
          {messageQueue > 0 && (
            <span title="Queued messages" className="text-orange-500">
              ⏳ {messageQueue}
            </span>
          )}
          {lastActivity && (
            <span title="Last activity">
              🕒 {lastActivity.toLocaleTimeString()}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Specialized status indicators for different channels
export function SessionsWebSocketStatus({ showMetrics = true, className }: Omit<WebSocketStatusProps, 'channel'>) {
  return (
    <WebSocketStatus 
      channel="sessions" 
      showMetrics={showMetrics} 
      className={className}
    />
  );
}

export function GridWebSocketStatus({ showMetrics = true, className }: Omit<WebSocketStatusProps, 'channel'>) {
  return (
    <WebSocketStatus 
      channel="grid" 
      showMetrics={showMetrics} 
      className={className}
    />
  );
}

// Multi-channel status dashboard
export function WebSocketStatusDashboard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
      <div className="bg-white p-3 rounded border">
        <h4 className="text-sm font-medium text-gray-700 mb-2">App Connection</h4>
        <WebSocketStatus channel="app" showMetrics />
      </div>
      
      <div className="bg-white p-3 rounded border">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Sessions Channel</h4>
        <SessionsWebSocketStatus />
      </div>
      
      <div className="bg-white p-3 rounded border">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Grid Status</h4>
        <GridWebSocketStatus />
      </div>
    </div>
  );
}