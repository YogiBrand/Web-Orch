import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  Play, 
  Square, 
  Pause, 
  RotateCcw, 
  Download,
  Monitor,
  Camera,
  Activity,
  Clock,
  Cpu,
  HardDrive,
  Wifi,
  AlertCircle,
  CheckCircle,
  XCircle
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useWebSocket } from "@/hooks/use-websocket";
import { apiRequest } from "@/lib/queryClient";

interface SessionDetailViewProps {
  sessionId: string;
  onBack: () => void;
}

interface SessionLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  tool?: string;
  runId?: string;
  eventType?: string;
  action?: string;
  metrics?: Record<string, any>;
  error?: string;
  meta?: Record<string, any>;
}

interface SessionMetrics {
  cpu: number;
  memory: number;
  network: number;
  uptime: number;
}

export function SessionDetailView({ sessionId, onBack }: SessionDetailViewProps) {
  const [logs, setLogs] = useState<SessionLog[]>([]);
  const [metrics, setMetrics] = useState<SessionMetrics | null>(null);
  const [isStreamConnected, setIsStreamConnected] = useState(false);
  const vncRef = useRef<HTMLIFrameElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch session details
  const { data: session, isLoading } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => apiRequest(`/api/sessions/${sessionId}`),
    refetchInterval: 2000,
  });

  // WebSocket connection for real-time logs and metrics
  const { lastMessage } = useWebSocket(`/ws/stream/${sessionId}`);

  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage);
        
        if (data.type === 'browser_update') {
          // Handle live browser updates
          if (data.action) {
            const newLog: SessionLog = {
              timestamp: data.timestamp,
              level: 'info',
              message: `Action: ${data.action.type} - ${data.action.url}`,
              eventType: data.action.type,
              action: data.action.url,
            };
            
            setLogs(prev => [...prev.slice(-99), newLog]); // Keep last 100 logs
          }
        } else if (data.type === 'metrics_update') {
          setMetrics(data.metrics);
        } else if (data.type === 'stream_ready') {
          setIsStreamConnected(true);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    }
  }, [lastMessage]);

  // Auto-scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Session control mutations
  const controlMutation = useMutation({
    mutationFn: async (action: 'start' | 'stop' | 'pause' | 'resume') => {
      return await apiRequest(`/api/sessions/${sessionId}/${action}`, { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
    },
  });

  // Screenshot capture mutation
  const screenshotMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/sessions/${sessionId}/screenshot`, { method: 'POST' });
    },
  });

  const getStatusColor = (status: string) => {
    const colors = {
      created: 'text-blue-600',
      running: 'text-green-600',
      completed: 'text-gray-600',
      failed: 'text-red-600',
    };
    return colors[status as keyof typeof colors] || 'text-gray-600';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-gray-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-blue-600" />;
    }
  };

  const getLogLevelColor = (level: string) => {
    const colors = {
      info: 'text-blue-600',
      warn: 'text-yellow-600',
      error: 'text-red-600',
      debug: 'text-gray-500',
    };
    return colors[level as keyof typeof colors] || 'text-gray-600';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-semibold">Session not found</h2>
        <p className="text-muted-foreground mt-2">
          The session may have been deleted or the ID is incorrect.
        </p>
        <Button onClick={onBack} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Sessions
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{session.name}</h1>
              {getStatusIcon(session.status)}
              <Badge className={getStatusColor(session.status)}>
                {session.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Session ID: <code className="font-mono text-xs">{session.id}</code>
            </p>
          </div>
        </div>

        {/* Session Controls */}
        <div className="flex items-center gap-2">
          {session.status === 'created' && (
            <Button 
              onClick={() => controlMutation.mutate('start')}
              disabled={controlMutation.isPending}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              Start
            </Button>
          )}
          {session.status === 'running' && (
            <>
              <Button 
                variant="outline"
                onClick={() => controlMutation.mutate('pause')}
                disabled={controlMutation.isPending}
                className="flex items-center gap-2"
              >
                <Pause className="h-4 w-4" />
                Pause
              </Button>
              <Button 
                variant="destructive"
                onClick={() => controlMutation.mutate('stop')}
                disabled={controlMutation.isPending}
                className="flex items-center gap-2"
              >
                <Square className="h-4 w-4" />
                Stop
              </Button>
            </>
          )}
          {session.status === 'paused' && (
            <Button 
              onClick={() => controlMutation.mutate('resume')}
              disabled={controlMutation.isPending}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              Resume
            </Button>
          )}
          <Button 
            variant="outline"
            onClick={() => screenshotMutation.mutate()}
            disabled={screenshotMutation.isPending}
            className="flex items-center gap-2"
          >
            <Camera className="h-4 w-4" />
            Screenshot
          </Button>
        </div>
      </div>

      {/* Session Info Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tool</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold capitalize">{session.type}</div>
            <p className="text-xs text-muted-foreground">
              Engine: {session.agentType}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Runtime</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {formatDistanceToNow(new Date(session.createdAt))}
            </div>
            <p className="text-xs text-muted-foreground">
              Since creation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Browser</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold capitalize">{session.browser}</div>
            <p className="text-xs text-muted-foreground">
              {session.metadata?.config?.resolution?.width}x{session.metadata?.config?.resolution?.height}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stream Status</CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {isStreamConnected ? 'Connected' : 'Disconnected'}
            </div>
            <p className="text-xs text-muted-foreground">
              Live streaming
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="preview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="preview">Live Preview</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="recording">Recording</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>

        {/* Live Preview Tab */}
        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Live Browser Preview</CardTitle>
              <CardDescription>
                Real-time view of the browser automation session
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative bg-gray-900 rounded-lg overflow-hidden min-h-[600px]">
                {session.status === 'running' && session.metadata?.streamUrl ? (
                  <iframe
                    ref={vncRef}
                    src={session.metadata.streamUrl}
                    className="w-full h-[600px] border-0"
                    title={`Session ${session.id} Preview`}
                  />
                ) : (
                  <div className="flex items-center justify-center h-[600px] text-white">
                    <div className="text-center">
                      <Monitor className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-semibold mb-2">No Preview Available</h3>
                      <p className="text-gray-400">
                        {session.status === 'running' 
                          ? 'Stream is starting...' 
                          : 'Session must be running to show preview'
                        }
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Session Logs</CardTitle>
              <CardDescription>
                Real-time logs from the automation session
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] w-full rounded border bg-gray-950 p-4">
                <div className="font-mono text-sm text-gray-100">
                  {logs.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                      No logs yet. Logs will appear when the session starts running.
                    </div>
                  ) : (
                    logs.map((log, index) => (
                      <div key={index} className="flex items-start gap-2 py-1 hover:bg-gray-900">
                        <span className="text-gray-500 text-xs w-20 flex-shrink-0">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span className={`text-xs uppercase w-12 flex-shrink-0 ${getLogLevelColor(log.level)}`}>
                          {log.level}
                        </span>
                        <span className="flex-1 text-gray-200">{log.message}</span>
                      </div>
                    ))
                  )}
                  <div ref={logsEndRef} />
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
                <Cpu className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.cpu || 0}%</div>
                <Progress value={metrics?.cpu || 0} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.memory || 0}%</div>
                <Progress value={metrics?.memory || 0} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Network I/O</CardTitle>
                <Wifi className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(metrics?.network || 0).toFixed(1)} MB/s</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Data transfer rate
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
                  {Math.floor((metrics?.uptime || 0) / 60000)}m
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Minutes running
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Performance Timeline</CardTitle>
              <CardDescription>
                System performance over time (coming soon)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Performance charts will be displayed here
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recording Tab */}
        <TabsContent value="recording" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Session Recording</CardTitle>
              <CardDescription>
                Playback recorded session video
              </CardDescription>
            </CardHeader>
            <CardContent>
              {session.recordingUrl ? (
                <div className="space-y-4">
                  <video
                    ref={videoRef}
                    controls
                    className="w-full rounded-lg bg-black"
                    poster="/placeholder-video.jpg"
                  >
                    <source src={session.recordingUrl} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Duration: {session.endedAt 
                        ? formatDistanceToNow(new Date(session.createdAt), { includeSeconds: true })
                        : 'Recording in progress...'
                      }
                    </div>
                    <Button 
                      variant="outline" 
                      className="flex items-center gap-2"
                      onClick={() => window.open(session.recordingUrl, '_blank')}
                    >
                      <Download className="h-4 w-4" />
                      Download Recording
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16">
                  <Camera className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Recording Available</h3>
                  <p className="text-muted-foreground">
                    {session.status === 'running' 
                      ? 'Recording will be available when the session completes.'
                      : 'This session was not recorded or the recording failed.'
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="config" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Session Configuration</CardTitle>
                <CardDescription>Basic session settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="font-medium">Session ID:</div>
                  <div className="font-mono text-xs">{session.id}</div>
                  
                  <div className="font-medium">Tool:</div>
                  <div className="capitalize">{session.type}</div>
                  
                  <div className="font-medium">Browser:</div>
                  <div className="capitalize">{session.browser}</div>
                  
                  <div className="font-medium">Agent Type:</div>
                  <div className="capitalize">{session.agentType}</div>
                  
                  <div className="font-medium">Status:</div>
                  <div className="capitalize">{session.status}</div>
                  
                  <div className="font-medium">Created:</div>
                  <div>{new Date(session.createdAt).toLocaleString()}</div>
                  
                  {session.endedAt && (
                    <>
                      <div className="font-medium">Ended:</div>
                      <div>{new Date(session.endedAt).toLocaleString()}</div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Advanced Configuration</CardTitle>
                <CardDescription>Browser and automation settings</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-64">
                  {JSON.stringify(session.metadata, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}