import { useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

// Enhanced Message Types for WebOrchestrator
export interface WebSocketMessage {
  id: string;
  type: string;
  timestamp: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  data: any;
}

export interface SessionStatusMessage extends WebSocketMessage {
  type: 'session-status-changed';
  sessionId: string;
  data: {
    status: 'created' | 'running' | 'paused' | 'completed' | 'error' | 'terminated';
    previousStatus?: string;
    timestamp: string;
    reason?: string;
    errorDetails?: any;
    progress?: {
      percentage: number;
      currentStep: string;
      totalSteps: number;
    };
  };
}

export interface SessionMetricsMessage extends WebSocketMessage {
  type: 'session-metrics-updated';
  sessionId: string;
  data: {
    cpu: number;
    memory: number;
    networkIn: number;
    networkOut: number;
    requestCount: number;
    responseTime: number;
    timestamp: string;
    gridNodeId?: string;
  };
}

export interface SessionActionLogMessage extends WebSocketMessage {
  type: 'session-action-logged';
  sessionId: string;
  data: {
    action: string;
    element?: string;
    url?: string;
    timestamp: string;
    screenshot?: string;
    success: boolean;
    duration: number;
    details?: any;
  };
}

export interface RecordingProgressMessage extends WebSocketMessage {
  type: 'recording-progress-updated';
  sessionId: string;
  recordingId: string;
  data: {
    progress: number;
    totalFrames?: number;
    currentFrame?: number;
    fileSize: number;
    duration: number;
    status: 'recording' | 'paused' | 'stopped' | 'processing' | 'ready';
    url?: string;
    timestamp: string;
  };
}

export interface GridNodeStatusMessage extends WebSocketMessage {
  type: 'grid-node-status-changed';
  nodeId: string;
  data: {
    status: 'online' | 'offline' | 'busy' | 'error';
    activeSessions: number;
    maxSessions: number;
    cpu: number;
    memory: number;
    uptime: number;
    browserVersions: Record<string, string>;
    timestamp: string;
  };
}

export interface SessionScreenshotMessage extends WebSocketMessage {
  type: 'session-screenshot-ready';
  sessionId: string;
  data: {
    screenshot: string; // base64 encoded
    timestamp: string;
    url: string;
    dimensions: {
      width: number;
      height: number;
    };
    elements?: Array<{
      selector: string;
      bounds: { x: number; y: number; width: number; height: number };
      highlighted?: boolean;
    }>;
  };
}

// Message handler type
export type MessageHandler = (message: WebSocketMessage) => void;

interface WebSocketOptions {
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  messageQueue?: boolean;
  heartbeat?: boolean;
  heartbeatInterval?: number;
}

export function useWebSocket(path?: string, options: WebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [messageQueue, setMessageQueue] = useState<any[]>([]);
  
  const websocketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const messageHandlersRef = useRef<Map<string, MessageHandler[]>>(new Map());
  
  const queryClient = useQueryClient();

  const {
    reconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 10,
    messageQueue: enableMessageQueue = true,
    heartbeat = true,
    heartbeatInterval = 30000
  } = options;

  const connect = useCallback(() => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    // Normalize path: backend serves WebSockets at '/ws' only
    const wsPath = '/ws';
    const envWs = import.meta.env.VITE_WS_BASE_URL;
    
    let wsUrl: string;
    if (envWs) {
      // If environment variable is a full URL, use it but normalize to '/ws'
      if (envWs.startsWith('ws://') || envWs.startsWith('wss://')) {
        wsUrl = envWs.endsWith('/ws') ? envWs : `${envWs.replace(/\/$/, '')}/ws`;
      } else {
        // It's a path, construct full URL to '/ws'
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const host = window.location.host;
        const base = envWs.replace(/\/$/, '');
        wsUrl = `${protocol}//${host}${base === '' ? '' : base}/ws`;
      }
    } else {
      // Auto-detect based on current location and route through same-origin proxy
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host; // includes port
      wsUrl = `${protocol}//${host}/ws`;
    }
    
    const httpOrigin = (() => {
      try {
        const u = new URL(wsUrl);
        const httpProtocol = u.protocol === 'wss:' ? 'https:' : 'http:';
        return `${httpProtocol}//${u.host}`;
      } catch {
        return '';
      }
    })();

    const attemptConnect = async () => {
      const offlineMode = (((import.meta as any).env?.VITE_API_OFFLINE_MODE as string) || '').toLowerCase() === 'true';
      if (offlineMode) {
        setConnectionStatus('disconnected');
        return;
      }
      // Preflight: avoid triggering browser WS errors if backend is down
      try {
        if (httpOrigin) {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 800);
          const res = await fetch(`${httpOrigin}/health`, { signal: controller.signal, credentials: 'include' });
          clearTimeout(timeout);
          if (!res.ok) throw new Error('Health not OK');
        }
      } catch {
        // Skip connecting now; schedule reconnection if enabled
        if (reconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          setConnectionStatus('disconnected');
          reconnectTimeoutRef.current = setTimeout(() => connect(), reconnectInterval);
        } else {
          setConnectionStatus('disconnected');
        }
        return;
      }

      console.log(`[WebSocket] Connecting to ${wsUrl}`);
      setConnectionStatus('connecting');

      const ws = new WebSocket(wsUrl);
      websocketRef.current = ws;

      ws.onopen = () => {
        console.log(`[WebSocket] Connected to ${wsPath}`);
        setIsConnected(true);
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;
      
      // Send queued messages
      if (enableMessageQueue && messageQueue.length > 0) {
        messageQueue.forEach(message => {
          ws.send(JSON.stringify(message));
        });
        setMessageQueue([]);
      }
      
      // Start heartbeat
      if (heartbeat) {
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'heartbeat', timestamp: Date.now() }));
          }
        }, heartbeatInterval);
      }
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
        
        // Handle system messages (ignore heartbeat and pong noise)
        if (message.type === 'heartbeat' || message.type === 'pong') {
          return; // Ignore heartbeat responses
        }
        
        console.log(`[WebSocket] Message received:`, message);

        // Handle legacy message types for backward compatibility
        handleLegacyMessages(message);
        
        // Handle enhanced message types
        handleEnhancedMessages(message);
        
        // Call registered message handlers
        const handlers = messageHandlersRef.current.get(message.type) || [];
        handlers.forEach(handler => handler(message));
        
        // Call global handlers
        const globalHandlers = messageHandlersRef.current.get('*') || [];
        globalHandlers.forEach(handler => handler(message));
        
      } catch (error) {
        console.error("[WebSocket] Failed to parse message:", error);
      }
      };

      ws.onclose = (event) => {
        console.log(`[WebSocket] Disconnected from ${wsPath}`, event.code, event.reason);
        setIsConnected(false);
        setConnectionStatus('disconnected');
      
      // Clear heartbeat
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      
      // Attempt reconnection
      if (reconnect && reconnectAttemptsRef.current < maxReconnectAttempts && !event.wasClean) {
        reconnectAttemptsRef.current++;
        console.log(`[WebSocket] Reconnection attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, reconnectInterval);
      }
      };

      ws.onerror = (error) => {
        console.warn(`[WebSocket] Error:`, error);
        setConnectionStatus('error');
      };
    };

    void attemptConnect();

  }, [path, reconnect, reconnectInterval, maxReconnectAttempts, enableMessageQueue, messageQueue, heartbeat, heartbeatInterval]);

  const handleLegacyMessages = (message: WebSocketMessage) => {
    switch (message.type) {
      case "session_created":
      case "session_updated":
      case "session_deleted":
      case "session_update":
      case "session-status-changed":
        queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
        queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });
        break;
      
      case "task_updated":
      case "task_completed":
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        break;

      case "script_execution_started":
      case "script_output":
      case "script_execution_completed":
        console.log("Script execution update:", message.data);
        break;

      case "browser_update":
      case "stream_ready":
      case "metrics_update":
      case "session-metrics-updated":
        // Handle session-specific updates (don't invalidate queries)
        break;
    }
  };

  const handleEnhancedMessages = (message: WebSocketMessage) => {
    switch (message.type) {
      case 'session-status-changed':
        const statusMsg = message as SessionStatusMessage;
        // Update specific session cache if needed
        queryClient.setQueryData(["/api/sessions", statusMsg.sessionId], (oldData: any) => {
          if (oldData) {
            return { ...oldData, status: statusMsg.data.status };
          }
          return oldData;
        });
        break;
        
      case 'session-metrics-updated':
        // Handle real-time metrics updates
        break;
        
      case 'session-action-logged':
        // Handle action logs
        break;
        
      case 'recording-progress-updated':
        // Handle recording progress
        break;
        
      case 'grid-node-status-changed':
        // Handle grid node status changes
        queryClient.invalidateQueries({ queryKey: ["/api/grid/status"] });
        break;
        
      case 'session-screenshot-ready':
        // Handle screenshot updates
        break;
    }
  };

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    
    if (websocketRef.current) {
      websocketRef.current.close(1000, 'Manual disconnect');
      websocketRef.current = null;
    }
    
    setIsConnected(false);
    setConnectionStatus('disconnected');
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify(message));
    } else if (enableMessageQueue) {
      setMessageQueue(prev => [...prev, message]);
    } else {
      console.warn("[WebSocket] Cannot send message - not connected and queue disabled");
    }
  }, [enableMessageQueue]);

  const addMessageHandler = useCallback((messageType: string, handler: MessageHandler) => {
    const current = messageHandlersRef.current.get(messageType) || [];
    messageHandlersRef.current.set(messageType, [...current, handler]);
  }, []);

  const removeMessageHandler = useCallback((messageType: string, handler: MessageHandler) => {
    const current = messageHandlersRef.current.get(messageType) || [];
    const filtered = current.filter(h => h !== handler);
    if (filtered.length > 0) {
      messageHandlersRef.current.set(messageType, filtered);
    } else {
      messageHandlersRef.current.delete(messageType);
    }
  }, []);

  // Connect on mount
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    connectionStatus,
    lastMessage,
    sendMessage,
    connect,
    disconnect,
    addMessageHandler,
    removeMessageHandler,
    messageQueue: messageQueue.length,
  };
}

// Enhanced WebSocket hooks for specific channels

// Hook for session-specific WebSocket connections with enhanced features
export function useSessionWebSocket(sessionId: string | null, options: WebSocketOptions = {}) {
  return useWebSocket(
    sessionId ? `/ws/sessions/${sessionId}` : undefined,
    {
      reconnect: true,
      heartbeat: true,
      messageQueue: true,
      ...options
    }
  );
}

// Hook for all sessions monitoring
export function useSessionsWebSocket(options: WebSocketOptions = {}) {
  return useWebSocket('/ws/sessions', {
    reconnect: true,
    heartbeat: true,
    ...options
  });
}

// Hook for Grid status monitoring
export function useGridWebSocket(options: WebSocketOptions = {}) {
  return useWebSocket('/ws/grid', {
    reconnect: true,
    heartbeat: true,
    ...options
  });
}

// Hook for recording progress
export function useRecordingWebSocket(recordingId: string | null, options: WebSocketOptions = {}) {
  return useWebSocket(
    recordingId ? `/ws/recordings/${recordingId}` : undefined,
    {
      reconnect: true,
      heartbeat: true,
      ...options
    }
  );
}

// Hook for system metrics
export function useMetricsWebSocket(options: WebSocketOptions = {}) {
  return useWebSocket('/ws/metrics', {
    reconnect: true,
    heartbeat: true,
    ...options
  });
}

// Hook for system logs
export function useLogsWebSocket(options: WebSocketOptions = {}) {
  return useWebSocket('/ws/logs', {
    reconnect: true,
    heartbeat: true,
    ...options
  });
}

// Hook for general application WebSocket (legacy support)
export function useAppWebSocket(options: WebSocketOptions = {}) {
  return useWebSocket('/ws', options);
}

// Specialized hook for session monitoring with state management
export function useSessionMonitor(sessionId: string | null) {
  const [sessionStatus, setSessionStatus] = useState<string>('unknown');
  const [sessionMetrics, setSessionMetrics] = useState<SessionMetricsMessage['data'] | null>(null);
  const [lastAction, setLastAction] = useState<SessionActionLogMessage['data'] | null>(null);
  const [lastScreenshot, setLastScreenshot] = useState<string | null>(null);
  
  const { isConnected, connectionStatus, sendMessage, addMessageHandler, removeMessageHandler } = useSessionWebSocket(sessionId, {
    reconnect: true,
    heartbeat: true,
  });

  useEffect(() => {
    if (!sessionId) return;

    const handleSessionStatus = (message: WebSocketMessage) => {
      const statusMsg = message as SessionStatusMessage;
      if (statusMsg.sessionId === sessionId) {
        setSessionStatus(statusMsg.data.status);
      }
    };

    const handleSessionMetrics = (message: WebSocketMessage) => {
      const metricsMsg = message as SessionMetricsMessage;
      if (metricsMsg.sessionId === sessionId) {
        setSessionMetrics(metricsMsg.data);
      }
    };

    const handleSessionAction = (message: WebSocketMessage) => {
      const actionMsg = message as SessionActionLogMessage;
      if (actionMsg.sessionId === sessionId) {
        setLastAction(actionMsg.data);
      }
    };

    const handleSessionScreenshot = (message: WebSocketMessage) => {
      const screenshotMsg = message as SessionScreenshotMessage;
      if (screenshotMsg.sessionId === sessionId) {
        setLastScreenshot(screenshotMsg.data.screenshot);
      }
    };

    addMessageHandler('session-status-changed', handleSessionStatus);
    addMessageHandler('session-metrics-updated', handleSessionMetrics);
    addMessageHandler('session-action-logged', handleSessionAction);
    addMessageHandler('session-screenshot-ready', handleSessionScreenshot);

    return () => {
      removeMessageHandler('session-status-changed', handleSessionStatus);
      removeMessageHandler('session-metrics-updated', handleSessionMetrics);
      removeMessageHandler('session-action-logged', handleSessionAction);
      removeMessageHandler('session-screenshot-ready', handleSessionScreenshot);
    };
  }, [sessionId, addMessageHandler, removeMessageHandler]);

  const requestScreenshot = useCallback(() => {
    if (sessionId && isConnected) {
      sendMessage({
        type: 'request_screenshot',
        payload: { sessionId }
      });
    }
  }, [sessionId, isConnected, sendMessage]);

  const pauseSession = useCallback(() => {
    if (sessionId && isConnected) {
      sendMessage({
        type: 'pause_session',
        payload: { sessionId }
      });
    }
  }, [sessionId, isConnected, sendMessage]);

  const resumeSession = useCallback(() => {
    if (sessionId && isConnected) {
      sendMessage({
        type: 'resume_session',
        payload: { sessionId }
      });
    }
  }, [sessionId, isConnected, sendMessage]);

  const terminateSession = useCallback(() => {
    if (sessionId && isConnected) {
      sendMessage({
        type: 'terminate_session',
        payload: { sessionId }
      });
    }
  }, [sessionId, isConnected, sendMessage]);

  return {
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
  };
}

// Hook for recording monitoring
export function useRecordingMonitor(recordingId: string | null, sessionId: string | null) {
  const [recordingProgress, setRecordingProgress] = useState<RecordingProgressMessage['data'] | null>(null);
  
  const { isConnected, sendMessage, addMessageHandler, removeMessageHandler } = useRecordingWebSocket(recordingId);

  useEffect(() => {
    if (!recordingId) return;

    const handleRecordingProgress = (message: WebSocketMessage) => {
      const progressMsg = message as RecordingProgressMessage;
      if (progressMsg.recordingId === recordingId) {
        setRecordingProgress(progressMsg.data);
      }
    };

    addMessageHandler('recording-progress-updated', handleRecordingProgress);

    return () => {
      removeMessageHandler('recording-progress-updated', handleRecordingProgress);
    };
  }, [recordingId, addMessageHandler, removeMessageHandler]);

  const startRecording = useCallback((options = {}) => {
    if (sessionId && isConnected) {
      sendMessage({
        type: 'start_recording',
        payload: { sessionId, options }
      });
    }
  }, [sessionId, isConnected, sendMessage]);

  const stopRecording = useCallback(() => {
    if (recordingId && sessionId && isConnected) {
      sendMessage({
        type: 'stop_recording',
        payload: { sessionId, recordingId }
      });
    }
  }, [recordingId, sessionId, isConnected, sendMessage]);

  return {
    isConnected,
    recordingProgress,
    startRecording,
    stopRecording,
  };
}

// Hook for Grid monitoring
export function useGridMonitor() {
  const [gridNodes, setGridNodes] = useState<Map<string, GridNodeStatusMessage['data']>>(new Map());
  
  const { isConnected, addMessageHandler, removeMessageHandler } = useGridWebSocket();

  useEffect(() => {
    const handleGridNodeStatus = (message: WebSocketMessage) => {
      const nodeMsg = message as GridNodeStatusMessage;
      setGridNodes(prev => new Map(prev).set(nodeMsg.nodeId, nodeMsg.data));
    };

    addMessageHandler('grid-node-status-changed', handleGridNodeStatus);

    return () => {
      removeMessageHandler('grid-node-status-changed', handleGridNodeStatus);
    };
  }, [addMessageHandler, removeMessageHandler]);

  const gridNodesList = Array.from(gridNodes.entries()).map(([nodeId, data]) => ({
    nodeId,
    ...data
  }));

  const totalSessions = gridNodesList.reduce((sum, node) => sum + node.activeSessions, 0);
  const totalCapacity = gridNodesList.reduce((sum, node) => sum + node.maxSessions, 0);
  const onlineNodes = gridNodesList.filter(node => node.status === 'online').length;

  return {
    isConnected,
    gridNodes: gridNodesList,
    totalSessions,
    totalCapacity,
    onlineNodes,
    totalNodes: gridNodesList.length,
  };
}
