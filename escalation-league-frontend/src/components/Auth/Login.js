import React, { useState } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000'; // Replace with your backend URL

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        console.log('Login payload:', { username, password }); // Debug log
        try {
            const response = await axios.post(`${API_BASE_URL}/login`, { username, password });
            const token = response.data.token;
            localStorage.setItem('token', token);
            alert('Login successful!');
            window.location.href = '/';
        } catch (err) {
            console.error('Error during login:', err.response?.data || err.message);
            setError('Invalid username or password');
        }
    };

    return (
        <div className="container mt-4">
            <h2 className="mb-4">Login</h2>
            <form onSubmit={handleLogin} className="needs-validation">
                <div className="mb-3">
                    <label htmlFor="username" className="form-label">Username</label>
                    <input
                        type="text"
                        id="username"
                        className="form-control"
                        placeholder="Enter your username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                </div>
                <div className="mb-3">
                    <label htmlFor="password" className="form-label">Password</label>
                    <input
                        type="password"
                        id="password"
                        className="form-control"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <button type="submit" className="btn btn-primary">Login</button>
            </form>
            {error && <div className="alert alert-danger mt-3">{error}</div>}
        </div>
    );
};

export default Login;