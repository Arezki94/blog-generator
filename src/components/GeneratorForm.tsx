import { useState, useEffect } from 'react';
import {
  Sparkles, Link2, Type, Hash, Loader2,
  ChevronDown, ChevronUp, Zap, X,
  CheckCircle2, Lightbulb, HelpCircle, Brain, Bold,
  Globe, AlertTriangle, Settings, FileText
} from 'lucide-react';
import { generateFullArticle } from '../generator';
import { generateArticleWithClaude, generateMiniArticle } from '../services/claude';
import { useBlogStore } from '../store';
import { BlogArticle, FeaturedProduct, BlogLink } from '../types';

interface GeneratorFormProps {
  onGenerated: (article: BlogArticle) => void;
  onGoToSettings: () => void;
}

interface BatchItem {
  h1: string;
}

type Mode = 'single' | 'batch' | 'mini';

export default function GeneratorForm({ onGenerated, onGoToSettings }: GeneratorFormProps) {
  // ✅ FIX ZUSTAND: Sélecteurs individuels pour déclencher le re-render
  const formPreset = useBlogStore((state) => state.formPreset);
  const setFormPreset = useBlogStore((state) => state.setFormPreset);
  const addArticle = useBlogStore((state) => state.addArticle);

  // Single / batch shared
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

  // Featured products (produits à mettre en avant)
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProduct[]>([]);

  // Blog links (liens vers autres articles)
  const [blogLinks, setBlogLinks] = useState<BlogLink[]>([]);

  // Charger le preset si disponible (pour régénération)
  useEffect(() => {
    console.log('🔄 useEffect formPreset déclenché, formPreset =', formPreset);
    
    if (formPreset) {
      console.log('📥 Chargement du preset...');
      setH1(formPreset.h1);
      setAnchorText(formPreset.anchorText);
      setAnchorUrl(formPreset.anchorUrl);
      setH2Count(formPreset.h2Count);
      setFeaturedProducts(formPreset.featuredProducts);
      setBlogLinks(formPreset.blogLinks);
      setShowAdvanced(true); // Ouvrir les options avancées
      console.log('✅ Formulaire pré-rempli !');
      
      // Clear le preset après chargement
      setFormPreset(null);
      console.log('🗑️ Preset cleared');
    }
  }, [formPreset, setFormPreset]);

  // Helper functions for featured products
  function addFeaturedProduct() {
    setFeaturedProducts([...featuredProducts, {
      id: Date.now().toString(),
      title: '',
      url: ''
    }]);
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
    setBlogLinks([...blogLinks, {
      id: Date.now().toString(),
      anchorText: '',
      url: ''
    }]);
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

  // AI - Toujours activé car le proxy Railway gère la clé
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

  // ── Single article ──────────────────────────────────────────────────────────
  async function handleGenerate() {
    if (!h1.trim()) return;
    setGenerating(true);
    setProgressMsg('Initialisation…');
    setProgressPct(0);
    try {
      const article = await generateArticleWithClaude(
        h1.trim(), anchorText, anchorUrl, h2Count, deepMode,
        (step, pct) => { setProgressMsg(step); setProgressPct(pct); },
        featuredProducts,
        blogLinks
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
        deepMode,
        featuredProducts,
        blogLinks
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
        featuredProducts,
        blogLinks
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

  // Colors by mode
  const accentColor = isMiniMode
    ? 'purple'
    : effectiveUseAI
    ? 'blue'
    : deepMode
    ? 'indigo'
    : 'green';

  const colorMap: Record<string, { btn: string; bar: string; text: string; bg: string; border: string }> = {
    purple: {
      btn: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500',
      bar: 'bg-purple-500',
      text: 'text-purple-700',
      bg: 'bg-purple-50',
      border: 'border-purple-100',
    },
    blue: {
      btn: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500',
      bar: 'bg-blue-500',
      text: 'text-blue-700',
      bg: 'bg-blue-50',
      border: 'border-blue-100',
    },
    indigo: {
      btn: 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500',
      bar: 'bg-indigo-500',
      text: 'text-indigo-700',
      bg: 'bg-indigo-50',
      border: 'border-indigo-100',
    },
    green: {
      btn: 'bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500',
      bar: 'bg-green-500',
      text: 'text-green-700',
      bg: 'bg-green-50',
      border: 'border-green-100',
    },
  };
  const c = colorMap[accentColor];

  function handleSubmit() {
    if (mode === 'mini') return handleMiniGenerate();
    if (mode === 'batch') return handleBatchGenerate();
    return handleGenerate();
  }

  const canSubmit = mode === 'mini'
    ? !!miniH1.trim()
    : mode === 'batch'
    ? validBatchCount > 0
    : !!h1.trim();

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
              <p className="text-sm font-bold text-gray-800">{effectiveUseAI ? 'Claude AI activée' : 'Mode local activé'}</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${effectiveUseAI ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'}`}>
                {effectiveUseAI ? 'claude-3-haiku' : 'génération locale'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {effectiveUseAI ? 'Analyse le concurrent n°1 sur Google.fr, puis rédige un article meilleur, plus dense et plus utile.' : 'Génération rapide sans appel API.'}
            </p>
            <button onClick={() => setUseAI((v) => !v)} className={`mt-2 inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${effectiveUseAI ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              <Globe size={11} /> {effectiveUseAI ? 'Passer en mode local' : 'Activer Claude AI'}
            </button>
          </div>
        </div>
      </div>

      {/* What gets generated */}
      {!isMiniMode && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Chaque article contient</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: <CheckCircle2 size={13} className="text-green-500" />, label: 'Introduction 100% humaine (~80 mots)' },
              { icon: <CheckCircle2 size={13} className="text-green-500" />, label: `${h2Count} sections H2 questions` },
              { icon: <Globe size={13} className={effectiveUseAI ? 'text-orange-500' : 'text-gray-300'} />, label: effectiveUseAI ? 'Analyse SERP concurrent n°1 battu' : 'Contenu local optimisé' },
              { icon: <Lightbulb size={13} className="text-amber-500" />, label: 'Tips avec bordure gauche dosés' },
              { icon: <CheckCircle2 size={13} className="text-green-500" />, label: 'H3 + listes à puces' },
              { icon: <CheckCircle2 size={13} className="text-green-500" />, label: '2 tableaux comparatifs minimum' },
              { icon: <HelpCircle size={13} className="text-purple-500" />, label: 'FAQ Schema.org (rich snippets)' },
              { icon: <CheckCircle2 size={13} className="text-green-500" />, label: 'Meta description CTR 155 car.' },
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
              { icon: <CheckCircle2 size={13} className="text-purple-500" />, label: `${miniWordCount} mots denses et percutants` },
              { icon: <CheckCircle2 size={13} className="text-purple-500" />, label: '1 maillage interne naturel au choix' },
              { icon: <Globe size={13} className={effectiveUseAI ? 'text-orange-500' : 'text-gray-300'} />, label: effectiveUseAI ? 'Analyse site pommeaudevitesse.com + meilleurs articles courts' : 'Contenu local optimisé' },
              { icon: <CheckCircle2 size={13} className="text-purple-500" />, label: 'Mots-clés sémantiques en <strong>' },
              { icon: <CheckCircle2 size={13} className="text-purple-500" />, label: 'Meta description 155 car. CTR' },
              { icon: <CheckCircle2 size={13} className="text-purple-500" />, label: 'Zéro remplissage, 100% valeur' },
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
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isMiniMode ? 'bg-purple-400/20' : 'bg-green-400/20'}`}>
              {isMiniMode ? <FileText size={20} className="text-purple-400" /> : <Sparkles size={20} className="text-green-400" />}
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">
                {isMiniMode ? 'Mini Article SEO' : 'Générateur SEO'}
              </h2>
              <p className="text-gray-400 text-xs">
                {isMiniMode
                  ? `300 à 500 mots · dense · percutant · pommeaudevitesse.com`
                  : effectiveUseAI
                  ? 'Propulsé par Claude AI — claude-3-haiku'
                  : 'Génération locale — pommeaudevitesse.com'}
              </p>
            </div>
          </div>

          {/* Mode switch */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setMode('single')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'single' ? 'bg-green-500 text-white shadow-md' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
            >
              <Type size={14} /> Article complet
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
              <FileText size={14} /> Mini article
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">

          {/* Deep mode — hidden for mini */}
          {!isMiniMode && (
            <div
              onClick={() => setDeepMode((v) => !v)}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 cursor-pointer border-2 transition-all select-none ${deepMode ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'}`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${deepMode ? 'bg-indigo-500' : 'bg-gray-200'}`}>
                <Brain size={18} className={deepMode ? 'text-white' : 'text-gray-500'} />
              </div>
              <div className="flex-1">
                <p className={`text-sm font-bold leading-tight ${deepMode ? 'text-indigo-800' : 'text-gray-700'}`}>
                  Mode Réflexion {deepMode ? 'activé' : 'désactivé'}
                </p>
                <p className={`text-xs mt-0.5 ${deepMode ? 'text-indigo-600' : 'text-gray-400'}`}>
                  {deepMode ? 'Prompts enrichis, analyse approfondie, paragraphes plus longs' : 'Génération rapide, idéal pour un volume élevé'}
                </p>
              </div>
              <div className={`w-10 h-5 rounded-full transition-all relative shrink-0 ${deepMode ? 'bg-indigo-500' : 'bg-gray-300'}`}>
                <div className={`w-4 h-4 rounded-full bg-white shadow absolute top-0.5 transition-all ${deepMode ? 'left-5' : 'left-0.5'}`} />
              </div>
            </div>
          )}

          {/* ── MINI ARTICLE FORM ── */}
          {isMiniMode && (
            <div className="space-y-4">
              {/* H1 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  <Type size={13} className="inline mr-1.5 text-purple-500" />
                  Sujet du mini article *
                </label>
                <input
                  type="text"
                  value={miniH1}
                  onChange={(e) => setMiniH1(e.target.value)}
                  placeholder="Ex: Pourquoi choisir un pommeau de vitesse adapté ?"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-gray-50 placeholder-gray-400 transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && !generating && handleMiniGenerate()}
                />
              </div>

              {/* Word count slider */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  <FileText size={13} className="inline mr-1.5 text-purple-500" />
                  Nombre de mots — <span className="font-black text-purple-700">{miniWordCount} mots</span>
                </label>
                <input
                  type="range"
                  min={300}
                  max={500}
                  step={25}
                  value={miniWordCount}
                  onChange={(e) => setMiniWordCount(Number(e.target.value))}
                  className="w-full accent-purple-500"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                  <span>300 (très court)</span>
                  <span>400 (recommandé)</span>
                  <span>500 (court)</span>
                </div>
              </div>

              {/* Anchor */}
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-100 space-y-3">
                <p className="text-xs font-bold text-purple-700 flex items-center gap-1.5">
                  <Link2 size={11} /> Maillage interne (lien naturel dans l'article)
                </p>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Texte de l'ancre</label>
                  <input
                    type="text"
                    value={miniAnchorText}
                    onChange={(e) => setMiniAnchorText(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">URL du lien</label>
                  <input
                    type="url"
                    value={miniAnchorUrl}
                    onChange={(e) => setMiniAnchorUrl(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── SINGLE ARTICLE FORM ── */}
          {mode === 'single' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                <Type size={13} className="inline mr-1.5 text-green-500" />
                H1 de l'article *
              </label>
              <input
                type="text"
                value={h1}
                onChange={(e) => setH1(e.target.value)}
                placeholder="Ex: Comment choisir le meilleur pommeau de vitesse ?"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent bg-gray-50 placeholder-gray-400 transition-all"
                onKeyDown={(e) => e.key === 'Enter' && !generating && handleGenerate()}
              />
              <p className="text-xs text-gray-400 mt-1.5">Rédigez votre H1 comme un sujet d'article clair et précis.</p>
            </div>
          )}

          {/* ── BATCH FORM ── */}
          {mode === 'batch' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Zap size={13} className="inline mr-1.5 text-green-500" />
                H1 des articles à générer
                <span className="ml-2 text-xs text-gray-400 font-normal">({validBatchCount} valide{validBatchCount > 1 ? 's' : ''})</span>
              </label>
              {effectiveUseAI && (
                <div className="mb-3 flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                  <Globe size={12} className="text-blue-500 shrink-0" />
                  <p className="text-xs text-blue-700">En mode IA, chaque article est généré séquentiellement. Prévois ~30-60 secondes par article.</p>
                </div>
              )}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {batchItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-6 shrink-0 text-right font-mono">#{idx + 1}</span>
                    <input
                      type="text"
                      value={item.h1}
                      onChange={(e) => updateBatchItem(idx, e.target.value)}
                      placeholder={`Titre de l'article ${idx + 1}…`}
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50 placeholder-gray-400 transition-all"
                    />
                    {batchItems.length > 1 && (
                      <button onClick={() => removeBatchItem(idx)} className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-all">
                        <X size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={addBatchItem} className="mt-3 text-green-600 hover:text-green-700 text-sm font-semibold flex items-center gap-1 transition-colors">
                + Ajouter un H1
              </button>
            </div>
          )}

          {/* Advanced options — single + batch only */}
          {!isMiniMode && (
            <div>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
              >
                {showAdvanced ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                Options avancées — lien interne &amp; structure
              </button>

              {showAdvanced && (
                <div className="mt-3 space-y-4 bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      <Link2 size={11} className="inline mr-1 text-green-500" /> Texte de l'ancre
                    </label>
                    <input type="text" value={anchorText} onChange={(e) => setAnchorText(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      <Link2 size={11} className="inline mr-1 text-green-500" /> URL du lien interne
                    </label>
                    <input type="url" value={anchorUrl} onChange={(e) => setAnchorUrl(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white transition-all" />
                  </div>

                  {/* Featured Products */}
                  <div className="space-y-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-gray-900">
                        🏷️ Produits à mettre en avant (optionnel)
                      </label>
                      <button
                        type="button"
                        onClick={addFeaturedProduct}
                        className="text-xs text-amber-600 hover:text-amber-700 font-medium px-2 py-1 hover:bg-amber-100 rounded"
                      >
                        + Ajouter
                      </button>
                    </div>
                    <p className="text-xs text-gray-600">
                      Produits de votre boutique à mentionner naturellement
                    </p>
                    {featuredProducts.map((product, idx) => (
                      <div key={product.id} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Titre (ex: Pommeau Cuir Premium)"
                          value={product.title}
                          onChange={(e) => updateFeaturedProduct(idx, 'title', e.target.value)}
                          className="flex-1 px-2 py-1.5 text-xs border border-amber-300 rounded focus:ring-1 focus:ring-amber-500 focus:border-transparent"
                        />
                        <input
                          type="text"
                          placeholder="URL produit"
                          value={product.url}
                          onChange={(e) => updateFeaturedProduct(idx, 'url', e.target.value)}
                          className="flex-1 px-2 py-1.5 text-xs border border-amber-300 rounded focus:ring-1 focus:ring-amber-500 focus:border-transparent"
                        />
                        <button
                          type="button"
                          onClick={() => removeFeaturedProduct(idx)}
                          className="px-2 text-red-600 hover:bg-red-50 rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Blog Links */}
                  <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-gray-900">
                        📝 Liens vers autres articles (optionnel)
                      </label>
                      <button
                        type="button"
                        onClick={addBlogLink}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 hover:bg-blue-100 rounded"
                      >
                        + Ajouter
                      </button>
                    </div>
                    <p className="text-xs text-gray-600">
                      Maillage interne vers vos autres articles de blog
                    </p>
                    {blogLinks.map((link, idx) => (
                      <div key={link.id} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Texte (ex: guide d'installation)"
                          value={link.anchorText}
                          onChange={(e) => updateBlogLink(idx, 'anchorText', e.target.value)}
                          className="flex-1 px-2 py-1.5 text-xs border border-blue-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                        />
                        <input
                          type="text"
                          placeholder="URL (/blogs/...)"
                          value={link.url}
                          onChange={(e) => updateBlogLink(idx, 'url', e.target.value)}
                          className="flex-1 px-2 py-1.5 text-xs border border-blue-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          type="button"
                          onClick={() => removeBlogLink(idx)}
                          className="px-2 text-red-600 hover:bg-red-50 rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      <Hash size={11} className="inline mr-1 text-green-500" />
                      Sections H2 — <span className="font-black text-green-700">{h2Count}</span>
                    </label>
                    <input type="range" min={3} max={10} value={h2Count} onChange={(e) => setH2Count(Number(e.target.value))} className="w-full accent-green-500" />
                    <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                      <span>3 (court)</span><span>6 (standard)</span><span>10 (complet)</span>
                    </div>
                  </div>

                  {!effectiveUseAI && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        <Bold size={11} className="inline mr-1 text-green-500" />
                        Mots-clés en <strong className="text-gray-800">gras</strong> — <span className="font-black text-green-700">{strongCount}</span>
                      </label>
                      <input type="range" min={5} max={50} value={strongCount} onChange={(e) => setStrongCount(Number(e.target.value))} className="w-full accent-green-500" />
                      <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                        <span>5 (discret)</span><span>18 (recommandé)</span><span>50 (dense)</span>
                      </div>
                    </div>
                  )}

                  {effectiveUseAI && (
                    <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
                      <Globe size={12} className="text-blue-500 shrink-0" />
                      <p className="text-xs text-blue-700">En mode IA, les <strong>&lt;strong&gt;</strong> sont placés intelligemment par Claude selon le contexte sémantique.</p>
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
                  <div className="flex gap-1">
                    {Array.from({ length: batchProgress.total }, (_, i) => (
                      <div key={i} className={`w-2 h-2 rounded-full transition-all ${i < batchProgress.current ? c.bar : 'bg-gray-200'}`} />
                    ))}
                  </div>
                </div>
              )}
              {isMiniMode && (
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={12} className="text-purple-500 shrink-0 animate-pulse" />
                  <span className="text-[10px] text-purple-600 font-medium italic">
                    Claude analyse le site et rédige votre mini article…
                  </span>
                </div>
              )}
              {!isMiniMode && effectiveUseAI && progressPct <= 14 && (
                <div className="flex items-center gap-2 bg-orange-50 border border-orange-100 rounded-lg px-2.5 py-1.5 mb-2">
                  <span className="text-sm">🔍</span>
                  <span className="text-[10px] text-orange-700 font-bold">Analyse du concurrent n°1 sur Google.fr…</span>
                </div>
              )}
              {!isMiniMode && effectiveUseAI && progressPct > 14 && progressPct <= 22 && (
                <div className="flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-lg px-2.5 py-1.5 mb-2">
                  <span className="text-sm">🧠</span>
                  <span className="text-[10px] text-purple-700 font-bold">Planification pour battre le concurrent…</span>
                </div>
              )}
              <div className="flex items-center gap-2 mb-2">
                <Loader2 size={13} className={`animate-spin shrink-0 ${c.text}`} />
                <span className={`text-xs font-medium ${c.text}`}>{progressMsg}</span>
              </div>
              <div className={`w-full rounded-full h-1.5 ${isMiniMode ? 'bg-purple-200' : effectiveUseAI ? 'bg-blue-200' : deepMode ? 'bg-indigo-200' : 'bg-green-200'}`}>
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
              <>
                <Loader2 size={16} className="animate-spin" />
                {isMiniMode ? 'Rédaction du mini article…' : effectiveUseAI ? 'Claude rédige…' : deepMode ? 'Réflexion approfondie…' : 'Génération en cours…'}
              </>
            ) : (
              <>
                {isMiniMode ? <FileText size={16} /> : effectiveUseAI ? <Globe size={16} /> : deepMode ? <Brain size={16} /> : <Sparkles size={16} />}
                {isMiniMode
                  ? `Générer le mini article (${miniWordCount} mots)`
                  : mode === 'batch'
                  ? `Générer ${validBatchCount} article${validBatchCount > 1 ? 's' : ''} SEO${effectiveUseAI ? ' avec IA' : ''}`
                  : `Générer l'article SEO${effectiveUseAI ? ' avec Claude' : deepMode ? ' (Réflexion)' : ''}`}
              </>
            )}
          </button>

          <p className="text-center text-[11px] text-gray-400 leading-relaxed">
            {isMiniMode
              ? '✓ 300-500 mots dense · ✓ 1 maillage naturel · ✓ <strong> sémantiques · ✓ Meta description 155 car.'
              : effectiveUseAI
              ? '✓ Analyse SERP concurrent · ✓ Longueur optimale auto · ✓ <strong> sémantiques · ✓ Schema.org FAQPage'
              : '✓ Contenu 100% humain · ✓ <strong> sémantiques uniquement · ✓ Schema.org FAQPage · ✓ Lien interne 300 premiers mots'}
          </p>
        </div>
      </div>
    </div>
  );
}
