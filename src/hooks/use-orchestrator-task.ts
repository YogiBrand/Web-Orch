import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

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

interface SubTask {
  id: string;
  type: 'skyvern' | 'browser-use' | 'crawl4ai' | 'mcp';
  prompt: string;
  url?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
  sessionId?: string;
  sessionMetadata?: {
    browser: string;
    headless: boolean;
    viewport: { width: number; height: number };
    proxy?: string;
    userAgent?: string;
    createdAt: string;
    lastActivity: string;
  };
  startedAt?: string;
  completedAt?: string;
}

interface OrchestrationTask {
  id: string;
  originalPrompt: string;
  strategy: 'skyvern' | 'browser-use' | 'crawl4ai' | 'mcp' | 'hybrid';
  reasoning: string;
  status: 'analyzing' | 'routing' | 'executing' | 'completed' | 'failed';
  subtasks: SubTask[];
  finalResult?: any;
  error?: string;
  sessionConfig?: SessionConfig;
  allocatedSessions: string[];
  metadata: {
    complexity: 'simple' | 'moderate' | 'complex';
    estimatedTime: number;
    confidence: number;
    requiresVision: boolean;
    requiresInteraction: boolean;
    requiresJavaScript: boolean;
    requiresSessions: boolean;
    optimalSessionCount: number;
  };
  createdAt: string;
  completedAt?: string;
  executionLog: Array<{
    timestamp: string;
    level: 'info' | 'warn' | 'error';
    message: string;
    data?: any;
  }>;
}

interface ExecuteTaskParams {
  prompt: string;
  urls?: string[];
  maxSessions?: number;
  forceStrategy?: 'skyvern' | 'browser-use' | 'crawl4ai' | 'mcp' | 'hybrid';
  timeout?: number;
  sessionConfig?: Partial<SessionConfig>;
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

export function useOrchestratorTask() {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Create task mutation
  const executeTaskMutation = useMutation({
    mutationFn: async (params: ExecuteTaskParams): Promise<OrchestrationTask> => {
      const response = await apiRequest("/api/orchestrator/execute", "POST", params);
      return response;
    },
    onSuccess: (task: OrchestrationTask) => {
      setActiveTaskId(task.id);
      setIsMonitoring(true);
      queryClient.invalidateQueries({ queryKey: ["/api/orchestrator/tasks"] });
    },
    onError: (error) => {
      console.error("Failed to execute orchestrator task:", error);
    },
  });

  // Cancel task mutation
  const cancelTaskMutation = useMutation({
    mutationFn: async (taskId: string): Promise<{ success: boolean; message: string }> => {
      const response = await apiRequest(`/api/orchestrator/tasks/${taskId}`, "DELETE");
      return response;
    },
    onSuccess: () => {
      setActiveTaskId(null);
      setIsMonitoring(false);
      queryClient.invalidateQueries({ queryKey: ["/api/orchestrator/tasks"] });
    },
  });

  // Get all tasks
  const { data: allTasks = [] } = useQuery<{ tasks: OrchestrationTask[]; total: number }>({
    queryKey: ["/api/orchestrator/tasks"],
    refetchInterval: 2000, // Refresh every 2 seconds when monitoring
    enabled: isMonitoring,
  });

  // Get specific task
  const { data: activeTask } = useQuery<OrchestrationTask>({
    queryKey: ["/api/orchestrator/tasks", activeTaskId],
    enabled: !!activeTaskId,
    refetchInterval: 1000, // Refresh every second for active task
  });

  // Get system status
  const { data: systemStatus } = useQuery({
    queryKey: ["/api/orchestrator/status"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Get active sessions
  const { data: activeSessions = [] } = useQuery<{ sessions: ActiveSession[]; total: number }>({
    queryKey: ["/api/sessions/active"],
    refetchInterval: 3000, // Refresh every 3 seconds
    enabled: isMonitoring,
  });

  // Auto-stop monitoring when task completes
  useEffect(() => {
    if (activeTask && (activeTask.status === 'completed' || activeTask.status === 'failed')) {
      const timer = setTimeout(() => {
        setIsMonitoring(false);
      }, 5000); // Stop monitoring 5 seconds after completion
      
      return () => clearTimeout(timer);
    }
  }, [activeTask?.status]);

  // Get task sessions (sessions allocated to current task)
  const taskSessions = activeSessions.sessions?.filter(session => 
    activeTask?.allocatedSessions.includes(session.id)
  ) || [];

  // Calculate task progress
  const getTaskProgress = (task: OrchestrationTask | undefined) => {
    if (!task) return { completed: 0, total: 0, percentage: 0 };
    
    const totalSteps = task.subtasks.length || 1;
    const completedSteps = task.subtasks.filter(st => st.status === 'completed').length;
    const failedSteps = task.subtasks.filter(st => st.status === 'failed').length;
    
    return {
      completed: completedSteps,
      failed: failedSteps,
      total: totalSteps,
      percentage: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0
    };
  };

  // Get latest log entry
  const getLatestLogEntry = (task: OrchestrationTask | undefined) => {
    if (!task || !task.executionLog.length) return null;
    return task.executionLog[task.executionLog.length - 1];
  };

  // Get session for screenshot
  const getSessionScreenshot = async (sessionId: string): Promise<{ screenshot: string } | null> => {
    try {
      const response = await apiRequest(`/api/sessions/${sessionId}/screenshot`, "GET");
      return response;
    } catch (error) {
      console.error("Failed to get session screenshot:", error);
      return null;
    }
  };

  return {
    // Mutations
    executeTask: executeTaskMutation.mutateAsync,
    cancelTask: cancelTaskMutation.mutateAsync,
    
    // Loading states
    isExecuting: executeTaskMutation.isPending,
    isCancelling: cancelTaskMutation.isPending,
    
    // Task data
    activeTask,
    activeTaskId,
    allTasks: allTasks.tasks || [],
    
    // Session data
    activeSessions: activeSessions.sessions || [],
    taskSessions,
    
    // System status
    systemStatus,
    
    // Monitoring
    isMonitoring,
    setIsMonitoring,
    
    // Utilities
    getTaskProgress,
    getLatestLogEntry,
    getSessionScreenshot,
    
    // Manual controls
    startMonitoring: () => setIsMonitoring(true),
    stopMonitoring: () => setIsMonitoring(false),
    setActiveTaskId,
  };
}