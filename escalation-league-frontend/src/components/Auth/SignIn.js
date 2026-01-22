import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, registerUser, googleAuth } from '../../api/authApi';
import { usePermissions } from '../context/PermissionsProvider';
import GoogleSignInButton from './GoogleSignInButton';
import TurnstileWidget from './TurnstileWidget';
import { useToast } from '../context/ToastContext';
import './Auth.css';

const SignIn = () => {
    const [isRegistering, setIsRegistering] = useState(false);
    const [formData, setFormData] = useState({ email: '', password: '', firstname: '', lastname: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState(null);
    const navigate = useNavigate();
    const { refreshUserData } = usePermissions();
    const { showToast } = useToast();

    // Turnstile handlers
    const handleTurnstileVerify = useCallback((token) => {
        setTurnstileToken(token);
    }, []);

    const handleTurnstileError = useCallback(() => {
        setTurnstileToken(null);
        setError('Verification failed. Please refresh the page and try again.');
    }, []);

    const handleTurnstileExpire = useCallback(() => {
        setTurnstileToken(null);
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        // Clear error when user starts typing
        if (error) setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            if (isRegistering) {
                await registerUser({ ...formData, turnstileToken });
                showToast('Registration successful! Please sign in.', 'success');
                setIsRegistering(false);
                setFormData({ ...formData, password: '' });
            } else {
                const data = await loginUser({ email: formData.email, password: formData.password, turnstileToken });
                localStorage.setItem('token', data.token);
                if (data.refreshToken) {
                    localStorage.setItem('refreshToken', data.refreshToken);
                }

                // Force refresh user data from backend
                refreshUserData();

                navigate('/profile');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'An error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGoogleSuccess = async (response) => {
        const { credential } = response;
        try {
            const data = await googleAuth(credential);
            localStorage.setItem('token', data.token);
            if (data.refreshToken) {
                localStorage.setItem('refreshToken', data.refreshToken);
            }

            // Force refresh user data from backend
            refreshUserData();

            navigate('/profile');
        } catch (err) {
            console.error('Google sign-in failed:', err);
            setError('Google sign-in failed. Please try again.');
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                {/* Logo */}
                <div className="auth-logo">
                    <img src="/logo.png" alt="Escalation League" />
                </div>

                {/* Title */}
                <h1 className="auth-title">
                    {isRegistering ? 'Create Account' : 'Welcome Back'}
                </h1>
                <p className="auth-subtitle">
                    {isRegistering
                        ? 'Sign up to join Escalation League'
                        : 'Sign in to continue to Escalation League'}
                </p>

                {/* Error message */}
                {error && <div className="alert alert-danger">{error}</div>}

                {/* Google Sign-In (primary option) */}
                <div className="google-btn-container">
                    <GoogleSignInButton onSuccess={handleGoogleSuccess} />
                </div>

                {/* Divider */}
                <div className="auth-divider">
                    <span>or continue with email</span>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    {isRegistering && (
                        <>
                            <div className="auth-input-group">
                                <i className="fas fa-user input-icon"></i>
                                <input
                                    type="text"
                                    id="firstname"
                                    name="firstname"
                                    placeholder="First name"
                                    value={formData.firstname}
                                    onChange={handleChange}
                                    required
                                    autoComplete="given-name"
                                />
                            </div>
                            <div className="auth-input-group">
                                <i className="fas fa-user input-icon"></i>
                                <input
                                    type="text"
                                    id="lastname"
                                    name="lastname"
                                    placeholder="Last name"
                                    value={formData.lastname}
                                    onChange={handleChange}
                                    required
                                    autoComplete="family-name"
                                />
                            </div>
                        </>
                    )}

                    <div className="auth-input-group">
                        <i className="fas fa-envelope input-icon"></i>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            placeholder="Email address"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            autoComplete="email"
                        />
                    </div>

                    <div className="auth-input-group">
                        <i className="fas fa-lock input-icon"></i>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            id="password"
                            name="password"
                            placeholder="Password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            autoComplete={isRegistering ? 'new-password' : 'current-password'}
                        />
                        <button
                            type="button"
                            className="password-toggle"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                            <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        </button>
                    </div>

                    {/* Cloudflare Turnstile verification */}
                    <TurnstileWidget
                        onVerify={handleTurnstileVerify}
                        onError={handleTurnstileError}
                        onExpire={handleTurnstileExpire}
                    />

                    <button
                        type="submit"
                        className="auth-submit"
                        disabled={isSubmitting || !turnstileToken}
                    >
                        {isSubmitting ? (
                            <>
                                <i className="fas fa-spinner fa-spin me-2"></i>
                                {isRegistering ? 'Creating Account...' : 'Signing In...'}
                            </>
                        ) : (
                            isRegistering ? 'Create Account' : 'Sign In'
                        )}
                    </button>
                </form>

                {/* Toggle between Sign In / Register */}
                <div className="auth-toggle">
                    {isRegistering ? 'Already have an account?' : "Don't have an account?"}
                    <button
                        type="button"
                        onClick={() => {
                            setIsRegistering(!isRegistering);
                            setError('');
                            setFormData({ email: formData.email, password: '', firstname: '', lastname: '' });
                        }}
                    >
                        {isRegistering ? 'Sign In' : 'Register'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SignIn;
