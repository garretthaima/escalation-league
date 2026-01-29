/**
 * Cloudflare Turnstile verification utility
 * Verifies tokens sent from the frontend Turnstile widget
 */

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Verify a Turnstile token with Cloudflare
 * @param {string} token - The token from the frontend Turnstile widget
 * @param {string} remoteIP - The client's IP address (optional but recommended)
 * @returns {Promise<{success: boolean, errorCodes?: string[]}>}
 */
const verifyTurnstile = async (token, remoteIP = null) => {
    const secretKey = process.env.TURNSTILE_SECRET_KEY;

    // If no secret key configured, bypass verification (for local dev)
    if (!secretKey) {
        console.warn('TURNSTILE_SECRET_KEY not configured - bypassing verification');
        return { success: true };
    }

    // If no token provided, fail verification
    if (!token) {
        return { success: false, errorCodes: ['missing-input-response'] };
    }

    // Dev bypass token (from TurnstileWidget when no site key configured)
    if (token === 'dev-bypass-token') {
        console.warn('Dev bypass token used - bypassing Turnstile verification');
        return { success: true };
    }

    try {
        const formData = new URLSearchParams({
            secret: secretKey,
            response: token,
        });

        if (remoteIP) {
            formData.append('remoteip', remoteIP);
        }

        const response = await fetch(TURNSTILE_VERIFY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData,
        });

        const data = await response.json();

        return {
            success: data.success === true,
            errorCodes: data['error-codes'] || [],
        };
    } catch (error) {
        console.error('Turnstile verification error:', error);
        return { success: false, errorCodes: ['verification-request-failed'] };
    }
};

module.exports = { verifyTurnstile };
