import { useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

// Enhanced WebSocket hook with automatic reconnection
export function useWebSocket(path?: string, options: {
  reconnect?: boolean;
  maxRetries?: number;
  retryInterval?: number;
  onMessage?: (data: any) => void;
  onConnectionChange?: (connected: boolean) => void;
} = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const websocketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();
  
  const {
    reconnect = true,
    maxRetries = 5,
    retryInterval = 1000,
    onMessage,
    onConnectionChange
  } = options;

  const connectWebSocket = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsPath = path || "/ws";
    const wsUrl = `${protocol}//${window.location.host}${wsPath}`;
    
    console.log(`[WebSocket] Connecting to ${wsUrl}...`);
    
    const ws = new WebSocket(wsUrl);
    websocketRef.current = ws;

    ws.onopen = () => {
      console.log(`[WebSocket] Connected to ${wsPath}`);
      setIsConnected(true);
      setReconnectAttempts(0);
      onConnectionChange?.(true);
      
      // Clear any pending reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    ws.onmessage = (event) => {
      setLastMessage(event.data);
      
      try {
        const data = JSON.parse(event.data);
        console.log(`[WebSocket] Message received:`, data);
        
        // Call custom message handler if provided
        onMessage?.(data);

        // Handle system messages
        switch (data.type) {
          case "session_created":
          case "session_updated":
          case "session_deleted":
          case "session_update":
            queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
            queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });
            break;
          
          case "task_updated":
          case "task_completed":
          case "task_failed":
            queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
            break;

          case "agent_connected":
          case "agent_disconnected":
          case "agent_error":
            queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
            break;

          case "script_execution_started":
          case "script_output":
          case "script_execution_completed":
            // Handle script execution updates
            console.log("[WebSocket] Script execution update:", data);
            break;

          case "browser_update":
          case "stream_ready":
          case "metrics_update":
          case "heartbeat":
            // Handle session-specific updates (don't invalidate queries)
            break;

          case "status":
          case "progress":
          case "error":
          case "log":
          case "browser":
            // Handle streaming system messages
            break;

          default:
            console.log(`[WebSocket] Unknown message type: ${data.type}`);
        }
      } catch (error) {
        console.error(`[WebSocket] Failed to parse message:`, error);
      }
    };

    ws.onclose = (event) => {
      console.log(`[WebSocket] Disconnected from ${wsPath}:`, event.code, event.reason);
      setIsConnected(false);
      onConnectionChange?.(false);
      
      // Attempt reconnection if enabled and not a normal close
      if (reconnect && event.code !== 1000 && reconnectAttempts < maxRetries) {
        const delay = Math.min(retryInterval * Math.pow(2, reconnectAttempts), 30000); // Max 30 seconds
        console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1}/${maxRetries})`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          setReconnectAttempts(prev => prev + 1);
          connectWebSocket();
        }, delay);
      } else if (reconnectAttempts >= maxRetries) {
        console.error(`[WebSocket] Max reconnection attempts reached for ${wsPath}`);
      }
    };

    ws.onerror = (error) => {
      console.error(`[WebSocket] Error on ${wsPath}:`, error);
    };
  }, [path, reconnect, maxRetries, retryInterval, reconnectAttempts, queryClient, onMessage, onConnectionChange]);

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      websocketRef.current?.close(1000, 'Component unmounting');
    };
  }, [connectWebSocket]);

  const sendMessage = useCallback((message: any) => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      try {
        websocketRef.current.send(JSON.stringify(message));
        console.log(`[WebSocket] Message sent:`, message);
        return true;
      } catch (error) {
        console.error(`[WebSocket] Failed to send message:`, error);
        return false;
      }
    } else {
      console.warn(`[WebSocket] Cannot send message - connection not open (state: ${websocketRef.current?.readyState})`);
      return false;
    }
  }, []);
  
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    websocketRef.current?.close(1000, 'Manual disconnect');
  }, []);
  
  const reconnectNow = useCallback(() => {
    setReconnectAttempts(0);
    disconnect();
    setTimeout(() => connectWebSocket(), 100);
  }, [connectWebSocket, disconnect]);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    disconnect,
    reconnectNow,
    reconnectAttempts
  };
}

// Hook for session-specific WebSocket connections
export function useSessionWebSocket(sessionId: string | null, options?: {
  onScreenshot?: (data: any) => void;
  onBrowserUpdate?: (data: any) => void;
  onError?: (error: any) => void;
}) {
  const { onScreenshot, onBrowserUpdate, onError } = options || {};
  
  return useWebSocket(sessionId ? `/ws/stream/browser/${sessionId}` : undefined, {
    reconnect: true,
    maxRetries: 10,
    onMessage: (data) => {
      switch (data.type) {
        case 'browser':
          if (data.data.action === 'screenshot') {
            onScreenshot?.(data);
          } else {
            onBrowserUpdate?.(data);
          }
          break;
        case 'error':
          onError?.(data);
          break;
      }
    }
  });
}

// Hook for agent status streaming
export function useAgentWebSocket(agentId?: string, options?: {
  onStatusChange?: (data: any) => void;
  onProgress?: (data: any) => void;
  onError?: (error: any) => void;
}) {
  const { onStatusChange, onProgress, onError } = options || {};
  
  return useWebSocket('/ws/stream/agents', {
    reconnect: true,
    onMessage: (data) => {
      // Filter messages for specific agent if provided
      if (agentId && data.agentId && data.agentId !== agentId) {
        return;
      }
      
      switch (data.type) {
        case 'status':
          onStatusChange?.(data);
          break;
        case 'progress':
          onProgress?.(data);
          break;
        case 'error':
          onError?.(data);
          break;
      }
    }
  });
}

// Hook for task progress streaming
export function useTaskWebSocket(taskId?: string, options?: {
  onProgress?: (data: any) => void;
  onComplete?: (data: any) => void;
  onError?: (error: any) => void;
}) {
  const { onProgress, onComplete, onError } = options || {};
  
  return useWebSocket('/ws/stream/tasks', {
    reconnect: true,
    onMessage: (data) => {
      // Filter messages for specific task if provided
      if (taskId && data.taskId && data.taskId !== taskId) {
        return;
      }
      
      switch (data.type) {
        case 'progress':
          onProgress?.(data);
          break;
        case 'system':
          if (data.data?.event === 'task_completed') {
            onComplete?.(data);
          }
          break;
        case 'error':
          onError?.(data);
          break;
      }
    }
  });
}

// Hook for log streaming
export function useLogWebSocket(options?: {
  onLog?: (data: any) => void;
  onError?: (error: any) => void;
  filters?: {
    levels?: string[];
    sources?: string[];
    agents?: string[];
  };
}) {
  const { onLog, onError, filters } = options || {};
  
  return useWebSocket('/ws/stream/logs', {
    reconnect: true,
    onMessage: (data) => {
      // Apply filters if specified
      if (filters?.levels && !filters.levels.includes(data.data?.level)) {
        return;
      }
      if (filters?.sources && !filters.sources.includes(data.source)) {
        return;
      }
      if (filters?.agents && data.agentId && !filters.agents.includes(data.agentId)) {
        return;
      }
      
      switch (data.type) {
        case 'log':
        case 'error':
          onLog?.(data);
          break;
        case 'error':
          onError?.(data);
          break;
      }
    }
  });
}

// Hook for general application WebSocket
export function useAppWebSocket(options?: {
  onMessage?: (data: any) => void;
  onConnectionChange?: (connected: boolean) => void;
}) {
  return useWebSocket('/ws', {
    reconnect: true,
    ...options
  });
}

// Enhanced streaming WebSocket hook
export function useStreamingWebSocket(streamType: 'agents' | 'tasks' | 'browser' | 'logs' | 'all' = 'all', options?: {
  subscriptions?: string[];
  filters?: Record<string, any>;
  onMessage?: (data: any) => void;
  onConnectionChange?: (connected: boolean) => void;
}) {
  const { subscriptions = [], filters = {}, onMessage, onConnectionChange } = options || {};
  const path = streamType === 'all' ? '/ws/stream' : `/ws/stream/${streamType}`;
  
  const { sendMessage, ...rest } = useWebSocket(path, {
    reconnect: true,
    maxRetries: 10,
    onMessage,
    onConnectionChange
  });
  
  // Setup subscriptions and filters on connection
  useEffect(() => {
    if (rest.isConnected && sendMessage) {
      // Send subscriptions
      for (const subscription of subscriptions) {
        sendMessage({
          type: 'subscribe',
          payload: { resourceType: subscription.split(':')[0], resourceId: subscription.split(':')[1] }
        });
      }
      
      // Send filters
      if (Object.keys(filters).length > 0) {
        sendMessage({
          type: 'filter',
          payload: filters
        });
      }
    }
  }, [rest.isConnected, sendMessage, subscriptions, filters]);
  
  const subscribe = useCallback((resourceType: string, resourceId?: string) => {
    sendMessage({
      type: 'subscribe',
      payload: { resourceType, resourceId }
    });
  }, [sendMessage]);
  
  const unsubscribe = useCallback((resourceType: string, resourceId?: string) => {
    sendMessage({
      type: 'unsubscribe',
      payload: { resourceType, resourceId }
    });
  }, [sendMessage]);
  
  const updateFilters = useCallback((newFilters: Record<string, any>) => {
    sendMessage({
      type: 'filter',
      payload: newFilters
    });
  }, [sendMessage]);
  
  return {
    ...rest,
    sendMessage,
    subscribe,
    unsubscribe,
    updateFilters
  };
}