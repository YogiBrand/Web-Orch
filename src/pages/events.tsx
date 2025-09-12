import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { UnifiedEventLog } from "@/components/unified-events";
import { Sidebar } from "@/components/sidebar";
import { Search, Activity, Zap, BarChart3, Filter, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskOption {
  id: string;
  name: string;
  status: "active" | "completed" | "paused" | "failed";
  event_count: number;
  last_activity: string;
}

// Mock tasks for demonstration - in real app, this would come from API
const mockTasks: TaskOption[] = [
  {
    id: "task-001",
    name: "Website Contact Forms - Batch 1",
    status: "active",
    event_count: 1247,
    last_activity: "2 minutes ago"
  },
  {
    id: "task-002", 
    name: "Lead Generation Campaign",
    status: "active",
    event_count: 892,
    last_activity: "5 minutes ago"
  },
  {
    id: "task-003",
    name: "Data Extraction - E-commerce Sites",
    status: "completed",
    event_count: 2341,
    last_activity: "1 hour ago"
  },
  {
    id: "task-004",
    name: "Form Submission Automation",
    status: "paused",
    event_count: 156,
    last_activity: "3 hours ago"
  }
];

const EventsPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const [selectedTaskId, setSelectedTaskId] = useState<string>(mockTasks[0]?.id || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"detailed" | "compact">("detailed");

  // Handle URL parameters for task selection
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const taskParam = urlParams.get('task');
    if (taskParam && mockTasks.find(task => task.id === taskParam)) {
      setSelectedTaskId(taskParam);
      // Clean up the URL
      window.history.replaceState({}, '', '/events');
    }
  }, []);

  const handleSectionChange = (section: string) => {
    if (section === "tasks") {
      setLocation("/tasks");
    } else if (section === "sessions") {
      setLocation("/sessions");
    } else if (section === "events") {
      return; // already here
    } else if (section === "data-portal") {
      setLocation("/data-portal");
    } else if (section === "agents" || section === "agents-dashboard") {
      setLocation("/agents");
    } else if (section === "agents-marketplace") {
      setLocation("/agents/marketplace");
    } else if (section === "agents-create") {
      setLocation("/agents/new");
    } else {
      setLocation(`/?section=${section}`);
    }
  };

  const selectedTask = mockTasks.find(task => task.id === selectedTaskId);
  const filteredTasks = mockTasks.filter(task =>
    task.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-green-600 bg-green-100 dark:bg-green-950";
      case "completed":
        return "text-blue-600 bg-blue-100 dark:bg-blue-950";
      case "paused":
        return "text-yellow-600 bg-yellow-100 dark:bg-yellow-950";
      case "failed":
        return "text-red-600 bg-red-100 dark:bg-red-950";
      default:
        return "text-gray-600 bg-gray-100 dark:bg-gray-950";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <Activity className="h-3 w-3" />;
      case "completed":
        return <BarChart3 className="h-3 w-3" />;
      case "paused":
        return <Settings className="h-3 w-3" />;
      case "failed":
        return <Zap className="h-3 w-3" />;
      default:
        return <Activity className="h-3 w-3" />;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar activeSection="events" onSectionChange={handleSectionChange} />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Task Selection Sidebar */}
        <div className="w-80 border-r bg-background flex flex-col">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold mb-3">Unified Events</h2>
            
            {/* Search Tasks */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Task List */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-2">
              {filteredTasks.map((task) => (
                <Card
                  key={task.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    selectedTaskId === task.id && "ring-2 ring-primary"
                  )}
                  onClick={() => setSelectedTaskId(task.id)}
                >
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <h3 className="font-medium text-sm leading-tight">
                          {task.name}
                        </h3>
                        <Badge
                          variant="secondary"
                          className={cn("text-xs", getStatusColor(task.status))}
                        >
                          {getStatusIcon(task.status)}
                          <span className="ml-1">{task.status}</span>
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{task.event_count.toLocaleString()} events</span>
                        <span>{task.last_activity}</span>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          task.status === "active" ? "bg-green-500 animate-pulse" :
                          task.status === "completed" ? "bg-blue-500" :
                          task.status === "paused" ? "bg-yellow-500" : "bg-red-500"
                        )} />
                        <span className="text-xs text-muted-foreground">
                          {task.id}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {filteredTasks.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No tasks found</p>
                </div>
              )}
            </div>
          </div>

          {/* View Options */}
          <div className="p-4 border-t">
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === "detailed" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("detailed")}
                className="flex-1"
              >
                Detailed
              </Button>
              <Button
                variant={viewMode === "compact" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("compact")}
                className="flex-1"
              >
                Compact
              </Button>
            </div>
          </div>
        </div>

        {/* Main Events View */}
        <div className="flex-1 overflow-hidden">
          {selectedTask ? (
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="p-6 border-b bg-background">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold">{selectedTask.name}</h1>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                      <span>Task ID: {selectedTask.id}</span>
                      <Separator orientation="vertical" className="h-4" />
                      <span>{selectedTask.event_count.toLocaleString()} total events</span>
                      <Separator orientation="vertical" className="h-4" />
                      <span>Last activity: {selectedTask.last_activity}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant="secondary"
                      className={cn("", getStatusColor(selectedTask.status))}
                    >
                      {getStatusIcon(selectedTask.status)}
                      <span className="ml-1 capitalize">{selectedTask.status}</span>
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Events Log */}
              <div className="flex-1 p-6 overflow-hidden">
                <UnifiedEventLog
                  taskId={selectedTaskId}
                  className="h-full"
                  showAnalytics={true}
                  showFilter={true}
                  compact={viewMode === "compact"}
                  autoScroll={true}
                  maxEvents={1000}
                />
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h2 className="text-xl font-semibold mb-2">Select a Task</h2>
                <p className="text-muted-foreground">
                  Choose a task from the sidebar to view its unified events
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventsPage;
