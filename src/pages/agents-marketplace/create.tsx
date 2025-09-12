import { Sidebar } from '@/components/sidebar';
import { useLocation } from 'wouter';
import { AgentCreatePage } from '@/features/agents/pages/AgentCreatePage';

export default function AgentsCreate() {
  const [, setLocation] = useLocation();
  const handleSectionChange = (section: string) => {
    if (section === 'tasks') setLocation('/tasks');
    else if (section === 'sessions') setLocation('/sessions');
    else if (section === 'events') setLocation('/events');
    else if (section === 'data-portal') setLocation('/data-portal');
    else if (section === 'agents-dashboard') setLocation('/agents');
    else if (section === 'agents-marketplace') setLocation('/agents/marketplace');
    else if (section === 'agents-create') setLocation('/agents/new');
    else setLocation(`/?section=${section}`);
  };
  return (
    <div className="flex h-screen bg-background">
      <Sidebar activeSection="agents" onSectionChange={handleSectionChange} />
      <div className="flex-1 overflow-auto"><AgentCreatePage /></div>
    </div>
  );
}

