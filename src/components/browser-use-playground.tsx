import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
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
  Zap,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  FileText,
  ArrowLeft,
  ArrowRight,
  Copy
} from "lucide-react";
import { UnifiedTaskConfig } from "./unified-task-config";

interface TaskStep {
  id: number;
  goal: string;
  action: string;
  url: string;
  screenshot: string;
  cost: number;
  timestamp: string;
  success: boolean;
}

interface PlaygroundTask {
  id: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  description: string;
  model: string;
  parallelSessions: number;
  targetUrls: string[];
  duration: number;
  cost: number;
  steps: TaskStep[];
  currentStep: number;
  totalSteps: number;
  createdAt: string;
  completedAt?: string;
}

export function BrowserUsePlayground() {
  console.log("BrowserUsePlayground component is rendering");
  
  const [taskDescription, setTaskDescription] = useState("Google results for github and extract the top 5 results");
  const [selectedModel, setSelectedModel] = useState("openai/gpt-4o");
  const [selectedAgent, setSelectedAgent] = useState("browser-use");
  const [currentTask, setCurrentTask] = useState<PlaygroundTask | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [viewport, setViewport] = useState({ width: 1280, height: 720 });
  const [headless, setHeadless] = useState(false);
  const [timeout, setTimeout] = useState(30000);
  const [activeResultsTab, setActiveResultsTab] = useState("overview");
  const [isRunning, setIsRunning] = useState(false);
  const [parallelSessions, setParallelSessions] = useState(1);
  const [targetUrls, setTargetUrls] = useState("");
  const [maxSteps, setMaxSteps] = useState(20);
  const [timeoutValue, setTimeoutValue] = useState(300);
  const [enableStealth, setEnableStealth] = useState(true);
  const [enableProxy, setEnableProxy] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Fetch available models
  const { data: models = [] } = useQuery<any[]>({
    queryKey: ['/api/models']
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      return await apiRequest("/api/orchestrator/tasks", "POST", taskData);
    },
    onSuccess: (data) => {
      // Mock a running task with steps for demonstration
      const mockTask: PlaygroundTask = {
        id: data.taskId,
        status: 'running',
        description: taskDescription,
        model: selectedModel,
        parallelSessions,
        targetUrls: targetUrls ? targetUrls.split('\n').filter(Boolean) : [],
        duration: 0,
        cost: 0,
        currentStep: 1,
        totalSteps: 4,
        createdAt: new Date().toISOString(),
        steps: [
          {
            id: 1,
            goal: "Navigate to Google search results for 'github' and extract top 5 result titles and links.",
            action: "about:blank",
            url: "https://www.google.com/search?q=github",
            screenshot: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4gIDxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiBmaWxsPSIjZjBmMGYwIi8+ICA8dGV4dCB4PSI0MDAiIHk9IjMwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE2IiBmaWxsPSIjNjY2Ij5Mb2FkaW5nIHNjcmVlbnNob3QuLi48L3RleHQ+PC9zdmc+",
            cost: 0.01,
            timestamp: new Date().toISOString(),
            success: true
          },
          {
            id: 2,
            goal: "Try extract_structured_data again with a broader query asking for all visible links and titles, then manually pick first 5 organic results.",
            action: "extract_structured_data",
            url: "https://www.google.com/search?q=github",
            screenshot: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4gIDxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiBmaWxsPSIjZjhmOWZhIi8+ICA8cmVjdCB4PSI1MCIgeT0iNTAiIHdpZHRoPSI3MDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjZmZmIiBzdHJva2U9IiNlMWU1ZTkiLz4gIDx0ZXh0IHg9IjQwMCIgeT0iMTEwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiMxZjJkM2QiPkdvb2dsZSBTZWFyY2g8L3RleHQ+ICA8cmVjdCB4PSI1MCIgeT0iMTgwIiB3aWR0aD0iNzAwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjZjdmYWZjIiBzdHJva2U9IiNlMWU1ZTkiLz4gIDx0ZXh0IHg9IjcwIiB5PSIyMTAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzM3NDE1MSI+R2l0SHViOiBXaGVyZSB0aGUgd29ybGQgYnVpbGRzIHNvZnR3YXJlPC90ZXh0PiAgPHRleHQgeD0iNzAiIHk9IjIzNSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjNjM2NjZhIj5odHRwczovL2dpdGh1Yi5jb208L3RleHQ+PC9zdmc+",
            cost: 0.01,
            timestamp: new Date().toISOString(),
            success: true
          },
          {
            id: 3,
            goal: "Scroll down slightly to view search results list to confirm the order of results after the GitHub main listing and capture top five organic results accurately.",
            action: "scroll",
            url: "https://www.google.com/search?q=github",
            screenshot: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4gIDxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiBmaWxsPSIjZjhmOWZhIi8+ICA8cmVjdCB4PSI1MCIgeT0iNTAiIHdpZHRoPSI3MDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjZmZmIiBzdHJva2U9IiNlMWU1ZTkiLz4gIDx0ZXh0IHg9IjQwMCIgeT0iMTEwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiMxZjJkM2QiPkdvb2dsZSBTZWFyY2ggUmVzdWx0czwvdGV4dD4gIDxyZWN0IHg9IjUwIiB5PSIxODAiIHdpZHRoPSI3MDAiIGhlaWdodD0iNjAiIGZpbGw9IiNmN2ZhZmMiIHN0cm9rZT0iI2UxZTVlOSIvPiAgPHRleHQgeD0iNzAiIHk9IjIwNSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjMzc0MTUxIj4xLiBHaXRIdWI6IFdoZXJlIHRoZSB3b3JsZCBidWlsZHMgc29mdHdhcmU8L3RleHQ+ICA8cmVjdCB4PSI1MCIgeT0iMjUwIiB3aWR0aD0iNzAwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjZjdmYWZjIiBzdHJva2U9IiNlMWU1ZTkiLz4gIDx0ZXh0IHg9IjcwIiB5PSIyNzUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzM3NDE1MSI+Mi4gR2l0SHViIERlc2t0b3A8L3RleHQ+ICA8cmVjdCB4PSI1MCIgeT0iMzIwIiB3aWR0aD0iNzAwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjZjdmYWZjIiBzdHJva2U9IiNlMWU1ZTkiLz4gIDx0ZXh0IHg9IjcwIiB5PSIzNDUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzM3NDE1MSI+My4gR2l0SHViIERvY3M8L3RleHQ+PC9zdmc+",
            cost: 0.01,
            timestamp: new Date().toISOString(),
            success: true
          },
          {
            id: 4,
            goal: "Scroll further down to view additional organic results and then extract their titles and URLs.",
            action: "extract_content",
            url: "https://www.google.com/search?q=github",
            screenshot: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4gIDxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiBmaWxsPSIjZjhmOWZhIi8+ICA8cmVjdCB4PSI1MCIgeT0iNTAiIHdpZHRoPSI3MDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjZmZmIiBzdHJva2U9IiNlMWU1ZTkiLz4gIDx0ZXh0IHg9IjQwMCIgeT0iMTEwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiMxZjJkM2QiPkdvb2dsZSBTZWFyY2ggLSBUb3AgNSBSZXN1bHRzPC90ZXh0PiAgPHJlY3QgeD0iNTAiIHk9IjE4MCIgd2lkdGg9IjcwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9IiNmN2ZhZmMiIHN0cm9rZT0iI2UxZTVlOSIvPiAgPHRleHQgeD0iNzAiIHk9IjIwNSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjMzc0MTUxIj5FeHRyYWN0ZWQgVG9wIDUgUmVzdWx0czo8L3RleHQ+ICA8dGV4dCB4PSI3MCIgeT0iMjMwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTAiIGZpbGw9IiM2MzY2NmEiPjEuIEdpdEh1YjogV2hlcmUgdGhlIHdvcmxkIGJ1aWxkcyBzb2Z0d2FyZTwvdGV4dD4gIDx0ZXh0IHg9IjcwIiB5PSIyNTAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMCIgZmlsbD0iIzYzNjY2YSI+Mi4gR2l0SHViIERlc2t0b3A8L3RleHQ+ICA8dGV4dCB4PSI3MCIgeT0iMjcwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTAiIGZpbGw9IiM2MzY2NmEiPjMuIEdpdEh1YiBEb2NzPC90ZXh0PiAgPHRleHQgeD0iNzAiIHk9IjI5MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEwIiBmaWxsPSIjNjM2NjZhIj40LiBHaXRIdWIgRW50ZXJwcmlzZTwvdGV4dD4gIDx0ZXh0IHg9IjcwIiB5PSIzMTAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMCIgZmlsbD0iIzYzNjY2YSI+NS4gR2l0SHViIENsaTwvdGV4dD48L3N2Zz4=",
            cost: 0.01,
            timestamp: new Date().toISOString(),
            success: true
          }
        ]
      };
      setCurrentTask(mockTask);
      
      // Simulate task completion after a delay
      setTimeout(() => {
        setCurrentTask(prev => prev ? { 
          ...prev, 
          status: 'completed', 
          completedAt: new Date().toISOString(),
          duration: 24 
        } : null);
        setIsRunning(false);
      }, 3000);
    }
  });

  const handleRunTask = () => {
    const taskData = {
      prompt: taskDescription,
      llmModel: selectedModel,
      agent: selectedAgent,
      options: {
        urls: targetUrls ? targetUrls.split('\n').filter(Boolean) : undefined,
        maxSessions: parallelSessions,
        timeout,
        viewport,
        headless,
        forceStrategy: selectedAgent
      }
    };
    setIsRunning(true);
    createTaskMutation.mutate(taskData);
  };

  const handleStopTask = () => {
    setCurrentTask(prev => prev ? { ...prev, status: 'failed' } : null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-orange-500 text-white';
      case 'completed': return 'bg-green-500 text-white';
      case 'failed': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'running': return 'running';
      case 'completed': return 'completed';
      case 'failed': return 'failed';
      default: return 'idle';
    }
  };

  const currentStep = currentTask?.steps[currentStepIndex];

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Page Header */}
      <div className="bg-white dark:bg-gray-800 border-b">
        <div className="mx-auto w-full max-w-6xl px-6 flex items-end justify-between pt-[72px] pb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Playground</h1>
            <p className="text-muted-foreground mt-1">Test browser automation tasks</p>
          </div>
        </div>
      </div>

      {/* Main two-column layout in a centered container */}
      <div className="flex-1 overflow-hidden">
        <div className="mx-auto w-full max-w-6xl px-6 h-full flex gap-6">
      {/* Left Panel - Task Configuration */}
      <div className="w-80 shrink-0 bg-white border border-gray-200 p-6 rounded-md">
        <div className="space-y-6">

          <div className="space-y-4">
            <div>
              <Label htmlFor="task-description" className="text-sm font-medium text-gray-700">
                Task Description
                <span className="ml-1 text-gray-400">ⓘ</span>
              </Label>
              <Textarea
                id="task-description"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="Describe what you want the browser to do..."
                className="mt-1 h-20 text-sm"
                data-testid="textarea-task-description"
              />
            </div>

            <Button
              variant={showConfig ? "secondary" : "outline"}
              onClick={() => setShowConfig(!showConfig)}
              className="w-full"
              data-testid="toggle-config"
            >
              <Settings className="w-4 h-4 mr-2" />
              {showConfig ? "Hide" : "Show"} Configuration
            </Button>

            {showConfig && (
              <UnifiedTaskConfig
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
                selectedAgent={selectedAgent}
                onAgentChange={setSelectedAgent}
                parallelSessions={parallelSessions}
                onParallelSessionsChange={setParallelSessions}
                advancedSettings={{
                  viewport,
                  onViewportChange: setViewport,
                  headless,
                  onHeadlessChange: setHeadless,
                  timeout,
                  onTimeoutChange: setTimeout
                }}
              />
            )}

            <div>
              <Label htmlFor="target-urls" className="text-sm font-medium text-gray-700">
                Target URLs (optional)
              </Label>
              <Textarea
                id="target-urls"
                value={targetUrls}
                onChange={(e) => setTargetUrls(e.target.value)}
                placeholder="https://example.com&#10;https://another.com"
                className="mt-1 h-16 text-sm"
                data-testid="textarea-target-urls"
              />
            </div>

            <div className="pt-4">
              {currentTask?.status === 'running' ? (
                <Button
                  onClick={handleStopTask}
                  variant="destructive"
                  className="w-full"
                  data-testid="button-stop-task"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Stop Task
                </Button>
              ) : (
                <Button
                  onClick={handleRunTask}
                  disabled={!taskDescription.trim() || createTaskMutation.isPending}
                  className="w-full"
                  data-testid="button-run-task"
                >
                  {createTaskMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  Run New Task
                </Button>
              )}

              {currentTask?.status === 'completed' && (
                <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Task completed successfully!</span>
                </div>
              )}
            </div>

            <div className="text-xs text-gray-500">
              Press <kbd className="px-1 py-0.5 bg-gray-100 rounded">Ctrl+Enter</kbd> to run quickly
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Results */}
      <div className="flex-1 bg-white border border-gray-200 rounded-md">
        <div className="h-full flex flex-col">
          {/* Results Header */}
          <div className="border-b border-gray-200 p-6 pb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Results</h2>
              <div className="flex items-center gap-2">
                {currentTask && (
                  <div className={`px-2 py-1 rounded-full text-white text-xs font-medium ${getStatusColor(currentTask.status)}`}>
                    {getStatusText(currentTask.status)}
                  </div>
                )}
                <Button variant="outline" size="sm" data-testid="button-refresh">
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Refresh
                </Button>
                <Button variant="outline" size="sm" data-testid="button-export-code">
                  <Copy className="w-3 h-3 mr-1" />
                  Export Code
                </Button>
              </div>
            </div>

            {currentTask && (
              <>
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                  <span>ID: {currentTask.id}</span>
                  {currentTask.status === 'completed' && currentTask.completedAt && (
                    <span className="text-green-600">
                      Completed in {Math.round((new Date(currentTask.completedAt).getTime() - new Date(currentTask.createdAt).getTime()) / 1000 / 60)}m {Math.round(((new Date(currentTask.completedAt).getTime() - new Date(currentTask.createdAt).getTime()) / 1000) % 60)}s
                    </span>
                  )}
                </div>

                {/* Performance Stats */}
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-gray-600">Performance:</span>
                  <div className="text-blue-600">{currentTask.duration}s duration</div>
                  <div className="text-green-600">{currentTask.steps.length} steps</div>
                  <div className="text-gray-600">0s/step</div>
                  <div className="text-orange-600">${currentTask.cost.toFixed(2)} cost</div>
                </div>
              </>
            )}
          </div>

          {/* Tab Navigation - Always Visible */}
          <Tabs value={activeResultsTab} onValueChange={setActiveResultsTab} className="flex-1 flex flex-col px-6">
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-0">
              <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
              <TabsTrigger value="logs" data-testid="tab-logs">Logs</TabsTrigger>
              <TabsTrigger value="steps" data-testid="tab-steps">Steps</TabsTrigger>
              <TabsTrigger value="files" data-testid="tab-files">Files</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
              <TabsContent value="overview" className="h-full px-0 py-6">
                {currentTask ? (
                  <div className="space-y-4">
                    {/* Task Progress */}
                    {currentTask.status === 'running' && (
                      <div className="border rounded-lg p-4 bg-blue-50">
                        <div className="flex items-center gap-2 mb-2">
                          <Activity className="w-4 h-4 text-blue-500 animate-pulse" />
                          <span className="text-sm font-medium text-gray-900">Task in progress...</span>
                          <span className="text-xs text-gray-500 ml-auto">Automation is running</span>
                          <Badge variant="destructive" className="bg-orange-500">Running</Badge>
                        </div>
                      </div>
                    )}

                    {/* Live Browser */}
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-green-500" />
                          <span className="font-medium text-gray-900">Live Browser</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="default" className="bg-green-100 text-green-700">Active</Badge>
                          <Button variant="ghost" size="sm">
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Recent Steps */}
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-blue-500" />
                          <span className="font-medium text-gray-900">Recent Steps</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">{currentTask.steps.length} steps</span>
                          <Button variant="ghost" size="sm">
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {currentTask.steps.map((step, index) => (
                          <div key={step.id} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded">
                            <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-medium mt-0.5">
                              {step.id}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-gray-900 leading-tight">{step.goal}</div>
                              <div className="text-xs text-gray-500 mt-1">{step.url}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <PlayCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to run your first task</h3>
                      <p className="text-gray-600">Configure your task settings and click "Run New Task" to get started</p>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="logs" className="h-full px-0 py-6">
                {currentTask ? (
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle>Task Logs</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-96">
                        <div className="space-y-2 font-mono text-xs">
                          <div className="text-blue-600">🔵 Connecting to existing chromium-based browser via CDP: ws://localhost:9222/...</div>
                          <div className="text-gray-600">✅ Using first browser_context found in existing browser: &lt;BrowserContext browser=Browser type=chromium&gt;</div>
                          <div className="text-orange-600">⚠️ Starting a browser-use agent 0.5.9 with base_model=o3 +vision extraction_model=gpt-4.1-mini</div>
                          <div className="text-yellow-600">⚠️ Attempting to use multiple Agents with the same BrowserSession! This is not supported yet</div>
                          <div className="text-green-600">✅ Step 1: Evaluating page with 0 interactive elements on: about:blank</div>
                          <div className="text-green-600">🧠 Memory: Task started: need top 5 Google search results for query 'github'.</div>
                          <div className="text-green-600">🎯 Next goal: Navigate to Google search results for 'github' and extract top 5 result titles and links.</div>
                          <div className="text-blue-600">🔗 Navigated to https://www.google.com/search?q=github</div>
                          <div className="text-gray-600">✅ Executed action 1/2: go_to_url()</div>
                          <div className="text-gray-600">📝 Extracted content from https://www.google.com/search?q=github</div>
                          <div className="text-green-600">✅ Executed action 2/2: extract_structured_data()</div>
                          <div className="text-green-600">✅ Step 1: Ran 2 actions in 10.56s: ✅ 2</div>
                          <div className="text-green-600">✅ Screenshot service initialized in: /tmp/browser_use_agent_06894a38-7099-750f-8000</div>
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <FileText className="w-8 h-8 mx-auto mb-2" />
                      <p>No logs available</p>
                      <p className="text-xs mt-1">Run a task to see execution logs</p>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="steps" className="h-full px-0 py-6">
                {currentTask && currentStep ? (
                  <div className="h-full flex flex-col">
                    {/* Step Navigation */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <h3 className="text-lg font-semibold">
                          Step {currentStep.id} of {currentTask.totalSteps}
                        </h3>
                        <Badge variant="outline">${currentStep.cost.toFixed(2)}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))}
                          disabled={currentStepIndex === 0}
                          data-testid="button-previous-step"
                        >
                          <ArrowLeft className="w-3 h-3 mr-1" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentStepIndex(Math.min(currentTask.steps.length - 1, currentStepIndex + 1))}
                          disabled={currentStepIndex === currentTask.steps.length - 1}
                          data-testid="button-next-step"
                        >
                          Next
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </div>
                    </div>

                    {/* Step Content */}
                    <div className="flex-1 space-y-4 overflow-auto">
                      <Card>
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div>
                              <Label className="text-sm font-medium text-gray-700">Goal</Label>
                              <p className="text-sm text-gray-900 mt-1">{currentStep.goal}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <Label className="text-sm font-medium text-gray-700">Screenshot</Label>
                          <div className="mt-2 border rounded-lg overflow-hidden bg-white">
                            <img
                              src={currentStep.screenshot}
                              alt={`Step ${currentStep.id} screenshot`}
                              className="w-full h-auto max-h-96 object-contain"
                              data-testid={`screenshot-step-${currentStep.id}`}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <Camera className="w-8 h-8 mx-auto mb-2" />
                      <p>No steps available</p>
                      <p className="text-xs mt-1">Run a task to see step-by-step execution</p>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="files" className="h-full px-0 py-6">
                <div className="h-full flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <FileText className="w-8 h-8 mx-auto mb-2" />
                    <p>No output files generated</p>
                    <p className="text-xs mt-1">Files will appear here after task completion</p>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
      </div>
      </div>
    </div>
  );
}