import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { UnifiedEvent, AgentIcon, ActionTypeConfig, StatusConfig } from "./types";
import { 
  ChevronDown, 
  ChevronRight, 
  Bot, 
  Globe, 
  Mouse, 
  Keyboard, 
  Navigation,
  Scroll,
  Clock,
  Eye,
  FileDown,
  Send,
  AlertCircle,
  CheckCircle2,
  Activity,
  Loader2,
  Copy,
  ExternalLink,
  Code2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface EventItemProps {
  event: UnifiedEvent;
  className?: string;
  showMetadata?: boolean;
  compact?: boolean;
}

// Agent type configurations
const agentConfigs: Record<string, AgentIcon> = {
  skyvern: {
    icon: Bot,
    color: "text-purple-600",
    bgColor: "bg-purple-100 dark:bg-purple-950"
  },
  playwright: {
    icon: Globe,
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-950"
  },
  "browser-use": {
    icon: Mouse,
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-950"
  },
  selenium: {
    icon: Bot,
    color: "text-orange-600",
    bgColor: "bg-orange-100 dark:bg-orange-950"
  },
  puppeteer: {
    icon: Bot,
    color: "text-red-600",
    bgColor: "bg-red-100 dark:bg-red-950"
  }
};

// Action type configurations
const actionConfigs: Record<string, ActionTypeConfig> = {
  click: { icon: Mouse, color: "text-blue-600", label: "Click" },
  type: { icon: Keyboard, color: "text-green-600", label: "Type" },
  navigate: { icon: Navigation, color: "text-purple-600", label: "Navigate" },
  scroll: { icon: Scroll, color: "text-orange-600", label: "Scroll" },
  wait: { icon: Clock, color: "text-yellow-600", label: "Wait" },
  extract: { icon: Eye, color: "text-indigo-600", label: "Extract" },
  submit: { icon: Send, color: "text-emerald-600", label: "Submit" },
  error: { icon: AlertCircle, color: "text-red-600", label: "Error" },
  success: { icon: CheckCircle2, color: "text-green-600", label: "Success" }
};

// Status configurations
const statusConfigs: Record<string, StatusConfig> = {
  pending: {
    icon: Clock,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100 dark:bg-yellow-950",
    label: "Pending"
  },
  processing: {
    icon: Loader2,
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-950",
    label: "Processing"
  },
  completed: {
    icon: CheckCircle2,
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-950",
    label: "Completed"
  },
  failed: {
    icon: AlertCircle,
    color: "text-red-600",
    bgColor: "bg-red-100 dark:bg-red-950",
    label: "Failed"
  }
};

export const EventItem: React.FC<EventItemProps> = ({
  event,
  className,
  showMetadata = true,
  compact = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const agentConfig = agentConfigs[event.agent_type] || agentConfigs.skyvern;
  const actionConfig = actionConfigs[event.action_type] || actionConfigs.click;
  const statusConfig = statusConfigs[event.status] || statusConfigs.pending;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatTimestamp = (timestamp: string) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  const AgentIconComponent = agentConfig.icon;
  const ActionIconComponent = actionConfig.icon;
  const StatusIconComponent = statusConfig.icon;

  const renderMetadataItem = (key: string, value: any) => {
    if (!value) return null;
    
    const stringValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
    
    return (
      <div key={key} className="grid grid-cols-3 gap-2 text-sm">
        <span className="font-medium text-muted-foreground capitalize">
          {key.replace(/_/g, ' ')}:
        </span>
        <span className="col-span-2 font-mono text-xs bg-muted p-1 rounded break-all">
          {stringValue}
        </span>
      </div>
    );
  };

  if (compact) {
    return (
      <div className={cn(
        "flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors",
        className
      )}>
        {/* Agent Icon */}
        <div className={cn("p-1.5 rounded-full", agentConfig.bgColor)}>
          <AgentIconComponent className={cn("h-3 w-3", agentConfig.color)} />
        </div>

        {/* Event Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <ActionIconComponent className={cn("h-3 w-3", actionConfig.color)} />
            <span className="text-sm font-medium truncate">
              {event.ai_title || actionConfig.label}
            </span>
          </div>
          {event.ai_description && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {event.ai_description}
            </p>
          )}
        </div>

        {/* Status */}
        <Badge variant="outline" className={cn("text-xs", statusConfig.color)}>
          {statusConfig.label}
        </Badge>

        {/* Time */}
        <span className="text-xs text-muted-foreground">
          {formatTimestamp(event.timestamp)}
        </span>
      </div>
    );
  }

  return (
    <Card className={cn("transition-all duration-200", className)}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <div className="cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-start space-x-4">
                {/* Agent Icon */}
                <div className={cn("p-2 rounded-full flex-shrink-0", agentConfig.bgColor)}>
                  <AgentIconComponent className={cn("h-4 w-4", agentConfig.color)} />
                </div>

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <ActionIconComponent className={cn("h-4 w-4", actionConfig.color)} />
                    <h4 className="font-semibold text-base">
                      {event.ai_title || actionConfig.label}
                    </h4>
                    <Badge variant="outline" className="text-xs">
                      {event.agent_type}
                    </Badge>
                    {event.confidence_score && (
                      <Badge variant="secondary" className="text-xs">
                        {Math.round(event.confidence_score * 100)}% confidence
                      </Badge>
                    )}
                  </div>
                  
                  {event.ai_description && (
                    <p className="text-muted-foreground text-sm mb-2">
                      {event.ai_description}
                    </p>
                  )}

                  <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                    <span>{formatTimestamp(event.timestamp)}</span>
                    {event.metadata.duration && (
                      <span>{event.metadata.duration}ms</span>
                    )}
                    {event.metadata.url && (
                      <span className="flex items-center space-x-1">
                        <ExternalLink className="h-3 w-3" />
                        <span className="truncate max-w-32">
                          {new URL(event.metadata.url).hostname}
                        </span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Status and Expand */}
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <div className={cn("p-1.5 rounded-full", statusConfig.bgColor)}>
                    <StatusIconComponent 
                      className={cn(
                        "h-3 w-3", 
                        statusConfig.color,
                        event.status === "processing" && "animate-spin"
                      )} 
                    />
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardContent>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <Separator />
          <CardContent className="p-4 pt-4">
            <div className="space-y-4">
              {/* Metadata Section */}
              {showMetadata && Object.keys(event.metadata).length > 0 && (
                <div>
                  <h5 className="font-medium mb-2 flex items-center">
                    <FileDown className="h-4 w-4 mr-2" />
                    Metadata
                  </h5>
                  <div className="space-y-2 bg-muted/30 p-3 rounded-lg">
                    {Object.entries(event.metadata).map(([key, value]) => 
                      renderMetadataItem(key, value)
                    )}
                  </div>
                </div>
              )}

              {/* Raw Log Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium flex items-center">
                    <Code2 className="h-4 w-4 mr-2" />
                    Raw Log Data
                  </h5>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(event.raw_log)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <div className="bg-muted/30 p-3 rounded-lg">
                  <pre className="text-xs overflow-x-auto whitespace-pre-wrap font-mono">
                    {event.raw_log}
                  </pre>
                </div>
              </div>

              {/* Screenshot if available */}
              {event.metadata.screenshot && (
                <div>
                  <h5 className="font-medium mb-2 flex items-center">
                    <Eye className="h-4 w-4 mr-2" />
                    Screenshot
                  </h5>
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <img
                      src={event.metadata.screenshot}
                      alt="Event screenshot"
                      className="max-w-full h-auto rounded border"
                    />
                  </div>
                </div>
              )}

              {/* Error Details if failed */}
              {event.status === "failed" && event.metadata.error_message && (
                <div>
                  <h5 className="font-medium mb-2 flex items-center text-red-600">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Error Details
                  </h5>
                  <div className="bg-red-50 dark:bg-red-950/30 p-3 rounded-lg border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-800 dark:text-red-200">
                      {event.metadata.error_message}
                    </p>
                  </div>
                </div>
              )}

              {/* Additional Actions */}
              <div className="flex items-center space-x-2 pt-2 border-t">
                <Button variant="outline" size="sm">
                  View in Context
                </Button>
                {event.metadata.url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={event.metadata.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 mr-2" />
                      Open URL
                    </a>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(JSON.stringify(event, null, 2))}
                >
                  <Copy className="h-3 w-3 mr-2" />
                  Copy Event
                </Button>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};