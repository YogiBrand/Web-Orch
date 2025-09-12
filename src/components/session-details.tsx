import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft, Play, Pause, Square, Camera, Download, Share,
  Monitor, Activity, Clock, Cpu, HardDrive, Network, Zap,
  Eye, Shield, Globe, Terminal, Settings, RefreshCw,
  Maximize2, Minimize2, Volume2, VolumeX, RotateCcw,
  AlertTriangle, CheckCircle2, XCircle, Info
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useSessionWebSocket } from "@/hooks/use-websocket";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { Session } from "@/pages/sessions";
import { CompactEventLog } from "@/components/unified-events";
import { NoVNCViewer } from "@/components/novnc-viewer";

interface SessionDetailsProps {
  session: Session;
  onBack: () => void;
  onTerminate: () => void;
  onPause: () => void;
  onResume: () => void;
  onScreenshot: () => void;
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  details?: any;
}

interface SessionMetrics {
  cpuUsage: number;
  memoryUsage: number;
  networkLatency: number;
  requestsPerSecond: number;
  dataTransferred: number;
  errorsCount: number;
  actionsCount: number;
  uptime: number;
}

export function SessionDetails({
  session,
  onBack,
  onTerminate,
  onPause,
  onResume,
  onScreenshot
}: SessionDetailsProps) {
  const [activeTab, setActiveTab] = useState("preview");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [vncConnected, setVncConnected] = useState(false);
  const vncRef = useRef<HTMLDivElement>(null);
  const vncClientRef = useRef<any>(null);

  // WebSocket connection for real-time updates
  const { lastMessage, isConnected } = useSessionWebSocket(session.id);

  // Fetch session logs
  const { data: logsData, refetch: refetchLogs } = useQuery({
    queryKey: ['session-logs', session.id],
    queryFn: async () => {
      const resp = await apiRequest(`/api/sessions/${session.id}/logs`);
      return resp?.data || resp;
    },
    refetchInterval: 5000,
  });

  // Fetch session metrics
  const { data: metricsData } = useQuery({
    queryKey: ['session-metrics', session.id],
    queryFn: async () => {
      const resp = await apiRequest(`/api/sessions/${session.id}/metrics`);
      // API returns { success, data: { sessionId, metrics, timestamp } }
      return resp?.data?.metrics || resp?.metrics || resp;
    },
    refetchInterval: 2000,
  });

  // Fetch session recordings
  const { data: recordingsData } = useQuery({
    queryKey: ['session-recordings', session.id],
    queryFn: async () => {
      const resp = await apiRequest(`/api/sessions/${session.id}/recordings`);
      return resp?.data || resp;
    },
  });

  const logs: LogEntry[] = logsData?.logs || logsData?.data?.logs || [];
  const metrics: SessionMetrics = (metricsData as any) || {
    cpuUsage: session.metrics?.cpuUsage || 0,
    memoryUsage: session.metrics?.memoryUsage || 0,
    networkLatency: session.metrics?.networkLatency || 0,
    requestsPerSecond: session.metrics?.requestsPerSecond || 0,
    dataTransferred: session.metrics?.dataTransferred || 0,
    errorsCount: session.errors || 0,
    actionsCount: session.actions || 0,
    uptime: session.duration || 0,
  };

  const recordings = recordingsData?.recordings || recordingsData?.data?.recordings || [];

  // Initialize VNC connection
  useEffect(() => {
    if (activeTab === "preview" && session.metadata?.streamUrl && vncRef.current) {
      const initVNC = async () => {
        try {
          // This would normally import and initialize noVNC
          // For now, we'll simulate the connection
          setVncConnected(true);
          console.log('VNC connection initialized for session:', session.id);
        } catch (error) {
          console.error('Failed to initialize VNC:', error);
          setVncConnected(false);
        }
      };

      initVNC();

      return () => {
        if (vncClientRef.current) {
          vncClientRef.current.disconnect();
          setVncConnected(false);
        }
      };
    }
  }, [activeTab, session.metadata?.streamUrl, session.id]);

  // Handle WebSocket updates
  useEffect(() => {
    if (lastMessage) {
      try {
        if (lastMessage.type === 'session_update' && lastMessage.data?.sessionId === session.id) {
          refetchLogs();
        } else if (lastMessage.type === 'session-metrics-updated' && lastMessage.data?.sessionId === session.id) {
          // Handle metrics updates
        } else if (lastMessage.type === 'session-action-logged' && lastMessage.data?.sessionId === session.id) {
          refetchLogs();
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    }
  }, [lastMessage, session.id, refetchLogs]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "text-yellow-600 bg-yellow-100 border-yellow-200",
      running: "text-green-600 bg-green-100 border-green-200",
      paused: "text-blue-600 bg-blue-100 border-blue-200",
      completed: "text-gray-600 bg-gray-100 border-gray-200",
      failed: "text-red-600 bg-red-100 border-red-200",
      terminated: "text-orange-600 bg-orange-100 border-orange-200"
    };
    return colors[status] || "text-gray-600 bg-gray-100 border-gray-200";
  };

  const getLogLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      info: "text-blue-600",
      warning: "text-yellow-600", 
      error: "text-red-600",
      debug: "text-gray-600"
    };
    return colors[level] || "text-gray-600";
  };

  const getLogLevelIcon = (level: string) => {
    const icons: Record<string, any> = {
      info: Info,
      warning: AlertTriangle,
      error: XCircle,
      debug: Terminal
    };
    const IconComponent = icons[level] || Info;
    return <IconComponent className="h-4 w-4" />;
  };

  const handleFullscreen = () => {
    if (!isFullscreen) {
      if (vncRef.current?.requestFullscreen) {
        vncRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  const handleDownloadRecording = (recordingId: string) => {
    // Download recording functionality
    window.open(`/api/sessions/${session.id}/recordings/${recordingId}/download`, '_blank');
  };

  return (
    <div className="flex-1 bg-background">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onBack} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Sessions
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{session.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={getStatusColor(session.status)} variant="outline">
                  {session.status}
                </Badge>
                <span className="text-sm text-muted-foreground font-mono">
                  {session.id.substring(0, 12)}...
                </span>
                <Badge variant={isConnected ? "default" : "secondary"} className="gap-1">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    isConnected ? "bg-green-500 animate-pulse" : "bg-gray-400"
                  )} />
                  {isConnected ? "Live" : "Offline"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {session.status === 'running' && (
              <Button variant="outline" onClick={onPause} className="gap-2">
                <Pause className="h-4 w-4" />
                Pause
              </Button>
            )}
            {session.status === 'paused' && (
              <Button variant="outline" onClick={onResume} className="gap-2">
                <Play className="h-4 w-4" />
                Resume
              </Button>
            )}
            <Button variant="outline" onClick={onScreenshot} className="gap-2">
              <Camera className="h-4 w-4" />
              Screenshot
            </Button>
            {(session.status === 'running' || session.status === 'paused') && (
              <Button variant="destructive" onClick={onTerminate} className="gap-2">
                <Square className="h-4 w-4" />
                Terminate
              </Button>
            )}
          </div>
        </div>

        {/* Session Overview Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
              <Cpu className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Number(metrics.cpuUsage || 0).toFixed(1)}%</div>
              <Progress value={metrics.cpuUsage} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Memory</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Number(metrics.memoryUsage || 0).toFixed(1)}%</div>
              <Progress value={metrics.memoryUsage} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Actions</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.actionsCount}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.errorsCount} errors
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Uptime</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.floor(metrics.uptime / 60000)}m
              </div>
              <p className="text-xs text-muted-foreground">
                {Math.floor((metrics.uptime % 60000) / 1000)}s
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-0">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <div className="border-b px-4 py-2">
                    <TabsList>
                      <TabsTrigger value="preview">Live Preview</TabsTrigger>
                      <TabsTrigger value="events">Events</TabsTrigger>
                      <TabsTrigger value="logs">Logs</TabsTrigger>
                      <TabsTrigger value="recordings">Recordings</TabsTrigger>
                      <TabsTrigger value="config">Configuration</TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="preview" className="p-0">
                    <div className="relative">
                      {/* VNC Controls */}
                      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                        <div className="flex items-center gap-2">
                          <Badge variant={vncConnected ? "default" : "secondary"} className="gap-1">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              vncConnected ? "bg-green-500" : "bg-gray-400"
                            )} />
                            {vncConnected ? "Connected" : "Disconnected"}
                          </Badge>
                          {session.metadata?.streamUrl && (
                            <span className="text-sm text-muted-foreground">
                              Resolution: {session.config?.viewport?.width || 1920}×{session.config?.viewport?.height || 1080}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                            className="gap-2"
                          >
                            {isAudioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleFullscreen}
                            className="gap-2"
                          >
                            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.location.reload()}
                            className="gap-2"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Real VNC Display */}
                      <NoVNCViewer
                        sessionId={session.id}
                        vncUrl={session.metadata?.streamUrl}
                        autoConnect={true}
                        width={session.config?.viewport?.width || 1920}
                        height={session.config?.viewport?.height || 1080}
                        onConnectionChange={(status) => {
                          setVncConnected(status === 'connected');
                        }}
                        onScreenshot={(blob) => {
                          // Handle screenshot
                          console.log('Screenshot captured:', blob);
                        }}
                        onFullscreen={(isFullscreen) => {
                          setIsFullscreen(isFullscreen);
                        }}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="events" className="p-4">
                    <CompactEventLog
                      taskId={session.id}
                      maxEvents={50}
                      showViewAll={true}
                      onViewAll={() => {
                        // Navigate to full events page for this session
                        window.open(`/events?task=${session.id}`, '_blank');
                      }}
                    />
                  </TabsContent>

                  <TabsContent value="logs" className="p-0">
                    <div className="h-96">
                      <ScrollArea className="h-full p-4">
                        {logs.length === 0 ? (
                          <div className="text-center text-muted-foreground py-8">
                            <Terminal className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No logs available</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {logs.map((log) => (
                              <div key={log.id} className="flex gap-3 p-2 text-sm border-l-2 border-l-transparent hover:border-l-blue-500 hover:bg-gray-50 rounded-r">
                                <div className={cn("flex-shrink-0 mt-0.5", getLogLevelColor(log.level))}>
                                  {getLogLevelIcon(log.level)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-mono text-xs text-muted-foreground">
                                      {format(new Date(log.timestamp), 'HH:mm:ss.SSS')}
                                    </span>
                                    <Badge variant="outline" className={cn("text-xs px-1 py-0", getLogLevelColor(log.level))}>
                                      {log.level.toUpperCase()}
                                    </Badge>
                                  </div>
                                  <div className="break-words">{log.message}</div>
                                  {log.details && (
                                    <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                                      {JSON.stringify(log.details, null, 2)}
                                    </pre>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  </TabsContent>

                  <TabsContent value="recordings" className="p-4">
                    {recordings.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        <Camera className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No recordings available</p>
                        <p className="text-sm">Enable recording in session configuration</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {recordings.map((recording: any) => (
                          <div key={recording.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <div className="font-medium">{recording.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {recording.duration}ms • {recording.size}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownloadRecording(recording.id)}
                                className="gap-2"
                              >
                                <Download className="h-4 w-4" />
                                Download
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-2"
                              >
                                <Play className="h-4 w-4" />
                                Play
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="config" className="p-4">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-3">Browser Configuration</h4>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Type</Label>
                            <div className="text-sm">{session.type}</div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Browser</Label>
                            <div className="text-sm capitalize">{session.browser}</div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Viewport</Label>
                            <div className="text-sm">
                              {session.config?.viewport?.width || 1920}×{session.config?.viewport?.height || 1080}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Headless</Label>
                            <div className="text-sm">
                              {session.config?.headless ? 'Yes' : 'No'}
                            </div>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <h4 className="font-medium mb-3">Security Features</h4>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            <span className="text-sm">Stealth Mode:</span>
                            <Badge variant={session.config?.stealth ? "default" : "secondary"}>
                              {session.config?.stealth ? 'Enabled' : 'Disabled'}
                            </Badge>
                          </div>
                          {session.config?.antiDetection?.enabled && (
                            <div className="pl-6 space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <span>Level:</span>
                                <Badge variant="outline">{session.config.antiDetection.level}</Badge>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <span>Fingerprinting:</span>
                                <Badge variant={session.config.antiDetection.fingerprinting ? "default" : "secondary"}>
                                  {session.config.antiDetection.fingerprinting ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <h4 className="font-medium mb-3">Session Info</h4>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Created</Label>
                            <div className="text-sm">
                              {format(new Date(session.createdAt), 'PPp')}
                            </div>
                          </div>
                          {session.startedAt && (
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Started</Label>
                              <div className="text-sm">
                                {format(new Date(session.startedAt), 'PPp')}
                              </div>
                            </div>
                          )}
                          {session.taskData?.taskId && (
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Task ID</Label>
                              <div className="text-sm font-mono">{session.taskData.taskId}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Session Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status</span>
                  <Badge className={getStatusColor(session.status)} variant="outline">
                    {session.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Type</span>
                  <span className="text-sm capitalize">{session.type}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Browser</span>
                  <span className="text-sm capitalize">{session.browser}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Created</span>
                  <span className="text-sm">{formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}</span>
                </div>
                {session.taskData?.taskId && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <span className="text-sm font-medium">Task Association</span>
                      <div className="text-sm">
                        <div className="font-medium">{session.taskData.taskName || 'Task'}</div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {session.taskData.taskId}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full gap-2"
                  onClick={onScreenshot}
                >
                  <Camera className="h-4 w-4" />
                  Take Screenshot
                </Button>
                <Button variant="outline" className="w-full gap-2">
                  <Download className="h-4 w-4" />
                  Export Logs
                </Button>
                <Button variant="outline" className="w-full gap-2">
                  <Share className="h-4 w-4" />
                  Share Session
                </Button>
              </CardContent>
            </Card>

            {/* Network Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Network className="h-4 w-4" />
                  Network Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Requests/sec</span>
                    <span className="font-mono">{Number(metrics.requestsPerSecond || 0).toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Latency</span>
                    <span className="font-mono">{Number(metrics.networkLatency || 0).toFixed(0)}ms</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Data Transfer</span>
                    <span className="font-mono">{Number((metrics.dataTransferred || 0) / 1024 / 1024).toFixed(1)}MB</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// Re-export Label for consistency
function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className
      )}
      {...props}
    />
  );
}
