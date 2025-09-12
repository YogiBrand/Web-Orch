/**
 * Comprehensive Backend API Endpoints for Enhanced Marketplace
 * This outlines the complete backend API structure needed to support
 * the enhanced marketplace functionality
 */

export interface MarketplaceBackendEndpoints {
  // ===== CORE MARKETPLACE ENDPOINTS =====

  /**
   * GET /api/marketplace/catalog
   * Advanced marketplace catalog with filtering, sorting, and pagination
   * Query Parameters:
   * - category: string
   * - search: string
   * - tags: comma-separated string
   * - minRating: number
   * - pricing: 'free' | 'paid' | 'all'
   * - verified: boolean
   * - runtime: 'local' | 'hosted' | 'all'
   * - os: string
   * - language: string
   * - sortBy: 'name' | 'rating' | 'downloads' | 'updated' | 'created' | 'trending'
   * - sortOrder: 'asc' | 'desc'
   * - page: number
   * - limit: number
   */
  getCatalog: {
    method: 'GET';
    path: '/api/marketplace/catalog';
    response: {
      templates: MarketplaceTemplate[];
      total: number;
      hasMore: boolean;
      facets: {
        categories: Array<{ value: string; count: number }>;
        tags: Array<{ value: string; count: number }>;
        providers: Array<{ value: string; count: number }>;
        pricing: Array<{ value: string; count: number }>;
      };
    };
  };

  /**
   * GET /api/marketplace/agents/:slug
   * Get detailed agent information
   */
  getAgentDetails: {
    method: 'GET';
    path: '/api/marketplace/agents/:slug';
    response: MarketplaceTemplate | null;
  };

  /**
   * GET /api/marketplace/search
   * Advanced search with autocomplete, suggestions, and faceted search
   * Query Parameters:
   * - q: string (search query)
   * - suggestions: boolean
   * - autocomplete: boolean
   * - typoTolerance: boolean
   * - facets: boolean
   */
  search: {
    method: 'GET';
    path: '/api/marketplace/search';
    response: {
      results: MarketplaceTemplate[];
      suggestions?: string[];
      autocomplete?: string[];
      facets?: Record<string, Array<{ value: string; count: number }>>;
      queryTime: number;
      totalResults: number;
    };
  };

  /**
   * POST /api/marketplace/recommendations
   * Get personalized recommendations
   */
  getRecommendations: {
    method: 'POST';
    path: '/api/marketplace/recommendations';
    body: {
      userId?: string;
      currentAgents?: string[];
      recentViews?: string[];
      preferences?: string[];
    };
    response: {
      featured: MarketplaceTemplate[];
      trending: MarketplaceTemplate[];
      similar: MarketplaceTemplate[];
      forYou?: MarketplaceTemplate[];
      explanation?: {
        featured: string;
        trending: string;
        forYou?: string;
      };
    };
  };

  // ===== COMMUNITY FEATURES =====

  /**
   * GET /api/marketplace/agents/:agentId/reviews
   * Get agent reviews with pagination and filtering
   */
  getAgentReviews: {
    method: 'GET';
    path: '/api/marketplace/agents/:agentId/reviews';
    response: {
      reviews: AgentReview[];
      total: number;
      averageRating: number;
      ratingDistribution: Record<string, number>; // "5": 120, "4": 45, etc.
    };
  };

  /**
   * POST /api/marketplace/agents/:agentId/reviews
   * Submit new review
   */
  submitReview: {
    method: 'POST';
    path: '/api/marketplace/agents/:agentId/reviews';
    body: Omit<AgentReview, 'id' | 'createdAt'>;
    response: AgentReview;
  };

  /**
   * PUT /api/marketplace/reviews/:reviewId
   * Update existing review
   */
  updateReview: {
    method: 'PUT';
    path: '/api/marketplace/reviews/:reviewId';
    body: Partial<Omit<AgentReview, 'id' | 'createdAt' | 'userId'>>;
    response: AgentReview;
  };

  /**
   * POST /api/marketplace/reviews/:reviewId/helpful
   * Mark review as helpful
   */
  markReviewHelpful: {
    method: 'POST';
    path: '/api/marketplace/reviews/:reviewId/helpful';
    response: { helpful: number };
  };

  /**
   * GET /api/marketplace/agents/:agentId/discussions
   * Get agent discussions/Q&A
   */
  getAgentDiscussions: {
    method: 'GET';
    path: '/api/marketplace/agents/:agentId/discussions';
    response: {
      discussions: AgentDiscussion[];
      total: number;
    };
  };

  /**
   * POST /api/marketplace/agents/:agentId/discussions
   * Create new discussion
   */
  createDiscussion: {
    method: 'POST';
    path: '/api/marketplace/agents/:agentId/discussions';
    body: Omit<AgentDiscussion, 'id' | 'createdAt' | 'replies'>;
    response: AgentDiscussion;
  };

  /**
   * POST /api/marketplace/discussions/:discussionId/replies
   * Reply to discussion
   */
  replyToDiscussion: {
    method: 'POST';
    path: '/api/marketplace/discussions/:discussionId/replies';
    body: Omit<AgentDiscussionReply, 'id' | 'createdAt'>;
    response: AgentDiscussionReply;
  };

  // ===== USER COLLECTIONS =====

  /**
   * GET /api/marketplace/users/:userId/collections
   * Get user's collections
   */
  getUserCollections: {
    method: 'GET';
    path: '/api/marketplace/users/:userId/collections';
    response: AgentCollection[];
  };

  /**
   * POST /api/marketplace/collections
   * Create new collection
   */
  createCollection: {
    method: 'POST';
    path: '/api/marketplace/collections';
    body: Omit<AgentCollection, 'id' | 'createdAt'>;
    response: AgentCollection;
  };

  /**
   * PUT /api/marketplace/collections/:collectionId
   * Update collection
   */
  updateCollection: {
    method: 'PUT';
    path: '/api/marketplace/collections/:collectionId';
    body: Partial<Omit<AgentCollection, 'id' | 'createdAt' | 'userId'>>;
    response: AgentCollection;
  };

  /**
   * POST /api/marketplace/collections/:collectionId/agents
   * Add agent to collection
   */
  addToCollection: {
    method: 'POST';
    path: '/api/marketplace/collections/:collectionId/agents';
    body: { agentId: string };
    response: { success: boolean };
  };

  /**
   * DELETE /api/marketplace/collections/:collectionId/agents/:agentId
   * Remove agent from collection
   */
  removeFromCollection: {
    method: 'DELETE';
    path: '/api/marketplace/collections/:collectionId/agents/:agentId';
    response: { success: boolean };
  };

  // ===== INSTALLATION & MANAGEMENT =====

  /**
   * POST /api/marketplace/agents/:agentId/install
   * Install agent with real-time progress
   */
  installAgent: {
    method: 'POST';
    path: '/api/marketplace/agents/:agentId/install';
    body: {
      config: Record<string, any>;
      userId?: string;
      installationId?: string;
    };
    response: {
      success: boolean;
      installationId: string;
      progressUrl?: string; // WebSocket URL for real-time progress
      estimatedTime?: number; // seconds
      error?: string;
    };
  };

  /**
   * GET /api/marketplace/installations/:installationId/status
   * Get installation status
   */
  getInstallationStatus: {
    method: 'GET';
    path: '/api/marketplace/installations/:installationId/status';
    response: InstallationProgress;
  };

  /**
   * POST /api/marketplace/bulk-install
   * Bulk install multiple agents
   */
  bulkInstall: {
    method: 'POST';
    path: '/api/marketplace/bulk-install';
    body: {
      installations: Array<{
        agentId: string;
        config: Record<string, any>;
      }>;
      userId?: string;
    };
    response: Array<{
      agentId: string;
      installationId: string;
      success: boolean;
      error?: string;
    }>;
  };

  /**
   * POST /api/marketplace/agents/:agentId/uninstall
   * Uninstall agent
   */
  uninstallAgent: {
    method: 'POST';
    path: '/api/marketplace/agents/:agentId/uninstall';
    body: {
      instanceId: string;
      cleanupData?: boolean;
    };
    response: {
      success: boolean;
      message: string;
    };
  };

  // ===== ANALYTICS & STATS =====

  /**
   * GET /api/marketplace/stats
   * Get marketplace statistics
   */
  getMarketplaceStats: {
    method: 'GET';
    path: '/api/marketplace/stats';
    response: MarketplaceStats;
  };

  /**
   * GET /api/marketplace/agents/:agentId/analytics
   * Get agent analytics (for publishers)
   */
  getAgentAnalytics: {
    method: 'GET';
    path: '/api/marketplace/agents/:agentId/analytics';
    params: {
      timeRange: '7d' | '30d' | '90d' | '1y';
    };
    response: AgentAnalytics;
  };

  /**
   * POST /api/marketplace/analytics/track
   * Track user interactions
   */
  trackInteraction: {
    method: 'POST';
    path: '/api/marketplace/analytics/track';
    body: {
      agentId: string;
      action: 'view' | 'install' | 'uninstall' | 'favorite' | 'review' | 'share';
      userId?: string;
      metadata?: Record<string, any>;
    };
    response: { success: boolean };
  };

  // ===== PUBLISHER FEATURES =====

  /**
   * GET /api/marketplace/publishers/:publisherId
   * Get publisher profile
   */
  getPublisherProfile: {
    method: 'GET';
    path: '/api/marketplace/publishers/:publisherId';
    response: PublisherProfile;
  };

  /**
   * PUT /api/marketplace/publishers/:publisherId
   * Update publisher profile
   */
  updatePublisherProfile: {
    method: 'PUT';
    path: '/api/marketplace/publishers/:publisherId';
    body: Partial<Omit<PublisherProfile, 'id' | 'createdAt' | 'verified'>>;
    response: PublisherProfile;
  };

  /**
   * GET /api/marketplace/publishers/:publisherId/agents
   * Get publisher's agents
   */
  getPublisherAgents: {
    method: 'GET';
    path: '/api/marketplace/publishers/:publisherId/agents';
    response: MarketplaceTemplate[];
  };

  /**
   * POST /api/marketplace/submissions
   * Submit new agent for review
   */
  submitAgent: {
    method: 'POST';
    path: '/api/marketplace/submissions';
    body: Omit<MarketplaceTemplate, 'id' | 'created_at' | 'downloads' | 'rating' | 'reviews'>;
    response: {
      success: boolean;
      submissionId: string;
      estimatedReviewTime: string;
      requirements?: string[];
    };
  };

  /**
   * GET /api/marketplace/submissions/:submissionId
   * Get submission status
   */
  getSubmissionStatus: {
    method: 'GET';
    path: '/api/marketplace/submissions/:submissionId';
    response: {
      id: string;
      status: 'pending' | 'reviewing' | 'approved' | 'rejected' | 'published';
      feedback?: string;
      reviewNotes?: string[];
      submittedAt: string;
      reviewedAt?: string;
      publishedAt?: string;
    };
  };

  /**
   * PUT /api/marketplace/agents/:agentId
   * Update existing agent (for publishers)
   */
  updateAgent: {
    method: 'PUT';
    path: '/api/marketplace/agents/:agentId';
    body: Partial<MarketplaceTemplate>;
    response: MarketplaceTemplate;
  };

  // ===== ADMIN & MODERATION =====

  /**
   * GET /api/marketplace/admin/submissions
   * Get all submissions for review (admin only)
   */
  getSubmissions: {
    method: 'GET';
    path: '/api/marketplace/admin/submissions';
    params: {
      status?: string;
      page?: number;
      limit?: number;
    };
    response: {
      submissions: Array<{
        id: string;
        agentData: MarketplaceTemplate;
        status: string;
        submittedAt: string;
        publisherInfo: PublisherProfile;
      }>;
      total: number;
    };
  };

  /**
   * POST /api/marketplace/admin/submissions/:submissionId/review
   * Review submission (admin only)
   */
  reviewSubmission: {
    method: 'POST';
    path: '/api/marketplace/admin/submissions/:submissionId/review';
    body: {
      action: 'approve' | 'reject' | 'request_changes';
      feedback?: string;
      reviewNotes?: string[];
    };
    response: { success: boolean };
  };

  /**
   * POST /api/marketplace/admin/agents/:agentId/verify
   * Verify agent (admin only)
   */
  verifyAgent: {
    method: 'POST';
    path: '/api/marketplace/admin/agents/:agentId/verify';
    body: {
      verified: boolean;
      verificationNotes?: string;
    };
    response: { success: boolean };
  };

  /**
   * GET /api/marketplace/admin/analytics
   * Get admin analytics
   */
  getAdminAnalytics: {
    method: 'GET';
    path: '/api/marketplace/admin/analytics';
    response: {
      totalUsers: number;
      totalPublishers: number;
      totalAgents: number;
      totalDownloads: number;
      totalReviews: number;
      averageRating: number;
      topCategories: Array<{ category: string; count: number }>;
      recentActivity: Array<{
        type: 'agent_published' | 'agent_installed' | 'review_submitted';
        timestamp: string;
        details: Record<string, any>;
      }>;
    };
  };

  // ===== SECURITY & COMPLIANCE =====

  /**
   * POST /api/marketplace/agents/:agentId/scan
   * Security scan agent
   */
  scanAgent: {
    method: 'POST';
    path: '/api/marketplace/agents/:agentId/scan';
    response: {
      scanId: string;
      status: 'scanning' | 'completed' | 'failed';
      vulnerabilities?: Array<{
        severity: 'low' | 'medium' | 'high' | 'critical';
        type: string;
        description: string;
        recommendation: string;
      }>;
      securityScore: number;
    };
  };

  /**
   * GET /api/marketplace/agents/:agentId/security
   * Get agent security information
   */
  getAgentSecurity: {
    method: 'GET';
    path: '/api/marketplace/agents/:agentId/security';
    response: {
      verified: boolean;
      lastScan: string;
      vulnerabilities: number;
      securityScore: number;
      permissions: string[];
      dataAccess: string[];
      networkAccess: string[];
    };
  };

  // ===== WEBHOOKS =====

  /**
   * POST /api/marketplace/webhooks/installation
   * Installation webhook for external integrations
   */
  installationWebhook: {
    method: 'POST';
    path: '/api/marketplace/webhooks/installation';
    body: {
      event: 'installation.started' | 'installation.completed' | 'installation.failed';
      agentId: string;
      userId: string;
      installationId: string;
      timestamp: string;
      metadata?: Record<string, any>;
    };
    response: { received: boolean };
  };

  /**
   * POST /api/marketplace/webhooks/agent
   * Agent lifecycle webhook
   */
  agentWebhook: {
    method: 'POST';
    path: '/api/marketplace/webhooks/agent';
    body: {
      event: 'agent.published' | 'agent.updated' | 'agent.deprecated' | 'agent.removed';
      agentId: string;
      publisherId: string;
      timestamp: string;
      changes?: Record<string, any>;
    };
    response: { received: boolean };
  };
}

// Database Schema Specifications
export interface MarketplaceDatabaseSchema {
  // Main agents table
  agents: {
    id: string;
    slug: string;
    name: string;
    description: string;
    long_description: string;
    publisher_id: string;
    category: string;
    tags: string[]; // JSON array
    logo_url: string;
    version: string;
    rating: number;
    review_count: number;
    download_count: number;
    runtime: 'local' | 'hosted';
    capabilities: string[]; // JSON array
    requirements: string[]; // JSON array
    pricing_data: any; // JSON object
    installation_data: any; // JSON object
    documentation_url: string;
    demo_url: string;
    video_url: string;
    screenshots: string[]; // JSON array
    compatibility_data: any; // JSON object
    security_data: any; // JSON object
    performance_data: any; // JSON object
    changelog: any; // JSON array
    ide_integration: any; // JSON object
    featured: boolean;
    trending: boolean;
    verified: boolean;
    published_at: string;
    created_at: string;
    updated_at: string;
  };

  // Publishers table
  publishers: {
    id: string;
    name: string;
    email: string;
    company: string;
    website: string;
    bio: string;
    avatar_url: string;
    verified: boolean;
    verification_date: string;
    agents_published: number;
    total_downloads: number;
    average_rating: number;
    social_links: any; // JSON object
    created_at: string;
    updated_at: string;
  };

  // Reviews table
  reviews: {
    id: string;
    agent_id: string;
    user_id: string;
    user_name: string;
    user_avatar: string;
    rating: number;
    title: string;
    content: string;
    pros: string[]; // JSON array
    cons: string[]; // JSON array
    helpful_count: number;
    verified: boolean;
    created_at: string;
    updated_at: string;
  };

  // Discussions table
  discussions: {
    id: string;
    agent_id: string;
    user_id: string;
    user_name: string;
    user_avatar: string;
    title: string;
    content: string;
    category: 'question' | 'bug' | 'feature' | 'general';
    status: 'open' | 'closed' | 'resolved';
    upvotes: number;
    downvotes: number;
    reply_count: number;
    created_at: string;
    updated_at: string;
  };

  // Discussion replies table
  discussion_replies: {
    id: string;
    discussion_id: string;
    user_id: string;
    user_name: string;
    user_avatar: string;
    content: string;
    upvotes: number;
    downvotes: number;
    is_author: boolean;
    created_at: string;
  };

  // Collections table
  collections: {
    id: string;
    name: string;
    description: string;
    user_id: string;
    user_name: string;
    is_public: boolean;
    tags: string[]; // JSON array
    agent_count: number;
    created_at: string;
    updated_at: string;
  };

  // Collection agents junction table
  collection_agents: {
    collection_id: string;
    agent_id: string;
    added_at: string;
  };

  // User favorites table
  user_favorites: {
    user_id: string;
    agent_id: string;
    created_at: string;
  };

  // Installation tracking
  installations: {
    id: string;
    agent_id: string;
    user_id: string;
    status: 'pending' | 'installing' | 'completed' | 'failed';
    config_data: any; // JSON object
    progress_data: any; // JSON object
    error_message: string;
    started_at: string;
    completed_at: string;
  };

  // Analytics events
  analytics_events: {
    id: string;
    event_type: string;
    agent_id: string;
    user_id: string;
    session_id: string;
    metadata: any; // JSON object
    timestamp: string;
  };

  // Security scans
  security_scans: {
    id: string;
    agent_id: string;
    scan_type: string;
    status: 'pending' | 'scanning' | 'completed' | 'failed';
    vulnerabilities: any; // JSON array
    security_score: number;
    scan_started_at: string;
    scan_completed_at: string;
  };
}