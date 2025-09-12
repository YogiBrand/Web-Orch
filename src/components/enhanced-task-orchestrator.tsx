import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { EnhancedTaskView } from "./enhanced-task-view";
import { 
  Play, 
  Settings, 
  Bot, 
  Globe, 
  CheckCircle2, 
  Clock, 
  Activity,
  Upload,
  Link,
  Users,
  Mail,
  Search,
  FileText,
  Target,
  Zap,
  Shield,
  Shuffle,
  Eye,
  ChevronDown,
  Info
} from "lucide-react";

interface TaskType {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
}

interface CrmList {
  id: string;
  name: string;
  type: string;
  count: number;
}

export function EnhancedTaskOrchestrator() {
  const [activeTab, setActiveTab] = useState("execute");
  const [taskDescription, setTaskDescription] = useState("");
  const [selectedTaskTypes, setSelectedTaskTypes] = useState<string[]>([]);
  const [targetUrls, setTargetUrls] = useState("");
  const [dataInput, setDataInput] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("skyvern");
  const [dataSource, setDataSource] = useState("manual");
  const [selectedCrmList, setSelectedCrmList] = useState("");
  const [parallelSessions, setParallelSessions] = useState(1);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [sessionOptions, setSessionOptions] = useState({
    acceptCookies: true,
    useProxy: false,
    solveCaptchas: false,
    useStealthMode: true,
    enableScreenshots: true,
    enableRecording: false,
    timeout: 30000,
    retryAttempts: 3
  });

  const { toast } = useToast();

  const taskTypes: TaskType[] = [
    { id: "form_submission", label: "Form Submissions", description: "Automate form filling and submission", icon: FileText, color: "bg-blue-500" },
    { id: "lead_generation", label: "Lead Generation", description: "Find and collect potential leads", icon: Target, color: "bg-green-500" },
    { id: "lead_enrichment", label: "Lead Enrichment", description: "Enhance existing lead data", icon: Users, color: "bg-purple-500" },
    { id: "data_extraction", label: "Data Extraction", description: "Extract structured data from websites", icon: Search, color: "bg-orange-500" },
    { id: "email_outreach", label: "Email Outreach", description: "Automated email campaigns", icon: Mail, color: "bg-red-500" },
    { id: "content_scraping", label: "Content Scraping", description: "Collect content and media", icon: Globe, color: "bg-indigo-500" },
  ];

  const { data: models } = useQuery({
    queryKey: ['/api/models'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/models');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
      } catch (error) {
        console.warn('Failed to fetch models, using fallback:', error);
        // Return some basic models as fallback
        return [
          {
            id: 'deepseek-r1:latest',
            name: 'DeepSeek R1 (Local)',
            description: 'DeepSeek R1 local model for reasoning and chat',
            contextLength: 32768,
            capabilities: ['text', 'reasoning', 'code', 'analysis'],
            provider: 'DeepSeek',
            status: 'active',
            category: 'local'
          },
          {
            id: 'gpt-4o-mini',
            name: 'GPT-4o Mini',
            description: 'Fast and efficient model for most tasks',
            contextLength: 128000,
            capabilities: ['text', 'vision'],
            provider: 'OpenRouter',
            status: 'active',
            category: 'cloud'
          }
        ];
      }
    }
  });

  const { data: agents } = useQuery({
    queryKey: ['/api/agents'],
    select: (data) => {
      if (!data) return [];
      if (Array.isArray(data)) return data;
      // Handle { success, agents } response structure
      if (data?.agents && Array.isArray(data.agents)) {
        return data.agents;
      }
      return [];
    },
  });

  const { data: crmLists } = useQuery({
    queryKey: ['/api/crm/lists'],
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['/api/orchestrator/tasks'],
    refetchInterval: 2000
  });

  const executeTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      const response = await fetch('/api/orchestrator/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to execute task');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Task Started",
        description: "Your automation task has been queued for execution."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/orchestrator/tasks'] });
      
      // Show the enhanced task view for the created task
      if (data.id || data.taskId) {
        setActiveTaskId(data.id || data.taskId);
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start task",
        variant: "destructive"
      });
    }
  });

  const handleTaskTypeToggle = (typeId: string) => {
    setSelectedTaskTypes(prev => 
      prev.includes(typeId) 
        ? prev.filter(id => id !== typeId)
        : [...prev, typeId]
    );
  };

  const handleExecuteTask = () => {
    if (!taskDescription.trim()) {
      toast({
        title: "Error",
        description: "Please enter a task description",
        variant: "destructive"
      });
      return;
    }

    const taskData = {
      description: taskDescription,
      taskTypes: selectedTaskTypes,
      targetUrls: targetUrls.split('\n').filter(url => url.trim()),
      dataInput: dataInput,
      model: selectedModel,
      agentId: selectedAgent === "intelligent" ? null : selectedAgent,
      dataSource,
      crmListId: dataSource === "crm" ? selectedCrmList : null,
      parallelSessions,
      sessionOptions,
      createdAt: new Date().toISOString()
    };

    executeTaskMutation.mutate(taskData);
  };

  const getActiveTasksCount = () => {
    if (!tasks || !Array.isArray(tasks)) return 0;
    return tasks.filter((task: any) => task.status === 'running' || task.status === 'queued').length;
  };

  // If we have an active task, show the enhanced task view
  if (activeTaskId) {
    return (
      <EnhancedTaskView 
        taskId={activeTaskId} 
        onClose={() => setActiveTaskId(null)}
      />
    );
  }

  return (
    <div className="h-full bg-background">
      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="flex items-end justify-between pt-[72px] pb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Task Orchestrator</h1>
            <p className="text-muted-foreground mt-1">Configure and execute intelligent automation tasks</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              {getActiveTasksCount()} Active
            </Badge>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="execute" className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              Execute Task
            </TabsTrigger>
            <TabsTrigger value="configuration" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configuration
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Task Settings
            </TabsTrigger>
          </TabsList>

          {/* Execute Task Tab */}
          <TabsContent value="execute" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Task Execution</CardTitle>
                <CardDescription>
                  Describe your automation task. The orchestrator will analyze and route to the optimal system.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="task-description">Task Description</Label>
                  <Textarea
                    id="task-description"
                    placeholder="e.g., Search for 'autonomous vehicles' on Google and extract the top 10 results with titles and descriptions"
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    className="min-h-[100px] mt-2"
                    data-testid="input-task-description"
                  />
                </div>

                <div>
                  <Label className="text-base font-medium">Task Type Optimization</Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Select task types to help the AI optimize execution strategy
                  </p>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {taskTypes.map((type) => (
                      <div
                        key={type.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedTaskTypes.includes(type.id)
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => handleTaskTypeToggle(type.id)}
                        data-testid={`task-type-${type.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-md ${type.color} text-white`}>
                            <type.icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{type.label}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {type.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-6">
                  <Button 
                    onClick={handleExecuteTask}
                    disabled={executeTaskMutation.isPending}
                    className="flex items-center gap-2"
                    size="lg"
                    data-testid="button-execute-task"
                  >
                    <Zap className="h-4 w-4" />
                    {executeTaskMutation.isPending ? "Executing..." : "Execute Task"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Configuration Tab */}
          <TabsContent value="configuration" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    LLM Model Selection
                  </CardTitle>
                  <CardDescription>
                    Choose the language model for task execution
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger data-testid="select-model">
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                      {models && Array.isArray(models) ? (
                        <>
                          {/* Group models by category */}
                          {(() => {
                            const groupedModels = models.reduce((acc: any, model: any) => {
                              const category = model.category || (model.provider === 'DeepSeek' ? 'local' : 'cloud');
                              if (!acc[category]) acc[category] = [];
                              acc[category].push(model);
                              return acc;
                            }, {});

                            return Object.entries(groupedModels).map(([category, modelsInCategory]: [string, any]) => (
                              <div key={category}>
                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b">
                                  {category === 'local' ? '🔧 Local Models' : '☁️ Cloud Models'}
                                </div>
                                {modelsInCategory.map((model: any) => (
                                  <SelectItem key={model.id} value={model.id} className="pl-4">
                                    <div className="flex items-center justify-between w-full">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">{model.name || model.id}</span>
                                        <div className="flex gap-1">
                                          {model.capabilities?.includes('vision') && (
                                            <Badge variant="secondary" className="text-xs">👁️ Vision</Badge>
                                          )}
                                          {model.capabilities?.includes('reasoning') && (
                                            <Badge variant="secondary" className="text-xs">🧠 Reasoning</Badge>
                                          )}
                                          {model.capabilities?.includes('code') && (
                                            <Badge variant="secondary" className="text-xs">💻 Code</Badge>
                                          )}
                                          {model.capabilities?.includes('text') && (
                                            <Badge variant="secondary" className="text-xs">📝 Text</Badge>
                                          )}
                                        </div>
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {model.provider}
                                      </div>
                                    </div>
                                  </SelectItem>
                                ))}
                              </div>
                            ));
                          })()}
                        </>
                      ) : (
                        <SelectItem value="" disabled>
                          No models available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shuffle className="h-5 w-5" />
                    Agent Selection
                  </CardTitle>
                  <CardDescription>
                    Choose specific agent or use intelligent routing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                    <SelectTrigger data-testid="select-agent">
                      <SelectValue placeholder="Select an agent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="intelligent">
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4" />
                          Intelligent Routing (Recommended)
                        </div>
                      </SelectItem>
                      <SelectItem value="skyvern">
                        <div className="flex items-center gap-2">
                          <Bot className="h-4 w-4" />
                          Skyvern AI Agent
                          <Badge variant="outline" className="text-xs">
                            Browser Automation
                          </Badge>
                        </div>
                      </SelectItem>
                      {agents && Array.isArray(agents) ? agents.map((agent: any) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              agent.status === 'active' ? 'bg-green-500' :
                              agent.status === 'error' ? 'bg-red-500' : 'bg-gray-500'
                            }`} />
                            {agent.name}
                            <Badge variant="outline" className="text-xs">
                              {agent.type}
                            </Badge>
                          </div>
                        </SelectItem>
                      )) : null}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Task Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Data Source Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link className="h-5 w-5" />
                    Data Source
                  </CardTitle>
                  <CardDescription>
                    Configure input data for the task
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="manual"
                      name="dataSource"
                      value="manual"
                      checked={dataSource === "manual"}
                      onChange={(e) => setDataSource(e.target.value)}
                    />
                    <Label htmlFor="manual">Manual Input</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="crm"
                      name="dataSource"
                      value="crm"
                      checked={dataSource === "crm"}
                      onChange={(e) => setDataSource(e.target.value)}
                    />
                    <Label htmlFor="crm">CRM List</Label>
                  </div>

                  {dataSource === "manual" && (
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="target-urls">Target URLs (one per line)</Label>
                        <Textarea
                          id="target-urls"
                          placeholder="https://example1.com&#10;https://example2.com"
                          value={targetUrls}
                          onChange={(e) => setTargetUrls(e.target.value)}
                          className="mt-2"
                          data-testid="input-target-urls"
                        />
                      </div>
                      <div>
                        <Label htmlFor="data-input">Additional Data (CSV, JSON, etc.)</Label>
                        <Textarea
                          id="data-input"
                          placeholder="Paste CSV data, JSON, or other structured data..."
                          value={dataInput}
                          onChange={(e) => setDataInput(e.target.value)}
                          className="mt-2"
                          data-testid="input-data-input"
                        />
                      </div>
                    </div>
                  )}

                  {dataSource === "crm" && (
                    <div>
                      <Label htmlFor="crm-list">Select CRM List</Label>
                      <Select value={selectedCrmList} onValueChange={setSelectedCrmList}>
                        <SelectTrigger className="mt-2" data-testid="select-crm-list">
                          <SelectValue placeholder="Choose a CRM list" />
                        </SelectTrigger>
                        <SelectContent>
                          {crmLists && Array.isArray(crmLists) ? crmLists.map((list: CrmList) => (
                            <SelectItem key={list.id} value={list.id}>
                              <div className="flex items-center gap-2">
                                <span>{list.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {list.count} items
                                </Badge>
                              </div>
                            </SelectItem>
                          )) : null}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Session Management */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Session Management
                  </CardTitle>
                  <CardDescription>
                    Configure browser session settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="parallel-sessions">Parallel Browser Sessions</Label>
                    <Input
                      id="parallel-sessions"
                      type="number"
                      min="1"
                      max="10"
                      value={parallelSessions}
                      onChange={(e) => setParallelSessions(Number(e.target.value))}
                      className="mt-2"
                      data-testid="input-parallel-sessions"
                    />
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-medium mb-3">Session Options</h4>
                    <div className="space-y-3">
                      {Object.entries({
                        acceptCookies: "Accept Cookies",
                        useProxy: "Use Proxy",
                        solveCaptchas: "Solve CAPTCHAs",
                        useStealthMode: "Use Stealth Mode",
                        enableScreenshots: "Enable Screenshots",
                        enableRecording: "Enable Recording"
                      }).map(([key, label]) => (
                        <div key={key} className="flex items-center justify-between">
                          <Label htmlFor={key} className="text-sm">
                            {label}
                            {key === "useStealthMode" && (
                              <Info className="h-3 w-3 inline ml-1 text-muted-foreground" />
                            )}
                          </Label>
                          <Switch
                            id={key}
                            checked={sessionOptions[key as keyof typeof sessionOptions] as boolean}
                            onCheckedChange={(checked) => 
                              setSessionOptions(prev => ({ ...prev, [key]: checked }))
                            }
                            data-testid={`switch-${key}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}