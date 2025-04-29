import React, { useState } from 'react';
import ActiveGamesTab from './ActiveGamesTab';
import CompletedGamesTab from './CompletedGamesTab';
import ConfirmGamesTab from './ConfirmGamesTab'; // Import the new tab

const GamesPage = () => {
    const [activeTab, setActiveTab] = useState('active'); // Default to "Active Games"

    return (
        <div className="container mt-4">
            <h1 className="text-center mb-4">Games</h1>
            <ul className="nav nav-tabs justify-content-center mb-4">
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'active' ? 'active' : ''}`}
                        onClick={() => setActiveTab('active')}
                    >
                        Active Games
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'waiting' ? 'active' : ''}`}
                        onClick={() => setActiveTab('waiting')}
                    >
                        Confirm Games
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'completed' ? 'active' : ''}`}
                        onClick={() => setActiveTab('completed')}
                    >
                        Completed Games
                    </button>
                </li>
            </ul>

            <div className="tab-content">
                {activeTab === 'active' && <ActiveGamesTab />}
                {activeTab === 'waiting' && <ConfirmGamesTab />} {/* Add the new tab */}
                {activeTab === 'completed' && <CompletedGamesTab />}
            </div>
        </div>
    );
};

export default GamesPage;