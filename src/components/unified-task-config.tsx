import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  Eye, 
  Globe, 
  Zap, 
  Monitor, 
  Activity,
  Settings2,
  Layers
} from "lucide-react";

interface LLMModel {
  id: string;
  name: string;
  provider: string;
  hasVision: boolean;
  description: string;
}

interface Agent {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  icon: React.ComponentType<any>;
  color: string;
  status: 'available' | 'unavailable' | 'limited';
}

interface UnifiedTaskConfigProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  selectedAgent: string;
  onAgentChange: (agent: string) => void;
  parallelSessions: number;
  onParallelSessionsChange: (sessions: number) => void;
  advancedSettings?: {
    viewport?: { width: number; height: number };
    onViewportChange?: (viewport: { width: number; height: number }) => void;
    headless?: boolean;
    onHeadlessChange?: (headless: boolean) => void;
    timeout?: number;
    onTimeoutChange?: (timeout: number) => void;
  };
}

const defaultModels: LLMModel[] = [
  { id: "openai/gpt-4o", name: "GPT-4o", provider: "OpenAI", hasVision: true, description: "Most capable OpenAI model" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI", hasVision: true, description: "Fast and cost-effective" },
  { id: "anthropic/claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", provider: "Anthropic", hasVision: true, description: "Excellent reasoning and vision" },
  { id: "anthropic/claude-3-haiku-20240307", name: "Claude 3 Haiku", provider: "Anthropic", hasVision: true, description: "Fast and efficient" },
  { id: "google/gemini-pro-vision", name: "Gemini Pro Vision", provider: "Google", hasVision: true, description: "Google's multimodal model" },
];

const availableAgents: Agent[] = [
  {
    id: "computer-use",
    name: "Computer Use",
    description: "Anthropic-style computer use with screenshot analysis and action planning",
    capabilities: ["Screenshot Analysis", "Click Actions", "Form Filling", "Navigation", "Content Extraction"],
    icon: Monitor,
    color: "bg-blue-500",
    status: "available"
  },
  {
    id: "skyvern",
    name: "Skyvern",
    description: "Visual AI automation for complex workflows and form interactions",
    capabilities: ["Visual Element Detection", "Complex Forms", "Multi-step Workflows", "Error Recovery"],
    icon: Eye,
    color: "bg-purple-500",
    status: "limited"
  },
  {
    id: "browser-use",
    name: "Browser-Use",
    description: "LLM-driven browser automation with DOM analysis and intelligent planning",
    capabilities: ["DOM Analysis", "Step Planning", "Real-time Adaptation", "Action Sequences"],
    icon: Brain,
    color: "bg-green-500",
    status: "available"
  },
  {
    id: "crawl4ai",
    name: "Crawl4AI",
    description: "Advanced web crawling and content extraction with AI-powered analysis",
    capabilities: ["Content Extraction", "Batch Processing", "Smart Filtering", "Screenshot Capture"],
    icon: Globe,
    color: "bg-orange-500",
    status: "available"
  },
  {
    id: "mcp",
    name: "Model Context Protocol",
    description: "Standardized protocol for multi-modal content processing",
    capabilities: ["Protocol Standards", "Multi-Modal", "Content Processing", "Integration"],
    icon: Zap,
    color: "bg-indigo-500",
    status: "available"
  },
  {
    id: "hybrid",
    name: "Intelligent Orchestrator",
    description: "Automatically selects and combines the best agents for each task",
    capabilities: ["Auto Agent Selection", "Multi-Agent Coordination", "Fallback Strategies", "Performance Optimization"],
    icon: Layers,
    color: "bg-gradient-to-r from-purple-500 to-blue-500",
    status: "available"
  }
];

export function UnifiedTaskConfig({
  selectedModel,
  onModelChange,
  selectedAgent,
  onAgentChange,
  parallelSessions,
  onParallelSessionsChange,
  advancedSettings
}: UnifiedTaskConfigProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { data: availableModels = defaultModels } = useQuery<LLMModel[]>({
    queryKey: ["/api/models"],
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const selectedAgentInfo = availableAgents.find(agent => agent.id === selectedAgent);
  const selectedModelInfo = availableModels.find(model => model.id === selectedModel);

  return (
    <div className="space-y-6">
      {/* Model Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="w-5 h-5 text-blue-500" />
            LLM Model Selection
          </CardTitle>
          <CardDescription>
            Choose the language model that will power the automation reasoning
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="model-select">Model</Label>
            <Select value={selectedModel} onValueChange={onModelChange}>
              <SelectTrigger data-testid="select-model">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{model.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {model.provider}
                      </Badge>
                      {model.hasVision && (
                        <Badge variant="outline" className="text-xs">
                          Vision
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedModelInfo && (
              <p className="text-sm text-muted-foreground mt-1">
                {selectedModelInfo.description}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Agent Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5 text-green-500" />
            Automation Agent
          </CardTitle>
          <CardDescription>
            Select the automation system that will execute the task
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availableAgents.map((agent) => {
              const IconComponent = agent.icon;
              const isSelected = selectedAgent === agent.id;
              const isAvailable = agent.status === 'available';
              
              return (
                <div
                  key={agent.id}
                  className={`relative p-4 border rounded-lg cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : isAvailable
                      ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                      : 'border-gray-100 bg-gray-50 dark:bg-gray-900 opacity-60 cursor-not-allowed'
                  }`}
                  onClick={() => isAvailable && onAgentChange(agent.id)}
                  data-testid={`agent-${agent.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${agent.color} text-white`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-sm">{agent.name}</h3>
                        <Badge 
                          variant={agent.status === 'available' ? 'default' : agent.status === 'limited' ? 'secondary' : 'destructive'}
                          className="text-xs"
                        >
                          {agent.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {agent.description}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {agent.capabilities.slice(0, 3).map((capability) => (
                          <Badge key={capability} variant="outline" className="text-xs">
                            {capability}
                          </Badge>
                        ))}
                        {agent.capabilities.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{agent.capabilities.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {selectedAgentInfo && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Selected Agent Capabilities</h4>
              <div className="flex flex-wrap gap-1">
                {selectedAgentInfo.capabilities.map((capability) => (
                  <Badge key={capability} variant="secondary" className="text-xs">
                    {capability}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Basic Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings2 className="w-5 h-5 text-gray-500" />
            Task Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="parallel-sessions">Parallel Sessions</Label>
            <Input
              id="parallel-sessions"
              type="number"
              min="1"
              max="10"
              value={parallelSessions}
              onChange={(e) => onParallelSessionsChange(parseInt(e.target.value) || 1)}
              className="w-24"
              data-testid="input-parallel-sessions"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Number of parallel browser sessions to run
            </p>
          </div>

          {advancedSettings && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={showAdvanced}
                  onCheckedChange={setShowAdvanced}
                  data-testid="switch-advanced"
                />
                <Label>Advanced Settings</Label>
              </div>

              {showAdvanced && (
                <div className="space-y-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                  {advancedSettings.viewport && advancedSettings.onViewportChange && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Viewport Width</Label>
                        <Input
                          type="number"
                          value={advancedSettings.viewport.width}
                          onChange={(e) => advancedSettings.onViewportChange!({
                            ...advancedSettings.viewport!,
                            width: parseInt(e.target.value) || 1280
                          })}
                          data-testid="input-viewport-width"
                        />
                      </div>
                      <div>
                        <Label>Viewport Height</Label>
                        <Input
                          type="number"
                          value={advancedSettings.viewport.height}
                          onChange={(e) => advancedSettings.onViewportChange!({
                            ...advancedSettings.viewport!,
                            height: parseInt(e.target.value) || 720
                          })}
                          data-testid="input-viewport-height"
                        />
                      </div>
                    </div>
                  )}

                  {advancedSettings.headless !== undefined && advancedSettings.onHeadlessChange && (
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={advancedSettings.headless}
                        onCheckedChange={advancedSettings.onHeadlessChange}
                        data-testid="switch-headless"
                      />
                      <Label>Headless Mode</Label>
                      <p className="text-sm text-muted-foreground">
                        Run browser without visible interface
                      </p>
                    </div>
                  )}

                  {advancedSettings.timeout !== undefined && advancedSettings.onTimeoutChange && (
                    <div>
                      <Label>Timeout (seconds)</Label>
                      <Input
                        type="number"
                        value={advancedSettings.timeout / 1000}
                        onChange={(e) => advancedSettings.onTimeoutChange!((parseInt(e.target.value) || 30) * 1000)}
                        data-testid="input-timeout"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}