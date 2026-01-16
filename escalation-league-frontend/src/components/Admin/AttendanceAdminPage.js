import React, { useEffect, useState, useCallback } from 'react';
import {
    getLeagueSessions,
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
    createSession,
    updateSessionStatus,
    postSessionRecap
} from '../../api/attendanceApi';
import { getLeagueParticipants } from '../../api/userLeaguesApi';
import { usePermissions } from '../context/PermissionsProvider';
import { useToast } from '../context/ToastContext';
import { useWebSocket } from '../context/WebSocketProvider';

const AttendanceAdminPage = () => {
    const { activeLeague } = usePermissions();
    const { showToast } = useToast();
    const { socket, connected, joinSession, leaveSession, joinLeague, leaveLeague } = useWebSocket();

    // Session management state
    const [sessions, setSessions] = useState([]);
    const [selectedSessionId, setSelectedSessionId] = useState(null);
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

    // Create Session Modal state
    const [showCreateSessionModal, setShowCreateSessionModal] = useState(false);
    const [newSessionDate, setNewSessionDate] = useState('');
    const [newSessionName, setNewSessionName] = useState('');
    const [creatingSession, setCreatingSession] = useState(false);

    // Discord Poll Modal state
    const [showDiscordPollModal, setShowDiscordPollModal] = useState(false);
    const [discordPollMessage, setDiscordPollMessage] = useState('');
    const [postingPoll, setPostingPoll] = useState(false);

    const leagueId = activeLeague?.league_id || activeLeague?.id;

    // Fetch all sessions for the league
    const fetchSessions = useCallback(async () => {
        if (!leagueId) return;

        try {
            const [sessionsData, participantsData] = await Promise.all([
                getLeagueSessions(leagueId),
                getLeagueParticipants(leagueId)
            ]);
            setSessions(sessionsData);
            setAllParticipants(participantsData);

            // Auto-select first non-completed session, or most recent
            if (!selectedSessionId && sessionsData.length > 0) {
                const activeSession = sessionsData.find(s => s.status !== 'completed') || sessionsData[0];
                setSelectedSessionId(activeSession.id);
            }
        } catch (err) {
            console.error('Error fetching sessions:', err);
            setError('Failed to load sessions.');
        }
    }, [leagueId, selectedSessionId]);

    // Fetch selected session details
    const fetchSessionDetails = useCallback(async () => {
        if (!selectedSessionId) {
            setSession(null);
            setAttendance([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const sessionData = await getSession(selectedSessionId);
            setSession(sessionData);
            setAttendance(sessionData.attendance || []);
            setPodSuggestions(null); // Clear suggestions when switching sessions
        } catch (err) {
            console.error('Error fetching session details:', err);
            setError('Failed to load session details.');
        } finally {
            setLoading(false);
        }
    }, [selectedSessionId]);

    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    useEffect(() => {
        fetchSessionDetails();
    }, [fetchSessionDetails]);

    // WebSocket room management
    useEffect(() => {
        if (connected && selectedSessionId) {
            joinSession(selectedSessionId);
            if (leagueId) {
                joinLeague(leagueId);
            }
        }

        return () => {
            if (selectedSessionId) {
                leaveSession(selectedSessionId);
            }
            if (leagueId) {
                leaveLeague(leagueId);
            }
        };
    }, [connected, selectedSessionId, leagueId, joinSession, leaveSession, joinLeague, leaveLeague]);

    // Listen for attendance updates via WebSocket
    useEffect(() => {
        if (!socket) return;

        const handleAttendanceUpdated = (data) => {
            if (data.sessionId !== selectedSessionId) return;

            if (data.source === 'discord') {
                fetchSessionDetails();
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
    }, [socket, selectedSessionId, fetchSessionDetails, showToast]);

    // --- Session Management Handlers ---

    const handleCreateSession = async (e) => {
        e.preventDefault();
        if (!newSessionDate || !leagueId) return;

        setCreatingSession(true);
        try {
            const newSession = await createSession({
                league_id: leagueId,
                session_date: newSessionDate,
                name: newSessionName || null
            });
            showToast('Session created successfully!', 'success');
            setShowCreateSessionModal(false);
            setNewSessionDate('');
            setNewSessionName('');
            await fetchSessions();
            setSelectedSessionId(newSession.id);
        } catch (err) {
            console.error('Error creating session:', err);
            const message = err.response?.data?.error || 'Failed to create session.';
            showToast(message, 'error');
        } finally {
            setCreatingSession(false);
        }
    };

    const handleSelectSession = (sessionId) => {
        setSelectedSessionId(sessionId);
    };

    // --- Attendance Handlers ---

    const handleAdminCheckIn = async (userId) => {
        try {
            await adminCheckIn(selectedSessionId, userId);
            showToast('Player marked as attending.', 'success');
            fetchSessionDetails();
        } catch (err) {
            console.error('Error admin check in:', err);
            const message = err.response?.data?.error || 'Failed to update player attendance.';
            showToast(message, 'error');
        }
    };

    const handleAdminCheckOut = async (userId) => {
        try {
            await adminCheckOut(selectedSessionId, userId);
            showToast("Player marked as can't make it.", 'success');
            fetchSessionDetails();
        } catch (err) {
            console.error('Error admin check out:', err);
            const message = err.response?.data?.error || 'Failed to update player attendance.';
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
        if (!selectedSessionId) return;

        setPostingPoll(true);
        try {
            await postDiscordPoll(selectedSessionId, discordPollMessage);
            showToast('Discord poll posted successfully!', 'success');
            setShowDiscordPollModal(false);
            fetchSessionDetails();
            fetchSessions();
        } catch (err) {
            console.error('Error posting Discord poll:', err);
            const message = err.response?.data?.error || 'Failed to post Discord poll.';
            showToast(message, 'error');
        } finally {
            setPostingPoll(false);
        }
    };

    const handleCloseDiscordPoll = async () => {
        if (!selectedSessionId) return;

        if (!window.confirm('Close this poll and lock the session?')) return;

        setSessionActionLoading(true);
        try {
            await closeDiscordPoll(selectedSessionId);
            showToast('Poll closed and session locked.', 'success');
            fetchSessionDetails();
            fetchSessions();
            handleLoadPodSuggestions();
        } catch (err) {
            console.error('Error closing Discord poll:', err);
            const message = err.response?.data?.error || 'Failed to close poll.';
            showToast(message, 'error');
        } finally {
            setSessionActionLoading(false);
        }
    };

    const handlePostRecap = async () => {
        if (!selectedSessionId) return;

        if (!window.confirm('Post the recap to Discord and complete this session?')) return;

        setSessionActionLoading(true);
        try {
            await postSessionRecap(selectedSessionId);
            showToast('Recap posted and session completed!', 'success');
            fetchSessionDetails();
            fetchSessions();
        } catch (err) {
            console.error('Error posting recap:', err);
            const message = err.response?.data?.error || 'Failed to post recap.';
            showToast(message, 'error');
        } finally {
            setSessionActionLoading(false);
        }
    };

    // --- Session Status Handlers ---

    const handleLockSession = async () => {
        if (!selectedSessionId) return;

        if (!window.confirm('Lock this session? Check-ins will be closed.')) return;

        setSessionActionLoading(true);
        try {
            await lockSession(selectedSessionId);
            showToast('Session locked.', 'success');
            fetchSessionDetails();
            fetchSessions();
            handleLoadPodSuggestions();
        } catch (err) {
            console.error('Error locking session:', err);
            showToast('Failed to lock session.', 'error');
        } finally {
            setSessionActionLoading(false);
        }
    };

    const handleReopenSession = async () => {
        if (!selectedSessionId) return;

        if (!window.confirm('Reopen this session? Check-ins will be allowed again.')) return;

        setSessionActionLoading(true);
        try {
            await reopenSession(selectedSessionId);
            showToast('Session reopened.', 'success');
            setPodSuggestions(null);
            fetchSessionDetails();
            fetchSessions();
        } catch (err) {
            console.error('Error reopening session:', err);
            showToast('Failed to reopen session.', 'error');
        } finally {
            setSessionActionLoading(false);
        }
    };

    const handleCompleteSession = async () => {
        if (!selectedSessionId) return;

        if (!window.confirm('Mark this session as completed? This cannot be undone.')) return;

        setSessionActionLoading(true);
        try {
            await updateSessionStatus(selectedSessionId, 'completed');
            showToast('Session completed.', 'success');
            fetchSessionDetails();
            fetchSessions();
        } catch (err) {
            console.error('Error completing session:', err);
            showToast('Failed to complete session.', 'error');
        } finally {
            setSessionActionLoading(false);
        }
    };

    // --- Pod Suggestion Handlers ---

    const handleLoadPodSuggestions = async () => {
        if (!selectedSessionId) return;

        setLoadingPodSuggestions(true);
        try {
            const suggestions = await getPodSuggestions(selectedSessionId);
            setPodSuggestions(suggestions);
        } catch (err) {
            console.error('Error loading pod suggestions:', err);
            showToast('Failed to load pod suggestions.', 'error');
        } finally {
            setLoadingPodSuggestions(false);
        }
    };

    const handleCreatePod = async (podIndex) => {
        if (!selectedSessionId || !podSuggestions?.pods?.[podIndex]) return;

        const pod = podSuggestions.pods[podIndex];
        const playerIds = pod.players.map(p => p.id);

        setCreatingPod(podIndex);
        try {
            await createPodWithPlayers(selectedSessionId, playerIds);
            showToast('Pod created successfully!', 'success');
            setPodSuggestions(prev => ({
                ...prev,
                pods: prev.pods.filter((_, i) => i !== podIndex)
            }));
        } catch (err) {
            console.error('Error creating pod:', err);
            const message = err.response?.data?.error || 'Failed to create pod.';
            showToast(message, 'error');
        } finally {
            setCreatingPod(null);
        }
    };

    // --- Matchup Matrix Handler ---

    const handleLoadMatchupMatrix = async () => {
        if (!leagueId) return;

        try {
            const matrix = await getMatchupMatrix(leagueId);
            setMatchupMatrix(matrix);
            setShowMatchupMatrix(true);
        } catch (err) {
            console.error('Error loading matchup matrix:', err);
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

    if (!activeLeague) {
        return (
            <div className="container mt-4">
                <div className="alert alert-warning">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    Please select an active league to manage attendance.
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid mt-4">
            <div className="row">
                {/* Left Sidebar - Session List */}
                <div className="col-12 col-md-3 mb-4 mb-md-0">
                    <div className="card">
                        <div className="card-header d-flex justify-content-between align-items-center">
                            <span>
                                <i className="fas fa-calendar-alt me-2"></i>
                                Sessions
                            </span>
                            <button
                                className="btn btn-sm btn-primary"
                                onClick={() => setShowCreateSessionModal(true)}
                                title="Create new session"
                            >
                                <i className="fas fa-plus"></i>
                            </button>
                        </div>
                        <div className="list-group list-group-flush" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
                            {sessions.length === 0 ? (
                                <div className="list-group-item text-muted text-center py-4">
                                    No sessions yet
                                </div>
                            ) : (
                                sessions.map(s => (
                                    <button
                                        key={s.id}
                                        className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${selectedSessionId === s.id ? 'active' : ''}`}
                                        onClick={() => handleSelectSession(s.id)}
                                    >
                                        <div>
                                            <div className="fw-bold">
                                                {new Date(s.session_date).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    timeZone: 'UTC'
                                                })}
                                            </div>
                                            <small className={selectedSessionId === s.id ? 'text-white-50' : 'text-muted'}>
                                                {s.name || 'Game Night'}
                                            </small>
                                        </div>
                                        <span className={`badge ${getStatusBadgeClass(s.status)}`}>
                                            {s.status === 'locked' && <i className="fas fa-lock me-1"></i>}
                                            {s.status}
                                        </span>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Content - Selected Session */}
                <div className="col-12 col-md-9">
                    {!selectedSessionId ? (
                        <div className="card">
                            <div className="card-body text-center py-5">
                                <i className="fas fa-calendar-plus fa-3x text-muted mb-3"></i>
                                <h5 className="text-muted">No Session Selected</h5>
                                <p className="text-muted mb-3">Select a session from the list or create a new one.</p>
                                <button
                                    className="btn btn-primary"
                                    onClick={() => setShowCreateSessionModal(true)}
                                >
                                    <i className="fas fa-plus me-2"></i>
                                    Create Session
                                </button>
                            </div>
                        </div>
                    ) : loading ? (
                        <div className="card">
                            <div className="card-body text-center py-5">
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {error && <div className="alert alert-danger">{error}</div>}

                            {/* Session Header */}
                            <div className="card mb-4">
                                <div className="card-header d-flex justify-content-between align-items-center">
                                    <div>
                                        <h5 className="mb-0">
                                            <i className="fas fa-calendar-day me-2"></i>
                                            {session?.name || 'Game Night'}
                                        </h5>
                                        <small className="text-muted">
                                            {session?.session_date ? new Date(session.session_date).toLocaleDateString('en-US', {
                                                weekday: 'long',
                                                month: 'long',
                                                day: 'numeric',
                                                year: 'numeric',
                                                timeZone: 'UTC'
                                            }) : ''}
                                        </small>
                                    </div>
                                    <span className={`badge fs-6 ${getStatusBadgeClass(session?.status)}`}>
                                        {session?.status === 'locked' && <i className="fas fa-lock me-1"></i>}
                                        {session?.status}
                                    </span>
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
                                                <i className="fab fa-discord me-2"></i>
                                                Post Discord Poll
                                            </button>
                                        )}
                                        {canModifyAttendance && session?.has_active_poll && (
                                            <button
                                                className="btn btn-outline-danger"
                                                onClick={handleCloseDiscordPoll}
                                                disabled={sessionActionLoading}
                                            >
                                                <i className="fas fa-times-circle me-2"></i>
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
                                                <i className="fas fa-lock me-2"></i>
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
                                                    <i className="fas fa-lock-open me-2"></i>
                                                    Reopen
                                                </button>
                                                <button
                                                    className="btn btn-primary"
                                                    onClick={handlePostRecap}
                                                    disabled={sessionActionLoading || session?.recap_posted_at}
                                                >
                                                    <i className="fab fa-discord me-2"></i>
                                                    Post Recap & Complete
                                                </button>
                                                {!session?.recap_posted_at && (
                                                    <button
                                                        className="btn btn-secondary"
                                                        onClick={handleCompleteSession}
                                                        disabled={sessionActionLoading}
                                                    >
                                                        <i className="fas fa-check-circle me-2"></i>
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
                                            <i className="fas fa-table me-2"></i>
                                            Matchup Matrix
                                        </button>
                                    </div>

                                    {/* Status Messages */}
                                    {session?.has_active_poll && canModifyAttendance && (
                                        <div className="alert alert-info mt-3 mb-0">
                                            <i className="fab fa-discord me-2"></i>
                                            Discord poll is active. Players can RSVP via Discord reactions.
                                        </div>
                                    )}
                                    {isSessionLocked && (
                                        <div className="alert alert-warning mt-3 mb-0">
                                            <i className="fas fa-lock me-2"></i>
                                            Session is locked. Check-ins are closed. Create pods below.
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

                            {/* Pod Suggestions Panel - shows when session is locked */}
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
                                                <span className="spinner-border spinner-border-sm" role="status"></span>
                                            ) : (
                                                <i className="fas fa-sync-alt"></i>
                                            )}
                                            <span className="ms-1">Refresh</span>
                                        </button>
                                    </div>
                                    <div className="card-body">
                                        {loadingPodSuggestions ? (
                                            <div className="text-center py-4">
                                                <div className="spinner-border text-primary" role="status">
                                                    <span className="visually-hidden">Loading...</span>
                                                </div>
                                                <p className="text-muted mt-2">Calculating optimal pods...</p>
                                            </div>
                                        ) : !podSuggestions ? (
                                            <div className="text-center py-4">
                                                <p className="text-muted mb-3">Generate pod suggestions based on matchup history.</p>
                                                <button className="btn btn-primary" onClick={handleLoadPodSuggestions}>
                                                    <i className="fas fa-magic me-2"></i>
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
                                                                        <span className="badge bg-secondary ms-2" title="Lower = fewer previous games together">
                                                                            Score: {pod.score}
                                                                        </span>
                                                                    </span>
                                                                    <span className="badge bg-info">{pod.size}p</span>
                                                                </div>
                                                                <div className="card-body py-2">
                                                                    <ul className="list-unstyled mb-0">
                                                                        {pod.players?.map(player => (
                                                                            <li key={player.id} className="py-1">
                                                                                <i className="fas fa-user me-2 text-muted"></i>
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
                                                                        {creatingPod === index ? (
                                                                            <><span className="spinner-border spinner-border-sm me-2"></span>Creating...</>
                                                                        ) : (
                                                                            <><i className="fas fa-plus-circle me-2"></i>Create Pod</>
                                                                        )}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                {podSuggestions.leftover?.length > 0 && (
                                                    <div className="alert alert-info mt-3 mb-0">
                                                        <i className="fas fa-user-friends me-2"></i>
                                                        <strong>Leftover:</strong> {podSuggestions.leftover.map(p => `${p.firstname} ${p.lastname}`).join(', ')}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Attendance Lists */}
                            <div className="row">
                                {/* Attending */}
                                <div className={canModifyAttendance ? 'col-lg-4' : 'col-lg-6'}>
                                    <div className="card mb-4">
                                        <div className="card-header bg-success text-white">
                                            <i className="fas fa-check-circle me-2"></i>
                                            Attending ({attending.length})
                                        </div>
                                        <div className="card-body p-0">
                                            {attending.length === 0 ? (
                                                <p className="text-muted text-center py-4 mb-0">No one has confirmed yet.</p>
                                            ) : (
                                                <div className="list-group list-group-flush">
                                                    {attending.map(a => (
                                                        <div key={a.user_id} className="list-group-item d-flex justify-content-between align-items-center">
                                                            <div>
                                                                <i className="fas fa-user-check text-success me-2"></i>
                                                                {a.firstname} {a.lastname}
                                                                {a.updated_via === 'discord' && (
                                                                    <span className="badge bg-primary ms-2">
                                                                        <i className="fab fa-discord"></i>
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {canModifyAttendance && (
                                                                <button
                                                                    className="btn btn-sm btn-outline-danger"
                                                                    onClick={() => handleAdminCheckOut(a.user_id)}
                                                                    title="Mark as can't make it"
                                                                >
                                                                    <i className="fas fa-times"></i>
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Can't Make It */}
                                <div className={canModifyAttendance ? 'col-lg-4' : 'col-lg-6'}>
                                    <div className="card mb-4">
                                        <div className="card-header bg-secondary text-white">
                                            <i className="fas fa-times-circle me-2"></i>
                                            Can't Make It ({notAttending.length})
                                        </div>
                                        <div className="card-body p-0">
                                            {notAttending.length === 0 ? (
                                                <p className="text-muted text-center py-4 mb-0">No one has declined.</p>
                                            ) : (
                                                <div className="list-group list-group-flush">
                                                    {notAttending.map(a => (
                                                        <div key={a.user_id} className="list-group-item d-flex justify-content-between align-items-center">
                                                            <div>
                                                                <i className="fas fa-user-times text-secondary me-2"></i>
                                                                {a.firstname} {a.lastname}
                                                                {a.updated_via === 'discord' && (
                                                                    <span className="badge bg-primary ms-2">
                                                                        <i className="fab fa-discord"></i>
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {canModifyAttendance && (
                                                                <button
                                                                    className="btn btn-sm btn-outline-success"
                                                                    onClick={() => handleAdminCheckIn(a.user_id)}
                                                                    title="Mark as attending"
                                                                >
                                                                    <i className="fas fa-plus"></i>
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* No Response - only show when can modify */}
                                {canModifyAttendance && (
                                    <div className="col-lg-4">
                                        <div className="card mb-4">
                                            <div className="card-header">
                                                <i className="fas fa-question-circle me-2"></i>
                                                No Response ({noResponse.length})
                                            </div>
                                            <div className="card-body p-0">
                                                {noResponse.length === 0 ? (
                                                    <p className="text-muted text-center py-4 mb-0">Everyone has responded!</p>
                                                ) : (
                                                    <div className="list-group list-group-flush">
                                                        {noResponse.map(p => (
                                                            <div key={p.user_id} className="list-group-item d-flex justify-content-between align-items-center">
                                                                <div>
                                                                    <i className="fas fa-user me-2 text-muted"></i>
                                                                    {p.firstname} {p.lastname}
                                                                </div>
                                                                <div>
                                                                    <button
                                                                        className="btn btn-sm btn-success me-1"
                                                                        onClick={() => handleAdminCheckIn(p.user_id)}
                                                                        title="Mark as attending"
                                                                    >
                                                                        <i className="fas fa-check"></i>
                                                                    </button>
                                                                    <button
                                                                        className="btn btn-sm btn-outline-secondary"
                                                                        onClick={() => handleAdminCheckOut(p.user_id)}
                                                                        title="Mark as can't make it"
                                                                    >
                                                                        <i className="fas fa-times"></i>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Create Session Modal */}
            {showCreateSessionModal && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    <i className="fas fa-calendar-plus me-2"></i>
                                    Create Session
                                </h5>
                                <button type="button" className="btn-close" onClick={() => setShowCreateSessionModal(false)}></button>
                            </div>
                            <form onSubmit={handleCreateSession}>
                                <div className="modal-body">
                                    <div className="mb-3">
                                        <label className="form-label">Date *</label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={newSessionDate}
                                            onChange={(e) => setNewSessionDate(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Name (optional)</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="e.g., Week 3 Game Night"
                                            value={newSessionName}
                                            onChange={(e) => setNewSessionName(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowCreateSessionModal(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary" disabled={creatingSession || !newSessionDate}>
                                        {creatingSession ? (
                                            <><span className="spinner-border spinner-border-sm me-2"></span>Creating...</>
                                        ) : (
                                            <><i className="fas fa-plus me-2"></i>Create</>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Discord Poll Modal */}
            {showDiscordPollModal && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    <i className="fab fa-discord me-2"></i>
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
                                        placeholder="Enter your poll message..."
                                    />
                                    <small className="text-muted">
                                        This message will be shown in the Discord poll embed.
                                    </small>
                                </div>
                                <div className="alert alert-info mb-0">
                                    <i className="fas fa-info-circle me-2"></i>
                                    Players can react with food/no-food emojis to RSVP.
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowDiscordPollModal(false)}>
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handlePostDiscordPoll}
                                    disabled={postingPoll}
                                >
                                    {postingPoll ? (
                                        <><span className="spinner-border spinner-border-sm me-2"></span>Posting...</>
                                    ) : (
                                        <><i className="fab fa-discord me-2"></i>Post Poll</>
                                    )}
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
                                <h5 className="modal-title">
                                    <i className="fas fa-table me-2"></i>
                                    Matchup Matrix
                                </h5>
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
                                <button type="button" className="btn btn-secondary" onClick={() => setShowMatchupMatrix(false)}>
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttendanceAdminPage;
