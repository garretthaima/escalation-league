import React, { useEffect } from 'react';

const GoogleSignInButton = ({ onSuccess }) => {
    useEffect(() => {
        const initializeGoogleSignIn = () => {
            if (window.google) {
                window.google.accounts.id.initialize({
                    client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
                    callback: onSuccess,
                });
                window.google.accounts.id.renderButton(
                    document.getElementById('google-signin-button'),
                    { 
                        theme: 'outline', 
                        size: 'large',
                        width: '100%'
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

    return <div id="google-signin-button"></div>;
};

export default GoogleSignInButton;