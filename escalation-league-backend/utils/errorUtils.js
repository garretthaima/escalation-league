const logger = require('./logger');

/**
 * Custom error class for operational errors
 * These are expected errors that we can handle gracefully
 */
class AppError extends Error {
    constructor(message, statusCode, code = null) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Error codes for consistent API responses
 */
const errorCodes = {
    NOT_FOUND: 'NOT_FOUND',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    CONFLICT: 'CONFLICT',
    INTERNAL_ERROR: 'INTERNAL_ERROR'
};

/**
 * Centralized error handler for controllers
 * Logs errors and sends consistent JSON responses
 *
 * @param {Response} res - Express response object
 * @param {Error} error - The error to handle
 * @param {string} defaultMessage - Default message for unexpected errors
 */
const handleError = (res, error, defaultMessage = 'Internal server error') => {
    // Handle our custom AppError
    if (error instanceof AppError) {
        return res.status(error.statusCode).json({
            error: error.message,
            code: error.code
        });
    }

    // Log unexpected errors with full context
    logger.error(defaultMessage, error, {
        stack: error.stack
    });

    // Send generic response for unexpected errors
    return res.status(500).json({
        error: defaultMessage,
        code: errorCodes.INTERNAL_ERROR
    });
};

// Factory functions for common error types

/**
 * Create a 404 Not Found error
 * @param {string} resource - Name of the resource not found
 */
const notFound = (resource) => new AppError(`${resource} not found`, 404, errorCodes.NOT_FOUND);

/**
 * Create a 400 Bad Request error
 * @param {string} message - Validation error message
 */
const badRequest = (message) => new AppError(message, 400, errorCodes.VALIDATION_ERROR);

/**
 * Create a 401 Unauthorized error
 * @param {string} message - Optional custom message
 */
const unauthorized = (message = 'Unauthorized') => new AppError(message, 401, errorCodes.UNAUTHORIZED);

/**
 * Create a 403 Forbidden error
 * @param {string} message - Optional custom message
 */
const forbidden = (message = 'Forbidden') => new AppError(message, 403, errorCodes.FORBIDDEN);

/**
 * Create a 409 Conflict error
 * @param {string} message - Conflict description
 */
const conflict = (message) => new AppError(message, 409, errorCodes.CONFLICT);

module.exports = {
    AppError,
    errorCodes,
    handleError,
    notFound,
    badRequest,
    unauthorized,
    forbidden,
    conflict
};
