#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/update_packages.sh
# Update npm packages for backend and frontend, commit, and prompt redeploy.

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "[npm] Updating backend packages..."
cd escalation-league-backend
npm install
npm update || true
npm audit fix || true
cd ..

echo "[npm] Updating frontend packages..."
cd escalation-league-frontend
npm install
npm update || true
npm audit fix || true
cd ..

echo "[git] Committing lockfiles..."
git add escalation-league-backend/package*.json escalation-league-backend/package-lock.json \
        escalation-league-frontend/package*.json escalation-league-frontend/package-lock.json || true
git commit -m "chore: update npm deps (backend/frontend)" || echo "[git] Nothing to commit."
git push || echo "[git] Push skipped."

echo "[hint] Redeploy prod when ready:"
echo "COMPOSE_PROJECT_NAME=escalation-league-prod docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build"