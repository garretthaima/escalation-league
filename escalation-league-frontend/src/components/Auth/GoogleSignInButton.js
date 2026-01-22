import { useEffect, useRef } from 'react';

const GoogleSignInButton = ({ onSuccess }) => {
    const buttonRef = useRef(null);

    useEffect(() => {
        const initializeGoogleSignIn = () => {
            if (window.google && buttonRef.current) {
                window.google.accounts.id.initialize({
                    client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
                    callback: onSuccess,
                });
                window.google.accounts.id.renderButton(
                    buttonRef.current,
                    {
                        theme: 'outline',
                        size: 'large',
                        width: 336,  // Fixed width to match card content (400px - 2*32px padding)
                        text: 'continue_with',
                        logo_alignment: 'center'
                    }
                );
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
    }, [onSuccess]);

    return <div ref={buttonRef} id="google-signin-button"></div>;
};

export default GoogleSignInButton;
