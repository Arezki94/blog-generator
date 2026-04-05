/**
 * Service Claude API pour la génération d'articles SEO
 * Utilise le proxy Railway: claude-proxy-production-496d.up.railway.app
 */

import { BlogArticle, FeaturedProduct, BlogLink, H2Section } from '../types';
import { v4 as uuidv4 } from 'uuid';

// URL du proxy Claude sur Railway
const PROXY_URL = 'https://claude-proxy-production-496d.up.railway.app';

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeResponse {
  content: Array<{ type: string; text: string }>;
  usage?: { input_tokens: number; output_tokens: number };
}

/**
 * Appel au proxy Claude
 */
async function callClaude(
  systemPrompt: string,
  messages: ClaudeMessage[],
  maxTokens: number = 4096
): Promise<string> {
  const response = await fetch(`${PROXY_URL}/api/claude`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
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
  return data.content[0]?.text || '';
}

/**
 * System prompt pour les articles SEO pommeaudevitesse.com
 * Basé sur les règles bay' as-salam et la structure validée
 */
const SEO_SYSTEM_PROMPT = `Tu es un rédacteur SEO expert pour pommeaudevitesse.com, une boutique française de pommeaux de vitesse.

RÈGLES ÉTHIQUES (bay' as-salam) - OBLIGATOIRES :
- JAMAIS de possessifs commerciaux : "ce", "ces", "nos", "notre", "votre", "vos"
- Matériaux honnêtes : "simili-cuir" jamais "cuir véritable" sauf si vérifié
- Ton informatif et utile, pas commercial agressif

STRUCTURE HTML OBLIGATOIRE :
1. <h2>[Question H2]</h2>
2. <p>[Paragraphe ~100 mots avec mots-clés en <strong>]</p>
3. <h3>[Sous-titre H3]</h3>
4. <p>[Paragraphe ~80 mots]</p>
5. <h3>Caractéristiques du produit</h3>
6. <ul><li>...</li></ul> (specs techniques)
7. <p>[Paragraphe avec lien interne si fourni]</p>

STYLE D'ÉCRITURE :
- Prose humaine variée, pas de listes sauf specs
- Mots-clés LSI naturellement intégrés
- Éviter les répétitions, varier les angles narratifs
- Phrases entre 15-25 mots en moyenne

FORMAT DE SORTIE : JSON uniquement, pas de markdown`;

/**
 * Génère un article complet avec Claude
 */
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
    // Étape 1: Analyse et planification
    onProgress('Analyse du sujet...', 5);
    
    const planPrompt = `Analyse ce H1 et crée un plan d'article SEO optimisé.

H1: "${h1}"
Nombre de sections H2: ${h2Count}
Lien interne principal: "${anchorText}" → ${anchorUrl}
${featuredProducts.length > 0 ? `Produits à mentionner: ${featuredProducts.map(p => p.title).join(', ')}` : ''}
${blogLinks.length > 0 ? `Liens blog à intégrer: ${blogLinks.map(l => l.anchorText).join(', ')}` : ''}

Réponds en JSON:
{
  "seoTitle": "Titre SEO max 60 car. finissant par – Livraison gratuite",
  "metaDescription": "Description max 155 car. commençant par infinitif action (Découvrez, Trouvez...)",
  "h2Questions": ["Question 1?", "Question 2?", ...],
  "keywords": ["mot-clé 1", "mot-clé 2", ...],
  "angle": "Angle narratif unique pour éviter duplicate content"
}`;

    const planResponse = await callClaude(SEO_SYSTEM_PROMPT, [
      { role: 'user', content: planPrompt }
    ]);
    
    onProgress('Planification terminée', 15);
    
    let plan;
    try {
      const jsonMatch = planResponse.match(/\{[\s\S]*\}/);
      plan = JSON.parse(jsonMatch?.[0] || planResponse);
    } catch {
      plan = {
        seoTitle: `${h1.slice(0, 50)} – Livraison gratuite`,
        metaDescription: `Découvrez ${h1.toLowerCase()}. Guide complet et conseils d'experts pour bien choisir.`,
        h2Questions: Array.from({ length: h2Count }, (_, i) => `Question ${i + 1} sur ${h1}?`),
        keywords: [h1.toLowerCase(), 'pommeau de vitesse', 'levier de vitesse'],
        angle: 'Guide pratique'
      };
    }

    // Étape 2: Génération de l'introduction
    onProgress('Rédaction de l\'introduction...', 20);
    
    const introPrompt = `Rédige une introduction engageante (~80 mots) pour cet article.

H1: "${h1}"
Angle: ${plan.angle}
Mots-clés à intégrer: ${plan.keywords.slice(0, 3).join(', ')}

L'introduction doit:
- Accrocher le lecteur dès la première phrase
- Présenter le problème/besoin
- Annoncer la valeur de l'article
- Inclure le lien interne: <a href="${anchorUrl}">${anchorText}</a> dans les 300 premiers mots

Réponds avec le HTML de l'introduction uniquement (balises <p>).`;

    const intro = await callClaude(SEO_SYSTEM_PROMPT, [
      { role: 'user', content: introPrompt }
    ]);
    
    onProgress('Introduction rédigée', 25);

    // Étape 3: Génération des sections H2
    const h2Sections: H2Section[] = [];
    const progressPerSection = 60 / h2Count;
    
    for (let i = 0; i < h2Count; i++) {
      const h2Question = plan.h2Questions[i] || `Comment ${h1.toLowerCase()}?`;
      onProgress(`Rédaction section ${i + 1}/${h2Count}...`, 25 + (i * progressPerSection));
      
      const sectionPrompt = `Rédige la section H2 complète pour cette question.

Question H2: "${h2Question}"
Position dans l'article: ${i + 1}/${h2Count}
Mots-clés: ${plan.keywords.join(', ')}
${i === 0 && featuredProducts.length > 0 ? `Mentionner ce produit naturellement: ${featuredProducts[0].title} (${featuredProducts[0].url})` : ''}
${i === Math.floor(h2Count / 2) && blogLinks.length > 0 ? `Intégrer ce lien blog: <a href="${blogLinks[0].url}">${blogLinks[0].anchorText}</a>` : ''}

Structure obligatoire:
1. <h2>${h2Question}</h2>
2. <p>Paragraphe principal ~100 mots avec 2-3 <strong>mots-clés</strong></p>
3. <h3>Sous-titre pertinent</h3>
4. <p>Paragraphe secondaire ~80 mots</p>
${i % 2 === 0 ? '5. <ul><li>Point 1</li><li>Point 2</li><li>Point 3</li></ul>' : ''}

Réponds avec le HTML uniquement.`;

      const sectionHtml = await callClaude(SEO_SYSTEM_PROMPT, [
        { role: 'user', content: sectionPrompt }
      ], deepMode ? 2048 : 1024);

      h2Sections.push({
        id: uuidv4(),
        h2: h2Question,
        paragraphs: [sectionHtml],
        h3Sections: [],
        products: [],
      });
    }
    
    onProgress('Sections H2 terminées', 85);

    // Étape 4: Génération de la FAQ
    onProgress('Génération de la FAQ...', 90);
    
    const faqPrompt = `Génère 3-4 questions FAQ pertinentes avec réponses courtes.

Sujet: "${h1}"
Mots-clés: ${plan.keywords.join(', ')}

Format JSON:
{
  "faq": [
    {"question": "Question 1?", "answer": "Réponse concise ~50 mots."},
    ...
  ]
}`;

    const faqResponse = await callClaude(SEO_SYSTEM_PROMPT, [
      { role: 'user', content: faqPrompt }
    ]);
    
    let faqItems = [];
    try {
      const faqJson = JSON.parse(faqResponse.match(/\{[\s\S]*\}/)?.[0] || '{}');
      faqItems = faqJson.faq || [];
    } catch {
      faqItems = [
        { question: `Qu'est-ce qu'un ${h1.toLowerCase()}?`, answer: 'Réponse à compléter.' }
      ];
    }

    onProgress('Article terminé!', 100);

    const article: BlogArticle = {
      id: articleId,
      h1,
      seoTitle: plan.seoTitle,
      metaDescription: plan.metaDescription,
      intro,
      h2Sections,
      faq: faqItems,
      anchorText,
      anchorUrl,
      featuredProducts,
      blogLinks,
      status: 'draft',
      createdAt: new Date().toISOString(),
    };

    return article;
    
  } catch (error) {
    console.error('Erreur génération Claude:', error);
    throw error;
  }
}

/**
 * Génère un mini article (300-500 mots)
 */
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
  
  onProgress('Préparation du mini article...', 10);

  const prompt = `Rédige un mini article SEO de ${wordCount} mots exactement.

H1: "${h1}"
Lien interne obligatoire: <a href="${anchorUrl}">${anchorText}</a>
${featuredProducts.length > 0 ? `Produit à mentionner: ${featuredProducts[0].title}` : ''}

Structure:
1. Introduction accrocheuse (2-3 phrases)
2. Corps de l'article avec 2-3 paragraphes denses
3. Conclusion avec call-to-action subtil

Règles:
- Mots-clés en <strong> (3-5 maximum)
- Pas de listes à puces
- Ton expert mais accessible
- AUCUN possessif commercial (ce, ces, nos, notre)

Réponds en JSON:
{
  "seoTitle": "Max 60 car. – Livraison gratuite",
  "metaDescription": "Max 155 car. commençant par infinitif",
  "content": "<p>HTML complet de l'article</p>"
}`;

  onProgress('Claude rédige...', 30);

  const response = await callClaude(SEO_SYSTEM_PROMPT, [
    { role: 'user', content: prompt }
  ], deepMode ? 2048 : 1500);

  onProgress('Finalisation...', 80);

  let parsed;
  try {
    parsed = JSON.parse(response.match(/\{[\s\S]*\}/)?.[0] || '{}');
  } catch {
    parsed = {
      seoTitle: `${h1.slice(0, 50)} – Livraison gratuite`,
      metaDescription: `Découvrez ${h1.toLowerCase()}. Guide rapide et conseils pratiques.`,
      content: `<p>${response}</p>`
    };
  }

  onProgress('Terminé!', 100);

  return {
    id: articleId,
    h1,
    seoTitle: parsed.seoTitle,
    metaDescription: parsed.metaDescription,
    intro: parsed.content,
    h2Sections: [],
    faq: [],
    anchorText,
    anchorUrl,
    featuredProducts,
    blogLinks,
    status: 'draft',
    createdAt: new Date().toISOString(),
  };
}
