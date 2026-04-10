import { BlogArticle, H2Section, H3Section, FAQItem, FeaturedProduct, BlogLink, Tip, ComparisonTable } from '../types';
import { v4 as uuidv4 } from 'uuid';

const PROXY_URL = 'https://claude-proxy-production-496d.up.railway.app';

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Délai pour éviter le rate limit (50k tokens/min)
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callClaude(
  systemPrompt: string,
  messages: ClaudeMessage[],
  maxTokens: number = 4096,
  useWebSearch: boolean = false
): Promise<string> {
  // Délai avant chaque appel pour éviter rate limit
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
    // Si rate limit, attendre et réessayer une fois
    if (response.status === 429) {
      console.log('Rate limit atteint, attente 30 secondes...');
      await delay(30000);
      return callClaude(systemPrompt, messages, maxTokens, useWebSearch);
    }
    throw new Error(`Claude API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  let text = data.extractedText || data.content?.[0]?.text || '';
  return text.trim();
}

function cleanHtml(text: string): string {
  return text
    .replace(/```html\s*/gi, '')
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .replace(/`/g, '')
    .trim();
}

function extractJson(text: string): any {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      return null;
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONNAISSANCES MÉTIER
// ═══════════════════════════════════════════════════════════════════════════
const EXPERTISE_MONTAGE_PSA = `
🔧 MONTAGE PEUGEOT / CITROËN / RENAULT :
- Système : insert plastique sur tige métallique (pas de vissage)
- Étapes : 1) Retirer le soufflet vers le bas, 2) Tirer l'ancien pommeau vers le haut, 3) Vérifier l'insert (garder si bon), 4) Emboîter le nouveau en appuyant fort
- Temps : 2-3 minutes, aucun outil
`;

const EXPERTISE_MONTAGE_BMW = `
🔧 MONTAGE BMW (1998-2014) :
- Étapes : 1) Tirer l'ancien vers le haut, 2) Déclipser le plastique console, 3) Connecter câbles (rétroéclairage), 4) Emboîter le nouveau
- Temps : 5-10 minutes
`;

function detectExpertise(h1: string): { includePSA: boolean; includeBMW: boolean; isMontage: boolean } {
  const h1Lower = h1.toLowerCase();
  const montageKeywords = ['monter', 'démonter', 'changer', 'remplacer', 'installer', 'retirer', 'enlever', 'poser', 'mettre', 'montage', 'démontage', 'installation', 'remplacement'];
  const isMontage = montageKeywords.some(kw => h1Lower.includes(kw));
  const psaKeywords = ['peugeot', '206', '207', '208', '307', '308', '3008', 'citroën', 'citroen', 'c3', 'c4', 'renault', 'clio', 'megane', 'scenic'];
  const includePSA = psaKeywords.some(kw => h1Lower.includes(kw));
  const bmwKeywords = ['bmw', 'e36', 'e46', 'e90', 'e39', 'e60', 'f30', 'série 3', 'série 5'];
  const includeBMW = bmwKeywords.some(kw => h1Lower.includes(kw));
  return { includePSA, includeBMW, isMontage };
}

function buildSystemPrompt(h1: string, isShortMode: boolean = false): string {
  const { includePSA, includeBMW, isMontage } = detectExpertise(h1);
  
  let expertiseBlock = '';
  if (isMontage || includePSA || includeBMW) {
    expertiseBlock = `\nCONNAISSANCES VÉRIFIÉES :\n${includePSA || isMontage ? EXPERTISE_MONTAGE_PSA : ''}${includeBMW ? EXPERTISE_MONTAGE_BMW : ''}`;
  }

  return `Tu es un expert en pommeaux de vitesse pour pommeaudevitesse.com.
${expertiseBlock}
RÈGLES : Jamais de "nos/votre/ce/ces". Matériaux honnêtes. Infos UTILES et CONCRÈTES.
${isShortMode ? 'STYLE : Réponse DIRECTE dès la 1ère phrase. Paragraphes courts. Zéro remplissage.' : ''}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// MODE ARTICLE COURT (optimisé pour éviter rate limit)
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
  const SYSTEM_PROMPT = buildSystemPrompt(h1, true);
  
  try {
    // ─── ÉTAPE 1 : Recherche + Plan (AVEC web search) ────────────────────
    onProgress('Recherche web...', 10);
    
    const planPrompt = `Recherche "${h1}" puis JSON uniquement :
{
  "seoTitle": "titre 55 car. max – Livraison gratuite",
  "metaDescription": "RÉPONSE directe 150 car.",
  "h2Questions": ["question 1?", "question 2?", "question 3?"],
  "keyFacts": "3-4 faits importants trouvés en ligne"
}`;

    const planResponse = await callClaude(SYSTEM_PROMPT, [{ role: 'user', content: planPrompt }], 800, true);
    const planData = extractJson(planResponse);
    
    const seoTitle = planData?.seoTitle || `${h1.slice(0, 50)} – Livraison gratuite`;
    const metaDescription = planData?.metaDescription || `Découvrez ${h1.toLowerCase()}.`;
    const h2Questions: string[] = (planData?.h2Questions || []).slice(0, 3);
    const keyFacts = planData?.keyFacts || '';
    
    while (h2Questions.length < 3) h2Questions.push(`Comment procéder ?`);

    // ─── ÉTAPE 2 : Introduction (SANS web search, utilise keyFacts) ──────
    onProgress('Rédaction intro...', 30);

    const introPrompt = `Intro 40-60 mots pour "${h1}".
Infos trouvées : ${keyFacts}
PREMIÈRE PHRASE = réponse directe.
Lien : <a href="${anchorUrl}">${anchorText}</a>
HTML uniquement (<p> avec <strong>).`;

    const introResponse = await callClaude(SYSTEM_PROMPT, [{ role: 'user', content: introPrompt }], 400, false);
    const intro = cleanHtml(introResponse);

    // ─── ÉTAPE 3 : Sections H2 (SANS web search) ─────────────────────────
    const h2Sections: H2Section[] = [];
    
    for (let i = 0; i < 3; i++) {
      const question = h2Questions[i];
      onProgress(`Section ${i + 1}/3...`, 40 + (i * 15));
      
      let extraContext = '';
      if (i === 0 && featuredProducts.length > 0) {
        extraContext = `\nMentionne : "${featuredProducts[0].title}" (${featuredProducts[0].url})`;
      }
      if (i === 1 && blogLinks.length > 0) {
        extraContext = `\nLien : <a href="${blogLinks[0].url}">${blogLinks[0].anchorText}</a>`;
      }

      const sectionPrompt = `Section "${question}". Infos : ${keyFacts}
JSON :
{
  "h3": {"title": "Sous-titre", "content": "<p>Réponse 2-3 phrases.</p><ul><li>Point 1</li><li>Point 2</li></ul>"},
  "tip": "Conseil 1 phrase ou null"
}
80 mots MAX.${extraContext}`;

      const sectionResponse = await callClaude(SYSTEM_PROMPT, [{ role: 'user', content: sectionPrompt }], 600, false);
      const sectionData = extractJson(sectionResponse);
      
      const h3s: H3Section[] = [];
      if (sectionData?.h3) {
        h3s.push({ id: uuidv4(), title: sectionData.h3.title || '', content: cleanHtml(sectionData.h3.content || '') });
      }
      
      let tip: Tip | null = null;
      if (sectionData?.tip && sectionData.tip.length > 10) {
        tip = { text: sectionData.tip };
      }

      // Tableau section 2 seulement
      let table: ComparisonTable | null = null;
      if (i === 1) {
        const tablePrompt = `Tableau comparatif "${question}". JSON :
{"headers": ["", "A", "B"], "rows": [{"cells": ["Critère", "val", "val"]}]}
2 lignes max.`;
        const tableResponse = await callClaude(SYSTEM_PROMPT, [{ role: 'user', content: tablePrompt }], 300, false);
        const tableData = extractJson(tableResponse);
        if (tableData?.headers && tableData?.rows) {
          table = { headers: tableData.headers, rows: tableData.rows.slice(0, 2).map((r: any) => ({ cells: r.cells || [] })) };
        }
      }

      h2Sections.push({
        id: uuidv4(), question, intro: '', paragraphs: [], conclusion: '',
        tip, table, h3s, hasProductGrid: false, products: [],
      });
    }
    
    // ─── ÉTAPE 4 : FAQ (SANS web search) ─────────────────────────────────
    onProgress('FAQ...', 90);

    const faqPrompt = `2 FAQ pour "${h1}". JSON :
{"faq": [{"question": "?", "answer": "Réponse 1-2 phrases."}]}`;

    const faqResponse = await callClaude(SYSTEM_PROMPT, [{ role: 'user', content: faqPrompt }], 400, false);
    const faqData = extractJson(faqResponse);
    
    const faqItems: FAQItem[] = [];
    if (faqData?.faq) {
      for (const item of faqData.faq.slice(0, 2)) {
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
    console.error('Erreur génération:', error);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MODE ARTICLE COMPLET (optimisé)
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
  const SYSTEM_PROMPT = buildSystemPrompt(h1, false);
  
  try {
    // ─── Recherche initiale (AVEC web search) ────────────────────────────
    onProgress('Recherche web...', 5);
    
    const researchPrompt = `Recherche "${h1}" et donne JSON :
{
  "seoTitle": "titre 55 car. – Livraison gratuite",
  "metaDescription": "description 150 car.",
  "h2Questions": ["q1?", "q2?", "q3?", "q4?", "q5?", "q6?"],
  "keyFacts": "Résumé des infos importantes trouvées (200 mots max)"
}`;

    const researchResponse = await callClaude(SYSTEM_PROMPT, [{ role: 'user', content: researchPrompt }], 1000, true);
    const researchData = extractJson(researchResponse);
    
    const seoTitle = researchData?.seoTitle || `${h1.slice(0, 50)} – Livraison gratuite`;
    const metaDescription = researchData?.metaDescription || `Découvrez ${h1.toLowerCase()}.`;
    const h2Questions: string[] = (researchData?.h2Questions || []).slice(0, h2Count);
    const keyFacts = researchData?.keyFacts || '';
    
    while (h2Questions.length < h2Count) h2Questions.push(`Comment choisir ?`);

    // ─── Introduction (SANS web search) ──────────────────────────────────
    onProgress('Introduction...', 15);

    const introPrompt = `Intro 80-100 mots pour "${h1}".
Infos : ${keyFacts}
Lien : <a href="${anchorUrl}">${anchorText}</a>
HTML uniquement.`;

    const introResponse = await callClaude(SYSTEM_PROMPT, [{ role: 'user', content: introPrompt }], 600, false);
    const intro = cleanHtml(introResponse);

    // ─── Sections (SANS web search, utilise keyFacts) ────────────────────
    const h2Sections: H2Section[] = [];
    const progressPerSection = 60 / h2Count;
    
    for (let i = 0; i < h2Count; i++) {
      const question = h2Questions[i];
      onProgress(`Section ${i + 1}/${h2Count}...`, 20 + (i * progressPerSection));
      
      let extraContext = '';
      if (i === 0 && featuredProducts.length > 0) extraContext = `\nProduit : "${featuredProducts[0].title}" (${featuredProducts[0].url})`;
      if (i === Math.floor(h2Count / 2) && blogLinks.length > 0) extraContext = `\nLien : <a href="${blogLinks[0].url}">${blogLinks[0].anchorText}</a>`;

      const sectionPrompt = `Section "${question}". Contexte : ${keyFacts}
JSON :
{
  "intro": "1-2 phrases",
  "h3s": [{"title": "Sous-titre", "content": "<p>Contenu utile.</p>"}],
  "tip": "Conseil ou null",
  "conclusion": "1 phrase"
}${extraContext}`;

      const sectionResponse = await callClaude(SYSTEM_PROMPT, [{ role: 'user', content: sectionPrompt }], 800, false);
      const sectionData = extractJson(sectionResponse);
      
      const h3s: H3Section[] = [];
      if (sectionData?.h3s) {
        for (const h3 of sectionData.h3s) {
          h3s.push({ id: uuidv4(), title: h3.title || '', content: cleanHtml(h3.content || '') });
        }
      }
      
      let tip: Tip | null = null;
      if (sectionData?.tip && sectionData.tip.length > 10) tip = { text: sectionData.tip };
      
      let table: ComparisonTable | null = null;
      if (i === 1 || i === 3) {
        const tablePrompt = `Tableau "${question}". JSON :
{"headers": ["Critère", "A", "B"], "rows": [{"cells": ["x", "y", "z"]}]}`;
        const tableResponse = await callClaude(SYSTEM_PROMPT, [{ role: 'user', content: tablePrompt }], 400, false);
        const tableData = extractJson(tableResponse);
        if (tableData?.headers && tableData?.rows) {
          table = { headers: tableData.headers, rows: tableData.rows.map((r: any) => ({ cells: r.cells || [] })) };
        }
      }

      h2Sections.push({
        id: uuidv4(), question, intro: sectionData?.intro || '', paragraphs: [],
        conclusion: sectionData?.conclusion || '', tip, table, h3s, hasProductGrid: false, products: [],
      });
    }
    
    // ─── FAQ (SANS web search) ───────────────────────────────────────────
    onProgress('FAQ...', 90);

    const faqPrompt = `4 FAQ "${h1}". JSON :
{"faq": [{"question": "?", "answer": "Réponse utile."}]}`;

    const faqResponse = await callClaude(SYSTEM_PROMPT, [{ role: 'user', content: faqPrompt }], 600, false);
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
    console.error('Erreur génération:', error);
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
  const SYSTEM_PROMPT = buildSystemPrompt(h1, true);
  
  // Une seule recherche web au début
  onProgress('Recherche...', 20);

  const researchPrompt = `Recherche "${h1}" et résume les infos clés en 100 mots.`;
  const research = await callClaude(SYSTEM_PROMPT, [{ role: 'user', content: researchPrompt }], 400, true);

  onProgress('Rédaction...', 50);

  const prompt = `Article ${wordCount} mots sur "${h1}".
Infos recherchées : ${research}
Structure : <p>, <h2>, <ul><li>, <strong>
Lien : <a href="${anchorUrl}">${anchorText}</a>
${featuredProducts.length > 0 ? `Produit : ${featuredProducts[0].title}` : ''}
HTML uniquement.`;

  const response = await callClaude(SYSTEM_PROMPT, [{ role: 'user', content: prompt }], 1200, false);
  const content = cleanHtml(response);

  onProgress('Terminé !', 100);

  return {
    id: articleId, h1,
    seoTitle: `${h1.slice(0, 50)} – Livraison gratuite`,
    metaDescription: `Découvrez ${h1.toLowerCase()}. Guide pratique.`,
    slug: h1.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50),
    intro: '', anchorText, anchorUrl, h2Sections: [], faq: [],
    featuredProducts, blogLinks, status: 'draft', createdAt: new Date().toISOString(),
    isMini: true, miniContent: content, miniWordCount: wordCount,
  };
}
