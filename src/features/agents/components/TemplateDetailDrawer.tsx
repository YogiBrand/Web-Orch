import React from 'react';
import { X, Star, Download, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import type { MarketplaceTemplate } from '@/features/agents/model/types';
import { cn } from '@/lib/utils';

export function TemplateDetailDrawer({ template, isOpen, onClose, onConnect }: { template: MarketplaceTemplate | null; isOpen: boolean; onClose: () => void; onConnect: (t: MarketplaceTemplate) => void }) {
  if (!template || !isOpen) return null;
  const fmt = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1000).toFixed(1)}K` : `${n}`);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-2xl bg-white dark:bg-gray-900 shadow-xl">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold">Agent Details</h2>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><X className="h-5 w-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="flex items-start gap-4">
              {template.logoUrl ? (
                <img src={template.logoUrl} alt={`${template.name} logo`} className="h-16 w-16 rounded-lg object-cover" />
              ) : (
                <div className="h-16 w-16 rounded-lg bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                  <span className="text-white font-semibold text-2xl">{template.name.charAt(0)}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold">{template.name}</h1>
                <p className="text-muted-foreground mt-1">by {template.provider}</p>
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{template.rating}</span>
                    <span className="text-sm text-muted-foreground">({template.reviews} reviews)</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Download className="h-4 w-4" />
                    {fmt(template.downloads)} downloads
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn('px-3 py-1 rounded-full text-sm font-medium', template.runtime === 'hosted' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' : 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300')}>{template.runtime}</span>
                {template.pricing?.free && (<span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300">Free</span>)}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground leading-relaxed">{template.longDescription || template.description}</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Capabilities</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {template.capabilities.map((c) => (
                  <div key={c} className="flex items-center gap-2 text-muted-foreground"><CheckCircle className="h-4 w-4 text-green-500" />{c}</div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Requirements</h3>
              <div className="space-y-2">
                {template.requirements.map((r, i) => (
                  <div key={`${r}-${i}`} className="flex items-start gap-2 text-muted-foreground"><AlertCircle className="h-4 w-4 text-orange-500 mt-0.5" />{r}</div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Installation</h3>
              <div className="space-y-3">
                {template.installation.steps.map((s, i) => (
                  <div key={`${s}-${i}`} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 text-sm font-medium flex items-center justify-center">{i + 1}</div>
                    <span className="text-sm text-muted-foreground">{s}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t">
              <a href={template.documentation} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
                <ExternalLink className="h-4 w-4" /> View Documentation
              </a>
            </div>
          </div>
          <div className="flex items-center justify-between p-6 border-t bg-gray-50 dark:bg-gray-800/50">
            <div className="text-sm text-muted-foreground">Version {template.version}</div>
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
              <button onClick={() => onConnect(template)} className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg">Connect Agent</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

