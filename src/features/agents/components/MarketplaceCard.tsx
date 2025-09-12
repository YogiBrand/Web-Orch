import React from 'react';
import { Star, Download, ExternalLink } from 'lucide-react';
import type { MarketplaceTemplate } from '@/features/agents/model/types';
import { cn } from '@/lib/utils';

interface MarketplaceCardProps {
  template: MarketplaceTemplate;
  onClick: () => void;
}

export function MarketplaceCard({ template, onClick }: MarketplaceCardProps) {
  const formatDownloads = (downloads: number) => {
    if (downloads >= 1000000) return `${(downloads / 1000000).toFixed(1)}M`;
    if (downloads >= 1000) return `${(downloads / 1000).toFixed(1)}K`;
    return downloads.toString();
  };

  return (
    <div
      onClick={onClick}
      className="group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden"
    >
      <div className="p-6 pb-4">
        <div className="flex items-start gap-3 mb-4">
          {template.logoUrl ? (
            <img src={template.logoUrl} alt={`${template.name} logo`} className="h-12 w-12 rounded-lg object-cover flex-shrink-0" />
          ) : (
            <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-semibold text-lg">{template.name.charAt(0)}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{template.name}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">by {template.provider}</p>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="font-medium text-gray-900 dark:text-white">{template.rating}</span>
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-4 line-clamp-2">{template.description}</p>
        <div className="flex flex-wrap gap-1 mb-4">
          {template.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">{tag}</span>
          ))}
          {template.tags.length > 3 && (
            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">+{template.tags.length - 3}</span>
          )}
        </div>
      </div>
      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <Download className="h-4 w-4" />
              <span>{formatDownloads(template.downloads)}</span>
            </div>
            <span className={cn(
              'px-2 py-1 rounded-full text-xs font-medium',
              template.runtime === 'hosted' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' : 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
            )}>{template.runtime}</span>
          </div>
          <div className="flex items-center gap-2">
            {template.pricing?.free ? (
              <span className="text-xs font-medium text-green-600 dark:text-green-400">Free</span>
            ) : (
              <span className="text-xs font-medium text-orange-600 dark:text-orange-400">Paid</span>
            )}
            <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
          </div>
        </div>
      </div>
      <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </div>
  );
}

