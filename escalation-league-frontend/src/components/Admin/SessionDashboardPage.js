import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    getSession,
    adminCheckIn,
    adminCheckOut,
    postDiscordPoll,
    closeDiscordPoll,
    getMatchupMatrix,
    getPodSuggestions,
    lockSession,
    reopenSession,
    createPodWithPlayers,
    updateSessionStatus,
    postSessionRecap
} from '../../api/attendanceApi';
import { getLeagueParticipants } from '../../api/userLeaguesApi';
import { getLeagueDetails } from '../../api/leaguesApi';
import { useToast } from '../../context/ToastContext';
import { useWebSocket } from '../../context/WebSocketProvider';
import { DiscordIcon } from '../Shared';
import './SessionDashboardPage.css';

const SessionDashboardPage = () => {
    const { leagueId, sessionId } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { socket, connected, joinSession, leaveSession } = useWebSocket();

    // Data state
    const [league, setLeague] = useState(null);
    const [session, setSession] = useState(null);
    const [attendance, setAttendance] = useState([]);
    const [allParticipants, setAllParticipants] = useState([]);

    // UI state
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sessionActionLoading, setSessionActionLoading] = useState(false);

    // Pod suggestions state
    const [podSuggestions, setPodSuggestions] = useState(null);
    const [loadingPodSuggestions, setLoadingPodSuggestions] = useState(false);
    const [creatingPod, setCreatingPod] = useState(null);

    // Matchup Matrix state
    const [matchupMatrix, setMatchupMatrix] = useState(null);
    const [showMatchupMatrix, setShowMatchupMatrix] = useState(false);

    // Discord Poll Modal state
    const [showDiscordPollModal, setShowDiscordPollModal] = useState(false);
    const [discordPollMessage, setDiscordPollMessage] = useState('');
    const [postingPoll, setPostingPoll] = useState(false);

    // Fetch session data
    const fetchData = useCallback(async () => {
        if (!sessionId || !leagueId) return;

        setLoading(true);
        try {
            const [sessionData, participantsData, leagueData] = await Promise.all([
                getSession(sessionId),
                getLeagueParticipants(leagueId),
                getLeagueDetails(leagueId)
            ]);
            setSession(sessionData);
            setAttendance(sessionData.attendance || []);
            setAllParticipants(participantsData);
            setLeague(leagueData);
        } catch (err) {
            console.error('Error fetching session:', err);
            setError('Failed to load session.');
        } finally {
            setLoading(false);
        }
    }, [sessionId, leagueId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // WebSocket room management
    useEffect(() => {
        if (connected && sessionId) {
            joinSession(sessionId);
        }
        return () => {
            if (sessionId) {
                leaveSession(sessionId);
            }
        };
    }, [connected, sessionId, joinSession, leaveSession]);

    // Listen for attendance updates via WebSocket
    useEffect(() => {
        if (!socket) return;

        const handleAttendanceUpdated = (data) => {
            if (data.sessionId !== parseInt(sessionId)) return;

            if (data.source === 'discord') {
                fetchData();
                showToast(
                    `${data.user.firstname} ${data.user.lastname} ${data.action === 'check_in' ? 'is attending' : "can't make it"} (via Discord)`,
                    'info'
                );
            }
        };

        socket.on('attendance:updated', handleAttendanceUpdated);
        return () => {
            socket.off('attendance:updated', handleAttendanceUpdated);
        };
    }, [socket, sessionId, fetchData, showToast]);

    // --- Attendance Handlers ---
    const handleAdminCheckIn = async (userId) => {
        try {
            await adminCheckIn(sessionId, userId);
            showToast('Player marked as attending.', 'success');
            fetchData();
        } catch (err) {
            const message = err.response?.data?.error || 'Failed to update attendance.';
            showToast(message, 'error');
        }
    };

    const handleAdminCheckOut = async (userId) => {
        try {
            await adminCheckOut(sessionId, userId);
            showToast("Player marked as can't make it.", 'success');
            fetchData();
        } catch (err) {
            const message = err.response?.data?.error || 'Failed to update attendance.';
            showToast(message, 'error');
        }
    };

    // --- Discord Poll Handlers ---
    const handleOpenDiscordPollModal = () => {
        const dateStr = session?.session_date
            ? new Date(session.session_date).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                timeZone: 'UTC'
            })
            : 'Game Night';
        setDiscordPollMessage(`Are you coming to ${dateStr}?`);
        setShowDiscordPollModal(true);
    };

    const handlePostDiscordPoll = async () => {
        setPostingPoll(true);
        try {
            await postDiscordPoll(sessionId, discordPollMessage);
            showToast('Discord poll posted!', 'success');
            setShowDiscordPollModal(false);
            fetchData();
        } catch (err) {
            const message = err.response?.data?.error || 'Failed to post poll.';
            showToast(message, 'error');
        } finally {
            setPostingPoll(false);
        }
    };

    const handleCloseDiscordPoll = async () => {
        if (!window.confirm('Close this poll and lock the session?')) return;

        setSessionActionLoading(true);
        try {
            await closeDiscordPoll(sessionId);
            showToast('Poll closed and session locked.', 'success');
            fetchData();
            handleLoadPodSuggestions();
        } catch (err) {
            const message = err.response?.data?.error || 'Failed to close poll.';
            showToast(message, 'error');
        } finally {
            setSessionActionLoading(false);
        }
    };

    // --- Session Status Handlers ---
    const handleLockSession = async () => {
        if (!window.confirm('Lock this session? Check-ins will be closed.')) return;

        setSessionActionLoading(true);
        try {
            await lockSession(sessionId);
            showToast('Session locked.', 'success');
            fetchData();
            handleLoadPodSuggestions();
        } catch (err) {
            showToast('Failed to lock session.', 'error');
        } finally {
            setSessionActionLoading(false);
        }
    };

    const handleReopenSession = async () => {
        if (!window.confirm('Reopen this session?')) return;

        setSessionActionLoading(true);
        try {
            await reopenSession(sessionId);
            showToast('Session reopened.', 'success');
            setPodSuggestions(null);
            fetchData();
        } catch (err) {
            showToast('Failed to reopen session.', 'error');
        } finally {
            setSessionActionLoading(false);
        }
    };

    const handleCompleteSession = async () => {
        if (!window.confirm('Mark this session as completed?')) return;

        setSessionActionLoading(true);
        try {
            await updateSessionStatus(sessionId, 'completed');
            showToast('Session completed.', 'success');
            fetchData();
        } catch (err) {
            showToast('Failed to complete session.', 'error');
        } finally {
            setSessionActionLoading(false);
        }
    };

    const handlePostRecap = async () => {
        if (!window.confirm('Post recap to Discord and complete session?')) return;

        setSessionActionLoading(true);
        try {
            await postSessionRecap(sessionId);
            showToast('Recap posted and session completed!', 'success');
            fetchData();
        } catch (err) {
            const message = err.response?.data?.error || 'Failed to post recap.';
            showToast(message, 'error');
        } finally {
            setSessionActionLoading(false);
        }
    };

    // --- Pod Suggestion Handlers (Legacy) ---
    const handleLoadPodSuggestions = async () => {
        setLoadingPodSuggestions(true);
        try {
            const suggestions = await getPodSuggestions(sessionId);
            setPodSuggestions(suggestions);
        } catch (err) {
            showToast('Failed to load pod suggestions.', 'error');
        } finally {
            setLoadingPodSuggestions(false);
        }
    };

    const handleCreatePod = async (podIndex) => {
        if (!podSuggestions?.pods?.[podIndex]) return;

        const pod = podSuggestions.pods[podIndex];
        const playerIds = pod.players.map(p => p.id);

        setCreatingPod(podIndex);
        try {
            await createPodWithPlayers(sessionId, playerIds);
            showToast('Pod created!', 'success');
            setPodSuggestions(prev => ({
                ...prev,
                pods: prev.pods.filter((_, i) => i !== podIndex)
            }));
        } catch (err) {
            const message = err.response?.data?.error || 'Failed to create pod.';
            showToast(message, 'error');
        } finally {
            setCreatingPod(null);
        }
    };

    // --- Matchup Matrix Handler ---
    const handleLoadMatchupMatrix = async () => {
        try {
            const matrix = await getMatchupMatrix(leagueId);
            setMatchupMatrix(matrix);
            setShowMatchupMatrix(true);
        } catch (err) {
            showToast('Failed to load matchup matrix.', 'error');
        }
    };

    // --- Computed Values ---
    const isSessionLocked = session?.status === 'locked';
    const isSessionCompleted = session?.status === 'completed';
    const canModifyAttendance = !isSessionLocked && !isSessionCompleted;

    const attending = attendance.filter(a => a.is_active);
    const notAttending = attendance.filter(a => !a.is_active);
    const noResponse = allParticipants.filter(
        p => !attendance.some(a => a.user_id === p.user_id)
    );

    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'active': return 'bg-success';
            case 'locked': return 'bg-warning text-dark';
            case 'completed': return 'bg-secondary';
            default: return 'bg-info';
        }
    };

    // --- Render ---
    if (loading) {
        return (
            <div className="container-fluid mt-4">
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
            <div className="container-fluid mt-4">
                <div className="alert alert-danger">{error}</div>
                <Link to={`/admin/leagues/${leagueId}`} className="btn btn-secondary">
                    Back to League
                </Link>
            </div>
        );
    }

    return (
        <div className="container-fluid mt-4">
            <div className="session-dashboard">
                {/* Back Link */}
                <Link to={`/admin/leagues/${leagueId}#attendance`} className="back-link mb-3">
                    <i className="fas fa-arrow-left me-2"></i>
                    Back to {league?.name || 'League'}
                </Link>

                {/* Session Header */}
                <div className="session-header mb-4">
                    <div className="session-header-info">
                        <h2>
                            {session?.name || 'Game Night'}
                        </h2>
                        <p className="session-date">
                            {session?.session_date && new Date(session.session_date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric',
                                timeZone: 'UTC'
                            })}
                        </p>
                    </div>
                    <span className={`badge fs-6 ${getStatusBadgeClass(session?.status)}`}>
                        {session?.status === 'locked' && <i className="fas fa-lock me-1"></i>}
                        {session?.status}
                    </span>
                </div>

                {/* Session Actions */}
                <div className="card mb-4">
                    <div className="card-header">
                        <i className="fas fa-cogs me-2"></i>
                        Session Actions
                    </div>
                    <div className="card-body">
                        <div className="d-flex flex-wrap gap-2">
                            {/* Discord Poll Actions */}
                            {canModifyAttendance && !session?.has_active_poll && (
                                <button
                                    className="btn btn-outline-primary"
                                    onClick={handleOpenDiscordPollModal}
                                    disabled={sessionActionLoading}
                                >
                                    <DiscordIcon className="me-2" />
                                    Post Discord Poll
                                </button>
                            )}
                            {canModifyAttendance && session?.has_active_poll && (
                                <button
                                    className="btn btn-outline-danger"
                                    onClick={handleCloseDiscordPoll}
                                    disabled={sessionActionLoading}
                                >
                                    Close Poll & Lock
                                </button>
                            )}

                            {/* Session Status Actions */}
                            {canModifyAttendance && !session?.has_active_poll && attending.length >= 3 && (
                                <button
                                    className="btn btn-success"
                                    onClick={handleLockSession}
                                    disabled={sessionActionLoading}
                                >
                                    Lock Session
                                </button>
                            )}
                            {isSessionLocked && (
                                <>
                                    <button
                                        className="btn btn-warning"
                                        onClick={handleReopenSession}
                                        disabled={sessionActionLoading}
                                    >
                                        Reopen
                                    </button>
                                    <button
                                        className="btn btn-primary"
                                        onClick={handlePostRecap}
                                        disabled={sessionActionLoading || session?.recap_posted_at}
                                    >
                                        <DiscordIcon className="me-2" />
                                        Post Recap & Complete
                                    </button>
                                    {!session?.recap_posted_at && (
                                        <button
                                            className="btn btn-secondary"
                                            onClick={handleCompleteSession}
                                            disabled={sessionActionLoading}
                                        >
                                            Complete (No Recap)
                                        </button>
                                    )}
                                </>
                            )}

                            {/* Utility Actions */}
                            <button
                                className="btn btn-outline-secondary"
                                onClick={handleLoadMatchupMatrix}
                            >
                                Matchup Matrix
                            </button>
                        </div>

                        {/* Status Messages */}
                        {session?.has_active_poll && canModifyAttendance && (
                            <div className="alert alert-info mt-3 mb-0">
                                <DiscordIcon className="me-2" />
                                Discord poll is active. Players can RSVP via Discord.
                            </div>
                        )}
                        {isSessionLocked && (
                            <div className="alert alert-warning mt-3 mb-0">
                                <i className="fas fa-lock me-2"></i>
                                Session is locked. Create pods below.
                            </div>
                        )}
                        {isSessionCompleted && (
                            <div className="alert alert-secondary mt-3 mb-0">
                                <i className="fas fa-check-circle me-2"></i>
                                This session has been completed.
                            </div>
                        )}
                    </div>
                </div>

                {/* Pod Suggestions - shows when session is locked */}
                {isSessionLocked && (
                    <div className="card mb-4 border-primary">
                        <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                            <span>
                                <i className="fas fa-magic me-2"></i>
                                Pod Suggestions ({attending.length} players)
                            </span>
                            <button
                                className="btn btn-sm btn-light"
                                onClick={handleLoadPodSuggestions}
                                disabled={loadingPodSuggestions}
                            >
                                {loadingPodSuggestions ? (
                                    <span className="spinner-border spinner-border-sm"></span>
                                ) : (
                                    <i className="fas fa-sync-alt"></i>
                                )}
                                <span className="ms-1">Refresh</span>
                            </button>
                        </div>
                        <div className="card-body">
                            {loadingPodSuggestions ? (
                                <div className="text-center py-4">
                                    <div className="spinner-border text-primary"></div>
                                    <p className="text-muted mt-2">Calculating optimal pods...</p>
                                </div>
                            ) : !podSuggestions ? (
                                <div className="text-center py-4">
                                    <p className="text-muted mb-3">Generate pod suggestions based on matchup history.</p>
                                    <button className="btn btn-primary" onClick={handleLoadPodSuggestions}>
                                        Generate Suggestions
                                    </button>
                                </div>
                            ) : podSuggestions.pods?.length === 0 ? (
                                <div className="text-center py-4 text-muted">
                                    <i className="fas fa-check-circle fa-2x mb-2 text-success"></i>
                                    <p className="mb-0">All pods have been created!</p>
                                </div>
                            ) : (
                                <>
                                    <div className="row">
                                        {podSuggestions.pods?.map((pod, index) => (
                                            <div key={index} className="col-md-6 col-lg-4 mb-3">
                                                <div className="card h-100">
                                                    <div className="card-header d-flex justify-content-between align-items-center py-2">
                                                        <span className="fw-bold">
                                                            Pod {index + 1}
                                                            <span className="badge bg-secondary ms-2">Score: {pod.score}</span>
                                                        </span>
                                                        <span className="badge bg-info">{pod.size}p</span>
                                                    </div>
                                                    <div className="card-body py-2">
                                                        <ul className="list-unstyled mb-0">
                                                            {pod.players?.map(player => (
                                                                <li key={player.id} className="py-1">
                                                                    {player.firstname} {player.lastname}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                    <div className="card-footer py-2">
                                                        <button
                                                            className="btn btn-success btn-sm w-100"
                                                            onClick={() => handleCreatePod(index)}
                                                            disabled={creatingPod !== null}
                                                        >
                                                            {creatingPod === index ? 'Creating...' : 'Create Pod'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {podSuggestions.leftover?.length > 0 && (
                                        <div className="alert alert-info mt-3 mb-0">
                                            <strong>Leftover:</strong> {podSuggestions.leftover.map(p => `${p.firstname} ${p.lastname}`).join(', ')}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Attendance Table */}
                <div className="card mb-4">
                    <div className="card-header session-attendance-header">
                        <span>
                            <i className="fas fa-users me-2"></i>
                            Attendance
                        </span>
                        <span className="badge bg-success">{attending.length} attending</span>
                        <span className="badge bg-secondary">{notAttending.length} out</span>
                        {canModifyAttendance && noResponse.length > 0 && (
                            <span className="badge bg-warning text-dark">{noResponse.length} no response</span>
                        )}
                    </div>
                    <div className="card-body p-0">
                        <div className="table-responsive">
                            <table className="table table-hover mb-0 session-attendance-table">
                                <thead>
                                    <tr>
                                        <th className="col-name">Name</th>
                                        <th className="text-center col-status">Status</th>
                                        <th className="text-center col-source">Source</th>
                                        {canModifyAttendance && <th className="text-end col-actions">Actions</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {attending.map(a => (
                                        <tr key={a.user_id} className="table-success">
                                            <td className="col-name"><strong>{a.firstname} {a.lastname}</strong></td>
                                            <td className="text-center col-status">
                                                <span className="badge bg-success">Attending</span>
                                            </td>
                                            <td className="text-center col-source">
                                                {a.updated_via === 'discord' ? (
                                                    <span className="badge bg-primary"><DiscordIcon /> Discord</span>
                                                ) : (
                                                    <span className="text-muted">-</span>
                                                )}
                                            </td>
                                            {canModifyAttendance && (
                                                <td className="text-end col-actions">
                                                    <button
                                                        className="btn btn-sm btn-outline-danger"
                                                        onClick={() => handleAdminCheckOut(a.user_id)}
                                                        title="Mark Out"
                                                    >
                                                        <i className="fas fa-times"></i>
                                                        <span className="action-btn-text ms-1">Out</span>
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                    {notAttending.map(a => (
                                        <tr key={a.user_id} className="table-secondary">
                                            <td className="col-name"><strong>{a.firstname} {a.lastname}</strong></td>
                                            <td className="text-center col-status">
                                                <span className="badge bg-secondary">Can't Make It</span>
                                            </td>
                                            <td className="text-center col-source">
                                                {a.updated_via === 'discord' ? (
                                                    <span className="badge bg-primary"><DiscordIcon /> Discord</span>
                                                ) : (
                                                    <span className="text-muted">-</span>
                                                )}
                                            </td>
                                            {canModifyAttendance && (
                                                <td className="text-end col-actions">
                                                    <button
                                                        className="btn btn-sm btn-outline-success"
                                                        onClick={() => handleAdminCheckIn(a.user_id)}
                                                        title="Mark In"
                                                    >
                                                        <i className="fas fa-check"></i>
                                                        <span className="action-btn-text ms-1">In</span>
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                    {canModifyAttendance && noResponse.map(p => (
                                        <tr key={p.user_id}>
                                            <td className="col-name"><strong>{p.firstname} {p.lastname}</strong></td>
                                            <td className="text-center col-status">
                                                <span className="badge bg-warning text-dark">No Response</span>
                                            </td>
                                            <td className="text-center col-source">
                                                <span className="text-muted">-</span>
                                            </td>
                                            <td className="text-end col-actions">
                                                <div className="d-flex gap-2 justify-content-end">
                                                    <button
                                                        className="btn btn-sm btn-success"
                                                        onClick={() => handleAdminCheckIn(p.user_id)}
                                                        title="Mark In"
                                                    >
                                                        <i className="fas fa-check"></i>
                                                        <span className="action-btn-text ms-1">In</span>
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-outline-secondary"
                                                        onClick={() => handleAdminCheckOut(p.user_id)}
                                                        title="Mark Out"
                                                    >
                                                        <i className="fas fa-times"></i>
                                                        <span className="action-btn-text ms-1">Out</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {attending.length === 0 && notAttending.length === 0 && noResponse.length === 0 && (
                                        <tr>
                                            <td colSpan={canModifyAttendance ? 4 : 3} className="text-center text-muted py-4">
                                                No participants in this league yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Discord Poll Modal */}
                {showDiscordPollModal && (
                    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                        <div className="modal-dialog">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">
                                        <DiscordIcon className="me-2" />
                                        Post Discord Poll
                                    </h5>
                                    <button type="button" className="btn-close" onClick={() => setShowDiscordPollModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    <div className="mb-3">
                                        <label className="form-label">Poll Message</label>
                                        <textarea
                                            className="form-control"
                                            rows={3}
                                            value={discordPollMessage}
                                            onChange={(e) => setDiscordPollMessage(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button className="btn btn-secondary" onClick={() => setShowDiscordPollModal(false)}>
                                        Cancel
                                    </button>
                                    <button
                                        className="btn btn-primary"
                                        onClick={handlePostDiscordPoll}
                                        disabled={postingPoll}
                                    >
                                        {postingPoll ? 'Posting...' : 'Post Poll'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Matchup Matrix Modal */}
                {showMatchupMatrix && matchupMatrix && (
                    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                        <div className="modal-dialog modal-xl">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">Matchup Matrix</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowMatchupMatrix(false)}></button>
                                </div>
                                <div className="modal-body">
                                    <p className="text-muted small mb-3">
                                        Shows how many times each player has played against each other.
                                    </p>
                                    <div className="table-responsive">
                                        <table className="table table-bordered table-sm">
                                            <thead>
                                                <tr>
                                                    <th></th>
                                                    {matchupMatrix.players?.map(p => (
                                                        <th key={p.id} className="text-center" style={{ fontSize: '0.75rem' }}>
                                                            {p.firstname}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {matchupMatrix.players?.map((p1, i) => (
                                                    <tr key={p1.id}>
                                                        <th style={{ fontSize: '0.75rem' }}>{p1.firstname}</th>
                                                        {matchupMatrix.players?.map((p2, j) => (
                                                            <td
                                                                key={p2.id}
                                                                className="text-center"
                                                                style={{
                                                                    backgroundColor: i === j ? '#f8f9fa' :
                                                                        (matchupMatrix.matrix?.[p1.id]?.[p2.id] || 0) === 0 ? '#fff3cd' :
                                                                        (matchupMatrix.matrix?.[p1.id]?.[p2.id] || 0) >= 3 ? '#d4edda' : 'white'
                                                                }}
                                                            >
                                                                {i === j ? '-' : (matchupMatrix.matrix?.[p1.id]?.[p2.id] || 0)}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="mt-2 small">
                                        <span className="badge bg-warning text-dark me-2">0 games</span>
                                        <span className="badge bg-light text-dark me-2">1-2 games</span>
                                        <span className="badge bg-success me-2">3+ games</span>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button className="btn btn-secondary" onClick={() => setShowMatchupMatrix(false)}>
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SessionDashboardPage;
