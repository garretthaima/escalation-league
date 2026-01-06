import React, { useEffect, useState } from 'react';
import { getPods } from '../../api/podsApi'; // Use the unified getPods function
import LeagueModal from './LeagueModal';

const PodAdminPage = () => {
    const [leagues, setLeagues] = useState([]);
    const [selectedLeague, setSelectedLeague] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Fetch leagues and group pods by league
    const fetchLeagues = async () => {
        setLoading(true);
        setError('');
        try {
            const pods = await getPods(); // Fetch all pods
            const groupedLeagues = pods.reduce((acc, pod) => {
                const leagueId = pod.league_id;
                if (!acc[leagueId]) {
                    acc[leagueId] = {
                        leagueId,
                        leagueName: pod.league_name || `League #${leagueId}`,
                        pods: []
                    };
                }
                acc[leagueId].pods.push(pod);
                return acc;
            }, {});
            setLeagues(Object.values(groupedLeagues));
        } catch (err) {
            console.error('Error fetching leagues:', err.message);
            setError('Failed to fetch leagues.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeagues();
    }, []);

    const handleOpenLeagueModal = (league) => {
        setSelectedLeague(league); // Set the selected league
    };

    const handleCloseLeagueModal = () => {
        setSelectedLeague(null); // Clear the selected league
    };

    return (
        <div className="container mt-4">
            <h2>Pods Administration</h2>
            {loading && <p>Loading leagues...</p>}
            {error && <p className="text-danger">{error}</p>}

            <div className="mt-4">
                {leagues.map((league) => (
                    <div key={league.leagueId} className="mb-3">
                        <h3>{league.leagueName}</h3>
                        <button
                            className="btn btn-primary"
                            onClick={() => handleOpenLeagueModal(league)}
                        >
                            View Pods
                        </button>
                    </div>
                ))}
            </div>

            {/* Render the LeagueModal if a league is selected */}
            {selectedLeague && (
                <LeagueModal
                    league={selectedLeague}
                    onClose={handleCloseLeagueModal}
                />
            )}
        </div>
    );
};

export default PodAdminPage;