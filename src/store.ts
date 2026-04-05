import { create } from 'zustand';
import { BlogArticle, Product, FeaturedProduct, BlogLink } from './types';

export interface FormPreset {
  h1: string;
  anchorText: string;
  anchorUrl: string;
  h2Count: number;
  featuredProducts: FeaturedProduct[];
  blogLinks: BlogLink[];
}

interface BlogStore {
  articles: BlogArticle[];
  activeArticleId: string | null;
  formPreset: FormPreset | null;
  setActiveArticle: (id: string | null) => void;
  setFormPreset: (preset: FormPreset | null) => void;
  addArticle: (article: BlogArticle) => void;
  updateArticle: (id: string, updates: Partial<BlogArticle>) => void;
  deleteArticle: (id: string) => void;
  toggleProductSelection: (articleId: string, h2Id: string, productId: string) => void;
  updateProductColor: (articleId: string, h2Id: string, productId: string, color: string) => void;
  addProduct: (articleId: string, h2Id: string, product: Product) => void;
  removeProduct: (articleId: string, h2Id: string, productId: string) => void;
}

const STORAGE_KEY = 'seo_blog_articles';

function loadArticles(): BlogArticle[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveArticles(articles: BlogArticle[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(articles));
  } catch {
    // ignore
  }
}

export const useBlogStore = create<BlogStore>((set, get) => ({
  articles: loadArticles(),
  activeArticleId: null,
  formPreset: null,

  setActiveArticle: (id) => set({ activeArticleId: id }),

  setFormPreset: (preset) => set({ formPreset: preset }),

  addArticle: (article) => {
    const updated = [article, ...get().articles];
    saveArticles(updated);
    set({ articles: updated });
  },

  updateArticle: (id, updates) => {
    const updated = get().articles.map((a) => (a.id === id ? { ...a, ...updates } : a));
    saveArticles(updated);
    set({ articles: updated });
  },

  deleteArticle: (id) => {
    const updated = get().articles.filter((a) => a.id !== id);
    saveArticles(updated);
    set({ articles: updated, activeArticleId: get().activeArticleId === id ? null : get().activeArticleId });
  },

  toggleProductSelection: (articleId, h2Id, productId) => {
    const updated = get().articles.map((a) => {
      if (a.id !== articleId) return a;
      return {
        ...a,
        h2Sections: a.h2Sections.map((h2) => {
          if (h2.id !== h2Id) return h2;
          return {
            ...h2,
            products: h2.products.map((p) =>
              p.id === productId ? { ...p, selected: !p.selected } : p
            ),
          };
        }),
      };
    });
    saveArticles(updated);
    set({ articles: updated });
  },

  updateProductColor: (articleId, h2Id, productId, color) => {
    const updated = get().articles.map((a) => {
      if (a.id !== articleId) return a;
      return {
        ...a,
        h2Sections: a.h2Sections.map((h2) => {
          if (h2.id !== h2Id) return h2;
          return {
            ...h2,
            products: h2.products.map((p) =>
              p.id === productId ? { ...p, color } : p
            ),
          };
        }),
      };
    });
    saveArticles(updated);
    set({ articles: updated });
  },

  addProduct: (articleId, h2Id, product) => {
    const updated = get().articles.map((a) => {
      if (a.id !== articleId) return a;
      return {
        ...a,
        h2Sections: a.h2Sections.map((h2) => {
          if (h2.id !== h2Id) return h2;
          return { ...h2, products: [...h2.products, product] };
        }),
      };
    });
    saveArticles(updated);
    set({ articles: updated });
  },

  removeProduct: (articleId, h2Id, productId) => {
    const updated = get().articles.map((a) => {
      if (a.id !== articleId) return a;
      return {
        ...a,
        h2Sections: a.h2Sections.map((h2) => {
          if (h2.id !== h2Id) return h2;
          return { ...h2, products: h2.products.filter((p) => p.id !== productId) };
        }),
      };
    });
    saveArticles(updated);
    set({ articles: updated });
  },
}));
