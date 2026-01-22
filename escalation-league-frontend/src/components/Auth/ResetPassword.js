import React, { useState, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { resetPassword } from '../../api/authApi';
import { validatePassword, getPasswordStrength } from '../../utils/passwordValidation';
import './Auth.css';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const passwordValidation = useMemo(() => {
        if (!password) {
            return { isValid: true, errors: [] };
        }
        return validatePassword(password);
    }, [password]);

    const passwordStrength = useMemo(() => {
        return getPasswordStrength(password);
    }, [password]);

    const passwordsMatch = password === confirmPassword;
    const canSubmit = password && confirmPassword && passwordValidation.isValid && passwordsMatch;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        if (!passwordsMatch) {
            setError('Passwords do not match');
            setIsSubmitting(false);
            return;
        }

        try {
            await resetPassword(token, password);
            setSuccess(true);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to reset password. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // No token provided
    if (!token) {
        return (
            <div className="auth-container">
                <div className="auth-card">
                    <div className="auth-logo">
                        <img src="/logo.png" alt="Escalation League" />
                    </div>

                    <div className="auth-icon warning">
                        <i className="fas fa-exclamation-triangle"></i>
                    </div>

                    <h1 className="auth-title">Invalid Link</h1>
                    <p className="auth-subtitle">
                        This password reset link is invalid or incomplete. Please request a new one.
                    </p>

                    <button
                        className="auth-submit"
                        onClick={() => navigate('/forgot-password')}
                    >
                        Request New Link
                    </button>

                    <div className="auth-toggle">
                        <Link to="/signin">Back to Sign In</Link>
                    </div>
                </div>
            </div>
        );
    }

    // Success state
    if (success) {
        return (
            <div className="auth-container">
                <div className="auth-card">
                    <div className="auth-logo">
                        <img src="/logo.png" alt="Escalation League" />
                    </div>

                    <div className="auth-icon success">
                        <i className="fas fa-check-circle"></i>
                    </div>

                    <h1 className="auth-title">Password Reset!</h1>
                    <p className="auth-subtitle">
                        Your password has been reset successfully. You can now sign in with your new password.
                    </p>

                    <button
                        className="auth-submit"
                        onClick={() => navigate('/signin')}
                    >
                        Sign In
                    </button>
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

                <h1 className="auth-title">Set New Password</h1>
                <p className="auth-subtitle">
                    Enter your new password below.
                </p>

                {error && <div className="alert alert-danger">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="auth-input-group">
                        <i className="fas fa-lock input-icon"></i>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="New password"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                if (error) setError('');
                            }}
                            required
                            autoComplete="new-password"
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

                    {/* Password strength indicator */}
                    {password && (
                        <div className="password-feedback">
                            <div className="password-strength">
                                <div className="strength-bars">
                                    {[0, 1, 2, 3, 4].map((level) => (
                                        <div
                                            key={level}
                                            className={`strength-bar ${level <= passwordStrength?.level ? 'active' : ''}`}
                                            style={{
                                                backgroundColor: level <= passwordStrength?.level
                                                    ? passwordStrength?.color
                                                    : undefined
                                            }}
                                        />
                                    ))}
                                </div>
                                {passwordStrength?.label && (
                                    <span className="strength-label" style={{ color: passwordStrength.color }}>
                                        {passwordStrength.label}
                                    </span>
                                )}
                            </div>
                            {passwordValidation.errors.length > 0 && (
                                <ul className="password-errors">
                                    {passwordValidation.errors.map((err, idx) => (
                                        <li key={idx}>{err}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}

                    <div className="auth-input-group">
                        <i className="fas fa-lock input-icon"></i>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Confirm new password"
                            value={confirmPassword}
                            onChange={(e) => {
                                setConfirmPassword(e.target.value);
                                if (error) setError('');
                            }}
                            required
                            autoComplete="new-password"
                        />
                    </div>

                    {/* Password mismatch warning */}
                    {confirmPassword && !passwordsMatch && (
                        <div className="password-feedback">
                            <ul className="password-errors">
                                <li>Passwords do not match</li>
                            </ul>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="auth-submit"
                        disabled={isSubmitting || !canSubmit}
                    >
                        {isSubmitting ? (
                            <>
                                <i className="fas fa-spinner fa-spin me-2"></i>
                                Resetting...
                            </>
                        ) : (
                            'Reset Password'
                        )}
                    </button>
                </form>

                <div className="auth-toggle">
                    <Link to="/signin">Back to Sign In</Link>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
