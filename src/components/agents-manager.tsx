import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Bot, 
  Settings, 
  Play, 
  Pause, 
  Plus, 
  Zap,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Globe,
  Database,
  Monitor
} from "lucide-react";
import { AgentConfigurationModal } from "./agent-configuration-modal";
import { AgentMetricsCard } from "./agent-metrics-card";
import { useAgentConnection } from "@/hooks/use-agent-connection";
import { apiRequest } from "@/lib/queryClient";
import type { AgentConnection } from "@shared/schema";

export function AgentsManager() {
  const [selectedAgent, setSelectedAgent] = useState<AgentConnection | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const queryClient = useQueryClient();

  const { data: agents = [], isLoading, error } = useQuery<AgentConnection[]>({
    queryKey: ["/api/agents"],
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    select: (data) => {
      if (!data) return [];
      if (Array.isArray(data)) return data;
      // Accept both { success, agents } or raw array
      // @ts-ignore
      if (data?.agents && Array.isArray((data as any).agents)) {
        // @ts-ignore
        return (data as any).agents;
      }
      return [];
    },
  });

  const toggleAgentMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'start' | 'stop' }) => {
      return apiRequest(`/api/agents/${id}/${action}`, {
        method: "POST",
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      // Show a brief success message or toast if needed
      console.log(`Agent ${variables.action} action completed successfully`);
    },
    onError: (error, variables) => {
      console.error(`Failed to ${variables.action} agent:`, error);
    },
  });

  const deleteAgentMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/agents/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/agents/${id}/test`, {
        method: "POST",
      });
    },
    onSuccess: (data, agentId) => {
      console.log(`Test connection for agent ${agentId}:`, data);
    },
    onError: (error, agentId) => {
      console.error(`Test connection failed for agent ${agentId}:`, error);
    },
  });

  const agentTypes = [
    {
      type: "skyvern",
      name: "Skyvern",
      description: "Visual AI automation for complex web workflows",
      icon: Bot,
      color: "bg-purple-500",
    },
    {
      type: "browser-use",
      name: "Browser-Use",
      description: "LLM-driven browser automation with DOM analysis",
      icon: Globe,
      color: "bg-blue-500",
    },
    {
      type: "crawl4ai",
      name: "Crawl4AI",
      description: "Advanced web crawling with AI-powered extraction",
      icon: Database,
      color: "bg-green-500",
    },
    {
      type: "playwright",
      name: "Playwright",
      description: "Modern browser automation with reliable testing",
      icon: Monitor,
      color: "bg-indigo-500",
    },
    {
      type: "selenium",
      name: "Selenium Grid",
      description: "Distributed browser automation at scale",
      icon: Activity,
      color: "bg-orange-500",
    },
    {
      type: "puppeteer",
      name: "Puppeteer",
      description: "Headless Chrome automation and scraping",
      icon: Zap,
      color: "bg-yellow-500",
    },
    {
      type: "computer-use",
      name: "Computer Use",
      description: "Claude/OpenAI computer control capabilities",
      icon: Monitor,
      color: "bg-pink-500",
    },
    {
      type: "mcp",
      name: "MCP Server",
      description: "Model Context Protocol server for custom integrations",
      icon: Settings,
      color: "bg-gray-500",
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "inactive":
        return <Pause className="h-4 w-4 text-gray-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "configuring":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: "bg-green-100 text-green-800",
      inactive: "bg-gray-100 text-gray-800",
      error: "bg-red-100 text-red-800",
      configuring: "bg-yellow-100 text-yellow-800",
    };
    
    return (
      <Badge variant="secondary" className={variants[status as keyof typeof variants]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleToggleAgent = (agent: AgentConnection) => {
    const action = agent.status === "active" ? "stop" : "start";
    toggleAgentMutation.mutate({ id: agent.id, action });
  };

  const handleConfigureAgent = (agent: AgentConnection) => {
    setSelectedAgent(agent);
    setShowConfigModal(true);
  };

  const handleCreateAgent = () => {
    setSelectedAgent(null);
    setShowCreateModal(true);
  };

  return (
    <div className="h-full bg-background">
      {/* Header */}
      <div className="mx-auto w-full max-w-6xl px-6 flex items-end justify-between pt-[72px] pb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Bot className="h-6 w-6" />
            Automation Agents
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure and manage AI automation agents with real backend connections
          </p>
        </div>
        <Button 
          onClick={handleCreateAgent}
          className="gap-2"
          data-testid="button-add-agent"
        >
          <Plus className="h-4 w-4" />
          Add Agent
        </Button>
      </div>

      {/* Agent Type Cards */}
      <div className="mx-auto w-full max-w-6xl px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {agentTypes.map((type) => {
          const safeAgents = Array.isArray(agents) ? agents : [];
          const activeAgents = safeAgents.filter(a => a.type === type.type && a.status === "active");
          const totalAgents = safeAgents.filter(a => a.type === type.type);
          
          return (
            <Card key={type.type} className="relative overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${type.color}`}>
                    <type.icon className="h-5 w-5 text-white" />
                  </div>
                  <Badge variant="outline">{totalAgents.length} configured</Badge>
                </div>
                <CardTitle className="text-lg">{type.name}</CardTitle>
                <CardDescription className="text-sm">
                  {type.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Active</span>
                  <span className="font-medium">{activeAgents.length}/{totalAgents.length}</span>
                </div>
                <Progress 
                  value={totalAgents.length > 0 ? (activeAgents.length / totalAgents.length) * 100 : 0} 
                  className="mt-2"
                />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Configured Agents */}
      <div className="mx-auto w-full max-w-6xl px-6">
      <Card>
        <CardHeader>
          <CardTitle>Configured Agents ({Array.isArray(agents) ? agents.length : 0})</CardTitle>
          <CardDescription>
            Manage your automation agent connections and monitor their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading agents...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">
              <AlertCircle className="h-12 w-12 mx-auto mb-3" />
              <p>Failed to load agents</p>
              <p className="text-sm text-muted-foreground">{error instanceof Error ? error.message : 'Unknown error'}</p>
            </div>
          ) : !Array.isArray(agents) || agents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No agents configured yet. Add your first agent to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {agents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onToggle={() => handleToggleAgent(agent)}
                  onConfigure={() => handleConfigureAgent(agent)}
                  onTest={() => testConnectionMutation.mutate(agent.id)}
                  onDelete={() => deleteAgentMutation.mutate(agent.id)}
                  isToggling={toggleAgentMutation.isPending}
                  isTesting={testConnectionMutation.isPending}
                  getStatusIcon={getStatusIcon}
                  getStatusBadge={getStatusBadge}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      {/* Configuration Modal */}
      <AgentConfigurationModal
        open={showConfigModal || showCreateModal}
        onOpenChange={(open) => {
          setShowConfigModal(open);
          setShowCreateModal(open);
          if (!open) setSelectedAgent(null);
        }}
        agent={selectedAgent}
        mode={showCreateModal ? "create" : "edit"}
      />
    </div>
  );
}

interface AgentCardProps {
  agent: AgentConnection;
  onToggle: () => void;
  onConfigure: () => void;
  onTest: () => void;
  onDelete: () => void;
  isToggling: boolean;
  isTesting: boolean;
  getStatusIcon: (status: string) => React.ReactNode;
  getStatusBadge: (status: string) => React.ReactNode;
}

function AgentCard({ 
  agent, 
  onToggle, 
  onConfigure, 
  onTest, 
  onDelete,
  isToggling,
  isTesting,
  getStatusIcon,
  getStatusBadge 
}: AgentCardProps) {
  const { status: liveStatus, metrics, isConnected } = useAgentConnection(agent.id);
  const displayStatus = liveStatus || agent.status;
  const [lastTestResult, setLastTestResult] = useState<{success: boolean; timestamp: string} | null>(null);

  const agentTypeMap = {
    skyvern: { name: "Skyvern", icon: Bot, color: "bg-purple-500" },
    "browser-use": { name: "Browser-Use", icon: Globe, color: "bg-blue-500" },
    crawl4ai: { name: "Crawl4AI", icon: Database, color: "bg-green-500" },
    mcp: { name: "MCP Server", icon: Monitor, color: "bg-orange-500" },
    "computer-use": { name: "Computer Use", icon: Monitor, color: "bg-pink-500" },
    playwright: { name: "Playwright", icon: Monitor, color: "bg-indigo-500" },
    puppeteer: { name: "Puppeteer", icon: Monitor, color: "bg-yellow-500" },
    selenium: { name: "Selenium", icon: Activity, color: "bg-orange-500" },
  } as const;
  const agentTypeInfo = agentTypeMap[agent.type as keyof typeof agentTypeMap] ?? { name: agent.type, icon: Monitor, color: "bg-gray-500" };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-lg ${agentTypeInfo?.color}`}>
              {agentTypeInfo?.icon && <agentTypeInfo.icon className="h-5 w-5 text-white" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium">{agent.name ?? "Agent"}</h3>
              {getStatusIcon(String(displayStatus))}
              {getStatusBadge(String(displayStatus))}
              {!isConnected && displayStatus === "active" && (
                <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700">
                  Connecting...
                </Badge>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {agentTypeInfo?.name} • {String(agent.endpointUrl ?? "")}
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
              <span>Tasks: {agent.tasksCompleted}</span>
              <span>Avg Time: {(agent.averageTime ?? 0).toFixed(1)}s</span>
              <span>Error Rate: {(((agent.errorRate ?? 0) * 100)).toFixed(1)}%</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onTest}
            disabled={isTesting}
            data-testid={`test-agent-${agent.id}`}
          >
            {isTesting ? (
              <>
                <Clock className="h-4 w-4 animate-spin mr-1" />
                Testing...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-1" />
                Test
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onConfigure}
            data-testid={`configure-agent-${agent.id}`}
          >
            <Settings className="h-4 w-4" />
            Configure
          </Button>
          <Button
            variant={displayStatus === "active" ? "destructive" : "default"}
            size="sm"
            onClick={onToggle}
            disabled={isToggling}
            data-testid={`toggle-agent-${agent.id}`}
          >
            {isToggling ? (
              <>
                <Clock className="h-4 w-4 animate-spin mr-1" />
                {displayStatus === "active" ? "Stopping..." : "Starting..."}
              </>
            ) : displayStatus === "active" ? (
              <>
                <Pause className="h-4 w-4 mr-1" />
                Stop
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-1" />
                Start
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* Live Metrics */}
      {metrics && (
        <div className="mt-3 pt-3 border-t">
          <AgentMetricsCard metrics={metrics} />
        </div>
      )}
    </Card>
  );
}