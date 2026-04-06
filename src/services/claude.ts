import { BlogArticle, H2Section, H3Section, FAQItem, FeaturedProduct, BlogLink, Tip, ComparisonTable } from '../types';
import { v4 as uuidv4 } from 'uuid';

const PROXY_URL = 'https://claude-proxy-production-496d.up.railway.app';

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeResponse {
  content: Array<{ type: string; text: string }>;
}

async function callClaude(
  systemPrompt: string,
  messages: ClaudeMessage[],
  maxTokens: number = 4096
): Promise<string> {
  const response = await fetch(`${PROXY_URL}/api/claude`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${error}`);
  }

  const data: ClaudeResponse = await response.json();
  let text = data.content[0]?.text || '';
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
  // Essayer de trouver du JSON dans la réponse
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
- Ton expert mais accessible`;

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
    // ÉTAPE 1 : Planification
    // ═══════════════════════════════════════════════════════════════════════
    onProgress('Planification...', 5);
    
    const planPrompt = `Pour "${h1}", réponds UNIQUEMENT avec ce JSON (pas de texte avant/après) :
{
  "seoTitle": "titre max 55 caractères – Livraison gratuite",
  "metaDescription": "description max 150 caractères commençant par un verbe",
  "h2Questions": ["question 1 ?", "question 2 ?", "question 3 ?", "question 4 ?", "question 5 ?", "question 6 ?"]
}

Les questions H2 doivent être celles que les gens cherchent vraiment sur Google.`;

    const planResponse = await callClaude(SYSTEM_PROMPT, [{ role: 'user', content: planPrompt }]);
    const planData = extractJson(planResponse);
    
    const seoTitle = planData?.seoTitle || `${h1.slice(0, 50)} – Livraison gratuite`;
    const metaDescription = planData?.metaDescription || `Découvrez comment ${h1.toLowerCase()}. Guide complet.`;
    const h2Questions: string[] = planData?.h2Questions?.slice(0, h2Count) || [];
    
    // Compléter si pas assez de questions
    while (h2Questions.length < h2Count) {
      h2Questions.push(`Comment choisir le bon pommeau ?`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ÉTAPE 2 : Introduction
    // ═══════════════════════════════════════════════════════════════════════
    onProgress('Rédaction introduction...', 15);

    const introPrompt = `Écris une introduction de 80-100 mots pour "${h1}".

Inclure :
- Le problème du lecteur (pommeau usé, cassé)
- Mentionner le système d'emboîtement PSA (insert plastique 12mm)
- Ce lien naturellement intégré : <a href="${anchorUrl}">${anchorText}</a>

Réponds avec UNIQUEMENT le HTML (balises <p>, quelques <strong> sur mots-clés). Pas de JSON.`;

    const introResponse = await callClaude(SYSTEM_PROMPT, [{ role: 'user', content: introPrompt }]);
    const intro = cleanHtml(introResponse);

    // ═══════════════════════════════════════════════════════════════════════
    // ÉTAPE 3 : Sections H2
    // ═══════════════════════════════════════════════════════════════════════
    const h2Sections: H2Section[] = [];
    const progressPerSection = 60 / h2Count;
    
    for (let i = 0; i < h2Count; i++) {
      const question = h2Questions[i];
      onProgress(`Section ${i + 1}/${h2Count}...`, 20 + (i * progressPerSection));
      
      // Liens à intégrer
      let extraContext = '';
      if (i === 0 && featuredProducts.length > 0) {
        extraContext += `\nMentionne ce produit : "${featuredProducts[0].title}" avec lien ${featuredProducts[0].url}`;
      }
      if (i === Math.floor(h2Count / 2) && blogLinks.length > 0) {
        extraContext += `\nIntègre ce lien : <a href="${blogLinks[0].url}">${blogLinks[0].anchorText}</a>`;
      }

      const sectionPrompt = `Pour la section "${question}", réponds UNIQUEMENT avec ce JSON :
{
  "intro": "1-2 phrases d'introduction de la section",
  "h3s": [
    {
      "title": "Sous-titre H3",
      "content": "<p>Paragraphe avec <strong>mots-clés</strong> et infos techniques.</p><ul><li>Point 1</li><li>Point 2</li></ul>"
    }
  ],
  "tip": "Conseil pratique utile (ou null si pas pertinent)",
  "conclusion": "Phrase de conclusion de section"
}

IMPORTANT : Le content des H3 doit être du HTML valide avec <p>, <ul>, <li>, <strong>.
Donne des vraies infos techniques (insert 12mm, clip déverrouillage, etc.)${extraContext}`;

      const sectionResponse = await callClaude(SYSTEM_PROMPT, [{ role: 'user', content: sectionPrompt }], deepMode ? 2000 : 1500);
      const sectionData = extractJson(sectionResponse);
      
      // Construire les H3
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
      
      // Construire le tip
      let tip: Tip | null = null;
      if (sectionData?.tip && typeof sectionData.tip === 'string' && sectionData.tip.length > 10) {
        tip = { text: sectionData.tip };
      }
      
      // Ajouter un tableau pour certaines sections
      let table: ComparisonTable | null = null;
      if (i === 1 || i === 3) {
        // Générer un tableau comparatif
        const tablePrompt = `Génère un tableau comparatif pour "${question}". Réponds UNIQUEMENT avec ce JSON :
{
  "headers": ["Critère", "Option 1", "Option 2"],
  "rows": [
    {"cells": ["Prix", "20-30€", "40-60€"]},
    {"cells": ["Matériau", "Plastique ABS", "Simili-cuir"]}
  ]
}`;
        const tableResponse = await callClaude(SYSTEM_PROMPT, [{ role: 'user', content: tablePrompt }], 500);
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
        paragraphs: [], // On utilise h3s à la place
        conclusion: sectionData?.conclusion || '',
        tip: tip,
        table: table,
        h3s: h3s,
        hasProductGrid: false,
        products: [],
      });
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // ÉTAPE 4 : FAQ
    // ═══════════════════════════════════════════════════════════════════════
    onProgress('Génération FAQ...', 90);

    const faqPrompt = `Génère 4 questions/réponses FAQ pour "${h1}". Réponds UNIQUEMENT avec ce JSON :
{
  "faq": [
    {"question": "Question 1 ?", "answer": "Réponse concise avec infos techniques."},
    {"question": "Question 2 ?", "answer": "Réponse concise."},
    {"question": "Question 3 ?", "answer": "Réponse concise."},
    {"question": "Question 4 ?", "answer": "Réponse concise."}
  ]
}

Les réponses doivent être techniques et utiles (diamètre insert, méthode démontage, etc.)`;

    const faqResponse = await callClaude(SYSTEM_PROMPT, [{ role: 'user', content: faqPrompt }]);
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
  
  onProgress('Rédaction en cours...', 30);

  const prompt = `Écris un article de ${wordCount} mots sur "${h1}".

Structure HTML :
- <p> pour paragraphes avec <strong> sur mots-clés importants
- <h2> pour 1-2 sous-titres
- <ul><li> pour une liste de points
- Intègre ce lien : <a href="${anchorUrl}">${anchorText}</a>
${featuredProducts.length > 0 ? `- Mentionne : ${featuredProducts[0].title}` : ''}

Infos techniques à inclure : insert plastique 12mm (PSA), système emboîtement, pas de vissage.

Réponds avec UNIQUEMENT le HTML, pas de JSON ni de backticks.`;

  const response = await callClaude(SYSTEM_PROMPT, [{ role: 'user', content: prompt }], deepMode ? 1500 : 1000);
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
