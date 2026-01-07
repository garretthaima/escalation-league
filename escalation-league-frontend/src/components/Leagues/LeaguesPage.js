import React, { useEffect, useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { isUserInLeague } from '../../api/userLeaguesApi';
import { usePermissions } from '../context/PermissionsProvider';

const LeaguesPage = () => {
    const [activeLeague, setActiveLeague] = useState(null);
    const [inLeague, setInLeague] = useState(false);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    const { loading: loadingPermissions } = usePermissions();

    useEffect(() => {
        const fetchLeagueData = async () => {
            try {
                // Check if the user is in a league
                const { inLeague, league } = await isUserInLeague();
                setInLeague(inLeague);

                if (inLeague) {
                    setActiveLeague(league);
                }
            } catch (err) {
                if (err.response && err.response.status === 404) {
                    console.warn('User is not part of any league.');
                    setInLeague(false);
                } else if (err.response && err.response.status === 403) {
                    console.warn('User does not have the league_read permission.');
                    setError('You do not have permission to view this page.');
                } else {
                    console.error('Error fetching league data:', err);
                    setError('Failed to fetch league data.');
                }
            } finally {
                setLoading(false);
            }
        };

        if (!loadingPermissions) {
            fetchLeagueData();
        }
    }, [loadingPermissions]);

    if (loadingPermissions || loading) {
        return <div>Loading...</div>; // Show a loading indicator while permissions or league data are being fetched
    }

    if (error) {
        return <div className="alert alert-danger">{error}</div>; // Show an error message if something went wrong
    }

    return (
        <div className="container mt-4">
            <h1 className="mb-4">Leagues</h1>
            <nav>
                <ul className="nav nav-pills mb-4">
                    {inLeague ? (
                        <>
                            <li className="nav-item">
                                <Link to="/leagues/current" className="nav-link">
                                    Current League
                                </Link>
                            </li>
                            <li className="nav-item">
                                <Link to="/leagues/leaderboard" className="nav-link">
                                    Leaderboard
                                </Link>
                            </li>
                            <li className="nav-item">
                                <Link to="/leagues/budget" className="nav-link">
                                    <i className="fas fa-wallet me-1"></i>
                                    Budget
                                </Link>
                            </li>
                            <li className="nav-item">
                                <Link to="/leagues/price-check" className="nav-link">
                                    Price Check
                                </Link>
                            </li>
                        </>
                    ) : (
                        <li className="nav-item">
                            <Link to="/leagues/signup" className="nav-link">
                                Sign Up
                            </Link>
                        </li>
                    )}
                </ul>
            </nav>
            <hr />
            <Outlet context={{ activeLeague }} /> {/* Pass activeLeague to child routes */}
        </div>
    );
};

export default LeaguesPage;