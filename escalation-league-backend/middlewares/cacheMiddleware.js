const redis = require('../utils/redisClient');

// Cache TTL constants (in seconds)
const CACHE_TTL = {
    SHORT: 60,          // 1 minute
    MEDIUM: 300,        // 5 minutes
    LONG: 900,          // 15 minutes
    HOUR: 3600,         // 1 hour
};

/**
 * Middleware factory for caching API responses in Redis
 * @param {number} ttl - Time to live in seconds
 * @param {function} keyGenerator - Optional function to generate cache key from request
 * @returns {function} Express middleware
 */
const cacheMiddleware = (ttl = CACHE_TTL.MEDIUM, keyGenerator = null) => {
    return async (req, res, next) => {
        // Skip caching for non-GET requests
        if (req.method !== 'GET') {
            return next();
        }

        // Generate cache key
        const cacheKey = keyGenerator
            ? `cache:${keyGenerator(req)}`
            : `cache:${req.originalUrl}`;

        try {
            // Check if response is cached
            const cached = await redis.get(cacheKey);
            if (cached) {
                const data = JSON.parse(cached);
                res.set('X-Cache', 'HIT');
                return res.json(data);
            }

            // Store original json method
            const originalJson = res.json.bind(res);

            // Override json method to cache the response
            res.json = (body) => {
                // Only cache successful responses
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    redis.setex(cacheKey, ttl, JSON.stringify(body)).catch(err => {
                        console.error('Cache write error:', err);
                    });
                }
                res.set('X-Cache', 'MISS');
                return originalJson(body);
            };

            next();
        } catch (err) {
            console.error('Cache middleware error:', err);
            // Continue without caching on error
            next();
        }
    };
};

/**
 * Invalidate cache entries matching a pattern
 * @param {string} pattern - Redis key pattern (e.g., 'cache:/api/leagues*')
 */
const invalidateCache = async (pattern) => {
    try {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
            await redis.del(...keys);
            console.log(`Cache invalidated: ${keys.length} keys matching ${pattern}`);
        }
    } catch (err) {
        console.error('Cache invalidation error:', err);
    }
};

/**
 * Invalidate specific cache key
 * @param {string} key - Full cache key
 */
const invalidateCacheKey = async (key) => {
    try {
        await redis.del(key);
    } catch (err) {
        console.error('Cache key invalidation error:', err);
    }
};

/**
 * Cache invalidation triggers for common operations
 */
const cacheInvalidators = {
    // Invalidate league-related caches
    leagueUpdated: async (leagueId) => {
        await invalidateCache('cache:/api/leagues*');
        if (leagueId) {
            await invalidateCache(`cache:/api/user-leagues/${leagueId}*`);
            await invalidateCache(`cache:/api/metagame/${leagueId}*`);
        }
    },

    // Invalidate when a game is completed
    gameCompleted: async (leagueId) => {
        await invalidateCache(`cache:/api/user-leagues/${leagueId}/participants*`);
        await invalidateCache(`cache:/api/metagame/${leagueId}*`);
        await invalidateCache(`cache:/api/leagues/${leagueId}/stats*`);
    },

    // Invalidate when player joins/leaves
    playerChanged: async (leagueId) => {
        await invalidateCache(`cache:/api/user-leagues/${leagueId}/participants*`);
        await invalidateCache(`cache:/api/leagues/${leagueId}*`);
    },

    // Invalidate awards cache
    awardsUpdated: async () => {
        await invalidateCache('cache:/api/awards*');
    },
};

module.exports = {
    cacheMiddleware,
    invalidateCache,
    invalidateCacheKey,
    cacheInvalidators,
    CACHE_TTL,
};
