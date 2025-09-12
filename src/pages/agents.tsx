import { Sidebar } from "@/components/sidebar";
import { useLocation } from "wouter";
import AgentsTabs from "@/components/agents-tabs";

export function Agents() {
  const [, setLocation] = useLocation();

  const handleSectionChange = (section: string) => {
    if (section === "tasks") {
      setLocation("/tasks");
    } else if (section === "sessions") {
      setLocation("/sessions");
    } else if (section === "events") {
      setLocation("/events");
    } else if (section === "data-portal") {
      setLocation("/data-portal");
    } else if (section === "agents") {
      return; // already here
    } else {
      setLocation(`/?section=${section}`);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar activeSection="agents" onSectionChange={handleSectionChange} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AgentsTabs />
      </div>
    </div>
  );
}

export default Agents;
