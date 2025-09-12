import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft,
  Play,
  Square,
  RefreshCw,
  Maximize2,
  Monitor,
  Terminal,
  Activity,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

interface SessionViewerProps {
  sessionId: string;
  onBack: () => void;
}

interface SessionLog {
  timestamp: string;
  level: string;
  message: string;
  type?: string;
}

export function SessionViewer({ sessionId, onBack }: SessionViewerProps) {
  const [logs, setLogs] = useState<SessionLog[]>([]);
  const [isConnecting, setIsConnecting] = useState(true);
  const [streamError, setStreamError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();

  // Fetch session details
  const { data: session, isLoading } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => apiRequest(`/api/sessions/${sessionId}`),
    refetchInterval: 2000,
  });

  // Start session mutation
  const startSessionMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/sessions/${sessionId}/start`, { method: 'POST' });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
      if (data.streamUrl) {
        connectToStream(data.streamUrl);
      }
    },
  });

  // Stop session mutation
  const stopSessionMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/sessions/${sessionId}/stop`, { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
      disconnectStream();
    },
  });

  // Connect to noVNC stream
  const connectToStream = useCallback((streamUrl: string) => {
    setIsConnecting(true);
    setStreamError(null);
    
    // For noVNC, we use an iframe pointing to the noVNC web client
    // The URL should be something like: http://localhost:6080/vnc.html?host=localhost&port=5900
    const vncUrl = streamUrl || `http://localhost:6080/vnc.html?host=localhost&port=5900&autoconnect=true&resize=scale`;
    
    if (iframeRef.current) {
      iframeRef.current.src = vncUrl;
      
      // Wait for iframe to load
      iframeRef.current.onload = () => {
        setIsConnecting(false);
        addLog('info', 'Connected to browser session');
      };
      
      iframeRef.current.onerror = () => {
        setStreamError('Failed to connect to browser stream');
        setIsConnecting(false);
        addLog('error', 'Failed to connect to browser stream');
      };
    }
  }, []);

  // Connect to WebSocket for logs
  useEffect(() => {
    if (session?.status === 'running') {
      // Connect to WebSocket for real-time logs
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const envWs = import.meta.env.VITE_WS_BASE_URL;
      const base = envWs ?? `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(`${base}/sessions/${sessionId}`);
      
      ws.onopen = () => {
        addLog('info', 'Connected to session logs');
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'log') {
            addLog(data.level || 'info', data.message);
          } else if (data.type === 'action') {
            addLog('info', `[Action] ${data.action}: ${data.details}`);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      ws.onerror = () => {
        addLog('error', 'WebSocket connection error');
      };
      
      ws.onclose = () => {
        addLog('info', 'Disconnected from session logs');
      };
      
      wsRef.current = ws;
      
      // If session is running and has a stream URL, connect to it
      if (session.metadata?.streamUrl || session.metadata?.vncPort) {
        const streamUrl = session.metadata.streamUrl || 
          `http://localhost:${session.metadata.vncPort || 6080}/vnc.html?autoconnect=true&resize=scale`;
        connectToStream(streamUrl);
      }
    }
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [session?.status, sessionId, connectToStream]);

  // Disconnect stream
  const disconnectStream = useCallback(() => {
    if (iframeRef.current) {
      iframeRef.current.src = 'about:blank';
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  // Add log entry
  const addLog = useCallback((level: string, message: string) => {
    const newLog: SessionLog = {
      timestamp: new Date().toISOString(),
      level,
      message
    };
    setLogs(prev => [...prev.slice(-99), newLog]); // Keep last 100 logs
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Handle session start
  const handleStartSession = async () => {
    addLog('info', 'Starting session...');
    await startSessionMutation.mutateAsync();
  };

  // Handle session stop
  const handleStopSession = async () => {
    addLog('info', 'Stopping session...');
    await stopSessionMutation.mutateAsync();
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

  const getLogColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-400';
      case 'warn':
        return 'text-yellow-400';
      case 'info':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h2 className="text-xl font-semibold mb-4">Session not found</h2>
        <Button onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Sessions
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <span className="font-semibold">Session #{session.id}</span>
              {getStatusIcon(session.status)}
              <Badge variant={session.status === 'running' ? 'default' : 'secondary'}>
                {session.status}
              </Badge>
            </div>
            <span className="text-sm text-muted-foreground">
              {session.type} • {session.browser}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {session.status === 'created' && (
              <Button 
                onClick={handleStartSession}
                disabled={startSessionMutation.isPending}
                size="sm"
              >
                {startSessionMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Start Session
              </Button>
            )}
            {session.status === 'running' && (
              <Button 
                onClick={handleStopSession}
                disabled={stopSessionMutation.isPending}
                variant="destructive"
                size="sm"
              >
                {stopSessionMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Square className="h-4 w-4 mr-2" />
                )}
                Stop Session
              </Button>
            )}
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Browser View */}
        <div className="flex-1 flex flex-col">
          <Tabs defaultValue="browser" className="flex-1 flex flex-col">
            <TabsList className="mx-4 mt-4 w-fit">
              <TabsTrigger value="browser" className="gap-2">
                <Monitor className="h-4 w-4" />
                Browser
              </TabsTrigger>
              <TabsTrigger value="details" className="gap-2">
                <Activity className="h-4 w-4" />
                Details
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="browser" className="flex-1 p-4">
              <Card className="h-full bg-black">
                <div className="relative h-full">
                  {session.status === 'running' ? (
                    <>
                      {isConnecting && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
                          <div className="text-center text-white">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                            <p>Connecting to browser session...</p>
                          </div>
                        </div>
                      )}
                      {streamError && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
                          <div className="text-center text-white">
                            <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-500" />
                            <p className="text-red-400">{streamError}</p>
                            <Button 
                              onClick={() => window.location.reload()} 
                              variant="outline" 
                              size="sm"
                              className="mt-4"
                            >
                              Retry Connection
                            </Button>
                          </div>
                        </div>
                      )}
                      <iframe
                        ref={iframeRef}
                        className="w-full h-full border-0"
                        title="Browser Session"
                        allow="camera; microphone; fullscreen"
                        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                      />
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full text-white">
                      <div className="text-center">
                        <Monitor className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-semibold mb-2">Session Not Running</h3>
                        <p className="text-gray-400 mb-4">
                          {session.status === 'created' 
                            ? 'Click "Start Session" to begin'
                            : `Session is ${session.status}`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>
            
            <TabsContent value="details" className="flex-1 p-4">
              <Card className="h-full">
                <ScrollArea className="h-full p-6">
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold mb-3">Session Information</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Session ID:</span>
                          <p className="font-mono">{session.id}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Status:</span>
                          <p className="capitalize">{session.status}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Tool:</span>
                          <p className="capitalize">{session.type}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Browser:</span>
                          <p className="capitalize">{session.browser}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Created:</span>
                          <p>{formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Duration:</span>
                          <p>{session.duration || 0} seconds</p>
                        </div>
                      </div>
                    </div>
                    
                    {session.metadata && (
                      <div>
                        <h3 className="font-semibold mb-3">Configuration</h3>
                        <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto">
                          {JSON.stringify(session.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Logs Panel */}
        <div className="w-96 border-l flex flex-col">
          <div className="border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              <span className="font-semibold">Logs</span>
              <Badge variant="outline" className="ml-auto">
                {logs.length}
              </Badge>
            </div>
          </div>
          
          <ScrollArea className="flex-1 bg-gray-950">
            <div className="p-4 font-mono text-xs space-y-1">
              {logs.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No logs yet. Logs will appear when the session starts.
                </div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="flex gap-2">
                    <span className="text-gray-600">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className={`uppercase ${getLogColor(log.level)}`}>
                      [{log.level}]
                    </span>
                    <span className="text-gray-300 flex-1">
                      {log.message}
                    </span>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}