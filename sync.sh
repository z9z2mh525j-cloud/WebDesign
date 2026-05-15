#!/bin/bash
MESSAGE=${1:-"Aggiornamento automatico"}
BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "🚀 Inizio sincronizzazione su branch: $BRANCH..."
git add .
if git commit -m "$MESSAGE"; then
    echo "✅ Commit effettuato: $MESSAGE"
else
    echo "ℹ️ Nulla da committare."
fi
echo "📤 Caricamento su GitHub..."
git push origin "$BRANCH" && echo "🎉 Operazione completata!"
