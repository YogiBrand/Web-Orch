import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AgentsTools() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Agent Tools</CardTitle>
          <CardDescription>Browse tools exposed by installed agents and MCP servers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Coming soon: a searchable directory of tools aggregated from agents and MCP servers.</div>
        </CardContent>
      </Card>
    </div>
  );
}

