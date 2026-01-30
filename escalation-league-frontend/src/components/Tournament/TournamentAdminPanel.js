import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../context/ToastContext';
import {
    endRegularSeason,
    generateTournamentPods,
    startChampionship,
    completeTournament,
    resetTournament,
    getChampionshipQualifiers,
    getDraftTournamentPods,
    publishTournamentPods,
    swapTournamentPlayers,
    deleteDraftTournamentPods
} from '../../api/tournamentApi';
import './TournamentAdminPanel.css';

const TournamentAdminPanel = ({ leagueId, league, podStats, onRefresh }) => {
    const { showToast } = useToast();
    const [loading, setLoading] = useState({});
    const [showConfirmModal, setShowConfirmModal] = useState(null);
    const [championshipQualifiers, setChampionshipQualifiers] = useState(null);
    const [draftPods, setDraftPods] = useState([]);
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [swapping, setSwapping] = useState(false);
    const [viewMode, setViewMode] = useState('card'); // 'card' or 'table'

    const isRegularSeason = league?.phase === 'regular_season';
    const isTournament = league?.phase === 'tournament';
    const isCompleted = league?.phase === 'completed';
    const hasDraftPods = draftPods.length > 0;

    // Check tournament progress
    const podsGenerated = podStats?.totalPods > 0;
    const allQualifyingComplete = podStats && podStats.qualifyingPods === podStats.completedPods && podStats.qualifyingPods > 0;
    const championshipExists = podStats?.championshipPod !== null;
    const championshipComplete = podStats?.championshipPod?.confirmation_status === 'complete';

    // Fetch draft pods when in tournament phase
    const fetchDraftPods = useCallback(async () => {
        if (!isTournament) return;
        try {
            const data = await getDraftTournamentPods(leagueId);
            setDraftPods(data.draftPods || []);
        } catch (err) {
            console.error('Error fetching draft pods:', err);
        }
    }, [leagueId, isTournament]);

    useEffect(() => {
        fetchDraftPods();
    }, [fetchDraftPods]);

    // Handle player selection for swapping
    const handlePlayerClick = (playerId, podId) => {
        if (swapping) return;

        if (!selectedPlayer) {
            setSelectedPlayer({ playerId, podId });
        } else if (selectedPlayer.podId === podId) {
            // Same pod - deselect
            setSelectedPlayer(null);
        } else {
            // Different pod - perform swap
            handleSwap(selectedPlayer.playerId, selectedPlayer.podId, playerId, podId);
        }
    };

    const handleSwap = async (player1Id, pod1Id, player2Id, pod2Id) => {
        setSwapping(true);
        try {
            await swapTournamentPlayers(leagueId, player1Id, pod1Id, player2Id, pod2Id);
            showToast('Players swapped successfully.', 'success');
            setSelectedPlayer(null);
            fetchDraftPods();
        } catch (err) {
            console.error('Error swapping players:', err);
            showToast(err.response?.data?.error || 'Failed to swap players.', 'error');
        } finally {
            setSwapping(false);
        }
    };

    const handlePublishPods = async () => {
        setLoading(prev => ({ ...prev, publish: true }));
        try {
            const result = await publishTournamentPods(leagueId);
            showToast(result.message, 'success');
            setDraftPods([]);
            onRefresh();
        } catch (err) {
            console.error('Error publishing pods:', err);
            showToast(err.response?.data?.error || 'Failed to publish pods.', 'error');
        } finally {
            setLoading(prev => ({ ...prev, publish: false }));
        }
    };

    const handleDeleteDrafts = async (championshipOnly = false) => {
        setLoading(prev => ({ ...prev, deleteDrafts: true }));
        try {
            const result = await deleteDraftTournamentPods(leagueId, championshipOnly);
            showToast(result.message, 'info');
            fetchDraftPods();
            onRefresh();
        } catch (err) {
            console.error('Error deleting draft pods:', err);
            showToast(err.response?.data?.error || 'Failed to delete drafts.', 'error');
        } finally {
            setLoading(prev => ({ ...prev, deleteDrafts: false }));
        }
    };

    const handleAction = async (action, actionName) => {
        setLoading(prev => ({ ...prev, [action]: true }));
        try {
            let result;
            switch (action) {
                case 'endSeason':
                    result = await endRegularSeason(leagueId);
                    showToast(`Regular season ended! ${result.qualifiedCount} players qualified.`, 'success');
                    break;
                case 'generatePods':
                    result = await generateTournamentPods(leagueId);
                    showToast(`Generated ${result.podCount} draft pods. Review and publish when ready.`, 'success');
                    fetchDraftPods();
                    break;
                case 'startChampionship':
                    result = await startChampionship(leagueId);
                    showToast('Championship draft pod created. Review and publish when ready.', 'success');
                    fetchDraftPods();
                    break;
                case 'complete':
                    result = await completeTournament(leagueId);
                    showToast(`Tournament complete! Champion: ${result.champion.firstname} ${result.champion.lastname}`, 'success');
                    break;
                case 'reset':
                    result = await resetTournament(leagueId);
                    showToast('Tournament reset successfully.', 'info');
                    break;
                default:
                    break;
            }
            setShowConfirmModal(null);
            onRefresh();
        } catch (err) {
            console.error(`Error during ${actionName}:`, err);
            showToast(err.response?.data?.error || `Failed to ${actionName}.`, 'error');
        } finally {
            setLoading(prev => ({ ...prev, [action]: false }));
        }
    };

    const fetchChampionshipQualifiers = async () => {
        try {
            const data = await getChampionshipQualifiers(leagueId);
            setChampionshipQualifiers(data);
        } catch (err) {
            console.error('Error fetching championship qualifiers:', err);
        }
    };

    // Calculate pairing statistics from draft pods
    const calculatePairingStats = () => {
        if (!draftPods.length) return null;

        // Get all unique players
        const players = new Map();
        draftPods.forEach(pod => {
            pod.participants.forEach(p => {
                if (!players.has(p.player_id)) {
                    players.set(p.player_id, { id: p.player_id, name: `${p.firstname} ${p.lastname}` });
                }
            });
        });

        const playerList = Array.from(players.values());
        const n = playerList.length;

        // Count pairings
        const pairings = {};
        playerList.forEach(p1 => {
            pairings[p1.id] = {};
            playerList.forEach(p2 => {
                if (p1.id !== p2.id) pairings[p1.id][p2.id] = 0;
            });
        });

        draftPods.forEach(pod => {
            const ids = pod.participants.map(p => p.player_id);
            for (let i = 0; i < ids.length; i++) {
                for (let j = i + 1; j < ids.length; j++) {
                    pairings[ids[i]][ids[j]]++;
                    pairings[ids[j]][ids[i]]++;
                }
            }
        });

        // Find missing pairings (players who never play together)
        const missingPairings = [];
        for (let i = 0; i < playerList.length; i++) {
            for (let j = i + 1; j < playerList.length; j++) {
                const p1 = playerList[i];
                const p2 = playerList[j];
                if (pairings[p1.id][p2.id] === 0) {
                    missingPairings.push({ player1: p1.name, player2: p2.name });
                }
            }
        }

        // Calculate total possible pairings and coverage
        const totalPossiblePairings = (n * (n - 1)) / 2;
        const coveredPairings = totalPossiblePairings - missingPairings.length;

        // Calculate turn order distribution per player
        const turnOrderStats = {};
        playerList.forEach(p => {
            turnOrderStats[p.id] = { name: p.name, positions: { 1: 0, 2: 0, 3: 0, 4: 0 } };
        });

        draftPods.forEach(pod => {
            pod.participants.forEach(p => {
                if (turnOrderStats[p.player_id]) {
                    turnOrderStats[p.player_id].positions[p.turn_order]++;
                }
            });
        });

        // Calculate turn order balance score (lower is better, 0 is perfect)
        // Perfect distribution with 4 games would be 1 time in each position
        let turnOrderImbalance = 0;
        const idealPerPosition = 1; // With 4 games, ideally 1 game per position
        Object.values(turnOrderStats).forEach(player => {
            Object.values(player.positions).forEach(count => {
                turnOrderImbalance += Math.abs(count - idealPerPosition);
            });
        });

        return {
            totalPlayers: n,
            totalPossiblePairings,
            coveredPairings,
            missingPairings,
            coveragePercent: ((coveredPairings / totalPossiblePairings) * 100).toFixed(1),
            turnOrderStats,
            turnOrderImbalance
        };
    };

    const pairingStats = calculatePairingStats();

    const ConfirmModal = ({ action, title, message, confirmText, variant }) => (
        <div className={`modal fade ${showConfirmModal === action ? 'show d-block' : ''}`} tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">{title}</h5>
                        <button type="button" className="btn-close" onClick={() => setShowConfirmModal(null)}></button>
                    </div>
                    <div className="modal-body">
                        <p>{message}</p>
                        {action === 'startChampionship' && championshipQualifiers && (
                            <div className="mt-3">
                                <strong>Top 4 Players:</strong>
                                <ol className="mt-2">
                                    {championshipQualifiers.qualifiers.map((q) => (
                                        <li key={q.player_id}>
                                            {q.firstname} {q.lastname} ({q.tournament_points} pts)
                                        </li>
                                    ))}
                                </ol>
                                {!championshipQualifiers.allQualifyingPodsComplete && (
                                    <div className="alert alert-warning mt-2 mb-0">
                                        <i className="fas fa-exclamation-triangle me-2"></i>
                                        {championshipQualifiers.incompleteCount} qualifying pod(s) are still incomplete!
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setShowConfirmModal(null)}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className={`btn btn-${variant || 'primary'}`}
                            onClick={() => handleAction(action, title)}
                            disabled={loading[action]}
                        >
                            {loading[action] ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2"></span>
                                    Processing...
                                </>
                            ) : (
                                confirmText
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="card">
            <div className="card-header bg-dark text-white">
                <h5 className="mb-0">
                    <i className="fas fa-cog me-2"></i>
                    Tournament Admin Panel
                </h5>
            </div>
            <div className="card-body">
                {/* Current Phase */}
                <div className="mb-4">
                    <h6 className="text-muted">Current Phase</h6>
                    <div className="d-flex align-items-center">
                        <span className={`badge fs-6 ${
                            isRegularSeason ? 'bg-info' :
                            isTournament ? 'bg-warning text-dark' :
                            'bg-success'
                        }`}>
                            {isRegularSeason ? 'Regular Season' :
                             isTournament ? 'Tournament' :
                             'Completed'}
                        </span>
                        {league?.regular_season_locked_at && (
                            <small className="text-muted ms-3">
                                Locked at: {new Date(league.regular_season_locked_at).toLocaleString()}
                            </small>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="row g-3">
                    {/* End Regular Season */}
                    {isRegularSeason && (
                        <div className="col-md-6">
                            <div className="card h-100 border-primary">
                                <div className="card-body">
                                    <h6 className="card-title">
                                        <i className="fas fa-flag-checkered me-2"></i>
                                        End Regular Season
                                    </h6>
                                    <p className="card-text small text-muted">
                                        Lock regular season stats and qualify top 75% of players (rounded to even).
                                    </p>
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => setShowConfirmModal('endSeason')}
                                        disabled={loading.endSeason}
                                    >
                                        End Season
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Generate Pods */}
                    {isTournament && !podsGenerated && (
                        <div className="col-md-6">
                            <div className="card h-100 border-success">
                                <div className="card-body">
                                    <h6 className="card-title">
                                        <i className="fas fa-dice me-2"></i>
                                        Generate Tournament Pods
                                    </h6>
                                    <p className="card-text small text-muted">
                                        Create all qualifying round pods. Each player will play exactly 4 games.
                                    </p>
                                    <button
                                        className="btn btn-success"
                                        onClick={() => setShowConfirmModal('generatePods')}
                                        disabled={loading.generatePods}
                                    >
                                        Generate Pods
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Start Championship */}
                    {isTournament && podsGenerated && !championshipExists && (
                        <div className="col-md-6">
                            <div className="card h-100 border-warning">
                                <div className="card-body">
                                    <h6 className="card-title">
                                        <i className="fas fa-crown me-2"></i>
                                        Start Championship
                                    </h6>
                                    <p className="card-text small text-muted">
                                        Create the final championship pod with the top 4 players.
                                        {!allQualifyingComplete && (
                                            <span className="text-danger d-block mt-1">
                                                <i className="fas fa-exclamation-triangle me-1"></i>
                                                Some qualifying pods are still incomplete!
                                            </span>
                                        )}
                                    </p>
                                    <button
                                        className="btn btn-warning"
                                        onClick={() => {
                                            fetchChampionshipQualifiers();
                                            setShowConfirmModal('startChampionship');
                                        }}
                                        disabled={loading.startChampionship}
                                    >
                                        Start Championship
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Complete Tournament */}
                    {isTournament && championshipExists && (
                        <div className="col-md-6">
                            <div className="card h-100 border-success">
                                <div className="card-body">
                                    <h6 className="card-title">
                                        <i className="fas fa-trophy me-2"></i>
                                        Complete Tournament
                                    </h6>
                                    <p className="card-text small text-muted">
                                        Record the championship winner and complete the league.
                                        {!championshipComplete && (
                                            <span className="text-danger d-block mt-1">
                                                <i className="fas fa-exclamation-triangle me-1"></i>
                                                Championship game is not complete yet!
                                            </span>
                                        )}
                                    </p>
                                    <button
                                        className="btn btn-success"
                                        onClick={() => setShowConfirmModal('complete')}
                                        disabled={loading.complete || !championshipComplete}
                                    >
                                        Complete Tournament
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Reset Tournament */}
                    {(isTournament || isCompleted) && (
                        <div className="col-md-6">
                            <div className="card h-100 border-danger">
                                <div className="card-body">
                                    <h6 className="card-title text-danger">
                                        <i className="fas fa-undo me-2"></i>
                                        Reset Tournament
                                    </h6>
                                    <p className="card-text small text-muted">
                                        Delete all tournament data and return to regular season.
                                        <strong className="text-danger d-block mt-1">This cannot be undone!</strong>
                                    </p>
                                    <button
                                        className="btn btn-outline-danger"
                                        onClick={() => setShowConfirmModal('reset')}
                                        disabled={loading.reset}
                                    >
                                        Reset Tournament
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Draft Pods Preview */}
                {hasDraftPods && (
                    <div className="mt-4">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h6 className="text-muted mb-0">
                                <i className="fas fa-eye me-2"></i>
                                Draft Pods Preview ({draftPods.length} pods)
                            </h6>
                            <div className="d-flex align-items-center gap-2">
                                {/* View Toggle */}
                                <div className="btn-group btn-group-sm me-2">
                                    <button
                                        className={`btn ${viewMode === 'card' ? 'btn-secondary' : 'btn-outline-secondary'}`}
                                        onClick={() => setViewMode('card')}
                                        title="Card View"
                                    >
                                        <i className="fas fa-th-large"></i>
                                    </button>
                                    <button
                                        className={`btn ${viewMode === 'table' ? 'btn-secondary' : 'btn-outline-secondary'}`}
                                        onClick={() => setViewMode('table')}
                                        title="Table View"
                                    >
                                        <i className="fas fa-list"></i>
                                    </button>
                                </div>
                                <button
                                    className="btn btn-outline-danger btn-sm me-2"
                                    onClick={() => handleDeleteDrafts()}
                                    disabled={loading.deleteDrafts}
                                >
                                    {loading.deleteDrafts ? (
                                        <span className="spinner-border spinner-border-sm"></span>
                                    ) : (
                                        <>
                                            <i className="fas fa-trash me-1"></i>
                                            Delete Drafts
                                        </>
                                    )}
                                </button>
                                <button
                                    className="btn btn-success btn-sm"
                                    onClick={handlePublishPods}
                                    disabled={loading.publish || swapping}
                                >
                                    {loading.publish ? (
                                        <span className="spinner-border spinner-border-sm"></span>
                                    ) : (
                                        <>
                                            <i className="fas fa-check me-1"></i>
                                            Publish {draftPods.length} Pods
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Pairing Statistics */}
                        {pairingStats && (
                            <div className="pairing-stats mb-3">
                                <div className="d-flex align-items-center gap-3 mb-2">
                                    <span className="badge bg-secondary">
                                        {pairingStats.totalPlayers} Players
                                    </span>
                                    <span className="badge bg-success">
                                        {pairingStats.coveragePercent}% Pairing Coverage
                                    </span>
                                    <span className={`badge ${pairingStats.missingPairings.length === 0 ? 'bg-success' : 'bg-warning text-dark'}`}>
                                        {pairingStats.coveredPairings}/{pairingStats.totalPossiblePairings} Matchups
                                    </span>
                                </div>
                                {pairingStats.missingPairings.length > 0 && (
                                    <details className="missing-pairings-details">
                                        <summary className="text-warning small">
                                            <i className="fas fa-exclamation-triangle me-1"></i>
                                            {pairingStats.missingPairings.length} missing pairing{pairingStats.missingPairings.length !== 1 ? 's' : ''} (players who never face each other)
                                        </summary>
                                        <ul className="missing-pairings-list mt-2">
                                            {pairingStats.missingPairings.map((pair, idx) => (
                                                <li key={idx} className="small">
                                                    {pair.player1} <i className="fas fa-times mx-1 text-muted"></i> {pair.player2}
                                                </li>
                                            ))}
                                        </ul>
                                    </details>
                                )}
                                {pairingStats.turnOrderStats && (
                                    <details className="turn-order-details mt-2">
                                        <summary className="text-muted small">
                                            <i className="fas fa-sort-numeric-down me-1"></i>
                                            Turn Order Distribution (imbalance score: {pairingStats.turnOrderImbalance})
                                        </summary>
                                        <div className="turn-order-table mt-2">
                                            <table className="table table-sm table-bordered mb-0">
                                                <thead>
                                                    <tr>
                                                        <th className="small">Player</th>
                                                        <th className="small text-center">1st</th>
                                                        <th className="small text-center">2nd</th>
                                                        <th className="small text-center">3rd</th>
                                                        <th className="small text-center">4th</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {Object.values(pairingStats.turnOrderStats).map((player, idx) => (
                                                        <tr key={idx}>
                                                            <td className="small">{player.name}</td>
                                                            <td className={`small text-center ${player.positions[1] > 1 ? 'text-warning' : ''}`}>
                                                                {player.positions[1]}
                                                            </td>
                                                            <td className={`small text-center ${player.positions[2] > 1 ? 'text-warning' : ''}`}>
                                                                {player.positions[2]}
                                                            </td>
                                                            <td className={`small text-center ${player.positions[3] > 1 ? 'text-warning' : ''}`}>
                                                                {player.positions[3]}
                                                            </td>
                                                            <td className={`small text-center ${player.positions[4] > 1 ? 'text-warning' : ''}`}>
                                                                {player.positions[4]}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </details>
                                )}
                            </div>
                        )}

                        <div className="alert alert-info small mb-3">
                            <i className="fas fa-info-circle me-2"></i>
                            <strong>Swap players:</strong> Click a player to select them, then click another player in a different pod to swap.
                            {selectedPlayer && (
                                <span className="ms-2">
                                    <strong>Selected:</strong> Click a player in another pod to swap, or click the same player to deselect.
                                    <button
                                        className="btn btn-link btn-sm p-0 ms-2"
                                        onClick={() => setSelectedPlayer(null)}
                                    >
                                        Cancel
                                    </button>
                                </span>
                            )}
                        </div>

                        {/* Card View */}
                        {viewMode === 'card' && (
                            <div className="draft-pods-grid">
                                {draftPods.map(pod => (
                                    <div
                                        key={pod.id}
                                        className={`draft-pod-card ${pod.is_championship_game ? 'championship' : ''}`}
                                    >
                                        <div className="draft-pod-header">
                                            {pod.is_championship_game ? (
                                                <span className="badge bg-warning text-dark">
                                                    <i className="fas fa-crown me-1"></i>
                                                    Championship
                                                </span>
                                            ) : (
                                                <span className="pod-number">Pod #{pod.id}</span>
                                            )}
                                        </div>
                                        <ul className="draft-pod-players">
                                            {pod.participants.map(p => {
                                                const isSelected = selectedPlayer?.playerId === p.player_id && selectedPlayer?.podId === pod.id;
                                                const isSwapTarget = selectedPlayer && selectedPlayer.podId !== pod.id;

                                                return (
                                                    <li
                                                        key={p.player_id}
                                                        className={`draft-pod-player ${isSelected ? 'selected' : ''} ${isSwapTarget ? 'swap-target' : ''}`}
                                                        onClick={() => handlePlayerClick(p.player_id, pod.id)}
                                                    >
                                                        <span className="player-turn">{p.turn_order}</span>
                                                        <span className="player-name">{p.firstname} {p.lastname}</span>
                                                        {isSelected && <i className="fas fa-check-circle ms-auto"></i>}
                                                        {isSwapTarget && <i className="fas fa-exchange-alt ms-auto"></i>}
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Table View */}
                        {viewMode === 'table' && (
                            <div className="table-responsive">
                                <table className="table table-sm table-hover draft-pods-table">
                                    <thead>
                                        <tr>
                                            <th>Pod</th>
                                            <th>Player 1</th>
                                            <th>Player 2</th>
                                            <th>Player 3</th>
                                            <th>Player 4</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {draftPods.map(pod => (
                                            <tr key={pod.id} className={pod.is_championship_game ? 'table-warning' : ''}>
                                                <td>
                                                    {pod.is_championship_game ? (
                                                        <span className="badge bg-warning text-dark">
                                                            <i className="fas fa-crown me-1"></i>
                                                            Championship
                                                        </span>
                                                    ) : (
                                                        <strong>#{pod.id}</strong>
                                                    )}
                                                </td>
                                                {pod.participants.map(p => {
                                                    const isSelected = selectedPlayer?.playerId === p.player_id && selectedPlayer?.podId === pod.id;
                                                    const isSwapTarget = selectedPlayer && selectedPlayer.podId !== pod.id;

                                                    return (
                                                        <td
                                                            key={p.player_id}
                                                            className={`draft-table-player ${isSelected ? 'selected' : ''} ${isSwapTarget ? 'swap-target' : ''}`}
                                                            onClick={() => handlePlayerClick(p.player_id, pod.id)}
                                                        >
                                                            {p.firstname} {p.lastname}
                                                            {isSelected && <i className="fas fa-check-circle ms-1"></i>}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Tournament Progress */}
                {isTournament && podStats && podStats.totalPods > 0 && (
                    <div className="mt-4">
                        <h6 className="text-muted">Tournament Progress</h6>
                        <div className="progress" style={{ height: '25px' }}>
                            <div
                                className="progress-bar bg-success"
                                role="progressbar"
                                style={{ width: `${(podStats.completedPods / podStats.totalPods) * 100}%` }}
                            >
                                {podStats.completedPods} / {podStats.totalPods} pods complete
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Confirmation Modals */}
            <ConfirmModal
                action="endSeason"
                title="End Regular Season?"
                message="This will lock regular season stats and qualify the top 75% of players for the tournament. This action cannot be easily undone."
                confirmText="End Regular Season"
                variant="primary"
            />
            <ConfirmModal
                action="generatePods"
                title="Generate Tournament Pods?"
                message="This will create draft qualifying round pods. Each qualified player will be assigned to exactly 4 pods. You'll be able to preview and swap players before publishing."
                confirmText="Generate Draft Pods"
                variant="success"
            />
            <ConfirmModal
                action="startChampionship"
                title="Start Championship Game?"
                message="This will create a draft championship pod with the top 4 players by tournament points. You'll be able to preview before publishing."
                confirmText="Create Draft Championship"
                variant="warning"
            />
            <ConfirmModal
                action="complete"
                title="Complete Tournament?"
                message="This will record the championship winner as the league champion and mark the league as completed."
                confirmText="Complete Tournament"
                variant="success"
            />
            <ConfirmModal
                action="reset"
                title="Reset Tournament?"
                message="This will DELETE all tournament data including pods, results, and qualification status. The league will return to regular season phase. THIS CANNOT BE UNDONE!"
                confirmText="Reset Tournament"
                variant="danger"
            />
        </div>
    );
};

export default TournamentAdminPanel;
