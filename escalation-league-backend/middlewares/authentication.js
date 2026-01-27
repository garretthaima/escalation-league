const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const { getSetting } = require('../utils/settingsUtils');
const db = require('../models/db');
const redis = require('../utils/redisClient');

const jwtVerify = promisify(jwt.verify);
const CACHE_TTL = 30; // 30 seconds TTL in Redis

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized. Token missing.' });
  }

  try {
    // Use JWT_SECRET from environment (preferred) or fall back to database setting
    const SECRET_KEY = process.env.JWT_SECRET || await getSetting('secret_key');
    if (!SECRET_KEY) {
      return res.status(500).json({ error: 'Internal server error. Secret key not found.' });
    }

    // Verify the token (now properly promisified)
    const user = await jwtVerify(token, SECRET_KEY);

    // Validate required fields in the token payload
    if (!user.id) {
      return res.status(400).json({ error: 'Invalid token payload. Missing user ID.' });
    }

    // Check Redis cache first
    const cacheKey = `user:role:${user.id}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      // Use cached data
      const userData = JSON.parse(cached);
      req.user = {
        id: user.id,
        role_id: userData.role_id
      };
      // Prevent caching of authenticated responses by proxies (e.g., Cloudflare)
      res.set('Cache-Control', 'private, no-store, no-cache, must-revalidate');
      res.set('Vary', 'Authorization');
      return next();
    }

    // Fetch the user's current role_id from the database
    const dbUser = await db('users')
      .select('role_id', 'is_active', 'is_banned')
      .where({ id: user.id })
      .first();

    if (!dbUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Check if user is active and not banned
    if (!dbUser.is_active) {
      return res.status(403).json({ error: 'Account is inactive.' });
    }

    if (dbUser.is_banned) {
      return res.status(403).json({ error: 'Account is banned.' });
    }

    // Cache in Redis with TTL
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify({ role_id: dbUser.role_id }));

    // Attach user info with current role_id from database
    req.user = {
      id: user.id,
      role_id: dbUser.role_id
    };

    // Prevent caching of authenticated responses by proxies (e.g., Cloudflare)
    res.set('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    res.set('Vary', 'Authorization');

    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Forbidden. Invalid token.' });
    }
    if (err.name === 'TokenExpiredError') {
      // Return 401 with specific code so frontend knows to refresh
      return res.status(401).json({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    console.error('Error in authentication:', err.message);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

module.exports = authenticateToken;