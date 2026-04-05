import { useState } from 'react';
import {
  BlogArticle, H2Section, H3Section, FAQItem, Product, ComparisonTable, Tip,
} from '../types';
import { useBlogStore } from '../store';
import {
  Copy, CheckCheck, Tag, Eye, Code2, ShoppingCart,
  Plus, X, ExternalLink, FileText, Star,
  ChevronDown, Lightbulb, HelpCircle, RefreshCw,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface ArticleViewerProps {
  article: BlogArticle;
}

// ─── Safe helpers ─────────────────────────────────────────────────────────────
function s(val: string | null | undefined, fallback = ''): string {
  return (val ?? fallback);
}

function safeH2s(val: H2Section[] | null | undefined): H2Section[] {
  return Array.isArray(val) ? val : [];
}

function safeH3s(val: H3Section[] | null | undefined): H3Section[] {
  return Array.isArray(val) ? val : [];
}

function safeParas(val: string[] | null | undefined): string[] {
  return Array.isArray(val) ? val : [];
}

function safeProducts(val: Product[] | null | undefined): Product[] {
  return Array.isArray(val) ? val : [];
}

function safeFaq(val: FAQItem[] | null | undefined): FAQItem[] {
  return Array.isArray(val) ? val : [];
}

function stripHtml(text: string): string {
  return s(text).replace(/<[^>]*>/g, '');
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ArticleViewer({ article }: ArticleViewerProps) {
  const { updateArticle, toggleProductSelection, updateProductColor, addProduct, removeProduct, setFormPreset } =
    useBlogStore();
  const [viewMode, setViewMode] = useState<'preview' | 'html'>('preview');
  const [copied, setCopied] = useState(false);
  const [metaCopied, setMetaCopied] = useState(false);
  const [productFormH2, setProductFormH2] = useState<string | null>(null);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '', price: '', imageUrl: '', productUrl: '', color: '#16a34a', selected: true,
  });
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showCompetitor, setShowCompetitor] = useState(true);
  const [showProducts, setShowProducts] = useState(true);
  const [showFeaturedProducts, setShowFeaturedProducts] = useState(true);
  const [showBlogLinks, setShowBlogLinks] = useState(true);

  // ─── Safe article fields ──────────────────────────────────────────────────
  const h1 = s(article?.h1, 'Article sans titre');
  const intro = s(article?.intro);
  const metaDescription = s(article?.metaDescription);
  const anchorText = s(article?.anchorText);
  const h2Sections = safeH2s(article?.h2Sections);
  const faqItems = safeFaq(article?.faq);
  const competitorUrl = s(article?.competitorUrl);
  const siteProducts = Array.isArray(article?.siteProducts) ? article.siteProducts : [];
  const featuredProducts = Array.isArray(article?.featuredProducts) ? article.featuredProducts : [];
  const blogLinks = Array.isArray(article?.blogLinks) ? article.blogLinks : [];
  const createdAt = article?.createdAt
    ? new Date(article.createdAt).toLocaleDateString('fr-FR')
    : '';
  const status = article?.status ?? 'draft';

  // ─── Régénérer l'article ──────────────────────────────────────────────────
  function handleRegenerate() {
    // Créer un preset avec toutes les données de l'article actuel
    setFormPreset({
      h1: article.h1,
      anchorText: article.anchorText || '',
      anchorUrl: article.anchorUrl || '',
      h2Count: article.h2Sections?.length || 5,
      featuredProducts: article.featuredProducts || [],
      blogLinks: article.blogLinks || [],
    });
    
    // Scroll vers le haut
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ─── HTML builder ─────────────────────────────────────────────────────────
  function buildHtml(): string {
    let html = '';
    html += `<meta name="description" content="${metaDescription}" />\n`;
    html += `<style>article a { color: #ec4899; text-decoration: underline; } article a:hover { color: #db2777; }</style>\n\n`;
    html += `<article itemscope itemtype="https://schema.org/Article">\n\n`;
    html += `<h1 itemprop="headline">${h1}</h1>\n\n`;

    // Mini article — export direct
    if (article.isMini && article.miniContent) {
      html += `${article.miniContent}\n\n`;
      html += `</article>`;
      return html;
    }

    html += `${intro}\n\n`;

    // Cartes produits featured
    if (featuredProducts && featuredProducts.length > 0) {
      html += `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px;margin:30px 0;">\n`;
      for (const product of featuredProducts) {
        const imgUrl = product.imageUrl || 'https://via.placeholder.com/200';
        html += `  <div style="border:2px solid #e5e7eb;border-radius:12px;padding:20px;text-align:center;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <img src="${imgUrl}" alt="${product.title}" style="width:100%;max-width:200px;height:auto;border-radius:8px;margin-bottom:16px;" />
    <h4 style="margin:12px 0 8px 0;font-weight:600;font-size:16px;color:#111827;">${product.title}</h4>
    ${product.description ? `<p style="font-size:14px;color:#6b7280;margin:8px 0;">${product.description}</p>` : ''}
    <a href="${product.url}" style="display:inline-block;background:#2563eb;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:12px;transition:background 0.2s;" onmouseover="this.style.background='#1d4ed8'" onmouseout="this.style.background='#2563eb'">Voir le produit →</a>
  </div>\n`;
      }
      html += `</div>\n\n`;
    }

    for (const h2 of h2Sections) {
      const question = s(h2.question);
      const h2Intro = s(h2.intro);
      const h3s = safeH3s(h2.h3s);
      const paragraphs = safeParas(h2.paragraphs);
      const tip: Tip | null = h2.tip ?? null;
      const table: ComparisonTable | null = h2.table ?? null;
      const conclusion = s(h2.conclusion);
      const products = safeProducts(h2.products);
      const hasProductGrid = !!h2.hasProductGrid;

      html += `<h2>${stripHtml(question)}</h2>\n`;

      if (h2Intro) {
        html += `<p><em>${stripHtml(h2Intro)}</em></p>\n\n`;
      }

      for (const h3 of h3s) {
        if (s(h3.title)) html += `<h3>${s(h3.title)}</h3>\n`;
        if (s(h3.content)) html += `${s(h3.content)}\n`;
      }

      for (const para of paragraphs) {
        const p = s(para).trim();
        if (p) html += `${p.startsWith('<') ? p : `<p>${p}</p>`}\n`;
      }

      if (tip && s(tip.text)) {
        const tipText = s(tip.text)
          .replace(/<\/?blockquote[^>]*>/g, '')
          .replace(/<p[^>]*><strong>Conseil\s*:<\/strong>\s*/i, '')
          .replace(/<\/p>$/, '')
          .trim();
        if (tipText) {
          html += `\n<blockquote style="border-left: 4px solid #22c55e; padding: 12px 16px; margin: 16px 0; background: #f0fdf4; border-radius: 0 8px 8px 0;">\n<p style="margin:0;"><strong>Conseil :</strong> ${tipText}</p>\n</blockquote>\n`;
        }
      }

      if (table && Array.isArray(table.headers) && table.headers.length > 0) {
        html += `\n<table style="width: 100%; border-collapse: collapse; margin: 15px 0;">\n`;
        html += `<thead>\n<tr style="background-color: #f2f2f2;">\n`;
        for (const header of (table.headers || [])) {
          html += `<th style="border: 1px solid #ddd; padding: 10px;">${s(header)}</th>\n`;
        }
        html += `</tr>\n</thead>\n<tbody>\n`;
        for (const row of (table.rows || [])) {
          html += `<tr>\n`;
          for (const cell of (row?.cells || [])) {
            html += `<td style="border: 1px solid #ddd; padding: 10px;">${s(cell)}</td>\n`;
          }
          html += `</tr>\n`;
        }
        html += `</tbody>\n</table>\n`;
      }

      if (conclusion) {
        html += `\n<p>${conclusion}</p>\n`;
      }

      const selectedProducts = products.filter((p) => p.selected);
      if (hasProductGrid && selectedProducts.length > 0) {
        html += `\n<div class="product-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin: 20px 0;">\n`;
        for (const p of selectedProducts) {
          html += `<div style="border-top: 3px solid ${s(p.color, '#16a34a')}; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; text-align: center;">\n`;
          if (p.imageUrl) html += `<img src="${s(p.imageUrl)}" alt="${s(p.name)}" style="width: 100%; height: 160px; object-fit: cover;" loading="lazy" />\n`;
          html += `<h4 style="font-size: 14px; margin: 8px 0 4px;">${s(p.name)}</h4>\n`;
          if (p.price) html += `<p style="font-weight: bold; font-size: 16px; margin: 4px 0 10px;">${s(p.price)}</p>\n`;
          html += `<a href="${s(p.productUrl)}" style="display: inline-block; background-color: ${s(p.color, '#16a34a')}; color: white; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-weight: bold;" rel="noopener">Voir le produit</a>\n`;
          html += `</div>\n`;
        }
        html += `</div>\n`;
      }

      html += `\n`;
    }

    if (faqItems.length > 0) {
      html += `<h2>Questions fréquentes</h2>\n\n`;
      html += `<div itemscope itemtype="https://schema.org/FAQPage">\n\n`;
      for (const item of faqItems) {
        html += `<div itemscope itemprop="mainEntity" itemtype="https://schema.org/Question" style="border-bottom: 1px solid #e5e7eb; padding: 18px 0;">\n`;
        html += `  <h3 itemprop="name" style="font-size: 16px; font-weight: 700; margin: 0 0 10px 0;">${s(item.question)}</h3>\n`;
        html += `  <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">\n`;
        html += `    <p itemprop="text" style="font-size: 14px; color: #374151; line-height: 1.75; margin: 0;">${s(item.answer)}</p>\n`;
        html += `  </div>\n`;
        html += `</div>\n\n`;
      }
      html += `</div>\n\n`;
    }

    html += `</article>`;
    return html;
  }

  async function copyHtml() {
    await navigator.clipboard.writeText(buildHtml());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function copyMeta() {
    await navigator.clipboard.writeText(metaDescription);
    setMetaCopied(true);
    setTimeout(() => setMetaCopied(false), 2500);
  }

  function toggleProductGrid(h2Id: string) {
    const updated = h2Sections.map((h2) =>
      h2.id === h2Id ? { ...h2, hasProductGrid: !h2.hasProductGrid } : h2
    );
    updateArticle(article.id, { h2Sections: updated });
  }

  function handleAddProduct(h2Id: string) {
    if (!newProduct.name || !newProduct.productUrl) return;
    const product: Product = {
      id: uuidv4(),
      name: newProduct.name!,
      price: newProduct.price || '',
      imageUrl:
        newProduct.imageUrl ||
        `https://placehold.co/300x220/16a34a/ffffff?text=${encodeURIComponent(newProduct.name!)}`,
      productUrl: newProduct.productUrl!,
      color: newProduct.color || '#16a34a',
      selected: true,
    };
    addProduct(article.id, h2Id, product);
    setNewProduct({ name: '', price: '', imageUrl: '', productUrl: '', color: '#16a34a', selected: true });
    setProductFormH2(null);
  }

  const metaLen = metaDescription.length;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto space-y-4">

      {/* Toolbar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <FileText size={15} className="text-green-600 shrink-0" />
              <h2 className="text-gray-900 font-bold text-base leading-tight truncate">{h1}</h2>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
              <span className="flex items-center gap-1"><Tag size={10} />{anchorText}</span>
              <span className="w-1 h-1 rounded-full bg-gray-200 inline-block" />
              <span>{h2Sections.length} sections H2</span>
              <span className="w-1 h-1 rounded-full bg-gray-200 inline-block" />
              <span>{faqItems.length} FAQ</span>
              <span className="w-1 h-1 rounded-full bg-gray-200 inline-block" />
              <span>{createdAt}</span>
              <span className="w-1 h-1 rounded-full bg-gray-200 inline-block" />
              <span className={`font-semibold ${status === 'published' ? 'text-green-600' : 'text-amber-500'}`}>
                {status === 'published' ? '✓ Publié' : '○ Brouillon'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              onClick={() =>
                updateArticle(article.id, {
                  status: status === 'published' ? 'draft' : 'published',
                })
              }
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                status === 'published'
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
              }`}
            >
              {status === 'published' ? 'Dépublier' : 'Publier'}
            </button>

            <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
              <button
                onClick={() => setViewMode('preview')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'preview'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Eye size={12} /> Aperçu
              </button>
              <button
                onClick={() => setViewMode('html')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'html'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Code2 size={12} /> HTML
              </button>
            </div>

            <button
              onClick={handleRegenerate}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow"
            >
              <RefreshCw size={12} />
              Régénérer
            </button>

            <button
              onClick={copyHtml}
              className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-700 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow"
            >
              {copied ? <CheckCheck size={12} /> : <Copy size={12} />}
              {copied ? 'Copié !' : 'Copier HTML'}
            </button>
          </div>
        </div>
      </div>

      {/* Meta description */}
      <div
        className={`rounded-2xl border px-5 py-4 ${
          metaLen > 155 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Star size={13} className="text-green-600" />
              <span className="text-xs font-bold text-green-800 uppercase tracking-wide">
                Meta Description — CTR optimisée
              </span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  metaLen > 155 ? 'bg-red-200 text-red-700' : 'bg-green-200 text-green-700'
                }`}
              >
                {metaLen}/155 car.
              </span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed italic">"{metaDescription}"</p>
          </div>
          <button
            onClick={copyMeta}
            className="shrink-0 flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          >
            {metaCopied ? <CheckCheck size={12} /> : <Copy size={12} />}
            {metaCopied ? 'Copié' : 'Copier'}
          </button>
        </div>
      </div>

      {/* HTML View */}
      {viewMode === 'html' && (
        <div className="bg-gray-950 rounded-2xl overflow-hidden border border-gray-800">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-xs text-gray-400 ml-2 font-mono">article-seo.html</span>
            </div>
            <button
              onClick={copyHtml}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
            >
              {copied ? <CheckCheck size={11} /> : <Copy size={11} />}
              {copied ? 'Copié' : 'Copier tout'}
            </button>
          </div>
          <pre className="text-green-400 text-xs leading-relaxed whitespace-pre-wrap font-mono p-5 overflow-auto max-h-[72vh]">
            {buildHtml()}
          </pre>
        </div>
      )}

      {/* Preview */}
      {viewMode === 'preview' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

          {/* ── MINI ARTICLE ── */}
          {article.isMini ? (
            <div className="px-8 pt-10 pb-10">
              {/* Badge + titre */}
              <div className="flex items-center gap-3 mb-6">
                <span className="text-[9px] font-bold text-white bg-purple-600 px-2 py-1 rounded-md tracking-widest uppercase">
                  Mini Article
                </span>
                <span className="text-[10px] text-gray-400 font-mono">pommeaudevitesse.com</span>
                {article.miniWordCount && (
                  <span className="text-[10px] text-purple-600 font-semibold bg-purple-50 px-2 py-0.5 rounded-full">
                    ~{article.miniWordCount} mots
                  </span>
                )}
              </div>
              <h1 className="text-[26px] font-black text-gray-900 mb-8 leading-tight tracking-tight">
                {h1}
              </h1>

              {/* Contenu mini article */}
              {article.miniContent && article.miniContent.trim().length > 0 ? (
                <div
                  className="prose prose-gray max-w-none
                    text-[15px] text-gray-700 leading-[1.9]
                    [&>h2]:text-[20px] [&>h2]:font-bold [&>h2]:text-gray-900 [&>h2]:mt-8 [&>h2]:mb-3
                    [&>h3]:text-[16px] [&>h3]:font-bold [&>h3]:text-gray-800 [&>h3]:mt-6 [&>h3]:mb-2
                    [&>p]:mb-4 [&>p]:leading-[1.9]
                    [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:space-y-2 [&>ul]:mb-4
                    [&>ol]:list-decimal [&>ol]:pl-6 [&>ol]:space-y-2 [&>ol]:mb-4
                    [&>li]:leading-relaxed
                    [&_strong]:font-bold [&_strong]:text-gray-900
                    [&_a]:text-pink-500 [&_a]:underline [&_a]:font-medium
                    [&>blockquote]:border-l-4 [&>blockquote]:border-green-400 [&>blockquote]:pl-4 [&>blockquote]:py-2 [&>blockquote]:bg-green-50 [&>blockquote]:rounded-r-lg [&>blockquote]:my-4
                    [&>table]:w-full [&>table]:border-collapse [&>table]:text-sm [&>table]:my-4
                    [&_th]:border [&_th]:border-gray-200 [&_th]:bg-gray-50 [&_th]:p-3 [&_th]:text-left [&_th]:font-semibold
                    [&_td]:border [&_td]:border-gray-200 [&_td]:p-3"
                  dangerouslySetInnerHTML={{ __html: article.miniContent }}
                />
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-sm italic">Le contenu n'a pas pu être généré. Réessayez.</p>
                </div>
              )}
            </div>
          ) : (
          <>
          {/* ── ARTICLE COMPLET ── */}

          {/* H1 + Intro */}
          <div className="px-8 pt-10 pb-7 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-5">
              <span className="text-[9px] font-bold text-white bg-gray-700 px-2 py-1 rounded-md tracking-widest uppercase">
                H1
              </span>
              <span className="text-[10px] text-gray-400 font-mono">pommeaudevitesse.com</span>
            </div>
            <h1 className="text-[26px] font-black text-gray-900 mb-6 leading-tight tracking-tight">
              {h1}
            </h1>
            {intro ? (
              <div
                className="text-gray-700 leading-[1.9] text-[15px] [&>p]:mb-3 [&>a]:text-pink-500 [&>a]:underline [&>strong]:font-bold"
                dangerouslySetInnerHTML={{ __html: intro }}
              />
            ) : (
              <p className="text-gray-400 italic text-sm">Introduction non disponible.</p>
            )}
          </div>

          {/* H2 sections */}
          {h2Sections.length === 0 && (
            <div className="px-8 py-10 text-center text-gray-400 italic text-sm">
              Aucune section H2 générée.
            </div>
          )}

          {h2Sections.map((h2) => {
            const question = s(h2.question);
            const h2Intro = s(h2.intro);
            const h3s = safeH3s(h2.h3s);
            const paragraphs = safeParas(h2.paragraphs);
            const tip: Tip | null = h2.tip ?? null;
            const table: ComparisonTable | null = h2.table ?? null;
            const conclusion = s(h2.conclusion);
            const products = safeProducts(h2.products);
            const hasProductGrid = !!h2.hasProductGrid;
            const h2Id = s(h2.id);

            return (
              <div key={h2Id || question} className="border-b border-gray-100 last:border-b-0">

                {/* H2 header */}
                <div className="px-8 pt-8 pb-2 flex items-start gap-3">
                  <span className="text-[9px] font-bold text-green-700 bg-green-100 px-2 py-1 rounded mt-1 shrink-0">
                    H2
                  </span>
                  <div className="flex-1">
                    <h2
                      className="text-[20px] font-bold text-gray-900 leading-snug"
                      dangerouslySetInnerHTML={{ __html: question }}
                    />
                  </div>
                  <button
                    onClick={() => toggleProductGrid(h2Id)}
                    className={`shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all mt-0.5 ${
                      hasProductGrid
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    }`}
                  >
                    <ShoppingCart size={11} />
                    {hasProductGrid ? 'Grille ✓' : '+ Produits'}
                  </button>
                </div>

                <div className="px-8 pb-8 space-y-5">

                  {/* Lead de section */}
                  {h2Intro && (
                    <p
                      className="text-[14px] text-gray-500 leading-relaxed border-l-2 border-gray-200 pl-4 italic"
                      dangerouslySetInnerHTML={{ __html: h2Intro }}
                    />
                  )}

                  {/* H3s */}
                  {h3s.length > 0 && (
                    <div className="space-y-6">
                      {h3s.map((h3, idx) => (
                        <div key={s(h3.id) || idx}>
                          {s(h3.title) && (
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                                H3
                              </span>
                              <h3 className="text-[15px] font-bold text-gray-800 leading-snug">
                                {s(h3.title)}
                              </h3>
                            </div>
                          )}
                          {s(h3.content) && (
                            <div
                              className="text-[14.5px] text-gray-700 leading-[1.85] pl-1 space-y-3
                                [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:space-y-1.5
                                [&>ul>li]:leading-relaxed
                                [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:space-y-1.5
                                [&>p]:leading-[1.85] [&>p]:mb-2
                                [&>strong]:font-bold
                                [&>a]:text-pink-500 [&>a]:underline
                                [&>table]:w-full [&>table]:border-collapse [&>table]:text-sm
                                [&>blockquote]:border-l-4 [&>blockquote]:border-green-400 [&>blockquote]:pl-4 [&>blockquote]:py-1 [&>blockquote]:bg-green-50/50"
                              dangerouslySetInnerHTML={{ __html: s(h3.content) }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Paragraphes fallback (génération locale) */}
                  {paragraphs.length > 0 && (
                    <div className="space-y-4
                      [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:space-y-1.5
                      [&>ol]:list-decimal [&>ol]:pl-5
                      [&>p]:leading-[1.9] [&>p]:text-[15px] [&>p]:text-gray-700
                      [&>strong]:font-bold
                      [&>a]:text-pink-500 [&>a]:underline
                      [&>blockquote]:border-l-4 [&>blockquote]:border-green-400 [&>blockquote]:pl-4 [&>blockquote]:py-2 [&>blockquote]:bg-green-50/60 [&>blockquote]:rounded-r-lg
                      [&>table]:w-full [&>table]:border-collapse">
                      {paragraphs.map((para, i) => {
                        const p = s(para).trim();
                        return p ? (
                          <div
                            key={i}
                            className="text-gray-700 text-[15px] leading-[1.9]"
                            dangerouslySetInnerHTML={{ __html: p }}
                          />
                        ) : null;
                      })}
                    </div>
                  )}

                  {/* Tip — bordure gauche verte */}
                  {tip && s(tip.text) && (
                    <div className="border-l-4 border-green-400 pl-4 py-3 bg-green-50/60 rounded-r-lg">
                      <div className="flex items-start gap-2">
                        <Lightbulb size={14} className="text-green-600 mt-0.5 shrink-0" />
                        <p
                          className="text-[14px] text-gray-700 leading-relaxed [&>strong]:font-bold"
                          dangerouslySetInnerHTML={{ __html: s(tip.text) }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Tableau comparatif */}
                  {table && Array.isArray(table.headers) && table.headers.length > 0 && (
                    <div className="overflow-x-auto rounded-xl border border-gray-200 mt-2">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            {(table.headers || []).map((header, i) => (
                              <th
                                key={i}
                                className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide whitespace-nowrap"
                              >
                                {s(header)}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(table.rows || []).map((row, ri) => (
                            <tr
                              key={ri}
                              className={`border-b border-gray-100 last:border-0 ${
                                ri % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                              }`}
                            >
                              {(row?.cells || []).map((cell, ci) => (
                                <td
                                  key={ci}
                                  className={`px-4 py-3 text-[13.5px] text-gray-700 leading-snug ${
                                    ci === 0 ? 'font-semibold text-gray-900' : ''
                                  }`}
                                >
                                  {s(cell)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Conclusion de section */}
                  {conclusion && (
                    <p
                      className="text-[14px] text-gray-600 leading-[1.85] pt-2 border-t border-gray-100 italic [&>strong]:font-bold [&>a]:text-pink-500 [&>a]:underline"
                      dangerouslySetInnerHTML={{ __html: conclusion }}
                    />
                  )}

                  {/* Product grid */}
                  {hasProductGrid && (
                    <div className="pt-3 border-t border-gray-100">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <ShoppingCart size={13} className="text-green-600" />
                          <span className="text-sm font-bold text-gray-800">
                            Sélection produits
                            <span className="text-xs text-gray-400 font-normal ml-1.5">
                              ({products.filter((p) => p.selected).length} affiché
                              {products.filter((p) => p.selected).length > 1 ? 's' : ''})
                            </span>
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            setProductFormH2(productFormH2 === h2Id ? null : h2Id)
                          }
                          className="flex items-center gap-1 text-xs text-green-700 bg-green-100 hover:bg-green-200 px-3 py-1.5 rounded-lg font-semibold transition-all"
                        >
                          <Plus size={11} /> Ajouter un produit
                        </button>
                      </div>

                      {productFormH2 === h2Id && (
                        <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-200 space-y-3">
                          <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                            Nouveau produit
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            <input
                              placeholder="Nom du produit *"
                              value={newProduct.name}
                              onChange={(e) =>
                                setNewProduct((p) => ({ ...p, name: e.target.value }))
                              }
                              className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                            />
                            <input
                              placeholder="Prix (ex : 49,90 €)"
                              value={newProduct.price}
                              onChange={(e) =>
                                setNewProduct((p) => ({ ...p, price: e.target.value }))
                              }
                              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                            />
                            <input
                              placeholder="URL de l'image"
                              value={newProduct.imageUrl}
                              onChange={(e) =>
                                setNewProduct((p) => ({ ...p, imageUrl: e.target.value }))
                              }
                              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                            />
                            <input
                              placeholder="URL du produit *"
                              value={newProduct.productUrl}
                              onChange={(e) =>
                                setNewProduct((p) => ({ ...p, productUrl: e.target.value }))
                              }
                              className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                            />
                            <div className="flex items-center gap-3 col-span-2">
                              <label className="text-xs text-gray-500 font-medium">
                                Couleur du bouton
                              </label>
                              <input
                                type="color"
                                value={newProduct.color}
                                onChange={(e) =>
                                  setNewProduct((p) => ({ ...p, color: e.target.value }))
                                }
                                className="w-9 h-9 rounded-lg cursor-pointer border-2 border-white shadow"
                              />
                              <span className="text-xs text-gray-400 font-mono">
                                {newProduct.color}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAddProduct(h2Id)}
                              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all"
                            >
                              Ajouter
                            </button>
                            <button
                              onClick={() => setProductFormH2(null)}
                              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-xs font-bold transition-all"
                            >
                              Annuler
                            </button>
                          </div>
                        </div>
                      )}

                      {products.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {products.map((product) => (
                            <div
                              key={product.id}
                              className={`relative rounded-xl border-2 overflow-hidden transition-all ${
                                product.selected
                                  ? 'border-green-400 shadow-sm'
                                  : 'border-gray-200 opacity-50'
                              }`}
                            >
                              <button
                                onClick={() =>
                                  toggleProductSelection(article.id, h2Id, product.id)
                                }
                                className="absolute top-2 left-2 z-10"
                              >
                                <div
                                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
                                    product.selected
                                      ? 'bg-green-500 border-green-500 text-white'
                                      : 'bg-white border-gray-300 text-gray-300'
                                  }`}
                                >
                                  {product.selected ? '✓' : ''}
                                </div>
                              </button>
                              <button
                                onClick={() =>
                                  removeProduct(article.id, h2Id, product.id)
                                }
                                className="absolute top-2 right-2 z-10 w-5 h-5 bg-red-100 hover:bg-red-200 text-red-600 rounded-full flex items-center justify-center transition-all"
                              >
                                <X size={10} />
                              </button>
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-full h-28 object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    `https://placehold.co/300x220/e5e7eb/9ca3af?text=Image`;
                                }}
                              />
                              <div className="p-3">
                                <p className="text-xs font-bold text-gray-900 leading-tight mb-1">
                                  {product.name}
                                </p>
                                {product.price && (
                                  <p className="text-sm font-black text-gray-800 mb-2">
                                    {product.price}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mb-2">
                                  <input
                                    type="color"
                                    value={product.color}
                                    onChange={(e) =>
                                      updateProductColor(
                                        article.id,
                                        h2Id,
                                        product.id,
                                        e.target.value,
                                      )
                                    }
                                    className="w-6 h-6 rounded cursor-pointer border border-gray-200"
                                    title="Couleur du bouton"
                                  />
                                  <span className="text-[10px] text-gray-400">Couleur btn</span>
                                </div>
                                <a
                                  href={product.productUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-center gap-1 w-full text-white text-xs font-bold py-1.5 rounded-lg transition-all hover:opacity-90"
                                  style={{ backgroundColor: product.color }}
                                >
                                  <ExternalLink size={10} /> Voir le produit
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 text-center py-5 italic">
                          Aucun produit ajouté. Cliquez sur "Ajouter un produit" pour commencer.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* FAQ */}
          {faqItems.length > 0 && (
            <div className="border-t border-gray-100">
              <div className="px-8 pt-8 pb-6">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                    <HelpCircle size={15} className="text-purple-600" />
                  </div>
                  <h2 className="text-[22px] font-black text-gray-900 tracking-tight">
                    Questions fréquentes
                  </h2>
                </div>
                <p className="text-[12px] text-gray-400 ml-11">
                  Balisage Schema.org FAQPage inclus dans l'export HTML
                </p>
              </div>

              <div className="px-8 pb-10">
                <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                  {faqItems.map((item, i) => {
                    const isOpen = openFaq === i;
                    const question = s(item.question);
                    const answer = s(item.answer);
                    return (
                      <div
                        key={i}
                        className={`transition-colors ${
                          isOpen ? 'bg-gray-50' : 'bg-white hover:bg-gray-50/50'
                        }`}
                      >
                        <button
                          onClick={() => setOpenFaq(isOpen ? null : i)}
                          className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                        >
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <span className="shrink-0 mt-0.5 w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-[11px] font-black flex items-center justify-center">
                              {i + 1}
                            </span>
                            <span className="text-[15px] font-semibold text-gray-900 leading-snug">
                              {question}
                            </span>
                          </div>
                          <ChevronDown
                            size={16}
                            className={`shrink-0 text-gray-400 transition-transform duration-200 ${
                              isOpen ? 'rotate-180 text-purple-500' : ''
                            }`}
                          />
                        </button>

                        {isOpen && (
                          <div className="px-6 pb-5">
                            <div className="ml-9 border-l-2 border-purple-100 pl-4">
                              <p
                                className="text-[14.5px] text-gray-600 leading-[1.85] [&>strong]:font-bold [&>a]:text-pink-500 [&>a]:underline"
                                dangerouslySetInnerHTML={{ __html: answer }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          </>)}
        </div>
      )}
      {/* ── Concurrent analysé — panneau fixe bas-droite ─────────────────── */}
      {(article.competitorSearchUrl || article.competitorDomain) && (
        <div className="fixed bottom-6 right-6 z-50 w-80 shadow-2xl rounded-2xl border border-orange-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-orange-50 border-b border-orange-100">
            <span className="text-sm font-bold text-orange-700">🔍 Concurrent analysé</span>
            <button
              onClick={() => setShowCompetitor(!showCompetitor)}
              className="text-orange-400 hover:text-orange-600 text-xs font-semibold"
            >
              {showCompetitor ? 'Réduire' : 'Voir'}
            </button>
          </div>
          {showCompetitor && (
            <div className="px-4 py-3 space-y-2.5">
              {article.competitorTitle && (
                <p className="text-xs font-semibold text-gray-800 leading-snug">
                  {article.competitorTitle}
                </p>
              )}
              {article.competitorDomain && (
                <p className="text-[11px] text-orange-600 font-medium">
                  🌐 {article.competitorDomain}
                </p>
              )}
              {Array.isArray(article.competitorAngles) && article.competitorAngles.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Angles analysés :</p>
                  {article.competitorAngles.slice(0, 3).map((angle, i) => (
                    <p key={i} className="text-[11px] text-gray-600 leading-snug flex gap-1.5">
                      <span className="text-orange-400 shrink-0">›</span>
                      {angle}
                    </p>
                  ))}
                </div>
              )}
              <div className="flex gap-2 pt-1">
                {article.competitorSearchUrl && (
                  <a
                    href={article.competitorSearchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 text-[11px] bg-orange-50 hover:bg-orange-100 text-orange-700 font-semibold rounded-lg py-2 px-3 border border-orange-200 transition-colors"
                  >
                    <ExternalLink size={11} />
                    Voir la SERP Google.fr
                  </a>
                )}
                {article.competitorDomain && (
                  <a
                    href={`https://${article.competitorDomain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 text-[11px] bg-gray-50 hover:bg-gray-100 text-gray-600 font-semibold rounded-lg py-2 px-3 border border-gray-200 transition-colors"
                  >
                    <ExternalLink size={11} />
                    Site
                  </a>
                )}
              </div>
              <p className="text-[10px] text-gray-400 italic">
                Article rédigé pour surpasser ce concurrent sur Google France.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Produits pommeaudevitesse.com trouvés ─────────────────────────────── */}
      {siteProducts.length > 0 && (
        <div
          className={`fixed z-50 w-80 shadow-2xl rounded-2xl border border-green-200 bg-white overflow-hidden ${
            competitorUrl ? 'bottom-[calc(6rem+160px)] right-6' : 'bottom-6 right-6'
          }`}
        >
          <div className="flex items-center justify-between px-4 py-3 bg-green-50 border-b border-green-100">
            <span className="text-sm font-bold text-green-700">🛍️ Produits pommeaudevitesse.com</span>
            <button
              onClick={() => setShowProducts(!showProducts)}
              className="text-green-400 hover:text-green-600 text-xs font-semibold"
            >
              {showProducts ? 'Réduire' : 'Voir'}
            </button>
          </div>
          {showProducts && (
            <div className="px-4 py-3 space-y-2 max-h-64 overflow-y-auto">
              {siteProducts.map((p, i) => (
                <div key={i} className="border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 leading-snug line-clamp-2">
                        {p.name}
                      </p>
                      {p.dimensions && (
                        <p className="text-[11px] text-gray-500 mt-0.5">📐 {p.dimensions}</p>
                      )}
                      {p.price && (
                        <p className="text-[11px] font-bold text-green-700 mt-0.5">{p.price}</p>
                      )}
                    </div>
                    {p.url && (
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-green-600 hover:text-green-800"
                      >
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
              <p className="text-[11px] text-gray-400 italic pt-1">
                Produits récupérés sur pommeaudevitesse.com pour enrichir vos sections avec des données réelles.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Produits mis en avant ────────────────────────────────────────── */}
      {featuredProducts.length > 0 && (
        <div
          className={`fixed z-50 w-80 shadow-2xl rounded-2xl border border-amber-200 bg-white overflow-hidden ${
            siteProducts.length > 0 
              ? 'bottom-[calc(6rem+320px)] right-6' 
              : competitorUrl 
              ? 'bottom-[calc(6rem+160px)] right-6' 
              : 'bottom-6 right-6'
          }`}
        >
          <div className="flex items-center justify-between px-4 py-3 bg-amber-50 border-b border-amber-100">
            <span className="text-sm font-bold text-amber-700">🏷️ Produits mis en avant</span>
            <button
              onClick={() => setShowFeaturedProducts(!showFeaturedProducts)}
              className="text-amber-400 hover:text-amber-600 text-xs font-semibold"
            >
              {showFeaturedProducts ? 'Réduire' : 'Voir'}
            </button>
          </div>
          {showFeaturedProducts && (
            <div className="px-4 py-3 space-y-2 max-h-48 overflow-y-auto">
              {featuredProducts.map((p, i) => (
                <div key={i} className="border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 leading-snug">
                        {p.title}
                      </p>
                      {p.description && (
                        <p className="text-[11px] text-gray-500 mt-0.5">{p.description}</p>
                      )}
                    </div>
                    {p.url && (
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-amber-600 hover:text-amber-800"
                      >
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
              <p className="text-[11px] text-gray-400 italic pt-1">
                Produits prioritaires mentionnés dans l'article
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Liens blog (maillage interne) ────────────────────────────────── */}
      {blogLinks.length > 0 && (
        <div
          className={`fixed z-50 w-80 shadow-2xl rounded-2xl border border-blue-200 bg-white overflow-hidden ${
            featuredProducts.length > 0 
              ? 'bottom-[calc(6rem+480px)] right-6'
              : siteProducts.length > 0 
              ? 'bottom-[calc(6rem+320px)] right-6' 
              : competitorUrl 
              ? 'bottom-[calc(6rem+160px)] right-6' 
              : 'bottom-6 right-6'
          }`}
        >
          <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border-b border-blue-100">
            <span className="text-sm font-bold text-blue-700">📝 Maillage interne</span>
            <button
              onClick={() => setShowBlogLinks(!showBlogLinks)}
              className="text-blue-400 hover:text-blue-600 text-xs font-semibold"
            >
              {showBlogLinks ? 'Réduire' : 'Voir'}
            </button>
          </div>
          {showBlogLinks && (
            <div className="px-4 py-3 space-y-2 max-h-48 overflow-y-auto">
              {blogLinks.map((link, i) => (
                <div key={i} className="border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 leading-snug">
                        {link.anchorText}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5 font-mono truncate">
                        {link.url}
                      </p>
                    </div>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              ))}
              <p className="text-[11px] text-gray-400 italic pt-1">
                Liens vers autres articles intégrés naturellement
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
