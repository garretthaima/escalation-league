import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getLeagueParticipantsDetails, getOpponentMatchups, getTurnOrderStats } from '../../../api/userLeaguesApi';
import { getLeagueDetails } from '../../../api/leaguesApi';

const PublicProfile = () => {
    const { userId, leagueId } = useParams();
    const [leagueDetails, setLeagueDetails] = useState(null);
    const [leagueInfo, setLeagueInfo] = useState(null);
    const [matchups, setMatchups] = useState(null);
    const [turnOrderData, setTurnOrderData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProfileData = async () => {
            try {
                if (!leagueId) {
                    setError('League context is required to view this profile.');
                    setLoading(false);
                    return;
                }

                // Fetch league information
                const league = await getLeagueDetails(leagueId);
                setLeagueInfo(league);

                // Fetch league-specific participant details
                const leagueData = await getLeagueParticipantsDetails(leagueId, userId);
                setLeagueDetails(leagueData);

                // Fetch opponent matchup stats and turn order stats in parallel
                const [matchupResult, turnOrderResult] = await Promise.allSettled([
                    getOpponentMatchups(leagueId, userId),
                    getTurnOrderStats(leagueId, userId)
                ]);

                if (matchupResult.status === 'fulfilled') {
                    setMatchups(matchupResult.value);
                }
                if (turnOrderResult.status === 'fulfilled') {
                    setTurnOrderData(turnOrderResult.value);
                }
            } catch (err) {
                console.error('Error fetching profile data:', err);
                setError('Failed to fetch profile data.');
            } finally {
                setLoading(false);
            }
        };

        fetchProfileData();
    }, [userId, leagueId]);

    if (loading) {
        return <div className="text-center mt-5">Loading...</div>;
    }

    if (error) {
        return <div className="alert alert-danger text-center">{error}</div>;
    }

    if (!leagueDetails) {
        return (
            <div className="alert alert-warning text-center mt-4">
                Profile not available.
            </div>
        );
    }

    return (
        <div className="container mt-4">
            <h2 className="mb-4">{leagueDetails.firstname} {leagueDetails.lastname}</h2>
            {leagueInfo && (
                <p className="text-muted">League: {leagueInfo.name}</p>
            )}

            <div className="card mb-4">
                <div className="card-header">
                    <h5 className="mb-0">League Profile</h5>
                </div>
                <div className="card-body">
                    <div className="row">
                        <div className="col-md-8">
                            <p><strong>Joined:</strong> {new Date(leagueDetails.joined_at).toLocaleDateString()}</p>
                            <p><strong>Commander:</strong> {leagueDetails.commander || 'Not set'}</p>
                            {leagueDetails.commanderPartner && (
                                <p><strong>Partner:</strong> {leagueDetails.commanderPartner}</p>
                            )}
                            {leagueDetails.decklist_url && (
                                <p><strong>Decklist:</strong> <a href={leagueDetails.decklist_url} target="_blank" rel="noopener noreferrer">View Deck</a></p>
                            )}
                        </div>
                        <div className="col-md-4">
                            {leagueDetails.commander_image && (
                                <div className="mb-3">
                                    <img src={leagueDetails.commander_image} alt={leagueDetails.commander} className="img-fluid rounded" style={{ maxWidth: '200px' }} />
                                </div>
                            )}
                            {leagueDetails.partner_image && (
                                <div>
                                    <img src={leagueDetails.partner_image} alt={leagueDetails.commanderPartner} className="img-fluid rounded" style={{ maxWidth: '200px' }} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* League Statistics Section */}
            <div className="card mb-4">
                <div className="card-header">
                    <h5 className="mb-0">League Statistics</h5>
                </div>
                <div className="card-body">
                    <div className="row">
                        <div className="col-md-4">
                            <p><strong>Wins:</strong> {leagueDetails.league_wins || 0}</p>
                        </div>
                        <div className="col-md-4">
                            <p><strong>Losses:</strong> {leagueDetails.league_losses || 0}</p>
                        </div>
                        <div className="col-md-4">
                            <p><strong>Games Played:</strong> {(leagueDetails.league_wins || 0) + (leagueDetails.league_losses || 0)}</p>
                        </div>
                    </div>
                    {((leagueDetails.league_wins || 0) + (leagueDetails.league_losses || 0)) > 0 && (
                        <div className="mt-3">
                            <p><strong>Win Rate:</strong> {(((leagueDetails.league_wins || 0) / ((leagueDetails.league_wins || 0) + (leagueDetails.league_losses || 0))) * 100).toFixed(1)}%</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Nemesis & Victim Section */}
            {matchups && (matchups.nemesis || matchups.victim) && (
                <div className="card mb-4">
                    <div className="card-header">
                        <h5 className="mb-0">Rivalries</h5>
                    </div>
                    <div className="card-body">
                        <div className="row">
                            {matchups.nemesis && (
                                <div className="col-md-6">
                                    <div className="d-flex align-items-center">
                                        <i className="fas fa-skull text-danger me-2" style={{ fontSize: '1.5rem' }}></i>
                                        <div>
                                            <strong>Nemesis</strong>
                                            <p className="mb-0">
                                                {matchups.nemesis.firstname} {matchups.nemesis.lastname}
                                                <span className="text-muted ms-2">
                                                    ({matchups.nemesis.losses}L - {matchups.nemesis.wins}W)
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {matchups.victim && (
                                <div className="col-md-6">
                                    <div className="d-flex align-items-center">
                                        <i className="fas fa-trophy text-success me-2" style={{ fontSize: '1.5rem' }}></i>
                                        <div>
                                            <strong>Favorite Victim</strong>
                                            <p className="mb-0">
                                                {matchups.victim.firstname} {matchups.victim.lastname}
                                                <span className="text-muted ms-2">
                                                    ({matchups.victim.wins}W - {matchups.victim.losses}L)
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Turn Order Statistics Section */}
            {turnOrderData && turnOrderData.turnOrderStats && turnOrderData.turnOrderStats.length > 0 && (
                <div className="card mb-4">
                    <div className="card-header">
                        <h5 className="mb-0">
                            <i className="fas fa-dice me-2"></i>
                            Win Rate by Seat Position
                        </h5>
                    </div>
                    <div className="card-body">
                        {turnOrderData.message && (
                            <p className="text-muted small mb-3">
                                <i className="fas fa-info-circle me-1"></i>
                                {turnOrderData.message}
                            </p>
                        )}
                        <div className="row">
                            {turnOrderData.turnOrderStats.map((stat) => (
                                <div key={stat.position} className="col-6 col-md-3 mb-3">
                                    <div className="text-center p-2 border rounded">
                                        <div className="text-muted small">{stat.positionLabel}</div>
                                        <div className="h4 mb-0" style={{
                                            color: stat.winRate >= 40 ? '#198754' : stat.winRate >= 25 ? '#0d6efd' : '#6c757d'
                                        }}>
                                            {stat.winRate}%
                                        </div>
                                        <div className="text-muted small">
                                            {stat.wins}W / {stat.gamesPlayed}G
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PublicProfile;