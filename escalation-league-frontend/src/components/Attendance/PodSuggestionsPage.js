import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPodSuggestions, getSession } from '../../api/attendanceApi';
import { createPod } from '../../api/podsApi';
import { usePermissions } from '../context/PermissionsProvider';
import { useToast } from '../context/ToastContext';
import './PodSuggestionsPage.css';

const PodSuggestionsPage = () => {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const { activeLeague, permissions } = usePermissions();
    const { showToast } = useToast();

    const [session, setSession] = useState(null);
    const [suggestions, setSuggestions] = useState(null);
    const [podSize, setPodSize] = useState(4);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState({});
    const [error, setError] = useState('');

    const isAdmin = permissions?.includes('pod_manage');

    const fetchSuggestions = async () => {
        setLoading(true);
        setError('');
        try {
            const [sessionData, suggestionsData] = await Promise.all([
                getSession(sessionId),
                getPodSuggestions(sessionId, podSize)
            ]);
            setSession(sessionData);
            setSuggestions(suggestionsData);
        } catch (err) {
            console.error('Error fetching suggestions:', err);
            setError('Failed to load pod suggestions.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSuggestions();
    }, [sessionId, podSize]);

    const handleCreatePod = async (pod, index) => {
        if (!activeLeague?.id) return;

        setCreating(prev => ({ ...prev, [index]: true }));
        try {
            const playerIds = pod.players.map(p => p.id);
            await createPod({
                league_id: activeLeague.id,
                player_ids: playerIds
            });
            showToast('Pod created successfully!', 'success');
            // Remove this pod from suggestions
            setSuggestions(prev => ({
                ...prev,
                pods: prev.pods.filter((_, i) => i !== index)
            }));
        } catch (err) {
            console.error('Error creating pod:', err);
            showToast('Failed to create pod.', 'error');
        } finally {
            setCreating(prev => ({ ...prev, [index]: false }));
        }
    };

    const handleCreateAllPods = async () => {
        if (!suggestions?.pods?.length || !activeLeague?.id) return;

        for (let i = 0; i < suggestions.pods.length; i++) {
            const pod = suggestions.pods[i];
            try {
                const playerIds = pod.players.map(p => p.id);
                await createPod({
                    league_id: activeLeague.id,
                    player_ids: playerIds
                });
            } catch (err) {
                console.error(`Error creating pod ${i + 1}:`, err);
                showToast(`Failed to create pod ${i + 1}.`, 'error');
            }
        }
        showToast('All pods created!', 'success');
        navigate('/pods/active');
    };

    const getScoreColor = (score) => {
        if (score === 0) return 'text-success';
        if (score <= 2) return 'text-warning';
        return 'text-danger';
    };

    const getScoreLabel = (score) => {
        if (score === 0) return 'Fresh matchups!';
        if (score <= 2) return 'Some repeats';
        return 'Many repeats';
    };

    if (!isAdmin) {
        return (
            <div className="container mt-4">
                <div className="alert alert-warning">
                    <i className="fas fa-lock me-2"></i>
                    You don't have permission to view pod suggestions.
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="container mt-4 text-center">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-2">Calculating optimal pods...</p>
            </div>
        );
    }

    return (
        <div className="container mt-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>
                    <i className="fas fa-magic me-2"></i>
                    Pod Suggestions
                </h2>
                <button className="btn btn-outline-secondary" onClick={() => navigate('/attendance')}>
                    <i className="fas fa-arrow-left me-2"></i>
                    Back to Attendance
                </button>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            {/* Controls */}
            <div className="card mb-4">
                <div className="card-body">
                    <div className="row align-items-center">
                        <div className="col-md-4">
                            <label className="form-label">Pod Size</label>
                            <select
                                className="form-select"
                                value={podSize}
                                onChange={(e) => setPodSize(parseInt(e.target.value))}
                            >
                                <option value={3}>3 Players</option>
                                <option value={4}>4 Players (Standard)</option>
                                <option value={5}>5 Players</option>
                                <option value={6}>6 Players</option>
                            </select>
                        </div>
                        <div className="col-md-4">
                            <div className="text-center">
                                <strong>{suggestions?.totalPlayers || 0}</strong> players checked in
                                <br />
                                <strong>{suggestions?.pods?.length || 0}</strong> pods suggested
                            </div>
                        </div>
                        <div className="col-md-4 text-end">
                            {suggestions?.pods?.length > 0 && (
                                <button
                                    className="btn btn-success"
                                    onClick={handleCreateAllPods}
                                >
                                    <i className="fas fa-check-double me-2"></i>
                                    Create All Pods
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Suggested Pods */}
            {suggestions?.pods?.length === 0 && (
                <div className="alert alert-info">
                    <i className="fas fa-info-circle me-2"></i>
                    Not enough players for pods. Need at least {podSize} players.
                </div>
            )}

            <div className="row">
                {suggestions?.pods?.map((pod, index) => (
                    <div key={index} className="col-lg-6 mb-4">
                        <div className="card h-100 pod-suggestion-card">
                            <div className="card-header d-flex justify-content-between align-items-center">
                                <span>
                                    <i className="fas fa-users me-2"></i>
                                    Pod {index + 1}
                                </span>
                                <span className={`badge ${pod.score === 0 ? 'bg-success' : pod.score <= 2 ? 'bg-warning' : 'bg-danger'}`}>
                                    Score: {pod.score}
                                </span>
                            </div>
                            <div className="card-body">
                                {/* Players */}
                                <div className="mb-3">
                                    <h6>Players:</h6>
                                    <div className="d-flex flex-wrap gap-2">
                                        {pod.players.map(player => (
                                            <span key={player.id} className="badge bg-primary fs-6">
                                                {player.firstname} {player.lastname}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Pairings breakdown */}
                                <div>
                                    <h6>Matchup History:</h6>
                                    <small className={getScoreColor(pod.score)}>{getScoreLabel(pod.score)}</small>
                                    <div className="pairings-list mt-2">
                                        {pod.pairings.map((pairing, pIndex) => {
                                            const p1 = pod.players.find(p => p.id === pairing.player1);
                                            const p2 = pod.players.find(p => p.id === pairing.player2);
                                            return (
                                                <div key={pIndex} className="pairing-row d-flex justify-content-between">
                                                    <span>{p1?.firstname} vs {p2?.firstname}</span>
                                                    <span className={pairing.previousGames === 0 ? 'text-success' : 'text-muted'}>
                                                        {pairing.previousGames === 0 ? 'Never played!' : `${pairing.previousGames} games`}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                            <div className="card-footer">
                                <button
                                    className="btn btn-primary w-100"
                                    onClick={() => handleCreatePod(pod, index)}
                                    disabled={creating[index]}
                                >
                                    {creating[index] ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2"></span>
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-plus me-2"></i>
                                            Create This Pod
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Leftover Players */}
            {suggestions?.leftover?.length > 0 && (
                <div className="card mt-4 border-warning">
                    <div className="card-header bg-warning text-dark">
                        <i className="fas fa-user-clock me-2"></i>
                        Leftover Players ({suggestions.leftover.length})
                    </div>
                    <div className="card-body">
                        <p className="text-muted mb-2">
                            These players couldn't be placed in a full pod:
                        </p>
                        <div className="d-flex flex-wrap gap-2">
                            {suggestions.leftover.map(player => (
                                <span key={player.id} className="badge bg-secondary fs-6">
                                    {player.firstname} {player.lastname}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PodSuggestionsPage;
