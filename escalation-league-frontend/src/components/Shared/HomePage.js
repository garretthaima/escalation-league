import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Shared.css'; // Create a CSS file for specific styles

const HomePage = () => {
    const navigate = useNavigate();

    return (
        <div>
            {/* Hero Section */}
            <div className="hero-section">
                <div className="hero-background"></div>
                <div className="hero-content">
                    <h1>Welcome to Escalation League</h1>
                    <p>Compete, track your progress, and climb the leaderboard!</p>
                    <button className="btn btn-primary" onClick={() => navigate('/leagues')}>
                        Join a League
                    </button>
                </div>
            </div>

            {/* Quick Links */}
            <div className="quick-links">
                <div className="card" onClick={() => navigate('/leagues')}>
                    <h3>Join a League</h3>
                    <p>Find and join an active league to start competing.</p>
                </div>
                <div className="card" onClick={() => navigate('/pods/active')}>
                    <h3>View Active Pods</h3>
                    <p>See the current games and their participants.</p>
                </div>
                <div className="card" onClick={() => navigate('/leaderboard')}>
                    <h3>Leaderboard</h3>
                    <p>Track your progress and see how you rank.</p>
                </div>
            </div>
        </div>
    );
};

export default HomePage;