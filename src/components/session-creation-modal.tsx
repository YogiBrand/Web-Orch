import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Chrome, Globe, Monitor, Camera, Shield,
  Zap, Settings, Code, Users, Play, AlertTriangle
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

const sessionConfigSchema = z.object({
  name: z.string().min(1, "Session name is required"),
  sessionType: z.enum(["browser", "playwright", "python", "jupyter", "automation"]).default("browser"),
  browser: z.enum(["chrome", "firefox", "edge", "safari"]),
  count: z.number().min(1).max(10).default(1),
  config: z.object({
    viewport: z.object({
      width: z.number().min(800).max(3840).default(1920),
      height: z.number().min(600).max(2160).default(1080),
    }),
    userAgent: z.string().optional(),
    proxy: z.string().optional(),
    headless: z.boolean().default(false),
    stealth: z.boolean().default(false),
    recording: z.boolean().default(false),
    antiDetection: z.object({
      enabled: z.boolean().default(false),
      level: z.enum(["basic", "advanced", "military"]).default("basic"),
      fingerprinting: z.boolean().default(false),
      behavioralBiometrics: z.boolean().default(false),
    }),
  }),
  environmentConfig: z.object({
    pythonVersion: z.string().optional(),
    nodeVersion: z.string().optional(),
    packages: z.array(z.string()).optional(),
    jupyterConfig: z.record(z.any()).optional(),
    enableRecording: z.boolean().default(false),
    enablePersistence: z.boolean().default(false),
  }).optional(),
  taskData: z.object({
    taskId: z.string().optional(),
    taskName: z.string().optional(),
  }).optional(),
});

type SessionConfig = z.infer<typeof sessionConfigSchema>;

interface SessionCreationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSessionCreated: () => void;
  taskId?: string;
  taskName?: string;
}

const BROWSER_CONFIGS = {
  chrome: {
    icon: Chrome,
    name: "Google Chrome",
    description: "Most popular browser with excellent automation support",
    color: "text-blue-600"
  },
  firefox: {
    icon: Globe,
    name: "Mozilla Firefox",
    description: "Privacy-focused browser with strong developer tools",
    color: "text-orange-600"
  },
  edge: {
    icon: Globe,
    name: "Microsoft Edge",
    description: "Modern browser with enterprise features",
    color: "text-purple-600"
  },
  safari: {
    icon: Globe,
    name: "Safari",
    description: "Apple's browser (macOS only)",
    color: "text-gray-600"
  }
};

const SESSION_TYPES = {
  "browser": {
    name: "Browser Automation",
    description: "Basic browser automation with NoVNC access",
    icon: "🌐",
    color: "bg-blue-100 text-blue-800"
  },
  "playwright": {
    name: "Playwright Environment",
    description: "Advanced web automation with Playwright framework",
    icon: "🎭",
    color: "bg-green-100 text-green-800"
  },
  "python": {
    name: "Python Development",
    description: "Python coding environment with browser access",
    icon: "🐍",
    color: "bg-yellow-100 text-yellow-800"
  },
  "jupyter": {
    name: "Jupyter Notebook",
    description: "Interactive Python environment with Jupyter Lab",
    icon: "📓",
    color: "bg-purple-100 text-purple-800"
  },
  "automation": {
    name: "Full Automation Suite",
    description: "Complete automation environment with all tools",
    icon: "🤖",
    color: "bg-indigo-100 text-indigo-800"
  }
};

const PRESETS = {
  basic: {
    name: "Basic Automation",
    description: "Simple automation with minimal configuration",
    config: {
      headless: true,
      stealth: false,
      recording: false,
      antiDetection: { enabled: false, level: "basic" as const, fingerprinting: false, behavioralBiometrics: false }
    }
  },
  stealth: {
    name: "Stealth Mode",
    description: "Maximum stealth with anti-detection features",
    config: {
      headless: true,
      stealth: true,
      recording: true,
      antiDetection: { enabled: true, level: "advanced" as const, fingerprinting: true, behavioralBiometrics: true }
    }
  },
  development: {
    name: "Development",
    description: "Visible browser for debugging and development",
    config: {
      headless: false,
      stealth: false,
      recording: true,
      antiDetection: { enabled: false, level: "basic" as const, fingerprinting: false, behavioralBiometrics: false }
    }
  },
  enterprise: {
    name: "Enterprise",
    description: "Production-ready configuration with monitoring",
    config: {
      headless: true,
      stealth: true,
      recording: true,
      antiDetection: { enabled: true, level: "military" as const, fingerprinting: true, behavioralBiometrics: true }
    }
  }
};

export function SessionCreationModal({
  open,
  onOpenChange,
  onSessionCreated,
  taskId,
  taskName
}: SessionCreationModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("basic");
  const [selectedTaskId, setSelectedTaskId] = useState<string>(taskId || "");

  // Fetch available tasks for task selector
  const { data: tasksData } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      return await apiRequest('/api/tasks');
    },
  });

  const tasks = tasksData?.tasks || [];

  const form = useForm<SessionConfig>({
    resolver: zodResolver(sessionConfigSchema),
    defaultValues: {
      name: taskName ? `${taskName} Session` : "New Session",
      sessionType: "browser",
      browser: "chrome",
      count: 1,
      config: {
        viewport: { width: 1920, height: 1080 },
        userAgent: "",
        proxy: "",
        headless: false,
        stealth: false,
        recording: false,
        antiDetection: {
          enabled: false,
          level: "basic",
          fingerprinting: false,
          behavioralBiometrics: false,
        },
      },
      environmentConfig: {
        pythonVersion: "3.11",
        nodeVersion: "18",
        packages: [],
        enableRecording: false,
        enablePersistence: false,
      },
      taskData: taskId ? { taskId, taskName } : undefined,
    },
  });

  const createSessionMutation = useMutation({
    mutationFn: async (data: SessionConfig) => {
      try {
        console.log('Creating session with data:', data);

        // Transform the data to match the backend API expectations
        const apiData: any = {
          browserConfig: {
            browserType: data.browser === 'chrome' ? 'chromium' :
                        data.browser === 'firefox' ? 'firefox' :
                        data.browser === 'safari' ? 'webkit' :
                        data.browser === 'edge' ? 'chromium' : 'chromium',
            headless: data.config.headless,
            viewport: {
              width: data.config.viewport.width,
              height: data.config.viewport.height
            },
            timeout: 30000, // Default timeout
            userAgent: data.config.userAgent || 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
          },
          sessionKey: data.name || `session-${Date.now()}`,
          agentType: data.sessionType === 'browser' ? 'browser-use' :
                    data.sessionType === 'playwright' ? 'playwright' :
                    data.sessionType === 'puppeteer' ? 'puppeteer' :
                    data.sessionType === 'selenium' ? 'selenium' :
                    data.sessionType === 'computer-use' ? 'computer-use' : 'browser-use',
          concurrency: data.count || 1
        };

        // Only add optional fields if they have values
        if (data.taskData?.taskId) {
          apiData.taskId = data.taskData.taskId;
        }
        if (data.taskData?.taskName) {
          apiData.taskName = data.taskData.taskName;
        }

        console.log('Transformed API data:', apiData);

        const result = await apiRequest('/api/sessions', {
          method: 'POST',
          data: apiData
        });

        console.log('Session creation result:', result);
        return result;
      } catch (error) {
        console.error('Session creation error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('✅ Session created successfully:', data);
      console.log('📊 Calling onSessionCreated to refresh sessions list...');
      onSessionCreated();
      form.reset();
      setSelectedPreset(null);
      console.log('🎉 Session creation flow completed successfully!');
    },
    onError: (error) => {
      console.error('❌ Session creation failed:', error);
      // Show user-friendly error message
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
    }
  });

  const handlePresetSelect = useCallback((presetKey: string) => {
    const preset = PRESETS[presetKey as keyof typeof PRESETS];
    if (preset) {
      setSelectedPreset(presetKey);
      form.setValue('config', {
        ...form.getValues('config'),
        ...preset.config,
      });
    }
  }, [form]);

  const onSubmit = (data: SessionConfig) => {
    createSessionMutation.mutate(data);
  };

  const watchedValues = form.watch();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Create New Session{watchedValues.count > 1 ? `s (${watchedValues.count})` : ''}
          </DialogTitle>
          <DialogDescription>
            Configure and launch browser automation sessions with advanced settings
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="browser">Browser</TabsTrigger>
              <TabsTrigger value="environment">Environment</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Configuration</CardTitle>
                  <CardDescription>
                    Set the fundamental properties for your session
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="name">Session Name</Label>
                      <Input
                        id="name"
                        {...form.register("name")}
                        placeholder="Enter session name"
                      />
                      {form.formState.errors.name && (
                        <p className="text-sm text-red-600 mt-1">
                          {form.formState.errors.name.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="count">Number of Sessions</Label>
                      <Input
                        id="count"
                        type="number"
                        min={1}
                        max={10}
                        {...form.register("count", { valueAsNumber: true })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Create multiple sessions for parallel execution
                      </p>
                    </div>
                  </div>

                  {/* Task Association */}
                  <div>
                    <Label>Task Association (Optional)</Label>
                    <div className="mt-2">
                      {taskId ? (
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center justify-between mb-1">
                            <Badge variant="secondary">Pre-selected Task</Badge>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedTaskId("")}
                            >
                              Remove
                            </Button>
                          </div>
                          <div className="text-sm">
                            <strong>Task:</strong> {taskName || taskId}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            ID: {taskId}
                          </div>
                        </div>
                      ) : (
                        <Select value={selectedTaskId} onValueChange={(value) => {
                          setSelectedTaskId(value);
                          if (value && value !== "no-task") {
                            const selectedTask = tasks.find((t: any) => t.id === value);
                            if (selectedTask) {
                              form.setValue('taskData', {
                                taskId: selectedTask.id,
                                taskName: selectedTask.description?.substring(0, 50) || selectedTask.id
                              });
                            }
                          } else {
                            form.setValue('taskData', undefined);
                          }
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a task to associate with this session" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="no-task">No Task Association</SelectItem>
                            {tasks.map((task: any) => (
                              <SelectItem key={task.id} value={task.id}>
                                <div className="flex flex-col items-start">
                                  <span className="font-medium">
                                    {task.description?.substring(0, 40) || task.id}...
                                  </span>
                                  <span className="text-xs text-muted-foreground font-mono">
                                    {task.id}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Link this session to a specific task for better organization and tracking
                      </p>
                    </div>
                  </div>

                  {/* Session Type Selection */}
                  <div>
                    <Label>Session Type</Label>
                    <div className="grid gap-3 md:grid-cols-2 mt-2">
                      {Object.entries(SESSION_TYPES).map(([key, type]) => (
                        <div
                          key={key}
                          className={cn(
                            "p-4 border rounded-lg cursor-pointer transition-colors",
                            watchedValues.sessionType === key
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-200 hover:border-gray-300"
                          )}
                          onClick={() => form.setValue("sessionType", key as any)}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{type.icon}</span>
                            <div>
                              <div className="font-medium">{type.name}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {type.description}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Configuration Presets */}
                  <div>
                    <Label>Configuration Presets</Label>
                    <div className="grid gap-2 md:grid-cols-2 mt-2">
                      {Object.entries(PRESETS).map(([key, preset]) => (
                        <div
                          key={key}
                          className={cn(
                            "p-3 border rounded-lg cursor-pointer transition-colors",
                            selectedPreset === key
                              ? "border-green-500 bg-green-50"
                              : "border-gray-200 hover:border-gray-300"
                          )}
                          onClick={() => handlePresetSelect(key)}
                        >
                          <div className="font-medium flex items-center gap-2">
                            {preset.name}
                            {selectedPreset === key && (
                              <Badge variant="secondary" className="text-xs">
                                Active
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {preset.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="browser" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Browser Configuration</CardTitle>
                  <CardDescription>
                    Choose browser type and configure viewport settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Browser Selection */}
                  <div>
                    <Label>Browser Type</Label>
                    <div className="grid gap-3 md:grid-cols-2 mt-2">
                      {Object.entries(BROWSER_CONFIGS).map(([key, browser]) => {
                        const IconComponent = browser.icon;
                        return (
                          <div
                            key={key}
                            className={cn(
                              "p-4 border rounded-lg cursor-pointer transition-colors",
                              watchedValues.browser === key
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-200 hover:border-gray-300"
                            )}
                            onClick={() => form.setValue("browser", key as any)}
                          >
                            <div className="flex items-center gap-3">
                              <IconComponent className={cn("h-6 w-6", browser.color)} />
                              <div>
                                <div className="font-medium">{browser.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {browser.description}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <Separator />

                  {/* Viewport Configuration */}
                  <div>
                    <Label>Viewport Size</Label>
                    <div className="grid gap-3 md:grid-cols-2 mt-2">
                      <div>
                        <Label htmlFor="width" className="text-sm">Width</Label>
                        <Input
                          id="width"
                          type="number"
                          min={800}
                          max={3840}
                          {...form.register("config.viewport.width", { valueAsNumber: true })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="height" className="text-sm">Height</Label>
                        <Input
                          id="height"
                          type="number"
                          min={600}
                          max={2160}
                          {...form.register("config.viewport.height", { valueAsNumber: true })}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      {[
                        { name: "1920×1080", width: 1920, height: 1080 },
                        { name: "1366×768", width: 1366, height: 768 },
                        { name: "1440×900", width: 1440, height: 900 },
                        { name: "Mobile", width: 375, height: 667 },
                      ].map((preset) => (
                        <Button
                          key={preset.name}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            form.setValue("config.viewport.width", preset.width);
                            form.setValue("config.viewport.height", preset.height);
                          }}
                          className="text-xs"
                        >
                          {preset.name}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* User Agent */}
                  <div>
                    <Label htmlFor="userAgent">Custom User Agent (Optional)</Label>
                    <Input
                      id="userAgent"
                      {...form.register("config.userAgent")}
                      placeholder="Leave empty for default"
                    />
                  </div>

                  {/* Proxy Configuration */}
                  <div>
                    <Label htmlFor="proxy">Proxy (Optional)</Label>
                    <Input
                      id="proxy"
                      {...form.register("config.proxy")}
                      placeholder="http://proxy.example.com:8080"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="environment" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Environment Configuration</CardTitle>
                  <CardDescription>
                    Configure runtime environment, packages, and development tools
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Python Configuration */}
                  {(watchedValues.sessionType === 'python' || watchedValues.sessionType === 'jupyter' || watchedValues.sessionType === 'automation') && (
                    <div>
                      <Label>Python Configuration</Label>
                      <div className="grid gap-3 md:grid-cols-2 mt-2">
                        <div>
                          <Label htmlFor="pythonVersion" className="text-sm">Python Version</Label>
                          <Select
                            value={watchedValues.environmentConfig?.pythonVersion}
                            onValueChange={(value) => form.setValue("environmentConfig.pythonVersion", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select Python version" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="3.8">Python 3.8</SelectItem>
                              <SelectItem value="3.9">Python 3.9</SelectItem>
                              <SelectItem value="3.10">Python 3.10</SelectItem>
                              <SelectItem value="3.11">Python 3.11</SelectItem>
                              <SelectItem value="3.12">Python 3.12</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="packages" className="text-sm">Additional Packages</Label>
                          <Input
                            id="packages"
                            placeholder="numpy pandas requests"
                            {...form.register("environmentConfig.packages")}
                            onChange={(e) => {
                              const packages = e.target.value.split(' ').filter(pkg => pkg.trim());
                              form.setValue("environmentConfig.packages", packages);
                            }}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Space-separated package names to install
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Node.js Configuration */}
                  {(watchedValues.sessionType === 'playwright' || watchedValues.sessionType === 'automation') && (
                    <div>
                      <Label>Node.js Configuration</Label>
                      <div className="grid gap-3 md:grid-cols-2 mt-2">
                        <div>
                          <Label htmlFor="nodeVersion" className="text-sm">Node.js Version</Label>
                          <Select
                            value={watchedValues.environmentConfig?.nodeVersion}
                            onValueChange={(value) => form.setValue("environmentConfig.nodeVersion", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select Node.js version" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="16">Node.js 16</SelectItem>
                              <SelectItem value="18">Node.js 18</SelectItem>
                              <SelectItem value="20">Node.js 20</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Jupyter Configuration */}
                  {(watchedValues.sessionType === 'jupyter' || watchedValues.sessionType === 'automation') && (
                    <div>
                      <Label>Jupyter Configuration</Label>
                      <div className="mt-2">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="text-sm font-medium">Enable Jupyter Lab</Label>
                            <p className="text-xs text-muted-foreground">
                              Start Jupyter Lab interface for interactive development
                            </p>
                          </div>
                          <Switch
                            checked={watchedValues.environmentConfig?.jupyterConfig?.enableLab || false}
                            onCheckedChange={(checked) => form.setValue("environmentConfig.jupyterConfig", {
                              ...watchedValues.environmentConfig?.jupyterConfig,
                              enableLab: checked
                            })}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Environment Features */}
                  <div>
                    <Label>Environment Features</Label>
                    <div className="grid gap-3 md:grid-cols-2 mt-2">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-sm">Session Recording</Label>
                          <p className="text-xs text-muted-foreground">
                            Record session activity for review
                          </p>
                        </div>
                        <Switch
                          checked={watchedValues.environmentConfig?.enableRecording || false}
                          onCheckedChange={(checked) => form.setValue("environmentConfig.enableRecording", checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-sm">Data Persistence</Label>
                          <p className="text-xs text-muted-foreground">
                            Persist session data across restarts
                          </p>
                        </div>
                        <Switch
                          checked={watchedValues.environmentConfig?.enablePersistence || false}
                          onCheckedChange={(checked) => form.setValue("environmentConfig.enablePersistence", checked)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Session Type Specific Info */}
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-start gap-3">
                      <Settings className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900">
                          {SESSION_TYPES[watchedValues.sessionType]?.name} Environment
                        </h4>
                        <p className="text-sm text-blue-700 mt-1">
                          {watchedValues.sessionType === 'browser' && "Basic browser automation with NoVNC access for manual control."}
                          {watchedValues.sessionType === 'playwright' && "Full Playwright environment for advanced web automation and testing."}
                          {watchedValues.sessionType === 'python' && "Python development environment with browser automation capabilities."}
                          {watchedValues.sessionType === 'jupyter' && "Interactive Jupyter environment for data science and analysis."}
                          {watchedValues.sessionType === 'automation' && "Complete automation suite with all tools and environments."}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Advanced Settings</CardTitle>
                  <CardDescription>
                    Configure advanced browser behavior and features
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">Headless Mode</Label>
                        <p className="text-xs text-muted-foreground">
                          Run browser without GUI for better performance
                        </p>
                      </div>
                      <Switch
                        checked={watchedValues.config.headless}
                        onCheckedChange={(checked) => form.setValue("config.headless", checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">Stealth Mode</Label>
                        <p className="text-xs text-muted-foreground">
                          Basic stealth features to avoid detection
                        </p>
                      </div>
                      <Switch
                        checked={watchedValues.config.stealth}
                        onCheckedChange={(checked) => form.setValue("config.stealth", checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">Session Recording</Label>
                        <p className="text-xs text-muted-foreground">
                          Record session for playback and debugging
                        </p>
                      </div>
                      <Switch
                        checked={watchedValues.config.recording}
                        onCheckedChange={(checked) => form.setValue("config.recording", checked)}
                      />
                    </div>
                  </div>

                  {watchedValues.config.recording && (
                    <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="flex items-center gap-2">
                        <Camera className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm font-medium text-yellow-800">
                          Recording Enabled
                        </span>
                      </div>
                      <p className="text-xs text-yellow-700 mt-1">
                        Session will be recorded and available for playback after completion
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Anti-Detection & Security
                  </CardTitle>
                  <CardDescription>
                    Configure advanced anti-detection features for stealth automation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Enable Anti-Detection</Label>
                      <p className="text-xs text-muted-foreground">
                        Activate advanced stealth features to bypass bot detection
                      </p>
                    </div>
                    <Switch
                      checked={watchedValues.config.antiDetection.enabled}
                      onCheckedChange={(checked) => 
                        form.setValue("config.antiDetection.enabled", checked)
                      }
                    />
                  </div>

                  {watchedValues.config.antiDetection.enabled && (
                    <div className="space-y-4 p-4 border rounded-lg">
                      <div>
                        <Label>Detection Evasion Level</Label>
                        <Select
                          value={watchedValues.config.antiDetection.level}
                          onValueChange={(value: any) => 
                            form.setValue("config.antiDetection.level", value)
                          }
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="basic">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full" />
                                Basic - Standard evasion techniques
                              </div>
                            </SelectItem>
                            <SelectItem value="advanced">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                                Advanced - Enhanced fingerprint spoofing
                              </div>
                            </SelectItem>
                            <SelectItem value="military">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-red-500 rounded-full" />
                                Military - Maximum stealth capabilities
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="text-sm">Fingerprint Spoofing</Label>
                            <p className="text-xs text-muted-foreground">
                              Randomize browser fingerprints
                            </p>
                          </div>
                          <Switch
                            checked={watchedValues.config.antiDetection.fingerprinting}
                            onCheckedChange={(checked) => 
                              form.setValue("config.antiDetection.fingerprinting", checked)
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="text-sm">Behavioral Biometrics</Label>
                            <p className="text-xs text-muted-foreground">
                              Human-like mouse and keyboard patterns
                            </p>
                          </div>
                          <Switch
                            checked={watchedValues.config.antiDetection.behavioralBiometrics}
                            onCheckedChange={(checked) => 
                              form.setValue("config.antiDetection.behavioralBiometrics", checked)
                            }
                          />
                        </div>
                      </div>

                      <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-orange-600" />
                          <span className="text-sm font-medium text-orange-800">
                            Advanced Anti-Detection Active
                          </span>
                        </div>
                        <p className="text-xs text-orange-700 mt-1">
                          High-level stealth features may impact performance. Use responsibly and in compliance with target site terms of service.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Error Display */}
          {createSessionMutation.isError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-800 mb-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Session Creation Failed</span>
              </div>
              <p className="text-red-700 text-sm">
                {createSessionMutation.error instanceof Error 
                  ? createSessionMutation.error.message 
                  : 'An unexpected error occurred. Please try again.'}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {watchedValues.count > 1 && (
                <>
                  <Users className="h-4 w-4" />
                  <span>{watchedValues.count} parallel sessions will be created</span>
                </>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createSessionMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createSessionMutation.isPending}
                className="gap-2"
              >
                {createSessionMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Create Session{watchedValues.count > 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}