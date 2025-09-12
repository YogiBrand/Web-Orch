import { useState } from "react";
import { Settings, Monitor, Globe, Eye, EyeOff, Shield, Clock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useQuery } from "@tanstack/react-query";

interface SessionConfig {
  maxSessions: number;
  browser: 'chrome' | 'firefox' | 'edge';
  headless: boolean;
  viewport: { width: number; height: number };
  proxy?: string;
  userAgent?: string;
  location?: string;
  antiDetection: boolean;
  sessionTimeout: number;
  reuseExisting: boolean;
}

interface SessionSelectorProps {
  sessionConfig: SessionConfig;
  onSessionConfigChange: (config: SessionConfig) => void;
  disabled?: boolean;
}

interface ActiveSession {
  id: string;
  status: 'active' | 'idle' | 'closed';
  browser: string;
  createdAt: string;
  lastActivity: string;
  metadata?: {
    viewport?: { width: number; height: number };
    proxy?: string;
    userAgent?: string;
  };
}

const defaultViewports = [
  { name: "Desktop HD", width: 1920, height: 1080 },
  { name: "Desktop", width: 1366, height: 768 },
  { name: "Laptop", width: 1440, height: 900 },
  { name: "Tablet", width: 768, height: 1024 },
  { name: "Mobile", width: 375, height: 667 },
];

const defaultUserAgents = [
  { name: "Chrome Windows", value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36" },
  { name: "Chrome Mac", value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36" },
  { name: "Firefox Windows", value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0" },
  { name: "Safari Mac", value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15" },
];

export function SessionSelector({ sessionConfig, onSessionConfigChange, disabled = false }: SessionSelectorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { data: activeSessions = [] } = useQuery<{ sessions: ActiveSession[] }>({
    queryKey: ["/api/sessions/active"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const updateConfig = (updates: Partial<SessionConfig>) => {
    onSessionConfigChange({ ...sessionConfig, ...updates });
  };

  const setViewport = (viewport: { width: number; height: number }) => {
    updateConfig({ viewport });
  };

  const setUserAgent = (userAgent: string) => {
    updateConfig({ userAgent });
  };

  return (
    <Card className={disabled ? "opacity-50 pointer-events-none" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Monitor className="w-5 h-5" />
          <span>Session Configuration</span>
          <Badge variant="outline" className="ml-auto">
            {sessionConfig.maxSessions} session{sessionConfig.maxSessions !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Configuration */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="max-sessions">Max Sessions</Label>
            <Input
              id="max-sessions"
              type="number"
              min="1"
              max="10"
              value={sessionConfig.maxSessions}
              onChange={(e) => updateConfig({ maxSessions: parseInt(e.target.value) || 1 })}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="browser">Browser</Label>
            <Select
              value={sessionConfig.browser}
              onValueChange={(value: 'chrome' | 'firefox' | 'edge') => updateConfig({ browser: value })}
            >
              <SelectTrigger id="browser">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="chrome">Chrome</SelectItem>
                <SelectItem value="firefox">Firefox</SelectItem>
                <SelectItem value="edge">Edge</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Headless Mode */}
        <div className="flex items-center space-x-3">
          <Switch
            checked={sessionConfig.headless}
            onCheckedChange={(checked) => updateConfig({ headless: checked })}
          />
          <div className="flex items-center space-x-2">
            {sessionConfig.headless ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <Label>Headless Mode</Label>
          </div>
          <span className="text-sm text-gray-500 ml-auto">
            {sessionConfig.headless ? "Hidden browser" : "Visible browser"}
          </span>
        </div>

        {/* Anti-Detection */}
        <div className="flex items-center space-x-3">
          <Switch
            checked={sessionConfig.antiDetection}
            onCheckedChange={(checked) => updateConfig({ antiDetection: checked })}
          />
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4" />
            <Label>Anti-Detection</Label>
          </div>
          <span className="text-sm text-gray-500 ml-auto">
            {sessionConfig.antiDetection ? "Stealth enabled" : "Standard mode"}
          </span>
        </div>

        {/* Advanced Configuration */}
        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full">
              <Settings className="w-4 h-4 mr-2" />
              {showAdvanced ? "Hide" : "Show"} Advanced Settings
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4">
            {/* Viewport Configuration */}
            <div className="space-y-2">
              <Label>Viewport Size</Label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                {defaultViewports.map((vp) => (
                  <Button
                    key={vp.name}
                    variant={sessionConfig.viewport.width === vp.width && sessionConfig.viewport.height === vp.height ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewport({ width: vp.width, height: vp.height })}
                  >
                    {vp.name}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Width"
                  value={sessionConfig.viewport.width}
                  onChange={(e) => setViewport({ ...sessionConfig.viewport, width: parseInt(e.target.value) || 1920 })}
                />
                <Input
                  type="number"
                  placeholder="Height"
                  value={sessionConfig.viewport.height}
                  onChange={(e) => setViewport({ ...sessionConfig.viewport, height: parseInt(e.target.value) || 1080 })}
                />
              </div>
            </div>

            {/* User Agent */}
            <div className="space-y-2">
              <Label>User Agent</Label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                {defaultUserAgents.map((ua) => (
                  <Button
                    key={ua.name}
                    variant={sessionConfig.userAgent === ua.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setUserAgent(ua.value)}
                  >
                    {ua.name}
                  </Button>
                ))}
              </div>
              <Input
                placeholder="Custom user agent (optional)"
                value={sessionConfig.userAgent || ""}
                onChange={(e) => updateConfig({ userAgent: e.target.value || undefined })}
              />
            </div>

            {/* Proxy Configuration */}
            <div className="space-y-2">
              <Label htmlFor="proxy">Proxy Server (optional)</Label>
              <Input
                id="proxy"
                placeholder="http://proxy.example.com:8080"
                value={sessionConfig.proxy || ""}
                onChange={(e) => updateConfig({ proxy: e.target.value || undefined })}
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">Location (optional)</Label>
              <Input
                id="location"
                placeholder="US, UK, etc."
                value={sessionConfig.location || ""}
                onChange={(e) => updateConfig({ location: e.target.value || undefined })}
              />
            </div>

            {/* Session Timeout */}
            <div className="space-y-2">
              <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
              <Input
                id="session-timeout"
                type="number"
                min="1"
                max="60"
                value={Math.floor(sessionConfig.sessionTimeout / 60000)}
                onChange={(e) => updateConfig({ sessionTimeout: (parseInt(e.target.value) || 10) * 60000 })}
              />
            </div>

            {/* Reuse Sessions */}
            <div className="flex items-center space-x-3">
              <Switch
                checked={sessionConfig.reuseExisting}
                onCheckedChange={(checked) => updateConfig({ reuseExisting: checked })}
              />
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <Label>Reuse Existing Sessions</Label>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Active Sessions Display */}
        {activeSessions.sessions && activeSessions.sessions.length > 0 && (
          <div className="space-y-2">
            <Label>Active Sessions ({activeSessions.sessions.length})</Label>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {activeSessions.sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      session.status === 'active' ? 'bg-green-500' :
                      session.status === 'idle' ? 'bg-yellow-500' :
                      'bg-gray-500'
                    }`} />
                    <span className="text-sm font-medium">{session.id}</span>
                    <Badge variant="outline" className="text-xs">
                      {session.browser}
                    </Badge>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(session.lastActivity).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Configuration Preview */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-sm space-y-1">
            <div className="font-medium">Configuration Preview:</div>
            <div className="text-gray-600">
              • {sessionConfig.maxSessions} {sessionConfig.browser} session{sessionConfig.maxSessions !== 1 ? 's' : ''}
              • {sessionConfig.viewport.width}x{sessionConfig.viewport.height} viewport
              • {sessionConfig.headless ? "Headless" : "Visible"} mode
              {sessionConfig.antiDetection && <span> • Anti-detection enabled</span>}
              {sessionConfig.proxy && <span> • Proxy configured</span>}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}