const rateLimit = require('express-rate-limit');

// General API rate limiter (1000 requests per hour per IP)
const apiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 1000, // ~16 requests per minute average
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Auth rate limiter for OAuth/social login (50 requests per 15 minutes per IP)
// This allows legitimate retries while preventing abuse
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Allow OAuth retries and multiple users behind same IP
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Strict rate limiter for password login failures (10 failed attempts per hour per IP)
// Protects against brute force attacks on password-based auth
const loginLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: 'Too many failed login attempts, please try again after 1 hour.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Only count failed login attempts
});

// Moderate rate limiter for game/league operations (100 requests per 15 minutes per IP)
const gameLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: 'Too many game operations, please slow down.',
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    apiLimiter,
    authLimiter,
    loginLimiter,
    gameLimiter,
};