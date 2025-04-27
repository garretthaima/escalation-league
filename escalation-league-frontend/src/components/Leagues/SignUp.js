import React, { useState, useEffect } from 'react';
import { getLeagues, setActiveLeague, getActiveLeague } from '../../api/leaguesApi';

const SignUp = ({ user }) => {
    const [leagues, setLeagues] = useState([]);
    const [selectedLeague, setSelectedLeague] = useState('');
    const [activeLeague, setActiveLeagueState] = useState(null);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const fetchLeagues = async () => {
            try {
                const leaguesData = await getLeagues();
                setLeagues(leaguesData.filter((league) => league.is_active));
            } catch (error) {
                console.error('Error fetching leagues:', error);
            }
        };

        const fetchActiveLeague = async () => {
            try {
                const activeLeagueData = await getActiveLeague();
                setActiveLeagueState(activeLeagueData);
            } catch (error) {
                console.error('Error fetching active league:', error);
            }
        };

        fetchLeagues();
        fetchActiveLeague();
    }, []);

    const handleSignUp = async (e) => {
        e.preventDefault();
        try {
            const response = await setActiveLeague(selectedLeague);
            setMessage(response.message || 'Successfully signed up for the league!');
            setActiveLeagueState({ id: selectedLeague }); // Update the active league state
        } catch (error) {
            setMessage('Error signing up for the league.');
        }
    };

    // If the user is already in a league, display a message instead of the sign-up form
    if (activeLeague) {
        return (
            <div className="container mt-4">
                <h2 className="mb-4">Sign Up for a League</h2>
                <p>You are already signed up for a league: <strong>{activeLeague.name || 'Current League'}</strong>.</p>
            </div>
        );
    }

    return (
        <div className="container mt-4">
            <h2 className="mb-4">Sign Up for a League</h2>
            <form onSubmit={handleSignUp}>
                <div className="mb-3">
                    <label htmlFor="league" className="form-label">Select a League</label>
                    <select
                        id="league"
                        className="form-select"
                        value={selectedLeague}
                        onChange={(e) => setSelectedLeague(e.target.value)}
                        required
                    >
                        <option value="">Choose a league</option>
                        {leagues.map((league) => (
                            <option key={league.id} value={league.id}>
                                {league.name}
                            </option>
                        ))}
                    </select>
                </div>
                <button type="submit" className="btn btn-primary">Sign Up</button>
            </form>
            {message && <p className="mt-3">{message}</p>}
        </div>
    );
};

export default SignUp;