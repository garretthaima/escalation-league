import React from 'react';
import { useNavigate } from 'react-router-dom';
import GoogleSignInButton from './GoogleSignInButton';

const Register = () => {
    const navigate = useNavigate();

    const handleGoogleSuccess = (response) => {
        const { credential } = response;

        fetch(`${process.env.REACT_APP_BACKEND_URL}/auth/google-auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: credential }),
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.success) {
                    localStorage.setItem('token', data.token);
                    navigate('/dashboard');
                } else {
                    alert('Google registration failed.');
                }
            })
            .catch((err) => console.error('Error:', err));
    };

    return (
        <div className="container mt-4">
            <h2 className="mb-4">Register</h2>
            <div className="mb-4">
                <GoogleSignInButton onSuccess={handleGoogleSuccess} />
            </div>
            <button
                className="btn btn-secondary"
                onClick={() => navigate('/register/local')}
            >
                Register with Email
            </button>
        </div>
    );
};

export default Register;