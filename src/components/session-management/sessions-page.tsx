import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Play, Square, Eye, Trash2, Plus, RefreshCw, MonitorPlay } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { CreateSessionModal } from "./create-session-modal";
import { SessionViewer } from "./session-viewer";
import { SessionsGrid } from "./sessions-grid";
import { useWebSocket } from "@/hooks/use-websocket";
import { apiRequest } from "@/lib/queryClient";

export interface Session {
  id: string;
  name: string;
  type: string;
  status: 'created' | 'running' | 'completed' | 'failed';
  browser?: string;
  agentType?: string;
  taskData?: {
    taskId?: string;
    concurrency?: number;
  };
  metadata?: {
    config?: any;
    browserSession?: any;
    liveMetrics?: any;
    streamUrl?: string;
  };
  createdAt: string;
  endedAt?: string;
  recordingUrl?: string;
  streamUrl?: string;
}

interface SessionUpdate {
  type: 'session_update';
  data: {
    sessionId: string;
    status: string;
    metadata?: any;
  };
  timestamp: string;
}

export function SessionsPage() {
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTool, setFilterTool] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

  // Fetch sessions with filtering
  const { data: sessionsData, isLoading } = useQuery({
    queryKey: ['sessions', filterStatus, filterTool, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterTool !== 'all') params.append('tool', filterTool);
      if (searchQuery) params.append('search', searchQuery);
      
      return await apiRequest(`/api/sessions?${params.toString()}`);
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const sessions = sessionsData?.sessions || [];
  const totalSessions = sessionsData?.total || 0;

  // WebSocket connection for real-time updates
  const { lastMessage } = useWebSocket('/ws');

  useEffect(() => {
    if (lastMessage) {
      try {
        const update: SessionUpdate = JSON.parse(lastMessage);
        if (update.type === 'session_update') {
          // Update the sessions query cache
          queryClient.setQueryData(
            ['sessions', filterStatus, filterTool, searchQuery],
            (oldData: any) => {
              if (!oldData) return oldData;
              
              const updatedSessions = oldData.sessions.map((session: Session) => {
                if (session.id === update.data.sessionId) {
                  return {
                    ...session,
                    status: update.data.status,
                    metadata: { ...session.metadata, ...update.data.metadata }
                  };
                }
                return session;
              });

              return { ...oldData, sessions: updatedSessions };
            }
          );
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    }
  }, [lastMessage, queryClient, filterStatus, filterTool, searchQuery]);

  // Terminate session mutation
  const terminateSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return await apiRequest(`/api/sessions/${sessionId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      created: { variant: 'secondary', color: 'bg-blue-100 text-blue-800' },
      running: { variant: 'default', color: 'bg-green-100 text-green-800' },
      completed: { variant: 'default', color: 'bg-gray-100 text-gray-800' },
      failed: { variant: 'destructive', color: 'bg-red-100 text-red-800' }
    };

    return (
      <Badge className={variants[status]?.color || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    );
  };

  const getToolIcon = (tool: string) => {
    const icons: Record<string, any> = {
      'browser-use': '🌐',
      'skyvern': '🦅',
      'playwright': '🎭',
      'puppeteer': '🎪',
      'selenium': '🔧'
    };
    return icons[tool] || '🔧';
  };

  const handleCreateSession = useCallback(() => {
    setShowCreateModal(true);
  }, []);

  const handleViewSession = useCallback((sessionId: string) => {
    setSelectedSession(sessionId);
  }, []);

  const handleTerminateSession = useCallback((sessionId: string) => {
    if (window.confirm('Are you sure you want to terminate this session?')) {
      terminateSessionMutation.mutate(sessionId);
    }
  }, [terminateSessionMutation]);

  // Group sessions by task for parallel execution visualization
  const groupedSessions = sessions.reduce((groups: Record<string, Session[]>, session: Session) => {
    const taskId = session.taskData?.taskId || 'standalone';
    if (!groups[taskId]) groups[taskId] = [];
    groups[taskId].push(session);
    return groups;
  }, {});

  if (selectedSession) {
    return (
      <SessionViewer 
        sessionId={selectedSession} 
        onBack={() => setSelectedSession(null)}
      />
    );
  }

  return (
    <div className="flex-1 bg-background">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Session Management</h1>
          <p className="text-muted-foreground">
            Manage browser automation sessions with live streaming and recording
          </p>
        </div>
        <Button onClick={handleCreateSession} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Session
        </Button>
      </div>

      {/* System Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <MonitorPlay className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSessions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Running Sessions</CardTitle>
            <Play className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sessions.filter((s: Session) => s.status === 'running').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Square className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sessions.filter((s: Session) => s.status === 'completed').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sessions.filter((s: Session) => s.status === 'failed').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Session Filters</CardTitle>
          <CardDescription>Filter and search sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Input
              placeholder="Search sessions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="created">Created</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterTool} onValueChange={setFilterTool}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by tool" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tools</SelectItem>
                <SelectItem value="browser-use">Browser Use</SelectItem>
                <SelectItem value="skyvern">Skyvern</SelectItem>
                <SelectItem value="playwright">Playwright</SelectItem>
                <SelectItem value="puppeteer">Puppeteer</SelectItem>
                <SelectItem value="selenium">Selenium</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              onClick={() => queryClient.invalidateQueries({ queryKey: ['sessions'] })}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sessions View */}
      <Card>
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
          <CardDescription>
            {totalSessions} session{totalSessions !== 1 ? 's' : ''} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="table" className="space-y-4">
            <TabsList>
              <TabsTrigger value="table">Table View</TabsTrigger>
              <TabsTrigger value="grid">Grid View</TabsTrigger>
              <TabsTrigger value="tasks">By Tasks</TabsTrigger>
            </TabsList>
            
            <TabsContent value="table" className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Session</TableHead>
                      <TableHead>Tool</TableHead>
                      <TableHead>Browser</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Task ID</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={7} className="text-center py-4">
                            <div className="animate-pulse bg-gray-200 h-4 rounded"></div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : sessions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <div className="text-muted-foreground">
                            No sessions found. Create your first session to get started.
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      sessions.map((session: Session) => (
                        <TableRow key={session.id} className="hover:bg-gray-50">
                          <TableCell>
                            <div className="font-medium">{session.name}</div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {session.id}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span>{getToolIcon(session.type)}</span>
                              <span className="capitalize">{session.type}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="capitalize">{session.browser || 'N/A'}</span>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(session.status)}
                          </TableCell>
                          <TableCell>
                            {session.taskData?.taskId ? (
                              <span className="font-mono text-xs">
                                {session.taskData.taskId}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Standalone</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewSession(session.id)}
                                className="h-8 w-8 p-0"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {(session.status === 'running' || session.status === 'created') && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleTerminateSession(session.id)}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="grid" className="space-y-4">
              <SessionsGrid 
                sessions={sessions}
                onViewSession={handleViewSession}
                onTerminateSession={handleTerminateSession}
              />
            </TabsContent>

            <TabsContent value="tasks" className="space-y-4">
              <div className="space-y-6">
                {Object.entries(groupedSessions).map(([taskId, taskSessions]) => (
                  <Card key={taskId}>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {taskId === 'standalone' ? 'Standalone Sessions' : `Task: ${taskId}`}
                      </CardTitle>
                      <CardDescription>
                        {taskSessions.length} session{taskSessions.length !== 1 ? 's' : ''}
                        {taskSessions.length > 1 && ' (Parallel Execution)'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <SessionsGrid 
                        sessions={taskSessions}
                        onViewSession={handleViewSession}
                        onTerminateSession={handleTerminateSession}
                        compact={true}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Create Session Modal */}
      <CreateSessionModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSessionCreated={() => {
          queryClient.invalidateQueries({ queryKey: ['sessions'] });
          setShowCreateModal(false);
        }}
      />
      </div>
    </div>
  );
}