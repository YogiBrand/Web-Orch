import type { Agent } from "@/features/agents/model/types";

const base = (import.meta as any)?.env?.VITE_API_BASE_URL || "";
const url = (path: string) => (base ? new URL(path, base).toString() : path);

export const agentsApi = {
  list: async (): Promise<Agent[]> => {
    try {
      const res = await fetch(url("/api/agents"), { credentials: "include" });
      if (res.status === 401 || res.status === 403) return [];
      if (!res.ok) throw new Error(`${res.status}`);
      const result = await res.json();
      // Support both raw array or {success,data}
      const items = Array.isArray(result) ? result : result?.data || [];
      return items.map((a: any) => ({
        id: a.id || a.agentId || crypto.randomUUID(),
        name: a.name || a.title || "Agent",
        type: a.type || "automation",
        runtime: (a.runtime as any) || "hosted",
        status: (a.status === "active" ? "running" : (a.status || "stopped")) as Agent["status"],
        version: a.version || "latest",
        latency: a.averageResponseTime,
        provider: a.team || a.provider || "system",
        created_at: a.createdAt || new Date().toISOString(),
        updated_at: a.updatedAt || new Date().toISOString(),
        config: a.config || {},
        capabilities: a.capabilities || [],
        endpoints: a.endpoints || [],
      })) as Agent[];
    } catch {
      // Fallback demo agent for UI continuity
      return [
        {
          id: 'agent_demo',
          name: 'Demo Orchestrator',
          type: 'orchestrator',
          runtime: 'hosted',
          status: 'running',
          version: '1.0.0',
          latency: 120,
          provider: 'system',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          config: {},
          capabilities: ['task-execution', 'websocket'],
          endpoints: ['/api/agents/agent_demo'],
        },
      ] as Agent[];
    }
  },

  get: async (id: string): Promise<Agent | null> => {
    try {
      const res = await fetch(url(`/api/agents/${id}`), { credentials: "include" });
      if (res.status === 401 || res.status === 403) return null;
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`${res.status}`);
      const result = await res.json();
      const a = Array.isArray(result) ? result[0] : result?.data || result;
      if (!a) return null;
      return {
        id: a.id || id,
        name: a.name || "Agent",
        type: a.type || "automation",
        runtime: (a.runtime as any) || "hosted",
        status: (a.status === "active" ? "running" : (a.status || "stopped")) as Agent["status"],
        version: a.version || "latest",
        latency: a.averageResponseTime,
        provider: a.team || a.provider || "system",
        created_at: a.createdAt || new Date().toISOString(),
        updated_at: a.updatedAt || new Date().toISOString(),
        config: a.config || {},
        capabilities: a.capabilities || [],
        endpoints: a.endpoints || [],
      } as Agent;
    } catch {
      return null;
    }
  },

  start: async (_id: string): Promise<{ success: boolean }> => {
    try {
      const res = await fetch(url(`/api/agents/${_id}/start`), { method: "POST", credentials: "include" });
      if (!res.ok) return { success: false };
      return await res.json();
    } catch {
      return { success: true }; // optimistic fallback
    }
  },
  stop: async (_id: string): Promise<{ success: boolean }> => {
    try {
      const res = await fetch(url(`/api/agents/${_id}/stop`), { method: "POST", credentials: "include" });
      if (!res.ok) return { success: false };
      return await res.json();
    } catch {
      return { success: true };
    }
  },
  restart: async (_id: string): Promise<{ success: boolean }> => {
    try {
      const res = await fetch(url(`/api/agents/${_id}/restart`), { method: "POST", credentials: "include" });
      if (!res.ok) return { success: false };
      return await res.json();
    } catch {
      return { success: true };
    }
  },
  delete: async (_id: string): Promise<{ success: boolean }> => {
    try {
      const res = await fetch(url(`/api/agents/${_id}`), { method: "DELETE", credentials: "include" });
      if (!res.ok) return { success: false };
      return { success: true };
    } catch {
      return { success: true };
    }
  },
  getLogs: async (_id: string, limit = 100): Promise<string[]> => {
    try {
      const res = await fetch(url(`/api/agents/${_id}/logs?limit=${limit}`), { credentials: "include" });
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },
  getMetrics: async (_id: string, limit = 50): Promise<any[]> => {
    try {
      const res = await fetch(url(`/api/agents/${_id}/metrics?limit=${limit}`), { credentials: "include" });
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },
};
