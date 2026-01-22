import { forwardRef, useImperativeHandle, useRef, useEffect, useState } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';

/**
 * Cloudflare Turnstile widget for bot protection
 * Uses "invisible" mode which runs in the background
 *
 * @param {function} onVerify - Called with token when verification succeeds
 * @param {function} onError - Called when verification fails
 * @param {function} onExpire - Called when token expires (optional)
 */
const TurnstileWidget = forwardRef(({ onVerify, onError, onExpire }, ref) => {
    const turnstileRef = useRef(null);
    const [devResetKey, setDevResetKey] = useState(0);
    const siteKey = process.env.REACT_APP_TURNSTILE_SITE_KEY;

    // Expose reset method to parent component
    useImperativeHandle(ref, () => ({
        reset: () => {
            if (turnstileRef.current) {
                turnstileRef.current.reset();
            }
            // For dev mode, trigger re-verification after reset
            if (!siteKey) {
                setDevResetKey(prev => prev + 1);
            }
        }
    }));

    // Dev bypass - runs on mount and after each reset
    useEffect(() => {
        if (!siteKey && onVerify) {
            const timer = setTimeout(() => onVerify('dev-bypass-token'), 100);
            return () => clearTimeout(timer);
        }
    }, [siteKey, onVerify, devResetKey]);

    // If no site key configured, skip Turnstile (for local dev without Cloudflare setup)
    if (!siteKey) {
        return null;
    }

    return (
        <div className="turnstile-container">
            <Turnstile
                ref={turnstileRef}
                siteKey={siteKey}
                onSuccess={onVerify}
                onError={onError}
                onExpire={onExpire}
                options={{
                    theme: 'auto',
                    size: 'invisible'
                }}
            />
        </div>
    );
});

TurnstileWidget.displayName = 'TurnstileWidget';

export default TurnstileWidget;
