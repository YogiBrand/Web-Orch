import React, { useState, useEffect } from 'react';
import {
  Star,
  Download,
  Shield,
  ExternalLink,
  Play,
  Code,
  Book,
  Users,
  MessageSquare,
  Heart,
  Share2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Monitor,
  Cloud,
  Zap,
  BarChart,
  Settings,
  GitBranch,
  Tag,
  DollarSign,
  Globe,
  Mail,
  Github,
  Twitter,
  Linkedin,
  X,
  ChevronLeft,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  Flag,
  Eye
} from 'lucide-react';
import { MarketplaceTemplate, AgentReview, AgentDiscussion } from '../model/types';
import { enhancedMarketplaceApi } from '../api/enhanced-marketplace.api';

interface EnhancedAgentDetailViewProps {
  template: MarketplaceTemplate;
  onClose: () => void;
  onInstall: () => void;
}

export function EnhancedAgentDetailView({
  template,
  onClose,
  onInstall
}: EnhancedAgentDetailViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'discussions' | 'changelog' | 'analytics'>('overview');
  const [reviews, setReviews] = useState<AgentReview[]>([]);
  const [discussions, setDiscussions] = useState<AgentDiscussion[]>([]);
  const [currentScreenshot, setCurrentScreenshot] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [discussionsLoading, setDiscussionsLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'reviews') {
      loadReviews();
    } else if (activeTab === 'discussions') {
      loadDiscussions();
    }
  }, [activeTab, template.id]);

  const loadReviews = async () => {
    setReviewsLoading(true);
    try {
      const result = await enhancedMarketplaceApi.getAgentReviews(template.id);
      setReviews(result.reviews);
    } catch (error) {
      console.error('Failed to load reviews:', error);
    } finally {
      setReviewsLoading(false);
    }
  };

  const loadDiscussions = async () => {
    setDiscussionsLoading(true);
    try {
      const result = await enhancedMarketplaceApi.getAgentDiscussions(template.id);
      setDiscussions(result.discussions);
    } catch (error) {
      console.error('Failed to load discussions:', error);
    } finally {
      setDiscussionsLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating)
            ? 'text-yellow-400 fill-current'
            : i < rating
            ? 'text-yellow-400 fill-current opacity-50'
            : 'text-gray-300 dark:text-gray-600'
        }`}
      />
    ));
  };

  const getPricingLabel = () => {
    if (template.pricing?.free) return 'Free';
    if (template.pricing?.plans?.length) {
      const startingPlan = template.pricing.plans.find(p => p.price !== '$0');
      return startingPlan ? `From ${startingPlan.price}` : 'Free';
    }
    return 'Free';
  };

  const nextScreenshot = () => {
    if (template.screenshots) {
      setCurrentScreenshot((prev) => 
        prev === template.screenshots!.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevScreenshot = () => {
    if (template.screenshots) {
      setCurrentScreenshot((prev) => 
        prev === 0 ? template.screenshots!.length - 1 : prev - 1
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              {/* Logo */}
              <div className="flex-shrink-0">
                {template.logoUrl ? (
                  <img
                    src={template.logoUrl}
                    alt={template.name}
                    className="w-16 h-16 rounded-lg object-cover border border-gray-200 dark:border-gray-600"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                    {template.name.charAt(0)}
                  </div>
                )}
              </div>

              {/* Basic Info */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {template.name}
                  </h1>
                  {template.security?.verified && (
                    <div className="flex items-center gap-1 text-green-500">
                      <Shield className="h-5 w-5" />
                      <span className="text-sm font-medium">Verified</span>
                    </div>
                  )}
                  {template.featured && (
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Star className="h-5 w-5 fill-current" />
                      <span className="text-sm font-medium">Featured</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400 mb-3">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {template.publisher?.name || template.provider}
                    {template.publisher?.verified && <CheckCircle className="h-3 w-3 text-green-500" />}
                  </span>
                  <span className="flex items-center gap-1">
                    <Tag className="h-4 w-4" />
                    {template.category}
                  </span>
                  <span className="flex items-center gap-1">
                    <GitBranch className="h-4 w-4" />
                    v{template.version}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Updated {formatDate(template.updated_at || template.created_at)}
                  </span>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-1">
                    {getRatingStars(template.rating)}
                    <span className="ml-1 font-semibold">{template.rating.toFixed(1)}</span>
                    <span className="text-gray-500">({formatNumber(template.reviews)} reviews)</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    <Download className="h-4 w-4" />
                    <span>{formatNumber(template.downloads)} downloads</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    {template.runtime === 'local' ? (
                      <Monitor className="h-4 w-4" />
                    ) : (
                      <Cloud className="h-4 w-4" />
                    )}
                    <span className="capitalize">{template.runtime}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsFavorited(!isFavorited)}
                className={`p-2 rounded-lg transition-colors ${
                  isFavorited 
                    ? 'text-red-500 bg-red-50 dark:bg-red-900/20' 
                    : 'text-gray-400 hover:text-red-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Heart className={`h-5 w-5 ${isFavorited ? 'fill-current' : ''}`} />
              </button>
              <button className="p-2 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <Share2 className="h-5 w-5" />
              </button>
              {template.demoUrl && (
                <button
                  onClick={() => window.open(template.demoUrl, '_blank')}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <Play className="h-4 w-4" />
                  Demo
                </button>
              )}
              <button
                onClick={onInstall}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Install
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Pricing */}
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-gray-400" />
                <span className="font-semibold text-gray-900 dark:text-white">
                  {getPricingLabel()}
                </span>
              </div>
              {template.pricing?.plans && (
                <div className="flex gap-2">
                  {template.pricing.plans.map((plan, index) => (
                    <div
                      key={index}
                      className="px-3 py-1 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600"
                    >
                      <div className="text-sm font-medium">{plan.name}</div>
                      <div className="text-xs text-gray-500">{plan.price}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex h-[calc(90vh-200px)]">
          {/* Main Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Screenshots/Media */}
            {template.screenshots && template.screenshots.length > 0 && (
              <div className="relative">
                <img
                  src={template.screenshots[currentScreenshot]}
                  alt={`${template.name} screenshot`}
                  className="w-full h-64 object-cover"
                />
                {template.screenshots.length > 1 && (
                  <>
                    <button
                      onClick={prevScreenshot}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 p-2 bg-black bg-opacity-50 text-white rounded-lg hover:bg-opacity-70 transition-opacity"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={nextScreenshot}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 bg-black bg-opacity-50 text-white rounded-lg hover:bg-opacity-70 transition-opacity"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                      {template.screenshots.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentScreenshot(index)}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            index === currentScreenshot ? 'bg-white' : 'bg-white bg-opacity-50'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700 px-6">
              <nav className="flex space-x-8">
                {[
                  { id: 'overview', label: 'Overview', icon: Book },
                  { id: 'reviews', label: `Reviews (${template.reviews})`, icon: Star },
                  { id: 'discussions', label: `Discussions (${template.community?.discussions || 0})`, icon: MessageSquare },
                  { id: 'changelog', label: 'Changelog', icon: GitBranch },
                  { id: 'analytics', label: 'Analytics', icon: BarChart }
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'overview' && (
                <div className="space-y-8">
                  {/* Description */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      Description
                    </h3>
                    <div className="prose dark:prose-invert max-w-none">
                      <p className={`text-gray-700 dark:text-gray-300 ${
                        !showFullDescription ? 'line-clamp-4' : ''
                      }`}>
                        {template.longDescription || template.description}
                      </p>
                      {template.longDescription && template.longDescription.length > 300 && (
                        <button
                          onClick={() => setShowFullDescription(!showFullDescription)}
                          className="text-blue-500 hover:text-blue-600 text-sm font-medium mt-2"
                        >
                          {showFullDescription ? 'Show less' : 'Show more'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      Tags
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {template.tags.map(tag => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Capabilities */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      Capabilities
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {template.capabilities.map((capability, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                        >
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-gray-700 dark:text-gray-300 capitalize">
                            {capability.replace(/-/g, ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Requirements */}
                  {template.requirements && template.requirements.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                        Requirements
                      </h3>
                      <ul className="space-y-2">
                        {template.requirements.map((req, index) => (
                          <li
                            key={index}
                            className="flex items-center gap-2 text-gray-700 dark:text-gray-300"
                          >
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Installation */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      Installation
                    </h3>
                    <ol className="space-y-3">
                      {template.installation.steps.map((step, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </span>
                          <span className="text-gray-700 dark:text-gray-300">{step}</span>
                        </li>
                      ))}
                    </ol>
                    {template.installation.notes && (
                      <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                          <div className="text-sm text-yellow-800 dark:text-yellow-200">
                            {template.installation.notes.map((note, index) => (
                              <p key={index} className={index > 0 ? 'mt-2' : ''}>
                                {note}
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="space-y-6">
                  {reviewsLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="animate-pulse p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                            <div className="flex-1">
                              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
                              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
                              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {reviews.map(review => (
                        <div
                          key={review.id}
                          className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              {review.userAvatar ? (
                                <img
                                  src={review.userAvatar}
                                  alt={review.userName}
                                  className="w-10 h-10 rounded-full"
                                />
                              ) : (
                                <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center text-white font-medium">
                                  {review.userName.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-900 dark:text-white">
                                    {review.userName}
                                  </span>
                                  {review.verified && (
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="flex">
                                    {getRatingStars(review.rating)}
                                  </div>
                                  <span className="text-sm text-gray-500">
                                    {formatDate(review.createdAt)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button className="p-1 text-gray-400 hover:text-green-500">
                                <ThumbsUp className="h-4 w-4" />
                              </button>
                              <span className="text-sm text-gray-500">{review.helpful}</span>
                              <button className="p-1 text-gray-400 hover:text-red-500">
                                <Flag className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                            {review.title}
                          </h4>
                          <p className="text-gray-700 dark:text-gray-300 mb-3">
                            {review.content}
                          </p>
                          {(review.pros || review.cons) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {review.pros && (
                                <div>
                                  <h5 className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">
                                    Pros
                                  </h5>
                                  <ul className="space-y-1">
                                    {review.pros.map((pro, index) => (
                                      <li key={index} className="text-sm text-gray-600 dark:text-gray-400">
                                        + {pro}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {review.cons && (
                                <div>
                                  <h5 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">
                                    Cons
                                  </h5>
                                  <ul className="space-y-1">
                                    {review.cons.map((con, index) => (
                                      <li key={index} className="text-sm text-gray-600 dark:text-gray-400">
                                        - {con}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'discussions' && (
                <div className="space-y-6">
                  {discussionsLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="animate-pulse p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                            <div className="flex-1">
                              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {discussions.map(discussion => (
                        <div
                          key={discussion.id}
                          className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              {discussion.userAvatar ? (
                                <img
                                  src={discussion.userAvatar}
                                  alt={discussion.userName}
                                  className="w-10 h-10 rounded-full"
                                />
                              ) : (
                                <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center text-white font-medium">
                                  {discussion.userName.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {discussion.userName}
                                </span>
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                  <span>{formatDate(discussion.createdAt)}</span>
                                  <span className={`px-2 py-1 rounded text-xs ${
                                    discussion.category === 'question' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300' :
                                    discussion.category === 'bug' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300' :
                                    discussion.category === 'feature' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' :
                                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                  }`}>
                                    {discussion.category}
                                  </span>
                                  <span className={`px-2 py-1 rounded text-xs ${
                                    discussion.status === 'open' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300' :
                                    discussion.status === 'resolved' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' :
                                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                  }`}>
                                    {discussion.status}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                <button className="p-1 text-gray-400 hover:text-green-500">
                                  <ThumbsUp className="h-4 w-4" />
                                </button>
                                <span className="text-sm text-gray-500">{discussion.upvotes}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <MessageSquare className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-500">{discussion.replies.length}</span>
                              </div>
                            </div>
                          </div>
                          <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                            {discussion.title}
                          </h4>
                          <p className="text-gray-700 dark:text-gray-300">
                            {discussion.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'changelog' && (
                <div className="space-y-6">
                  {template.changelog ? (
                    <div className="space-y-6">
                      {template.changelog.map((change, index) => (
                        <div
                          key={index}
                          className="border-l-4 border-blue-500 pl-4 pb-4"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              Version {change.version}
                            </h3>
                            <span className="text-sm text-gray-500">
                              {formatDate(change.date)}
                            </span>
                            {change.breaking && (
                              <span className="px-2 py-1 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 text-xs font-medium rounded">
                                Breaking
                              </span>
                            )}
                          </div>
                          <ul className="space-y-1">
                            {change.changes.map((changeItem, changeIndex) => (
                              <li key={changeIndex} className="text-gray-700 dark:text-gray-300">
                                • {changeItem}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">
                      No changelog available
                    </p>
                  )}
                </div>
              )}

              {activeTab === 'analytics' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="h-5 w-5 text-blue-500" />
                      <span className="font-medium">Views</span>
                    </div>
                    <p className="text-2xl font-bold">
                      {formatNumber(template.downloads * 3)} {/* Mock data */}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Download className="h-5 w-5 text-green-500" />
                      <span className="font-medium">Downloads</span>
                    </div>
                    <p className="text-2xl font-bold">
                      {formatNumber(template.downloads)}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="h-5 w-5 text-yellow-500" />
                      <span className="font-medium">Average Rating</span>
                    </div>
                    <p className="text-2xl font-bold">
                      {template.rating.toFixed(1)}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="h-5 w-5 text-purple-500" />
                      <span className="font-medium">Reviews</span>
                    </div>
                    <p className="text-2xl font-bold">
                      {formatNumber(template.reviews)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-80 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Publisher Info */}
              {template.publisher && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    Publisher
                  </h3>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center text-white font-medium">
                      {template.publisher.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {template.publisher.name}
                        </span>
                        {template.publisher.verified && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      {template.publisher.website && (
                        <a
                          href={template.publisher.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1"
                        >
                          <Globe className="h-3 w-3" />
                          Website
                        </a>
                      )}
                      {template.publisher.support && (
                        <a
                          href={`mailto:${template.publisher.support}`}
                          className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1"
                        >
                          <Mail className="h-3 w-3" />
                          Support
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Compatibility */}
              {template.compatibility && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    Compatibility
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Operating Systems
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {template.compatibility.os.map(os => (
                          <span
                            key={os}
                            className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-xs"
                          >
                            {os}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Languages
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {template.compatibility.languages.map(lang => (
                          <span
                            key={lang}
                            className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-xs"
                          >
                            {lang}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Security */}
              {template.security && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    Security
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {template.security.verified ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      )}
                      <span className="text-sm">
                        {template.security.verified ? 'Verified Publisher' : 'Unverified'}
                      </span>
                    </div>
                    {template.security.lastScan && (
                      <div className="text-xs text-gray-500">
                        Last scanned: {formatDate(template.security.lastScan)}
                      </div>
                    )}
                    {template.security.vulnerabilities !== undefined && (
                      <div className="text-xs">
                        <span className={template.security.vulnerabilities === 0 ? 'text-green-600' : 'text-red-600'}>
                          {template.security.vulnerabilities} vulnerabilities
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Performance */}
              {template.performance && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    Performance
                  </h3>
                  {template.performance.resourceUsage && (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">CPU:</span>
                        <span>{template.performance.resourceUsage.cpu}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Memory:</span>
                        <span>{template.performance.resourceUsage.memory}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Storage:</span>
                        <span>{template.performance.resourceUsage.storage}</span>
                      </div>
                    </div>
                  )}
                  {template.performance.benchmarks && (
                    <div className="mt-3">
                      <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                        <Zap className="h-3 w-3" />
                        <span>Benchmarked</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Links */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Links
                </h3>
                <div className="space-y-2">
                  <a
                    href={template.documentation}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-600"
                  >
                    <Book className="h-4 w-4" />
                    Documentation
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  {template.publisher?.website && (
                    <a
                      href={template.publisher.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-600"
                    >
                      <Globe className="h-4 w-4" />
                      Website
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {template.demoUrl && (
                    <a
                      href={template.demoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-600"
                    >
                      <Play className="h-4 w-4" />
                      Live Demo
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}