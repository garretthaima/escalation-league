import React, { useState } from 'react';
import { useToast } from '../context/ToastContext';
import {
    endRegularSeason,
    generateTournamentPods,
    startChampionship,
    completeTournament,
    resetTournament,
    getChampionshipQualifiers
} from '../../api/tournamentApi';

const TournamentAdminPanel = ({ leagueId, league, podStats, onRefresh }) => {
    const { showToast } = useToast();
    const [loading, setLoading] = useState({});
    const [showConfirmModal, setShowConfirmModal] = useState(null);
    const [championshipQualifiers, setChampionshipQualifiers] = useState(null);

    const isRegularSeason = league?.phase === 'regular_season';
    const isTournament = league?.phase === 'tournament';
    const isCompleted = league?.phase === 'completed';

    // Check tournament progress
    const podsGenerated = podStats?.totalPods > 0;
    const allQualifyingComplete = podStats && podStats.qualifyingPods === podStats.completedPods && podStats.qualifyingPods > 0;
    const championshipExists = podStats?.championshipPod !== null;
    const championshipComplete = podStats?.championshipPod?.confirmation_status === 'complete';

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
                    showToast(`Generated ${result.podCount} tournament pods!`, 'success');
                    break;
                case 'startChampionship':
                    result = await startChampionship(leagueId);
                    showToast('Championship game created!', 'success');
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
                                    {championshipQualifiers.qualifiers.map((q, i) => (
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

                {/* Tournament Progress */}
                {isTournament && podStats && (
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
                message="This will create all qualifying round pods. Each qualified player will be assigned to exactly 4 pods, maximizing unique matchups."
                confirmText="Generate Pods"
                variant="success"
            />
            <ConfirmModal
                action="startChampionship"
                title="Start Championship Game?"
                message="This will create the championship pod with the top 4 players by tournament points."
                confirmText="Start Championship"
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
