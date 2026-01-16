#!/usr/bin/env bash
# Tagged Deployment - Tag images before deploying for easy rollback
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

ENVIRONMENT="${1:-prod}"
BUILD_TAG="${2:-$(date +%Y%m%d-%H%M%S)}"

if [ "$ENVIRONMENT" != "prod" ] && [ "$ENVIRONMENT" != "dev" ]; then
    echo "Usage: $0 [prod|dev] [build-tag]"
    exit 1
fi

# Check that we're on the main branch (production only)
if [ "$ENVIRONMENT" = "prod" ]; then
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    if [ "$CURRENT_BRANCH" != "main" ]; then
        echo "❌ Error: Production deployments must be done from the 'main' branch."
        echo "   Current branch: $CURRENT_BRANCH"
        echo ""
        echo "   To switch to main: git checkout main"
        echo "   To bypass this check (not recommended): SKIP_BRANCH_CHECK=1 make deploy-prod"
        if [ "${SKIP_BRANCH_CHECK:-}" != "1" ]; then
            exit 1
        fi
        echo "   ⚠️  SKIP_BRANCH_CHECK is set, proceeding anyway..."
    fi
fi

echo "=== Tagged Deployment ==="
echo "Environment: $ENVIRONMENT"
echo "Build tag: $BUILD_TAG"
echo ""

# Set compose file based on environment
if [ "$ENVIRONMENT" = "prod" ]; then
    COMPOSE_FILE="docker/compose/docker-compose.prod.yml"
    ENV_FILE=".env.prod"
    BACKEND_IMAGE="escalation-league-backend-prod"
    FRONTEND_IMAGE="escalation-league-frontend-prod"
else
    COMPOSE_FILE="docker/compose/docker-compose.dev.yml"
    ENV_FILE=".env.dev"
    BACKEND_IMAGE="escalation-league-backend-dev"
    FRONTEND_IMAGE="escalation-league-frontend-dev"
fi

# Step 1: Build and tag images
echo "Step 1: Building images..."
cd "$PROJECT_ROOT"
docker-compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" build

# Tag the newly built images
echo "Step 2: Tagging images with $BUILD_TAG..."
docker tag compose-backend-${ENVIRONMENT} compose-backend-${ENVIRONMENT}:${BUILD_TAG}
docker tag compose-frontend-${ENVIRONMENT} compose-frontend-${ENVIRONMENT}:${BUILD_TAG}
docker tag compose-backend-${ENVIRONMENT} compose-backend-${ENVIRONMENT}:latest
docker tag compose-frontend-${ENVIRONMENT} compose-frontend-${ENVIRONMENT}:latest

echo "Tagged:"
echo "  - compose-backend-${ENVIRONMENT}:${BUILD_TAG}"
echo "  - compose-frontend-${ENVIRONMENT}:${BUILD_TAG}"
echo ""

# Step 3: Deploy
echo "Step 3: Deploying with new images..."
docker-compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --force-recreate

# Step 4: Wait and health check
echo "Step 4: Waiting for services to be healthy..."
sleep 20

BACKEND_CONTAINER="${BACKEND_IMAGE}"
FRONTEND_CONTAINER="${FRONTEND_IMAGE}"

BACKEND_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "$BACKEND_CONTAINER" 2>/dev/null || echo "none")
FRONTEND_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "$FRONTEND_CONTAINER" 2>/dev/null || echo "none")

echo "Backend health: $BACKEND_HEALTH"
echo "Frontend health: $FRONTEND_HEALTH"

if [ "$BACKEND_HEALTH" != "healthy" ] && [ "$BACKEND_HEALTH" != "none" ]; then
    echo "WARNING: Backend is not healthy!"
fi

if [ "$FRONTEND_HEALTH" != "healthy" ] && [ "$FRONTEND_HEALTH" != "none" ]; then
    echo "WARNING: Frontend is not healthy!"
fi

# Step 5: Smoke tests
echo ""
echo "Step 5: Running smoke tests..."
if ./scripts/smoke-test.sh "$ENVIRONMENT"; then
    echo ""
    echo "=== Deployment Successful ==="
    echo "Active tag: $BUILD_TAG"
    echo ""
    echo "To rollback: ./scripts/rollback.sh $ENVIRONMENT $BUILD_TAG"
    
    # Save current tag for rollback reference
    echo "$BUILD_TAG" > "/tmp/escalation-league-${ENVIRONMENT}-current-tag"
    
    # Log successful deployment
    ALERT_FILE="/tmp/escalation-league-${ENVIRONMENT}-alerts.log"
    echo "[$(date -u +"%Y-%m-%d %H:%M:%S UTC")] [INFO] Deployment successful: $BUILD_TAG" >> "$ALERT_FILE"
else
    echo ""
    echo "=== Smoke Tests Failed ==="
    echo "Deployment completed but verification failed."
    echo "To rollback: ./scripts/rollback.sh $ENVIRONMENT"
    
    # Alert on failure
    ALERT_FILE="/tmp/escalation-league-${ENVIRONMENT}-alerts.log"
    echo "[$(date -u +"%Y-%m-%d %H:%M:%S UTC")] [ERROR] Deployment failed: $BUILD_TAG smoke tests failed" >> "$ALERT_FILE"
    
    # Send webhook alert if configured
    if [ -n "${MONITORING_WEBHOOK_URL:-}" ]; then
        curl -X POST "$MONITORING_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"content\":\"[$ENVIRONMENT] DEPLOYMENT FAILED: Tag $BUILD_TAG smoke tests failed\"}" \
            --silent --max-time 5 || true
    fi
    
    exit 1
fi
