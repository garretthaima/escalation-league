import React, { useEffect, useState, useCallback } from 'react';
import { getActivePollSession, getTodaySession, checkIn, checkOut } from '../../api/attendanceApi';
import { usePermissions } from '../context/PermissionsProvider';
import { useToast } from '../context/ToastContext';
import { useWebSocket } from '../context/WebSocketProvider';
import LoadingSpinner from '../Shared/LoadingSpinner';
import './AttendancePage.css';

const AttendancePage = () => {
    const { activeLeague, user } = usePermissions();
    const { showToast } = useToast();
    const { socket, connected, joinSession, leaveSession, joinLeague, leaveLeague } = useWebSocket();

    const [session, setSession] = useState(null);
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [hasActivePoll, setHasActivePoll] = useState(false);

    const leagueId = activeLeague?.league_id || activeLeague?.id;
    const isAttending = attendance.some(a => a.user_id === user?.id && a.is_active);

    const fetchData = useCallback(async () => {
        if (!leagueId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError('');
        try {
            // First try to get the active poll session (if there's a Discord poll open)
            let sessionData = null;
            const pollResponse = await getActivePollSession(leagueId);

            if (pollResponse.session) {
                // There's an active poll
                sessionData = pollResponse.session;
                setHasActivePoll(true);
            } else {
                // No active poll - fall back to today's session
                sessionData = await getTodaySession(leagueId);
                setHasActivePoll(false);
            }

            setSession(sessionData);
            setAttendance(sessionData.attendance || []);
        } catch (err) {
            console.error('Error fetching session:', err);
            setError('Failed to load attendance data. The database tables may not exist yet.');
        } finally {
            setLoading(false);
        }
    }, [leagueId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Join WebSocket rooms for real-time updates
    useEffect(() => {
        if (connected && session?.id) {
            joinSession(session.id);
            if (leagueId) {
                joinLeague(leagueId);
            }
        }

        return () => {
            if (session?.id) {
                leaveSession(session.id);
            }
            if (leagueId) {
                leaveLeague(leagueId);
            }
        };
    }, [connected, session?.id, leagueId, joinSession, leaveSession, joinLeague, leaveLeague]);

    // Listen for attendance updates via WebSocket
    useEffect(() => {
        if (!socket) return;

        const handleAttendanceUpdated = (data) => {
            // Only process if it's for our session
            if (data.sessionId !== session?.id) return;

            // Refresh attendance data when someone RSVPs via Discord
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
    }, [socket, session?.id, fetchData, showToast]);

    const handleAttend = async () => {
        try {
            await checkIn(session.id);
            showToast("You're attending!", 'success');
            fetchData();
        } catch (err) {
            console.error('Error updating attendance:', err);
            showToast('Failed to update attendance.', 'error');
        }
    };

    const handleCantMakeIt = async () => {
        try {
            await checkOut(session.id);
            showToast("Marked as can't make it", 'success');
            fetchData();
        } catch (err) {
            console.error('Error updating attendance:', err);
            showToast('Failed to update attendance.', 'error');
        }
    };

    const attending = attendance.filter(a => a.is_active);
    const notAttending = attendance.filter(a => !a.is_active);

    if (!activeLeague) {
        return (
            <div className="container mt-4">
                <div className="alert alert-warning">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    Please join a league to access attendance.
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="container mt-4 text-center py-5">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    return (
        <div className="container mt-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>
                    <i className="fas fa-clipboard-check me-2"></i>
                    Game Night Attendance
                </h2>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            {/* Active Poll Banner */}
            {hasActivePoll && (
                <div className="alert alert-info d-flex align-items-center mb-4">
                    <i className="fab fa-discord fa-lg me-3"></i>
                    <div>
                        <strong>Discord Poll Active!</strong>
                        <span className="ms-2">RSVP via Discord or check in below.</span>
                    </div>
                </div>
            )}

            {/* Session Info */}
            <div className="card mb-4">
                <div className="card-header d-flex justify-content-between align-items-center">
                    <span>
                        <i className="fas fa-calendar-day me-2"></i>
                        {session?.name || (session?.session_date ? new Date(session.session_date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                            timeZone: 'UTC'
                        }) : 'Game Night')}
                    </span>
                    <div>
                        {hasActivePoll && (
                            <span className="badge bg-info me-2">
                                <i className="fab fa-discord me-1"></i>
                                Poll Open
                            </span>
                        )}
                        <span className={`badge ${session?.status === 'active' ? 'bg-success' : session?.status === 'locked' ? 'bg-warning' : 'bg-secondary'}`}>
                            {session?.status === 'locked' && <i className="fas fa-lock me-1"></i>}
                            {session?.status}
                        </span>
                    </div>
                </div>
                <div className="card-body">
                    <div className="row">
                        <div className="col-md-4">
                            <strong>Date:</strong> {session?.session_date ? new Date(session.session_date).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                timeZone: 'UTC'
                            }) : ''}
                        </div>
                        <div className="col-md-4">
                            <strong>League:</strong> {activeLeague?.league_name || activeLeague?.name}
                        </div>
                        <div className="col-md-4">
                            <strong>Attending:</strong> {attending.length} players
                        </div>
                    </div>
                </div>
            </div>

            {/* User RSVP */}
            <div className="card mb-4">
                <div className="card-body text-center">
                    {session?.status === 'locked' || session?.status === 'completed' ? (
                        <div>
                            {isAttending ? (
                                <span className="badge bg-success fs-5">
                                    <i className="fas fa-check-circle me-2"></i>
                                    You're attending
                                </span>
                            ) : (
                                <span className="badge bg-secondary fs-5">
                                    <i className="fas fa-times-circle me-2"></i>
                                    Not attending
                                </span>
                            )}
                            <p className="text-muted mt-3 mb-0">
                                <i className="fas fa-lock me-2"></i>
                                This session is {session?.status}. Contact an admin if you need changes.
                            </p>
                        </div>
                    ) : isAttending ? (
                        <div>
                            <span className="badge bg-success fs-5 mb-3">
                                <i className="fas fa-check-circle me-2"></i>
                                You're attending
                            </span>
                            <br />
                            <button className="btn btn-outline-danger" onClick={handleCantMakeIt}>
                                <i className="fas fa-times me-2"></i>
                                Can't Make It
                            </button>
                        </div>
                    ) : (
                        <button className="btn btn-success btn-lg" onClick={handleAttend}>
                            <i className="fas fa-check me-2"></i>
                            I'm Attending
                        </button>
                    )}
                </div>
            </div>

            {/* Attending */}
            <div className="card mb-4">
                <div className="card-header bg-success text-white">
                    <i className="fas fa-check-circle me-2"></i>
                    Attending ({attending.length})
                </div>
                <div className="card-body">
                    {attending.length === 0 ? (
                        <p className="text-muted mb-0">No one has confirmed yet.</p>
                    ) : (
                        <div className="row">
                            {attending.map(a => (
                                <div key={a.user_id} className="col-md-3 col-sm-6 mb-3">
                                    <div className="card h-100 border-success">
                                        <div className="card-body d-flex align-items-center">
                                            <i className="fas fa-user-check text-success me-2"></i>
                                            {a.firstname} {a.lastname}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Not Attending */}
            {notAttending.length > 0 && (
                <div className="card mb-4">
                    <div className="card-header bg-secondary text-white">
                        <i className="fas fa-times-circle me-2"></i>
                        Can't Make It ({notAttending.length})
                    </div>
                    <div className="card-body">
                        <div className="row">
                            {notAttending.map(a => (
                                <div key={a.user_id} className="col-md-3 col-sm-6 mb-3">
                                    <div className="card h-100 border-secondary">
                                        <div className="card-body d-flex align-items-center">
                                            <i className="fas fa-user-times text-secondary me-2"></i>
                                            {a.firstname} {a.lastname}
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

export default AttendancePage;
