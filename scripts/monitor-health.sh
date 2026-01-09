#!/usr/bin/env bash
# Health Monitoring Script - Check Docker container health and alert on issues
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

ENVIRONMENT="${1:-prod}"
ALERT_FILE="/tmp/escalation-league-${ENVIRONMENT}-alerts.log"
STATE_FILE="/tmp/escalation-league-${ENVIRONMENT}-health-state.txt"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Alert methods
ALERT_METHOD="${ALERT_METHOD:-log}" # log, email, webhook
WEBHOOK_URL="${MONITORING_WEBHOOK_URL:-}"
ALERT_EMAIL="${ALERT_EMAIL:-}"

log_alert() {
    local severity="$1"
    local message="$2"
    local timestamp=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
    
    echo "[$timestamp] [$severity] $message" >> "$ALERT_FILE"
    
    if [ "$ALERT_METHOD" = "webhook" ] && [ -n "$WEBHOOK_URL" ]; then
        send_webhook_alert "$severity" "$message"
    elif [ "$ALERT_METHOD" = "email" ] && [ -n "$ALERT_EMAIL" ]; then
        send_email_alert "$severity" "$message"
    fi
}

send_webhook_alert() {
    local severity="$1"
    local message="$2"
    
    # Generic webhook format (works with Discord, Slack, etc.)
    curl -X POST "$WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d "{\"content\":\"[$ENVIRONMENT] [$severity] $message\"}" \
        --silent --max-time 5 || true
}

send_email_alert() {
    local severity="$1"
    local message="$2"
    
    echo "[$ENVIRONMENT] $message" | mail -s "Escalation League Alert: $severity" "$ALERT_EMAIL" || true
}

check_container_health() {
    local container_name="$1"
    
    # Check if container exists
    if ! docker ps -a --format '{{.Names}}' | grep -q "^${container_name}$"; then
        echo "missing"
        return
    fi
    
    # Check if container is running
    local status=$(docker inspect --format='{{.State.Status}}' "$container_name" 2>/dev/null || echo "unknown")
    if [ "$status" != "running" ]; then
        echo "stopped"
        return
    fi
    
    # Check health status (if health check is configured)
    local health=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "none")
    echo "$health"
}

get_container_uptime() {
    local container_name="$1"
    docker inspect --format='{{.State.StartedAt}}' "$container_name" 2>/dev/null || echo "unknown"
}

# Main health check
echo "=== Health Monitor ==="
echo "Environment: $ENVIRONMENT"
echo "Time: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo ""

# Determine containers to check
if [ "$ENVIRONMENT" = "prod" ]; then
    CONTAINERS=("escalation-league-backend-prod" "escalation-league-frontend-prod" "escalation-league-db-prod" "escalation-league-redis-prod")
else
    CONTAINERS=("escalation-league-backend-dev" "escalation-league-frontend-dev" "escalation-league-db-dev" "escalation-league-redis-dev")
fi

ALL_HEALTHY=true
UNHEALTHY_CONTAINERS=()

for container in "${CONTAINERS[@]}"; do
    health=$(check_container_health "$container")
    
    case "$health" in
        "healthy")
            echo -e "${GREEN}✓${NC} $container: healthy"
            ;;
        "unhealthy")
            echo -e "${RED}✗${NC} $container: UNHEALTHY"
            ALL_HEALTHY=false
            UNHEALTHY_CONTAINERS+=("$container")
            log_alert "ERROR" "Container $container is unhealthy"
            ;;
        "starting")
            echo -e "${YELLOW}⟳${NC} $container: starting"
            ;;
        "none")
            echo -e "${YELLOW}○${NC} $container: running (no health check)"
            ;;
        "stopped")
            echo -e "${RED}✗${NC} $container: STOPPED"
            ALL_HEALTHY=false
            UNHEALTHY_CONTAINERS+=("$container")
            log_alert "CRITICAL" "Container $container is stopped"
            ;;
        "missing")
            echo -e "${RED}✗${NC} $container: MISSING"
            ALL_HEALTHY=false
            UNHEALTHY_CONTAINERS+=("$container")
            log_alert "CRITICAL" "Container $container does not exist"
            ;;
        *)
            echo -e "${YELLOW}?${NC} $container: unknown ($health)"
            ;;
    esac
done

echo ""

# Check previous state for new issues
if [ -f "$STATE_FILE" ]; then
    PREV_STATE=$(cat "$STATE_FILE")
    if [ "$PREV_STATE" = "healthy" ] && [ "$ALL_HEALTHY" = false ]; then
        log_alert "WARNING" "System transitioned from healthy to unhealthy: ${UNHEALTHY_CONTAINERS[*]}"
    fi
fi

# Update state
if [ "$ALL_HEALTHY" = true ]; then
    echo "healthy" > "$STATE_FILE"
    echo -e "${GREEN}All systems healthy${NC}"
    exit 0
else
    echo "unhealthy" > "$STATE_FILE"
    echo -e "${RED}System unhealthy: ${#UNHEALTHY_CONTAINERS[@]} container(s) with issues${NC}"
    exit 1
fi
