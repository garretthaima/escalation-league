/**
 * Validation middleware using Joi schemas
 * Validates request body, params, or query against provided schema
 */

/**
 * Validate request body against a Joi schema
 * @param {Object} schema - Joi schema to validate against
 * @returns {Function} Express middleware
 */
const validateBody = (schema) => (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
    });

    if (error) {
        const details = error.details.map(d => d.message);
        return res.status(400).json({
            error: 'Validation failed',
            details,
        });
    }

    // Replace body with sanitized/coerced values
    req.body = value;
    next();
};

/**
 * Validate request params against a Joi schema
 * @param {Object} schema - Joi schema to validate against
 * @returns {Function} Express middleware
 */
const validateParams = (schema) => (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
        abortEarly: false,
    });

    if (error) {
        const details = error.details.map(d => d.message);
        return res.status(400).json({
            error: 'Validation failed',
            details,
        });
    }

    req.params = value;
    next();
};

/**
 * Validate request query against a Joi schema
 * @param {Object} schema - Joi schema to validate against
 * @returns {Function} Express middleware
 */
const validateQuery = (schema) => (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
        abortEarly: false,
        stripUnknown: true,
    });

    if (error) {
        const details = error.details.map(d => d.message);
        return res.status(400).json({
            error: 'Validation failed',
            details,
        });
    }

    req.query = value;
    next();
};

module.exports = {
    validateBody,
    validateParams,
    validateQuery,
};
