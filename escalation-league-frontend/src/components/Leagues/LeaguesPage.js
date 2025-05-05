import React, { useEffect, useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { isUserInLeague } from '../../api/userLeaguesApi';
import { usePermissions } from '../context/PermissionsProvider';

const LeaguesPage = () => {
    const [activeLeague, setActiveLeague] = useState(null);
    const [inLeague, setInLeague] = useState(false);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    const { permissions, loading: loadingPermissions } = usePermissions();

    // Check if the user has the required permission
    const canReadLeagues = permissions.some((perm) => perm.name === 'league_read');

    useEffect(() => {
        const fetchLeagueData = async () => {
            if (!canReadLeagues) {
                setLoading(false); // Stop loading if the user lacks permission
                return;
            }

            try {
                // Check if the user is in a league
                const { inLeague, league } = await isUserInLeague();
                setInLeague(inLeague);

                if (inLeague) {
                    setActiveLeague(league);
                }
                console.log('League data:', { inLeague, league });
            } catch (err) {
                if (err.response && err.response.status === 404) {
                    console.warn('User is not part of any league.');
                    setInLeague(false);
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
    }, [loadingPermissions, canReadLeagues]);

    if (loadingPermissions || loading) {
        return <div>Loading...</div>; // Show a loading indicator while permissions or league data are being fetched
    }

    if (!canReadLeagues) {
        console.warn('User does not have the league_read permission.');
        return <div>You do not have permission to view this page.</div>; // Show an error if not authorized
    }

    return (
        <div className="container mt-4">
            <h1 className="mb-4">Leagues</h1>
            {error && <div className="alert alert-danger">{error}</div>}
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
                                <Link to="/leagues/past" className="nav-link">
                                    Past Leagues
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