import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AgentsActivity() {
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const base = (import.meta as any).env?.VITE_WS_BASE_URL as string;
    const wsUrl = base && (base.startsWith('ws://') || base.startsWith('wss://'))
      ? base
      : `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      // Subscribe to agent and mcp updates
      try { ws.send(JSON.stringify({ type: 'agent.subscribe', payload: { all: true } })); } catch {}
      try { ws.send(JSON.stringify({ type: 'mcp.subscribe', payload: {} })); } catch {}
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (typeof msg?.type === 'string' && (msg.type.startsWith('agent.') || msg.type.startsWith('mcp.'))) {
          setMessages((prev) => [msg, ...prev].slice(0, 200));
        }
      } catch {}
    };

    return () => { try { ws.close(); } catch {} };
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-6 py-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Real-time Agent Activity</CardTitle>
          <CardDescription>Live updates from agents and MCP servers</CardDescription>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <div className="text-sm text-muted-foreground">Waiting for events…</div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-auto">
              {messages.map((m, i) => (
                <div key={i} className="text-xs p-2 rounded bg-gray-50 border">
                  <div className="font-mono text-[11px] text-gray-900">{m.type}</div>
                  <div className="font-mono text-[11px] text-gray-700">{JSON.stringify(m.payload || {}, null, 2)}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

