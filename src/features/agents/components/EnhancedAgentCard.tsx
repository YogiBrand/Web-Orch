import React, { useState } from 'react';
import {
  Star,
  Download,
  Shield,
  TrendingUp,
  Eye,
  Heart,
  Share2,
  ExternalLink,
  Play,
  Clock,
  Users,
  GitBranch,
  Tag,
  DollarSign,
  Zap,
  CheckCircle,
  AlertCircle,
  Monitor,
  Cloud
} from 'lucide-react';
import { MarketplaceTemplate } from '../model/types';

interface EnhancedAgentCardProps {
  template: MarketplaceTemplate;
  onSelect: () => void;
  onInstall: () => void;
  listView?: boolean;
  showAnalytics?: boolean;
}

export function EnhancedAgentCard({
  template,
  onSelect,
  onInstall,
  listView = false,
  showAnalytics = false
}: EnhancedAgentCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [imageError, setImageError] = useState(false);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`;
    return `${Math.ceil(diffDays / 365)} years ago`;
  };

  const getPricingLabel = () => {
    if (template.pricing?.free) return 'Free';
    if (template.pricing?.plans?.length) {
      const startingPlan = template.pricing.plans.find(p => p.price !== '$0');
      return startingPlan ? `From ${startingPlan.price}` : 'Free';
    }
    return 'Free';
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-500';
    if (rating >= 4.0) return 'text-blue-500';
    if (rating >= 3.5) return 'text-yellow-500';
    return 'text-gray-500';
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.share({
        title: template.name,
        text: template.description,
        url: window.location.href
      });
    } catch {
      // Fallback to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFavorited(!isFavorited);
  };

  if (listView) {
    return (
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 cursor-pointer transition-all duration-200 ${
          isHovered ? 'shadow-lg border-blue-300 dark:border-blue-600 transform scale-[1.01]' : ''
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onSelect}
      >
        <div className="flex items-start gap-4">
          {/* Logo */}
          <div className="flex-shrink-0">
            {template.logoUrl && !imageError ? (
              <img
                src={template.logoUrl}
                alt={template.name}
                className="w-16 h-16 rounded-lg object-cover border border-gray-200 dark:border-gray-600"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                {template.name.charAt(0)}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                    {template.name}
                  </h3>
                  {template.security?.verified && (
                    <Shield className="h-4 w-4 text-green-500" />
                  )}
                  {template.featured && (
                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                  )}
                  {template.trending && (
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-2">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {template.provider}
                  </span>
                  <span className="flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    {template.category}
                  </span>
                  <span className="flex items-center gap-1">
                    <GitBranch className="h-3 w-3" />
                    v{template.version}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(template.updated_at || template.created_at)}
                  </span>
                </div>

                <p className="text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                  {template.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {template.tags.slice(0, 5).map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    >
                      {tag}
                    </span>
                  ))}
                  {template.tags.length > 5 && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      +{template.tags.length - 5} more
                    </span>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <Star className={`h-4 w-4 ${getRatingColor(template.rating)} fill-current`} />
                    <span>{template.rating.toFixed(1)}</span>
                    <span>({formatNumber(template.reviews)})</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Download className="h-4 w-4" />
                    <span>{formatNumber(template.downloads)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {template.runtime === 'local' ? (
                      <Monitor className="h-4 w-4" />
                    ) : (
                      <Cloud className="h-4 w-4" />
                    )}
                    <span className="capitalize">{template.runtime}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    <span>{getPricingLabel()}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={handleFavorite}
                  className={`p-2 rounded-lg transition-colors ${
                    isFavorited 
                      ? 'text-red-500 bg-red-50 dark:bg-red-900/20' 
                      : 'text-gray-400 hover:text-red-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <Heart className={`h-4 w-4 ${isFavorited ? 'fill-current' : ''}`} />
                </button>
                <button
                  onClick={handleShare}
                  className="p-2 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Share2 className="h-4 w-4" />
                </button>
                {template.demoUrl && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(template.demoUrl, '_blank');
                    }}
                    className="p-2 rounded-lg text-gray-400 hover:text-green-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Play className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onInstall();
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Install
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer transition-all duration-200 ${
        isHovered ? 'shadow-xl border-blue-300 dark:border-blue-600 transform scale-105' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onSelect}
    >
      {/* Header with Logo */}
      <div className="relative p-4 pb-2">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {template.logoUrl && !imageError ? (
              <img
                src={template.logoUrl}
                alt={template.name}
                className="w-12 h-12 rounded-lg object-cover border border-gray-200 dark:border-gray-600"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
                {template.name.charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                {template.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {template.provider}
              </p>
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-col items-end gap-1">
            {template.security?.verified && (
              <div className="flex items-center gap-1 text-green-500">
                <Shield className="h-3 w-3" />
                <span className="text-xs">Verified</span>
              </div>
            )}
            {template.featured && (
              <div className="flex items-center gap-1 text-yellow-500">
                <Star className="h-3 w-3 fill-current" />
                <span className="text-xs">Featured</span>
              </div>
            )}
            {template.trending && (
              <div className="flex items-center gap-1 text-blue-500">
                <TrendingUp className="h-3 w-3" />
                <span className="text-xs">Trending</span>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-3">
          {template.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {template.tags.slice(0, 3).map(tag => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              {tag}
            </span>
          ))}
          {template.tags.length > 3 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
              +{template.tags.length - 3}
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
          <div className="flex items-center gap-1">
            <Star className={`h-3 w-3 ${getRatingColor(template.rating)} fill-current`} />
            <span>{template.rating.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Download className="h-3 w-3" />
            <span>{formatNumber(template.downloads)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${
              template.runtime === 'local' ? 'bg-blue-500' : 'bg-green-500'
            }`}></span>
            <span className="capitalize">{template.runtime}</span>
          </div>
        </div>

        {/* Pricing */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1 text-sm">
            <DollarSign className="h-4 w-4 text-gray-400" />
            <span className="font-medium text-gray-900 dark:text-white">
              {getPricingLabel()}
            </span>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            v{template.version}
          </span>
        </div>
      </div>

      {/* Screenshots/Demo (shown on hover for grid view) */}
      {isHovered && template.screenshots?.length && (
        <div className="px-4 pb-3">
          <div className="flex gap-2 overflow-x-auto">
            {template.screenshots.slice(0, 3).map((screenshot, index) => (
              <img
                key={index}
                src={screenshot}
                alt={`${template.name} screenshot ${index + 1}`}
                className="w-20 h-12 object-cover rounded border border-gray-200 dark:border-gray-600 flex-shrink-0"
              />
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleFavorite}
              className={`p-2 rounded-lg transition-colors ${
                isFavorited 
                  ? 'text-red-500 bg-red-50 dark:bg-red-900/20' 
                  : 'text-gray-400 hover:text-red-500 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Heart className={`h-4 w-4 ${isFavorited ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={handleShare}
              className="p-2 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Share2 className="h-4 w-4" />
            </button>
            {template.demoUrl && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(template.demoUrl, '_blank');
                }}
                className="p-2 rounded-lg text-gray-400 hover:text-green-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Play className="h-4 w-4" />
              </button>
            )}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onInstall();
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 text-sm"
          >
            <Download className="h-4 w-4" />
            Install
          </button>
        </div>
      </div>

      {/* Performance indicator */}
      {template.performance?.benchmarks && (
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2 bg-gray-50 dark:bg-gray-750">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Zap className="h-3 w-3" />
            <span>Benchmarked</span>
            {template.performance.resourceUsage && (
              <>
                <span>•</span>
                <span>{template.performance.resourceUsage.memory} RAM</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}