import { BlogArticle, H2Section, H3Section, FAQItem, FeaturedProduct, BlogLink, Tip, ComparisonTable } from '../types';
import { v4 as uuidv4 } from 'uuid';

const PROXY_URL = 'https://claude-proxy-production-496d.up.railway.app';

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callClaude(
  systemPrompt: string,
  messages: ClaudeMessage[],
  maxTokens: number = 4096,
  useWebSearch: boolean = false
): Promise<string> {
  await delay(2000);
  
  const response = await fetch(`${PROXY_URL}/api/claude`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
      useWebSearch,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    if (response.status === 429) {
      console.log('Rate limit, attente 30s...');
      await delay(30000);
      return callClaude(systemPrompt, messages, maxTokens, useWebSearch);
    }
    throw new Error(`Claude API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return (data.extractedText || data.content?.[0]?.text || '').trim();
}

function cleanHtml(text: string): string {
  return text.replace(/```html\s*/gi, '').replace(/```json\s*/gi, '').replace(/```\s*/g, '').replace(/`/g, '').trim();
}

function extractJson(text: string): any {
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch { return null; }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// DÉTECTION DU TYPE D'ARTICLE
// ═══════════════════════════════════════════════════════════════════════════
type ArticleType = 'tutorial' | 'buying_guide' | 'comparison' | 'diagnostic' | 'informational';

function detectArticleType(h1: string): ArticleType {
  const h1Lower = h1.toLowerCase();
  
  // Tutoriel : comment faire quelque chose
  if (/comment (changer|monter|installer|remplacer|démonter|retirer|enlever|poser|mettre)/.test(h1Lower)) {
    return 'tutorial';
  }
  
  // Guide d'achat : quel/meilleur/choisir
  if (/quel|meilleur|choisir|acheter|trouver/.test(h1Lower)) {
    return 'buying_guide';
  }
  
  // Comparatif : différence/vs/ou/comparatif
  if (/différence|vs\b|versus| ou |compara/.test(h1Lower)) {
    return 'comparison';
  }
  
  // Diagnostic : pourquoi/problème/ne fonctionne pas
  if (/pourquoi|problème|casse|vibre|bouge|dur|mou|bloqué|coincé|ne (fonctionne|marche)/.test(h1Lower)) {
    return 'diagnostic';
  }
  
  return 'informational';
}

// Structure H2 adaptée au type
function getH2Structure(type: ArticleType): string {
  switch (type) {
    case 'tutorial':
      return `Structure TUTORIEL (4 H2 avec angles DIFFÉRENTS) :
- H2 1 : Réponse directe + vue d'ensemble (temps, difficulté, outils)
- H2 2 : Préparation et précautions AVANT de commencer
- H2 3 : Étapes détaillées du démontage ET remontage
- H2 4 : Problèmes courants et solutions (pommeau collé, insert cassé, etc.)`;
    
    case 'buying_guide':
      return `Structure GUIDE D'ACHAT (4 H2 avec angles DIFFÉRENTS) :
- H2 1 : Critères essentiels pour bien choisir (matériau, compatibilité, style)
- H2 2 : Les différents types disponibles et leurs caractéristiques
- H2 3 : Fourchette de prix et rapport qualité/prix
- H2 4 : Erreurs à éviter lors de l'achat`;
    
    case 'comparison':
      return `Structure COMPARATIF (4 H2 avec angles DIFFÉRENTS) :
- H2 1 : Présentation des deux options comparées
- H2 2 : Différences techniques concrètes
- H2 3 : Avantages et inconvénients de chaque option
- H2 4 : Notre verdict : lequel choisir selon votre situation`;
    
    case 'diagnostic':
      return `Structure DIAGNOSTIC (4 H2 avec angles DIFFÉRENTS) :
- H2 1 : Les causes possibles du problème
- H2 2 : Comment identifier la cause exacte
- H2 3 : Solutions pour chaque cas
- H2 4 : Quand faut-il remplacer plutôt que réparer`;
    
    default:
      return `Structure INFORMATIVE (4 H2 avec angles DIFFÉRENTS) :
- H2 1 : L'essentiel à savoir sur le sujet
- H2 2 : Approfondissement technique
- H2 3 : Conseils pratiques et astuces
- H2 4 : Questions connexes importantes`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CONNAISSANCES MÉTIER (injectées si pertinent)
// ═══════════════════════════════════════════════════════════════════════════
const EXPERTISE_PSA = `MONTAGE PSA (Peugeot/Citroën/Renault) : Insert plastique sur tige métallique. Étapes : 1) Retirer soufflet vers le bas, 2) Tirer ancien pommeau vers le haut, 3) Vérifier insert (garder si bon), 4) Emboîter nouveau en appuyant. Temps : 2-3 min.`;
const EXPERTISE_BMW = `MONTAGE BMW (1998-2014) : 1) Tirer ancien vers le haut, 2) Déclipser plastique console, 3) Connecter câbles rétroéclairage, 4) Emboîter nouveau. Temps : 5-10 min.`;

function getExpertise(h1: string): string {
  const h1Lower = h1.toLowerCase();
  const hasMontage = /changer|monter|installer|remplacer|démonter|retirer/.test(h1Lower);
  const hasPSA = /peugeot|citro[eë]n|renault|clio|megane|scenic|206|207|208|307|308|c3|c4/.test(h1Lower);
  const hasBMW = /bmw|e36|e46|e90|e39|e60|série [135]/.test(h1Lower);
  
  if (!hasMontage && !hasPSA && !hasBMW) return '';
  
  let expertise = '\n\nCONNAISSANCES VÉRIFIÉES (utiliser SI pertinent) :\n';
  if (hasPSA || hasMontage) expertise += EXPERTISE_PSA + '\n';
  if (hasBMW) expertise += EXPERTISE_BMW + '\n';
  return expertise;
}

// ═══════════════════════════════════════════════════════════════════════════
// MODE ARTICLE COURT (1200-1500 mots, structuré, sans répétitions)
// ═══════════════════════════════════════════════════════════════════════════
export async function generateShortArticle(
  h1: string,
  anchorText: string,
  anchorUrl: string,
  onProgress: (step: string, pct: number) => void,
  featuredProducts: FeaturedProduct[] = [],
  blogLinks: BlogLink[] = []
): Promise<BlogArticle> {
  const articleId = uuidv4();
  const articleType = detectArticleType(h1);
  const h2Structure = getH2Structure(articleType);
  const expertise = getExpertise(h1);
  
  const SYSTEM_PROMPT = `Tu es un expert en pommeaux de vitesse pour pommeaudevitesse.com.
${expertise}
RÈGLES ABSOLUES :
- Jamais "nos/votre/ce/ces" (possessifs commerciaux interdits)
- Matériaux honnêtes : "simili-cuir" pas "cuir véritable"
- JAMAIS répéter ce qui a déjà été dit dans les sections précédentes
- Chaque section apporte des informations NOUVELLES
- Style direct, concret, utile`;

  try {
    // ─── ÉTAPE 1 : Recherche + Planification intelligente ────────────────
    onProgress('Analyse du sujet...', 5);
    
    const planPrompt = `Sujet : "${h1}"
Type d'article détecté : ${articleType}

${h2Structure}

Recherche des informations puis réponds avec ce JSON :
{
  "seoTitle": "titre accrocheur 55 car. max – Livraison gratuite",
  "metaDescription": "réponse DIRECTE à la question, 150 car. max",
  "h2Titles": [
    "H2 1 : titre précis (pas juste reformulation du H1)",
    "H2 2 : titre avec angle DIFFÉRENT",
    "H2 3 : titre avec angle DIFFÉRENT",
    "H2 4 : titre avec angle DIFFÉRENT"
  ],
  "keyFacts": "Les 5-6 informations clés trouvées en recherche (200 mots)"
}

IMPORTANT : Les 4 H2 doivent avoir des ANGLES DIFFÉRENTS, pas des reformulations.`;

    const planResponse = await callClaude(SYSTEM_PROMPT, [{ role: 'user', content: planPrompt }], 1000, true);
    const planData = extractJson(planResponse);
    
    const seoTitle = planData?.seoTitle || `${h1.slice(0, 50)} – Livraison gratuite`;
    const metaDescription = planData?.metaDescription || `Découvrez ${h1.toLowerCase()}.`;
    const h2Titles: string[] = planData?.h2Titles || ['Section 1', 'Section 2', 'Section 3', 'Section 4'];
    const keyFacts = planData?.keyFacts || '';

    // ─── ÉTAPE 2 : Introduction percutante ───────────────────────────────
    onProgress('Introduction...', 15);

    const introPrompt = `Écris une introduction de 80-100 mots pour "${h1}".

RÈGLES :
- PREMIÈRE PHRASE = réponse directe à la question (pas de "Vous vous demandez...")
- Donner les infos essentielles immédiatement
- Intégrer naturellement : <a href="${anchorUrl}">${anchorText}</a>
- Terminer par ce que l'article va couvrir (sans liste à puces)

Contexte : ${keyFacts}

HTML uniquement (<p> avec quelques <strong> sur mots-clés importants).`;

    const introResponse = await callClaude(SYSTEM_PROMPT, [{ role: 'user', content: introPrompt }], 500, false);
    const intro = cleanHtml(introResponse);

    // ─── ÉTAPE 3 : Sections H2 (avec tracking anti-répétition) ───────────
    const h2Sections: H2Section[] = [];
    let previousContent = ''; // Pour éviter les répétitions
    
    for (let i = 0; i < 4; i++) {
      const h2Title = h2Titles[i] || `Section ${i + 1}`;
      onProgress(`Section ${i + 1}/4...`, 25 + (i * 17));
      
      let extraInstructions = '';
      if (i === 0 && featuredProducts.length > 0) {
        extraInstructions = `\nMentionne naturellement : "${featuredProducts[0].title}" (${featuredProducts[0].url})`;
      }
      if (i === 2 && blogLinks.length > 0) {
        extraInstructions = `\nIntègre ce lien : <a href="${blogLinks[0].url}">${blogLinks[0].anchorText}</a>`;
      }

      const sectionPrompt = `Écris la section "${h2Title}" pour l'article "${h1}".

CONTEXTE RECHERCHE : ${keyFacts}

DÉJÀ COUVERT (NE PAS RÉPÉTER) :
${previousContent || '(Rien encore)'}

OBJECTIF : 250-350 mots de contenu NOUVEAU et UTILE.

Réponds avec ce JSON :
{
  "h3s": [
    {
      "title": "Sous-titre H3 pertinent",
      "content": "<p>Paragraphe détaillé avec <strong>mots-clés</strong>...</p><p>Deuxième paragraphe si besoin...</p><ul><li>Point 1</li><li>Point 2</li><li>Point 3</li></ul>"
    },
    {
      "title": "Autre sous-titre H3 (si pertinent)",
      "content": "<p>Contenu complémentaire...</p>"
    }
  ],
  "tip": "Conseil pratique UNIQUE et utile (ou null)",
  "summary": "Résumé en 1 phrase de ce qui a été couvert (pour éviter répétitions)"
}
${extraInstructions}

IMPORTANT : Le contenu doit être SUBSTANTIEL (250-350 mots), pas juste 2-3 phrases.`;

      const sectionResponse = await callClaude(SYSTEM_PROMPT, [{ role: 'user', content: sectionPrompt }], 1200, false);
      const sectionData = extractJson(sectionResponse);
      
      // Mettre à jour le tracking
      if (sectionData?.summary) {
        previousContent += `- ${h2Title} : ${sectionData.summary}\n`;
      }
      
      const h3s: H3Section[] = [];
      if (sectionData?.h3s && Array.isArray(sectionData.h3s)) {
        for (const h3 of sectionData.h3s) {
          if (h3.title && h3.content) {
            h3s.push({ id: uuidv4(), title: h3.title, content: cleanHtml(h3.content) });
          }
        }
      }
      
      let tip: Tip | null = null;
      if (sectionData?.tip && sectionData.tip.length > 15) {
        tip = { text: sectionData.tip };
      }

      // Tableau pour section 2 ou 3
      let table: ComparisonTable | null = null;
      if (i === 1 || i === 2) {
        const tablePrompt = `Tableau comparatif pertinent pour "${h2Title}".
JSON : {"headers": ["Critère", "Option A", "Option B"], "rows": [{"cells": ["val", "val", "val"]}]}
3-4 lignes avec données CONCRÈTES et UTILES.`;
        const tableResponse = await callClaude(SYSTEM_PROMPT, [{ role: 'user', content: tablePrompt }], 400, false);
        const tableData = extractJson(tableResponse);
        if (tableData?.headers && tableData?.rows?.length > 0) {
          table = { headers: tableData.headers, rows: tableData.rows.slice(0, 4).map((r: any) => ({ cells: r.cells || [] })) };
        }
      }

      h2Sections.push({
        id: uuidv4(),
        question: h2Title,
        intro: '',
        paragraphs: [],
        conclusion: '',
        tip,
        table,
        h3s,
        hasProductGrid: false,
        products: [],
      });
    }
    
    // ─── ÉTAPE 4 : FAQ (questions DIFFÉRENTES) ───────────────────────────
    onProgress('FAQ...', 92);

    const faqPrompt = `3 questions FAQ pour "${h1}".

DÉJÀ COUVERT DANS L'ARTICLE :
${previousContent}

Génère 3 questions DIFFÉRENTES de ce qui a été couvert.

JSON : {"faq": [{"question": "Question ?", "answer": "Réponse complète en 2-3 phrases."}]}`;

    const faqResponse = await callClaude(SYSTEM_PROMPT, [{ role: 'user', content: faqPrompt }], 600, false);
    const faqData = extractJson(faqResponse);
    
    const faqItems: FAQItem[] = [];
    if (faqData?.faq) {
      for (const item of faqData.faq.slice(0, 3)) {
        if (item.question && item.answer) {
          faqItems.push({ question: item.question, answer: item.answer });
        }
      }
    }

    onProgress('Terminé !', 100);

    return {
      id: articleId,
      h1,
      seoTitle,
      metaDescription,
      slug: h1.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50),
      intro,
      anchorText,
      anchorUrl,
      h2Sections,
      faq: faqItems,
      featuredProducts,
      blogLinks,
      status: 'draft',
      createdAt: new Date().toISOString(),
    };
    
  } catch (error) {
    console.error('Erreur génération:', error);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MODE ARTICLE COMPLET (garde la même logique améliorée)
// ═══════════════════════════════════════════════════════════════════════════
export async function generateArticleWithClaude(
  h1: string,
  anchorText: string,
  anchorUrl: string,
  h2Count: number,
  deepMode: boolean,
  onProgress: (step: string, pct: number) => void,
  featuredProducts: FeaturedProduct[] = [],
  blogLinks: BlogLink[] = []
): Promise<BlogArticle> {
  const articleId = uuidv4();
  const articleType = detectArticleType(h1);
  const expertise = getExpertise(h1);
  
  const SYSTEM_PROMPT = `Tu es un expert en pommeaux de vitesse pour pommeaudevitesse.com.
${expertise}
RÈGLES : Jamais "nos/votre/ce/ces". Matériaux honnêtes. Ne jamais répéter. Contenu utile et concret.`;

  try {
    onProgress('Recherche...', 5);
    
    const planPrompt = `Sujet : "${h1}" (type: ${articleType})
Génère ${h2Count} questions H2 avec des ANGLES TOUS DIFFÉRENTS.
JSON : {
  "seoTitle": "55 car. – Livraison gratuite",
  "metaDescription": "150 car.",
  "h2Titles": ["H2 1", "H2 2", ...],
  "keyFacts": "Infos clés recherchées"
}`;

    const planResponse = await callClaude(SYSTEM_PROMPT, [{ role: 'user', content: planPrompt }], 1000, true);
    const planData = extractJson(planResponse);
    
    const seoTitle = planData?.seoTitle || `${h1.slice(0, 50)} – Livraison gratuite`;
    const metaDescription = planData?.metaDescription || `Découvrez ${h1.toLowerCase()}.`;
    const h2Titles: string[] = (planData?.h2Titles || []).slice(0, h2Count);
    const keyFacts = planData?.keyFacts || '';
    
    while (h2Titles.length < h2Count) h2Titles.push(`Section ${h2Titles.length + 1}`);

    onProgress('Introduction...', 12);

    const introPrompt = `Intro 80-100 mots pour "${h1}". Réponse directe en 1ère phrase.
Lien : <a href="${anchorUrl}">${anchorText}</a>
Contexte : ${keyFacts}
HTML uniquement.`;

    const introResponse = await callClaude(SYSTEM_PROMPT, [{ role: 'user', content: introPrompt }], 500, false);
    const intro = cleanHtml(introResponse);

    const h2Sections: H2Section[] = [];
    let previousContent = '';
    const progressPerSection = 65 / h2Count;
    
    for (let i = 0; i < h2Count; i++) {
      const h2Title = h2Titles[i];
      onProgress(`Section ${i + 1}/${h2Count}...`, 18 + (i * progressPerSection));
      
      let extra = '';
      if (i === 0 && featuredProducts.length > 0) extra = `\nProduit : "${featuredProducts[0].title}" (${featuredProducts[0].url})`;
      if (i === Math.floor(h2Count / 2) && blogLinks.length > 0) extra = `\nLien : <a href="${blogLinks[0].url}">${blogLinks[0].anchorText}</a>`;

      const sectionPrompt = `Section "${h2Title}" pour "${h1}".
Contexte : ${keyFacts}
Déjà couvert : ${previousContent || '(Rien)'}
JSON : {
  "h3s": [{"title": "...", "content": "<p>...</p>"}],
  "tip": "conseil ou null",
  "summary": "résumé 1 phrase"
}
200-300 mots de contenu NOUVEAU.${extra}`;

      const sectionResponse = await callClaude(SYSTEM_PROMPT, [{ role: 'user', content: sectionPrompt }], 1000, false);
      const sectionData = extractJson(sectionResponse);
      
      if (sectionData?.summary) previousContent += `- ${h2Title}: ${sectionData.summary}\n`;
      
      const h3s: H3Section[] = [];
      if (sectionData?.h3s) {
        for (const h3 of sectionData.h3s) {
          if (h3.title && h3.content) h3s.push({ id: uuidv4(), title: h3.title, content: cleanHtml(h3.content) });
        }
      }
      
      let tip: Tip | null = null;
      if (sectionData?.tip && sectionData.tip.length > 15) tip = { text: sectionData.tip };
      
      let table: ComparisonTable | null = null;
      if (i === 1 || i === 3) {
        const tableResponse = await callClaude(SYSTEM_PROMPT, [{ role: 'user', content: `Tableau pour "${h2Title}". JSON: {"headers":["A","B","C"],"rows":[{"cells":["x","y","z"]}]}` }], 400, false);
        const tableData = extractJson(tableResponse);
        if (tableData?.headers && tableData?.rows) {
          table = { headers: tableData.headers, rows: tableData.rows.map((r: any) => ({ cells: r.cells || [] })) };
        }
      }

      h2Sections.push({
        id: uuidv4(), question: h2Title, intro: '', paragraphs: [], conclusion: '',
        tip, table, h3s, hasProductGrid: false, products: [],
      });
    }
    
    onProgress('FAQ...', 90);

    const faqResponse = await callClaude(SYSTEM_PROMPT, [{ role: 'user', content: `4 FAQ "${h1}" DIFFÉRENTES de : ${previousContent}\nJSON: {"faq":[{"question":"?","answer":"..."}]}` }], 700, false);
    const faqData = extractJson(faqResponse);
    
    const faqItems: FAQItem[] = [];
    if (faqData?.faq) {
      for (const item of faqData.faq) {
        if (item.question && item.answer) faqItems.push({ question: item.question, answer: item.answer });
      }
    }

    onProgress('Terminé !', 100);

    return {
      id: articleId, h1, seoTitle, metaDescription,
      slug: h1.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50),
      intro, anchorText, anchorUrl, h2Sections, faq: faqItems,
      featuredProducts, blogLinks, status: 'draft', createdAt: new Date().toISOString(),
    };
    
  } catch (error) {
    console.error('Erreur:', error);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MODE MINI ARTICLE
// ═══════════════════════════════════════════════════════════════════════════
export async function generateMiniArticle(
  h1: string,
  anchorText: string,
  anchorUrl: string,
  wordCount: number,
  onProgress: (step: string, pct: number) => void,
  deepMode: boolean,
  featuredProducts: FeaturedProduct[] = [],
  blogLinks: BlogLink[] = []
): Promise<BlogArticle> {
  const articleId = uuidv4();
  const expertise = getExpertise(h1);
  
  const SYSTEM_PROMPT = `Expert pommeaux de vitesse. ${expertise} Règles : pas de possessifs commerciaux, matériaux honnêtes.`;
  
  onProgress('Recherche...', 20);
  const research = await callClaude(SYSTEM_PROMPT, [{ role: 'user', content: `Recherche "${h1}" et résume les infos clés en 100 mots.` }], 400, true);

  onProgress('Rédaction...', 50);
  const prompt = `Article ${wordCount} mots sur "${h1}".
Infos : ${research}
Structure : <p>, <h2>, <ul>, <strong>
Lien : <a href="${anchorUrl}">${anchorText}</a>
${featuredProducts.length > 0 ? `Produit : ${featuredProducts[0].title}` : ''}
HTML uniquement. Contenu UTILE, pas de remplissage.`;

  const response = await callClaude(SYSTEM_PROMPT, [{ role: 'user', content: prompt }], 1500, false);
  
  onProgress('Terminé !', 100);

  return {
    id: articleId, h1,
    seoTitle: `${h1.slice(0, 50)} – Livraison gratuite`,
    metaDescription: `Découvrez ${h1.toLowerCase()}. Guide pratique.`,
    slug: h1.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50),
    intro: '', anchorText, anchorUrl, h2Sections: [], faq: [],
    featuredProducts, blogLinks, status: 'draft', createdAt: new Date().toISOString(),
    isMini: true, miniContent: cleanHtml(response), miniWordCount: wordCount,
  };
}
