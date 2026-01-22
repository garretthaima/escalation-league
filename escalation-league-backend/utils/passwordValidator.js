const commonPasswords = require('fxa-common-password-list');

const PASSWORD_MIN_LENGTH = 8;

/**
 * Validates a password against security requirements
 * @param {string} password - The password to validate
 * @returns {{ isValid: boolean, errors: string[] }} Validation result
 */
const validatePassword = (password) => {
    const errors = [];

    // Check minimum length
    if (!password || password.length < PASSWORD_MIN_LENGTH) {
        errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
    }

    // Check against common passwords list (~10,000 passwords)
    if (password && commonPasswords.test(password.toLowerCase())) {
        errors.push('This password is too common. Please choose a stronger password');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

module.exports = {
    validatePassword,
    PASSWORD_MIN_LENGTH
};
