import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Monitor, Play, Square, RefreshCw, Eye, Download, Zap, CheckCircle, XCircle, Clock, Activity, Database, Globe, MousePointer, Type, ArrowDown, ImageIcon, Settings, ChevronDown, ChevronRight, Bot, Target, Users, Mail, Search, FileText, Link, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { ComputerUseTask } from '@shared/schema';

interface ComputerUseTaskWithExtras extends Omit<ComputerUseTask, 'steps' | 'screenshots'> {
  steps?: Array<{
    type: string;
    target?: string;
    value?: string;
    coordinates?: { x: number; y: number };
    screenshot?: string;
    timestamp: string;
    success: boolean;
    error?: string;
  }>;
  screenshots?: string[];
}

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  message: string;
  capabilities: string[];
  supported_models: string[];
}

export function ComputerUsePlayground() {
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('anthropic/claude-3-5-sonnet-20241022');
  const [selectedAgent, setSelectedAgent] = useState('computer-use');
  const [parallelSessions, setParallelSessions] = useState(1);
  const [viewport, setViewport] = useState({ width: 1280, height: 720 });
  const [headless, setHeadless] = useState(false);
  const [timeout, setTimeout] = useState(30000);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  
  // New configuration state for collapsible sections
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [selectedTaskTypes, setSelectedTaskTypes] = useState<string[]>([]);
  const [targetUrls, setTargetUrls] = useState('');
  const [dataInput, setDataInput] = useState('');
  const [dataSource, setDataSource] = useState('manual');
  const [selectedCrmList, setSelectedCrmList] = useState('');
  const [sessionOptions, setSessionOptions] = useState({
    acceptCookies: true,
    useProxy: false,
    solveCaptchas: false,
    useStealthMode: true,
    enableScreenshots: true,
    enableRecording: false,
    retryAttempts: 3
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Task types for optimization
  const taskTypes = [
    { id: "form_submission", label: "Form Submissions", description: "Automate form filling", icon: FileText, color: "bg-blue-500" },
    { id: "lead_generation", label: "Lead Generation", description: "Find and collect leads", icon: Target, color: "bg-green-500" },
    { id: "lead_enrichment", label: "Lead Enrichment", description: "Enhance existing data", icon: Users, color: "bg-purple-500" },
    { id: "data_extraction", label: "Data Extraction", description: "Extract structured data", icon: Search, color: "bg-orange-500" },
    { id: "email_outreach", label: "Email Outreach", description: "Automated email campaigns", icon: Mail, color: "bg-red-500" },
    { id: "content_scraping", label: "Content Scraping", description: "Collect content", icon: Globe, color: "bg-indigo-500" },
  ];

  // Handle section expansion (only one at a time)
  const handleSectionToggle = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Health check
  const { data: health } = useQuery<HealthStatus>({
    queryKey: ['/api/computer-use/health'],
    refetchInterval: 30000
  });

  // Tasks list
  const { data: tasksData, isLoading: isLoadingTasks } = useQuery<{ tasks: ComputerUseTaskWithExtras[]; total: number }>({
    queryKey: ['/api/computer-use/tasks'],
    refetchInterval: 2000
  });

  // Selected task details
  const { data: taskDetails } = useQuery<ComputerUseTaskWithExtras>({
    queryKey: ['/api/computer-use/tasks', selectedTask],
    enabled: !!selectedTask,
    refetchInterval: 1000
  });

  // Additional data queries for configuration
  const { data: models } = useQuery({
    queryKey: ['/api/models'],
  });

  const { data: agents } = useQuery({
    queryKey: ['/api/agents'],
  });

  const { data: crmLists } = useQuery({
    queryKey: ['/api/crm/lists'],
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      const response = await apiRequest(`/api/computer-use/tasks`, 'POST', taskData);
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/computer-use/tasks'] });
      setSelectedTask(data.id);
      toast({
        title: "Task Created",
        description: "Computer use task has been created successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Task",
        description: error.message || "An error occurred while creating the task.",
        variant: "destructive"
      });
    }
  });

  // Execute task mutation
  const executeTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await apiRequest(`/api/computer-use/tasks/${taskId}/execute`, 'POST');
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/computer-use/tasks'] });
      setIsExecuting(true);
      toast({
        title: "Task Started",
        description: "Computer use automation has started executing."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Execute Task",
        description: error.message || "An error occurred while starting the task.",
        variant: "destructive"
      });
    }
  });

  const handleCreateTask = () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt Required",
        description: "Please enter a task description.",
        variant: "destructive"
      });
      return;
    }

    createTaskMutation.mutate({
      prompt: prompt.trim(),
      llmModel: selectedModel,
      agent: selectedAgent,
      browserConfig: {
        viewport,
        headless,
        timeout
      }
    });
  };

  const handleExecuteTask = (taskId: string) => {
    executeTaskMutation.mutate(taskId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'running': return 'bg-blue-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'failed': return <XCircle className="h-4 w-4" />;
      case 'running': return <Activity className="h-4 w-4 animate-spin" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'navigate': return <Globe className="h-4 w-4" />;
      case 'click': return <MousePointer className="h-4 w-4" />;
      case 'fill': return <Type className="h-4 w-4" />;
      case 'scroll': return <ArrowDown className="h-4 w-4" />;
      case 'screenshot': return <ImageIcon className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  // Effect to monitor task completion
  useEffect(() => {
    if (taskDetails?.status === 'completed' || taskDetails?.status === 'failed') {
      setIsExecuting(false);
    }
  }, [taskDetails?.status]);

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Monitor className="h-6 w-6" />
              Computer Use Automation
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Natural language browser control powered by AI vision
            </p>
          </div>
          <div className="flex items-center gap-3">
            {health && (
              <Badge variant={health.status === 'healthy' ? 'default' : 'destructive'}>
                <Zap className="h-3 w-3 mr-1" />
                {health.status}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Task Creation */}
        <div className="w-80 bg-white dark:bg-gray-800 border-r flex flex-col">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold mb-3">Task Description</h2>
            <Textarea
              id="prompt"
              data-testid="input-task-prompt"
              placeholder="e.g., Search for 'autonomous vehicles' on Google and extract the top 10 results with titles and descriptions"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-20 text-sm"
            />
          </div>

          {/* Collapsible Configuration Sections */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {/* Task Type Optimization */}
              <Collapsible 
                open={expandedSection === 'task-types'} 
                onOpenChange={() => handleSectionToggle('task-types')}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-sm">Task Type Optimization</span>
                  </div>
                  {expandedSection === 'task-types' ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">Select task types to help AI optimize execution strategy</p>
                  <div className="grid grid-cols-2 gap-2">
                    {taskTypes.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => {
                          setSelectedTaskTypes(prev => 
                            prev.includes(type.id) 
                              ? prev.filter(t => t !== type.id)
                              : [...prev, type.id]
                          );
                        }}
                        className={`p-2 rounded-lg border text-left transition-colors ${
                          selectedTaskTypes.includes(type.id) 
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                            : 'border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded flex items-center justify-center ${type.color}`}>
                            <type.icon className="h-3 w-3 text-white" />
                          </div>
                          <div>
                            <div className="text-xs font-medium">{type.label}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Configuration */}
              <Collapsible 
                open={expandedSection === 'configuration'} 
                onOpenChange={() => handleSectionToggle('configuration')}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-sm">LLM Model Selection</span>
                  </div>
                  {expandedSection === 'configuration' ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-3">
                  <div>
                    <Label className="text-xs font-medium">Choose the language model for task execution</Label>
                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                      <SelectTrigger className="mt-1 h-8">
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                      <SelectContent>
                        {models?.map((model: any) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name || model.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-xs font-medium">Agent Selection</Label>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Choose specific agent or use intelligent routing</p>
                    <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                      <SelectTrigger className="mt-1 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="intelligent">
                          <div className="flex items-center gap-2">
                            <Zap className="h-3 w-3" />
                            Intelligent Routing (Recommended)
                          </div>
                        </SelectItem>
                        {agents?.map((agent: any) => (
                          <SelectItem key={agent.id} value={agent.id}>
                            {agent.name || agent.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Task Settings */}
              <Collapsible 
                open={expandedSection === 'task-settings'} 
                onOpenChange={() => handleSectionToggle('task-settings')}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-purple-600" />
                    <span className="font-medium text-sm">Task Settings</span>
                  </div>
                  {expandedSection === 'task-settings' ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-4">
                  {/* Data Source */}
                  <div>
                    <Label className="text-xs font-medium">Data Source</Label>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Configure input data for the task</p>
                    <RadioGroup value={dataSource} onValueChange={setDataSource} className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="manual" id="manual" />
                        <Label htmlFor="manual" className="text-xs">Manual Input</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="crm" id="crm" />
                        <Label htmlFor="crm" className="text-xs">CRM List</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {dataSource === 'manual' && (
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Target URLs (one per line)</Label>
                      <Textarea
                        placeholder="https://example1.com&#10;https://example2.com"
                        value={targetUrls}
                        onChange={(e) => setTargetUrls(e.target.value)}
                        className="h-16 text-xs"
                      />
                      <Label className="text-xs font-medium">Additional Data (CSV, JSON, etc.)</Label>
                      <Textarea
                        placeholder="Paste CSV data, JSON, or other structured data..."
                        value={dataInput}
                        onChange={(e) => setDataInput(e.target.value)}
                        className="h-16 text-xs"
                      />
                    </div>
                  )}

                  {dataSource === 'crm' && (
                    <div>
                      <Label className="text-xs font-medium">Select CRM List</Label>
                      <Select value={selectedCrmList} onValueChange={setSelectedCrmList}>
                        <SelectTrigger className="mt-1 h-8">
                          <SelectValue placeholder="Choose a list" />
                        </SelectTrigger>
                        <SelectContent>
                          {crmLists?.map((list: any) => (
                            <SelectItem key={list.id} value={list.id}>
                              {list.name} ({list.count} items)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Session Management */}
                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-2 mb-3">
                      <Globe className="h-4 w-4 text-purple-600" />
                      <Label className="text-xs font-medium">Session Management</Label>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">Configure browser session settings</p>
                    
                    <div className="space-y-2">
                      <div>
                        <Label className="text-xs font-medium">Parallel Browser Sessions</Label>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={parallelSessions}
                          onChange={(e) => setParallelSessions(parseInt(e.target.value) || 1)}
                          className="mt-1 h-8"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">Session Options</Label>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Accept Cookies</Label>
                            <Switch
                              checked={sessionOptions.acceptCookies}
                              onCheckedChange={(checked) => 
                                setSessionOptions(prev => ({ ...prev, acceptCookies: checked }))
                              }
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Use Proxy</Label>
                            <Switch
                              checked={sessionOptions.useProxy}
                              onCheckedChange={(checked) => 
                                setSessionOptions(prev => ({ ...prev, useProxy: checked }))
                              }
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Solve CAPTCHAs</Label>
                            <Switch
                              checked={sessionOptions.solveCaptchas}
                              onCheckedChange={(checked) => 
                                setSessionOptions(prev => ({ ...prev, solveCaptchas: checked }))
                              }
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Stealth Mode</Label>
                            <Switch
                              checked={sessionOptions.useStealthMode}
                              onCheckedChange={(checked) => 
                                setSessionOptions(prev => ({ ...prev, useStealthMode: checked }))
                              }
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Enable Screenshots</Label>
                            <Switch
                              checked={sessionOptions.enableScreenshots}
                              onCheckedChange={(checked) => 
                                setSessionOptions(prev => ({ ...prev, enableScreenshots: checked }))
                              }
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Enable Recording</Label>
                            <Switch
                              checked={sessionOptions.enableRecording}
                              onCheckedChange={(checked) => 
                                setSessionOptions(prev => ({ ...prev, enableRecording: checked }))
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </ScrollArea>

          {/* Execute Button */}
          <div className="p-4 border-t">
            <Button 
              onClick={handleCreateTask}
              disabled={createTaskMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700"
              data-testid="button-create-task"
            >
              {createTaskMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              Execute Task
            </Button>
          </div>
        </div>

        {/* Right Panel - Results */}
        <div className="flex-1 flex flex-col bg-white dark:bg-gray-800">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold mb-2">Results</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Test browser automation tasks</p>
          </div>
          
          <Tabs defaultValue="overview" className="flex-1 flex flex-col">
            <TabsList className="mx-6 mt-4 grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="logs">Logs</TabsTrigger>
              <TabsTrigger value="steps">Steps</TabsTrigger>
              <TabsTrigger value="files">Files</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="flex-1 p-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Task Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedTask && taskDetails ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(taskDetails.status)}
                        <Badge className={getStatusColor(taskDetails.status)}>
                          {taskDetails.status}
                        </Badge>
                      </div>
                      <div>
                        <h3 className="font-medium mb-2">Task Description</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{taskDetails.prompt}</p>
                      </div>
                      {taskDetails.executionTime && (
                        <div>
                          <h3 className="font-medium mb-1">Execution Time</h3>
                          <p className="text-sm">{taskDetails.executionTime}ms</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Execute a task to see results</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="logs" className="flex-1 p-6">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Execution Logs</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    {taskDetails?.steps ? (
                      <div className="space-y-2 font-mono text-sm">
                        {taskDetails.steps.map((step, index) => (
                          <div key={index} className="p-2 border rounded">
                            <div className="flex items-center gap-2 mb-1">
                              {getActionIcon(step.type)}
                              <span className="text-xs text-gray-500">{step.timestamp}</span>
                            </div>
                            <p>{step.type}: {step.target || step.value}</p>
                            {step.error && (
                              <p className="text-red-500 text-xs mt-1">{step.error}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        No logs available
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="steps" className="flex-1 p-6">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Execution Steps</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    {taskDetails?.steps ? (
                      <div className="space-y-4">
                        {taskDetails.steps.map((step, index) => (
                          <div key={index} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {getActionIcon(step.type)}
                                <span className="font-medium">Step {index + 1}</span>
                              </div>
                              <Badge variant={step.success ? "default" : "destructive"}>
                                {step.success ? "Success" : "Failed"}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {step.type}: {step.target || step.value}
                            </p>
                            {step.coordinates && (
                              <p className="text-xs text-gray-500">
                                Position: ({step.coordinates.x}, {step.coordinates.y})
                              </p>
                            )}
                            {step.screenshot && (
                              <div className="mt-2">
                                <img 
                                  src={step.screenshot} 
                                  alt={`Step ${index + 1} screenshot`}
                                  className="max-w-full h-32 object-cover rounded border"
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        No steps available
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="files" className="flex-1 p-6">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Generated Files</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    No files generated yet
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}