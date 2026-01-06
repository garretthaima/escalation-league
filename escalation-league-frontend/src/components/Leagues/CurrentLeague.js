import React, { useEffect, useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { getLeagueDetails } from '../../api/leaguesApi';
import { getLeagueParticipants, getUserLeagueStats } from '../../api/userLeaguesApi';
import UpdateCommanderModal from './UpdateCommanderModal';

const CurrentLeague = () => {
    const { activeLeague } = useOutletContext();
    const [league, setLeague] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [userLeagueData, setUserLeagueData] = useState(null);
    const [showCommanderModal, setShowCommanderModal] = useState(false);
    const [activeTab, setActiveTab] = useState('details');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchLeagueDetails = async () => {
            if (!activeLeague) return;

            try {
                const leagueDetails = await getLeagueDetails(activeLeague.league_id);
                setLeague(leagueDetails);

                // Fetch participants in the league
                const participantsData = await getLeagueParticipants(activeLeague.league_id);
                setParticipants(participantsData);

                // Fetch user's league data (including commander)
                const userData = await getUserLeagueStats(activeLeague.league_id);
                setUserLeagueData(userData);
            } catch (err) {
                console.error('Error fetching league details or participants:', err);
                setError('Failed to fetch league details or participants.');
            } finally {
                setLoading(false);
            }
        };

        fetchLeagueDetails();
    }, [activeLeague]);

    if (loading) {
        return <div className="text-center mt-5">Loading...</div>;
    }

    if (error) {
        return <div className="alert alert-danger text-center">{error}</div>;
    }

    if (!league) {
        return (
            <div className="alert alert-warning text-center mt-4">
                No league information available.
            </div>
        );
    }

    return (
        <div className="container mt-4">
            <h2 className="mb-4">Current League</h2>

            {/* Navigation Tabs */}
            <ul className="nav nav-tabs mb-4" role="tablist">
                <li className="nav-item" role="presentation">
                    <button
                        className={`nav-link ${activeTab === 'details' ? 'active' : ''}`}
                        onClick={() => setActiveTab('details')}
                        type="button"
                    >
                        League Details
                    </button>
                </li>
                <li className="nav-item" role="presentation">
                    <button
                        className={`nav-link ${activeTab === 'myinfo' ? 'active' : ''}`}
                        onClick={() => setActiveTab('myinfo')}
                        type="button"
                    >
                        My League Info
                    </button>
                </li>
                <li className="nav-item" role="presentation">
                    <button
                        className={`nav-link ${activeTab === 'participants' ? 'active' : ''}`}
                        onClick={() => setActiveTab('participants')}
                        type="button"
                    >
                        Participants
                    </button>
                </li>
            </ul>

            {/* Tab Content */}
            <div className="tab-content">
                {/* League Details Tab */}
                {activeTab === 'details' && (
                    <div className="card">
                        <div className="card-body">
                            <p><strong>Name:</strong> {league.name}</p>
                            <p><strong>Description:</strong> {league.description}</p>
                            <p><strong>Current Week:</strong> {league.current_week}</p>
                            <p><strong>Weekly Budget:</strong> ${league.weekly_budget}</p>
                            <p><strong>Start Date:</strong> {new Date(league.start_date).toLocaleDateString()}</p>
                            <p><strong>End Date:</strong> {new Date(league.end_date).toLocaleDateString()}</p>
                        </div>
                    </div>
                )}

                {/* My League Info Tab */}
                {activeTab === 'myinfo' && userLeagueData && (
                    <div className="card">
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h5 className="mb-0">Commander & Deck</h5>
                                <button
                                    className="btn btn-sm btn-primary"
                                    onClick={() => setShowCommanderModal(true)}
                                >
                                    <i className="fas fa-edit me-1"></i>
                                    Update
                                </button>
                            </div>
                            <p><strong>Commander:</strong> {userLeagueData.current_commander || 'Not set'}</p>
                            {userLeagueData.commander_partner && (
                                <p><strong>Partner:</strong> {userLeagueData.commander_partner}</p>
                            )}
                            {userLeagueData.decklist_url && (
                                <p><strong>Decklist:</strong> <a href={userLeagueData.decklist_url} target="_blank" rel="noopener noreferrer">View Deck</a></p>
                            )}
                            <hr />
                            <h5>League Record</h5>
                            <p><strong>Total Points:</strong> {userLeagueData.total_points || 0}</p>
                            <p><strong>Wins:</strong> {userLeagueData.league_wins || 0}</p>
                            <p><strong>Losses:</strong> {userLeagueData.league_losses || 0}</p>
                        </div>
                    </div>
                )}

                {/* Participants Tab */}
                {activeTab === 'participants' && (
                    <div className="card">
                        <div className="card-body">
                            <p className="mb-3 text-secondary">{participants.length} player{participants.length !== 1 ? 's' : ''} in this league</p>
                            {participants.length > 0 ? (
                                <ul className="list-group">
                                    {participants.map((participant) => (
                                        <li key={participant.user_id} className="list-group-item d-flex justify-content-between align-items-center">
                                            <Link
                                                to={`/leagues/${league.id}/profile/${participant.user_id}`}
                                                className="text-decoration-none"
                                            >
                                                {participant.firstname + " " + participant.lastname}
                                            </Link>
                                            <div>
                                                <span className="badge bg-primary me-2">{participant.total_points || 0} pts</span>
                                                <span className="badge bg-success me-2">{participant.league_wins || 0}W</span>
                                                <span className="badge bg-danger">{participant.league_losses || 0}L</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-muted">No participants are currently in this league.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <UpdateCommanderModal
                show={showCommanderModal}
                onHide={() => setShowCommanderModal(false)}
                leagueId={activeLeague?.league_id}
                currentCommander={userLeagueData?.current_commander}
                currentPartner={userLeagueData?.commander_partner}
                currentDeckUrl={userLeagueData?.decklist_url}
            />
        </div>
    );
};

export default CurrentLeague;