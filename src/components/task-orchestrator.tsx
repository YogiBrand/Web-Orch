import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Brain, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Zap, 
  Eye, 
  Globe, 
  ArrowRight,
  BarChart3,
  Activity,
  Target,
  Layers
} from "lucide-react";

interface OrchestrationTask {
  id: string;
  originalPrompt: string;
  strategy: 'skyvern' | 'browser-use' | 'crawl4ai' | 'mcp' | 'hybrid';
  reasoning: string;
  status: 'analyzing' | 'routing' | 'executing' | 'completed' | 'failed';
  subtasks: SubTask[];
  finalResult?: any;
  error?: string;
  metadata: {
    complexity: 'simple' | 'moderate' | 'complex';
    estimatedTime: number;
    confidence: number;
    requiresVision: boolean;
    requiresInteraction: boolean;
    requiresJavaScript: boolean;
  };
  createdAt: string;
  completedAt?: string;
  executionLog: ExecutionLogEntry[];
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
  startedAt?: string;
  completedAt?: string;
}

interface ExecutionLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: any;
}

interface SystemStatus {
  orchestrator: { active: number; total: number };
  skyvern: { status: string; message: string };
  browserUse: { activeTasks: number };
  crawl4ai: { status: string };
  seleniumGrid: any;
}

export function TaskOrchestrator() {
  const [prompt, setPrompt] = useState("");
  const [urls, setUrls] = useState("");
  const [forceStrategy, setForceStrategy] = useState<string>("");
  const [maxSessions, setMaxSessions] = useState(1);


  const { data: systemStatus } = useQuery({
    queryKey: ['/api/orchestrator/status'],
    refetchInterval: 5000
  });

  const { data: orchestratorTasks, refetch: refetchTasks } = useQuery({
    queryKey: ['/api/orchestrator/tasks'],
    refetchInterval: 2000
  });

  const executeMutation = useMutation({
    mutationFn: async (data: {
      prompt: string;
      urls?: string[];
      maxSessions?: number;
      forceStrategy?: string;
    }): Promise<OrchestrationTask> => {
      return await apiRequest("/api/orchestrator/execute", "POST", data);
    },
    onSuccess: () => {
      refetchTasks();
      queryClient.invalidateQueries({ queryKey: ['/api/orchestrator/status'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (taskId: string): Promise<void> => {
      return await apiRequest(`/api/orchestrator/tasks/${taskId}`, "DELETE");
    },
    onSuccess: () => {
      refetchTasks();
    },
  });

  const handleExecute = () => {
    if (!prompt.trim()) return;

    const urlList = urls.split('\n').map(u => u.trim()).filter(u => u);
    
    executeMutation.mutate({
      prompt: prompt.trim(),
      urls: urlList.length > 0 ? urlList : undefined,
      maxSessions,
      forceStrategy: forceStrategy === "auto" ? undefined : forceStrategy || undefined
    });
  };

  const getStrategyIcon = (strategy: string) => {
    switch (strategy) {
      case 'skyvern': return <Eye className="w-4 h-4" />;
      case 'browser-use': return <Brain className="w-4 h-4" />;
      case 'crawl4ai': return <Globe className="w-4 h-4" />;
      case 'mcp': return <Zap className="w-4 h-4" />;
      case 'hybrid': return <Layers className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  const getStrategyColor = (strategy: string) => {
    switch (strategy) {
      case 'skyvern': return 'bg-purple-500';
      case 'browser-use': return 'bg-blue-500';
      case 'crawl4ai': return 'bg-green-500';
      case 'mcp': return 'bg-orange-500';
      case 'hybrid': return 'bg-indigo-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'executing': case 'routing': case 'analyzing': return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatDuration = (start: string, end?: string) => {
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    if (duration < 60) return `${duration}s`;
    if (duration < 3600) return `${Math.round(duration / 60)}m`;
    return `${Math.round(duration / 3600)}h`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Brain className="w-6 h-6 text-purple-500" />
        <h2 className="text-2xl font-bold">Intelligent Task Orchestrator</h2>
        <Badge variant="secondary">Skyvern + browser-use + Crawl4AI</Badge>
      </div>

      <Tabs defaultValue="execute" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="execute">Execute Task</TabsTrigger>
          <TabsTrigger value="monitor">Monitor Tasks</TabsTrigger>
          <TabsTrigger value="system">System Status</TabsTrigger>
        </TabsList>

        <TabsContent value="execute" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Task Execution</CardTitle>
              <CardDescription>
                Describe your automation task. The orchestrator will analyze and route to the optimal system.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="task-prompt">Task Description</Label>
                <Textarea
                  id="task-prompt"
                  placeholder="e.g., Search for 'autonomous vehicles' on Google and extract the top 10 results with titles and descriptions"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="target-urls">Target URLs (optional, one per line)</Label>
                <Textarea
                  id="target-urls"
                  placeholder="https://example1.com&#10;https://example2.com"
                  value={urls}
                  onChange={(e) => setUrls(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="force-strategy">Force Strategy (optional)</Label>
                  <Select value={forceStrategy} onValueChange={setForceStrategy}>
                    <SelectTrigger>
                      <SelectValue placeholder="Auto-select (recommended)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto-select</SelectItem>
                      <SelectItem value="skyvern">Skyvern (Visual AI)</SelectItem>
                      <SelectItem value="browser-use">browser-use (LLM+DOM)</SelectItem>
                      <SelectItem value="crawl4ai">Crawl4AI (Extraction)</SelectItem>
                      <SelectItem value="mcp">MCP (Protocol)</SelectItem>
                      <SelectItem value="hybrid">Hybrid (Multi-system)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="max-sessions">Max Parallel Sessions</Label>
                  <Input
                    id="max-sessions"
                    type="number"
                    min="1"
                    max="10"
                    value={maxSessions}
                    onChange={(e) => setMaxSessions(parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>

              <Button 
                onClick={handleExecute}
                disabled={executeMutation.isPending || !prompt.trim()}
                className="w-full"
                data-testid="button-execute-task"
              >
                {executeMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing & Executing...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4 mr-2" />
                    Execute Task
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitor" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Task Monitoring</CardTitle>
              <CardDescription>
                Monitor active and completed orchestration tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {(orchestratorTasks as any)?.tasks?.map((task: OrchestrationTask) => (
                    <Card key={task.id} className="border-l-4" style={{borderLeftColor: task.status === 'completed' ? '#10b981' : task.status === 'failed' ? '#ef4444' : '#3b82f6'}}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(task.status)}
                            <span className="font-medium">{task.status.charAt(0).toUpperCase() + task.status.slice(1)}</span>
                            <div className={`px-2 py-1 rounded-full text-xs text-white flex items-center gap-1 ${getStrategyColor(task.strategy)}`}>
                              {getStrategyIcon(task.strategy)}
                              {task.strategy}
                            </div>
                          </div>
                          <div className="text-right text-sm text-muted-foreground">
                            <div>{formatDuration(task.createdAt, task.completedAt)}</div>
                            <div>Confidence: {Math.round(task.metadata.confidence * 100)}%</div>
                          </div>
                        </div>

                        <p className="text-sm text-gray-700 mb-2 line-clamp-2">
                          {task.originalPrompt}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                          <span>Complexity: {task.metadata.complexity}</span>
                          <span>Est. Time: {Math.round(task.metadata.estimatedTime / 1000)}s</span>
                          <span>Subtasks: {task.subtasks.length}</span>
                        </div>

                        <div className="text-xs text-blue-600 mb-3">
                          <strong>Strategy:</strong> {task.reasoning}
                        </div>

                        {task.subtasks.length > 0 && (
                          <div className="space-y-2">
                            <Label className="text-xs">Subtasks:</Label>
                            {task.subtasks.map((subtask) => (
                              <div key={subtask.id} className="flex items-center gap-2 text-xs p-2 bg-gray-50 rounded">
                                {getStatusIcon(subtask.status)}
                                <span className="font-medium">{subtask.type}</span>
                                <ArrowRight className="w-3 h-3" />
                                <span className="flex-1 truncate">{subtask.prompt}</span>
                                {subtask.startedAt && (
                                  <span className="text-muted-foreground">
                                    {formatDuration(subtask.startedAt, subtask.completedAt)}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {task.error && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                            Error: {task.error}
                          </div>
                        )}

                        {task.status === 'executing' && (
                          <div className="mt-2 flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => cancelMutation.mutate(task.id)}
                              disabled={cancelMutation.isPending}
                            >
                              Cancel Task
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}

                  {!(orchestratorTasks as any)?.tasks?.length && (
                    <div className="text-center py-8 text-gray-500">
                      No orchestration tasks yet. Execute a task to see it here.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Brain className="w-5 h-5 text-purple-500" />
                  Orchestrator
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Active Tasks</span>
                    <span className="font-medium">{(systemStatus as any)?.orchestrator?.active || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Tasks</span>
                    <span className="font-medium">{(systemStatus as any)?.orchestrator?.total || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Eye className="w-5 h-5 text-purple-600" />
                  Skyvern
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    (systemStatus as any)?.skyvern?.status === 'healthy' ? 'bg-green-500' : 
                    (systemStatus as any)?.skyvern?.status === 'unhealthy' ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                  <span className="text-sm">{(systemStatus as any)?.skyvern?.message || 'Checking...'}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Activity className="w-5 h-5 text-blue-500" />
                  browser-use
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Active Tasks</span>
                  <span className="font-medium">{(systemStatus as any)?.browserUse?.activeTasks || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Globe className="w-5 h-5 text-green-500" />
                  Crawl4AI
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm">{(systemStatus as any)?.crawl4ai?.status || 'Active'}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="w-5 h-5 text-orange-500" />
                  Selenium Grid
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Sessions</span>
                    <span className="font-medium">{(systemStatus as any)?.seleniumGrid?.sessions?.total || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Active Sessions</span>
                    <span className="font-medium">{(systemStatus as any)?.seleniumGrid?.sessions?.active || 0}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      (systemStatus as any)?.seleniumGrid?.hub?.status === 'connected' ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <span className="text-xs">{(systemStatus as any)?.seleniumGrid?.hub?.status || 'Unknown'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}