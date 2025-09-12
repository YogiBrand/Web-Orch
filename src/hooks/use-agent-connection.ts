import { useState, useEffect } from "react";

interface AgentMetrics {
  activeTasks: number;
  queuedTasks: number;
  completedToday: number;
  averageResponseTime: number;
  successRate: number;
  cpuUsage?: number;
  memoryUsage?: number;
  lastTaskAt?: string;
}

interface UseAgentConnectionResult {
  status: "active" | "inactive" | "error" | "configuring" | null;
  metrics: AgentMetrics | null;
  isConnected: boolean;
}

export function useAgentConnection(agentId: string): UseAgentConnectionResult {
  const [status, setStatus] = useState<"active" | "inactive" | "error" | "configuring" | null>(null);
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!agentId) {
      setStatus(null);
      setMetrics(null);
      setIsConnected(false);
      return;
    }

    // Create WebSocket connection for real-time updates
    const envWs = import.meta.env.VITE_WS_BASE_URL;
    
    let baseUrl: string;
    if (envWs) {
      // If environment variable is a full URL, use it
      if (envWs.startsWith('ws://') || envWs.startsWith('wss://')) {
        baseUrl = envWs;
      } else {
        // It's a path, construct full URL
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const host = window.location.host;
        baseUrl = `${protocol}//${host}${envWs}`;
      }
    } else {
      // Auto-detect based on current location
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      
      // If on dev frontend (port 3000), connect to backend port 3001
      if (host.includes(':3000')) {
        baseUrl = `${protocol}//${host.replace(':3000', ':3001')}/ws`;
      } else {
        baseUrl = `${protocol}//${host}/ws`;
      }
    }
    
    const broadcastUrl = `${baseUrl}/agents`;
    const legacyUrl = `${baseUrl}/agents/${agentId}`;
    
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;
    let openTimeout: NodeJS.Timeout;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    const attachHandlers = (socket: WebSocket) => {
      socket.onopen = () => {
        setIsConnected(true);
        reconnectAttempts = 0;
        try { socket.send(JSON.stringify({ type: "subscribe:agent", agentId })); } catch {}
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Normalize backend message types from AgentWebSocketServer
          switch (data.type) {
            case "initial:status": {
              const agents = data.data?.agents || [];
              const thisAgent = agents.find((a: any) => a.id === agentId);
              if (thisAgent) setStatus((thisAgent.status as any) || "active");
              break;
            }
            case "agent:status": {
              if (data.agentId === agentId) {
                const wsState = data.data?.websocket;
                const statusValue = data.data?.status || (wsState === "connected" ? "active" : undefined);
                if (statusValue) setStatus(statusValue);
              }
              break;
            }
            case "agent:metrics": {
              if (data.agentId === agentId) setMetrics(data.data as any);
              break;
            }
            case "agent:health": {
              if (data.agentId === agentId) setStatus(data.data?.healthy ? "active" : "error");
              break;
            }
            default:
              break;
          }
        } catch {}
      };

      socket.onclose = () => {
        setIsConnected(false);
        if (reconnectAttempts < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
          reconnectTimeout = setTimeout(() => {
            reconnectAttempts++;
            connect();
          }, delay);
        } else {
          setStatus("error");
        }
      };

      socket.onerror = () => {
        setStatus("error");
        setIsConnected(false);
      };
    };

    const connect = () => {
      try {
        // Try broadcast first
        ws = new WebSocket(broadcastUrl);
        attachHandlers(ws);
        // Fallback to legacy path if no open within 1.5s
        openTimeout = setTimeout(() => {
          if (ws && ws.readyState !== WebSocket.OPEN) {
            try { ws.close(); } catch {}
            ws = new WebSocket(legacyUrl);
            attachHandlers(ws);
          }
        }, 1500);
      } catch {
        // Immediate fallback on constructor error
        try {
          ws = new WebSocket(legacyUrl);
          attachHandlers(ws);
        } catch {}
      }
    };

    // Initial connection
    connect();

    // Cleanup function
    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (openTimeout) clearTimeout(openTimeout);
      try { ws && ws.close(); } catch {}
      setIsConnected(false);
      setStatus(null);
      setMetrics(null);
    };
  }, [agentId]);

  return { status, metrics, isConnected };
}
