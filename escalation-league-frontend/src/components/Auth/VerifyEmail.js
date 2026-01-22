import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { verifyEmail, resendVerificationEmail } from '../../api/authApi';
import './Auth.css';

const VerifyEmail = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [status, setStatus] = useState('verifying'); // verifying, success, error, no-token
    const [error, setError] = useState('');
    const [resendEmail, setResendEmail] = useState('');
    const [resendStatus, setResendStatus] = useState(''); // '', sending, sent, error

    useEffect(() => {
        if (!token) {
            setStatus('no-token');
            return;
        }

        const verify = async () => {
            try {
                await verifyEmail(token);
                setStatus('success');
            } catch (err) {
                setStatus('error');
                setError(err.response?.data?.error || 'Failed to verify email');
            }
        };

        verify();
    }, [token]);

    const handleResend = async (e) => {
        e.preventDefault();
        if (!resendEmail) return;

        setResendStatus('sending');
        try {
            await resendVerificationEmail(resendEmail);
            setResendStatus('sent');
        } catch (err) {
            setResendStatus('error');
        }
    };

    const renderContent = () => {
        switch (status) {
            case 'verifying':
                return (
                    <>
                        <div className="auth-icon verifying">
                            <i className="fas fa-spinner fa-spin"></i>
                        </div>
                        <h1 className="auth-title">Verifying Your Email</h1>
                        <p className="auth-subtitle">Please wait while we verify your email address...</p>
                    </>
                );

            case 'success':
                return (
                    <>
                        <div className="auth-icon success">
                            <i className="fas fa-check-circle"></i>
                        </div>
                        <h1 className="auth-title">Email Verified!</h1>
                        <p className="auth-subtitle">Your email has been verified successfully. You can now sign in to your account.</p>
                        <button
                            className="auth-submit"
                            onClick={() => navigate('/signin')}
                        >
                            Sign In
                        </button>
                    </>
                );

            case 'error':
                return (
                    <>
                        <div className="auth-icon error">
                            <i className="fas fa-times-circle"></i>
                        </div>
                        <h1 className="auth-title">Verification Failed</h1>
                        <p className="auth-subtitle">{error}</p>

                        <div className="auth-divider">
                            <span>need a new link?</span>
                        </div>

                        <form onSubmit={handleResend}>
                            <div className="auth-input-group">
                                <i className="fas fa-envelope input-icon"></i>
                                <input
                                    type="email"
                                    placeholder="Enter your email"
                                    value={resendEmail}
                                    onChange={(e) => setResendEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                className="auth-submit"
                                disabled={resendStatus === 'sending'}
                            >
                                {resendStatus === 'sending' ? (
                                    <>
                                        <i className="fas fa-spinner fa-spin me-2"></i>
                                        Sending...
                                    </>
                                ) : (
                                    'Resend Verification Email'
                                )}
                            </button>
                        </form>

                        {resendStatus === 'sent' && (
                            <div className="alert alert-success mt-3">
                                If an account exists with this email, a new verification link has been sent.
                            </div>
                        )}

                        <div className="auth-toggle">
                            <Link to="/signin">Back to Sign In</Link>
                        </div>
                    </>
                );

            case 'no-token':
                return (
                    <>
                        <div className="auth-icon warning">
                            <i className="fas fa-exclamation-triangle"></i>
                        </div>
                        <h1 className="auth-title">Invalid Link</h1>
                        <p className="auth-subtitle">This verification link is invalid or incomplete. Please use the link from your email.</p>

                        <div className="auth-divider">
                            <span>need a new link?</span>
                        </div>

                        <form onSubmit={handleResend}>
                            <div className="auth-input-group">
                                <i className="fas fa-envelope input-icon"></i>
                                <input
                                    type="email"
                                    placeholder="Enter your email"
                                    value={resendEmail}
                                    onChange={(e) => setResendEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                className="auth-submit"
                                disabled={resendStatus === 'sending'}
                            >
                                {resendStatus === 'sending' ? (
                                    <>
                                        <i className="fas fa-spinner fa-spin me-2"></i>
                                        Sending...
                                    </>
                                ) : (
                                    'Resend Verification Email'
                                )}
                            </button>
                        </form>

                        {resendStatus === 'sent' && (
                            <div className="alert alert-success mt-3">
                                If an account exists with this email, a new verification link has been sent.
                            </div>
                        )}

                        <div className="auth-toggle">
                            <Link to="/signin">Back to Sign In</Link>
                        </div>
                    </>
                );

            default:
                return null;
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-logo">
                    <img src="/logo.png" alt="Escalation League" />
                </div>
                {renderContent()}
            </div>
        </div>
    );
};

export default VerifyEmail;
