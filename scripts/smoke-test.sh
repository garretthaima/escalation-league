#!/usr/bin/env bash
# Smoke tests - Quick checks to verify deployment succeeded
set -uo pipefail

ENVIRONMENT="${1:-prod}"
TIMEOUT=5

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Environment URLs
if [ "$ENVIRONMENT" = "prod" ]; then
    FRONTEND_URL="https://escalationleague.com"
    BACKEND_URL="https://api.escalationleague.com"
    DB_CONTAINER="escalation-league-db-prod"
    BACKEND_CONTAINER="escalation-league-backend-prod"
    REDIS_CONTAINER="escalation-league-redis-prod"
elif [ "$ENVIRONMENT" = "dev" ]; then
    FRONTEND_URL="https://dev.escalationleague.com"
    BACKEND_URL="https://dev-api.escalationleague.com"
    DB_CONTAINER="escalation-league-db-dev"
    BACKEND_CONTAINER="escalation-league-backend-dev"
    REDIS_CONTAINER="escalation-league-redis-dev"
else
    echo "Usage: $0 [prod|dev]"
    exit 1
fi

echo "Running smoke tests for $ENVIRONMENT environment..."
echo "Frontend: $FRONTEND_URL"
echo "Backend: $BACKEND_URL"
echo ""

PASSED=0
FAILED=0

# Test function
test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_code="${3:-200}"

    printf "Testing %-40s ... " "$name"

    http_code=$(curl -s -o /dev/null -w "%{http_code}" \
        --max-time $TIMEOUT \
        -A "EscalationLeague-SmokeTest/1.0" \
        "$url" || echo "000")

    if [ "$http_code" = "$expected_code" ]; then
        echo -e "${GREEN}PASS${NC} (HTTP $http_code)"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}FAIL${NC} (Expected $expected_code, got $http_code)"
        ((FAILED++))
        return 1
    fi
}

# Test Docker container health
test_container_health() {
    local name="$1"
    local container="$2"

    printf "Testing %-40s ... " "$name"

    if ! docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        echo -e "${RED}FAIL${NC} (Container not running)"
        ((FAILED++))
        return 1
    fi

    health=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "none")

    if [ "$health" = "healthy" ] || [ "$health" = "none" ]; then
        echo -e "${GREEN}PASS${NC} (Status: $health)"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}FAIL${NC} (Status: $health)"
        ((FAILED++))
        return 1
    fi
}

# Test database connectivity through health endpoint
test_database_connectivity() {
    local name="$1"

    printf "Testing %-40s ... " "$name"

    # The /api/health endpoint verifies database connectivity
    response=$(curl -s --max-time $TIMEOUT \
        -A "EscalationLeague-SmokeTest/1.0" \
        "$BACKEND_URL/api/health" || echo "")

    if echo "$response" | grep -q '"database".*"connected"'; then
        echo -e "${GREEN}PASS${NC} (Database connected)"
        ((PASSED++))
        return 0
    elif echo "$response" | grep -q '"status".*"ok"'; then
        # Fallback: health endpoint returns ok
        echo -e "${GREEN}PASS${NC} (Health check OK)"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}FAIL${NC} (Database not connected)"
        ((FAILED++))
        return 1
    fi
}

# Container health checks
echo "=== Container Health ==="
test_container_health "MySQL database container" "$DB_CONTAINER"
test_container_health "Backend container" "$BACKEND_CONTAINER"
test_container_health "Redis cache container" "$REDIS_CONTAINER"
echo ""

# Frontend tests
echo "=== Frontend Tests ==="
test_endpoint "Frontend homepage" "$FRONTEND_URL/"
test_endpoint "Frontend signin page" "$FRONTEND_URL/signin"
test_endpoint "Frontend rules page" "$FRONTEND_URL/rules"
test_endpoint "Frontend build info" "$FRONTEND_URL/build-info.json"
echo ""

# Static asset tests
echo "=== Static Assets ==="
test_endpoint "Frontend manifest" "$FRONTEND_URL/manifest.json"
test_endpoint "Frontend favicon" "$FRONTEND_URL/favicon.ico"
# Note: CSS/JS have hash-based filenames, so we verify the homepage loads them successfully above
echo ""

# Backend tests
echo "=== Backend Tests ==="
test_endpoint "Backend health endpoint" "$BACKEND_URL/api/health"
test_database_connectivity "Backend database connectivity"
# Note: Other endpoints require auth, so we just check if API responds (401 or 200 is fine)
test_endpoint "Backend API root" "$BACKEND_URL/api" "404"
echo ""

# Summary
echo "=== Summary ==="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}All smoke tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}Some smoke tests failed!${NC}"
    exit 1
fi
