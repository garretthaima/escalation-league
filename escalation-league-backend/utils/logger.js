const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Get current date for log filename
const getLogFilename = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}.log`;
};

// Format log entry
const formatLog = (level, message, meta = {}) => {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        level,
        message,
        ...meta
    };
    return JSON.stringify(logEntry);
};

// Write to log file
const writeToFile = (logEntry) => {
    const filename = path.join(logsDir, getLogFilename());
    fs.appendFileSync(filename, logEntry + '\n');
};

// Logger object
const logger = {
    info: (message, meta = {}) => {
        const log = formatLog('INFO', message, meta);
        console.log(`[INFO] ${message}`, meta);
        writeToFile(log);
    },

    error: (message, error = null, meta = {}) => {
        const errorMeta = error ? {
            error: error.message,
            stack: error.stack,
            ...meta
        } : meta;
        const log = formatLog('ERROR', message, errorMeta);
        console.error(`[ERROR] ${message}`, errorMeta);
        writeToFile(log);
    },

    warn: (message, meta = {}) => {
        const log = formatLog('WARN', message, meta);
        console.warn(`[WARN] ${message}`, meta);
        writeToFile(log);
    },

    debug: (message, meta = {}) => {
        if (process.env.NODE_ENV !== 'production') {
            const log = formatLog('DEBUG', message, meta);
            console.log(`[DEBUG] ${message}`, meta);
            writeToFile(log);
        }
    },

    http: (req, statusCode, responseTime) => {
        const meta = {
            method: req.method,
            url: req.originalUrl,
            statusCode,
            responseTime: `${responseTime}ms`,
            userId: req.user?.id || 'anonymous',
            ip: req.ip || req.connection.remoteAddress
        };
        const log = formatLog('HTTP', `${req.method} ${req.originalUrl}`, meta);
        console.log(`[HTTP] ${req.method} ${req.originalUrl} ${statusCode} ${responseTime}ms`);
        writeToFile(log);
    }
};

module.exports = logger;
