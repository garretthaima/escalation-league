# WebSocket Performance Analysis and Fixes

## Diagnostic Results

### Current Metrics
- Backend API latency: ~300ms
- Redis latency: 65ms (high, threshold is 50ms)
- Redis memory fragmentation: **9.83x** (CRITICAL - should be < 1.5x)

## Identified Issues

### 1. High Redis Memory Fragmentation (CRITICAL)
**Problem:** Redis memory fragmentation ratio of 9.83 means Redis is using 10x more memory than needed.

**Impact:**
- Slower pub/sub operations
- Increased latency for WebSocket message broadcasting
- Potential memory issues under load

**Fix:**
```bash
# Restart Redis to defragment memory
docker restart escalation-league-redis-prod
docker restart escalation-league-redis-dev
```

**Prevention:**
- Configure Redis with `activedefrag yes` for automatic defragmentation
- Set memory limits with `maxmemory` directive
- Monitor fragmentation regularly

### 2. WebSocket Configuration Optimization

**Current Issues:**
- Long polling startup delay before WebSocket upgrade
- No ping/pong timeout configuration
- Missing connection pooling limits

**Recommended Changes:**

#### server.js
```javascript
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        credentials: true,
        methods: ['GET', 'POST']
    },
    path: '/socket.io/',
    transports: ['websocket', 'polling'], // Try WebSocket first
    allowEIO3: true,
    pingTimeout: 5000,        // Faster timeout detection
    pingInterval: 10000,      // More frequent pings
    upgradeTimeout: 3000,     // Faster upgrade timeout
    maxHttpBufferSize: 1e6,   // Limit message size
    perMessageDeflate: false  // Disable compression for lower latency
});
```

#### WebSocketProvider.js (Frontend)
```javascript
const newSocket = io(socketUrl, {
    path: '/socket.io/',
    auth: { token },
    transports: ['websocket', 'polling'], // Try WebSocket first
    upgrade: true,
    rememberUpgrade: true,    // Remember successful upgrades
    reconnection: true,
    reconnectionDelay: 500,   // Faster reconnection
    reconnectionDelayMax: 2000,
    reconnectionAttempts: 10,
    timeout: 5000            // Connection timeout
});
```

### 3. Database Query Performance

Backend latency of 300ms suggests database queries may be slow.

**Investigation Needed:**
- Enable slow query logging in MySQL
- Add database query timing to logger
- Profile controllers that emit WebSocket events

### 4. Nginx WebSocket Proxy Configuration

Check nginx proxy settings for WebSocket timeouts.

**Recommended nginx.conf:**
```nginx
location /socket.io/ {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    
    # Performance tuning
    proxy_read_timeout 86400;   # 24 hours
    proxy_send_timeout 86400;
    proxy_connect_timeout 10s;  # Fast connect
    proxy_buffering off;        # Disable buffering for real-time
    proxy_cache off;
}
```

## Implementation Priority

1. **IMMEDIATE:** Restart Redis to fix memory fragmentation
2. **HIGH:** Update Socket.IO configuration (server + client)
3. **HIGH:** Add Redis memory management configuration
4. **MEDIUM:** Profile and optimize database queries
5. **MEDIUM:** Update nginx WebSocket proxy settings

## Testing After Changes

```bash
# 1. Test latency
./scripts/test-websocket-latency.sh dev

# 2. Monitor Redis
docker exec -it escalation-league-redis-dev redis-cli
> INFO memory
> MONITOR  # Watch pub/sub activity

# 3. Browser testing
- Open Dev Tools → Network → WS filter
- Trigger notification (join pod, declare winner)
- Measure: HTTP request time + WebSocket delivery time
- Target: < 300ms end-to-end

# 4. Load testing
- Use socket.io-client to simulate multiple connections
- Measure message delivery time under load
```

## Expected Improvements

- Redis restart: 65ms → 5-10ms (85% improvement)
- WebSocket-first transport: Eliminate polling overhead (~50-100ms savings)
- Faster ping intervals: Earlier connection issue detection
- Combined: Target < 100ms notification latency

## Monitoring Going Forward

Add to `monitor-health.sh`:
```bash
# Check Redis fragmentation
REDIS_FRAG=$(docker exec $REDIS_CONTAINER redis-cli info memory | grep mem_fragmentation_ratio | cut -d: -f2)
if (( $(echo "$REDIS_FRAG > 2.0" | bc -l) )); then
    log_alert "WARNING" "Redis memory fragmentation high: $REDIS_FRAG"
fi
```
