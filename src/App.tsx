import { useState, Component, ReactNode } from 'react';
import GeneratorForm from './components/GeneratorForm';
import ArticleViewer from './components/ArticleViewer';
import Settings from './components/Settings';
import { useBlogStore } from './store';
import { BlogArticle } from './types';
import {
  LayoutDashboard, PlusCircle, FileText, Trash2,
  ChevronRight, Clock, CheckCircle2, SettingsIcon, Globe,
  AlertTriangle, RefreshCw,
} from 'lucide-react';

type View = 'dashboard' | 'generator' | 'article' | 'settings';

// ─── Error Boundary ───────────────────────────────────────────────────────────
interface EBState { hasError: boolean; error: string }
class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: '' };
  }
  static getDerivedStateFromError(err: Error): EBState {
    return { hasError: true, error: err?.message ?? 'Erreur inconnue' };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-8">
          <div className="bg-white rounded-2xl shadow-lg border border-red-100 p-8 max-w-md w-full text-center">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={28} className="text-red-500" />
            </div>
            <h2 className="text-lg font-black text-gray-900 mb-2">Une erreur est survenue</h2>
            <p className="text-sm text-gray-500 mb-1 leading-relaxed">
              L'affichage de cet article a rencontré un problème. Les données sont toujours sauvegardées.
            </p>
            <p className="text-xs text-red-400 font-mono bg-red-50 rounded-lg px-3 py-2 mb-6 break-all">
              {this.state.error}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: '' });
                window.location.reload();
              }}
              className="flex items-center gap-2 mx-auto bg-gray-900 hover:bg-gray-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
            >
              <RefreshCw size={14} /> Recharger la page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Safe helpers ─────────────────────────────────────────────────────────────
function safeLen(arr: unknown): number {
  return Array.isArray(arr) ? arr.length : 0;
}

function safeArticles(articles: BlogArticle[]): BlogArticle[] {
  if (!Array.isArray(articles)) return [];
  return articles.map((a) => ({
    ...a,
    h1: a?.h1 ?? '',
    metaDescription: a?.metaDescription ?? '',
    intro: a?.intro ?? '',
    anchorText: a?.anchorText ?? '',
    anchorUrl: a?.anchorUrl ?? '',
    h2Sections: Array.isArray(a?.h2Sections) ? a.h2Sections.map((h2) => ({
      ...h2,
      question: h2?.question ?? '',
      intro: h2?.intro ?? '',
      paragraphs: Array.isArray(h2?.paragraphs) ? h2.paragraphs : [],
      conclusion: h2?.conclusion ?? '',
      tip: h2?.tip && typeof h2.tip === 'object' && h2.tip.text ? h2.tip : null,
      table: h2?.table && typeof h2.table === 'object' &&
        Array.isArray(h2.table.headers) && h2.table.headers.length > 0 &&
        Array.isArray(h2.table.rows) && h2.table.rows.length > 0
        ? {
            headers: h2.table.headers.filter((hd: unknown) => typeof hd === 'string'),
            rows: h2.table.rows
              .filter((r: unknown) => r && typeof r === 'object' && Array.isArray((r as {cells: unknown[]}).cells))
              .map((r: {cells: unknown[]}) => ({ cells: r.cells.filter((c: unknown) => typeof c === 'string') as string[] }))
          }
        : null,
      h3s: Array.isArray(h2?.h3s) ? h2.h3s.filter((h3: unknown) => h3 && typeof h3 === 'object') : [],
      hasProductGrid: !!h2?.hasProductGrid,
      products: Array.isArray(h2?.products) ? h2.products : [],
    })) : [],
    faq: Array.isArray(a?.faq) ? a.faq : [],
    slug: a?.slug ?? '',
    createdAt: a?.createdAt ?? new Date().toISOString(),
    status: a?.status ?? 'draft',
  }));
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const { articles: rawArticles, activeArticleId, setActiveArticle, deleteArticle } = useBlogStore();
  const [view, setView] = useState<View>('dashboard');

  const articles = safeArticles(rawArticles);
  const activeArticle = articles.find((a) => a.id === activeArticleId) ?? null;
  const hasApiKey = !!(localStorage.getItem('perplexity_api_key')?.trim());

  function handleNewArticle() {
    setActiveArticle(null);
    setView('generator');
  }

  function handleArticleGenerated(article: BlogArticle) {
    setActiveArticle(article.id);
    setView('article');
  }

  function handleSidebarSelect(id: string) {
    setActiveArticle(id);
    setView('article');
  }

  return (
    <div className="flex min-h-screen bg-gray-50">

      {/* ── Sidebar ── */}
      <aside className="w-72 bg-gray-950 text-white flex flex-col h-screen sticky top-0 shadow-2xl shrink-0">

        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-400 to-teal-600 flex items-center justify-center shadow-lg shrink-0">
              <span className="text-white font-black text-[10px] leading-none text-center">SEO<br/>GEN</span>
            </div>
            <div>
              <h1 className="font-bold text-sm leading-tight text-white">Blog SEO Generator</h1>
              <p className="text-gray-500 text-[10px] mt-0.5">pommeaudevitesse.com</p>
            </div>
          </div>

          {/* AI status */}
          <div className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-1.5 ${hasApiKey ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-gray-800/60 border border-gray-700'}`}>
            <Globe size={10} className={hasApiKey ? 'text-blue-400' : 'text-gray-600'} />
            <span className={`text-[10px] font-semibold ${hasApiKey ? 'text-blue-400' : 'text-gray-600'}`}>
              {hasApiKey ? 'Perplexity AI connectée' : 'IA non configurée'}
            </span>
          </div>
        </div>

        {/* Nav buttons */}
        <div className="px-4 py-3 border-b border-gray-800 space-y-2">
          <button
            onClick={handleNewArticle}
            className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 transition-all text-white text-sm font-bold py-2.5 px-4 rounded-xl shadow-md"
          >
            <PlusCircle size={15} />
            Nouvel article
          </button>
          <button
            onClick={() => setView('settings')}
            className={`w-full flex items-center justify-center gap-2 transition-all text-sm font-semibold py-2 px-4 rounded-xl ${
              view === 'settings'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
            }`}
          >
            <SettingsIcon size={14} />
            Paramètres API
          </button>
        </div>

        {/* Stats */}
        <div className="px-4 py-3 border-b border-gray-800">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Total', value: articles.length, color: 'text-green-400' },
              { label: 'Publiés', value: articles.filter((a) => a.status === 'published').length, color: 'text-blue-400' },
              { label: 'Brouillons', value: articles.filter((a) => a.status === 'draft').length, color: 'text-amber-400' },
            ].map((stat) => (
              <div key={stat.label} className="bg-gray-900 rounded-lg py-2 px-2 text-center">
                <div className={`text-base font-black ${stat.color}`}>{stat.value}</div>
                <div className="text-[9px] text-gray-600 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Article list */}
        <div className="flex-1 overflow-y-auto py-2 px-2">
          {articles.length === 0 ? (
            <div className="text-center text-gray-700 text-xs mt-10 px-4">
              <FileText size={28} className="mx-auto mb-2 opacity-20" />
              <p className="text-gray-600">Aucun article.</p>
              <p className="mt-1 text-gray-700 text-[10px]">Cliquez sur "Nouvel article".</p>
            </div>
          ) : (
            <ul className="space-y-1">
              {articles.map((article) => {
                const isActive = article.id === activeArticleId;
                const date = article.createdAt
                  ? new Date(article.createdAt).toLocaleDateString('fr-FR', {
                      day: '2-digit', month: 'short', year: '2-digit',
                    })
                  : '';
                return (
                  <li key={article.id}>
                    <div
                      onClick={() => handleSidebarSelect(article.id)}
                      className={`group flex items-start gap-2 rounded-xl px-3 py-2.5 cursor-pointer transition-all ${
                        isActive
                          ? 'bg-green-600/20 border border-green-500/40'
                          : 'hover:bg-gray-900 border border-transparent'
                      }`}
                    >
                      <div className="flex-1 min-w-0 mt-0.5">
                        <p className={`text-xs font-semibold leading-snug line-clamp-2 ${
                          isActive ? 'text-green-300' : 'text-gray-200'
                        }`}>
                          {article.h1 || 'Article sans titre'}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <Clock size={9} className="text-gray-700" />
                          <span className="text-[10px] text-gray-600">{date}</span>
                          <span className="text-gray-800">·</span>
                          <span className="text-[10px] text-gray-600">{safeLen(article.h2Sections)} H2</span>
                          {article.status === 'published' ? (
                            <CheckCircle2 size={9} className="text-green-400" />
                          ) : (
                            <span className="text-[9px] text-gray-600 bg-gray-900 px-1.5 py-0.5 rounded">Draft</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 mt-0.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Supprimer "${article.h1}" ?`)) deleteArticle(article.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 p-1 rounded-lg transition-all"
                        >
                          <Trash2 size={11} />
                        </button>
                        <ChevronRight size={11} className={isActive ? 'text-green-400' : 'text-gray-700'} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-800 text-center">
          <p className="text-[10px] text-gray-700">
            Niche <span className="text-gray-500 font-semibold">pommeau de vitesse</span>
          </p>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">

          {/* Top bar */}
          <div className="flex items-center justify-between mb-7">
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">
                {view === 'dashboard' && 'Tableau de bord'}
                {view === 'generator' && 'Nouvel article SEO'}
                {view === 'settings' && 'Paramètres — Perplexity AI'}
                {view === 'article' && (activeArticle?.h1 ?? 'Article')}
              </h2>
              <p className="text-sm text-gray-400 mt-0.5">
                {view === 'dashboard' && `${articles.length} article${articles.length > 1 ? 's' : ''} en bibliothèque`}
                {view === 'generator' && (hasApiKey ? 'Propulsé par Perplexity AI — contenu unique et recherché' : 'Contenu humain, structuré et optimisé Google')}
                {view === 'settings' && 'Configure ta clé API pour activer la génération IA'}
                {view === 'article' && `${safeLen(activeArticle?.h2Sections)} sections · FAQ Schema.org incluse`}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setView('dashboard')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  view === 'dashboard'
                    ? 'bg-gray-900 text-white shadow-md'
                    : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <LayoutDashboard size={14} /> Dashboard
              </button>
              <button
                onClick={() => setView('settings')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  view === 'settings'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <SettingsIcon size={14} /> API
              </button>
              <button
                onClick={handleNewArticle}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-green-600 hover:bg-green-500 text-white shadow transition-all"
              >
                <PlusCircle size={14} /> Nouvel article
              </button>
            </div>
          </div>

          {/* Dashboard */}
          {view === 'dashboard' && (
            <Dashboard
              articles={articles}
              onNew={handleNewArticle}
              onOpen={handleSidebarSelect}
              onSettings={() => setView('settings')}
              hasApiKey={hasApiKey}
              onDelete={deleteArticle}
            />
          )}

          {/* Generator */}
          {view === 'generator' && (
            <GeneratorForm onGenerated={handleArticleGenerated} onGoToSettings={() => setView('settings')} />
          )}

          {/* Settings */}
          {view === 'settings' && <Settings />}

          {/* Article viewer — wrapped in ErrorBoundary */}
          {view === 'article' && activeArticle && (
            <ErrorBoundary key={activeArticle.id}>
              <ArticleViewer article={activeArticle} />
            </ErrorBoundary>
          )}

          {view === 'article' && !activeArticle && (
            <div className="text-center py-20 text-gray-400">
              <FileText size={40} className="mx-auto mb-3 opacity-20" />
              <p className="font-semibold">Article introuvable.</p>
              <p className="text-sm mt-1">Sélectionne un article dans la barre latérale.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({
  articles,
  onNew,
  onOpen,
  onSettings,
  hasApiKey,
  onDelete,
}: {
  articles: BlogArticle[];
  onNew: () => void;
  onOpen: (id: string) => void;
  onSettings: () => void;
  hasApiKey: boolean;
  onDelete: (id: string) => void;
}) {
  if (articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        {!hasApiKey && (
          <div className="w-full max-w-md mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl px-6 py-5 text-left">
            <div className="flex items-center gap-3 mb-2">
              <Globe size={20} className="text-blue-500" />
              <p className="font-bold text-blue-800 text-sm">Active Perplexity AI</p>
            </div>
            <p className="text-xs text-blue-700 leading-relaxed mb-3">
              Connecte ton compte Perplexity Pro pour générer des articles avec de vraies recherches web, un contenu unique et 100% humain.
            </p>
            <button
              onClick={onSettings}
              className="inline-flex items-center gap-2 text-xs font-bold bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-500 transition-colors"
            >
              <SettingsIcon size={12} />
              Configurer la clé API
            </button>
          </div>
        )}
        <div className="w-20 h-20 bg-green-50 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
          <span className="text-4xl">🐱</span>
        </div>
        <h2 className="text-xl font-black text-gray-900 mb-2">Prêt à rédiger ?</h2>
        <p className="text-gray-500 text-sm mb-6 max-w-xs leading-relaxed">
          Génère des articles SEO naturels, structurés et optimisés pour ta boutique de pommeaux de vitesse.
        </p>
        <button
          onClick={onNew}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-lg hover:shadow-xl"
        >
          <PlusCircle size={18} /> Créer mon premier article
        </button>
      </div>
    );
  }

  const totalH2 = articles.reduce((acc, a) => acc + safeLen(a.h2Sections), 0);
  const totalFAQ = articles.reduce((acc, a) => acc + safeLen(a.faq), 0);
  const totalProducts = articles.reduce(
    (acc, a) =>
      acc +
      (Array.isArray(a.h2Sections)
        ? a.h2Sections.reduce((b, h) => b + safeLen(h.products), 0)
        : 0),
    0
  );

  return (
    <div>
      {!hasApiKey && (
        <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl px-5 py-4">
          <div className="flex items-center gap-3">
            <Globe size={20} className="text-blue-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-blue-800">Active Perplexity AI pour des articles de qualité supérieure</p>
              <p className="text-xs text-blue-700 mt-0.5">Recherche web en temps réel, contenu unique, mots-clés placés intelligemment.</p>
            </div>
            <button
              onClick={onSettings}
              className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold bg-blue-600 text-white px-3 py-2 rounded-xl hover:bg-blue-500 transition-colors"
            >
              <SettingsIcon size={11} />
              Configurer
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Articles générés', value: articles.length, emoji: '📝', color: 'from-green-500 to-teal-600' },
          { label: 'Sections H2', value: totalH2, emoji: '📑', color: 'from-blue-500 to-indigo-600' },
          { label: 'Questions FAQ', value: totalFAQ, emoji: '❓', color: 'from-purple-500 to-violet-600' },
          { label: 'Produits ajoutés', value: totalProducts, emoji: '🛍️', color: 'from-amber-500 to-orange-600' },
        ].map((stat) => (
          <div key={stat.label} className={`bg-gradient-to-br ${stat.color} rounded-2xl p-5 text-white shadow-md`}>
            <div className="text-2xl mb-1">{stat.emoji}</div>
            <div className="text-3xl font-black">{stat.value}</div>
            <div className="text-white/70 text-xs mt-1 font-medium">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Article library */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest">
          📚 Bibliothèque d'articles
        </h3>
        <button
          onClick={onNew}
          className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-100 hover:bg-green-200 px-3 py-1.5 rounded-lg transition-all"
        >
          <PlusCircle size={12} /> Nouvel article
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {articles.map((article) => (
          <div
            key={article.id}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group cursor-pointer overflow-hidden"
            onClick={() => onOpen(article.id)}
          >
            <div className={`h-1 ${article.status === 'published' ? 'bg-green-500' : 'bg-amber-400'}`} />
            <div className="p-5">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-sm font-bold text-gray-900 leading-snug line-clamp-2 flex-1 group-hover:text-green-700 transition-colors">
                  {article.h1 || 'Article sans titre'}
                </h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Supprimer "${article.h1}" ?`)) onDelete(article.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all p-1 rounded-lg hover:bg-red-50 shrink-0"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              {article.metaDescription && (
                <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed italic">
                  "{article.metaDescription}"
                </p>
              )}

              <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                  {safeLen(article.h2Sections)} sections
                </span>
                <span>{safeLen(article.faq)} FAQ</span>
                <span className="text-gray-300">·</span>
                {article.createdAt && (
                  <span>
                    {new Date(article.createdAt).toLocaleDateString('fr-FR', {
                      day: '2-digit', month: 'long', year: 'numeric',
                    })}
                  </span>
                )}
                <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  article.status === 'published'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {article.status === 'published' ? '✓ Publié' : '✏️ Brouillon'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
