#!/usr/bin/env bash
# rollback.sh — Restaure la base depuis une sauvegarde
# Usage: ./scripts/rollback.sh /var/backups/elevage/elevage_20260101_020000.sql.gz

set -euo pipefail

FICHIER="${1:-}"
DB_URL="${DATABASE_URL:-postgres://postgres:postgres@localhost:5432/elevage}"

if [ -z "$FICHIER" ]; then
  echo "Usage: $0 <fichier_sauvegarde.sql.gz>"
  exit 1
fi

if [ ! -f "$FICHIER" ]; then
  echo "Erreur : fichier introuvable : $FICHIER"
  exit 1
fi

echo "[$(date)] Restauration depuis : $FICHIER"
echo "ATTENTION : cette opération va écraser la base $DB_URL"
read -p "Confirmer ? (oui/non) : " CONFIRM

if [ "$CONFIRM" != "oui" ]; then
  echo "Annulé."
  exit 0
fi

gunzip -c "$FICHIER" | psql "$DB_URL"
echo "[$(date)] Restauration terminée."
