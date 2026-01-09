#!/usr/bin/env bash
# WebSocket Latency Testing Tool
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

ENVIRONMENT="${1:-dev}"
TEST_DURATION="${2:-30}"

if [ "$ENVIRONMENT" = "prod" ]; then
    BACKEND_URL="https://api.escalationleague.com"
    SOCKET_URL="https://api.escalationleague.com"
else
    BACKEND_URL="https://dev-api.escalationleague.com"
    SOCKET_URL="https://dev-api.escalationleague.com"
fi

echo "=== WebSocket Latency Test ==="
echo "Environment: $ENVIRONMENT"
echo "Backend: $BACKEND_URL"
echo "Socket: $SOCKET_URL"
echo "Duration: ${TEST_DURATION}s"
echo ""

# Check if backend is responding
echo "1. Testing backend health..."
HEALTH_START=$(date +%s%3N)
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}\n%{time_total}" "${BACKEND_URL}/api/health" -A "EscalationLeague-LatencyTest/1.0" || echo "failed")
HEALTH_END=$(date +%s%3N)
HEALTH_TIME=$((HEALTH_END - HEALTH_START))

echo "   Backend health check: ${HEALTH_TIME}ms"
echo ""

# Check Redis connection (WebSocket pub/sub)
echo "2. Checking Redis connectivity..."
if [ "$ENVIRONMENT" = "prod" ]; then
    REDIS_CONTAINER="escalation-league-redis-prod"
else
    REDIS_CONTAINER="escalation-league-redis-dev"
fi

REDIS_PING=$(docker exec "$REDIS_CONTAINER" redis-cli ping 2>/dev/null || echo "FAILED")
if [ "$REDIS_PING" = "PONG" ]; then
    echo "   Redis: ✓ Connected"
    
    # Measure Redis latency
    echo "   Measuring Redis latency (10 pings)..."
    REDIS_LATENCIES=()
    for i in {1..10}; do
        START=$(date +%s%N)
        docker exec "$REDIS_CONTAINER" redis-cli ping > /dev/null 2>&1
        END=$(date +%s%N)
        LATENCY=$(( (END - START) / 1000000 ))
        REDIS_LATENCIES+=($LATENCY)
    done
    
    # Calculate average
    TOTAL=0
    for lat in "${REDIS_LATENCIES[@]}"; do
        TOTAL=$((TOTAL + lat))
    done
    AVG_REDIS=$((TOTAL / 10))
    echo "   Redis avg latency: ${AVG_REDIS}ms"
else
    echo "   Redis: ✗ Not accessible"
fi
echo ""

# Check Socket.IO endpoint
echo "3. Testing Socket.IO endpoint..."
SOCKET_RESPONSE=$(curl -s -w "\n%{http_code}" "${SOCKET_URL}/socket.io/?EIO=4&transport=polling" -A "EscalationLeague-LatencyTest/1.0" || echo "failed")
SOCKET_CODE=$(echo "$SOCKET_RESPONSE" | tail -1)

if [ "$SOCKET_CODE" = "200" ]; then
    echo "   Socket.IO endpoint: ✓ Accessible"
else
    echo "   Socket.IO endpoint: ✗ Failed (HTTP $SOCKET_CODE)"
fi
echo ""

# Check backend logs for WebSocket activity
echo "4. Checking recent WebSocket logs..."
if [ "$ENVIRONMENT" = "prod" ]; then
    BACKEND_CONTAINER="escalation-league-backend-prod"
else
    BACKEND_CONTAINER="escalation-league-backend-dev"
fi

echo "   Recent WebSocket events:"
docker logs "$BACKEND_CONTAINER" --since 5m 2>&1 | grep -i "websocket\|socket.io" | tail -10 || echo "   No recent WebSocket logs"
echo ""

# Recommendations
echo "=== Diagnostics Summary ==="
echo ""
echo "Backend API latency: ${HEALTH_TIME}ms"
echo "Redis latency: ${AVG_REDIS:-N/A}ms"
echo ""
echo "=== Potential Issues ==="
echo ""

if [ ${HEALTH_TIME} -gt 500 ]; then
    echo "⚠ Backend latency is high (${HEALTH_TIME}ms > 500ms)"
    echo "  - Check backend container resources"
    echo "  - Check database query performance"
fi

if [ ${AVG_REDIS:-0} -gt 50 ]; then
    echo "⚠ Redis latency is high (${AVG_REDIS}ms > 50ms)"
    echo "  - Redis may be under load"
    echo "  - Check Redis memory usage: docker exec $REDIS_CONTAINER redis-cli info memory"
fi

if [ "$SOCKET_CODE" != "200" ]; then
    echo "⚠ Socket.IO endpoint not responding"
    echo "  - Check nginx proxy configuration"
    echo "  - Check backend container is running"
    echo "  - Check firewall/security groups"
fi

echo ""
echo "=== Next Steps ==="
echo ""
echo "1. Check backend container logs:"
echo "   docker logs -f $BACKEND_CONTAINER | grep -i websocket"
echo ""
echo "2. Monitor Redis pub/sub activity:"
echo "   docker exec -it $REDIS_CONTAINER redis-cli"
echo "   > MONITOR"
echo ""
echo "3. Test with actual user:"
echo "   - Open browser developer console"
echo "   - Navigate to Network tab, filter WS"
echo "   - Trigger a notification event"
echo "   - Measure time from HTTP request to WebSocket message"
