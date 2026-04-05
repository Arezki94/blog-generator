#!/bin/bash

# 🚀 Script de lancement automatique du Blog Generator
# Double-cliquez sur ce fichier pour lancer l'app

echo "🚀 Lancement du Blog Generator..."
echo ""

# Aller dans le dossier de l'app
cd "$(dirname "$0")"

# Vérifier que node_modules existe
if [ ! -d "node_modules" ]; then
    echo "📦 Première installation... Installation des dépendances..."
    npm install
    echo ""
fi

# Lancer l'app en arrière-plan
echo "✅ Démarrage de l'application..."
npm run dev &

# Attendre que le serveur démarre
sleep 3

# Ouvrir le navigateur
echo "🌐 Ouverture du navigateur..."
open http://localhost:5173

echo ""
echo "✅ Blog Generator est lancé !"
echo "📝 Ferme cette fenêtre quand tu as fini de générer tes articles."
echo ""

# Attendre que l'utilisateur ferme la fenêtre
wait
