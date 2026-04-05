import { useState, useEffect } from 'react';
import { CheckCircle2, ExternalLink, Globe, Zap, Brain, Server } from 'lucide-react';

export default function Settings() {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'ok' | 'error' | null>(null);
  const [testError, setTestError] = useState('');

  const PROXY_URL = 'https://claude-proxy-production-496d.up.railway.app';

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    setTestError('');

    try {
      const res = await fetch(`${PROXY_URL}/health`);
      
      if (res.ok) {
        const data = await res.json();
        if (data.hasApiKey) {
          setTestResult('ok');
        } else {
          setTestResult('error');
          setTestError('Le proxy fonctionne mais la clé API n\'est pas configurée sur Railway.');
        }
      } else {
        setTestResult('error');
        setTestError(`Erreur ${res.status}: Le proxy ne répond pas correctement.`);
      }
    } catch (e) {
      setTestResult('error');
      setTestError(`Impossible de contacter le proxy: ${String(e)}`);
    } finally {
      setTesting(false);
    }
  }

  // Test auto au chargement
  useEffect(() => {
    handleTest();
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center shrink-0">
            <Globe size={24} className="text-blue-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Claude AI (Anthropic)</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Génération d'articles via l'IA Claude
            </p>
          </div>
        </div>

        {testResult === 'ok' ? (
          <div className="mt-3 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
            <CheckCircle2 size={15} className="text-green-600 shrink-0" />
            <span className="text-sm text-green-700 font-medium">Claude AI connecté et prêt !</span>
          </div>
        ) : testResult === 'error' ? (
          <div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
            <span className="text-sm text-red-700 font-medium">{testError}</span>
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
            <span className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-blue-700 font-medium">Vérification de la connexion...</span>
          </div>
        )}
      </div>

      {/* Proxy info */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5 space-y-4">
        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
          <Server size={15} className="text-blue-500" />
          Configuration du Proxy
        </h3>

        <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">URL du proxy Railway</p>
          <p className="text-sm font-mono text-gray-800 break-all">{PROXY_URL}</p>
        </div>

        <p className="text-xs text-gray-400 leading-relaxed">
          🔒 La clé API Anthropic est stockée de façon sécurisée sur Railway.
          Elle n'est jamais exposée dans ton navigateur.
        </p>

        <button
          onClick={handleTest}
          disabled={testing}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-semibold text-sm rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {testing ? (
            <span className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Zap size={14} />
          )}
          {testing ? 'Test en cours…' : 'Tester la connexion'}
        </button>
      </div>

      {/* Model info */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5 space-y-4">
        <h3 className="text-sm font-bold text-gray-700">Modèle utilisé</h3>

        <div className="space-y-3">
          {[
            {
              icon: <Zap size={16} className="text-blue-500" />,
              name: 'claude-3-haiku',
              desc: 'Génération rapide et économique — idéal pour les articles SEO',
              badge: 'Actif',
              badgeColor: 'bg-green-100 text-green-700',
            },
            {
              icon: <Brain size={16} className="text-purple-500" />,
              name: 'Mode Réflexion',
              desc: 'Prompts enrichis — paragraphes plus longs, structure avancée',
              badge: 'Optionnel',
              badgeColor: 'bg-purple-100 text-purple-700',
            },
          ].map((m) => (
            <div key={m.name} className="flex items-start gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-gray-200 shrink-0 mt-0.5">
                {m.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-gray-800 font-mono">{m.name}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.badgeColor}`}>{m.badge}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{m.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 px-6 py-5">
        <h3 className="text-sm font-bold text-gray-700 mb-3">Comment ça marche ?</h3>
        <ol className="space-y-2">
          {[
            'Tu génères un article depuis l\'interface',
            'La requête est envoyée à ton proxy Railway',
            'Le proxy appelle l\'API Claude avec ta clé sécurisée',
            'L\'article généré est renvoyé à ton navigateur',
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
              <span className="w-5 h-5 bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
        <a
          href="https://railway.app"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-semibold transition-colors"
        >
          <ExternalLink size={13} />
          Voir mon proxy sur Railway
        </a>
      </div>

      {/* Pricing info */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5">
        <h3 className="text-sm font-bold text-gray-700 mb-3">Coût estimé par article</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Article standard (1000 mots)', cost: '~0.01€', color: 'text-green-600' },
            { label: 'Article long (2500 mots)', cost: '~0.02€', color: 'text-green-600' },
            { label: 'Mode Réflexion (1000 mots)', cost: '~0.02€', color: 'text-amber-600' },
            { label: '100 articles/mois', cost: '~1.00€', color: 'text-blue-600' },
          ].map((item) => (
            <div key={item.label} className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
              <p className="text-xs text-gray-500">{item.label}</p>
              <p className={`text-lg font-black mt-0.5 ${item.color}`}>{item.cost}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Estimations basées sur Claude 3 Haiku ($0.25/1M tokens input, $1.25/1M tokens output).
          Bien moins cher que GPT-4 ou Claude Sonnet !
        </p>
      </div>

    </div>
  );
}
