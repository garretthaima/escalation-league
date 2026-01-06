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

            {/* League Details Section */}
            <div className="card mb-4">
                <div className="card-header d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">League Details</h5>
                </div>
                <div className="card-body">
                    <p><strong>Name:</strong> {league.name}</p>
                    <p><strong>Description:</strong> {league.description}</p>
                    <p><strong>Current Week:</strong> {league.current_week}</p>
                    <p><strong>Weekly Budget:</strong> ${league.weekly_budget}</p>
                    <p><strong>Start Date:</strong> {new Date(league.start_date).toLocaleDateString()}</p>
                    <p><strong>End Date:</strong> {new Date(league.end_date).toLocaleDateString()}</p>
                </div>
            </div>

            {/* My Commander Section */}
            {userLeagueData && (
                <div className="card mb-4">
                    <div className="card-header d-flex justify-content-between align-items-center">
                        <h5 className="mb-0">My League Info</h5>
                        <button
                            className="btn btn-sm btn-primary"
                            onClick={() => setShowCommanderModal(true)}
                        >
                            Update
                        </button>
                    </div>
                    <div className="card-body">
                        <p><strong>Commander:</strong> {userLeagueData.current_commander || 'Not set'}</p>
                        {userLeagueData.commander_partner && (
                            <p><strong>Partner:</strong> {userLeagueData.commander_partner}</p>
                        )}
                        {userLeagueData.decklist_url && (
                            <p><strong>Decklist:</strong> <a href={userLeagueData.decklist_url} target="_blank" rel="noopener noreferrer">View Deck</a></p>
                        )}
                    </div>
                </div>
            )}

            {/* Participants Section */}
            <div className="card">
                <div className="card-header">
                    <h5 className="mb-0">Participants</h5>
                </div>
                <div className="card-body">
                    {participants.length > 0 ? (
                        <ul className="list-group">
                            {participants.map((participant) => (
                                <li key={participant.id} className="list-group-item">
                                    <Link
                                        to={`/leagues/${league.id}/profile/${participant.id}`}
                                        className="text-decoration-none"
                                    >
                                        {participant.firstname + " " + participant.lastname || participant.email} {/* Display name if available, fallback to email */}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p>No participants are currently in this league.</p>
                    )}
                </div>
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