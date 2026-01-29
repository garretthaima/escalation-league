import { useEffect, useRef, memo } from 'react';

const GoogleSignInButton = memo(({ onSuccess }) => {
    const buttonRef = useRef(null);
    const callbackRef = useRef(onSuccess);
    const initializedRef = useRef(false);

    // Keep callback ref updated without triggering re-render
    useEffect(() => {
        callbackRef.current = onSuccess;
    }, [onSuccess]);

    useEffect(() => {
        // Only initialize once
        if (initializedRef.current) return;

        const initializeGoogleSignIn = () => {
            if (window.google && buttonRef.current) {
                window.google.accounts.id.initialize({
                    client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
                    callback: (response) => callbackRef.current(response),
                });
                window.google.accounts.id.renderButton(
                    buttonRef.current,
                    {
                        theme: 'filled_black',
                        size: 'large',
                        width: 332,
                        text: 'continue_with',
                        shape: 'rectangular',
                        logo_alignment: 'left'
                    }
                );
                initializedRef.current = true;
            }
        };

        // Check if the Google script is loaded
        if (window.google) {
            initializeGoogleSignIn();
        } else {
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = initializeGoogleSignIn;
            document.body.appendChild(script);
        }
    }, []);

    return <div ref={buttonRef} id="google-signin-button"></div>;
});

GoogleSignInButton.displayName = 'GoogleSignInButton';

export default GoogleSignInButton;
