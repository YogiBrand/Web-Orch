import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Sidebar } from "@/components/sidebar";

import { Overview } from "@/components/overview";
import { BrowserUsePlayground } from "@/components/browser-use-playground";
import { SessionsPage } from "@/components/session-management/sessions-page";
import { AdvancedCrawler } from "@/components/advanced-crawler";
import { SessionsManager } from "@/components/sessions-manager";
import { AgentsManager } from "@/components/agents-manager";
import { PlaygroundDataExtraction } from "@/components/playground-data-extraction";
import { ProfilesManager } from "@/components/profiles-manager";
import { SettingsManager } from "@/components/settings-manager";
import { TaskOrchestrator } from "@/components/task-orchestrator";
import { EnhancedTaskOrchestrator } from "@/components/enhanced-task-orchestrator";
import { ComputerUsePlayground } from "@/components/computer-use-playground";
import { DataPortal } from "@/pages/data-portal";
import LibreChatFull from "@/components/librechat-full";
import NexusReal from "@/components/nexus-real";
import FormSubmission from "@/components/form-submission-real";
import FormSubmissionTest from "@/components/form-submission-test";




export default function Dashboard() {
  const [activeSection, setActiveSection] = useState("overview");
  const [, setLocation] = useLocation();

  // Handle URL parameters for section navigation
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sectionParam = urlParams.get('section');
    if (sectionParam) {
      console.log("Setting section from URL parameter:", sectionParam);
      if (sectionParam === 'workflows') {
        setLocation('/workflows');
      } else {
        setActiveSection(sectionParam);
        // Clean up the URL
        window.history.replaceState({}, '', '/');
      }
    }
  }, []);

  const handleSectionChange = (section: string) => {
    console.log("Dashboard handleSectionChange called with:", section);
    if (section === "tasks") {
      setLocation("/tasks");
    } else if (section === "sessions") {
      setLocation("/sessions");
    } else if (section === "events") {
      setLocation("/events");
    } else if (section === "agents" || section === "agents-dashboard") {
      setLocation("/agents");
    } else if (section === "agents-marketplace") {
      setLocation("/agents/marketplace");
    } else if (section === "agents-create") {
      setLocation("/agents/new");
    } else if (section === "workflows") {
      setLocation("/workflows");
    } else if (section === "dev-workspace") {
      setLocation("/dev-workspace");
    } else if (section === "data-portal" || section === "crm") {
      setLocation("/data-portal");
    } else if (section === "settings") {
      setLocation("/settings");
    } else {
      console.log("Setting active section to:", section);
      setActiveSection(section);
    }
  };



  const renderMainContent = () => {
    console.log("renderMainContent called with activeSection:", activeSection);
    console.log("Timestamp:", Date.now());
    // Each section is completely independent - no tabs
    switch (activeSection) {
      case "overview":
        console.log("Rendering Overview component");
        return <Overview />;
      case "playground":
        console.log("Rendering BrowserUsePlayground component");
        return (
          <div className="h-full bg-white">
            <BrowserUsePlayground />
          </div>
        );
      case "computer-use":
        console.log("Rendering ComputerUsePlayground component");
        return (
          <div className="h-full bg-white">
            <ComputerUsePlayground />
          </div>
        );
      case "sessions":
        console.log("Rendering SessionsPage component");
        return (
          <div className="h-full bg-white">
            <SessionsPage />
          </div>
        );
      case "agents":
        console.log("Rendering AgentsManager component");
        return (
          <div className="h-full bg-white">
            <AgentsManager />
          </div>
        );
      case "data-extraction":
        console.log("Rendering PlaygroundDataExtraction component");
        return (
          <div className="h-full bg-white">
            <PlaygroundDataExtraction />
          </div>
        );
      case "tasks":
        console.log("Rendering EnhancedTaskOrchestrator component");
        return (
          <div className="h-full bg-white">
            <EnhancedTaskOrchestrator />
          </div>
        );
      case "orchestrator":
        console.log("Rendering EnhancedTaskOrchestrator component");
        return (
          <div className="h-full bg-white">
            <EnhancedTaskOrchestrator />
          </div>
        );
      case "profiles":
        console.log("Rendering ProfilesManager component");
        return (
          <div className="h-full bg-white">
            <ProfilesManager />
          </div>
        );
      case "settings":
        console.log("Rendering SettingsManager component");
        return (
          <div className="h-full bg-white">
            <SettingsManager />
          </div>
        );
      case "crm":
        console.log("Rendering DataPortal component");
        return (
          <div className="h-full bg-white">
            <DataPortal />
          </div>
        );
      case "chat":
        console.log("Rendering LibreChatFull component");
        return <LibreChatFull />;
      case "form-submission":
        console.log("Rendering FormSubmission component");
        return (
          <div className="h-full bg-white">
            <FormSubmission />
          </div>
        );
      case "nexus":
        console.log("Rendering NexusReal component");
        return <NexusReal />;
      default:
        console.log("Rendering default/unknown section:", activeSection);
        return (
          <div className="h-full bg-white p-6">
            <h1 className="text-2xl font-semibold text-gray-900 mb-4">Page Not Found</h1>
            <p className="text-gray-600">The requested section "{activeSection}" could not be found.</p>
            <div className="mt-8 p-4 border rounded-lg bg-red-50">
              <h3 className="font-medium text-red-900 mb-2">Debug Info</h3>
              <p className="text-sm text-red-600">Active section: {activeSection}</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar 
        activeSection={activeSection} 
        onSectionChange={handleSectionChange} 
      />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-auto" key={activeSection}>
          {renderMainContent()}
        </div>
      </div>
    </div>
  );
}
