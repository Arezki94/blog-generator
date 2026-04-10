import { BlogArticle, H2Section, H3Section, FAQItem, FeaturedProduct, BlogLink, Tip, ComparisonTable } from '../types';
import { v4 as uuidv4 } from 'uuid';

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
// CONNAISSANCES MÉTIER VÉRIFIÉES
// ═══════════════════════════════════════════════════════════════════════════
const EXPERTISE_POMMEAU = `
CONNAISSANCES MÉTIER VÉRIFIÉES (à croiser avec recherche web) :

🔧 PEUGEOT / CITROËN / RENAULT (PSA) :
- Système : insert plastique sur tige métallique
- Étapes : 1) Retirer le soufflet en le tirant vers le bas, 2) Tirer fermement l'ancien pommeau vers le haut, 3) Vérifier l'insert plastique (le garder s'il est bon, sinon le remplacer), 4) Emboîter le nouveau pommeau en appuyant fort
- Pas de vissage, pas d'outil nécessaire
- Temps : 2-3 minutes

🔧 BMW (1998-2014) :
- Étapes : 1) Tirer l'ancien pommeau vers le haut, 2) Déclipser le plastique de la console centrale, 3) Monter les câbles inclus (pour rétroéclairage si applicable), 4) Emboîter le nouveau pommeau de force
- Temps : 5-10 minutes

IMPORTANT : Toujours vérifier ces infos avec une recherche web pour les compléter/confirmer selon le modèle exact.`;

const SYSTEM_PROMPT_SHORT = `Tu es un expert en pommeaux de vitesse pour pommeaudevitesse.com.

${EXPERTISE_POMMEAU}

STYLE D'ÉCRITURE - ARTICLE COURT ET EFFICACE :
- RÉPONDRE À LA QUESTION DÈS LA PREMIÈRE PHRASE
- Paragraphes de 2-3 lignes MAX
- Aller droit au but, zéro remplissage
- Ton direct et pratique, comme un mécanicien qui explique à un ami
- Utiliser des listes pour les étapes
- Gras sur les mots-clés importants

RÈGLES STRICTES :
- JAMAIS de possessifs commerciaux : "ce", "ces", "nos", "notre", "votre", "vos"
- Matériaux honnêtes : "simili-cuir" jamais "cuir véritable"
- Croiser les infos métier avec la recherche web
- Si une info trouvée en ligne contredit les connaissances métier, mentionner les deux`;

const SYSTEM_PROMPT_LONG = `Tu es un expert en pommeaux de vitesse pour pommeaudevitesse.com.

${EXPERTISE_POMMEAU}

STYLE D'ÉCRITURE - ARTICLE COMPLET :
- Introduction qui pose le contexte
- Sections détaillées avec exemples
- Tableaux comparatifs
- Conseils pratiques
- FAQ complète

RÈGLES STRICTES :
- JAMAIS de possessifs commerciaux : "ce", "ces", "nos", "notre", "votre", "vos"
- Matériaux honnêtes : "simili-cuir" jamais "cuir véritable"
- Croiser les infos métier avec la recherche web
- Si une info trouvée en ligne contredit les connaissances métier, mentionner les deux`;

// ═══════════════════════════════════════════════════════════════════════════
// MODE ARTICLE COURT (400-700 mots)
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
  
  try {
    // ─── ÉTAPE 1 : Recherche et vérification des infos ───────────────────
    onProgress('Recherche et vérification...', 10);
    
    const researchPrompt = `Recherche des informations sur "${h1}" pour vérifier et compléter mes connaissances.

Mes connaissances actuelles :
${EXPERTISE_POMMEAU}

Réponds avec ce JSON :
{
  "infosTrouvees": "Résumé des infos importantes trouvées en ligne",
  "confirmation": true/false (est-ce que ça confirme mes connaissances ?),
  "infosSupplementaires": "Détails supplémentaires utiles trouvés"
}`;

    await callClaude(SYSTEM_PROMPT_SHORT, [{ role: 'user', content: researchPrompt }], 1000, true);

    // ─── ÉTAPE 2 : Planification courte ──────────────────────────────────
    onProgress('Planification...', 20);
    
    const planPrompt = `Pour "${h1}", réponds UNIQUEMENT avec ce JSON :
{
  "seoTitle": "titre max 55 car. accrocheur – Livraison gratuite",
  "metaDescription": "réponse directe en 150 car. max, commence par un verbe",
  "h2Questions": ["question 1 ?", "question 2 ?", "question 3 ?"]
}

Seulement 3 questions H2, les plus importantes pour répondre à "${h1}".`;

    const planResponse = await callClaude(SYSTEM_PROMPT_SHORT, [{ role: 'user', content: planPrompt }], 800, true);
    const planData = extractJson(planResponse);
    
    const seoTitle = planData?.seoTitle || `${h1.slice(0, 50)} – Livraison gratuite`;
    const metaDescription = planData?.metaDescription || `Découvrez ${h1.toLowerCase()}. Réponse rapide et pratique.`;
    const h2Questions: string[] = (planData?.h2Questions || []).slice(0, 3);
    
    while (h2Questions.length < 3) {
      h2Questions.push(`Comment procéder ?`);
    }

    // ─── ÉTAPE 3 : Introduction DIRECTE ──────────────────────────────────
    onProgress('Rédaction intro directe...', 30);

    const introPrompt = `Écris une intro de 40-60 mots pour "${h1}".

RÈGLE D'OR : Réponds à la question DÈS LA PREMIÈRE PHRASE.

Exemple de style :
"Tirez fermement vers le haut — le pommeau s'emboîte sur un insert plastique, pas de vissage. L'opération prend 2 minutes..."

Inclure ce lien naturellement : <a href="${anchorUrl}">${anchorText}</a>

Réponds avec UNIQUEMENT le HTML (<p> avec <strong> sur mots-clés). Pas de JSON.`;

    const introResponse = await callClaude(SYSTEM_PROMPT_SHORT, [{ role: 'user', content: introPrompt }], 500, true);
    const intro = cleanHtml(introResponse);

    // ─── ÉTAPE 4 : Sections H2 courtes ───────────────────────────────────
    const h2Sections: H2Section[] = [];
    
    for (let i = 0; i < 3; i++) {
      const question = h2Questions[i];
      onProgress(`Section ${i + 1}/3...`, 40 + (i * 15));
      
      let extraContext = '';
      if (i === 0 && featuredProducts.length > 0) {
        extraContext += `\nMentionne ce produit : "${featuredProducts[0].title}" (lien: ${featuredProducts[0].url})`;
      }
      if (i === 1 && blogLinks.length > 0) {
        extraContext += `\nIntègre ce lien : <a href="${blogLinks[0].url}">${blogLinks[0].anchorText}</a>`;
      }

      const sectionPrompt = `Pour "${question}", réponds UNIQUEMENT avec ce JSON :
{
  "h3": {
    "title": "Sous-titre court et pratique",
    "content": "<p>Réponse directe en 2-3 phrases avec <strong>mots-clés</strong>.</p><ul><li>Étape 1 courte</li><li>Étape 2 courte</li><li>Étape 3 courte</li></ul>"
  },
  "tip": "Conseil pratique en 1 phrase (ou null)"
}

IMPORTANT : 
- Réponse DIRECTE, pas de blabla
- 80 mots MAX pour tout le contenu
- Utilise les connaissances métier vérifiées${extraContext}`;

      const sectionResponse = await callClaude(SYSTEM_PROMPT_SHORT, [{ role: 'user', content: sectionPrompt }], 800, true);
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
    {"cells": ["Difficulté", "Facile", "Moyen"]},
    {"cells": ["Temps", "2 min", "5 min"]}
  ]
}
2-3 lignes MAX.`;
        const tableResponse = await callClaude(SYSTEM_PROMPT_SHORT, [{ role: 'user', content: tablePrompt }], 400, true);
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
    
    // ─── ÉTAPE 5 : FAQ courte (2 questions) ──────────────────────────────
    onProgress('FAQ rapide...', 90);

    const faqPrompt = `2 questions FAQ pour "${h1}". JSON uniquement :
{
  "faq": [
    {"question": "Question pratique 1 ?", "answer": "Réponse en 1-2 phrases max."},
    {"question": "Question pratique 2 ?", "answer": "Réponse en 1-2 phrases max."}
  ]
}`;

    const faqResponse = await callClaude(SYSTEM_PROMPT_SHORT, [{ role: 'user', content: faqPrompt }], 600, true);
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
// MODE ARTICLE COMPLET (existant, avec recherche web)
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
  
  try {
    onProgress('Recherche et planification...', 5);
    
    const planPrompt = `Pour "${h1}", fais une recherche web puis réponds UNIQUEMENT avec ce JSON :
{
  "seoTitle": "titre max 55 caractères – Livraison gratuite",
  "metaDescription": "description max 150 caractères commençant par un verbe",
  "h2Questions": ["question 1 ?", "question 2 ?", "question 3 ?", "question 4 ?", "question 5 ?", "question 6 ?"]
}`;

    const planResponse = await callClaude(SYSTEM_PROMPT_LONG, [{ role: 'user', content: planPrompt }], 1500, true);
    const planData = extractJson(planResponse);
    
    const seoTitle = planData?.seoTitle || `${h1.slice(0, 50)} – Livraison gratuite`;
    const metaDescription = planData?.metaDescription || `Découvrez comment ${h1.toLowerCase()}. Guide complet.`;
    const h2Questions: string[] = planData?.h2Questions?.slice(0, h2Count) || [];
    
    while (h2Questions.length < h2Count) {
      h2Questions.push(`Comment choisir le bon pommeau ?`);
    }

    onProgress('Rédaction introduction...', 15);

    const introPrompt = `Recherche des infos sur "${h1}" puis écris une introduction de 80-100 mots.
Inclure ce lien : <a href="${anchorUrl}">${anchorText}</a>
Réponds avec UNIQUEMENT le HTML.`;

    const introResponse = await callClaude(SYSTEM_PROMPT_LONG, [{ role: 'user', content: introPrompt }], 1000, true);
    const intro = cleanHtml(introResponse);

    const h2Sections: H2Section[] = [];
    const progressPerSection = 60 / h2Count;
    
    for (let i = 0; i < h2Count; i++) {
      const question = h2Questions[i];
      onProgress(`Recherche section ${i + 1}/${h2Count}...`, 20 + (i * progressPerSection));
      
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
  "h3s": [{"title": "Sous-titre", "content": "<p>Contenu avec <strong>mots-clés</strong>.</p>"}],
  "tip": "Conseil pratique (ou null)",
  "conclusion": "Phrase de conclusion"
}
Utilise les connaissances métier + recherche web.${extraContext}`;

      const sectionResponse = await callClaude(SYSTEM_PROMPT_LONG, [{ role: 'user', content: sectionPrompt }], deepMode ? 2500 : 2000, true);
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
{"headers": ["Critère", "Option 1", "Option 2"], "rows": [{"cells": ["...", "...", "..."]}]}`;
        const tableResponse = await callClaude(SYSTEM_PROMPT_LONG, [{ role: 'user', content: tablePrompt }], 800, true);
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
{"faq": [{"question": "?", "answer": "Réponse."}]}`;

    const faqResponse = await callClaude(SYSTEM_PROMPT_LONG, [{ role: 'user', content: faqPrompt }], 1500, true);
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
// MODE MINI ARTICLE (existant)
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
  
  onProgress('Recherche et rédaction...', 30);

  const prompt = `Recherche sur "${h1}" puis écris un article de ${wordCount} mots.
Structure : <p>, <h2>, <ul><li>, <strong>
Lien à intégrer : <a href="${anchorUrl}">${anchorText}</a>
${featuredProducts.length > 0 ? `Produit : ${featuredProducts[0].title}` : ''}
HTML uniquement, pas de JSON.`;

  const response = await callClaude(SYSTEM_PROMPT_SHORT, [{ role: 'user', content: prompt }], deepMode ? 2000 : 1500, true);
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
