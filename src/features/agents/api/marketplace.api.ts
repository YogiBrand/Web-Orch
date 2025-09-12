import type { MarketplaceTemplate } from "@/features/agents/model/types";

const base = (import.meta as any)?.env?.VITE_API_BASE_URL || "";
const url = (path: string) => (base ? new URL(path, base).toString() : path);

export const marketplaceApi = {
  getCatalog: async (filters: { category?: string; search?: string } = {}): Promise<MarketplaceTemplate[]> => {
    const params = new URLSearchParams();
    if (filters.category) params.set("category", filters.category);
    if (filters.search) params.set("search", filters.search);
    try {
      const res = await fetch(url(`/api/marketplace/templates?${params.toString()}`), { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}`);
      return await res.json();
    } catch {
      return [];
    }
  },

  getTemplate: async (slug: string): Promise<MarketplaceTemplate | null> => {
    try {
      const res = await fetch(url(`/api/marketplace/templates/${slug}`), { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`${res.status}`);
      return await res.json();
    } catch {
      return null;
    }
  },

  install: async (templateSlug: string, config: any): Promise<{ success: boolean; agentId?: string; containerId?: string; error?: string }> => {
    try {
      const res = await fetch(url('/api/marketplace/install'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ templateSlug, config }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e?.message || 'Install failed' };
    }
  },
};

