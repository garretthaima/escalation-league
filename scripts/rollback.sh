#!/usr/bin/env bash
# Rollback to previous Docker image tag
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

ENVIRONMENT="${1:-prod}"
ROLLBACK_TAG="${2:-}"

if [ "$ENVIRONMENT" != "prod" ] && [ "$ENVIRONMENT" != "dev" ]; then
    echo "Usage: $0 [prod|dev] [optional-tag]"
    exit 1
fi

# Set compose file based on environment
if [ "$ENVIRONMENT" = "prod" ]; then
    COMPOSE_FILE="docker/compose/docker-compose.prod.yml"
    ENV_FILE=".env.prod"
else
    COMPOSE_FILE="docker/compose/docker-compose.dev.yml"
    ENV_FILE=".env.dev"
fi

echo "=== Rollback Deployment ==="
echo "Environment: $ENVIRONMENT"
echo ""

# If no tag provided, list available tags and exit
if [ -z "$ROLLBACK_TAG" ]; then
    echo "Available image tags for backend:"
    docker images compose-backend-${ENVIRONMENT} --format "table {{.Tag}}\t{{.CreatedAt}}" | grep -v latest | head -10
    echo ""
    echo "Available image tags for frontend:"
    docker images compose-frontend-${ENVIRONMENT} --format "table {{.Tag}}\t{{.CreatedAt}}" | grep -v latest | head -10
    echo ""
    echo "Usage: $0 $ENVIRONMENT <tag>"
    exit 1
fi

# Verify tag exists
if ! docker images compose-backend-${ENVIRONMENT}:${ROLLBACK_TAG} --format "{{.Tag}}" | grep -q "$ROLLBACK_TAG"; then
    echo "Error: Tag $ROLLBACK_TAG not found for backend image"
    exit 1
fi

if ! docker images compose-frontend-${ENVIRONMENT}:${ROLLBACK_TAG} --format "{{.Tag}}" | grep -q "$ROLLBACK_TAG"; then
    echo "Error: Tag $ROLLBACK_TAG not found for frontend image"
    exit 1
fi

echo "Rolling back to tag: $ROLLBACK_TAG"
echo ""

# Tag the rollback images as latest
docker tag compose-backend-${ENVIRONMENT}:${ROLLBACK_TAG} compose-backend-${ENVIRONMENT}:latest
docker tag compose-frontend-${ENVIRONMENT}:${ROLLBACK_TAG} compose-frontend-${ENVIRONMENT}:latest

# Restart containers with rollback images
echo "Restarting containers with rollback images..."
cd "$PROJECT_ROOT"
docker-compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --force-recreate

echo ""
echo "Waiting for services to start..."
sleep 15

echo "Running smoke tests..."
if ./scripts/smoke-test.sh "$ENVIRONMENT"; then
    echo ""
    echo "=== Rollback Successful ==="
    echo "Rolled back to: $ROLLBACK_TAG"
    echo "$ROLLBACK_TAG" > "/tmp/escalation-league-${ENVIRONMENT}-current-tag"
else
    echo ""
    echo "=== Rollback completed but smoke tests failed ==="
    echo "Check container logs for issues"
    exit 1
fi
