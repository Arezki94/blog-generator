import { BlogArticle, H2Section, H3Section, FAQItem, FeaturedProduct, BlogLink, Tip, ComparisonTable } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Délai pour éviter le rate limit
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const PROXY_URL = 'https://claude-proxy-production-496d.up.railway.app';

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

async function callClaude(
  systemPrompt: string,
  messages: ClaudeMessage[],
  maxTokens: number = 4096,
  useWebSearch: boolean = false
): Promise<string> {
  // Petit délai pour éviter le rate limit
  await delay(1000); // 1 seconde entre chaque appel
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
// CONNAISSANCES MÉTIER (injectées uniquement si pertinent)
// ═══════════════════════════════════════════════════════════════════════════
const EXPERTISE_MONTAGE_PSA = `
🔧 MONTAGE PEUGEOT / CITROËN / RENAULT (vérifié) :
- Système : insert plastique sur tige métallique (pas de vissage)
- Étapes : 
  1. Retirer le soufflet en le tirant vers le bas
  2. Tirer fermement l'ancien pommeau vers le haut
  3. Vérifier l'insert plastique — le garder s'il est bon, sinon le remplacer
  4. Emboîter le nouveau pommeau en appuyant fort
- Aucun outil nécessaire
- Temps : 2-3 minutes
`;

const EXPERTISE_MONTAGE_BMW = `
🔧 MONTAGE BMW (1998-2014, vérifié) :
- Étapes :
  1. Tirer l'ancien pommeau vers le haut fermement
  2. Déclipser le plastique de la console centrale si nécessaire
  3. Connecter les câbles inclus (pour rétroéclairage si applicable)
  4. Emboîter le nouveau pommeau de force
- Temps : 5-10 minutes
`;

// Détecte si le sujet nécessite les connaissances métier
function detectExpertise(h1: string): { includePSA: boolean; includeBMW: boolean; isMontage: boolean } {
  const h1Lower = h1.toLowerCase();
  
  // Mots-clés de montage/démontage
  const montageKeywords = ['monter', 'démonter', 'changer', 'remplacer', 'installer', 'retirer', 'enlever', 'poser', 'mettre', 'montage', 'démontage', 'installation', 'remplacement'];
  const isMontage = montageKeywords.some(kw => h1Lower.includes(kw));
  
  // Marques PSA
  const psaKeywords = ['peugeot', '106', '206', '207', '208', '306', '307', '308', '406', '407', '408', '508', '2008', '3008', '5008', 'citroën', 'citroen', 'c1', 'c2', 'c3', 'c4', 'c5', 'ds3', 'ds4', 'ds5', 'renault', 'clio', 'megane', 'mégane', 'scenic', 'scénic', 'laguna', 'twingo', 'captur', 'kadjar'];
  const includePSA = psaKeywords.some(kw => h1Lower.includes(kw));
  
  // BMW
  const bmwKeywords = ['bmw', 'e30', 'e36', 'e46', 'e90', 'e91', 'e92', 'e93', 'f30', 'f31', 'e39', 'e60', 'e61', 'f10', 'f11', 'série 1', 'série 3', 'série 5', 'serie 1', 'serie 3', 'serie 5'];
  const includeBMW = bmwKeywords.some(kw => h1Lower.includes(kw));
  
  return { includePSA, includeBMW, isMontage };
}

// Construit le prompt système adapté au sujet
function buildSystemPrompt(h1: string, isShortMode: boolean = false): string {
  const { includePSA, includeBMW, isMontage } = detectExpertise(h1);
  
  let expertiseBlock = '';
  
  if (isMontage || includePSA || includeBMW) {
    expertiseBlock = `
CONNAISSANCES MÉTIER VÉRIFIÉES (à utiliser SI le sujet concerne le montage/démontage) :
${includePSA || isMontage ? EXPERTISE_MONTAGE_PSA : ''}
${includeBMW ? EXPERTISE_MONTAGE_BMW : ''}
⚠️ IMPORTANT : Croise ces infos avec ta recherche web pour confirmer/compléter selon le modèle exact.
`;
  }

  const styleBlock = isShortMode ? `
STYLE D'ÉCRITURE - ARTICLE COURT ET EFFICACE :
- RÉPONDRE À LA QUESTION DÈS LA PREMIÈRE PHRASE (pas d'intro générale)
- Paragraphes de 2-3 lignes MAX
- Aller droit au but, zéro remplissage
- Ton direct et pratique
- Utiliser des listes pour les étapes
- Gras sur les mots-clés importants
` : `
STYLE D'ÉCRITURE - ARTICLE COMPLET :
- Introduction qui pose le contexte
- Sections détaillées avec exemples
- Tableaux comparatifs
- Conseils pratiques
- FAQ complète
`;

  return `Tu es un expert en pommeaux de vitesse pour pommeaudevitesse.com.
${expertiseBlock}
${styleBlock}
RÈGLES STRICTES :
- JAMAIS de possessifs commerciaux : "ce", "ces", "nos", "notre", "votre", "vos"
- Matériaux honnêtes : "simili-cuir" jamais "cuir véritable"
- Utilise la recherche web pour trouver des informations RÉELLES et à jour
- Donne des infos UTILES et CONCRÈTES, pas de généralités`;
}

// ═══════════════════════════════════════════════════════════════════════════
// MODE ARTICLE COURT (400-700 mots) — Réponse directe
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
    // ─── ÉTAPE 1 : Recherche web + Planification ─────────────────────────
    onProgress('Recherche web...', 10);
    
    const planPrompt = `Recherche des informations sur "${h1}" puis réponds UNIQUEMENT avec ce JSON :
{
  "seoTitle": "titre accrocheur max 55 car. – Livraison gratuite",
  "metaDescription": "RÉPONSE DIRECTE à la question en 150 car. max",
  "h2Questions": ["question pratique 1 ?", "question pratique 2 ?", "question pratique 3 ?"]
}

La meta description doit RÉPONDRE à la question, pas la reformuler.
Seulement 3 questions H2, les plus utiles.`;

    const planResponse = await callClaude(SYSTEM_PROMPT, [{ role: 'user', content: planPrompt }], 1000, true);
    const planData = extractJson(planResponse);
    
    const seoTitle = planData?.seoTitle || `${h1.slice(0, 50)} – Livraison gratuite`;
    const metaDescription = planData?.metaDescription || `Découvrez ${h1.toLowerCase()}. Réponse directe.`;
    const h2Questions: string[] = (planData?.h2Questions || []).slice(0, 3);
    
    while (h2Questions.length < 3) {
      h2Questions.push(`Comment procéder ?`);
    }

    // ─── ÉTAPE 2 : Introduction DIRECTE ──────────────────────────────────
    onProgress('Rédaction intro directe...', 25);

    const introPrompt = `Écris une intro de 40-60 mots pour "${h1}".

RÈGLE D'OR : La PREMIÈRE PHRASE doit RÉPONDRE à la question.

Exemple de bon style :
"Tirez fermement vers le haut — le pommeau 207 s'emboîte sur un insert plastique, aucun outil requis. L'opération prend 2-3 minutes..."

Inclure ce lien naturellement : <a href="${anchorUrl}">${anchorText}</a>

Réponds avec UNIQUEMENT le HTML (<p> avec <strong> sur 2-3 mots-clés). Pas de JSON.`;

    const introResponse = await callClaude(SYSTEM_PROMPT, [{ role: 'user', content: introPrompt }], 600, true);
    const intro = cleanHtml(introResponse);

    // ─── ÉTAPE 3 : Sections H2 courtes ───────────────────────────────────
    const h2Sections: H2Section[] = [];
    
    for (let i = 0; i < 3; i++) {
      const question = h2Questions[i];
      onProgress(`Section ${i + 1}/3...`, 35 + (i * 18));
      
      let extraContext = '';
      if (i === 0 && featuredProducts.length > 0) {
        extraContext += `\nMentionne ce produit naturellement : "${featuredProducts[0].title}" (lien: ${featuredProducts[0].url})`;
      }
      if (i === 1 && blogLinks.length > 0) {
        extraContext += `\nIntègre ce lien : <a href="${blogLinks[0].url}">${blogLinks[0].anchorText}</a>`;
      }

      const sectionPrompt = `Recherche sur "${question}" puis réponds UNIQUEMENT avec ce JSON :
{
  "h3": {
    "title": "Sous-titre court et pratique",
    "content": "<p>Réponse directe en 2-3 phrases max avec <strong>mots-clés</strong>.</p><ul><li>Étape/point 1</li><li>Étape/point 2</li><li>Étape/point 3</li></ul>"
  },
  "tip": "Conseil pratique en 1 phrase (ou null si pas pertinent)"
}

IMPORTANT : 
- Réponse DIRECTE et UTILE
- 80 mots MAX pour le contenu
- Infos RÉELLES trouvées en ligne${extraContext}`;

      const sectionResponse = await callClaude(SYSTEM_PROMPT, [{ role: 'user', content: sectionPrompt }], 900, true);
      const sectionData = extractJson(sectionResponse);
      
      const h3s: H3Section[] = [];
      if (sectionData?.h3) {
        h3s.push({
          id: uuidv4(),
          title: sectionData.h3.title || '',
          content: cleanHtml(sectionData.h3.content || ''),
        });
      }
      
      let tip: Tip | null = null;
      if (sectionData?.tip && typeof sectionData.tip === 'string' && sectionData.tip.length > 10) {
        tip = { text: sectionData.tip };
      }

      // Tableau seulement pour la section 2
      let table: ComparisonTable | null = null;
      if (i === 1) {
        const tablePrompt = `Tableau comparatif COURT pour "${question}". JSON uniquement :
{
  "headers": ["", "Option A", "Option B"],
  "rows": [
    {"cells": ["Critère 1", "valeur", "valeur"]},
    {"cells": ["Critère 2", "valeur", "valeur"]}
  ]
}
2-3 lignes MAX. Données RÉELLES.`;
        const tableResponse = await callClaude(SYSTEM_PROMPT, [{ role: 'user', content: tablePrompt }], 500, true);
        const tableData = extractJson(tableResponse);
        if (tableData?.headers && tableData?.rows) {
          table = {
            headers: tableData.headers,
            rows: tableData.rows.slice(0, 3).map((r: any) => ({ cells: r.cells || [] })),
          };
        }
      }

      h2Sections.push({
        id: uuidv4(),
        question: question,
        intro: '',
        paragraphs: [],
        conclusion: '',
        tip: tip,
        table: table,
        h3s: h3s,
        hasProductGrid: false,
        products: [],
      });
    }
    
    // ─── ÉTAPE 4 : FAQ courte (2 questions) ──────────────────────────────
    onProgress('FAQ rapide...', 92);

    const faqPrompt = `2 questions FAQ utiles pour "${h1}". JSON uniquement :
{
  "faq": [
    {"question": "Question pratique ?", "answer": "Réponse en 1-2 phrases."},
    {"question": "Question pratique ?", "answer": "Réponse en 1-2 phrases."}
  ]
}
Réponses CONCRÈTES basées sur la recherche web.`;

    const faqResponse = await callClaude(SYSTEM_PROMPT, [{ role: 'user', content: faqPrompt }], 600, true);
    const faqData = extractJson(faqResponse);
    
    const faqItems: FAQItem[] = [];
    if (faqData?.faq && Array.isArray(faqData.faq)) {
      for (const item of faqData.faq.slice(0, 2)) {
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
// MODE ARTICLE COMPLET (avec recherche web)
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
    onProgress('Recherche et planification...', 5);
    
    const planPrompt = `Recherche sur "${h1}" puis réponds UNIQUEMENT avec ce JSON :
{
  "seoTitle": "titre max 55 caractères – Livraison gratuite",
  "metaDescription": "description utile max 150 caractères",
  "h2Questions": ["question 1 ?", "question 2 ?", "question 3 ?", "question 4 ?", "question 5 ?", "question 6 ?"]
}
Questions basées sur ce que les gens cherchent vraiment.`;

    const planResponse = await callClaude(SYSTEM_PROMPT, [{ role: 'user', content: planPrompt }], 1500, true);
    const planData = extractJson(planResponse);
    
    const seoTitle = planData?.seoTitle || `${h1.slice(0, 50)} – Livraison gratuite`;
    const metaDescription = planData?.metaDescription || `Découvrez ${h1.toLowerCase()}. Guide complet.`;
    const h2Questions: string[] = planData?.h2Questions?.slice(0, h2Count) || [];
    
    while (h2Questions.length < h2Count) {
      h2Questions.push(`Comment choisir ?`);
    }

    onProgress('Rédaction introduction...', 15);

    const introPrompt = `Recherche sur "${h1}" puis écris une introduction de 80-100 mots.
Inclure ce lien naturellement : <a href="${anchorUrl}">${anchorText}</a>
Réponds avec UNIQUEMENT le HTML (<p> avec <strong>).`;

    const introResponse = await callClaude(SYSTEM_PROMPT, [{ role: 'user', content: introPrompt }], 1000, true);
    const intro = cleanHtml(introResponse);

    const h2Sections: H2Section[] = [];
    const progressPerSection = 60 / h2Count;
    
    for (let i = 0; i < h2Count; i++) {
      const question = h2Questions[i];
      onProgress(`Section ${i + 1}/${h2Count}...`, 20 + (i * progressPerSection));
      
      let extraContext = '';
      if (i === 0 && featuredProducts.length > 0) {
        extraContext += `\nMentionne ce produit : "${featuredProducts[0].title}" avec lien ${featuredProducts[0].url}`;
      }
      if (i === Math.floor(h2Count / 2) && blogLinks.length > 0) {
        extraContext += `\nIntègre ce lien : <a href="${blogLinks[0].url}">${blogLinks[0].anchorText}</a>`;
      }

      const sectionPrompt = `Recherche sur "${question}" puis réponds avec ce JSON :
{
  "intro": "1-2 phrases d'introduction",
  "h3s": [{"title": "Sous-titre", "content": "<p>Contenu UTILE avec <strong>mots-clés</strong>.</p>"}],
  "tip": "Conseil pratique (ou null)",
  "conclusion": "Phrase de conclusion"
}
Infos RÉELLES et UTILES.${extraContext}`;

      const sectionResponse = await callClaude(SYSTEM_PROMPT, [{ role: 'user', content: sectionPrompt }], deepMode ? 2500 : 2000, true);
      const sectionData = extractJson(sectionResponse);
      
      const h3s: H3Section[] = [];
      if (sectionData?.h3s && Array.isArray(sectionData.h3s)) {
        for (const h3 of sectionData.h3s) {
          h3s.push({
            id: uuidv4(),
            title: h3.title || '',
            content: cleanHtml(h3.content || ''),
          });
        }
      }
      
      let tip: Tip | null = null;
      if (sectionData?.tip && typeof sectionData.tip === 'string' && sectionData.tip.length > 10) {
        tip = { text: sectionData.tip };
      }
      
      let table: ComparisonTable | null = null;
      if (i === 1 || i === 3) {
        const tablePrompt = `Tableau comparatif pour "${question}". JSON :
{"headers": ["Critère", "Option 1", "Option 2"], "rows": [{"cells": ["...", "...", "..."]}]}
Données RÉELLES.`;
        const tableResponse = await callClaude(SYSTEM_PROMPT, [{ role: 'user', content: tablePrompt }], 800, true);
        const tableData = extractJson(tableResponse);
        if (tableData?.headers && tableData?.rows) {
          table = { headers: tableData.headers, rows: tableData.rows.map((r: any) => ({ cells: r.cells || [] })) };
        }
      }

      h2Sections.push({
        id: uuidv4(),
        question: question,
        intro: sectionData?.intro || '',
        paragraphs: [],
        conclusion: sectionData?.conclusion || '',
        tip: tip,
        table: table,
        h3s: h3s,
        hasProductGrid: false,
        products: [],
      });
    }
    
    onProgress('Génération FAQ...', 90);

    const faqPrompt = `4 questions FAQ pour "${h1}". JSON :
{"faq": [{"question": "?", "answer": "Réponse UTILE."}]}
Réponses basées sur la recherche web.`;

    const faqResponse = await callClaude(SYSTEM_PROMPT, [{ role: 'user', content: faqPrompt }], 1500, true);
    const faqData = extractJson(faqResponse);
    
    const faqItems: FAQItem[] = [];
    if (faqData?.faq && Array.isArray(faqData.faq)) {
      for (const item of faqData.faq) {
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
  
  onProgress('Recherche et rédaction...', 30);

  const prompt = `Recherche sur "${h1}" puis écris un article de ${wordCount} mots.

Structure HTML :
- <p> pour paragraphes avec <strong> sur mots-clés
- <h2> pour 1-2 sous-titres
- <ul><li> pour les listes
- Intègre ce lien : <a href="${anchorUrl}">${anchorText}</a>
${featuredProducts.length > 0 ? `- Mentionne : ${featuredProducts[0].title}` : ''}

IMPORTANT : Contenu UTILE basé sur la recherche web. Pas de remplissage.

Réponds avec UNIQUEMENT le HTML.`;

  const response = await callClaude(SYSTEM_PROMPT, [{ role: 'user', content: prompt }], deepMode ? 2000 : 1500, true);
  const content = cleanHtml(response);

  onProgress('Terminé !', 100);

  return {
    id: articleId,
    h1,
    seoTitle: `${h1.slice(0, 50)} – Livraison gratuite`,
    metaDescription: `Découvrez ${h1.toLowerCase()}. Guide pratique.`,
    slug: h1.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50),
    intro: '',
    anchorText,
    anchorUrl,
    h2Sections: [],
    faq: [],
    featuredProducts,
    blogLinks,
    status: 'draft',
    createdAt: new Date().toISOString(),
    isMini: true,
    miniContent: content,
    miniWordCount: wordCount,
  };
}
