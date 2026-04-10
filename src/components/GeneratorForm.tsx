import { useState, useEffect } from 'react';
import {
  Sparkles, Link2, Type, Hash, Loader2,
  ChevronDown, ChevronUp, Zap, X,
  CheckCircle2, Lightbulb, HelpCircle, Brain, Bold,
  Globe, FileText, Target
} from 'lucide-react';
import { generateArticleWithClaude, generateMiniArticle, generateShortArticle } from '../services/claude';
import { useBlogStore } from '../store';
import { BlogArticle, FeaturedProduct, BlogLink } from '../types';

interface GeneratorFormProps {
  onGenerated: (article: BlogArticle) => void;
  onGoToSettings: () => void;
}

interface BatchItem {
  h1: string;
}

type Mode = 'single' | 'short' | 'batch' | 'mini';

export default function GeneratorForm({ onGenerated, onGoToSettings }: GeneratorFormProps) {
  const formPreset = useBlogStore((state) => state.formPreset);
  const setFormPreset = useBlogStore((state) => state.setFormPreset);
  const addArticle = useBlogStore((state) => state.addArticle);

  // Single / batch / short shared
  const [h1, setH1] = useState('');
  const [anchorText, setAnchorText] = useState('pommeau de vitesse');
  const [anchorUrl, setAnchorUrl] = useState('https://pommeaudevitesse.com/collections/cuir');
  const [h2Count, setH2Count] = useState(6);
  const [strongCount, setStrongCount] = useState(18);
  const [deepMode, setDeepMode] = useState(false);

  // Mini article
  const [miniH1, setMiniH1] = useState('');
  const [miniAnchorText, setMiniAnchorText] = useState('pommeau de vitesse');
  const [miniAnchorUrl, setMiniAnchorUrl] = useState('https://pommeaudevitesse.com');
  const [miniWordCount, setMiniWordCount] = useState(400);

  // Featured products
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProduct[]>([]);

  // Blog links
  const [blogLinks, setBlogLinks] = useState<BlogLink[]>([]);

  // Charger le preset si disponible
  useEffect(() => {
    if (formPreset) {
      setH1(formPreset.h1);
      setAnchorText(formPreset.anchorText);
      setAnchorUrl(formPreset.anchorUrl);
      setH2Count(formPreset.h2Count);
      setFeaturedProducts(formPreset.featuredProducts);
      setBlogLinks(formPreset.blogLinks);
      setShowAdvanced(true);
      setFormPreset(null);
    }
  }, [formPreset, setFormPreset]);

  // Helper functions for featured products
  function addFeaturedProduct() {
    setFeaturedProducts([...featuredProducts, { id: Date.now().toString(), title: '', url: '' }]);
  }
  function updateFeaturedProduct(idx: number, field: keyof FeaturedProduct, value: string) {
    const updated = [...featuredProducts];
    updated[idx] = { ...updated[idx], [field]: value };
    setFeaturedProducts(updated);
  }
  function removeFeaturedProduct(idx: number) {
    setFeaturedProducts(featuredProducts.filter((_, i) => i !== idx));
  }

  // Helper functions for blog links
  function addBlogLink() {
    setBlogLinks([...blogLinks, { id: Date.now().toString(), anchorText: '', url: '' }]);
  }
  function updateBlogLink(idx: number, field: keyof BlogLink, value: string) {
    const updated = [...blogLinks];
    updated[idx] = { ...updated[idx], [field]: value };
    setBlogLinks(updated);
  }
  function removeBlogLink(idx: number) {
    setBlogLinks(blogLinks.filter((_, i) => i !== idx));
  }

  // Mode
  const [mode, setMode] = useState<Mode>('single');

  // AI
  const [hasApiKey] = useState(true);
  const [useAI, setUseAI] = useState(true);

  // Batch
  const [batchItems, setBatchItems] = useState<BatchItem[]>([{ h1: '' }, { h1: '' }, { h1: '' }]);

  // Progress
  const [generating, setGenerating] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [progressPct, setProgressPct] = useState(0);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const effectiveUseAI = useAI && hasApiKey;

  // ── Single article (complet) ────────────────────────────────────────────────
  async function handleGenerate() {
    if (!h1.trim()) return;
    setGenerating(true);
    setProgressMsg('Initialisation…');
    setProgressPct(0);
    try {
      const article = await generateArticleWithClaude(
        h1.trim(), anchorText, anchorUrl, h2Count, deepMode,
        (step, pct) => { setProgressMsg(step); setProgressPct(pct); },
        featuredProducts, blogLinks
      );
      addArticle(article);
      onGenerated(article);
      setH1('');
      setFeaturedProducts([]);
      setBlogLinks([]);
    } finally {
      setGenerating(false);
      setProgressMsg('');
      setProgressPct(0);
    }
  }

  // ── Short article (court et efficace) ───────────────────────────────────────
  async function handleShortGenerate() {
    if (!h1.trim()) return;
    setGenerating(true);
    setProgressMsg('Initialisation…');
    setProgressPct(0);
    try {
      const article = await generateShortArticle(
        h1.trim(), anchorText, anchorUrl,
        (step, pct) => { setProgressMsg(step); setProgressPct(pct); },
        featuredProducts, blogLinks
      );
      addArticle(article);
      onGenerated(article);
      setH1('');
      setFeaturedProducts([]);
      setBlogLinks([]);
    } finally {
      setGenerating(false);
      setProgressMsg('');
      setProgressPct(0);
    }
  }

  // ── Mini article ────────────────────────────────────────────────────────────
  async function handleMiniGenerate() {
    if (!miniH1.trim()) return;
    setGenerating(true);
    setProgressMsg('Initialisation…');
    setProgressPct(0);
    try {
      const article = await generateMiniArticle(
        miniH1.trim(), miniAnchorText, miniAnchorUrl, miniWordCount,
        (step, pct) => { setProgressMsg(step); setProgressPct(pct); },
        deepMode, featuredProducts, blogLinks
      );
      addArticle(article);
      onGenerated(article);
      setMiniH1('');
      setFeaturedProducts([]);
      setBlogLinks([]);
    } finally {
      setGenerating(false);
      setProgressMsg('');
      setProgressPct(0);
    }
  }

  // ── Batch ───────────────────────────────────────────────────────────────────
  async function handleBatchGenerate() {
    const validItems = batchItems.filter((i) => i.h1.trim());
    if (validItems.length === 0) return;
    setGenerating(true);
    setBatchProgress({ current: 0, total: validItems.length });
    let lastArticle: BlogArticle | null = null;
    for (let i = 0; i < validItems.length; i++) {
      setBatchProgress({ current: i + 1, total: validItems.length });
      setProgressPct(0);
      const article = await generateArticleWithClaude(
        validItems[i].h1.trim(), anchorText, anchorUrl, h2Count, deepMode,
        (step, pct) => { setProgressMsg(`[${i + 1}/${validItems.length}] ${step}`); setProgressPct(pct); },
        featuredProducts, blogLinks
      );
      addArticle(article);
      lastArticle = article;
    }
    if (lastArticle) onGenerated(lastArticle);
    setGenerating(false);
    setProgressMsg('');
    setProgressPct(0);
    setBatchProgress(null);
  }

  function addBatchItem() { setBatchItems((prev) => [...prev, { h1: '' }]); }
  function removeBatchItem(idx: number) { setBatchItems((prev) => prev.filter((_, i) => i !== idx)); }
  function updateBatchItem(idx: number, val: string) {
    setBatchItems((prev) => prev.map((item, i) => (i === idx ? { h1: val } : item)));
  }
  const validBatchCount = batchItems.filter((i) => i.h1.trim()).length;

  const isMiniMode = mode === 'mini';
  const isShortMode = mode === 'short';

  // Colors by mode
  const accentColor = isMiniMode ? 'purple' : isShortMode ? 'orange' : effectiveUseAI ? 'blue' : deepMode ? 'indigo' : 'green';

  const colorMap: Record<string, { btn: string; bar: string; text: string; bg: string; border: string }> = {
    purple: { btn: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500', bar: 'bg-purple-500', text: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-100' },
    orange: { btn: 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400', bar: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-100' },
    blue: { btn: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500', bar: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-100' },
    indigo: { btn: 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500', bar: 'bg-indigo-500', text: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-100' },
    green: { btn: 'bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500', bar: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50', border: 'border-green-100' },
  };
  const c = colorMap[accentColor];

  function handleSubmit() {
    if (mode === 'mini') return handleMiniGenerate();
    if (mode === 'short') return handleShortGenerate();
    if (mode === 'batch') return handleBatchGenerate();
    return handleGenerate();
  }

  const canSubmit = mode === 'mini' ? !!miniH1.trim() : mode === 'batch' ? validBatchCount > 0 : !!h1.trim();

  return (
    <div className="max-w-2xl mx-auto space-y-4">

      {/* AI Banner */}
      <div className={`rounded-2xl border px-5 py-4 ${effectiveUseAI ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${effectiveUseAI ? 'bg-blue-500' : 'bg-gray-400'}`}>
            <Globe size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-gray-800">{effectiveUseAI ? 'Claude AI + Recherche Web' : 'Mode local activé'}</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${effectiveUseAI ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'}`}>
                {effectiveUseAI ? 'claude-haiku-4.5' : 'génération locale'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {effectiveUseAI ? 'Recherche web activée pour des infos réelles et vérifiées.' : 'Génération rapide sans appel API.'}
            </p>
          </div>
        </div>
      </div>

      {/* What gets generated - SHORT MODE */}
      {isShortMode && (
        <div className="bg-white rounded-2xl border border-orange-100 shadow-sm px-6 py-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Article Court — Ce que tu obtiens</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: <Target size={13} className="text-orange-500" />, label: 'Réponse IMMÉDIATE dès la 1ère phrase' },
              { icon: <CheckCircle2 size={13} className="text-orange-500" />, label: '3 sections H2 maximum' },
              { icon: <Globe size={13} className="text-orange-500" />, label: 'Recherche web pour infos réelles' },
              { icon: <CheckCircle2 size={13} className="text-orange-500" />, label: '400-700 mots (pas de remplissage)' },
              { icon: <CheckCircle2 size={13} className="text-orange-500" />, label: '1 tableau comparatif' },
              { icon: <HelpCircle size={13} className="text-orange-500" />, label: '2 FAQ courtes' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                {item.icon}
                <span className="text-xs text-gray-600">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* What gets generated - FULL MODE */}
      {mode === 'single' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Article Complet — Ce que tu obtiens</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: <CheckCircle2 size={13} className="text-green-500" />, label: 'Introduction (~80 mots)' },
              { icon: <CheckCircle2 size={13} className="text-green-500" />, label: `${h2Count} sections H2` },
              { icon: <Globe size={13} className="text-blue-500" />, label: 'Recherche web pour infos réelles' },
              { icon: <Lightbulb size={13} className="text-amber-500" />, label: 'Tips pratiques' },
              { icon: <CheckCircle2 size={13} className="text-green-500" />, label: 'H3 + listes à puces' },
              { icon: <CheckCircle2 size={13} className="text-green-500" />, label: '2 tableaux comparatifs' },
              { icon: <HelpCircle size={13} className="text-purple-500" />, label: 'FAQ Schema.org (4 questions)' },
              { icon: <CheckCircle2 size={13} className="text-green-500" />, label: 'Meta description 155 car.' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                {item.icon}
                <span className="text-xs text-gray-600">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mini article info */}
      {isMiniMode && (
        <div className="bg-white rounded-2xl border border-purple-100 shadow-sm px-6 py-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Mini Article — Ce que tu obtiens</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: <CheckCircle2 size={13} className="text-purple-500" />, label: `${miniWordCount} mots denses` },
              { icon: <CheckCircle2 size={13} className="text-purple-500" />, label: '1 maillage interne' },
              { icon: <Globe size={13} className="text-purple-500" />, label: 'Recherche web activée' },
              { icon: <CheckCircle2 size={13} className="text-purple-500" />, label: 'Mots-clés en <strong>' },
              { icon: <CheckCircle2 size={13} className="text-purple-500" />, label: 'Meta description CTR' },
              { icon: <CheckCircle2 size={13} className="text-purple-500" />, label: 'Zéro remplissage' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                {item.icon}
                <span className="text-xs text-gray-600">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main form */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-5">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isMiniMode ? 'bg-purple-400/20' : isShortMode ? 'bg-orange-400/20' : 'bg-green-400/20'}`}>
              {isMiniMode ? <FileText size={20} className="text-purple-400" /> : isShortMode ? <Target size={20} className="text-orange-400" /> : <Sparkles size={20} className="text-green-400" />}
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">
                {isMiniMode ? 'Mini Article' : isShortMode ? 'Article Court' : 'Générateur SEO'}
              </h2>
              <p className="text-gray-400 text-xs">
                {isMiniMode ? '300-500 mots · dense · percutant' : isShortMode ? '400-700 mots · réponse directe · efficace' : 'Article complet avec recherche web'}
              </p>
            </div>
          </div>

          {/* Mode switch */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setMode('single')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'single' ? 'bg-green-500 text-white shadow-md' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
            >
              <Type size={14} /> Complet
            </button>
            <button
              onClick={() => setMode('short')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'short' ? 'bg-orange-500 text-white shadow-md' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
            >
              <Target size={14} /> Court
            </button>
            <button
              onClick={() => setMode('batch')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'batch' ? 'bg-green-500 text-white shadow-md' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
            >
              <Zap size={14} /> En masse
            </button>
            <button
              onClick={() => setMode('mini')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'mini' ? 'bg-purple-500 text-white shadow-md' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
            >
              <FileText size={14} /> Mini
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">

          {/* ── MINI ARTICLE FORM ── */}
          {isMiniMode && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  <Type size={13} className="inline mr-1.5 text-purple-500" />
                  Sujet du mini article *
                </label>
                <input
                  type="text"
                  value={miniH1}
                  onChange={(e) => setMiniH1(e.target.value)}
                  placeholder="Ex: Pourquoi choisir un pommeau adapté ?"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-gray-50 placeholder-gray-400"
                  onKeyDown={(e) => e.key === 'Enter' && !generating && handleMiniGenerate()}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  <FileText size={13} className="inline mr-1.5 text-purple-500" />
                  Nombre de mots — <span className="font-black text-purple-700">{miniWordCount}</span>
                </label>
                <input type="range" min={300} max={500} step={25} value={miniWordCount} onChange={(e) => setMiniWordCount(Number(e.target.value))} className="w-full accent-purple-500" />
              </div>
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-100 space-y-3">
                <p className="text-xs font-bold text-purple-700 flex items-center gap-1.5"><Link2 size={11} /> Maillage interne</p>
                <input type="text" value={miniAnchorText} onChange={(e) => setMiniAnchorText(e.target.value)} placeholder="Texte ancre" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" />
                <input type="url" value={miniAnchorUrl} onChange={(e) => setMiniAnchorUrl(e.target.value)} placeholder="URL" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" />
              </div>
            </div>
          )}

          {/* ── SINGLE + SHORT ARTICLE FORM ── */}
          {(mode === 'single' || mode === 'short') && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                <Type size={13} className={`inline mr-1.5 ${isShortMode ? 'text-orange-500' : 'text-green-500'}`} />
                H1 de l'article *
              </label>
              <input
                type="text"
                value={h1}
                onChange={(e) => setH1(e.target.value)}
                placeholder="Ex: Comment changer le pommeau de vitesse 207 ?"
                className={`w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 bg-gray-50 placeholder-gray-400 ${isShortMode ? 'focus:ring-orange-400' : 'focus:ring-green-400'}`}
                onKeyDown={(e) => e.key === 'Enter' && !generating && handleSubmit()}
              />
              {isShortMode && (
                <p className="text-xs text-orange-600 mt-1.5 font-medium">💡 L'article répondra DIRECTEMENT à cette question dès la première phrase.</p>
              )}
            </div>
          )}

          {/* ── BATCH FORM ── */}
          {mode === 'batch' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Zap size={13} className="inline mr-1.5 text-green-500" />
                H1 des articles ({validBatchCount} valide{validBatchCount > 1 ? 's' : ''})
              </label>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {batchItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-6 shrink-0 text-right font-mono">#{idx + 1}</span>
                    <input type="text" value={item.h1} onChange={(e) => updateBatchItem(idx, e.target.value)} placeholder={`Titre ${idx + 1}…`} className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-400 bg-gray-50" />
                    {batchItems.length > 1 && (
                      <button onClick={() => removeBatchItem(idx)} className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50"><X size={13} /></button>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={addBatchItem} className="mt-3 text-green-600 hover:text-green-700 text-sm font-semibold">+ Ajouter un H1</button>
            </div>
          )}

          {/* Advanced options — single + short + batch */}
          {!isMiniMode && (
            <div>
              <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 font-medium">
                {showAdvanced ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                Options avancées
              </button>

              {showAdvanced && (
                <div className="mt-3 space-y-4 bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1"><Link2 size={11} className="inline mr-1" /> Texte ancre</label>
                    <input type="text" value={anchorText} onChange={(e) => setAnchorText(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1"><Link2 size={11} className="inline mr-1" /> URL lien interne</label>
                    <input type="url" value={anchorUrl} onChange={(e) => setAnchorUrl(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" />
                  </div>

                  {/* Featured Products */}
                  <div className="space-y-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-gray-900">🏷️ Produits à mettre en avant</label>
                      <button type="button" onClick={addFeaturedProduct} className="text-xs text-amber-600 hover:text-amber-700 font-medium px-2 py-1 hover:bg-amber-100 rounded">+ Ajouter</button>
                    </div>
                    {featuredProducts.map((product, idx) => (
                      <div key={product.id} className="flex gap-2">
                        <input type="text" placeholder="Titre produit" value={product.title} onChange={(e) => updateFeaturedProduct(idx, 'title', e.target.value)} className="flex-1 px-2 py-1.5 text-xs border border-amber-300 rounded" />
                        <input type="text" placeholder="URL" value={product.url} onChange={(e) => updateFeaturedProduct(idx, 'url', e.target.value)} className="flex-1 px-2 py-1.5 text-xs border border-amber-300 rounded" />
                        <button type="button" onClick={() => removeFeaturedProduct(idx)} className="px-2 text-red-600 hover:bg-red-50 rounded"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>

                  {/* Blog Links */}
                  <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-gray-900">📝 Liens vers autres articles</label>
                      <button type="button" onClick={addBlogLink} className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 hover:bg-blue-100 rounded">+ Ajouter</button>
                    </div>
                    {blogLinks.map((link, idx) => (
                      <div key={link.id} className="flex gap-2">
                        <input type="text" placeholder="Texte ancre" value={link.anchorText} onChange={(e) => updateBlogLink(idx, 'anchorText', e.target.value)} className="flex-1 px-2 py-1.5 text-xs border border-blue-300 rounded" />
                        <input type="text" placeholder="URL" value={link.url} onChange={(e) => updateBlogLink(idx, 'url', e.target.value)} className="flex-1 px-2 py-1.5 text-xs border border-blue-300 rounded" />
                        <button type="button" onClick={() => removeBlogLink(idx)} className="px-2 text-red-600 hover:bg-red-50 rounded"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>

                  {/* H2 count - only for single/batch */}
                  {mode !== 'short' && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        <Hash size={11} className="inline mr-1" /> Sections H2 — <span className="font-black text-green-700">{h2Count}</span>
                      </label>
                      <input type="range" min={3} max={10} value={h2Count} onChange={(e) => setH2Count(Number(e.target.value))} className="w-full accent-green-500" />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Progress bar */}
          {generating && (
            <div className={`rounded-xl p-4 border ${c.bg} ${c.border}`}>
              {batchProgress && (
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-bold ${c.text}`}>Article {batchProgress.current} / {batchProgress.total}</span>
                </div>
              )}
              <div className="flex items-center gap-2 mb-2">
                <Loader2 size={13} className={`animate-spin shrink-0 ${c.text}`} />
                <span className={`text-xs font-medium ${c.text}`}>{progressMsg}</span>
              </div>
              <div className={`w-full rounded-full h-1.5 bg-gray-200`}>
                <div className={`h-1.5 rounded-full transition-all duration-500 ${c.bar}`} style={{ width: `${progressPct}%` }} />
              </div>
              <div className={`text-right text-xs mt-1 font-semibold ${c.text}`}>{progressPct}%</div>
            </div>
          )}

          {/* CTA */}
          <button
            onClick={handleSubmit}
            disabled={generating || !canSubmit}
            className={`w-full disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg text-sm ${c.btn}`}
          >
            {generating ? (
              <><Loader2 size={16} className="animate-spin" /> Génération en cours…</>
            ) : (
              <>
                {isMiniMode ? <FileText size={16} /> : isShortMode ? <Target size={16} /> : <Globe size={16} />}
                {isMiniMode ? `Générer mini (${miniWordCount} mots)` : isShortMode ? 'Générer article court' : mode === 'batch' ? `Générer ${validBatchCount} article${validBatchCount > 1 ? 's' : ''}` : 'Générer article complet'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
