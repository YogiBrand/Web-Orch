import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  PlayIcon,
  PauseIcon,
  StopCircle,
  Trash2,
  RefreshCw,
  Search,
  CheckSquare,
  Square,
  AlertCircle,
  Clock,
  Activity,
  Filter
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from '@/hooks/use-toast';
import { apiRequest } from '../lib/queryClient';

interface Session {
  id: string;
  sessionId: string;
  status: 'created' | 'running' | 'paused' | 'completed' | 'failed' | 'terminated';
  url?: string;
  agentType?: string;
  parentTaskId?: string;
  lastActivity?: Date;
  isInactive?: boolean;
  createdAt: Date;
  completedAt?: Date;
  duration?: number;
  errorDetails?: any;
}

interface SessionStats {
  total: number;
  running: number;
  paused: number;
  completed: number;
  failed: number;
  terminated: number;
}

export function SessionManager() {
  const queryClient = useQueryClient();
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [bulkAction, setBulkAction] = useState<string>('');
  
  // Fetch sessions
  const { data: sessions = [], isLoading, refetch } = useQuery({
    queryKey: ['sessions', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      const response = await fetch(`/api/sessions?${params}`);
      if (!response.ok) throw new Error('Failed to fetch sessions');
      const json = await response.json();
      // Normalize API shape: { success, data: { sessions: [...] } } → [...]
      if (json?.data?.sessions) return json.data.sessions;
      if (Array.isArray(json)) return json;
      if (Array.isArray(json?.sessions)) return json.sessions;
      return [];
    },
    refetchInterval: 5000 // Refresh every 5 seconds
  });
  
  // Fetch session stats
  const { data: stats } = useQuery({
    queryKey: ['session-stats'],
    queryFn: async () => {
      const response = await fetch('/api/sessions/stats');
      if (!response.ok) throw new Error('Failed to fetch session stats');
      const json = await response.json();
      return json?.data || json;
    },
    refetchInterval: 5000
  });
  
  // Pause session mutation
  const pauseSession = useMutation({
    mutationFn: async (sessionId: string) => {
      return apiRequest(`/api/sessions/${sessionId}/pause`, { method: 'POST' });
    },
    onSuccess: (data, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['session-stats'] });
      toast({
        title: 'Session paused',
        description: `Session ${sessionId} has been paused`
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to pause session',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  // Resume session mutation
  const resumeSession = useMutation({
    mutationFn: async (sessionId: string) => {
      return apiRequest(`/api/sessions/${sessionId}/resume`, { method: 'POST' });
    },
    onSuccess: (data, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['session-stats'] });
      toast({
        title: 'Session resumed',
        description: `Session ${sessionId} has been resumed`
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to resume session',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  // Stop session mutation
  const stopSession = useMutation({
    mutationFn: async (sessionId: string) => {
      // Backend supports 'terminate' (not 'stop')
      return apiRequest(`/api/sessions/${sessionId}/terminate`, { 
        method: 'POST',
        data: { reason: 'User requested' }
      });
    },
    onSuccess: (data, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['session-stats'] });
      toast({
        title: 'Session stopped',
        description: `Session ${sessionId} has been terminated`
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to stop session',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  // Delete session mutation
  const deleteSession = useMutation({
    mutationFn: async (sessionId: string) => {
      // Backend does not implement DELETE /:id; use bulk delete
      return apiRequest('/api/sessions/bulk', {
        method: 'POST',
        data: { action: 'delete', sessionIds: [sessionId] }
      });
    },
    onSuccess: (data, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['session-stats'] });
      setSelectedSessions(prev => {
        const next = new Set(prev);
        next.delete(sessionId);
        return next;
      });
      toast({
        title: 'Session deleted',
        description: `Session ${sessionId} has been deleted`
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete session',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  // Bulk operation mutation
  const bulkOperation = useMutation({
    mutationFn: async ({ action, sessionIds }: { action: string; sessionIds: string[] }) => {
      return apiRequest('/api/sessions/bulk', {
        method: 'POST',
        data: { action, sessionIds }
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['session-stats'] });
      setSelectedSessions(new Set());
      setBulkAction('');
      toast({
        title: 'Bulk operation completed',
        description: data.message
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Bulk operation failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  // Filter sessions based on search term
  const filteredSessions = useMemo(() => {
    return sessions.filter((session: Session) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        session.sessionId?.toLowerCase().includes(term) ||
        session.url?.toLowerCase().includes(term) ||
        session.agentType?.toLowerCase().includes(term) ||
        session.parentTaskId?.toLowerCase().includes(term)
      );
    });
  }, [sessions, searchTerm]);
  
  // Check if session is inactive (> 10 minutes)
  const isSessionInactive = (session: Session) => {
    if (session.status !== 'running') return false;
    if (!session.lastActivity) return false;
    
    const lastActivity = new Date(session.lastActivity);
    const now = new Date();
    const diffMs = now.getTime() - lastActivity.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    
    return diffMinutes >= 10;
  };
  
  // Toggle session selection
  const toggleSessionSelection = (sessionId: string) => {
    setSelectedSessions(prev => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };
  
  // Select all visible sessions
  const selectAllSessions = () => {
    if (selectedSessions.size === filteredSessions.length) {
      setSelectedSessions(new Set());
    } else {
      setSelectedSessions(new Set(filteredSessions.map((s: Session) => s.id)));
    }
  };
  
  // Execute bulk action
  const executeBulkAction = () => {
    if (!bulkAction || selectedSessions.size === 0) return;
    
    bulkOperation.mutate({
      action: bulkAction,
      sessionIds: Array.from(selectedSessions)
    });
  };
  
  // Get status badge
  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      running: { variant: 'default', className: 'bg-green-500' },
      paused: { variant: 'secondary', className: 'bg-yellow-500' },
      completed: { variant: 'outline', className: '' },
      failed: { variant: 'destructive', className: '' },
      terminated: { variant: 'outline', className: 'text-gray-500' },
      created: { variant: 'outline', className: 'text-blue-500' }
    };
    
    const config = variants[status] || { variant: 'outline', className: '' };
    
    return (
      <Badge variant={config.variant} className={config.className}>
        {status}
      </Badge>
    );
  };
  
  // Format duration
  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };
  
  // Format last activity
  const formatLastActivity = (date?: Date) => {
    if (!date) return '-';
    const activity = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - activity.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return activity.toLocaleDateString();
  };
  
  return (
    <div className="p-6 space-y-6">
      {/* Header and Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Session Management</h2>
          <p className="text-muted-foreground">
            Manage browser sessions, monitor activity, and control resources
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
      
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600">
                Running
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{stats.running}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-yellow-600">
                Paused
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-yellow-600">{stats.paused}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-600">
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">{stats.completed}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600">
                Failed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Terminated
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-600">{stats.terminated}</p>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Filters and Bulk Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sessions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Bulk Actions */}
            {selectedSessions.size > 0 && (
              <div className="flex items-center gap-2">
                <Select value={bulkAction} onValueChange={setBulkAction}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Bulk action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pause">Pause Selected</SelectItem>
                    <SelectItem value="resume">Resume Selected</SelectItem>
                    <SelectItem value="stop">Stop Selected</SelectItem>
                    <SelectItem value="delete">Delete Selected</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button
                  onClick={executeBulkAction}
                  disabled={!bulkAction || bulkOperation.isPending}
                  size="sm"
                >
                  Apply ({selectedSessions.size})
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Sessions Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <input
                      type="checkbox"
                      checked={selectedSessions.size === filteredSessions.length && filteredSessions.length > 0}
                      onChange={selectAllSessions}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </TableHead>
                  <TableHead>Session ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                      Loading sessions...
                    </TableCell>
                  </TableRow>
                ) : filteredSessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No sessions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSessions.map((session: Session) => {
                    const inactive = isSessionInactive(session);
                    
                    return (
                      <TableRow 
                        key={session.id}
                        className={cn(
                          inactive && "bg-yellow-50"
                        )}
                      >
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedSessions.has(session.id)}
                            onChange={() => toggleSessionSelection(session.id)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {session.sessionId?.slice(0, 20)}...
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(session.status)}
                            {inactive && (
                              <AlertCircle className="h-4 w-4 text-yellow-600" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{session.agentType || '-'}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {session.url || '-'}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {session.parentTaskId?.slice(0, 8) || '-'}
                        </TableCell>
                        <TableCell>{formatDuration(session.duration)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {session.status === 'running' && (
                              <Activity className="h-3 w-3 text-green-500" />
                            )}
                            {formatLastActivity(session.lastActivity)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {session.status === 'running' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => pauseSession.mutate(session.id)}
                                disabled={pauseSession.isPending}
                              >
                                <PauseIcon className="h-4 w-4" />
                              </Button>
                            )}
                            
                            {session.status === 'paused' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => resumeSession.mutate(session.id)}
                                disabled={resumeSession.isPending}
                              >
                                <PlayIcon className="h-4 w-4" />
                              </Button>
                            )}
                            
                            {(session.status === 'running' || session.status === 'paused') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => stopSession.mutate(session.id)}
                                disabled={stopSession.isPending}
                              >
                                <StopCircle className="h-4 w-4" />
                              </Button>
                            )}
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteSession.mutate(session.id)}
                              disabled={deleteSession.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
