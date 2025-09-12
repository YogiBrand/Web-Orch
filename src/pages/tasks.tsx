import { useState } from "react";
import { useLocation } from "wouter";
import { Send, Bot, User, ChevronDown, ChevronRight, Monitor, Clock, CheckCircle2, XCircle, Loader2, Plus, Settings, Play, Pause, MoreHorizontal, Activity, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Task, InsertTask } from "@/../../shared/schema";
import { Sidebar } from "@/components/sidebar";
import { AdvancedCrawler } from "@/components/advanced-crawler";
import { UnifiedTaskConfig } from "@/components/unified-task-config";
import { SessionSelector } from "@/components/session-selector";
import { useOrchestratorTask } from "@/hooks/use-orchestrator-task";

import { SessionsManager } from "@/components/sessions-manager";
import { AgentsManager } from "@/components/agents-manager";
import { DataExtractionManager } from "@/components/data-extraction-manager";
import { ProfilesManager } from "@/components/profiles-manager";
import { SettingsManager } from "@/components/settings-manager";
import { EnhancedTaskView } from "@/components/enhanced-task-view";

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface LLMModel {
  id: string;
  name: string;
  provider: string;
  hasVision: boolean;
  description: string;
}

const defaultModels: LLMModel[] = [
  { id: "openai/gpt-4o", name: "GPT-4o", provider: "OpenAI", hasVision: true, description: "" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI", hasVision: true, description: "" },
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", provider: "Anthropic", hasVision: true, description: "" },
  { id: "anthropic/claude-3-haiku", name: "Claude 3 Haiku", provider: "Anthropic", hasVision: true, description: "" },
  { id: "google/gemini-pro-vision", name: "Gemini Pro Vision", provider: "Google", hasVision: true, description: "" },
];

export function Tasks() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [selectedModel, setSelectedModel] = useState("openai/gpt-4o");
  const [selectedAgent, setSelectedAgent] = useState("hybrid");
  const [parallelSessions, setParallelSessions] = useState(1);
  const [targetUrls, setTargetUrls] = useState<string[]>([""]);
  const [activeSection, setActiveSection] = useState("tasks");
  const [, setLocation] = useLocation();
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [showPreview, setShowPreview] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [showTaskConfig, setShowTaskConfig] = useState(false);
  const [sessionConfig, setSessionConfig] = useState({
    maxSessions: 1,
    browser: 'chrome' as const,
    headless: false,
    viewport: { width: 1920, height: 1080 },
    antiDetection: true,
    sessionTimeout: 600000,
    reuseExisting: false,
  });
  
  // Use orchestrator task hook
  const {
    executeTask,
    cancelTask,
    isExecuting,
    activeTask,
    activeSessions,
    taskSessions,
    systemStatus,
    isMonitoring,
    getTaskProgress,
    getLatestLogEntry,
    startMonitoring,
  } = useOrchestratorTask();

  const handleSectionChange = (section: string) => {
    console.log("Tasks page changing section to:", section);
    setShowPreview(false); // Reset preview state when changing sections
    setCurrentTaskId(null); // Reset current task
    
    if (section === "overview" || section === "playground" || section === "sessions" || 
        section === "computer-use" || section === "orchestrator" || section === "crawler" ||
        section === "agents" || section === "agents-dashboard" || section === "agents-marketplace" || section === "agents-create" || section === "data-extraction" || section === "profiles" || 
        section === "settings") {
      // Navigate to dashboard with section parameter
      if (section === 'agents' || section === 'agents-dashboard') setLocation('/agents');
      else if (section === 'agents-marketplace') setLocation('/agents/marketplace');
      else if (section === 'agents-create') setLocation('/agents/new');
      else setLocation(`/?section=${section}`);
    } else {
      setActiveSection(section);
    }
  };

  const { data: tasksResponse } = useQuery({
    queryKey: ["/api/tasks"],
  });

  const tasks = tasksResponse?.data?.tasks || [];

  const { data: availableModels = defaultModels } = useQuery<LLMModel[]>({
    queryKey: ["/api/models"],
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const createTaskMutation = useMutation({
    mutationFn: async (taskData: InsertTask): Promise<Task> => {
      const response = await apiRequest("/api/tasks", { method: "POST", data: taskData });
      return response;
    },
    onSuccess: (newTask: Task) => {
      console.log("Task created successfully:", newTask);
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setCurrentTaskId(newTask.id);
      console.log("Setting showPreview to true");
      // Don't automatically switch to preview to maintain navigation state
      // setShowPreview(true);
      // Start task execution
      executeTaskMutation.mutate(newTask.id);
    },
    onError: (error) => {
      console.error("Failed to create task:", error);
    },
  });

  const executeTaskMutation = useMutation({
    mutationFn: async (taskId: string): Promise<{ automationPlan: string }> => {
      const response = await apiRequest(`/api/tasks/${taskId}/execute`, { method: "POST" });
      return response;
    },
    onSuccess: (result: { automationPlan: string }) => {
      console.log("Task execution result:", result);
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      
      const aiMessage: Message = {
        id: crypto.randomUUID(),
        type: "assistant",
        content: result.automationPlan,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
    },
    onError: (error) => {
      console.error("Failed to execute task:", error);
    },
  });

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      type: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    
    try {
      // Execute orchestrator task with session configuration
      const task = await executeTask({
        prompt: inputValue,
        urls: targetUrls.filter(url => url.trim()),
        maxSessions: sessionConfig.maxSessions,
        sessionConfig,
      });
      
      const aiMessage: Message = {
        id: crypto.randomUUID(),
        type: "assistant",
        content: `Task created with strategy: ${task.strategy}. ${task.reasoning}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
      
      setCurrentTaskId(task.id);
      setShowPreview(true);
      startMonitoring();
      
    } catch (error) {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        type: "assistant",
        content: `Failed to execute task: ${error}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    }
    
    setInputValue("");
  };

  const exampleTasks = [
    "Go to https://news.ycombinator.com and find the top post",
    "Navigate to github.com/trending and list the top 5 repos", 
    "Search for wireless headphones on amazon.com under $100",
  ];

  const addTargetUrl = () => {
    setTargetUrls([...targetUrls, ""]);
  };

  const updateTargetUrl = (index: number, value: string) => {
    const updated = [...targetUrls];
    updated[index] = value;
    setTargetUrls(updated);
  };

  const removeTargetUrl = (index: number) => {
    setTargetUrls(targetUrls.filter((_, i) => i !== index));
  };

  const toggleTaskExpansion = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "running":
        return <Loader2 className="w-4 h-4 animate-spin text-blue-600" />;
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  console.log("Render check - showPreview:", showPreview, "currentTaskId:", currentTaskId);
  
  if (showPreview && currentTaskId) {
    return (
      <EnhancedTaskView 
        taskId={currentTaskId} 
        onClose={() => {
          setShowPreview(false);
          setCurrentTaskId(null);
        }}
      />
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar 
        activeSection={activeSection} 
        onSectionChange={handleSectionChange} 
      />
      
      <div className="flex-1 flex flex-col">
        <div className="flex-1 p-8">
          {activeSection === "crawler" ? (
            <AdvancedCrawler />
          ) : activeSection === "orchestrator" ? (
            <div className="mx-auto w-full max-w-6xl px-6">
              <div className="pt-[72px] pb-6">
                <h1 className="text-3xl font-bold text-foreground tracking-tight mb-1">Intelligent Task Orchestrator</h1>
                <p className="text-muted-foreground">Task orchestrator functionality has been moved to the Playground section for a better user experience.</p>
              </div>
            </div>
          ) : activeSection === "sessions" ? (
            <SessionsManager />
          ) : activeSection === "agents" ? (
            <AgentsManager />
          ) : activeSection === "data-extraction" ? (
            <DataExtractionManager />
          ) : activeSection === "profiles" ? (
            <ProfilesManager />
          ) : activeSection === "settings" ? (
            <SettingsManager />
          ) : activeSection === "tasks" || !activeSection ? (
            <div>
              {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-semibold text-gray-900 mb-2" data-testid="heading-tasks">
              What do you want done?
            </h1>
            <p className="text-gray-600 mb-4">
              Prompt, run, and let the agent do the rest.
            </p>
            <p className="text-sm text-gray-500">
              Tasks created here will appear in your <span className="text-blue-600">Tasks page</span> and <span className="text-blue-600">History</span>
            </p>
          </div>

          {/* Main Content Area */}
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Chat Area */}
              <div className="lg:col-span-2">
                <Card className="h-96 flex flex-col">
                  <CardContent className="flex-1 p-6 overflow-y-auto">
                    {messages.length === 0 ? (
                      <div className="text-center py-8">
                        <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 mb-6">Start a conversation to begin automating web tasks</p>
                        
                        <div className="mb-6">
                          <p className="text-sm text-gray-600 mb-3">Try these examples:</p>
                          <div className="space-y-2">
                            {exampleTasks.map((example, index) => (
                              <button
                                key={index}
                                onClick={() => setInputValue(example)}
                                className="block text-sm text-blue-600 hover:text-blue-800 hover:underline mx-auto"
                                data-testid={`example-task-${index}`}
                              >
                                "{example}"
                              </button>
                            ))}
                          </div>
                        </div>

                        <p className="text-xs text-gray-500">Skyvern can make mistakes. Please monitor its work.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                          >
                            <div className={`flex items-start space-x-3 max-w-lg ${message.type === "user" ? "flex-row-reverse space-x-reverse" : ""}`}>
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                message.type === "user" ? "bg-blue-600" : "bg-gray-600"
                              }`}>
                                {message.type === "user" ? (
                                  <User className="w-4 h-4 text-white" />
                                ) : (
                                  <Bot className="w-4 h-4 text-white" />
                                )}
                              </div>
                              <div className={`rounded-lg p-3 ${
                                message.type === "user" 
                                  ? "bg-blue-600 text-white" 
                                  : "bg-gray-100 text-gray-900"
                              }`}>
                                <p className="text-sm">{message.content}</p>
                                <p className={`text-xs mt-1 ${
                                  message.type === "user" ? "text-blue-200" : "text-gray-500"
                                }`}>
                                  {message.timestamp.toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Input Controls */}
                <div className="mt-6 space-y-4">
                  <div className="space-y-4">
                    <Button
                      variant={showTaskConfig ? "secondary" : "outline"}
                      onClick={() => setShowTaskConfig(!showTaskConfig)}
                      className="w-full"
                      data-testid="toggle-task-config"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      {showTaskConfig ? "Hide" : "Show"} Task Configuration
                    </Button>

                    {showTaskConfig && (
                      <div className="space-y-4">
                        <UnifiedTaskConfig
                          selectedModel={selectedModel}
                          onModelChange={setSelectedModel}
                          selectedAgent={selectedAgent}
                          onAgentChange={setSelectedAgent}
                          parallelSessions={parallelSessions}
                          onParallelSessionsChange={setParallelSessions}
                        />
                        
                        <SessionSelector
                          sessionConfig={sessionConfig}
                          onSessionConfigChange={setSessionConfig}
                          disabled={isExecuting}
                        />
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3 items-center">
                      <Button variant="outline" size="sm" onClick={addTargetUrl} data-testid="button-add-url">
                        <Plus className="w-4 h-4 mr-1" />
                        Add URL
                      </Button>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Model: {selectedModel.split('/').pop()}</span>
                        <span>•</span>
                        <span>Agent: {selectedAgent}</span>
                        <span>•</span>
                        <span>Sessions: {sessionConfig.maxSessions}</span>
                        <span>•</span>
                        <span>Browser: {sessionConfig.browser}</span>
                        {sessionConfig.antiDetection && (
                          <>
                            <span>•</span>
                            <span>Stealth</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {targetUrls.length > 0 && targetUrls[0] !== "" && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Target URLs:</label>
                      {targetUrls.map((url, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            value={url}
                            onChange={(e) => updateTargetUrl(index, e.target.value)}
                            placeholder="https://example.com"
                            className="flex-1"
                          />
                          {targetUrls.length > 1 && (
                            <Button variant="outline" size="sm" onClick={() => removeTargetUrl(index)}>
                              Remove
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="relative">
                    <Input
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="What would you like me to do?"
                      className="pr-12 py-3 text-base"
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                      data-testid="input-task-prompt"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!inputValue.trim() || isExecuting}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 p-0"
                      data-testid="button-send-message"
                    >
                      {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right Panel - Quick Actions */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <h3 className="font-semibold">Quick Actions</h3>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button variant="outline" className="w-full justify-start">
                      <Play className="w-4 h-4 mr-2" />
                      Start Session
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Monitor className="w-4 h-4 mr-2" />
                      Browser Pool
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Settings className="w-4 h-4 mr-2" />
                      Templates
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <h3 className="font-semibold flex items-center">
                      <Activity className="w-4 h-4 mr-2" />
                      Session Management
                      {activeSessions.length > 0 && (
                        <Badge variant="default" className="ml-2">
                          {activeSessions.length}
                        </Badge>
                      )}
                    </h3>
                  </CardHeader>
                  <CardContent>
                    {activeSessions.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {activeSessions.map((session) => (
                          <div
                            key={session.id}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full ${
                                session.status === 'active' ? 'bg-green-500' :
                                session.status === 'idle' ? 'bg-yellow-500' :
                                'bg-gray-500'
                              }`} />
                              <span className="text-sm font-medium truncate max-w-24">
                                {session.id.split('-').pop()}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {session.browser}
                              </Badge>
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(session.lastActivity).toLocaleTimeString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-500 text-sm">
                        No active sessions
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Recent Tasks & Active Sessions */}
            <div className="mt-12">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Tasks */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    Recent Tasks
                  </h3>
                  <div className="space-y-3">
                    {tasks.slice(0, 3).map((task: Task) => (
                      <Card 
                        key={task.id} 
                        className="hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => {
                          setCurrentTaskId(task.id);
                          setShowPreview(true);
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(task.status)}
                              <Badge variant={task.status === "completed" ? "default" : "secondary"} className="text-xs">
                                {task.status}
                              </Badge>
                            </div>
                            <span className="text-xs text-gray-500">
                              {task.createdAt ? new Date(task.createdAt).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 line-clamp-2 mb-1">
                            {task.description}
                          </p>
                          <p className="text-xs text-gray-500">
                            Model: {task.llmModel}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                    {tasks.length === 0 && (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        No recent tasks
                      </div>
                    )}
                  </div>
                </div>

                {/* Active Sessions */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <Monitor className="w-5 h-5 mr-2" />
                    Active Sessions
                  </h3>
                  <div className="text-center py-8 text-gray-500 text-sm">
                    No active sessions running
                  </div>
                </div>
              </div>
            </div>
          </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
