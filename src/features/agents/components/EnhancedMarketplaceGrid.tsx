import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  SortAsc, 
  SortDesc, 
  Grid, 
  List, 
  Star, 
  Download, 
  Shield, 
  TrendingUp,
  Eye,
  Heart,
  Share2,
  ChevronDown,
  X
} from 'lucide-react';
import { MarketplaceTemplate, MarketplaceFilters, MarketplaceSorting } from '../model/types';
import { EnhancedAgentCard } from './EnhancedAgentCard';

interface EnhancedMarketplaceGridProps {
  templates: MarketplaceTemplate[];
  loading?: boolean;
  filters: MarketplaceFilters;
  sorting: MarketplaceSorting;
  viewMode: 'grid' | 'list';
  onFiltersChange: (filters: MarketplaceFilters) => void;
  onSortingChange: (sorting: MarketplaceSorting) => void;
  onViewModeChange: (mode: 'grid' | 'list') => void;
  onTemplateSelect: (template: MarketplaceTemplate) => void;
  onTemplateInstall: (template: MarketplaceTemplate) => void;
}

export function EnhancedMarketplaceGrid({
  templates,
  loading = false,
  filters,
  sorting,
  viewMode,
  onFiltersChange,
  onSortingChange,
  onViewModeChange,
  onTemplateSelect,
  onTemplateInstall
}: EnhancedMarketplaceGridProps) {
  const [searchQuery, setSearchQuery] = useState(filters.search || '');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>(filters.tags || []);

  // Extract all available tags from templates
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    templates.forEach(template => {
      template.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [templates]);

  // Extract categories
  const availableCategories = useMemo(() => {
    const categorySet = new Set<string>();
    templates.forEach(template => categorySet.add(template.category));
    return Array.from(categorySet).sort();
  }, [templates]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onFiltersChange({ ...filters, search: value });
  };

  const handleCategoryChange = (category: string) => {
    onFiltersChange({ 
      ...filters, 
      category: category === 'all' ? undefined : category 
    });
  };

  const handleTagToggle = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    
    setSelectedTags(newTags);
    onFiltersChange({ ...filters, tags: newTags });
  };

  const handlePricingChange = (pricing: 'free' | 'paid' | 'all') => {
    onFiltersChange({ 
      ...filters, 
      pricing: pricing === 'all' ? undefined : pricing 
    });
  };

  const handleSortChange = (field: MarketplaceSorting['field']) => {
    const newDirection = sorting.field === field && sorting.direction === 'desc' ? 'asc' : 'desc';
    onSortingChange({ field, direction: newDirection });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
    onFiltersChange({});
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.category) count++;
    if (filters.search) count++;
    if (filters.tags?.length) count += filters.tags.length;
    if (filters.pricing && filters.pricing !== 'all') count++;
    if (filters.verified !== undefined) count++;
    if (filters.runtime && filters.runtime !== 'all') count++;
    return count;
  }, [filters]);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Search bar skeleton */}
        <div className="animate-pulse">
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        </div>
        
        {/* Filters skeleton */}
        <div className="animate-pulse flex gap-4">
          <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-10 w-28 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>

        {/* Grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search agents, tools, and integrations..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
        />
        {searchQuery && (
          <button
            onClick={() => handleSearchChange('')}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Filters and Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Category Filter */}
          <select
            value={filters.category || 'all'}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            {availableCategories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>

          {/* Pricing Filter */}
          <select
            value={filters.pricing || 'all'}
            onChange={(e) => handlePricingChange(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Pricing</option>
            <option value="free">Free</option>
            <option value="paid">Paid</option>
          </select>

          {/* Verified Filter */}
          <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.verified === true}
              onChange={(e) => onFiltersChange({ 
                ...filters, 
                verified: e.target.checked ? true : undefined 
              })}
              className="text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <Shield className="h-4 w-4 text-green-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Verified Only</span>
          </label>

          {/* Advanced Filters Toggle */}
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Filter className="h-4 w-4" />
            <span className="text-sm">More Filters</span>
            {activeFiltersCount > 0 && (
              <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                {activeFiltersCount}
              </span>
            )}
            <ChevronDown className={`h-4 w-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
          </button>

          {/* Clear Filters */}
          {activeFiltersCount > 0 && (
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline"
            >
              Clear all filters
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Sort Controls */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Sort by:</span>
            {(['downloads', 'rating', 'updated', 'name'] as const).map(field => (
              <button
                key={field}
                onClick={() => handleSortChange(field)}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition-colors ${
                  sorting.field === field
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {field === 'downloads' && <Download className="h-3 w-3" />}
                {field === 'rating' && <Star className="h-3 w-3" />}
                {field === 'updated' && <TrendingUp className="h-3 w-3" />}
                <span className="capitalize">{field}</span>
                {sorting.field === field && (
                  sorting.direction === 'desc' ? <SortDesc className="h-3 w-3" /> : <SortAsc className="h-3 w-3" />
                )}
              </button>
            ))}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-2 ${
                viewMode === 'grid'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              } transition-colors`}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={`p-2 ${
                viewMode === 'list'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              } transition-colors`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showAdvancedFilters && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 space-y-4 border border-gray-200 dark:border-gray-700">
          {/* Tags Filter */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {availableTags.slice(0, 20).map(tag => (
                <button
                  key={tag}
                  onClick={() => handleTagToggle(tag)}
                  className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-300'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Runtime Filter */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Runtime</h3>
            <div className="flex gap-4">
              {['all', 'local', 'hosted'].map(runtime => (
                <label key={runtime} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="runtime"
                    value={runtime}
                    checked={filters.runtime === runtime || (runtime === 'all' && !filters.runtime)}
                    onChange={(e) => onFiltersChange({ 
                      ...filters, 
                      runtime: e.target.value === 'all' ? undefined : e.target.value as any
                    })}
                    className="text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{runtime}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Rating Filter */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Minimum Rating</h3>
            <div className="flex gap-4">
              {[0, 3, 4, 4.5].map(rating => (
                <label key={rating} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="rating"
                    value={rating}
                    checked={filters.rating === rating || (rating === 0 && !filters.rating)}
                    onChange={(e) => onFiltersChange({ 
                      ...filters, 
                      rating: Number(e.target.value) || undefined 
                    })}
                    className="text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {rating === 0 ? 'Any' : `${rating}+`}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-gray-600 dark:text-gray-400">
          {templates.length} agent{templates.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Templates Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {templates.map(template => (
            <EnhancedAgentCard
              key={template.id}
              template={template}
              onSelect={() => onTemplateSelect(template)}
              onInstall={() => onTemplateInstall(template)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map(template => (
            <EnhancedAgentCard
              key={template.id}
              template={template}
              onSelect={() => onTemplateSelect(template)}
              onInstall={() => onTemplateInstall(template)}
              listView
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {templates.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <Search className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No agents found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Try adjusting your search criteria or browse different categories
          </p>
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}