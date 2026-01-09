#!/usr/bin/env bash
# Generate build info for frontend
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_PUBLIC="$PROJECT_ROOT/escalation-league-frontend/public"

# Get git info
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
BUILD_TIME=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
BUILD_NUMBER="${BUILD_NUMBER:-$(date +%Y%m%d-%H%M%S)}"

# Create build info JSON
cat > "$FRONTEND_PUBLIC/build-info.json" << EOF
{
  "buildNumber": "$BUILD_NUMBER",
  "gitCommit": "$GIT_COMMIT",
  "gitBranch": "$GIT_BRANCH",
  "buildTime": "$BUILD_TIME"
}
EOF

echo "[build-info] Generated:"
cat "$FRONTEND_PUBLIC/build-info.json"
