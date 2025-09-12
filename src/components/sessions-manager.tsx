import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Monitor, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Plus,
  Play,
  Pause,
  Square,
  Eye,
  Settings,
  Globe,
  Activity
} from "lucide-react";

interface GridSession {
  id: string;
  status: 'active' | 'idle' | 'closed';
  createdAt: string;
  lastActivity: string;
  metadata: {
    userAgent?: string;
    viewport?: { width: number; height: number };
    proxy?: string;
    location?: string;
  };
}

interface GridStatus {
  hub: { status: string; url: string };
  sessions: { total: number; active: number; idle: number };
  queue: number;
}

export function SessionsManager() {
  const [newSessionId, setNewSessionId] = useState("");
  const [sessionOptions, setSessionOptions] = useState({
    headless: false,
    viewport: { width: 1920, height: 1080 },
    proxy: "",
    userAgent: "",
    location: "US"
  });

  const { data: sessions = { sessions: [], total: 0 }, refetch: refetchSessions } = useQuery<{ sessions: GridSession[]; total: number }>({
    queryKey: ['/api/grid/sessions'],
    refetchInterval: 3000
  });

  const { data: gridStatus } = useQuery<GridStatus>({
    queryKey: ['/api/grid/status'],
    refetchInterval: 5000
  });

  const createSessionMutation = useMutation({
    mutationFn: async (sessionData: { sessionId: string; options: any }) => {
      return await apiRequest("/api/grid/sessions", "POST", sessionData);
    },
    onSuccess: () => {
      refetchSessions();
      setNewSessionId("");
    },
  });

  const closeSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return await apiRequest(`/api/grid/sessions/${sessionId}`, "DELETE");
    },
    onSuccess: () => {
      refetchSessions();
    },
  });

  const handleCreateSession = () => {
    if (!newSessionId.trim()) return;
    
    createSessionMutation.mutate({
      sessionId: newSessionId.trim(),
      options: sessionOptions
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'idle': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'closed': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Monitor className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatDuration = (timestamp: string) => {
    const time = new Date(timestamp);
    const now = new Date();
    const diff = Math.round((now.getTime() - time.getTime()) / 1000);
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
    return `${Math.round(diff / 3600)}h ago`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Monitor className="w-6 h-6 text-blue-500" />
          <h2 className="text-2xl font-bold">Session Manager</h2>
          <Badge variant="secondary">Selenium Grid</Badge>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button data-testid="button-create-session">
              <Plus className="w-4 h-4 mr-2" />
              New Session
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Browser Session</DialogTitle>
              <DialogDescription>
                Configure and launch a new browser session for automation
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="session-id">Session ID</Label>
                <Input
                  id="session-id"
                  placeholder="my-automation-session"
                  value={newSessionId}
                  onChange={(e) => setNewSessionId(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="viewport-width">Viewport Width</Label>
                  <Input
                    id="viewport-width"
                    type="number"
                    value={sessionOptions.viewport.width}
                    onChange={(e) => setSessionOptions(prev => ({
                      ...prev,
                      viewport: { ...prev.viewport, width: parseInt(e.target.value) || 1920 }
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="viewport-height">Viewport Height</Label>
                  <Input
                    id="viewport-height"
                    type="number"
                    value={sessionOptions.viewport.height}
                    onChange={(e) => setSessionOptions(prev => ({
                      ...prev,
                      viewport: { ...prev.viewport, height: parseInt(e.target.value) || 1080 }
                    }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                <Select value={sessionOptions.location} onValueChange={(value) => 
                  setSessionOptions(prev => ({ ...prev, location: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US">United States</SelectItem>
                    <SelectItem value="EU">Europe</SelectItem>
                    <SelectItem value="ASIA">Asia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="proxy">Proxy (optional)</Label>
                <Input
                  id="proxy"
                  placeholder="http://proxy.example.com:8080"
                  value={sessionOptions.proxy}
                  onChange={(e) => setSessionOptions(prev => ({ ...prev, proxy: e.target.value }))}
                />
              </div>

              <Button 
                onClick={handleCreateSession}
                disabled={createSessionMutation.isPending || !newSessionId.trim()}
                className="w-full"
              >
                {createSessionMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Session...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Create Session
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="sessions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sessions">Active Sessions</TabsTrigger>
          <TabsTrigger value="status">Grid Status</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Browser Sessions ({sessions.sessions?.length || 0})</CardTitle>
              <CardDescription>
                Manage active browser sessions for automation tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {sessions.sessions?.map((session) => (
                    <Card key={session.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(session.status)}
                            <span className="font-medium">{session.id}</span>
                            <Badge variant={session.status === 'active' ? 'default' : 'secondary'}>
                              {session.status}
                            </Badge>
                          </div>
                          <div className="text-right text-sm text-muted-foreground">
                            <div>Created: {formatDuration(session.createdAt)}</div>
                            <div>Active: {formatDuration(session.lastActivity)}</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-muted-foreground mb-3">
                          <div>
                            <strong>Resolution:</strong><br />
                            {session.metadata.viewport?.width}x{session.metadata.viewport?.height}
                          </div>
                          <div>
                            <strong>Location:</strong><br />
                            {session.metadata.location || 'Default'}
                          </div>
                          <div>
                            <strong>Proxy:</strong><br />
                            {session.metadata.proxy || 'None'}
                          </div>
                          <div>
                            <strong>User Agent:</strong><br />
                            {session.metadata.userAgent ? 'Custom' : 'Default'}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline">
                            <Eye className="w-3 h-3 mr-1" />
                            View Session
                          </Button>
                          <Button size="sm" variant="outline">
                            <Settings className="w-3 h-3 mr-1" />
                            Configure
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => closeSessionMutation.mutate(session.id)}
                            disabled={closeSessionMutation.isPending}
                          >
                            <Square className="w-3 h-3 mr-1" />
                            Close
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {!sessions.sessions?.length && (
                    <div className="text-center py-8 text-gray-500">
                      No active sessions. Create a new session to get started.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Activity className="w-5 h-5 text-green-500" />
                  Grid Hub
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    gridStatus?.hub?.status === 'connected' ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <span className="text-sm">{gridStatus?.hub?.status || 'Unknown'}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {gridStatus?.hub?.url || 'No URL available'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Monitor className="w-5 h-5 text-blue-500" />
                  Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total</span>
                    <span className="font-medium">{gridStatus?.sessions?.total || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Active</span>
                    <span className="font-medium text-green-600">{gridStatus?.sessions?.active || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Idle</span>
                    <span className="font-medium text-yellow-600">{gridStatus?.sessions?.idle || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="w-5 h-5 text-orange-500" />
                  Queue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Pending</span>
                  <span className="font-medium">{gridStatus?.queue || 0}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}