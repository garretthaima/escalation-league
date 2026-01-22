import { Turnstile } from '@marsidev/react-turnstile';

/**
 * Cloudflare Turnstile widget for bot protection
 * Uses "managed" mode which only shows a challenge if suspicious
 *
 * @param {function} onVerify - Called with token when verification succeeds
 * @param {function} onError - Called when verification fails
 * @param {function} onExpire - Called when token expires (optional)
 */
const TurnstileWidget = ({ onVerify, onError, onExpire }) => {
    const siteKey = process.env.REACT_APP_TURNSTILE_SITE_KEY;

    // If no site key configured, skip Turnstile (for local dev without Cloudflare setup)
    if (!siteKey) {
        // Auto-verify in development when no key is configured
        if (onVerify) {
            setTimeout(() => onVerify('dev-bypass-token'), 100);
        }
        return null;
    }

    return (
        <div className="turnstile-container">
            <Turnstile
                siteKey={siteKey}
                onSuccess={onVerify}
                onError={onError}
                onExpire={onExpire}
                options={{
                    theme: 'auto',      // Adapts to light/dark mode
                    size: 'flexible'    // Adjusts width to container
                }}
            />
        </div>
    );
};

export default TurnstileWidget;
