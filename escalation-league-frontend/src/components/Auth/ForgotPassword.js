import React, { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../../api/authApi';
import TurnstileWidget from './TurnstileWidget';
import './Auth.css';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');
    const [turnstileToken, setTurnstileToken] = useState(null);
    const turnstileRef = useRef(null);

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            await requestPasswordReset(email, turnstileToken);
            setSubmitted(true);
        } catch (err) {
            setError(err.response?.data?.error || 'An error occurred. Please try again.');
            setTurnstileToken(null);
            turnstileRef.current?.reset();
        } finally {
            setIsSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="auth-container">
                <div className="auth-card">
                    <div className="auth-logo">
                        <img src="/logo.png" alt="Escalation League" />
                    </div>

                    <div className="auth-icon success">
                        <i className="fas fa-envelope-open-text"></i>
                    </div>

                    <h1 className="auth-title">Check Your Email</h1>
                    <p className="auth-subtitle">
                        If an account exists with <strong>{email}</strong>, we've sent a password reset link.
                    </p>
                    <p className="auth-subtitle">
                        The link will expire in 1 hour. Check your spam folder if you don't see it.
                    </p>

                    <div className="auth-toggle">
                        <Link to="/signin">Back to Sign In</Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-logo">
                    <img src="/logo.png" alt="Escalation League" />
                </div>

                <h1 className="auth-title">Reset Password</h1>
                <p className="auth-subtitle">
                    Enter your email address and we'll send you a link to reset your password.
                </p>

                {error && <div className="alert alert-danger">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="auth-input-group">
                        <i className="fas fa-envelope input-icon"></i>
                        <input
                            type="email"
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                if (error) setError('');
                            }}
                            required
                            autoComplete="email"
                        />
                    </div>

                    <TurnstileWidget
                        ref={turnstileRef}
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
                                Sending...
                            </>
                        ) : (
                            'Send Reset Link'
                        )}
                    </button>
                </form>

                <div className="auth-toggle">
                    Remember your password? <Link to="/signin">Sign In</Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
