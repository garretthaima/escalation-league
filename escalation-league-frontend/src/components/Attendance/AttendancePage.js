import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTodaySession, checkIn, checkOut, adminCheckIn, adminCheckOut } from '../../api/attendanceApi';
import { getLeagueParticipants } from '../../api/userLeaguesApi';
import { usePermissions } from '../context/PermissionsProvider';
import { useToast } from '../context/ToastContext';
import './AttendancePage.css';

const AttendancePage = () => {
    const navigate = useNavigate();
    const { activeLeague, user, permissions } = usePermissions();
    const { showToast } = useToast();

    const [session, setSession] = useState(null);
    const [attendance, setAttendance] = useState([]);
    const [allParticipants, setAllParticipants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const leagueId = activeLeague?.league_id || activeLeague?.id;
    const isAdmin = permissions?.some(p => p.name === 'pod_manage' || p === 'pod_manage');
    const isCheckedIn = attendance.some(a => a.user_id === user?.id && a.is_active);

    const fetchData = async () => {
        if (!leagueId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError('');
        try {
            const sessionData = await getTodaySession(leagueId);
            setSession(sessionData);
            setAttendance(sessionData.attendance || []);

            // Check admin after we have permissions loaded
            const hasAdminPerm = permissions?.some(p => p.name === 'pod_manage' || p === 'pod_manage');
            if (hasAdminPerm) {
                const participants = await getLeagueParticipants(leagueId);
                setAllParticipants(participants);
            }
        } catch (err) {
            console.error('Error fetching session:', err);
            setError('Failed to load attendance data. The database tables may not exist yet.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [leagueId, permissions]);

    const handleCheckIn = async () => {
        try {
            await checkIn(session.id);
            showToast('Checked in successfully!', 'success');
            fetchData();
        } catch (err) {
            console.error('Error checking in:', err);
            showToast('Failed to check in.', 'error');
        }
    };

    const handleCheckOut = async () => {
        try {
            await checkOut(session.id);
            showToast('Checked out successfully!', 'success');
            fetchData();
        } catch (err) {
            console.error('Error checking out:', err);
            showToast('Failed to check out.', 'error');
        }
    };

    const handleAdminCheckIn = async (userId) => {
        try {
            await adminCheckIn(session.id, userId);
            showToast('Player checked in.', 'success');
            fetchData();
        } catch (err) {
            console.error('Error admin check in:', err);
            showToast('Failed to check in player.', 'error');
        }
    };

    const handleAdminCheckOut = async (userId) => {
        try {
            await adminCheckOut(session.id, userId);
            showToast('Player checked out.', 'success');
            fetchData();
        } catch (err) {
            console.error('Error admin check out:', err);
            showToast('Failed to check out player.', 'error');
        }
    };

    const activeAttendees = attendance.filter(a => a.is_active);
    const checkedOutAttendees = attendance.filter(a => !a.is_active);

    // Get participants not yet checked in (for admin to add)
    const notCheckedIn = allParticipants.filter(
        p => !attendance.some(a => a.user_id === p.user_id)
    );

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
            <div className="container mt-4 text-center">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
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
                {isAdmin && activeAttendees.length >= 4 && (
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate(`/attendance/suggest-pods/${session.id}`)}
                    >
                        <i className="fas fa-magic me-2"></i>
                        Suggest Pods
                    </button>
                )}
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            {/* Session Info */}
            <div className="card mb-4">
                <div className="card-header d-flex justify-content-between align-items-center">
                    <span>
                        <i className="fas fa-calendar-day me-2"></i>
                        {session?.name || 'Today\'s Session'}
                    </span>
                    <span className={`badge ${session?.status === 'active' ? 'bg-success' : 'bg-secondary'}`}>
                        {session?.status}
                    </span>
                </div>
                <div className="card-body">
                    <div className="row">
                        <div className="col-md-4">
                            <strong>Date:</strong> {session?.session_date ? new Date(session.session_date + 'T00:00:00').toLocaleDateString() : ''}
                        </div>
                        <div className="col-md-4">
                            <strong>League:</strong> {activeLeague?.league_name || activeLeague?.name}
                        </div>
                        <div className="col-md-4">
                            <strong>Checked In:</strong> {activeAttendees.length} players
                        </div>
                    </div>
                </div>
            </div>

            {/* User Check-in/out */}
            <div className="card mb-4">
                <div className="card-body text-center">
                    {isCheckedIn ? (
                        <div>
                            <span className="badge bg-success fs-5 mb-3">
                                <i className="fas fa-check-circle me-2"></i>
                                You are checked in
                            </span>
                            <br />
                            <button className="btn btn-outline-danger" onClick={handleCheckOut}>
                                <i className="fas fa-sign-out-alt me-2"></i>
                                Check Out
                            </button>
                        </div>
                    ) : (
                        <button className="btn btn-success btn-lg" onClick={handleCheckIn}>
                            <i className="fas fa-sign-in-alt me-2"></i>
                            Check In
                        </button>
                    )}
                </div>
            </div>

            {/* Active Attendees */}
            <div className="card mb-4">
                <div className="card-header">
                    <i className="fas fa-users me-2"></i>
                    Checked In ({activeAttendees.length})
                </div>
                <div className="card-body">
                    {activeAttendees.length === 0 ? (
                        <p className="text-muted mb-0">No players checked in yet.</p>
                    ) : (
                        <div className="row">
                            {activeAttendees.map(a => (
                                <div key={a.user_id} className="col-md-3 col-sm-6 mb-3">
                                    <div className="card h-100 border-success">
                                        <div className="card-body d-flex justify-content-between align-items-center">
                                            <div>
                                                <i className="fas fa-user-check text-success me-2"></i>
                                                {a.firstname} {a.lastname}
                                            </div>
                                            {isAdmin && a.user_id !== user?.id && (
                                                <button
                                                    className="btn btn-sm btn-outline-danger"
                                                    onClick={() => handleAdminCheckOut(a.user_id)}
                                                    title="Remove"
                                                >
                                                    <i className="fas fa-times"></i>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Admin: Add Players */}
            {isAdmin && notCheckedIn.length > 0 && (
                <div className="card mb-4">
                    <div className="card-header">
                        <i className="fas fa-user-plus me-2"></i>
                        Add Players ({notCheckedIn.length} available)
                    </div>
                    <div className="card-body">
                        <div className="row">
                            {notCheckedIn.map(p => (
                                <div key={p.user_id} className="col-md-3 col-sm-6 mb-3">
                                    <div className="card h-100">
                                        <div className="card-body d-flex justify-content-between align-items-center">
                                            <span>{p.firstname} {p.lastname}</span>
                                            <button
                                                className="btn btn-sm btn-success"
                                                onClick={() => handleAdminCheckIn(p.user_id)}
                                                title="Check In"
                                            >
                                                <i className="fas fa-plus"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Checked Out */}
            {checkedOutAttendees.length > 0 && (
                <div className="card mb-4">
                    <div className="card-header text-muted">
                        <i className="fas fa-user-minus me-2"></i>
                        Previously Checked Out ({checkedOutAttendees.length})
                    </div>
                    <div className="card-body">
                        <div className="row">
                            {checkedOutAttendees.map(a => (
                                <div key={a.user_id} className="col-md-3 col-sm-6 mb-2">
                                    <span className="text-muted">
                                        <i className="fas fa-user-times me-2"></i>
                                        {a.firstname} {a.lastname}
                                    </span>
                                    {isAdmin && (
                                        <button
                                            className="btn btn-sm btn-outline-success ms-2"
                                            onClick={() => handleAdminCheckIn(a.user_id)}
                                            title="Re-check in"
                                        >
                                            <i className="fas fa-undo"></i>
                                        </button>
                                    )}
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
