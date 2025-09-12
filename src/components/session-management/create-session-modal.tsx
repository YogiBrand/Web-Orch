import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, CheckCircle, Clock, DollarSign, Zap } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const createSessionSchema = z.object({
  tool: z.enum(['browser-use', 'skyvern', 'playwright', 'puppeteer', 'selenium'], {
    required_error: "Please select an automation tool",
  }),
  browserType: z.enum(['chrome', 'firefox', 'edge'], {
    required_error: "Please select a browser type",
  }),
  automationEngine: z.enum(['playwright', 'puppeteer', 'selenium'], {
    required_error: "Please select an automation engine",
  }),
  sessionName: z.string().min(1, "Session name is required").max(50, "Session name too long"),
  taskId: z.string().optional(),
  concurrency: z.number().min(1).max(20).default(1),
  headless: z.boolean().default(true),
  resolution: z.object({
    width: z.number().min(800).max(3840).default(1920),
    height: z.number().min(600).max(2160).default(1080),
  }),
  recordingEnabled: z.boolean().default(true),
  streamingEnabled: z.boolean().default(true),
  capabilities: z.string().optional(),
});

type CreateSessionForm = z.infer<typeof createSessionSchema>;

interface CreateSessionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSessionCreated: () => void;
  preselectedTaskId?: string;
}

export function CreateSessionModal({ 
  open, 
  onOpenChange, 
  onSessionCreated,
  preselectedTaskId 
}: CreateSessionModalProps) {
  const [step, setStep] = useState(1);
  const [costEstimate, setCostEstimate] = useState<number>(0);
  
  const form = useForm<CreateSessionForm>({
    resolver: zodResolver(createSessionSchema),
    defaultValues: {
      tool: 'browser-use',
      browserType: 'chrome',
      automationEngine: 'playwright',
      sessionName: '',
      taskId: preselectedTaskId || '',
      concurrency: 1,
      headless: true,
      resolution: {
        width: 1920,
        height: 1080,
      },
      recordingEnabled: true,
      streamingEnabled: true,
    },
  });

  const watchedValues = form.watch();

  // Fetch available tasks for task selection
  const { data: tasksData } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => apiRequest('/api/tasks'),
    enabled: open,
  });

  const tasks = tasksData || [];

  // Fetch Selenium Grid status
  const { data: gridStatus } = useQuery({
    queryKey: ['selenium-grid-status'],
    queryFn: () => apiRequest('/api/sessions/grid/status'),
    enabled: open,
    refetchInterval: 5000,
  });

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (data: CreateSessionForm) => {
      const sessionConfig = {
        tool: data.tool,
        browserType: data.browserType,
        automationEngine: data.automationEngine,
        headless: data.headless,
        resolution: data.resolution,
        taskId: data.taskId || undefined,
        concurrency: data.concurrency,
        capabilities: data.capabilities ? JSON.parse(data.capabilities) : {},
      };

      if (data.concurrency > 1) {
        // Create multiple parallel sessions
        return await apiRequest('/api/sessions/bulk', {
          method: 'POST',
          data: {
            sessions: Array.from({ length: data.concurrency }, (_, i) => ({
              ...sessionConfig,
              name: `${data.sessionName}-${i + 1}`,
            })),
          },
        });
      } else {
        // Create single session
        return await apiRequest('/api/sessions', {
          method: 'POST',
          data: {
            ...sessionConfig,
            name: data.sessionName,
          },
        });
      }
    },
    onSuccess: () => {
      onSessionCreated();
      form.reset();
      setStep(1);
    },
  });

  // Calculate cost estimate
  useEffect(() => {
    const calculateCost = () => {
      const baseRate = 0.05; // $0.05 per minute base rate
      const toolMultipliers = {
        'browser-use': 1.2,
        'skyvern': 1.5,
        'playwright': 1.0,
        'puppeteer': 1.0,
        'selenium': 0.8,
      };
      
      const engineMultipliers = {
        'playwright': 1.0,
        'puppeteer': 1.0,
        'selenium': 0.9,
      };

      const headlessDiscount = watchedValues.headless ? 0.8 : 1.0;
      const recordingCost = watchedValues.recordingEnabled ? 0.02 : 0;
      const streamingCost = watchedValues.streamingEnabled ? 0.01 : 0;

      const toolMultiplier = toolMultipliers[watchedValues.tool] || 1.0;
      const engineMultiplier = engineMultipliers[watchedValues.automationEngine] || 1.0;

      const perMinuteCost = baseRate * toolMultiplier * engineMultiplier * headlessDiscount + recordingCost + streamingCost;
      const estimatedHourCost = perMinuteCost * 60 * watchedValues.concurrency;

      setCostEstimate(estimatedHourCost);
    };

    calculateCost();
  }, [watchedValues]);

  const onSubmit = (data: CreateSessionForm) => {
    createSessionMutation.mutate(data);
  };

  const getToolDescription = (tool: string) => {
    const descriptions = {
      'browser-use': 'AI-powered browser automation with natural language commands',
      'skyvern': 'Advanced form filling and web interaction automation',
      'playwright': 'Fast, reliable end-to-end testing framework',
      'puppeteer': 'Headless Chrome control with JavaScript API',
      'selenium': 'Cross-browser automation with wide language support',
    };
    return descriptions[tool as keyof typeof descriptions] || '';
  };

  const getEngineCompatibility = (tool: string, engine: string) => {
    const compatibility = {
      'browser-use': ['playwright', 'puppeteer'],
      'skyvern': ['playwright'],
      'playwright': ['playwright'],
      'puppeteer': ['puppeteer'],
      'selenium': ['selenium'],
    };

    return compatibility[tool as keyof typeof compatibility]?.includes(engine);
  };

  const resetModal = () => {
    setStep(1);
    form.reset();
    setCostEstimate(0);
  };

  useEffect(() => {
    if (!open) {
      resetModal();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Session</DialogTitle>
          <DialogDescription>
            Configure and launch a new browser automation session with live streaming and recording.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={`step-${step}`} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="step-1" onClick={() => setStep(1)}>
                  Configuration
                </TabsTrigger>
                <TabsTrigger value="step-2" onClick={() => setStep(2)}>
                  Advanced Options
                </TabsTrigger>
                <TabsTrigger value="step-3" onClick={() => setStep(3)}>
                  Review & Create
                </TabsTrigger>
              </TabsList>

              <TabsContent value="step-1" className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Basic Configuration */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Basic Configuration</CardTitle>
                      <CardDescription>Select your automation tool and browser</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="sessionName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Session Name</FormLabel>
                            <FormControl>
                              <Input placeholder="My automation session" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="tool"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Automation Tool</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a tool" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="browser-use">🌐 Browser Use</SelectItem>
                                <SelectItem value="skyvern">🦅 Skyvern</SelectItem>
                                <SelectItem value="playwright">🎭 Playwright</SelectItem>
                                <SelectItem value="puppeteer">🎪 Puppeteer</SelectItem>
                                <SelectItem value="selenium">🔧 Selenium</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              {getToolDescription(watchedValues.tool)}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="browserType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Browser Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a browser" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="chrome">🌍 Chrome</SelectItem>
                                <SelectItem value="firefox">🦊 Firefox</SelectItem>
                                <SelectItem value="edge">🔷 Edge</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="automationEngine"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Automation Engine</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select an engine" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem 
                                  value="playwright"
                                  disabled={!getEngineCompatibility(watchedValues.tool, 'playwright')}
                                >
                                  ⚡ Playwright
                                </SelectItem>
                                <SelectItem 
                                  value="puppeteer"
                                  disabled={!getEngineCompatibility(watchedValues.tool, 'puppeteer')}
                                >
                                  🎪 Puppeteer
                                </SelectItem>
                                <SelectItem 
                                  value="selenium"
                                  disabled={!getEngineCompatibility(watchedValues.tool, 'selenium')}
                                >
                                  🔧 Selenium
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            {!getEngineCompatibility(watchedValues.tool, watchedValues.automationEngine) && (
                              <div className="flex items-center gap-2 text-amber-600 text-sm">
                                <AlertTriangle className="h-4 w-4" />
                                This engine may not be compatible with the selected tool
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Task Integration */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Task Integration</CardTitle>
                      <CardDescription>Link to an existing task (optional)</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="taskId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Task (Optional)</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="No task selected" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="">No task</SelectItem>
                                {tasks.map((task: any) => (
                                  <SelectItem key={task.id} value={task.id}>
                                    {task.name || task.id}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Link this session to an existing task for coordination
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="concurrency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Parallel Sessions</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="1" 
                                max="20" 
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                              />
                            </FormControl>
                            <FormDescription>
                              Number of parallel sessions to create (1-20)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* System Status */}
                      <div className="pt-4 border-t">
                        <h4 className="text-sm font-medium mb-2">System Status</h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Selenium Grid</span>
                            {gridStatus?.ready ? (
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Ready
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Unavailable
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Available Nodes</span>
                            <span className="text-sm font-mono">
                              {gridStatus?.nodes?.length || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex justify-end">
                  <Button type="button" onClick={() => setStep(2)}>
                    Next: Advanced Options
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="step-2" className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Browser Options */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Browser Options</CardTitle>
                      <CardDescription>Configure browser behavior and capabilities</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="headless"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <FormLabel>Headless Mode</FormLabel>
                              <FormDescription>
                                Run browser in background (recommended for performance)
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="resolution.width"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Width</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number"
                                  min="800"
                                  max="3840"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 1920)}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="resolution.height"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Height</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number"
                                  min="600"
                                  max="2160"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 1080)}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="capabilities"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Custom Capabilities (JSON)</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder='{"args": ["--disable-dev-shm-usage"]}'
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Additional browser capabilities as JSON
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Recording & Streaming */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Recording & Streaming</CardTitle>
                      <CardDescription>Configure session recording and live streaming</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="recordingEnabled"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <FormLabel>Enable Recording</FormLabel>
                              <FormDescription>
                                Record session video for playback
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="streamingEnabled"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <FormLabel>Enable Streaming</FormLabel>
                              <FormDescription>
                                Live browser preview via noVNC
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      {/* Cost Estimate */}
                      <div className="pt-4 border-t">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="h-4 w-4" />
                          <h4 className="text-sm font-medium">Cost Estimate</h4>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Per hour (estimated)</span>
                            <span className="text-sm font-mono">
                              ${costEstimate.toFixed(3)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Parallel sessions</span>
                            <span className="text-sm font-mono">
                              {watchedValues.concurrency}x
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button type="button" onClick={() => setStep(3)}>
                    Next: Review
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="step-3" className="space-y-6">
                {/* Configuration Review */}
                <Card>
                  <CardHeader>
                    <CardTitle>Configuration Review</CardTitle>
                    <CardDescription>Review your session configuration before creating</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Basic Configuration</h4>
                        <dl className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <dt>Session Name:</dt>
                            <dd className="font-mono">{watchedValues.sessionName}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt>Tool:</dt>
                            <dd className="capitalize">{watchedValues.tool}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt>Browser:</dt>
                            <dd className="capitalize">{watchedValues.browserType}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt>Engine:</dt>
                            <dd className="capitalize">{watchedValues.automationEngine}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt>Parallel Sessions:</dt>
                            <dd>{watchedValues.concurrency}</dd>
                          </div>
                        </dl>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-2">Advanced Options</h4>
                        <dl className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <dt>Mode:</dt>
                            <dd>{watchedValues.headless ? 'Headless' : 'Headful'}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt>Resolution:</dt>
                            <dd className="font-mono">
                              {watchedValues.resolution.width}x{watchedValues.resolution.height}
                            </dd>
                          </div>
                          <div className="flex justify-between">
                            <dt>Recording:</dt>
                            <dd>{watchedValues.recordingEnabled ? 'Enabled' : 'Disabled'}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt>Streaming:</dt>
                            <dd>{watchedValues.streamingEnabled ? 'Enabled' : 'Disabled'}</dd>
                          </div>
                        </dl>
                      </div>
                    </div>

                    {watchedValues.taskId && (
                      <div className="pt-4 border-t">
                        <h4 className="text-sm font-medium mb-1">Task Integration</h4>
                        <p className="text-sm text-muted-foreground">
                          Session will be linked to task: <code className="font-mono">{watchedValues.taskId}</code>
                        </p>
                      </div>
                    )}

                    <div className="pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm font-medium">Estimated Cost</span>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">
                            ${costEstimate.toFixed(3)} / hour
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {watchedValues.concurrency} session{watchedValues.concurrency !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={() => setStep(2)}>
                    Back
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createSessionMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    {createSessionMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Creating Session{watchedValues.concurrency > 1 ? 's' : ''}...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4" />
                        Create Session{watchedValues.concurrency > 1 ? 's' : ''}
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </form>
        </Form>

        {createSessionMutation.isError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Error creating session</span>
            </div>
            <p className="text-red-700 text-sm mt-1">
              {createSessionMutation.error instanceof Error 
                ? createSessionMutation.error.message 
                : 'An unexpected error occurred'}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}