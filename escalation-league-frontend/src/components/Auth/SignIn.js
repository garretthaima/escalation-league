import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, registerUser, googleAuth } from '../../api/authApi';
import { usePermissions } from '../context/PermissionsProvider';
import GoogleSignInButton from './GoogleSignInButton';
import { useToast } from '../context/ToastContext';

const SignIn = () => {
    const [isRegistering, setIsRegistering] = useState(false);
    const [formData, setFormData] = useState({ email: '', password: '', firstname: '', lastname: '' });
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { refreshUserData } = usePermissions();
    const { showToast } = useToast();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isRegistering) {
                await registerUser(formData);
                showToast('Registration successful! Please sign in.', 'success');
                setIsRegistering(false);
            } else {
                const data = await loginUser({ email: formData.email, password: formData.password });
                localStorage.setItem('token', data.token);

                // Force refresh user data from backend
                refreshUserData();

                navigate('/profile');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'An error occurred. Please try again.');
        }
    };

    const handleGoogleSuccess = async (response) => {
        const { credential } = response;
        try {
            const data = await googleAuth(credential);
            localStorage.setItem('token', data.token);

            // Force refresh user data from backend
            refreshUserData();

            navigate('/profile');
        } catch (err) {
            console.error('Google sign-in failed:', err);
            setError('Google sign-in failed.');
        }
    };

    return (
        <div className="container mt-5">
            <div className="row justify-content-center">
                <div className="col-md-6 col-lg-5">
                    <div className="card shadow-sm">
                        <div className="card-body">
                            <h2 className="text-center mb-4">{isRegistering ? 'Register' : 'Sign In'}</h2>
                            {error && <div className="alert alert-danger">{error}</div>}
                            <form onSubmit={handleSubmit}>
                                {isRegistering && (
                                    <>
                                        <div className="mb-3">
                                            <label htmlFor="firstname" className="form-label">First Name</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                id="firstname"
                                                name="firstname"
                                                value={formData.firstname}
                                                onChange={handleChange}
                                                required
                                            />
                                        </div>
                                        <div className="mb-3">
                                            <label htmlFor="lastname" className="form-label">Last Name</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                id="lastname"
                                                name="lastname"
                                                value={formData.lastname}
                                                onChange={handleChange}
                                                required
                                            />
                                        </div>
                                    </>
                                )}
                                <div className="mb-3">
                                    <label htmlFor="email" className="form-label">Email</label>
                                    <input
                                        type="email"
                                        className="form-control"
                                        id="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                                <div className="mb-3">
                                    <label htmlFor="password" className="form-label">Password</label>
                                    <input
                                        type="password"
                                        className="form-control"
                                        id="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                                <button type="submit" className="btn btn-primary w-100">
                                    {isRegistering ? 'Register' : 'Sign In'}
                                </button>
                            </form>
                            <div className="mt-3">
                                <GoogleSignInButton onSuccess={handleGoogleSuccess} />
                            </div>
                            <p className="mt-3 text-center">
                                {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
                                <button
                                    className="btn btn-link p-0"
                                    onClick={() => setIsRegistering(!isRegistering)}
                                >
                                    {isRegistering ? 'Sign In' : 'Register'}
                                </button>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignIn;