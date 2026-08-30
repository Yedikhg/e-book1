#!/usr/bin/env bash
# sauvegarde.sh — Sauvegarde quotidienne de la base PostgreSQL
# Usage: ./scripts/sauvegarde.sh
# Prévoir un cron : 0 2 * * * /chemin/vers/sauvegarde.sh

set -euo pipefail

DB_URL="${DATABASE_URL:-postgres://postgres:postgres@localhost:5432/elevage}"
DOSSIER="${BACKUP_DIR:-/var/backups/elevage}"
FICHIER="$DOSSIER/elevage_$(date +%Y%m%d_%H%M%S).sql.gz"
RETENTION_JOURS="${RETENTION_JOURS:-30}"

mkdir -p "$DOSSIER"

echo "[$(date)] Début de la sauvegarde → $FICHIER"
pg_dump "$DB_URL" | gzip > "$FICHIER"
echo "[$(date)] Sauvegarde terminée : $(du -sh "$FICHIER" | cut -f1)"

# Supprimer les sauvegardes plus vieilles que RETENTION_JOURS jours
find "$DOSSIER" -name 'elevage_*.sql.gz' -mtime +"$RETENTION_JOURS" -delete
echo "[$(date)] Nettoyage : fichiers > ${RETENTION_JOURS}j supprimés"
