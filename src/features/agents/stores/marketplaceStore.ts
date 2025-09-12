import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware/persist';
import { 
  MarketplaceTemplate, 
  MarketplaceFilters, 
  MarketplaceSorting,
  AgentReview,
  AgentDiscussion,
  AgentCollection,
  MarketplaceStats,
  InstallationProgress
} from '../model/types';
import { enhancedMarketplaceApi } from '../api/enhanced-marketplace.api';

interface MarketplaceState {
  // Templates & Discovery
  templates: MarketplaceTemplate[];
  featuredTemplates: MarketplaceTemplate[];
  trendingTemplates: MarketplaceTemplate[];
  recommendedTemplates: MarketplaceTemplate[];
  totalTemplates: number;
  hasMoreTemplates: boolean;
  templatesLoading: boolean;
  templatesError: string | null;

  // Filters & Search
  filters: MarketplaceFilters;
  sorting: MarketplaceSorting;
  searchQuery: string;
  searchSuggestions: string[];
  searchHistory: string[];

  // View State
  viewMode: 'grid' | 'list';
  currentPage: number;
  pageSize: number;

  // Selected Template
  selectedTemplate: MarketplaceTemplate | null;
  templateReviews: Record<string, AgentReview[]>;
  templateDiscussions: Record<string, AgentDiscussion[]>;

  // User Collections
  userCollections: AgentCollection[];
  favoriteAgents: string[];

  // Installation State
  installationProgress: Record<string, InstallationProgress>;
  installingAgents: Set<string>;

  // Analytics & Stats
  marketplaceStats: MarketplaceStats | null;
  userPreferences: {
    categories: string[];
    tags: string[];
    runtime: 'local' | 'hosted' | 'all';
  };

  // Actions
  setTemplates: (templates: MarketplaceTemplate[], total: number, hasMore: boolean) => void;
  addTemplates: (templates: MarketplaceTemplate[]) => void;
  setFilters: (filters: Partial<MarketplaceFilters>) => void;
  setSorting: (sorting: MarketplaceSorting) => void;
  setSearchQuery: (query: string) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  setSelectedTemplate: (template: MarketplaceTemplate | null) => void;
  
  // Async Actions
  loadTemplates: (reset?: boolean) => Promise<void>;
  searchTemplates: (query: string) => Promise<void>;
  loadRecommendations: () => Promise<void>;
  loadTemplateDetails: (slug: string) => Promise<MarketplaceTemplate | null>;
  
  // Reviews & Discussions
  loadTemplateReviews: (templateId: string) => Promise<void>;
  loadTemplateDiscussions: (templateId: string) => Promise<void>;
  submitReview: (templateId: string, review: Omit<AgentReview, 'id' | 'createdAt'>) => Promise<void>;
  
  // Collections & Favorites
  toggleFavorite: (templateId: string) => void;
  addToCollection: (collectionId: string, templateId: string) => Promise<void>;
  createCollection: (collection: Omit<AgentCollection, 'id' | 'createdAt'>) => Promise<void>;
  
  // Installation
  installTemplate: (template: MarketplaceTemplate, config: Record<string, any>) => Promise<void>;
  bulkInstall: (installations: Array<{ templateId: string, config: Record<string, any> }>) => Promise<void>;
  
  // Analytics
  trackTemplateView: (templateId: string) => void;
  trackTemplateInstall: (templateId: string) => void;
  loadMarketplaceStats: () => Promise<void>;
  
  // Settings
  updateUserPreferences: (preferences: Partial<typeof this.userPreferences>) => void;
  clearCache: () => void;
}

export const useMarketplaceStore = create<MarketplaceState>()(
  subscribeWithSelector(
    immer(
      persist(
        (set, get) => ({
          // Initial State
          templates: [],
          featuredTemplates: [],
          trendingTemplates: [],
          recommendedTemplates: [],
          totalTemplates: 0,
          hasMoreTemplates: true,
          templatesLoading: false,
          templatesError: null,

          filters: {},
          sorting: { field: 'downloads', direction: 'desc' },
          searchQuery: '',
          searchSuggestions: [],
          searchHistory: [],

          viewMode: 'grid',
          currentPage: 1,
          pageSize: 24,

          selectedTemplate: null,
          templateReviews: {},
          templateDiscussions: {},

          userCollections: [],
          favoriteAgents: [],

          installationProgress: {},
          installingAgents: new Set(),

          marketplaceStats: null,
          userPreferences: {
            categories: [],
            tags: [],
            runtime: 'all'
          },

          // Basic Actions
          setTemplates: (templates, total, hasMore) => set((state) => {
            state.templates = templates;
            state.totalTemplates = total;
            state.hasMoreTemplates = hasMore;
            state.templatesLoading = false;
          }),

          addTemplates: (templates) => set((state) => {
            state.templates.push(...templates);
          }),

          setFilters: (newFilters) => set((state) => {
            state.filters = { ...state.filters, ...newFilters };
            state.currentPage = 1;
          }),

          setSorting: (sorting) => set((state) => {
            state.sorting = sorting;
            state.currentPage = 1;
          }),

          setSearchQuery: (query) => set((state) => {
            state.searchQuery = query;
            state.currentPage = 1;
            
            // Add to search history
            if (query && !state.searchHistory.includes(query)) {
              state.searchHistory.unshift(query);
              state.searchHistory = state.searchHistory.slice(0, 10); // Keep last 10 searches
            }
          }),

          setViewMode: (mode) => set((state) => {
            state.viewMode = mode;
          }),

          setSelectedTemplate: (template) => set((state) => {
            state.selectedTemplate = template;
          }),

          // Async Actions
          loadTemplates: async (reset = false) => {
            const state = get();
            
            if (state.templatesLoading) return;
            
            set((s) => {
              s.templatesLoading = true;
              s.templatesError = null;
              if (reset) {
                s.templates = [];
                s.currentPage = 1;
              }
            });

            try {
              const page = reset ? 1 : state.currentPage;
              const result = await enhancedMarketplaceApi.getCatalog(
                { ...state.filters, search: state.searchQuery },
                state.sorting,
                { page, limit: state.pageSize }
              );

              set((s) => {
                if (reset || page === 1) {
                  s.templates = result.templates;
                } else {
                  s.templates.push(...result.templates);
                }
                s.totalTemplates = result.total;
                s.hasMoreTemplates = result.hasMore;
                s.templatesLoading = false;
                s.currentPage = page;
              });
            } catch (error) {
              set((s) => {
                s.templatesLoading = false;
                s.templatesError = error.message;
              });
            }
          },

          searchTemplates: async (query) => {
            set((s) => {
              s.searchQuery = query;
              s.templatesLoading = true;
            });

            try {
              const result = await enhancedMarketplaceApi.searchAgents(query, {
                suggestions: true,
                autocomplete: true,
                typoTolerance: true
              });

              set((s) => {
                s.templates = result.results;
                s.searchSuggestions = result.suggestions || [];
                s.templatesLoading = false;
              });
            } catch (error) {
              set((s) => {
                s.templatesLoading = false;
                s.templatesError = error.message;
              });
            }
          },

          loadRecommendations: async () => {
            try {
              const state = get();
              const recommendations = await enhancedMarketplaceApi.getRecommendations(
                'current-user', // In real app, get from auth
                {
                  preferences: state.userPreferences.categories
                }
              );

              set((s) => {
                s.featuredTemplates = recommendations.featured;
                s.trendingTemplates = recommendations.trending;
                s.recommendedTemplates = recommendations.forYou || [];
              });
            } catch (error) {
              console.error('Failed to load recommendations:', error);
            }
          },

          loadTemplateDetails: async (slug) => {
            try {
              const template = await enhancedMarketplaceApi.getAgentDetails(slug);
              if (template) {
                get().trackTemplateView(template.id);
              }
              return template;
            } catch (error) {
              console.error('Failed to load template details:', error);
              return null;
            }
          },

          // Reviews & Discussions
          loadTemplateReviews: async (templateId) => {
            try {
              const result = await enhancedMarketplaceApi.getAgentReviews(templateId);
              set((s) => {
                s.templateReviews[templateId] = result.reviews;
              });
            } catch (error) {
              console.error('Failed to load reviews:', error);
            }
          },

          loadTemplateDiscussions: async (templateId) => {
            try {
              const result = await enhancedMarketplaceApi.getAgentDiscussions(templateId);
              set((s) => {
                s.templateDiscussions[templateId] = result.discussions;
              });
            } catch (error) {
              console.error('Failed to load discussions:', error);
            }
          },

          submitReview: async (templateId, review) => {
            try {
              const newReview = await enhancedMarketplaceApi.submitReview(templateId, review);
              set((s) => {
                if (!s.templateReviews[templateId]) {
                  s.templateReviews[templateId] = [];
                }
                s.templateReviews[templateId].unshift(newReview);
              });
            } catch (error) {
              console.error('Failed to submit review:', error);
              throw error;
            }
          },

          // Collections & Favorites
          toggleFavorite: (templateId) => set((state) => {
            if (state.favoriteAgents.includes(templateId)) {
              state.favoriteAgents = state.favoriteAgents.filter(id => id !== templateId);
            } else {
              state.favoriteAgents.push(templateId);
            }
          }),

          addToCollection: async (collectionId, templateId) => {
            try {
              await enhancedMarketplaceApi.addToCollection(collectionId, templateId);
              set((s) => {
                const collection = s.userCollections.find(c => c.id === collectionId);
                if (collection && !collection.agentIds.includes(templateId)) {
                  collection.agentIds.push(templateId);
                }
              });
            } catch (error) {
              console.error('Failed to add to collection:', error);
              throw error;
            }
          },

          createCollection: async (collection) => {
            try {
              const newCollection = await enhancedMarketplaceApi.createCollection(collection);
              set((s) => {
                s.userCollections.push(newCollection);
              });
            } catch (error) {
              console.error('Failed to create collection:', error);
              throw error;
            }
          },

          // Installation
          installTemplate: async (template, config) => {
            const templateId = template.id;
            
            set((s) => {
              s.installingAgents.add(templateId);
              s.installationProgress[templateId] = {
                step: 'initializing',
                progress: 0,
                message: 'Starting installation...',
                status: 'pending'
              };
            });

            try {
              await enhancedMarketplaceApi.installAgent(
                templateId,
                config,
                (progress) => {
                  set((s) => {
                    s.installationProgress[templateId] = progress;
                  });
                }
              );

              set((s) => {
                s.installingAgents.delete(templateId);
                s.installationProgress[templateId] = {
                  step: 'completed',
                  progress: 100,
                  message: 'Installation completed successfully',
                  status: 'completed'
                };
              });

              get().trackTemplateInstall(templateId);
            } catch (error) {
              set((s) => {
                s.installingAgents.delete(templateId);
                s.installationProgress[templateId] = {
                  step: 'failed',
                  progress: 0,
                  message: error.message,
                  status: 'failed'
                };
              });
              throw error;
            }
          },

          bulkInstall: async (installations) => {
            try {
              await enhancedMarketplaceApi.bulkInstall(
                installations,
                (templateId, progress) => {
                  set((s) => {
                    s.installationProgress[templateId] = progress;
                  });
                }
              );
            } catch (error) {
              console.error('Bulk installation failed:', error);
              throw error;
            }
          },

          // Analytics
          trackTemplateView: (templateId) => {
            // Track view analytics
            console.log('Tracking view for template:', templateId);
          },

          trackTemplateInstall: (templateId) => {
            // Track install analytics
            console.log('Tracking install for template:', templateId);
          },

          loadMarketplaceStats: async () => {
            try {
              const stats = await enhancedMarketplaceApi.getMarketplaceStats();
              set((s) => {
                s.marketplaceStats = stats;
              });
            } catch (error) {
              console.error('Failed to load marketplace stats:', error);
            }
          },

          // Settings
          updateUserPreferences: (preferences) => set((state) => {
            state.userPreferences = { ...state.userPreferences, ...preferences };
          }),

          clearCache: () => set((state) => {
            state.templates = [];
            state.templateReviews = {};
            state.templateDiscussions = {};
            state.templatesError = null;
            state.currentPage = 1;
          })
        }),
        {
          name: 'marketplace-store',
          partialize: (state) => ({
            // Persist user preferences and favorites
            favoriteAgents: state.favoriteAgents,
            userPreferences: state.userPreferences,
            searchHistory: state.searchHistory,
            viewMode: state.viewMode,
            sorting: state.sorting
          })
        }
      )
    )
  )
);

// Selectors for performance optimization
export const useTemplates = () => useMarketplaceStore(state => state.templates);
export const useTemplatesLoading = () => useMarketplaceStore(state => state.templatesLoading);
export const useFilters = () => useMarketplaceStore(state => state.filters);
export const useSorting = () => useMarketplaceStore(state => state.sorting);
export const useViewMode = () => useMarketplaceStore(state => state.viewMode);
export const useSelectedTemplate = () => useMarketplaceStore(state => state.selectedTemplate);
export const useFavoriteAgents = () => useMarketplaceStore(state => state.favoriteAgents);
export const useInstallationProgress = () => useMarketplaceStore(state => state.installationProgress);
export const useMarketplaceStats = () => useMarketplaceStore(state => state.marketplaceStats);

// Compound selectors
export const useFilteredTemplates = () => {
  return useMarketplaceStore(state => {
    let filtered = state.templates;
    
    // Apply client-side filters for better UX
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  });
};

export const useRecommendations = () => {
  return useMarketplaceStore(state => ({
    featured: state.featuredTemplates,
    trending: state.trendingTemplates,
    forYou: state.recommendedTemplates
  }));
};

export const useTemplateReviews = (templateId: string) => {
  return useMarketplaceStore(state => state.templateReviews[templateId] || []);
};

export const useTemplateDiscussions = (templateId: string) => {
  return useMarketplaceStore(state => state.templateDiscussions[templateId] || []);
};

// Actions
export const useMarketplaceActions = () => {
  const store = useMarketplaceStore();
  return {
    loadTemplates: store.loadTemplates,
    searchTemplates: store.searchTemplates,
    setFilters: store.setFilters,
    setSorting: store.setSorting,
    setViewMode: store.setViewMode,
    installTemplate: store.installTemplate,
    toggleFavorite: store.toggleFavorite,
    loadRecommendations: store.loadRecommendations,
    loadTemplateDetails: store.loadTemplateDetails,
    submitReview: store.submitReview,
    clearCache: store.clearCache
  };
};