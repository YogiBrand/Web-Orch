import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  ChevronRight, 
  ChevronDown,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Code,
  FileJson,
  Image,
  Terminal,
  Eye,
  Play,
  Pause,
  RefreshCw,
  Loader2,
  FileText,
  MousePointer,
  Type,
  Navigation,
  Database,
  Search
} from 'lucide-react';
import { cn } from '../lib/utils';

interface TaskStep {
  step_id: string;
  step_number: number;
  action_type: 'navigate' | 'click' | 'type' | 'wait' | 'extract' | 'analyze' | 'screenshot';
  status: 'pending' | 'running' | 'completed' | 'failed';
  description: string;
  reasoning?: string;
  element?: string;
  value?: string;
  screenshot_url?: string;
  timestamp?: string;
  duration_ms?: number;
  input?: any;
  output?: any;
  error?: string;
  artifacts?: {
    screenshot?: string;
    dom_snapshot?: string;
    console_logs?: string[];
  };
}

interface TaskStepsViewProps {
  taskId: string;
  className?: string;
}

export function TaskStepsView({ taskId, className }: TaskStepsViewProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [selectedStep, setSelectedStep] = useState<TaskStep | null>(null);

  // Fetch task steps
  const { data: steps = [], isLoading } = useQuery({
    queryKey: ['task', taskId, 'steps'],
    queryFn: async () => {
      // First try to get steps from the task endpoint
      const taskResponse = await fetch(`/api/tasks/${taskId}`);
      if (taskResponse.ok) {
        const task = await taskResponse.json();
        
        // Check if task has Skyvern task ID
        if (task.results?.skyvernTaskId) {
          // Fetch from Skyvern API
          const skyvernResponse = await fetch(`/api/skyvern/tasks/${task.results.skyvernTaskId}`);
          if (skyvernResponse.ok) {
            const skyvernTask = await skyvernResponse.json();
            return skyvernTask.steps || [];
          }
        }
        
        // Return any steps stored directly on the task
        return task.steps || [];
      }
      
      // Fallback to actions endpoint and transform to steps
      const actionsResponse = await fetch(`/api/tasks/${taskId}/actions`);
      if (actionsResponse.ok) {
        const actions = await actionsResponse.json();
        // Transform actions to steps format
        return actions.map((action: any, index: number) => ({
          step_id: action.id || action.action_id || `step-${index}`,
          step_number: index + 1,
          action_type: action.action_type || action.type || 'unknown',
          status: action.status || 'completed',
          description: action.description || action.action_type,
          reasoning: action.reasoning,
          element: action.element,
          value: action.value,
          timestamp: action.timestamp,
          screenshot_url: action.screenshot_url
        }));
      }
      
      return [];
    },
    refetchInterval: 5000
  });

  const toggleStepExpansion = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
      if (selectedStep?.step_id === stepId) {
        setSelectedStep(null);
      }
    } else {
      newExpanded.add(stepId);
      const step = steps.find(s => s.step_id === stepId);
      if (step) {
        setSelectedStep(step);
      }
    }
    setExpandedSteps(newExpanded);
  };

  const getActionIcon = (actionType: string) => {
    const icons: Record<string, React.ReactNode> = {
      navigate: <Navigation className="h-4 w-4" />,
      click: <MousePointer className="h-4 w-4" />,
      type: <Type className="h-4 w-4" />,
      wait: <Clock className="h-4 w-4" />,
      extract: <Database className="h-4 w-4" />,
      analyze: <Search className="h-4 w-4" />,
      screenshot: <Image className="h-4 w-4" />
    };
    return icons[actionType] || <Play className="h-4 w-4" />;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-400" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'running':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (steps.length === 0) {
    return (
      <div className={cn("text-center p-8 text-muted-foreground", className)}>
        <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p>No steps available yet</p>
        <p className="text-sm mt-2">Steps will appear here as the task progresses</p>
      </div>
    );
  }

  return (
    <div className={cn("flex h-full", className)}>
      {/* Steps List */}
      <div className="w-2/5 border-r border-gray-200 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-gray-900">Task Steps</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {steps.length} steps • Click to view details
          </p>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-2">
            {steps.map((step) => (
              <Card
                key={step.step_id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  expandedSteps.has(step.step_id) && "ring-2 ring-blue-500"
                )}
                onClick={() => toggleStepExpansion(step.step_id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-xs font-semibold">
                      {step.step_number}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getActionIcon(step.action_type)}
                        <span className="font-medium text-sm capitalize">
                          {step.action_type}
                        </span>
                        <Badge variant={getStatusBadgeVariant(step.status)} className="text-xs">
                          {step.status}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {step.description}
                      </p>
                      
                      {step.reasoning && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {step.reasoning}
                        </p>
                      )}
                      
                      {step.duration_ms && (
                        <p className="text-xs text-gray-500 mt-1">
                          Duration: {step.duration_ms}ms
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {getStatusIcon(step.status)}
                      {expandedSteps.has(step.step_id) ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Step Details */}
      <div className="flex-1 overflow-hidden flex flex-col bg-gray-50">
        {selectedStep ? (
          <>
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">
                    Step {selectedStep.step_number}: {selectedStep.action_type}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedStep.description}
                  </p>
                </div>
                <Badge variant={getStatusBadgeVariant(selectedStep.status)} className="text-sm">
                  {selectedStep.status}
                </Badge>
              </div>
            </div>

            <Tabs defaultValue="overview" className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-5 bg-white border-b">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="parameters">Parameters</TabsTrigger>
                <TabsTrigger value="output">Output</TabsTrigger>
                <TabsTrigger value="screenshot">Screenshot</TabsTrigger>
                <TabsTrigger value="console">Console</TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1">
                <TabsContent value="overview" className="p-4 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Step Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Action Type</p>
                          <p className="text-sm font-medium capitalize">{selectedStep.action_type}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Status</p>
                          <p className="text-sm font-medium capitalize">{selectedStep.status}</p>
                        </div>
                        {selectedStep.timestamp && (
                          <div>
                            <p className="text-sm text-muted-foreground">Timestamp</p>
                            <p className="text-sm font-medium">
                              {new Date(selectedStep.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                        )}
                        {selectedStep.duration_ms && (
                          <div>
                            <p className="text-sm text-muted-foreground">Duration</p>
                            <p className="text-sm font-medium">{selectedStep.duration_ms}ms</p>
                          </div>
                        )}
                      </div>
                      
                      {selectedStep.reasoning && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">AI Reasoning</p>
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm text-blue-900">{selectedStep.reasoning}</p>
                          </div>
                        </div>
                      )}
                      
                      {selectedStep.element && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Target Element</p>
                          <code className="block p-2 bg-gray-100 rounded text-xs">
                            {selectedStep.element}
                          </code>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="parameters" className="p-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Code className="h-4 w-4" />
                        Input Parameters
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedStep.input ? (
                        <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto">
                          {JSON.stringify(selectedStep.input, null, 2)}
                        </pre>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Code className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                          <p className="text-sm">No input parameters</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="output" className="p-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileJson className="h-4 w-4" />
                        Output Data
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedStep.output ? (
                        <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto">
                          {JSON.stringify(selectedStep.output, null, 2)}
                        </pre>
                      ) : selectedStep.value ? (
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Value:</p>
                          <p className="text-sm font-mono bg-gray-100 p-2 rounded">{selectedStep.value}</p>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <FileJson className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                          <p className="text-sm">No output data</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="screenshot" className="p-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Image className="h-4 w-4" />
                        Screenshot
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedStep.screenshot_url || selectedStep.artifacts?.screenshot ? (
                        <div className="relative">
                          <img
                            src={selectedStep.screenshot_url || selectedStep.artifacts?.screenshot}
                            alt={`Screenshot for step ${selectedStep.step_number}`}
                            className="w-full rounded-lg border border-gray-200"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => window.open(selectedStep.screenshot_url || selectedStep.artifacts?.screenshot, '_blank')}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Full Size
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-16 text-muted-foreground bg-gray-100 rounded-lg">
                          <Image className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                          <p className="text-sm">No screenshot available</p>
                          <p className="text-xs mt-1">Screenshots are captured for key actions</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="console" className="p-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Terminal className="h-4 w-4" />
                        Console Logs
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedStep.artifacts?.console_logs && selectedStep.artifacts.console_logs.length > 0 ? (
                        <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-xs space-y-1 overflow-x-auto">
                          {selectedStep.artifacts.console_logs.map((log, index) => (
                            <div key={index}>{log}</div>
                          ))}
                        </div>
                      ) : selectedStep.error ? (
                        <div className="bg-red-50 border border-red-200 rounded p-3">
                          <p className="text-sm font-medium text-red-900 mb-1">Error</p>
                          <p className="text-sm text-red-700">{selectedStep.error}</p>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Terminal className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                          <p className="text-sm">No console output</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MousePointer className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium">Select a step to view details</p>
              <p className="text-sm mt-1">Click on any step from the list to see its diagnostics</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}