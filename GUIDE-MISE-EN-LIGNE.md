# 🎮 METTRE TON APP EN LIGNE - Guide Super Simple

## 📦 CE QUE TU AS REÇU

```
📁 Dossier à télécharger
├── 📄 railway.json          → Mettre à la RACINE de ton projet
├── 📁 src/
│   ├── 📁 components/
│   │   └── 📄 GeneratorForm.tsx   → REMPLACE ton ancien fichier
│   └── 📁 services/
│       └── 📄 claude.ts           → NOUVEAU fichier à ajouter
```

---

## 🚀 LES ÉTAPES (fais-les dans l'ordre !)

### ÉTAPE 1 : Copier les fichiers dans ton projet

1. **Ouvre ton dossier projet** sur ton ordinateur

2. **Copie `railway.json`** à la racine (là où il y a `package.json`)

3. **Remplace `src/components/GeneratorForm.tsx`** par le nouveau

4. **Ajoute `src/services/claude.ts`** (nouveau fichier)

5. **Supprime `src/services/perplexity.ts`** (on n'en a plus besoin)

---

### ÉTAPE 2 : Envoyer sur GitHub

1. **Ouvre ton terminal** (ou Git Bash sur Windows)

2. **Va dans ton dossier projet** :
   ```
   cd chemin/vers/ton/projet
   ```

3. **Tape ces 3 commandes** une par une :
   ```
   git add .
   ```
   ```
   git commit -m "Migration vers Claude"
   ```
   ```
   git push
   ```

4. ✅ Tes fichiers sont maintenant sur GitHub !

---

### ÉTAPE 3 : Créer le projet sur Railway

1. **Va sur** 👉 https://railway.app

2. **Connecte-toi** avec ton compte GitHub

3. **Clique sur** le gros bouton violet **"New Project"**

4. **Clique sur** **"Deploy from GitHub repo"**

5. **Cherche ton projet** dans la liste et clique dessus

6. **Railway commence à construire ton app** (attends 2-3 minutes ⏳)

---

### ÉTAPE 4 : Créer l'adresse de ton site

1. **Clique sur ton projet** dans Railway (le carré avec le nom)

2. **Clique sur l'onglet** **"Settings"** (en haut)

3. **Descends jusqu'à** **"Networking"**

4. **Clique sur** le bouton **"Generate Domain"**

5. ✅ Tu as maintenant une adresse ! Par exemple :
   ```
   https://ton-app-production-abc123.up.railway.app
   ```

6. **Copie cette adresse** (tu en auras besoin)

---

### ÉTAPE 5 : Autoriser ton site dans le proxy

⚠️ **TRÈS IMPORTANT** sinon ton app ne marchera pas !

1. **Va sur ton projet `claude-proxy`** dans Railway (l'autre projet)

2. **Clique sur l'onglet** **"Variables"**

3. **Trouve la ligne** `ALLOWED_ORIGINS`

4. **Clique dessus** pour la modifier

5. **Ajoute ton adresse** à la fin, avec une virgule :
   ```
   https://claude-proxy-production-496d.up.railway.app,https://ton-app-production-abc123.up.railway.app
   ```
   
   (Remplace `ton-app-production-abc123` par ta vraie adresse !)

6. **Clique sur** ✓ pour sauvegarder

7. Railway redéploie automatiquement (attends 30 secondes)

---

### ÉTAPE 6 : Tester ! 🎉

1. **Ouvre ton site** dans le navigateur :
   ```
   https://ton-app-production-abc123.up.railway.app
   ```

2. **Entre un titre d'article** et clique sur "Générer"

3. **Si ça marche** → 🎉 BRAVO C'EST EN LIGNE !

4. **Si erreur "CORS"** → Retourne à l'étape 5, tu as oublié quelque chose

---

## 🔧 SI ÇA NE MARCHE PAS

### Erreur "Failed to fetch" ou "CORS"
→ Va dans ton proxy Railway → Variables → Vérifie que `ALLOWED_ORIGINS` contient bien l'adresse de ton frontend

### L'app ne se charge pas
→ Va dans Railway → Clique sur ton projet → Onglet "Deployments" → Regarde les logs en rouge

### Le bouton "Régénérer" ne marche pas
→ Vérifie que tu as bien remplacé GeneratorForm.tsx par le nouveau

---

## 📍 RÉSUMÉ - TU AS MAINTENANT :

```
🌐 Railway
│
├── 🔵 claude-proxy (tu l'avais déjà)
│   └── https://claude-proxy-production-496d.up.railway.app
│
└── 🟢 ton-app (nouveau !)
    └── https://ton-app-production-abc123.up.railway.app
```

**Plus besoin de serveur sur ton ordi ! Tout est en ligne 24h/24 ! 🚀**

---

## 💰 COMBIEN ÇA COÛTE ?

- Railway te donne **$5 gratuits par mois**
- Ton proxy + ton app = environ **$10/mois** (ou gratuit si tu restes sous 500 heures)
- Claude API = ~**$0.001 par article** (quasi gratuit)

---

## ❓ BESOIN D'AIDE ?

Dis-moi exactement :
1. À quelle étape tu es bloqué
2. Le message d'erreur exact (copie-colle)
3. Une capture d'écran si possible
