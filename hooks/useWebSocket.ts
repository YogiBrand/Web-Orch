/**
 * React hooks for WebSocket integration
 * Provides easy-to-use hooks for real-time communication in React components
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { getWebSocketClient, type WebSocketMessage, type SubscriptionCallback } from '../lib/websocket-client';

interface UseWebSocketOptions {
  autoConnect?: boolean;
  debug?: boolean;
}

interface WebSocketConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  clientId?: string;
  reconnectAttempts: number;
  lastHeartbeat: number;
  queuedMessages: number;
}

/**
 * Main WebSocket hook for establishing connection and managing state
 */
export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { autoConnect = true, debug = false } = options;
  const [connectionState, setConnectionState] = useState<WebSocketConnectionState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    reconnectAttempts: 0,
    lastHeartbeat: 0,
    queuedMessages: 0
  });

  const wsClient = useRef(getWebSocketClient({ debug }));
  const statusUpdateInterval = useRef<number>();

  const updateConnectionStatus = useCallback(() => {
    const status = wsClient.current.getConnectionStatus();
    setConnectionState(prev => ({
      ...prev,
      isConnected: status.isConnected,
      clientId: status.clientId,
      reconnectAttempts: status.reconnectAttempts,
      lastHeartbeat: status.lastHeartbeat,
      queuedMessages: status.queuedMessages
    }));
  }, []);

  const connect = useCallback(async () => {
    setConnectionState(prev => ({ ...prev, isConnecting: true, error: null }));
    
    try {
      await wsClient.current.connect();
      updateConnectionStatus();
    } catch (error) {
      setConnectionState(prev => ({
        ...prev,
        error: error instanceof Error ? error : new Error('Connection failed'),
        isConnecting: false
      }));
    }
  }, [updateConnectionStatus]);

  const disconnect = useCallback(() => {
    wsClient.current.disconnect();
    updateConnectionStatus();
  }, [updateConnectionStatus]);

  const sendMessage = useCallback((message: Omit<WebSocketMessage, 'id' | 'timestamp'>) => {
    const fullMessage: WebSocketMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      timestamp: new Date().toISOString(),
      ...message
    };
    
    return wsClient.current.sendMessage(fullMessage);
  }, []);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Update connection status periodically
    statusUpdateInterval.current = window.setInterval(updateConnectionStatus, 1000);

    return () => {
      if (statusUpdateInterval.current) {
        clearInterval(statusUpdateInterval.current);
      }
    };
  }, [autoConnect, connect, updateConnectionStatus]);

  return {
    ...connectionState,
    connect,
    disconnect,
    sendMessage
  };
}

/**
 * Hook for subscribing to WebSocket messages
 */
export function useWebSocketSubscription(
  topic: string,
  callback: SubscriptionCallback,
  enabled: boolean = true
) {
  const wsClient = useRef(getWebSocketClient());
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled) return;

    unsubscribeRef.current = wsClient.current.subscribe(topic, callback);

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [topic, callback, enabled]);

  return {
    unsubscribe: useCallback(() => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    }, [])
  };
}

/**
 * Hook for real-time session monitoring
 */
export function useSessionWebSocket(sessionId: string | null) {
  const [sessionData, setSessionData] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const handleSessionMessage = useCallback((message: WebSocketMessage) => {
    setLastUpdate(new Date());

    switch (message.type) {
      case 'session_update':
        setSessionData(message.data);
        break;
      
      case 'session_log':
        setLogs(prev => [...prev, message.data].slice(-100)); // Keep last 100 logs
        break;
      
      case 'session_metrics':
        setMetrics(message.data);
        break;
      
      case 'session_progress':
        setSessionData(prev => prev ? { ...prev, progress: message.data.progress } : message.data);
        break;
    }
  }, []);

  useWebSocketSubscription(
    sessionId ? `session:${sessionId}` : '',
    handleSessionMessage,
    !!sessionId
  );

  const wsClient = useRef(getWebSocketClient());

  useEffect(() => {
    if (!sessionId) return;

    const unsubscribe = wsClient.current.subscribeToSession(sessionId, handleSessionMessage);
    return unsubscribe;
  }, [sessionId, handleSessionMessage]);

  return {
    sessionData,
    logs,
    metrics,
    lastUpdate,
    clearLogs: useCallback(() => setLogs([]), [])
  };
}

/**
 * Hook for real-time agent monitoring
 */
export function useAgentWebSocket(agentId: string | null) {
  const [agentStatus, setAgentStatus] = useState<any>(null);
  const [agentTasks, setAgentTasks] = useState<any[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const handleAgentMessage = useCallback((message: WebSocketMessage) => {
    setLastUpdate(new Date());

    switch (message.type) {
      case 'agent_update':
      case 'agent_status':
        setAgentStatus(message.data);
        break;
      
      case 'agent_task_start':
        setAgentTasks(prev => [...prev, message.data]);
        break;
      
      case 'agent_task_complete':
        setAgentTasks(prev => 
          prev.map(task => 
            task.id === message.data.taskId 
              ? { ...task, status: 'completed', result: message.data.result }
              : task
          )
        );
        break;
      
      case 'agent_task_error':
        setAgentTasks(prev => 
          prev.map(task => 
            task.id === message.data.taskId 
              ? { ...task, status: 'error', error: message.data.error }
              : task
          )
        );
        break;
    }
  }, []);

  const wsClient = useRef(getWebSocketClient());

  useEffect(() => {
    if (!agentId) return;

    const unsubscribe = wsClient.current.subscribeToAgent(agentId, handleAgentMessage);
    return unsubscribe;
  }, [agentId, handleAgentMessage]);

  return {
    agentStatus,
    agentTasks,
    lastUpdate,
    clearTasks: useCallback(() => setAgentTasks([]), [])
  };
}

/**
 * Hook for real-time system monitoring
 */
export function useSystemWebSocket() {
  const [systemMetrics, setSystemMetrics] = useState<any>(null);
  const [systemAlerts, setSystemAlerts] = useState<any[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const handleSystemMessage = useCallback((message: WebSocketMessage) => {
    setLastUpdate(new Date());

    switch (message.type) {
      case 'system_metrics':
        setSystemMetrics(message.data);
        break;
      
      case 'system_alert':
        setSystemAlerts(prev => [...prev, message.data].slice(-50)); // Keep last 50 alerts
        break;
      
      case 'system_status':
        setSystemMetrics(prev => prev ? { ...prev, status: message.data } : message.data);
        break;
    }
  }, []);

  useWebSocketSubscription('system', handleSystemMessage);

  return {
    systemMetrics,
    systemAlerts,
    lastUpdate,
    clearAlerts: useCallback(() => setSystemAlerts([]), [])
  };
}

/**
 * Hook for broadcasting messages to other clients
 */
export function useWebSocketBroadcast() {
  const { sendMessage } = useWebSocket({ autoConnect: false });

  const broadcastSessionUpdate = useCallback((sessionId: string, data: any) => {
    return sendMessage({
      type: 'session_update',
      sessionId,
      data,
      priority: 'normal'
    });
  }, [sendMessage]);

  const broadcastAgentUpdate = useCallback((agentId: string, data: any) => {
    return sendMessage({
      type: 'agent_update',
      agentId,
      data,
      priority: 'normal'
    });
  }, [sendMessage]);

  const broadcastTaskProgress = useCallback((taskId: string, progress: any) => {
    return sendMessage({
      type: 'task_progress',
      taskId,
      data: progress,
      priority: 'normal'
    });
  }, [sendMessage]);

  const broadcastSystemAlert = useCallback((alert: any) => {
    return sendMessage({
      type: 'system_alert',
      data: alert,
      priority: 'high'
    });
  }, [sendMessage]);

  return {
    broadcastSessionUpdate,
    broadcastAgentUpdate,
    broadcastTaskProgress,
    broadcastSystemAlert
  };
}

/**
 * Hook for WebSocket connection testing and debugging
 */
export function useWebSocketDebug() {
  const { sendMessage, isConnected } = useWebSocket();
  const [testResults, setTestResults] = useState<any[]>([]);

  const runConnectionTest = useCallback(async () => {
    const testId = `test_${Date.now()}`;
    const startTime = Date.now();

    const result = sendMessage({
      type: 'connection_test',
      data: { testId, startTime },
      priority: 'low'
    });

    const testResult = {
      id: testId,
      sent: result,
      timestamp: new Date().toISOString(),
      latency: null,
      success: result
    };

    setTestResults(prev => [...prev, testResult].slice(-10)); // Keep last 10 tests
    return testResult;
  }, [sendMessage]);

  const runEchoTest = useCallback((message: string) => {
    const testId = `echo_${Date.now()}`;
    const startTime = Date.now();

    const result = sendMessage({
      type: 'echo_test',
      data: { testId, message, startTime },
      priority: 'low'
    });

    return {
      id: testId,
      sent: result,
      timestamp: new Date().toISOString()
    };
  }, [sendMessage]);

  return {
    isConnected,
    testResults,
    runConnectionTest,
    runEchoTest,
    clearTestResults: useCallback(() => setTestResults([]), [])
  };
}