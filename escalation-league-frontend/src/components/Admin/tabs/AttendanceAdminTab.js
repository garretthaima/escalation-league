import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLeagueSessions, createSession } from '../../../api/attendanceApi';
import { usePermissions } from '../../../context/PermissionsProvider';
import { useToast } from '../../../context/ToastContext';
import './AttendanceAdminTab.css';

const AttendanceAdminTab = ({ leagueId: propLeagueId }) => {
    const navigate = useNavigate();
    const { activeLeague } = usePermissions();
    const { showToast } = useToast();

    // Use propLeagueId if provided, otherwise fall back to activeLeague
    const leagueId = propLeagueId || activeLeague?.league_id || activeLeague?.id;

    // State
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Create Session Modal state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newSessionDate, setNewSessionDate] = useState('');
    const [newSessionName, setNewSessionName] = useState('');
    const [creatingSession, setCreatingSession] = useState(false);

    // Fetch sessions
    const fetchSessions = useCallback(async () => {
        if (!leagueId) return;

        try {
            setLoading(true);
            const sessionsData = await getLeagueSessions(leagueId);
            setSessions(sessionsData);
        } catch (err) {
            console.error('Error fetching sessions:', err);
            setError('Failed to load sessions.');
        } finally {
            setLoading(false);
        }
    }, [leagueId]);

    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    // Handlers
    const handleCreateSession = async (e) => {
        e.preventDefault();
        if (!newSessionDate || !leagueId) return;

        setCreatingSession(true);
        try {
            await createSession({
                league_id: leagueId,
                session_date: newSessionDate,
                name: newSessionName || null
            });
            showToast('Session created!', 'success');
            setShowCreateModal(false);
            setNewSessionDate('');
            setNewSessionName('');
            fetchSessions();
        } catch (err) {
            const message = err.response?.data?.error || 'Failed to create session.';
            showToast(message, 'error');
        } finally {
            setCreatingSession(false);
        }
    };

    const handleSessionClick = (session) => {
        navigate(`/admin/leagues/${leagueId}/sessions/${session.id}`);
    };

    // Helpers
    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'active': return 'bg-success';
            case 'locked': return 'bg-warning text-dark';
            case 'completed': return 'bg-secondary';
            default: return 'bg-info';
        }
    };

    const formatSessionDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            timeZone: 'UTC'
        });
    };

    // Stats
    const activeSessions = sessions.filter(s => s.status === 'active').length;
    const lockedSessions = sessions.filter(s => s.status === 'locked').length;
    const completedSessions = sessions.filter(s => s.status === 'completed').length;

    // Render
    if (!leagueId) {
        return (
            <div className="alert alert-warning">
                <i className="fas fa-exclamation-triangle me-2"></i>
                Please select a league to manage attendance.
            </div>
        );
    }

    if (loading) {
        return (
            <div className="text-center py-5">
                <div className="spinner-border" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return <div className="alert alert-danger">{error}</div>;
    }

    return (
        <div className="attendance-admin-tab">
            {/* Header with Create Button */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <span className="badge bg-success me-2">{activeSessions} active</span>
                    <span className="badge bg-warning text-dark me-2">{lockedSessions} locked</span>
                    <span className="badge bg-secondary">{completedSessions} completed</span>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowCreateModal(true)}
                >
                    <i className="fas fa-plus me-2"></i>
                    Create Session
                </button>
            </div>

            {/* Sessions Table */}
            {sessions.length === 0 ? (
                <div className="text-center py-5">
                    <i className="fas fa-calendar-plus fa-3x text-muted mb-3"></i>
                    <h5 className="text-muted">No Sessions Yet</h5>
                    <p className="text-muted mb-3">Create your first session to start tracking attendance.</p>
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowCreateModal(true)}
                    >
                        <i className="fas fa-plus me-2"></i>
                        Create Session
                    </button>
                </div>
            ) : (
                <div className="table-responsive">
                    <table className="table table-hover sessions-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Name</th>
                                <th className="text-center">Status</th>
                                <th className="text-center"><span className="d-none d-sm-inline">Attending</span><span className="d-sm-none">#</span></th>
                                <th className="text-center">Discord Poll</th>
                                <th className="text-end">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sessions.map(session => (
                                <tr
                                    key={session.id}
                                    className={session.status === 'completed' ? 'table-secondary' : ''}
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => handleSessionClick(session)}
                                >
                                    <td>
                                        <strong>{formatSessionDate(session.session_date)}</strong>
                                    </td>
                                    <td>{session.name || 'Game Night'}</td>
                                    <td className="text-center">
                                        <span className={`badge ${getStatusBadgeClass(session.status)}`}>
                                            {session.status === 'locked' && <i className="fas fa-lock me-1"></i>}
                                            {session.status}
                                        </span>
                                    </td>
                                    <td className="text-center">
                                        <span className="fw-bold text-success">
                                            {session.attending_count || 0}
                                        </span>
                                        <span className="text-muted"> / {session.total_responses || 0}</span>
                                    </td>
                                    <td className="text-center">
                                        {session.has_active_poll ? (
                                            <span className="badge bg-primary">Active</span>
                                        ) : session.poll_message_id ? (
                                            <span className="badge bg-secondary">Closed</span>
                                        ) : (
                                            <span className="text-muted">-</span>
                                        )}
                                    </td>
                                    <td className="text-end">
                                        <button
                                            className="btn btn-sm btn-outline-primary"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSessionClick(session);
                                            }}
                                            title="Manage Session"
                                        >
                                            <i className="fas fa-cog"></i>
                                            <span className="manage-btn-text ms-1">Manage</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create Session Modal */}
            {showCreateModal && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    <i className="fas fa-calendar-plus me-2"></i>
                                    Create Session
                                </h5>
                                <button type="button" className="btn-close" onClick={() => setShowCreateModal(false)}></button>
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
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary" disabled={creatingSession || !newSessionDate}>
                                        {creatingSession ? 'Creating...' : 'Create'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttendanceAdminTab;
