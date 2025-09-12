import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter } from 'lucide-react';
import { marketplaceApi } from '@/features/agents/api/marketplace.api';
import { MarketplaceGrid } from '@/features/agents/components/MarketplaceGrid';
import { TemplateDetailDrawer } from '@/features/agents/components/TemplateDetailDrawer';
import type { MarketplaceTemplate } from '@/features/agents/model/types';
import { useLocation } from 'wouter';

export function AgentsMarketplacePage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<MarketplaceTemplate | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { data: templates = [], isLoading } = useQuery({ queryKey: ['marketplace-catalog'], queryFn: () => marketplaceApi.getCatalog({}) });

  const getCategoryFilter = (category: string, templateCategory: string) => {
    switch (category) {
      case 'mcp-servers': return templateCategory === 'MCP Server';
      case 'ide-clients': return templateCategory === 'IDE Client';
      case 'clients': return templateCategory === 'API Client';
      case 'agents': return templateCategory === 'AI Agent' || templateCategory === 'AI Assistant' || templateCategory === 'AI Automation';
      case 'automation': return templateCategory === 'Automation' || templateCategory === 'AI Automation' || templateCategory === 'Web Automation';
      case 'testing': return templateCategory === 'Test Automation' || templateCategory === 'Testing Tool';
      case 'all':
      default: return true;
    }
  };

  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.tags.some(tag => tag.toLowerCase().includes(q));
      const matchesCategory = getCategoryFilter(selectedCategory, t.category);
      return matchesSearch && matchesCategory;
    });
  }, [templates, searchQuery, selectedCategory]);

  const handleTemplateSelect = (template: MarketplaceTemplate) => { setSelectedTemplate(template); setIsDrawerOpen(true); };
  const handleConnect = (template: MarketplaceTemplate) => { setIsDrawerOpen(false); setLocation(`/agents/new/${template.slug}`); };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{[...Array(6)].map((_, i) => (<div key={i} className="h-64 bg-gray-200 rounded" />))}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Agent Marketplace</h1>
        <p className="text-muted-foreground mt-1">Discover and connect powerful AI agents to your workflow</p>
      </div>
      <div className="border-b">
        <nav className="flex space-x-8">
          {[
            { id: 'all', label: 'All Items', count: templates.length },
            { id: 'mcp-servers', label: 'MCP Servers', count: templates.filter(t => t.category === 'MCP Server').length },
            { id: 'ide-clients', label: 'IDE Clients', count: templates.filter(t => t.category === 'IDE Client').length },
            { id: 'clients', label: 'API Clients', count: templates.filter(t => t.category === 'API Client').length },
            { id: 'agents', label: 'AI Agents', count: templates.filter(t => t.category === 'AI Agent' || t.category === 'AI Assistant').length },
            { id: 'automation', label: 'Automation', count: templates.filter(t => t.category === 'Automation').length },
            { id: 'testing', label: 'Testing Tools', count: templates.filter(t => t.category === 'Test Automation' || t.category === 'Testing Tool').length }
          ].map((tab) => (
            <button key={tab.id} onClick={() => setSelectedCategory(tab.id)} className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${selectedCategory === tab.id ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>{tab.label} ({tab.count})</button>
          ))}
        </nav>
      </div>
      <div className="flex flex-col sm:flex-row gap-4 mt-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Search across all categories..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="px-3 py-2 border rounded-lg bg-background">
            <option value="all">All Categories</option>
            <option value="mcp-servers">MCP Servers</option>
            <option value="ide-clients">IDE Clients</option>
            <option value="clients">API Clients</option>
            <option value="agents">AI Agents</option>
            <option value="automation">Automation Tools</option>
            <option value="testing">Testing Tools</option>
          </select>
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-6">
          <p className="text-muted-foreground">{filteredTemplates.length} agent{filteredTemplates.length !== 1 ? 's' : ''} found</p>
        </div>
        <MarketplaceGrid templates={filteredTemplates} onTemplateSelect={handleTemplateSelect} />
      </div>
      <TemplateDetailDrawer template={selectedTemplate} isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} onConnect={handleConnect} />
    </div>
  );
}

