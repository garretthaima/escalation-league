import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '../../context/PermissionsProvider';
import { getTournamentStatus, getTournamentStandings, getTournamentPods } from '../../api/tournamentApi';
import TournamentStandings from './TournamentStandings';
import TournamentPods from './TournamentPods';
import QualificationBanner from './QualificationBanner';
import './TournamentDashboard.css';

const TournamentDashboard = () => {
    const navigate = useNavigate();
    const { user, loading: permissionsLoading, activeLeague } = usePermissions();

    const [tournamentData, setTournamentData] = useState(null);
    const [standings, setStandings] = useState([]);
    const [pods, setPods] = useState({ pods: [], byRound: {} });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('standings');

    const leagueId = activeLeague?.id || activeLeague?.league_id;

    const fetchTournamentData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const [statusData, standingsData, podsData] = await Promise.all([
                getTournamentStatus(leagueId),
                getTournamentStandings(leagueId).catch(() => ({ standings: [] })),
                getTournamentPods(leagueId).catch(() => ({ pods: [], byRound: {} }))
            ]);

            setTournamentData(statusData);
            setStandings(standingsData.standings || []);
            setPods(podsData);

        } catch (err) {
            console.error('Error fetching tournament data:', err);
            if (err.response?.status === 403) {
                setError('You do not have permission to view tournament data.');
            } else {
                setError(err.response?.data?.error || 'Failed to load tournament data.');
            }
        } finally {
            setLoading(false);
        }
    }, [leagueId]);

    useEffect(() => {
        if (permissionsLoading) return;
        if (!activeLeague) {
            setError('You are not part of any league.');
            setLoading(false);
            return;
        }
        // Wait for leagueId to be available from activeLeague
        if (!leagueId) {
            return; // Still loading, keep spinner
        }
        fetchTournamentData();
    }, [permissionsLoading, activeLeague, leagueId, fetchTournamentData]);

    if (permissionsLoading || loading) {
        return (
            <div className="container mt-4">
                <div className="text-center py-5">
                    <div className="spinner-border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mt-4">
                <div className="alert alert-danger" role="alert">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    {error}
                </div>
                {error.includes('not part of any league') && (
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate('/leagues/signup')}
                    >
                        Join a League
                    </button>
                )}
            </div>
        );
    }

    // Check if league is in tournament phase
    const league = tournamentData?.league;
    const isRegularSeason = league?.phase === 'regular_season';
    const isTournament = league?.phase === 'tournament';
    const isCompleted = league?.phase === 'completed';

    // Find current user's qualification status
    const currentUserStats = tournamentData?.qualifiedPlayers?.find(p => p.player_id === user?.id);
    const isQualified = !!currentUserStats;

    // Find champion if league completed
    const champion = standings.find(p => p.is_champion);

    return (
        <div className="container mt-4 tournament-dashboard">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="mb-1">
                        <i className="fas fa-trophy text-warning me-2"></i>
                        Finals Tournament
                    </h2>
                    <p className="text-muted mb-0">
                        {league?.name} - {isTournament ? 'Tournament Phase' : isCompleted ? 'Completed' : 'Regular Season'}
                    </p>
                </div>
                {isTournament && (
                    <div className="badge bg-warning text-dark fs-6">
                        <i className="fas fa-flag-checkered me-1"></i>
                        Tournament in Progress
                    </div>
                )}
                {isCompleted && champion && (
                    <div className="badge bg-success fs-6">
                        <i className="fas fa-crown me-1"></i>
                        Champion: {champion.firstname} {champion.lastname}
                    </div>
                )}
            </div>

            {/* Regular Season Message */}
            {isRegularSeason && (
                <div className="alert alert-info">
                    <i className="fas fa-info-circle me-2"></i>
                    The tournament hasn't started yet. The league is still in regular season.
                </div>
            )}

            {/* User Qualification Banner */}
            {(isTournament || isCompleted) && user && (
                <QualificationBanner
                    isQualified={isQualified}
                    userStats={currentUserStats}
                    isChampion={currentUserStats?.is_champion}
                    isChampionshipQualified={currentUserStats?.championship_qualified}
                />
            )}

            {/* Tournament Stats */}
            {(isTournament || isCompleted) && tournamentData?.podStats && (
                <div className="row g-3 mb-4">
                    <div className="col-6 col-md-3">
                        <div className="card text-center h-100">
                            <div className="card-body">
                                <div className="h3 mb-0 text-primary">{tournamentData.qualifiedPlayers?.length || 0}</div>
                                <small className="text-muted">Qualified Players</small>
                            </div>
                        </div>
                    </div>
                    <div className="col-6 col-md-3">
                        <div className="card text-center h-100">
                            <div className="card-body">
                                <div className="h3 mb-0 text-success">{tournamentData.podStats.completedPods}</div>
                                <small className="text-muted">Completed Pods</small>
                            </div>
                        </div>
                    </div>
                    <div className="col-6 col-md-3">
                        <div className="card text-center h-100">
                            <div className="card-body">
                                <div className="h3 mb-0 text-warning">{tournamentData.podStats.pendingPods}</div>
                                <small className="text-muted">Pending Pods</small>
                            </div>
                        </div>
                    </div>
                    <div className="col-6 col-md-3">
                        <div className="card text-center h-100">
                            <div className="card-body">
                                <div className="h3 mb-0 text-info">{tournamentData.podStats.totalPods}</div>
                                <small className="text-muted">Total Tournament Pods</small>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            {(isTournament || isCompleted) && (
                <>
                    <ul className="nav nav-tabs mb-4">
                        <li className="nav-item">
                            <button
                                className={`nav-link ${activeTab === 'standings' ? 'active' : ''}`}
                                onClick={() => setActiveTab('standings')}
                            >
                                <i className="fas fa-list-ol me-1"></i>
                                Standings
                            </button>
                        </li>
                        <li className="nav-item">
                            <button
                                className={`nav-link ${activeTab === 'pods' ? 'active' : ''}`}
                                onClick={() => setActiveTab('pods')}
                            >
                                <i className="fas fa-users me-1"></i>
                                Pods
                            </button>
                        </li>
                    </ul>

                    {/* Tab Content */}
                    {activeTab === 'standings' && (
                        <TournamentStandings
                            standings={standings}
                            currentUserId={user?.id}
                            tournamentWinPoints={league?.tournament_win_points || 4}
                            tournamentNonWinPoints={league?.tournament_non_win_points || 1}
                        />
                    )}
                    {activeTab === 'pods' && (
                        <TournamentPods
                            pods={pods.pods}
                            byRound={pods.byRound}
                            currentUserId={user?.id}
                        />
                    )}
                </>
            )}
        </div>
    );
};

export default TournamentDashboard;
