import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, registerUser, googleAuth } from '../../api/authApi';
import { getUserPermissions } from '../../api/usersApi';
import { usePermissions } from '../context/PermissionsProvider';
import GoogleSignInButton from './GoogleSignInButton';

const SignIn = () => {
    const [isRegistering, setIsRegistering] = useState(false);
    const [formData, setFormData] = useState({ email: '', password: '', firstname: '', lastname: '' });
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { setUser, setPermissions } = usePermissions(); // Access context functions

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isRegistering) {
                await registerUser(formData);
                alert('Registration successful! Please sign in.');
                setIsRegistering(false);
            } else {
                const data = await loginUser({ email: formData.email, password: formData.password });
                console.log('Token received from login:', data.token);
                localStorage.setItem('token', data.token);

                // Decode token and update user in context
                const tokenPayload = JSON.parse(atob(data.token.split('.')[1]));
                setUser({
                    id: tokenPayload.id,
                    email: tokenPayload.email,
                    role_id: tokenPayload.role_id,
                });

                // Fetch and update permissions in context
                const permissionsData = await getUserPermissions();
                setPermissions(permissionsData.permissions);

                navigate('/profile'); // Redirect to profile page
            }
        } catch (err) {
            setError(err.response?.data?.error || 'An error occurred. Please try again.');
        }
    };

    const handleGoogleSuccess = async (response) => {
        const { credential } = response;
        try {
            const data = await googleAuth(credential);
            console.log('Token received from Google Auth:', data.token);
            localStorage.setItem('token', data.token);

            // Decode token and update user in context
            const tokenPayload = JSON.parse(atob(data.token.split('.')[1]));
            setUser({
                id: tokenPayload.id,
                email: tokenPayload.email,
                role_id: tokenPayload.role_id,
            });
            console.log('User set in context:', tokenPayload);

            // Fetch and update permissions in context
            const permissionsData = await getUserPermissions();
            setPermissions(permissionsData.permissions);
            console.log('Permissions set in context:', permissionsData.permissions);

            console.log('Redirecting to /profile...');
            navigate('/profile'); // Redirect to profile page
        } catch (err) {
            console.error('Google sign-in failed:', err);
            setError('Google sign-in failed.');
        }
    };

    return (
        <div className="container mt-4">
            <h2 className="mb-4">{isRegistering ? 'Register' : 'Sign In'}</h2>
            {error && <p className="text-danger">{error}</p>}
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
                <button type="submit" className="btn btn-primary">
                    {isRegistering ? 'Register' : 'Sign In'}
                </button>
            </form>
            <div className="mt-3">
                <GoogleSignInButton onSuccess={handleGoogleSuccess} />
            </div>
            <p className="mt-3">
                {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button
                    className="btn btn-link p-0"
                    onClick={() => setIsRegistering(!isRegistering)}
                >
                    {isRegistering ? 'Sign In' : 'Register'}
                </button>
            </p>
        </div>
    );
};

export default SignIn;