import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getLeagueParticipantsDetails, isUserInLeague } from '../../../api/userLeaguesApi';
import { getUserSummary } from '../../../api/usersApi';

const PublicProfile = () => {
    const { userId } = useParams();
    const [profile, setProfile] = useState(null);
    const [leagueDetails, setLeagueDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProfileData = async () => {
            try {
                // Fetch basic user profile using getUserSummary
                const userProfile = await getUserSummary(userId);
                setProfile(userProfile);
                console.log('User Profile:', userProfile);

                // Check if the user is in a league
                const leagueInfo = await isUserInLeague(userId);
                console.log('League Info:', leagueInfo);
                if (leagueInfo && leagueInfo.inLeague && leagueInfo.league?.league_id) {
                    console.log('User is in league with ID:', leagueInfo.league.league_id);
                    const leagueData = await getLeagueParticipantsDetails(leagueInfo.league.league_id, userId);
                    setLeagueDetails(leagueData);
                } else {
                    console.log('User is not in any league.');
                }
            } catch (err) {
                console.error('Error fetching profile data:', err);
                setError('Failed to fetch profile data.');
            } finally {
                setLoading(false);
            }
        };

        fetchProfileData();
    }, [userId]);

    if (loading) {
        return <div className="text-center mt-5">Loading...</div>;
    }

    if (error) {
        return <div className="alert alert-danger text-center">{error}</div>;
    }

    if (!profile) {
        return (
            <div className="alert alert-warning text-center mt-4">
                Profile not available.
            </div>
        );
    }

    return (
        <div className="container mt-4">
            <h2 className="mb-4">{profile.firstname} {profile.lastname}</h2>

            <div className="card mb-4">
                <div className="card-header">
                    <h5 className="mb-0">Profile</h5>
                </div>
                <div className="card-body">
                    {leagueDetails ? (
                        <>
                            <p><strong>Joined At:</strong> {new Date(leagueDetails.joined_at).toLocaleDateString()}</p>
                            <p><strong>Commander:</strong> {leagueDetails.commander}</p>
                            {leagueDetails.commanderPartner && (
                                <p><strong>Commander Partner:</strong> {leagueDetails.commanderPartner}</p>
                            )}
                            <p><strong>Decklist:</strong> <a href={leagueDetails.decklist_url} target="_blank" rel="noopener noreferrer">View Decklist</a></p>
                        </>
                    ) : (
                        <p>No league details available.</p>
                    )}
                </div>
            </div>

            {/* Wins Statistics Section */}
            <div className="card mb-4">
                <div className="card-header">
                    <h5 className="mb-0">Win Statistics</h5>
                </div>
                <div className="card-body">
                    <p><strong>Wins:</strong> {profile.wins}</p>
                    <p><strong>Losses:</strong> {profile.losses}</p>
                    <p><strong>Winning Streak:</strong> {profile.winning_streak}</p>
                    <p><strong>Losing Streak:</strong> {profile.losing_streak}</p>
                    <p><strong>Opponent Win Percentage:</strong> {profile.opponent_win_percentage}%</p>
                    <p><strong>Most Common Win Condition:</strong> {profile.most_common_win_condition || 'N/A'}</p>
                    <p><strong>Favorite Color:</strong> {profile.favorite_color || 'N/A'}</p>
                    <p><strong>Deck Archetype:</strong> {profile.deck_archetype || 'N/A'}</p>
                </div>
            </div>
        </div>
    );
};

export default PublicProfile;