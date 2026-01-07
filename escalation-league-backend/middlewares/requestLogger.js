const logger = require('../utils/logger');

const requestLogger = (req, res, next) => {
    const startTime = Date.now();

    // Log request details
    logger.info('Incoming request', {
        method: req.method,
        url: req.originalUrl,
        userId: req.user?.id || 'anonymous',
        ip: req.ip || req.connection.remoteAddress,
        body: req.method !== 'GET' ? sanitizeBody(req.body) : undefined
    });

    // Capture response
    const originalSend = res.send;
    res.send = function (data) {
        const responseTime = Date.now() - startTime;
        logger.http(req, res.statusCode, responseTime);

        // Log errors with response data
        if (res.statusCode >= 400) {
            logger.warn('Request failed', {
                method: req.method,
                url: req.originalUrl,
                statusCode: res.statusCode,
                userId: req.user?.id || 'anonymous',
                response: typeof data === 'string' ? data.substring(0, 500) : data
            });
        }

        originalSend.call(this, data);
    };

    next();
};

// Remove sensitive data from logs
const sanitizeBody = (body) => {
    if (!body) return body;

    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'jwt', 'secret'];

    sensitiveFields.forEach(field => {
        if (sanitized[field]) {
            sanitized[field] = '[REDACTED]';
        }
    });

    return sanitized;
};

module.exports = requestLogger;
