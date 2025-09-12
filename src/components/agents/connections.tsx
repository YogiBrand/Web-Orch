import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { Link } from 'wouter';

interface MCPServer {
  id: string;
  type: string;
  url?: string;
  status?: string;
  tools?: string[];
}

export default function AgentsConnections() {
  const { data, isLoading, error } = useQuery<{ servers: MCPServer[] } | any>({ queryKey: ['/api/mcp/servers'] });
  const [serverId, setServerId] = useState('mcp-filesystem');

  const connectMutation = useMutation({
    mutationFn: async (id: string) => apiRequest(`/api/mcp/servers/${id}/connect`, { method: 'POST', data: {} }),
  });

  const servers: MCPServer[] = Array.isArray(data?.servers) ? data.servers : [];

  return (
    <div className="max-w-6xl mx-auto px-6 py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">MCP Connections</h2>
        <div className="text-sm text-muted-foreground">Manage Model Context Protocol servers</div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Connect MCP Server</CardTitle>
          <CardDescription>Provide a known server id to connect (ex: mcp-filesystem, mcp-github)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input value={serverId} onChange={(e) => setServerId(e.target.value)} placeholder="mcp-filesystem" className="max-w-sm" />
            <Button onClick={() => connectMutation.mutate(serverId)} disabled={connectMutation.isPending}>Connect</Button>
          </div>
          <div className="text-xs text-muted-foreground mt-2">Note: These routes may require authentication; in dev, you can bypass or supply a token.</div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : error ? (
        <div className="text-red-600">Failed to load MCP servers</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {servers.map((s) => (
            <Card key={s.id}>
              <CardHeader>
                <CardTitle className="text-base">{s.id}</CardTitle>
                <CardDescription>{s.type}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground mb-2">Status: {s.status || 'unknown'}</div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {(s.tools || []).map((t) => (
                    <span key={t} className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">{t}</span>
                  ))}
                </div>
                <Link href="/websocket-test" className="text-blue-600 text-sm">View WS activity</Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

