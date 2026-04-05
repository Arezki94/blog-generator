export interface Product {
  id: string;
  name: string;
  price: string;
  imageUrl: string;
  productUrl: string;
  color: string;
  selected: boolean;
}

export interface Tip {
  text: string;
}

export interface TableRow {
  cells: string[];
}

export interface ComparisonTable {
  headers: string[];
  rows: TableRow[];
}

export interface H3Section {
  id: string;
  title: string;
  content: string; // plain HTML string (already contains <strong> etc.)
}

export interface H2Section {
  id: string;
  question: string;
  intro: string;        // 1-2 sentences framing the section
  paragraphs: string[]; // array of paragraph HTML strings
  conclusion: string;   // closing paragraph for the section
  tip: Tip | null;
  table: ComparisonTable | null;
  h3s: H3Section[];
  hasProductGrid: boolean;
  products: Product[];
}

export interface FAQItem {
  question: string;
  answer: string; // HTML string
}

export interface SiteProduct {
  name: string;
  url: string;
  price?: string;
  dimensions?: string;
}

// Produit à mettre en avant dans l'article
export interface FeaturedProduct {
  id: string;
  title: string;
  url: string;
  description?: string;
  imageUrl?: string; // Sera scrapée automatiquement
}

// Lien vers autre article de blog
export interface BlogLink {
  id: string;
  anchorText: string;
  url: string;
}

export interface BlogArticle {
  id: string;
  createdAt: string;
  status: 'draft' | 'published';
  h1: string;
  metaDescription: string;
  intro: string;
  anchorText: string;
  anchorUrl: string;
  h2Sections: H2Section[];
  faq: FAQItem[];
  slug: string;
  competitorUrl?: string;
  competitorTitle?: string;
  competitorDomain?: string;
  competitorSearchUrl?: string;
  competitorAngles?: string[];
  siteProducts?: SiteProduct[];
  featuredProducts?: FeaturedProduct[]; // NOUVEAU
  blogLinks?: BlogLink[]; // NOUVEAU
  // Mini article
  isMini?: boolean;
  miniContent?: string;
  miniWordCount?: number;
  miniAnchorText?: string;
  miniAnchorUrl?: string;
}

export type GenerationStep =
  | 'idle'
  | 'generating_intro'
  | 'generating_h2s'
  | 'generating_h2_content'
  | 'generating_faq'
  | 'done';
