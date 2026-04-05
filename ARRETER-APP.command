#!/bin/bash

# 🛑 Script pour arrêter le Blog Generator

echo "🛑 Arrêt du Blog Generator..."

# Tuer tous les processus npm run dev
pkill -f "vite"

echo "✅ Application arrêtée."
echo ""
echo "Tu peux fermer cette fenêtre."

sleep 2
