```typescript
import { useEffect, useState, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import { BehaviorSubject, Observable } from 'rxjs';
import { Agent } from '../model/types';
import { AgentSchema, AgentListResponseSchema } from '../model/zod';

const WS_BASE_URL = import.meta.env.VITE_WS_BASE || 'ws://localhost:3002';
const MOCK_WS = import.meta.env.VITE_API_MOCK === '1';

interface AgentWsEvents {
  'agent:status': { agentId: string; status: 'running' | 'stopped' | 'error' | 'deploying'; latency?: number };
  'agent:health': { agentId: string; health: 'healthy' | 'degraded' | 'unhealthy'; message?: string };
  'agent:log': { agentId: string; timestamp: string; level: string; message: string };
  'agent:metrics': { agentId: string; cpu: number; memory: number; rps: number; timestamp: string };
  'agents:list:update': Agent[];
}

interface AgentWsService {
  socket: Socket | null;
  isConnected: boolean;
  agentStatus$: Observable<AgentWsEvents['agent:status']>;
  agentHealth$: Observable<AgentWsEvents['agent:health']>;
  agentLog$: Observable<AgentWsEvents['agent:log']>;
  agentMetrics$: Observable<AgentWsEvents['agent:metrics']>;
  agentsListUpdate$: Observable<AgentWsEvents['agents:list:update']>;
  subscribeAgent: (agentId: string) => void;
  unsubscribeAgent: (agentId: string) => void;
}

const agentStatusSubject = new BehaviorSubject<AgentWsEvents['agent:status'] | null>(null);
const agentHealthSubject = new BehaviorSubject<AgentWsEvents['agent:health'] | null>(null);
const agentLogSubject = new BehaviorSubject<AgentWsEvents['agent:log'] | null>(null);
const agentMetricsSubject = new BehaviorSubject<AgentWsEvents['agent:metrics'] | null>(null);
const agentsListUpdateSubject = new BehaviorSubject<AgentWsEvents['agents:list:update'] | null>(null);

export function useAgentsWs(): AgentWsService {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (MOCK_WS) {
      // Simulate WebSocket connection and events for mock API
      setIsConnected(true);
      console.log('Mock WS: Simulating connection');

      const mockAgents = [
        { id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef', name: 'Browser Use Agent', status: 'running', latency: 85 },
        { id: 'f0e9d8c7-b6a5-4321-9876-543210fedcba', name: 'Ollama Local LLM', status: 'running', latency: 12 },
        { id: '1a2b3c4d-5e6f-7890-abcd-ef1234567890', name: 'Degraded Agent', status: 'error', latency: 500 },
        { id: '9f8e7d6c-5b4a-3210-fedc-ba9876543210', name: 'Stopped Agent', status: 'stopped' },
      ];

      let logInterval: NodeJS.Timeout;
      let statusInterval: NodeJS.Timeout;
      let metricsInterval: NodeJS.Timeout;

      const startMockEvents = () => {
        logInterval = setInterval(() => {
          const randomAgent = mockAgents[Math.floor(Math.random() * mockAgents.length)];
          agentLogSubject.next({
            agentId: randomAgent.id,
            timestamp: new Date().toISOString(),
            level: Math.random() > 0.7 ? 'error' : 'info',
            message: `Mock log from ${randomAgent.name}: Event at ${new Date().toLocaleTimeString()}`,
          });
        }, 2000);

        statusInterval = setInterval(() => {
          const updatedAgents = mockAgents.map(agent => {
            if (Math.random() > 0.7) { // 30% chance to change status
              const statuses = ['running', 'stopped', 'error'];
              const newStatus = statuses[Math.floor(Math.random() * statuses.length)];
              const newLatency = newStatus === 'running' ? Math.floor(50 + Math.random() * 200) : undefined;
              agentStatusSubject.next({ agentId: agent.id, status: newStatus, latency: newLatency });
              return { ...agent, status: newStatus, latency: newLatency };
            }
            return agent;
          });
          agentsListUpdateSubject.next(AgentListResponseSchema.parse(updatedAgents));
        }, 5000);

        metricsInterval = setInterval(() => {
          mockAgents.forEach(agent => {
            if (agent.status === 'running') {
              agentMetricsSubject.next({
                agentId: agent.id,
                cpu: parseFloat((Math.random() * 100).toFixed(2)),
                memory: parseFloat((Math.random() * 1024).toFixed(2)),
                rps: parseFloat((Math.random() * 50).toFixed(2)),
                timestamp: new Date().toISOString(),
              });
            }
          });
        }, 3000);
      };

      startMockEvents();

      return () => {
        clearInterval(logInterval);
        clearInterval(statusInterval);
        clearInterval(metricsInterval);
        console.log('Mock WS: Disconnected');
      };
    } else {
      // Real WebSocket connection
      const ws = io(`${WS_BASE_URL}/agents`, {
        transports: ['websocket'],
      });

      ws.on('connect', () => {
        setIsConnected(true);
        console.log('Connected to agent WS namespace');
      });

      ws.on('disconnect', () => {
        setIsConnected(false);
        console.log('Disconnected from agent WS namespace');
      });

      ws.on('connect_error', (err) => {
        console.error('Agent WS connection error:', err.message);
      });

      ws.on('agent:status', (data: any) => {
        agentStatusSubject.next(data);
      });

      ws.on('agent:health', (data: any) => {
        agentHealthSubject.next(data);
      });

      ws.on('agent:log', (data: any) => {
        agentLogSubject.next(data);
      });

      ws.on('agent:metrics', (data: any) => {
        agentMetricsSubject.next(data);
      });

      ws.on('agents:list:update', (data: any) => {
        try {
          const parsedData = AgentListResponseSchema.parse(data);
          agentsListUpdateSubject.next(parsedData);
        } catch (error) {
          console.error('Failed to parse agents:list:update', error);
        }
      });

      setSocket(ws);

      return () => {
        ws.disconnect();
      };
    }
  }, []);

  const subscribeAgent = useCallback((agentId: string) => {
    if (socket && !MOCK_WS) {
      socket.emit('subscribeAgent', agentId);
      console.log(`Subscribed to agent: ${agentId}`);
    } else if (MOCK_WS) {
      console.log(`Mock WS: Subscribed to agent: ${agentId}`);
      // In mock, all agent data is already being pushed, no specific subscription needed
    }
  }, [socket]);

  const unsubscribeAgent = useCallback((agentId: string) => {
    if (socket && !MOCK_WS) {
      socket.emit('unsubscribeAgent', agentId);
      console.log(`Unsubscribed from agent: ${agentId}`);
    } else if (MOCK_WS) {
      console.log(`Mock WS: Unsubscribed from agent: ${agentId}`);
    }
  }, [socket]);

  return {
    socket,
    isConnected,
    agentStatus$: agentStatusSubject.asObservable() as Observable<AgentWsEvents['agent:status']>,
    agentHealth$: agentHealthSubject.asObservable() as Observable<AgentWsEvents['agent:health']>,
    agentLog$: agentLogSubject.asObservable() as Observable<AgentWsEvents['agent:log']>,
    agentMetrics$: agentMetricsSubject.asObservable() as Observable<AgentWsEvents['agent:metrics']>,
    agentsListUpdate$: agentsListUpdateSubject.asObservable() as Observable<AgentWsEvents['agents:list:update']>,
    subscribeAgent,
    unsubscribeAgent,
  };
}
```