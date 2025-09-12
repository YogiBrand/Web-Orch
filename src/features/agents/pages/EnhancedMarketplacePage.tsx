import React, { useEffect, useState, useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { 
  Search, 
  TrendingUp, 
  Star, 
  Zap,
  Filter,
  Grid,
  List,
  Plus,
  Bookmark,
  BarChart3,
  Settings,
  Bell
} from 'lucide-react';
import { EnhancedMarketplaceGrid } from '../components/EnhancedMarketplaceGrid';
import { EnhancedAgentDetailView } from '../components/EnhancedAgentDetailView';
import { EnhancedAgentCard } from '../components/EnhancedAgentCard';
import { 
  useMarketplaceStore, 
  useMarketplaceActions,
  useTemplates,
  useTemplatesLoading,
  useFilters,
  useSorting,
  useViewMode,
  useSelectedTemplate,
  useRecommendations,
  useMarketplaceStats,
  useFavoriteAgents
} from '../stores/marketplaceStore';
import { MarketplaceTemplate } from '../model/types';

export function EnhancedMarketplacePage() {
  const [showInstallWizard, setShowInstallWizard] = useState(false);
  const [selectedTemplateForInstall, setSelectedTemplateForInstall] = useState<MarketplaceTemplate | null>(null);
  const [showUserCollections, setShowUserCollections] = useState(false);
  const [showStats, setShowStats] = useState(false);

  // Store state
  const templates = useTemplates();
  const loading = useTemplatesLoading();
  const filters = useFilters();
  const sorting = useSorting();
  const viewMode = useViewMode();
  const selectedTemplate = useSelectedTemplate();
  const recommendations = useRecommendations();
  const stats = useMarketplaceStats();
  const favoriteAgents = useFavoriteAgents();

  // Actions
  const actions = useMarketplaceActions();

  // Load initial data
  useEffect(() => {
    actions.loadTemplates(true);
    actions.loadRecommendations();
    if (!stats) {
      actions.loadMarketplaceStats();
    }
  }, []);

  // Reload when filters or sorting change
  useEffect(() => {
    actions.loadTemplates(true);
  }, [filters, sorting]);

  const handleTemplateSelect = useCallback((template: MarketplaceTemplate) => {
    useMarketplaceStore.setState({ selectedTemplate: template });
  }, []);

  const handleTemplateInstall = useCallback((template: MarketplaceTemplate) => {
    setSelectedTemplateForInstall(template);
    setShowInstallWizard(true);
  }, []);

  const handleCloseDetailView = useCallback(() => {
    useMarketplaceStore.setState({ selectedTemplate: null });
  }, []);

  const handleInstallFromDetail = useCallback(() => {
    if (selectedTemplate) {
      handleTemplateInstall(selectedTemplate);
    }
  }, [selectedTemplate, handleTemplateInstall]);

  const loadMoreTemplates = useCallback(() => {
    const state = useMarketplaceStore.getState();
    if (state.hasMoreTemplates && !state.templatesLoading) {
      // Increment page and load more
      useMarketplaceStore.setState(s => ({ currentPage: s.currentPage + 1 }));
      actions.loadTemplates(false);
    }
  }, [actions]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Agent Marketplace
              </h1>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                {stats && (
                  <>
                    <span>{stats.totalAgents.toLocaleString()} agents</span>
                    <span>•</span>
                    <span>{stats.totalPublishers.toLocaleString()} publishers</span>
                    <span>•</span>
                    <span>{stats.totalDownloads.toLocaleString()} downloads</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Stats Toggle */}
              <button
                onClick={() => setShowStats(!showStats)}
                className={`p-2 rounded-lg transition-colors ${
                  showStats
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-400 hover:text-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <BarChart3 className="h-5 w-5" />
              </button>

              {/* Collections Toggle */}
              <button
                onClick={() => setShowUserCollections(!showUserCollections)}
                className={`p-2 rounded-lg transition-colors ${
                  showUserCollections
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-400 hover:text-purple-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Bookmark className="h-5 w-5" />
              </button>

              {/* Notifications */}
              <button className="p-2 rounded-lg text-gray-400 hover:text-yellow-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <Bell className="h-5 w-5" />
              </button>

              {/* Settings */}
              <button className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <Settings className="h-5 w-5" />
              </button>

              {/* Publisher Actions */}
              <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Publish Agent
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats Bar (collapsible) */}
        {showStats && stats && (
          <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-50 dark:bg-blue-900/20">
                  <Star className="h-6 w-6 text-blue-500" />
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.topRated.length}
                  </div>
                  <div className="text-gray-500 dark:text-gray-400">Top Rated</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-50 dark:bg-green-900/20">
                  <TrendingUp className="h-6 w-6 text-green-500" />
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.trending.length}
                  </div>
                  <div className="text-gray-500 dark:text-gray-400">Trending</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-purple-50 dark:bg-purple-900/20">
                  <Zap className="h-6 w-6 text-purple-500" />
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {favoriteAgents.length}
                  </div>
                  <div className="text-gray-500 dark:text-gray-400">Favorites</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-50 dark:bg-yellow-900/20">
                  <Bookmark className="h-6 w-6 text-yellow-500" />
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    3
                  </div>
                  <div className="text-gray-500 dark:text-gray-400">Collections</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recommendations Section (when no search/filters) */}
        {!filters.search && !filters.category && Object.keys(filters).length === 0 && (
          <div className="mb-12 space-y-8">
            {/* Featured Agents */}
            {recommendations.featured.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    Featured Agents
                  </h2>
                  <button className="text-blue-500 hover:text-blue-600 text-sm font-medium">
                    View all
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {recommendations.featured.slice(0, 4).map(template => (
                    <EnhancedAgentCard
                      key={template.id}
                      template={template}
                      onSelect={() => handleTemplateSelect(template)}
                      onInstall={() => handleTemplateInstall(template)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Trending Agents */}
            {recommendations.trending.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    Trending This Week
                  </h2>
                  <button className="text-blue-500 hover:text-blue-600 text-sm font-medium">
                    View all
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {recommendations.trending.slice(0, 4).map(template => (
                    <EnhancedAgentCard
                      key={template.id}
                      template={template}
                      onSelect={() => handleTemplateSelect(template)}
                      onInstall={() => handleTemplateInstall(template)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* For You Section */}
            {recommendations.forYou.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Zap className="h-5 w-5 text-purple-500" />
                    Recommended for You
                  </h2>
                  <button className="text-blue-500 hover:text-blue-600 text-sm font-medium">
                    View all
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {recommendations.forYou.slice(0, 4).map(template => (
                    <EnhancedAgentCard
                      key={template.id}
                      template={template}
                      onSelect={() => handleTemplateSelect(template)}
                      onInstall={() => handleTemplateInstall(template)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* All Agents Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {filters.search || filters.category ? 'Search Results' : 'All Agents'}
            </h2>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {templates.length} {templates.length === 1 ? 'agent' : 'agents'}
            </div>
          </div>

          <EnhancedMarketplaceGrid
            templates={templates}
            loading={loading}
            filters={filters}
            sorting={sorting}
            viewMode={viewMode}
            onFiltersChange={actions.setFilters}
            onSortingChange={actions.setSorting}
            onViewModeChange={actions.setViewMode}
            onTemplateSelect={handleTemplateSelect}
            onTemplateInstall={handleTemplateInstall}
          />

          {/* Load More Button */}
          {useMarketplaceStore.getState().hasMoreTemplates && !loading && (
            <div className="text-center mt-8">
              <button
                onClick={loadMoreTemplates}
                className="px-6 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Load More Agents
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Agent Detail Modal */}
      {selectedTemplate && (
        <EnhancedAgentDetailView
          template={selectedTemplate}
          onClose={handleCloseDetailView}
          onInstall={handleInstallFromDetail}
        />
      )}

      {/* Installation Wizard Modal */}
      {showInstallWizard && selectedTemplateForInstall && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Install {selectedTemplateForInstall.name}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Configure the installation settings for this agent.
              </p>
              
              {/* Installation form would go here */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Runtime
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                    <option value="local">Local</option>
                    <option value="hosted">Hosted</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Port (optional)
                  </label>
                  <input
                    type="number"
                    placeholder={selectedTemplateForInstall.ports?.default?.toString()}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowInstallWizard(false);
                    setSelectedTemplateForInstall(null);
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (selectedTemplateForInstall) {
                      try {
                        await actions.installTemplate(selectedTemplateForInstall, {
                          runtime: 'local',
                          port: selectedTemplateForInstall.ports?.default
                        });
                        setShowInstallWizard(false);
                        setSelectedTemplateForInstall(null);
                      } catch (error) {
                        console.error('Installation failed:', error);
                      }
                    }
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Install
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Collections Sidebar */}
      {showUserCollections && (
        <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 z-40 overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Collections
              </h2>
              <button
                onClick={() => setShowUserCollections(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ×
              </button>
            </div>

            {/* Collections list would go here */}
            <div className="space-y-4">
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                  My Favorites
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {favoriteAgents.length} agents
                </p>
              </div>

              <button className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-blue-300 dark:hover:border-blue-600 hover:text-blue-500 transition-colors">
                <Plus className="h-5 w-5 mx-auto mb-2" />
                Create Collection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backdrop for sidebar */}
      {showUserCollections && (
        <div
          className="fixed inset-0 bg-black bg-opacity-25 z-30"
          onClick={() => setShowUserCollections(false)}
        />
      )}
    </div>
  );
}