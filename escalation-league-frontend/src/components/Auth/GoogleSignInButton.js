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
                        theme: 'filled_black',
                        size: 'large',
                        width: 336,
                        text: 'continue_with',
                        shape: 'rectangular',
                        logo_alignment: 'left'
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
