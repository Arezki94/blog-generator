import { BlogArticle } from './types';

// ─── Utilities ────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .substring(0, 80);
}

// ─── Meta description ─────────────────────────────────────────────────────────

export function generateMetaDescription(h1: string): string {
  const topic = h1.toLowerCase();
  const candidates = [
    `Découvrez comment choisir votre pommeau de vitesse selon vos besoins : conseils concrets, comparatif et erreurs à éviter pour ${topic}.`,
    `Choisissez le bon pommeau de vitesse sans vous tromper. Guide pratique, conseils d'experts et FAQ complète pour ${topic}.`,
    `Trouvez le pommeau de vitesse idéal grâce à nos conseils de pro : critères essentiels, tableau comparatif et FAQ pour ${topic}.`,
    `Comparez les meilleurs pommeaux de vitesse et faites le bon choix. Conseils, critères et astuces pour ${topic}.`,
    `Évitez les erreurs courantes et choisissez un pommeau de vitesse adapté à votre véhicule. Guide complet et FAQ sur ${topic}.`,
    `Apprenez à choisir le meilleur pommeau de vitesse avec notre guide complet : types, critères, matières et conseils pour ${topic}.`,
  ];
  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  return chosen.length > 155 ? chosen.substring(0, 152) + '…' : chosen;
}

// ─── Fallback Article Generator ──────────────────────────────────────────────
// Mode local désactivé - Cette fonction existe uniquement pour éviter les erreurs
// de compilation. En production, seul Perplexity est utilisé.

export async function generateFullArticle(
  h1: string,
  anchorText: string,
  anchorUrl: string,
  h2Count: number,
  strongCount: number,
  deepMode: boolean,
  onProgress: (step: string, percent: number) => void
): Promise<BlogArticle> {
  onProgress('Mode local désactivé - Utilisez Perplexity', 0);
  
  await delay(1000);
  
  throw new Error('Mode local désactivé. Veuillez utiliser Perplexity AI pour générer des articles.');
}
