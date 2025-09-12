import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  AlertTriangle, Play, Square, Eye, Trash2, Plus, RefreshCw, 
  MonitorPlay, Pause, Camera, Copy, CheckCircle2, XCircle,
  Activity, Cpu, HardDrive, Zap, TrendingUp, Users, 
  Globe, Shield, Terminal, Settings, Filter, Grid3x3,
  List, LayoutGrid, Search, ChevronRight
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { SessionCreationModal } from "@/components/session-creation-modal";
import { SessionDetails } from "@/components/session-details";
import { SessionGrid } from "@/components/session-grid";
import { EnhancedTaskView } from "@/components/enhanced-task-view";
import { SessionManagerSimple } from "@/components/session-manager-simple";
import { useAppWebSocket } from "@/hooks/use-websocket";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/sidebar";

export interface Session {
  id: string;
  name: string;
  type: 'browser-use' | 'playwright' | 'puppeteer' | 'selenium' | 'computer-use';
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'terminated';
  browser: 'chrome' | 'firefox' | 'edge' | 'safari';
  agentType?: string;
  lastActivity?: string; // Add last activity tracking
  isInactive?: boolean; // Add inactive flag
  taskData?: {
    taskId?: string;
    taskName?: string;
    concurrency?: number;
  };
  config?: {
    viewport?: { width: number; height: number };
    userAgent?: string;
    proxy?: string;
    headless?: boolean;
    stealth?: boolean;
    recording?: boolean;
    antiDetection?: {
      enabled: boolean;
      level: 'basic' | 'advanced' | 'military';
      fingerprinting?: boolean;
      behavioralBiometrics?: boolean;
    };
  };
  metrics?: {
    cpuUsage?: number;
    memoryUsage?: number;
    networkLatency?: number;
    requestsPerSecond?: number;
    dataTransferred?: number;
  };
  metadata?: {
    streamUrl?: string;
    previewUrl?: string;
    recordingUrl?: string;
    screenshotUrl?: string;
    logs?: Array<{
      timestamp: string;
      level: 'info' | 'warning' | 'error';
      message: string;
    }>;
  };
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  duration?: number;
  actions?: number;
  errors?: number;
}

interface SessionsStats {
  total: number;
  running: number;
  paused: number;
  completed: number;
  failed: number;
  avgDuration: number;
  successRate: number;
  activeUsers: number;
  resourceUsage: {
    cpu: number;
    memory: number;
    network: number;
  };
}

interface SessionUpdate {
  type: 'session_update' | 'session_created' | 'session_deleted' | 'metrics_update';
  data: {
    sessionId: string;
    status?: string;
    metrics?: any;
    metadata?: any;
  };
  timestamp: string;
}

export default function Sessions() {
  const [, setLocation] = useLocation();
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'grouped'>('grid');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterBrowser, setFilterBrowser] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [useNewManager, setUseNewManager] = useState(false); // Toggle for new session manager - disabled to use original design
  const queryClient = useQueryClient();

  const handleSectionChange = (section: string) => {
    if (section === "tasks") {
      setLocation("/tasks");
    } else if (section === "sessions") {
      // Already on sessions page, do nothing
      return;
    } else if (section === "data-portal") {
      setLocation("/data-portal");
    } else if (section === "agents" || section === "agents-dashboard") {
      setLocation("/agents");
    } else if (section === "agents-marketplace") {
      setLocation("/agents/marketplace");
    } else if (section === "agents-create") {
      setLocation("/agents/new");
    } else {
      // Navigate back to dashboard with the section as a query parameter
      setLocation(`/?section=${section}`);
    }
  };

  // WebSocket for real-time updates
  const { lastMessage, isConnected } = useAppWebSocket();

  // Fetch sessions with filtering
  const { data: sessionsData, isLoading, refetch } = useQuery({
    queryKey: ['sessions', filterStatus, filterBrowser, filterType, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      // Align query params with backend API expectations
      if (filterBrowser !== 'all') params.append('browserType', filterBrowser);
      if (filterType !== 'all') params.append('agentType', filterType);
      if (searchQuery) params.append('search', searchQuery);
      
      const data = await apiRequest(`/api/sessions?${params.toString()}`);
      // Normalize various possible shapes into a consistent object
      // Possible shapes:
      // - { success, data: { sessions: [...], total, ... } }
      // - { sessions: [...], total, ... }
      // - [...]
      if (Array.isArray(data)) {
        return { sessions: data };
      }
      if (data?.data?.sessions) {
        const { sessions, total, limit, offset } = data.data;
        return { sessions, total, limit, offset };
      }
      return data;
    },
    refetchInterval: 5000,
  });

  // Fetch session statistics
  const { data: statsData } = useQuery({
    queryKey: ['session-stats'],
    queryFn: async () => {
      const response = await apiRequest('/api/sessions/stats');
      return response?.data || response; // Extract data from API response
    },
    refetchInterval: 10000,
  });

  // Helper functions to map API data to frontend enums
  const mapBrowserTypeToSessionType = (browserType: string): Session['type'] => {
    switch (browserType?.toLowerCase()) {
      case 'chromium':
      case 'chrome':
        return 'playwright'; // Default chrome sessions to playwright
      case 'firefox':
        return 'playwright';
      case 'webkit':
      case 'safari':
        return 'playwright';
      default:
        return 'browser-use';
    }
  };

  const mapApiStatusToSessionStatus = (status: string): Session['status'] => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'running':
        return 'running';
      case 'inactive':
      case 'paused':
        return 'paused';
      case 'closed':
      case 'completed':
        return 'completed';
      case 'error':
      case 'failed':
        return 'failed';
      case 'terminated':
        return 'terminated';
      case 'initializing':
      case 'pending':
      default:
        return 'pending';
    }
  };

  const mapBrowserTypeToBrowser = (browserType: string): Session['browser'] => {
    switch (browserType?.toLowerCase()) {
      case 'chromium':
      case 'chrome':
        return 'chrome';
      case 'firefox':
        return 'firefox';
      case 'webkit':
      case 'safari':
        return 'safari';
      case 'edge':
        return 'edge';
      default:
        return 'chrome';
    }
  };

  // Process sessions to add inactivity detection and map API data to frontend interface
  const processedSessions = useMemo(() => {
    console.log('🔄 Processing sessions data:', sessionsData);
    // Accept API shapes:
    // - { data: { sessions: [...] } }
    // - { sessions: [...] }
    // - [...]
    const body: any = sessionsData as any;
    const rawApiSessions: any[] = (
      body?.data?.sessions ??
      (Array.isArray(body?.data) ? body.data : undefined) ??
      body?.sessions ??
      (Array.isArray(body) ? body : [])
    );
    console.log('📝 Raw API sessions count:', rawApiSessions.length);

    const enableDebugPreview = ((import.meta as any).env?.VITE_ENABLE_DEBUG_PREVIEW as string) === 'true';

    return rawApiSessions.map((apiSession: any) => {
      // Map API fields to frontend Session interface
      const session: Session = {
        id: apiSession.id,
        name: apiSession.sessionKey || `Session ${apiSession.id.slice(0, 8)}`,
        type: mapBrowserTypeToSessionType(apiSession.browserType),
        status: mapApiStatusToSessionStatus(apiSession.status),
        browser: mapBrowserTypeToBrowser(apiSession.browserType),
        agentType: apiSession.agentType || 'browser',
        lastActivity: apiSession.lastActivityAt,
        taskData: {
          taskId: apiSession.taskId,
          taskName: apiSession.taskName,
          concurrency: apiSession.concurrency,
        },
        config: {
          viewport: apiSession.viewportConfig,
          userAgent: apiSession.userAgent,
          proxy: apiSession.proxyConfig,
          headless: true, // Default headless
          stealth: false, // Default no stealth
          recording: false, // Default no recording
        },
        metadata: {
          streamUrl: apiSession.vncUrl,
          // Avoid rendering preview against DevTools port 9222 unless explicitly enabled
          previewUrl: (enableDebugPreview || !(apiSession.debugUrl || '').includes(':9222'))
            ? (apiSession.previewUrl || apiSession.screenshotUrl || null)
            : null,
          screenshotUrl: apiSession.screenshotUrl,
          recordingUrl: apiSession.recordingUrl,
          logs: []
        },
        createdAt: apiSession.createdAt,
        startedAt: apiSession.startedAt,
        endedAt: apiSession.endedAt,
        duration: apiSession.totalDuration,
        actions: apiSession.totalActions || 0,
        errors: apiSession.errorCount || 0,
      };

      // Check if session is inactive (no activity for 10+ minutes)
      if (session.status === 'running' && session.lastActivity) {
        const lastActivity = new Date(session.lastActivity);
        const now = new Date();
        const diffMs = now.getTime() - lastActivity.getTime();
        const diffMinutes = Math.floor(diffMs / 60000);
        session.isInactive = diffMinutes >= 10;
      }

      return session;
    });
  }, [sessionsData]);

  console.log('📊 Final processed sessions count:', processedSessions.length);
  console.log('🎯 Sample processed session:', processedSessions[0]);

  const sessions: Session[] = processedSessions;
  const stats: SessionsStats = statsData || {
    total: 0,
    running: 0,
    paused: 0,
    completed: 0,
    failed: 0,
    avgDuration: 0,
    successRate: 0,
    activeUsers: 0,
    resourceUsage: { cpu: 0, memory: 0, network: 0 }
  };

  // Handle WebSocket updates
  useEffect(() => {
    if (lastMessage) {
      try {
        const update = lastMessage as SessionUpdate;
        if (update.type === 'session_update' || update.type === 'session_created' || update.type === 'session_deleted') {
          queryClient.invalidateQueries({ queryKey: ['sessions'] });
          queryClient.invalidateQueries({ queryKey: ['session-stats'] });
        }
        if (update.type === 'metrics_update' || update.type === 'session-metrics-updated') {
          // Update metrics in real-time without refetching
          queryClient.setQueryData(
            ['sessions', filterStatus, filterBrowser, filterType, searchQuery],
            (oldData: any) => {
              if (!oldData) return oldData;

              const updatedSessions = oldData.sessions.map((session: Session) => {
                if (session.id === update.data.sessionId) {
                  return {
                    ...session,
                    metrics: update.data.metrics || session.metrics
                  };
                }
                return session;
              });

              return { ...oldData, sessions: updatedSessions };
            }
          );
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    }
  }, [lastMessage, queryClient, filterStatus, filterBrowser, filterType, searchQuery]);

  // Mutations
  const terminateSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return await apiRequest(`/api/sessions/${sessionId}/terminate`, { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['session-stats'] });
    },
  });

  const pauseSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return await apiRequest(`/api/sessions/${sessionId}/pause`, { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  const resumeSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return await apiRequest(`/api/sessions/${sessionId}/resume`, { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  const screenshotSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return await apiRequest(`/api/sessions/${sessionId}/screenshot`, { method: 'POST' });
    },
  });

  const bulkActionMutation = useMutation({
    mutationFn: async ({ action, sessionIds }: { action: string; sessionIds: string[] }) => {
      return await apiRequest('/api/sessions/bulk', {
        method: 'POST',
        body: JSON.stringify({ action, sessionIds }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['session-stats'] });
      setSelectedSessions(new Set());
    },
  });

  // Handlers
  const handleCreateSession = useCallback(() => {
    setShowCreateModal(true);
  }, []);

  const handleViewSession = useCallback((sessionId: string) => {
    setSelectedSession(sessionId);
  }, []);

  const handleBulkAction = useCallback((action: string) => {
    if (selectedSessions.size === 0) return;
    
    let message = '';
    if (action === 'terminate' || action === 'stop') {
      message = `Are you sure you want to stop ${selectedSessions.size} sessions?`;
    } else if (action === 'delete') {
      message = `Are you sure you want to delete ${selectedSessions.size} sessions?`;
    } else {
      message = `Are you sure you want to ${action} ${selectedSessions.size} sessions?`;
    }
    
    if (window.confirm(message)) {
      bulkActionMutation.mutate({ 
        action, 
        sessionIds: Array.from(selectedSessions) 
      });
    }
  }, [selectedSessions, bulkActionMutation]);

  const handleSelectAll = useCallback(() => {
    if (selectedSessions.size === sessions.length) {
      setSelectedSessions(new Set());
    } else {
      setSelectedSessions(new Set(sessions.map(s => s.id)));
    }
  }, [sessions, selectedSessions]);

  const handleSelectSession = useCallback((sessionId: string, selected: boolean) => {
    const newSelection = new Set(selectedSessions);
    if (selected) {
      newSelection.add(sessionId);
    } else {
      newSelection.delete(sessionId);
    }
    setSelectedSessions(newSelection);
  }, [selectedSessions]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      running: 'bg-green-100 text-green-800 border-green-200',
      paused: 'bg-blue-100 text-blue-800 border-blue-200',
      completed: 'bg-gray-100 text-gray-800 border-gray-200',
      failed: 'bg-red-100 text-red-800 border-red-200',
      terminated: 'bg-orange-100 text-orange-800 border-orange-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getBrowserIcon = (browser: string) => {
    const icons: Record<string, string> = {
      chrome: '🌐',
      firefox: '🦊',
      edge: '🌊',
      safari: '🧭'
    };
    return icons[browser] || '🌐';
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      'browser-use': '🤖',
      'playwright': '🎭',
      'puppeteer': '🎪',
      'selenium': '⚙️',
      'computer-use': '💻'
    };
    return icons[type] || '🔧';
  };

  // Show session details if one is selected
  if (selectedSession) {
    const session = sessions.find(s => s.id === selectedSession);
    if (session) {
      // Use EnhancedTaskView for task-based sessions
      if (session.taskData?.taskId) {
        return (
          <EnhancedTaskView 
            taskId={session.taskData.taskId}
            onClose={() => setSelectedSession(null)}
          />
        );
      }
      // Fallback to SessionDetails for non-task sessions
      return (
        <SessionDetails 
          session={session}
          onBack={() => setSelectedSession(null)}
          onTerminate={() => {
            terminateSessionMutation.mutate(session.id);
            setSelectedSession(null);
          }}
          onPause={() => pauseSessionMutation.mutate(session.id)}
          onResume={() => resumeSessionMutation.mutate(session.id)}
          onScreenshot={() => screenshotSessionMutation.mutate(session.id)}
        />
      );
    }
  }

  // Use the new SessionManager if toggle is on
  if (useNewManager) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar 
          activeSection="sessions" 
          onSectionChange={handleSectionChange} 
        />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <SessionManagerSimple />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar 
        activeSection="sessions" 
        onSectionChange={handleSectionChange} 
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Sessions</h1>
                <p className="text-muted-foreground mt-1">
                  Manage and monitor browser automation sessions in real-time
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={isConnected ? "default" : "secondary"} className="gap-1">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    isConnected ? "bg-green-500 animate-pulse" : "bg-gray-400"
                  )} />
                  {isConnected ? "Live" : "Offline"}
                </Badge>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => refetch()}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
                <Button onClick={handleCreateSession} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Session
                </Button>
              </div>
            </div>

            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
                  <MonitorPlay className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.activeUsers} active users
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Running</CardTitle>
                  <Play className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats.running}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.paused} paused
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.completed} completed
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
                  <Cpu className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.resourceUsage.cpu.toFixed(1)}%</div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                    <div 
                      className="bg-purple-600 h-1.5 rounded-full transition-all"
                      style={{ width: `${stats.resourceUsage.cpu}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Memory</CardTitle>
                  <HardDrive className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.resourceUsage.memory.toFixed(1)}%</div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                    <div 
                      className="bg-orange-600 h-1.5 rounded-full transition-all"
                      style={{ width: `${stats.resourceUsage.memory}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters and Actions Bar */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search sessions..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 w-80"
                        />
                      </div>
                      
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="running">Running</SelectItem>
                          <SelectItem value="paused">Paused</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="failed">Failed</SelectItem>
                          <SelectItem value="terminated">Terminated</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Select value={filterBrowser} onValueChange={setFilterBrowser}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Browser" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Browsers</SelectItem>
                          <SelectItem value="chrome">Chrome</SelectItem>
                          <SelectItem value="firefox">Firefox</SelectItem>
                          <SelectItem value="edge">Edge</SelectItem>
                          <SelectItem value="safari">Safari</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="browser-use">Browser Use</SelectItem>
                          <SelectItem value="playwright">Playwright</SelectItem>
                          <SelectItem value="puppeteer">Puppeteer</SelectItem>
                          <SelectItem value="selenium">Selenium</SelectItem>
                          <SelectItem value="computer-use">Computer Use</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                        className="gap-2"
                      >
                        <Filter className="h-4 w-4" />
                        Advanced
                      </Button>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 border rounded-lg p-1">
                        <Button
                          variant={viewMode === 'grid' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setViewMode('grid')}
                          className="h-7 w-7 p-0"
                        >
                          <Grid3x3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={viewMode === 'list' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setViewMode('list')}
                          className="h-7 w-7 p-0"
                        >
                          <List className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={viewMode === 'grouped' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setViewMode('grouped')}
                          className="h-7 w-7 p-0"
                        >
                          <LayoutGrid className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Bulk Actions */}
                  {selectedSessions.size > 0 && (
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          {selectedSessions.size} selected
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleSelectAll}
                        >
                          {selectedSessions.size === sessions.length ? 'Deselect All' : 'Select All'}
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleBulkAction('pause')}
                          className="gap-2"
                        >
                          <Pause className="h-4 w-4" />
                          Pause
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleBulkAction('resume')}
                          className="gap-2"
                        >
                          <Play className="h-4 w-4" />
                          Resume
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleBulkAction('stop')}
                          className="gap-2"
                        >
                          <Square className="h-4 w-4" />
                          Stop
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleBulkAction('screenshot')}
                          className="gap-2"
                        >
                          <Camera className="h-4 w-4" />
                          Screenshot
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleBulkAction('delete')}
                          className="gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Sessions Content */}
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex items-center justify-center h-96">
                    <div className="flex flex-col items-center gap-3">
                      <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                      <p className="text-muted-foreground">Loading sessions...</p>
                    </div>
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-96 gap-4">
                    <MonitorPlay className="h-12 w-12 text-gray-400" />
                    <div className="text-center">
                      <h3 className="font-semibold text-lg">No sessions found</h3>
                      <p className="text-muted-foreground mt-1">
                        Create your first session to get started with browser automation
                      </p>
                    </div>
                    <Button onClick={handleCreateSession} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Create First Session
                    </Button>
                  </div>
                ) : (
                  <SessionGrid
                    sessions={sessions}
                    viewMode={viewMode}
                    selectedSessions={selectedSessions}
                    onSelectSession={handleSelectSession}
                    onViewSession={handleViewSession}
                    onTerminateSession={(id) => terminateSessionMutation.mutate(id)}
                    onPauseSession={(id) => pauseSessionMutation.mutate(id)}
                    onResumeSession={(id) => resumeSessionMutation.mutate(id)}
                    onScreenshotSession={(id) => screenshotSessionMutation.mutate(id)}
                    getStatusColor={getStatusColor}
                    getBrowserIcon={getBrowserIcon}
                    getTypeIcon={getTypeIcon}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Create Session Modal */}
      <SessionCreationModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSessionCreated={() => {
          // Invalidate all sessions queries regardless of filter parameters
          queryClient.invalidateQueries({ 
            predicate: (query) => query.queryKey[0] === 'sessions'
          });
          queryClient.invalidateQueries({ queryKey: ['session-stats'] });
          setShowCreateModal(false);
          // Force immediate refetch
          refetch();
        }}
      />
    </div>
  );
}
