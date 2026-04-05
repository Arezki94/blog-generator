import { BlogArticle, FeaturedProduct, BlogLink, H2Section } from '../types';
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
  return data.content[0]?.text || '';
}

const SEO_SYSTEM_PROMPT = `Tu es un expert en pommeaux de vitesse pour pommeaudevitesse.com.

CONNAISSANCES TECHNIQUES ESSENTIELLES :
- Les véhicules Peugeot, Citroën et Renault utilisent un INSERT DE FIXATION EN PLASTIQUE sur la tige métallique du levier
- Les pommeaux se posent par EMBOÎTEMENT sur cet insert plastique (pas de vissage)
- Le démontage se fait en tirant fermement vers le haut, parfois en appuyant sur un clip de déverrouillage
- Les inserts ont des diamètres standards : généralement 12mm pour PSA (Peugeot/Citroën)
- Certains modèles ont un soufflet/manchon à retirer avant d'accéder au pommeau

RÈGLES D'ÉCRITURE OBLIGATOIRES :
- JAMAIS de possessifs commerciaux : "ce", "ces", "nos", "notre", "votre", "vos"
- Matériaux honnêtes : écrire "simili-cuir" jamais "cuir véritable" sauf si vérifié
- Donner des VRAIES informations techniques utiles au lecteur
- Répondre VRAIMENT à la question posée dans le H1
- Ton expert mais accessible, comme un mécanicien qui explique à un ami

FORMAT DE RÉPONSE : HTML pur uniquement. Pas de JSON, pas de markdown, pas de backticks.`;

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
    onProgress('Planification de l\'article...', 5);
    
    // Étape 1 : Plan et meta
    const planPrompt = `Pour cet article sur "${h1}", donne-moi en 5 lignes maximum :
1. Un titre SEO de max 60 caractères finissant par "– Livraison gratuite"
2. Une meta description de max 155 caractères commençant par un verbe d'action
3. ${h2Count} questions H2 que se pose vraiment quelqu'un qui cherche "${h1}"

Réponds directement sans formatage spécial.`;

    const planResponse = await callClaude(SEO_SYSTEM_PROMPT, [
      { role: 'user', content: planPrompt }
    ]);
    
    const lines = planResponse.split('\n').filter(l => l.trim());
    const seoTitle = lines[0]?.replace(/^1\.\s*/, '').slice(0, 60) || `${h1.slice(0, 45)} – Livraison gratuite`;
    const metaDescription = lines[1]?.replace(/^2\.\s*/, '').slice(0, 155) || `Découvrez ${h1.toLowerCase()}. Guide complet avec conseils d'expert.`;
    
    const h2Questions: string[] = [];
    for (let i = 2; i < lines.length && h2Questions.length < h2Count; i++) {
      const q = lines[i]?.replace(/^\d+\.\s*/, '').trim();
      if (q && q.length > 10) h2Questions.push(q);
    }
    while (h2Questions.length < h2Count) {
      h2Questions.push(`Comment choisir le bon pommeau pour ${h1.toLowerCase().replace('comment ', '')} ?`);
    }

    onProgress('Rédaction de l\'introduction...', 15);

    // Étape 2 : Introduction
    const introPrompt = `Écris une introduction de 80-100 mots pour un article intitulé "${h1}".

L'introduction doit :
- Accrocher avec le problème concret du lecteur
- Mentionner que les pommeaux PSA (Peugeot/Citroën) utilisent un système d'emboîtement sur insert plastique
- Inclure naturellement ce lien : <a href="${anchorUrl}">${anchorText}</a>
- Promettre une réponse claire et pratique

Réponds avec uniquement le HTML (balises <p> avec quelques <strong> sur les mots-clés).`;

    const intro = await callClaude(SEO_SYSTEM_PROMPT, [
      { role: 'user', content: introPrompt }
    ]);

    onProgress('Rédaction des sections...', 25);

    // Étape 3 : Sections H2
    const h2Sections: H2Section[] = [];
    const progressPerSection = 55 / h2Count;
    
    for (let i = 0; i < h2Count; i++) {
      const h2Question = h2Questions[i];
      onProgress(`Section ${i + 1}/${h2Count}...`, 25 + (i * progressPerSection));
      
      let extraInstructions = '';
      if (i === 0 && featuredProducts.length > 0) {
        extraInstructions = `\nMentionne naturellement ce produit : ${featuredProducts[0].title} (lien: ${featuredProducts[0].url})`;
      }
      if (i === Math.floor(h2Count / 2) && blogLinks.length > 0) {
        extraInstructions += `\nIntègre ce lien vers un autre article : <a href="${blogLinks[0].url}">${blogLinks[0].anchorText}</a>`;
      }

      const sectionPrompt = `Écris la section complète pour cette question : "${h2Question}"

La section doit contenir :
1. Le <h2>${h2Question}</h2>
2. Un paragraphe principal de ~100 mots avec des informations VRAIES et UTILES
3. Un <h3> avec un sous-titre pertinent
4. Un paragraphe de ~60 mots
${i % 2 === 0 ? '5. Une liste <ul> de 3-4 points techniques concrets' : ''}
${extraInstructions}

IMPORTANT : Donne des vraies infos techniques (système d'insert plastique, diamètres, méthode de démontage, etc.)

Réponds avec uniquement le HTML, pas de JSON ni de commentaires.`;

      const sectionHtml = await callClaude(SEO_SYSTEM_PROMPT, [
        { role: 'user', content: sectionPrompt }
      ], deepMode ? 1500 : 1000);

      h2Sections.push({
        id: uuidv4(),
        h2: h2Question,
        paragraphs: [sectionHtml],
        h3Sections: [],
        products: [],
      });
    }
    
    onProgress('Génération de la FAQ...', 85);

    // Étape 4 : FAQ
    const faqPrompt = `Génère 4 questions/réponses FAQ pour "${h1}".

Format HTML uniquement, comme ceci :
<div class="faq-item">
<h3>Question ici ?</h3>
<p>Réponse concise de 2-3 phrases avec de vraies infos techniques.</p>
</div>

Les questions doivent être celles que les gens tapent vraiment sur Google.
Les réponses doivent être utiles et techniques (parler du système d'emboîtement, des inserts, etc.)`;

    const faqHtml = await callClaude(SEO_SYSTEM_PROMPT, [
      { role: 'user', content: faqPrompt }
    ]);
    
    // Parser la FAQ
    const faqItems: Array<{question: string, answer: string}> = [];
    const faqMatches = faqHtml.matchAll(/<h3>([^<]+)<\/h3>\s*<p>([^<]+)<\/p>/g);
    for (const match of faqMatches) {
      faqItems.push({ question: match[1], answer: match[2] });
    }

    onProgress('Article terminé !', 100);

    return {
      id: articleId,
      h1,
      seoTitle,
      metaDescription,
      intro: intro.replace(/```[a-z]*\n?/g, '').replace(/```/g, ''),
      h2Sections,
      faq: faqItems,
      anchorText,
      anchorUrl,
      featuredProducts,
      blogLinks,
      status: 'draft',
      createdAt: new Date().toISOString(),
    };
    
  } catch (error) {
    console.error('Erreur génération Claude:', error);
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
  
  onProgress('Préparation...', 10);

  const prompt = `Écris un article de ${wordCount} mots sur "${h1}".

STRUCTURE :
- Introduction accrocheuse (2 phrases)
- 2-3 paragraphes avec de vraies informations techniques
- Inclure ce lien naturellement : <a href="${anchorUrl}">${anchorText}</a>
${featuredProducts.length > 0 ? `- Mentionner ce produit : ${featuredProducts[0].title}` : ''}

RAPPEL TECHNIQUE : Les pommeaux Peugeot/Citroën/Renault utilisent un insert plastique sur lequel le pommeau s'emboîte.

FORMAT : HTML direct avec <p> et quelques <strong> sur les mots-clés. Pas de JSON.`;

  onProgress('Rédaction...', 40);

  const content = await callClaude(SEO_SYSTEM_PROMPT, [
    { role: 'user', content: prompt }
  ], deepMode ? 1500 : 1000);

  onProgress('Finalisation...', 80);

  const cleanContent = content.replace(/```[a-z]*\n?/g, '').replace(/```/g, '');

  onProgress('Terminé !', 100);

  return {
    id: articleId,
    h1,
    seoTitle: `${h1.slice(0, 45)} – Livraison gratuite`,
    metaDescription: `Découvrez ${h1.toLowerCase()}. Guide pratique avec conseils d'expert.`,
    intro: cleanContent,
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
