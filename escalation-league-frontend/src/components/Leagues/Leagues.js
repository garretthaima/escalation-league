import React, { useEffect, useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { getActiveLeague } from '../../api/leaguesApi';

const Leagues = () => {
    const [activeLeague, setActiveLeague] = useState(null);

    useEffect(() => {
        const fetchActiveLeague = async () => {
            try {
                const activeLeagueData = await getActiveLeague();
                setActiveLeague(activeLeagueData);
            } catch (error) {
                console.error('Error fetching active league:', error);
            }
        };

        fetchActiveLeague();
    }, []);

    return (
        <div className="container mt-4">
            <h1 className="mb-4">Leagues</h1>
            <nav>
                <ul className="nav nav-pills mb-4">
                    <li className="nav-item">
                        <Link to="/leagues/current" className="nav-link">
                            Current League
                        </Link>
                    </li>
                    {!activeLeague && ( // Hide the "Sign Up" tab if the user is already signed up
                        <li className="nav-item">
                            <Link to="/leagues/signup" className="nav-link">
                                Sign Up
                            </Link>
                        </li>
                    )}
                    <li className="nav-item">
                        <Link to="/leagues/leaderboard" className="nav-link">
                            Leaderboard
                        </Link>
                    </li>
                    <li className="nav-item">
                        <Link to="/leagues/past" className="nav-link">
                            Past Leagues
                        </Link>
                    </li>
                </ul>
            </nav>
            <hr />
            <Outlet /> {/* Renders nested routes */}
        </div>
    );
};

export default Leagues;