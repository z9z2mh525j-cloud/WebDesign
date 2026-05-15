#!/bin/bash

# Script per automatizzare Git: add, commit e push

# Messaggio di commit predefinito se non fornito
MESSAGE=${1:-"Aggiornamento automatico"}

# Ottieni il nome del branch corrente
BRANCH=$(git rev-parse --abbrev-ref HEAD)

echo "🚀 Inizio sincronizzazione su branch: $BRANCH..."

# Aggiungi tutti i file
git add .

# Esegui il commit
if git commit -m "$MESSAGE"; then
    echo "✅ Commit effettuato: $MESSAGE"
else
    echo "ℹ️ Nulla da committare (working tree clean)."
fi

# Esegui il push
echo "📤 Caricamento su GitHub..."
if git push origin "$BRANCH"; then
    echo "🎉 Operazione completata con successo!"
else
    echo "❌ Errore durante il push. Controlla la connessione o i permessi."
    exit 1
fi
