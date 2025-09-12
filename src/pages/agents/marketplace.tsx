import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Bot, Search, Star, Download, Play, Filter, Grid, List } from 'lucide-react';
import { Sidebar } from '@/components/sidebar';
import { useLocation } from 'wouter';

const AgentsMarketplacePage = () => {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const handleSectionChange = (section: string) => {
    if (section === 'agents-marketplace') {
      return; // already here
    } else if (section === 'agents-dashboard') {
      setLocation('/agents/dashboard');
    } else if (section === 'agents-create') {
      setLocation('/agents/create');
    } else if (section === 'tasks') {
      setLocation('/tasks');
    } else if (section === 'sessions') {
      setLocation('/sessions');
    } else {
      setLocation(`/?section=${section}`);
    }
  };

  const agents = [
    {
      id: '1',
      name: 'Web Scraper Pro',
      description: 'Advanced web scraping agent with intelligent data extraction capabilities',
      category: 'Data Processing',
      rating: 4.8,
      downloads: 1250,
      price: 'Free',
      tags: ['scraping', 'data', 'automation'],
      author: 'WebOrchestrator Team',
      version: '2.1.0'
    },
    {
      id: '2',
      name: 'Form Filler Bot',
      description: 'Intelligent form filling agent that handles complex web forms automatically',
      category: 'Automation',
      rating: 4.6,
      downloads: 890,
      price: 'Free',
      tags: ['forms', 'automation', 'data-entry'],
      author: 'Automation Labs',
      version: '1.8.2'
    },
    {
      id: '3',
      name: 'Content Analyzer',
      description: 'AI-powered content analysis and summarization agent',
      category: 'AI/ML',
      rating: 4.9,
      downloads: 2100,
      price: 'Premium',
      tags: ['ai', 'content', 'analysis'],
      author: 'AI Solutions Inc',
      version: '3.0.1'
    },
    {
      id: '4',
      name: 'Email Processor',
      description: 'Automated email processing and response generation',
      category: 'Communication',
      rating: 4.4,
      downloads: 567,
      price: 'Free',
      tags: ['email', 'automation', 'communication'],
      author: 'CommTech',
      version: '1.5.0'
    },
    {
      id: '5',
      name: 'Data Validator',
      description: 'Comprehensive data validation and quality assurance agent',
      category: 'Data Processing',
      rating: 4.7,
      downloads: 1340,
      price: 'Free',
      tags: ['validation', 'data-quality', 'testing'],
      author: 'DataGuard',
      version: '2.2.1'
    },
    {
      id: '6',
      name: 'Social Media Monitor',
      description: 'Real-time social media monitoring and analysis agent',
      category: 'Analytics',
      rating: 4.5,
      downloads: 789,
      price: 'Premium',
      tags: ['social-media', 'monitoring', 'analytics'],
      author: 'SocialAI',
      version: '1.9.0'
    }
  ];

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="flex h-screen bg-background">
      <Sidebar activeSection="agents-marketplace" onSectionChange={handleSectionChange} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 border-b">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-foreground">Agent Marketplace</h1>
            <p className="text-muted-foreground mt-2">Discover and install pre-built AI agents</p>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search agents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                </Button>
              </div>
            </div>

            {/* Agent Grid/List */}
            <div className={`grid gap-6 ${
              viewMode === 'grid'
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                : 'grid-cols-1'
            }`}>
              {filteredAgents.map((agent) => (
                <Card key={agent.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                          <Bot className="w-6 h-6 text-primary-foreground" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{agent.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">by {agent.author}</p>
                        </div>
                      </div>
                      <Badge variant={agent.price === 'Free' ? 'secondary' : 'default'}>
                        {agent.price}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {agent.description}
                    </p>

                    <div className="flex flex-wrap gap-1 mb-4">
                      {agent.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span>{agent.rating}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Download className="w-4 h-4" />
                          <span>{agent.downloads}</span>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">v{agent.version}</span>
                    </div>

                    <div className="flex gap-2">
                      <Button className="flex-1" size="sm">
                        <Play className="w-4 h-4 mr-2" />
                        Install
                      </Button>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredAgents.length === 0 && (
              <div className="text-center py-12">
                <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No agents found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search terms or browse different categories.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentsMarketplacePage;

