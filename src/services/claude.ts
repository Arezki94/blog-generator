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
  // Utiliser extractedText si disponible (recherche web), sinon content standard
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

const SYSTEM_PROMPT = `Tu es un expert en pommeaux de vitesse pour pommeaudevitesse.com.

CONNAISSANCES TECHNIQUES :
- Véhicules PSA (Peugeot/Citroën) : insert plastique 12mm, emboîtement sans vissage
- Véhicules Renault : système similaire avec clip de déverrouillage
- Démontage : tirer fermement vers le haut, parfois appuyer sur clip
- Soufflet/manchon à retirer avant sur certains modèles

RÈGLES D'ÉCRITURE :
- JAMAIS de possessifs commerciaux : "ce", "ces", "nos", "notre", "votre", "vos"
- Matériaux honnêtes : "simili-cuir" jamais "cuir véritable"
- Donner des VRAIES infos techniques utiles
- Ton expert mais accessible

IMPORTANT : Utilise la recherche web pour trouver des informations réelles et à jour.`;

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
    // ═══════════════════════════════════════════════════════════════════════
    // ÉTAPE 1 : Planification avec recherche web
    // ═══════════════════════════════════════════════════════════════════════
    onProgress('Recherche et planification...', 5);
    
    const planPrompt = `Pour "${h1}", fais d'abord une recherche web pour comprendre le sujet, puis réponds UNIQUEMENT avec ce JSON :
{
  "seoTitle": "titre max 55 caractères – Livraison gratuite",
  "metaDescription": "description max 150 caractères commençant par un verbe",
  "h2Questions": ["question 1 ?", "question 2 ?", "question 3 ?", "question 4 ?", "question 5 ?", "question 6 ?"]
}

Les questions H2 doivent être celles que les gens cherchent vraiment sur Google.`;

    const planResponse = await callClaude(SYSTEM_PROMPT, [{ role: 'user', content: planPrompt }], 1500, true);
    const planData = extractJson(planResponse);
    
    const seoTitle = planData?.seoTitle || `${h1.slice(0, 50)} – Livraison gratuite`;
    const metaDescription = planData?.metaDescription || `Découvrez comment ${h1.toLowerCase()}. Guide complet.`;
    const h2Questions: string[] = planData?.h2Questions?.slice(0, h2Count) || [];
    
    while (h2Questions.length < h2Count) {
      h2Questions.push(`Comment choisir le bon pommeau ?`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ÉTAPE 2 : Introduction avec recherche web
    // ═══════════════════════════════════════════════════════════════════════
    onProgress('Rédaction introduction...', 15);

    const introPrompt = `Recherche des infos sur "${h1}" puis écris une introduction de 80-100 mots.

Inclure :
- Le problème du lecteur (pommeau usé, cassé)
- Des infos techniques RÉELLES trouvées en ligne
- Ce lien naturellement intégré : <a href="${anchorUrl}">${anchorText}</a>

Réponds avec UNIQUEMENT le HTML (balises <p>, quelques <strong> sur mots-clés). Pas de JSON.`;

    const introResponse = await callClaude(SYSTEM_PROMPT, [{ role: 'user', content: introPrompt }], 1000, true);
    const intro = cleanHtml(introResponse);

    // ═══════════════════════════════════════════════════════════════════════
    // ÉTAPE 3 : Sections H2 avec recherche web
    // ═══════════════════════════════════════════════════════════════════════
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

      const sectionPrompt = `Recherche des informations sur "${question}" puis réponds UNIQUEMENT avec ce JSON :
{
  "intro": "1-2 phrases d'introduction basées sur des faits réels",
  "h3s": [
    {
      "title": "Sous-titre H3 pertinent",
      "content": "<p>Paragraphe avec <strong>mots-clés</strong> et infos techniques RÉELLES trouvées en ligne.</p><ul><li>Point technique 1</li><li>Point technique 2</li></ul>"
    }
  ],
  "tip": "Conseil pratique utile basé sur des vraies recommandations (ou null)",
  "conclusion": "Phrase de conclusion"
}

IMPORTANT : Utilise des informations RÉELLES trouvées sur le web, pas des généralités.${extraContext}`;

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
        const tablePrompt = `Recherche des comparatifs pour "${question}" et génère un tableau. Réponds UNIQUEMENT avec ce JSON :
{
  "headers": ["Critère", "Option 1", "Option 2"],
  "rows": [
    {"cells": ["Prix moyen", "20-30€", "40-60€"]},
    {"cells": ["Matériau", "Plastique ABS", "Simili-cuir"]},
    {"cells": ["Durabilité", "3-5 ans", "5-8 ans"]}
  ]
}

Utilise des données RÉELLES trouvées en ligne.`;
        const tableResponse = await callClaude(SYSTEM_PROMPT, [{ role: 'user', content: tablePrompt }], 800, true);
        const tableData = extractJson(tableResponse);
        if (tableData?.headers && tableData?.rows) {
          table = {
            headers: tableData.headers,
            rows: tableData.rows.map((r: any) => ({ cells: r.cells || [] })),
          };
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
    
    // ═══════════════════════════════════════════════════════════════════════
    // ÉTAPE 4 : FAQ avec recherche web
    // ═══════════════════════════════════════════════════════════════════════
    onProgress('Génération FAQ...', 90);

    const faqPrompt = `Recherche les questions fréquentes sur "${h1}" puis réponds UNIQUEMENT avec ce JSON :
{
  "faq": [
    {"question": "Question fréquente 1 ?", "answer": "Réponse basée sur des faits réels."},
    {"question": "Question fréquente 2 ?", "answer": "Réponse technique précise."},
    {"question": "Question fréquente 3 ?", "answer": "Réponse pratique."},
    {"question": "Question fréquente 4 ?", "answer": "Réponse utile."}
  ]
}

Les réponses doivent être basées sur des VRAIES informations trouvées en ligne.`;

    const faqResponse = await callClaude(SYSTEM_PROMPT, [{ role: 'user', content: faqPrompt }], 1500, true);
    const faqData = extractJson(faqResponse);
    
    const faqItems: FAQItem[] = [];
    if (faqData?.faq && Array.isArray(faqData.faq)) {
      for (const item of faqData.faq) {
        if (item.question && item.answer) {
          faqItems.push({
            question: item.question,
            answer: item.answer,
          });
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

  const prompt = `Recherche des informations sur "${h1}" puis écris un article de ${wordCount} mots.

Structure HTML :
- <p> pour paragraphes avec <strong> sur mots-clés importants
- <h2> pour 1-2 sous-titres
- <ul><li> pour une liste de points
- Intègre ce lien : <a href="${anchorUrl}">${anchorText}</a>
${featuredProducts.length > 0 ? `- Mentionne : ${featuredProducts[0].title}` : ''}

IMPORTANT : Utilise des informations RÉELLES trouvées sur le web.

Réponds avec UNIQUEMENT le HTML, pas de JSON ni de backticks.`;

  const response = await callClaude(SYSTEM_PROMPT, [{ role: 'user', content: prompt }], deepMode ? 2000 : 1500, true);
  const content = cleanHtml(response);

  onProgress('Terminé !', 100);

  return {
    id: articleId,
    h1,
    seoTitle: `${h1.slice(0, 50)} – Livraison gratuite`,
    metaDescription: `Découvrez ${h1.toLowerCase()}. Guide pratique avec conseils d'expert.`,
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
