import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useEffect, useState } from "react";
import { CommandPalette } from "@/components/command-palette";
import { TooltipProvider } from "@/components/ui/tooltip";


import Dashboard from "@/pages/dashboard";
import { Tasks } from "@/pages/tasks";
import { DataPortal } from "@/pages/data-portal";
import { Agents } from "@/pages/agents";
import Sessions from "@/pages/sessions";
import EventsPage from "@/pages/events";
import WebSocketTest from "@/pages/websocket-test";
import NotFound from "@/pages/not-found";
import WorkflowsHome from "@/pages/workflows/index";
import WorkflowsEditor from "@/pages/workflows/editor";
import NexusWorkspace from "@/pages/nexus";
import DevelopmentWorkspace from "@/pages/dev-workspace";
import { Settings } from "@/pages/settings";
import AgentsDashboard from "@/pages/agents-marketplace/dashboard";
import AgentsMarketplace from "@/pages/agents-marketplace/marketplace";
import AgentsCreate from "@/pages/agents-marketplace/create";
import AgentDetailView from "@/pages/agents-marketplace/detail";

// Agent Marketplace Pages
import AgentsDashboardPage from "@/pages/agents/dashboard";
import AgentsMarketplacePage from "@/pages/agents/marketplace";
import AgentCreatePage from "@/pages/agents/create";
import AgentDetailPage from "@/pages/agents/detail";
import AnalyticsDashboard from './pages/analytics-dashboard';

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/tasks" component={Tasks} />
      <Route path="/nexus" component={NexusWorkspace} />
      <Route path="/dev-workspace" component={DevelopmentWorkspace} />
      <Route path="/sessions" component={Sessions} />
      <Route path="/events" component={EventsPage} />
      <Route path="/websocket-test" component={WebSocketTest} />
      <Route path="/data-portal" component={DataPortal} />
      <Route path="/agents" component={AgentsDashboard} />
      <Route path="/agents/marketplace" component={AgentsMarketplace} />
      <Route path="/agents/new" component={AgentsCreate} />
      <Route path="/agents/new/:template" component={AgentsCreate} />
      <Route path="/agents/:id" component={AgentDetailView} />
      <Route path="/agent-studio" component={Agents} />
      <Route path="/agents/dashboard" component={AgentsDashboardPage} />
      <Route path="/agents/marketplace" component={AgentsMarketplacePage} />
      <Route path="/agents/create" component={AgentCreatePage} />
      <Route path="/agents/:id" component={AgentDetailPage} />
      <Route path="/settings" component={Settings} />
      <Route path="/workflows" component={WorkflowsHome} />
      <Route path="/workflows/new" component={WorkflowsEditor} />
      <Route path="/workflows/:id" component={WorkflowsEditor} />
      <Route path="/analytics" component={AnalyticsDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [theme, setTheme] = useState<string>(() => localStorage.getItem("theme") || "light");
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CommandPalette />
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
