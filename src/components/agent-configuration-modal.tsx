import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Plus, 
  X,
  Zap,
  Shield,
  Clock,
  Settings
} from "lucide-react";
// import { insertAgentConnectionSchema } from "@shared/schema";
import type { AgentConnection } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

// const formSchema = insertAgentConnectionSchema.extend({
//   name: z.string().min(1, "Agent name is required"),
//   endpointUrl: z.string().url("Please enter a valid URL"),
//   type: z.enum(["skyvern", "browser-use", "crawl4ai", "mcp"]),
// });

// type FormData = z.infer<typeof formSchema>;
type FormData = any;

interface AgentConfigurationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent?: AgentConnection | null;
  mode: "create" | "edit";
}

export function AgentConfigurationModal({ 
  open, 
  onOpenChange, 
  agent, 
  mode 
}: AgentConfigurationModalProps) {
  const [customHeaders, setCustomHeaders] = useState<Array<{key: string, value: string}>>([]);
  const [testResult, setTestResult] = useState<{success: boolean, message: string} | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    // resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: "skyvern",
      endpoint: "",
      status: "active" as const,
    },
  });

  const createAgentMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const requestData = {
        ...data,
        headers: Object.fromEntries(
          customHeaders.filter(h => h.key && h.value).map(h => [h.key, h.value])
        ),
      };
      return apiRequest("/api/agents", { method: "POST", data: requestData });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      onOpenChange(false);
      form.reset();
      setCustomHeaders([]);
    },
  });

  const updateAgentMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const requestData = {
        ...data,
        headers: Object.fromEntries(
          customHeaders.filter(h => h.key && h.value).map(h => [h.key, h.value])
        ),
      };
      return apiRequest(`/api/agents/${agent?.id}`, { method: "PATCH", data: requestData });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      onOpenChange(false);
    },
  });

  useEffect(() => {
    if (agent && mode === "edit") {
      form.reset({
        name: agent.name,
        type: agent.type,
        endpoint: agent.endpoint,
        status: agent.status,
      });
      
      // Convert headers object to array
      if (agent.headers) {
        setCustomHeaders(
          Object.entries(agent.headers).map(([key, value]) => ({ key, value }))
        );
      }
    }
  }, [agent, mode, form]);

  const handleSubmit = (data: FormData) => {
    if (mode === "create") {
      createAgentMutation.mutate(data);
    } else {
      updateAgentMutation.mutate(data);
    }
  };

  const testConnection = async () => {
    setIsTestingConnection(true);
    setTestResult(null);
    
    try {
      const formData = form.getValues();
      const headers = Object.fromEntries(
        customHeaders.filter(h => h.key && h.value).map(h => [h.key, h.value])
      );
      
      const response = await apiRequest("/api/agents/test-connection", {
        method: "POST",
        data: {
          endpoint: formData.endpoint,
          headers,
        },
      });
      
      setTestResult({ success: true, message: "Connection successful!" });
    } catch (error) {
      setTestResult({ 
        success: false, 
        message: error instanceof Error ? error.message : "Connection failed" 
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const addCustomHeader = () => {
    setCustomHeaders([...customHeaders, { key: "", value: "" }]);
  };

  const removeCustomHeader = (index: number) => {
    setCustomHeaders(customHeaders.filter((_, i) => i !== index));
  };

  const updateCustomHeader = (index: number, field: "key" | "value", value: string) => {
    const updated = [...customHeaders];
    updated[index][field] = value;
    setCustomHeaders(updated);
  };

  const agentTypeTemplates = {
    skyvern: {
      name: "Skyvern Agent",
      endpointUrl: "https://your-skyvern-server.com:8000",
      healthCheckEndpoint: "/api/v1/health",
      supportedFeatures: ["workflow_automation", "data_extraction", "form_filling"],
    },
    "browser-use": {
      name: "Browser-Use Agent",
      endpointUrl: "https://your-browser-use-server.com:8080",
      healthCheckEndpoint: "/health",
      supportedFeatures: ["dom_analysis", "natural_language_control", "screenshot_analysis"],
    },
    crawl4ai: {
      name: "Crawl4AI Agent",
      endpointUrl: "https://your-crawl4ai-server.com:3000",
      healthCheckEndpoint: "/health",
      supportedFeatures: ["web_crawling", "content_extraction", "batch_processing"],
    },
    mcp: {
      name: "MCP Server",
      endpointUrl: "https://your-mcp-server.com:8000",
      healthCheckEndpoint: "/health",
      supportedFeatures: ["custom_protocols", "context_management", "tool_integration"],
    },
  };

  const handleTypeChange = (type: string) => {
    const template = agentTypeTemplates[type as keyof typeof agentTypeTemplates];
    if (template && mode === "create") {
      form.setValue("name", template.name);
      form.setValue("endpointUrl", template.endpointUrl);
      form.setValue("healthCheckEndpoint", template.healthCheckEndpoint);
      form.setValue("supportedFeatures", template.supportedFeatures);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add New Agent" : `Configure ${agent?.name}`}
          </DialogTitle>
          <DialogDescription>
            {mode === "create" 
              ? "Connect a new automation agent to your workflow"
              : "Modify agent configuration and connection settings"
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <Tabs defaultValue="connection" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="connection" className="gap-2">
                  <Zap className="h-4 w-4" />
                  Connection
                </TabsTrigger>
                <TabsTrigger value="advanced" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Advanced
                </TabsTrigger>
                <TabsTrigger value="health" className="gap-2">
                  <Clock className="h-4 w-4" />
                  Health
                </TabsTrigger>
                <TabsTrigger value="security" className="gap-2">
                  <Shield className="h-4 w-4" />
                  Security
                </TabsTrigger>
              </TabsList>

              <TabsContent value="connection" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Agent Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="My Skyvern Agent" {...field} data-testid="input-agent-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Agent Type *</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleTypeChange(value);
                          }} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-agent-type">
                              <SelectValue placeholder="Select agent type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="skyvern">Skyvern</SelectItem>
                            <SelectItem value="browser-use">Browser-Use</SelectItem>
                            <SelectItem value="crawl4ai">Crawl4AI</SelectItem>
                            <SelectItem value="mcp">MCP Server</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="endpointUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Server URL *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://your-server.com:8000" 
                          {...field} 
                          data-testid="input-endpoint-url"
                        />
                      </FormControl>
                      <FormDescription>
                        The base URL of your agent server
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="wsUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WebSocket URL (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="wss://your-server.com:8000/ws" 
                          {...field} 
                          data-testid="input-ws-url"
                        />
                      </FormControl>
                      <FormDescription>
                        WebSocket URL for real-time updates
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="apiKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Key / Token (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="your-api-key-here" 
                          {...field} 
                          data-testid="input-api-key"
                        />
                      </FormControl>
                      <FormDescription>
                        Authentication token for secure API communication (e.g., Skyvern Cloud API key)
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={testConnection}
                    disabled={isTestingConnection || !form.watch("endpointUrl")}
                    data-testid="button-test-connection"
                  >
                    {isTestingConnection ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Zap className="h-4 w-4 mr-2" />
                    )}
                    Test Connection
                  </Button>
                  
                  {testResult && (
                    <div className={`flex items-center gap-2 ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                      {testResult.success ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      <span className="text-sm">{testResult.message}</span>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Max Concurrent Tasks</Label>
                    <FormField
                      control={form.control}
                      name="maxConcurrent"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="space-y-2">
                              <Slider
                                min={1}
                                max={20}
                                step={1}
                                value={[field.value]}
                                onValueChange={(values) => field.onChange(values[0])}
                                data-testid="slider-max-concurrent"
                              />
                              <div className="text-sm text-muted-foreground">
                                Current: {field.value} task(s)
                              </div>
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div>
                    <Label>Priority Level</Label>
                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="space-y-2">
                              <Slider
                                min={1}
                                max={100}
                                step={1}
                                value={[field.value]}
                                onValueChange={(values) => field.onChange(values[0])}
                                data-testid="slider-priority"
                              />
                              <div className="text-sm text-muted-foreground">
                                Current: {field.value} (higher = more priority)
                              </div>
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="costPerTask"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost per Task ($)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="0.10" 
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                          data-testid="input-cost-per-task"
                        />
                      </FormControl>
                      <FormDescription>
                        Optional cost tracking for billing and monitoring
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <div>
                  <Label>Supported Features</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.watch("supportedFeatures")?.map((feature, index) => (
                      <Badge key={index} variant="secondary">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="health" className="space-y-4">
                <FormField
                  control={form.control}
                  name="healthCheckEndpoint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Health Check Endpoint</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="/health" 
                          {...field} 
                          data-testid="input-health-endpoint"
                        />
                      </FormControl>
                      <FormDescription>
                        Endpoint to check agent health (relative to server URL)
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="healthCheckInterval"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Check Interval (seconds)</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value.toString()}>
                          <FormControl>
                            <SelectTrigger data-testid="select-health-interval">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="30">30 seconds</SelectItem>
                            <SelectItem value="60">1 minute</SelectItem>
                            <SelectItem value="300">5 minutes</SelectItem>
                            <SelectItem value="600">10 minutes</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="healthCheckTimeout"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Timeout (ms)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="5000" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 5000)}
                            data-testid="input-health-timeout"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="autoReconnect"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Auto-reconnect</FormLabel>
                          <FormDescription>
                            Automatically attempt to reconnect on failure
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-auto-reconnect"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="alertOnFailure"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Alert on Failure</FormLabel>
                          <FormDescription>
                            Send notifications when health checks fail
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-alert-on-failure"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="security" className="space-y-4">
                <div>
                  <Label>Custom Headers</Label>
                  <div className="space-y-2 mt-2">
                    {customHeaders.map((header, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder="Header name"
                          value={header.key}
                          onChange={(e) => updateCustomHeader(index, "key", e.target.value)}
                          data-testid={`input-header-key-${index}`}
                        />
                        <Input
                          placeholder="Header value"
                          value={header.value}
                          onChange={(e) => updateCustomHeader(index, "value", e.target.value)}
                          data-testid={`input-header-value-${index}`}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeCustomHeader(index)}
                          data-testid={`button-remove-header-${index}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addCustomHeader}
                      className="w-full"
                      data-testid="button-add-header"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Header
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createAgentMutation.isPending || updateAgentMutation.isPending}
                data-testid="button-save-agent"
              >
                {createAgentMutation.isPending || updateAgentMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : mode === "create" ? (
                  "Create Agent"
                ) : (
                  "Update Agent"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
