import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import {
  PlayIcon,
  PauseIcon,
  StopCircle,
  Trash2,
  RefreshCw,
  Search,
  AlertCircle,
  Clock,
  Activity,
  Filter
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from '@/hooks/use-toast';

interface Session {
  id: string;
  sessionId: string;
  status: 'created' | 'running' | 'paused' | 'completed' | 'failed' | 'terminated';
  url?: string;
  agentType?: string;
  parentTaskId?: string;
  lastActivity?: Date;
  createdAt: Date;
  completedAt?: Date;
  duration?: number;
}

export function SessionManagerSimple() {
  const queryClient = useQueryClient();
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Fetch sessions
  const { data: sessionsData, isLoading, refetch } = useQuery({
    queryKey: ['sessions', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      const response = await fetch(`/api/sessions?${params}`);
      if (!response.ok) {
        // Return empty array if API not available yet
        return [];
      }
      const data = await response.json();
      // Handle both array response and object with sessions property
      return Array.isArray(data) ? data : (data.sessions || []);
    },
    retry: false,
    refetchInterval: 5000
  });
  
  const sessions = Array.isArray(sessionsData) ? sessionsData : [];
  
  // Session mutations
  const pauseSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(`/api/sessions/${sessionId}/pause`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to pause session');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast({ title: 'Session paused' });
    }
  });
  
  const resumeSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(`/api/sessions/${sessionId}/resume`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to resume session');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast({ title: 'Session resumed' });
    }
  });
  
  const stopSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(`/api/sessions/${sessionId}/stop`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'User requested' })
      });
      if (!response.ok) throw new Error('Failed to stop session');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast({ title: 'Session stopped' });
    }
  });
  
  const deleteSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete session');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast({ title: 'Session deleted' });
    }
  });
  
  const bulkOperation = useMutation({
    mutationFn: async ({ action, sessionIds }: { action: string; sessionIds: string[] }) => {
      const response = await fetch('/api/sessions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, sessionIds })
      });
      if (!response.ok) throw new Error('Failed to perform bulk operation');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setSelectedSessions(new Set());
      toast({ title: 'Bulk operation completed' });
    }
  });
  
  // Filter sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((session: Session) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        session.sessionId?.toLowerCase().includes(term) ||
        session.url?.toLowerCase().includes(term) ||
        session.agentType?.toLowerCase().includes(term)
      );
    });
  }, [sessions, searchTerm]);
  
  // Check if session is inactive
  const isSessionInactive = (session: Session) => {
    if (session.status !== 'running') return false;
    if (!session.lastActivity) return false;
    
    const lastActivity = new Date(session.lastActivity);
    const now = new Date();
    const diffMs = now.getTime() - lastActivity.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    
    return diffMinutes >= 10;
  };
  
  // Toggle selection
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
  
  const selectAllSessions = () => {
    if (selectedSessions.size === filteredSessions.length) {
      setSelectedSessions(new Set());
    } else {
      setSelectedSessions(new Set(filteredSessions.map((s: Session) => s.id)));
    }
  };
  
  const executeBulkAction = (action: string) => {
    if (selectedSessions.size === 0) return;
    bulkOperation.mutate({
      action,
      sessionIds: Array.from(selectedSessions)
    });
  };
  
  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      running: 'bg-green-500 text-white',
      paused: 'bg-yellow-500 text-white',
      completed: 'bg-gray-500 text-white',
      failed: 'bg-red-500 text-white',
      terminated: 'bg-orange-500 text-white',
      created: 'bg-blue-500 text-white'
    };
    
    return (
      <Badge className={cn('text-xs', colors[status] || 'bg-gray-500 text-white')}>
        {status}
      </Badge>
    );
  };
  
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Session Management</h2>
          <p className="text-muted-foreground">
            Manage browser sessions with pause, resume, and bulk operations
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
      
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
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">All Status</option>
              <option value="running">Running</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="terminated">Terminated</option>
            </select>
            
            {/* Bulk Actions */}
            {selectedSessions.size > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {selectedSessions.size} selected
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => executeBulkAction('pause')}
                >
                  <PauseIcon className="h-4 w-4 mr-1" />
                  Pause
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => executeBulkAction('resume')}
                >
                  <PlayIcon className="h-4 w-4 mr-1" />
                  Resume
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => executeBulkAction('stop')}
                >
                  <StopCircle className="h-4 w-4 mr-1" />
                  Stop
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => executeBulkAction('delete')}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
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
            <table className="w-full">
              <thead className="border-b">
                <tr>
                  <th className="p-3 text-left w-12">
                    <input
                      type="checkbox"
                      checked={selectedSessions.size === filteredSessions.length && filteredSessions.length > 0}
                      onChange={selectAllSessions}
                      className="w-4 h-4"
                    />
                  </th>
                  <th className="p-3 text-left">Session ID</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Agent</th>
                  <th className="p-3 text-left">URL</th>
                  <th className="p-3 text-left">Last Activity</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                      Loading sessions...
                    </td>
                  </tr>
                ) : filteredSessions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      No sessions found
                    </td>
                  </tr>
                ) : (
                  filteredSessions.map((session: Session) => {
                    const inactive = isSessionInactive(session);
                    
                    return (
                      <tr 
                        key={session.id}
                        className={cn(
                          "border-b hover:bg-gray-50",
                          inactive && "bg-yellow-50"
                        )}
                      >
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedSessions.has(session.id)}
                            onChange={() => toggleSessionSelection(session.id)}
                            className="w-4 h-4"
                          />
                        </td>
                        <td className="p-3 font-mono text-xs">
                          {session.sessionId?.slice(0, 20)}...
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {getStatusBadge(session.status)}
                            {inactive && (
                              <AlertCircle className="h-4 w-4 text-yellow-600" />
                            )}
                          </div>
                        </td>
                        <td className="p-3">{session.agentType || '-'}</td>
                        <td className="p-3 max-w-[200px] truncate">
                          {session.url || '-'}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            {session.status === 'running' && (
                              <Activity className="h-3 w-3 text-green-500" />
                            )}
                            {formatLastActivity(session.lastActivity)}
                          </div>
                        </td>
                        <td className="p-3">
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
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}