import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Play, 
  Square, 
  Eye, 
  Monitor, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Activity,
  Settings,
  Download,
  ExternalLink,
  Loader2,
  PlayCircle,
  StopCircle,
  Camera,
  Globe,
  User,
  MapPin,
  Shield,
  Zap
} from "lucide-react";

interface Session {
  id: string;
  sessionId: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  url?: string;
  userAgent?: string;
  viewport?: { width: number; height: number };
  duration: number;
  creditUsed: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  recordingUrl?: string;
  streamUrl?: string;
  screenshots?: string[];
  actions?: any[];
  agentType?: string;
  taskData?: any;
  isLive: boolean;
}

interface SessionDetails extends Session {
  metadata: {
    userAgent: string;
    viewport: { width: number; height: number };
    proxy?: string;
    location: string;
    isStealthMode: boolean;
    autoSolveCaptcha: boolean;
    cost: number;
    websocketUrl: string;
  };
}

export function EnhancedSessions() {
  const [selectedTab, setSelectedTab] = useState<"all" | "live">("all");
  const [selectedSession, setSelectedSession] = useState<SessionDetails | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [sessionConfig, setSessionConfig] = useState({
    sessionId: "",
    headless: false,
    viewport: { width: 1920, height: 1080 },
    proxy: "",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    location: "US",
    stealth: true,
    solveCaptcha: false
  });

  // Fetch sessions with real-time updates
  const { data: sessions = [] } = useQuery<Session[]>({
    queryKey: ['/api/sessions'],
    refetchInterval: 3000
  });

  // Fetch detailed session data when one is selected
  const { data: sessionDetails } = useQuery<SessionDetails>({
    queryKey: ['/api/sessions', selectedSession?.id],
    enabled: !!selectedSession?.id,
    refetchInterval: selectedSession?.isLive ? 1000 : 5000
  });

  // Create new session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (config: typeof sessionConfig) => {
      return await apiRequest("/api/sessions", "POST", {
        sessionId: config.sessionId,
        viewport: config.viewport,
        userAgent: config.userAgent,
        proxy: config.proxy || undefined,
        stealth: config.stealth,
        solveCaptcha: config.solveCaptcha
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
      setShowCreateDialog(false);
      setSessionConfig({ ...sessionConfig, sessionId: "" });
    }
  });

  // Release session mutation
  const releaseSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return await apiRequest(`/api/sessions/${sessionId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
      setSelectedSession(null);
    }
  });

  const handleCreateSession = () => {
    if (!sessionConfig.sessionId.trim()) return;
    createSessionMutation.mutate(sessionConfig);
  };

  const handleViewSession = (session: Session) => {
    setSelectedSession(session as SessionDetails);
  };

  const handleReleaseSession = (sessionId: string) => {
    releaseSessionMutation.mutate(sessionId);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Activity className="w-4 h-4 text-green-500" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-blue-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'running': return 'default';
      case 'completed': return 'secondary';
      case 'failed': return 'destructive';
      default: return 'outline';
    }
  };

  const formatDuration = (duration: number) => {
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const filteredSessions = sessions.filter(session => {
    if (selectedTab === "live") return session.isLive;
    return true;
  });

  const liveSessions = sessions.filter(s => s.isLive);

  return (
    <div className="flex h-full">
      {/* Main Sessions List */}
      <div className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-6 flex items-end justify-between pt-[72px] pb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Sessions</h1>
            <p className="text-muted-foreground mt-1">Manage and monitor browser sessions</p>
          </div>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button data-testid="button-start-session">
                <Play className="w-4 h-4 mr-2" />
                Start Session
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Session</DialogTitle>
                <DialogDescription>
                  Configure a new browser session with custom settings
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="session-id">Session ID</Label>
                  <Input
                    id="session-id"
                    value={sessionConfig.sessionId}
                    onChange={(e) => setSessionConfig({ ...sessionConfig, sessionId: e.target.value })}
                    placeholder="my-session-001"
                    data-testid="input-session-id"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="viewport-width">Width</Label>
                    <Input
                      id="viewport-width"
                      type="number"
                      value={sessionConfig.viewport.width}
                      onChange={(e) => setSessionConfig({
                        ...sessionConfig,
                        viewport: { ...sessionConfig.viewport, width: parseInt(e.target.value) }
                      })}
                      data-testid="input-viewport-width"
                    />
                  </div>
                  <div>
                    <Label htmlFor="viewport-height">Height</Label>
                    <Input
                      id="viewport-height"
                      type="number"
                      value={sessionConfig.viewport.height}
                      onChange={(e) => setSessionConfig({
                        ...sessionConfig,
                        viewport: { ...sessionConfig.viewport, height: parseInt(e.target.value) }
                      })}
                      data-testid="input-viewport-height"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="location">Location</Label>
                  <Select 
                    value={sessionConfig.location}
                    onValueChange={(value) => setSessionConfig({ ...sessionConfig, location: value })}
                  >
                    <SelectTrigger data-testid="select-location">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="UK">United Kingdom</SelectItem>
                      <SelectItem value="DE">Germany</SelectItem>
                      <SelectItem value="JP">Japan</SelectItem>
                      <SelectItem value="AU">Australia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="stealth">Stealth Mode</Label>
                  <Switch
                    id="stealth"
                    checked={sessionConfig.stealth}
                    onCheckedChange={(checked) => setSessionConfig({ ...sessionConfig, stealth: checked })}
                    data-testid="switch-stealth"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="captcha">Auto-solve Captcha</Label>
                  <Switch
                    id="captcha"
                    checked={sessionConfig.solveCaptcha}
                    onCheckedChange={(checked) => setSessionConfig({ ...sessionConfig, solveCaptcha: checked })}
                    data-testid="switch-captcha"
                  />
                </div>

                <Button 
                  onClick={handleCreateSession}
                  disabled={!sessionConfig.sessionId.trim() || createSessionMutation.isPending}
                  className="w-full"
                  data-testid="button-create-session"
                >
                  {createSessionMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  Create Session
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mx-auto w-full max-w-6xl px-6">
        <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as "all" | "live")}>
          <TabsList>
            <TabsTrigger value="all" data-testid="tab-all-sessions">
              All Sessions
              <Badge variant="secondary" className="ml-2">{sessions.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="live" data-testid="tab-live-sessions">
              Live Sessions
              <Badge variant="default" className="ml-2">{liveSessions.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>All Sessions</CardTitle>
                <CardDescription>View and manage all browser sessions</CardDescription>
              </CardHeader>
              <CardContent>
                {sessions.length === 0 ? (
                  <div className="text-center py-12">
                    <Monitor className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No sessions yet</h3>
                    <p className="text-gray-600 mb-4">Create your first browser session to get started</p>
                    <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-first-session">
                      <Play className="w-4 h-4 mr-2" />
                      Start Session
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Session ID</TableHead>
                        <TableHead>Activity & Date</TableHead>
                        <TableHead>Browser Details</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSessions.map((session) => (
                        <TableRow key={session.id} className="session-row">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(session.status)}
                              <Badge variant={getStatusVariant(session.status)} data-testid={`status-${session.sessionId}`}>
                                {session.status}
                              </Badge>
                              {session.isLive && (
                                <Badge variant="destructive" className="animate-pulse">
                                  <div className="w-2 h-2 bg-white rounded-full mr-1"></div>
                                  Live
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium" data-testid={`session-id-${session.sessionId}`}>
                              {session.sessionId}
                            </div>
                            {session.agentType && (
                              <div className="text-sm text-gray-500">
                                via {session.agentType}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{formatTimestamp(session.createdAt)}</div>
                              <div className="text-gray-500">
                                Duration: {formatDuration(session.duration)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Monitor className="w-3 h-3" />
                              <span>Desktop</span>
                              <Globe className="w-3 h-3 ml-2" />
                              <span>Chrome</span>
                              {session.viewport && (
                                <span className="text-gray-500">
                                  ({session.viewport.width}x{session.viewport.height})
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewSession(session)}
                                data-testid={`button-view-${session.sessionId}`}
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                View Session
                              </Button>
                              {session.status === 'running' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleReleaseSession(session.id)}
                                  data-testid={`button-release-${session.sessionId}`}
                                >
                                  <StopCircle className="w-3 h-3 mr-1" />
                                  Release Session
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="live" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Live Sessions</CardTitle>
                <CardDescription>Active browser sessions with real-time streaming</CardDescription>
              </CardHeader>
              <CardContent>
                {liveSessions.length === 0 ? (
                  <div className="text-center py-12">
                    <Activity className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No live sessions</h3>
                    <p className="text-gray-600">Live sessions will appear here when active</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {liveSessions.map((session) => (
                      <Card key={session.id} className="border-green-200 bg-green-50">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                              <span className="font-medium">{session.sessionId}</span>
                            </div>
                            <Badge variant="destructive">Live</Badge>
                          </div>
                          
                          <div className="space-y-2 text-sm text-gray-600">
                            <div>Duration: {formatDuration(session.duration)}</div>
                            <div>Agent: {session.agentType || 'Manual'}</div>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-3"
                            onClick={() => handleViewSession(session)}
                            data-testid={`button-stream-${session.sessionId}`}
                          >
                            <PlayCircle className="w-3 h-3 mr-1" />
                            View Stream
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
      </div>

      {/* Session Details Panel */}
      {selectedSession && (
        <div className="w-96 border-l border-gray-200 bg-white flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Session Details</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedSession(null)}
                data-testid="button-close-details"
              >
                ×
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-6">
              {/* Session Info */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Session Info</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">ID:</span>
                    <span className="font-mono">{selectedSession.sessionId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <Badge variant={getStatusVariant(selectedSession.status)}>
                      {selectedSession.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span>{formatDuration(selectedSession.duration)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cost:</span>
                    <span>${selectedSession.creditUsed || 0}</span>
                  </div>
                </div>
              </div>

              {/* Browser Stream/Recording */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">
                  {selectedSession.isLive ? 'Live Stream' : 'Recording'}
                </h4>
                <div className="aspect-video bg-gray-900 rounded border flex items-center justify-center">
                  {selectedSession.isLive ? (
                    <div className="text-center text-white">
                      <Activity className="w-8 h-8 mx-auto mb-2 animate-pulse" />
                      <p className="text-sm">Live Stream Active</p>
                      <p className="text-xs text-gray-400">WebSocket URL ready</p>
                    </div>
                  ) : selectedSession.recordingUrl ? (
                    <div className="text-center text-white">
                      <PlayCircle className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm">Recording Available</p>
                      <Button variant="outline" size="sm" className="mt-2">
                        <Play className="w-3 h-3 mr-1" />
                        Play Recording
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center text-gray-400">
                      <Camera className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm">No recording available</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Task Actions (if available) */}
              {selectedSession.actions && selectedSession.actions.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Task Actions</h4>
                  <ScrollArea className="h-48">
                    <div className="space-y-2">
                      {selectedSession.actions.map((action, index) => (
                        <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                          <div className="font-medium">{action.type}</div>
                          <div className="text-gray-600">{action.description}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(action.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Browser Configuration */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Configuration</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">User Agent:</span>
                  </div>
                  <div className="font-mono text-xs bg-gray-50 p-2 rounded">
                    {selectedSession.userAgent || 'Default Chrome'}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Viewport:</span>
                    <span>{selectedSession.viewport?.width}x{selectedSession.viewport?.height}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Location:</span>
                    <span>United States</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Stealth Mode:</span>
                    <Badge variant="outline" className="text-xs">Enabled</Badge>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="p-4 border-t border-gray-200">
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={() => handleReleaseSession(selectedSession.id)}
              disabled={selectedSession.status !== 'running'}
              data-testid="button-release-session-details"
            >
              <StopCircle className="w-4 h-4 mr-2" />
              Release Session
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}