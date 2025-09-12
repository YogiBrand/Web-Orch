import { useState } from 'react';
import AgentsCatalog from './agents/catalog';
import AgentsInstalled from './agents/installed';
import AgentsConnections from './agents/connections';
import AgentsTools from './agents/tools';
import AgentsActivity from './agents/activity';

type TabKey = 'catalog' | 'installed' | 'connections' | 'tools' | 'activity';

export default function AgentsTabs() {
  const [tab, setTab] = useState<TabKey>('installed');

  const TabButton = ({ k, label }: { k: TabKey; label: string }) => (
    <button
      onClick={() => setTab(k)}
      className={`px-3 py-2 text-sm rounded-md border ${tab === k ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 pt-[72px] pb-4 bg-background border-b">
        <div className="max-w-6xl mx-auto flex items-center gap-2">
          <TabButton k="installed" label="Installed" />
          <TabButton k="catalog" label="Catalog" />
          <TabButton k="connections" label="Connections" />
          <TabButton k="tools" label="Tools" />
          <TabButton k="activity" label="Activity" />
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {tab === 'installed' && <AgentsInstalled />}
        {tab === 'catalog' && <AgentsCatalog />}
        {tab === 'connections' && <AgentsConnections />}
        {tab === 'tools' && <AgentsTools />}
        {tab === 'activity' && <AgentsActivity />}
      </div>
    </div>
  );
}

