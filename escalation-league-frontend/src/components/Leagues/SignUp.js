import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLeagues, requestSignupForLeague, isUserInLeague, } from '../../api/leaguesApi';
import { usePermissions } from '../context/PermissionsProvider';
import { getUserPendingSignupRequests } from '../../api/userLeaguesApi';

const SignUp = () => {
    const [leagues, setLeagues] = useState([]);
    const [selectedLeague, setSelectedLeague] = useState('');
    const [activeLeague, setActiveLeague] = useState(null);
    const [pendingRequest, setPendingRequest] = useState(false); // Track if there is a pending request
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false); // Track if a request is pending
    const navigate = useNavigate();

    useEffect(() => {
        const fetchLeagues = async () => {
            try {
                const leaguesData = await getLeagues();
                setLeagues(leaguesData.filter((league) => league.is_active));
            } catch (error) {
                console.error('Error fetching leagues:', error);
            }
        };

        const checkUserInLeague = async () => {
            try {
                const { inLeague, league } = await isUserInLeague();
                if (inLeague) {
                    setActiveLeague(league);
                }
            } catch (error) {
                if (error.response && error.response.status === 404) {
                    console.warn('User is not part of any league.');
                    setActiveLeague(null);
                } else {
                    console.error('Error checking league membership:', error);
                }
            }
        };

        const checkPendingRequests = async () => {
            try {
                const pendingRequests = await getUserPendingSignupRequests();
                if (pendingRequests.length > 0) {
                    setPendingRequest(true); // Mark as pending if there are any pending requests
                } else {
                    setPendingRequest(false); // No pending requests
                }
            } catch (error) {
                console.error('Error checking pending signup requests:', error);
            }
        };

        const initialize = async () => {
            setLoading(true);
            await Promise.all([fetchLeagues(), checkUserInLeague(), checkPendingRequests()]);
            setLoading(false);
        };

        initialize();
    }, []);

    const handleSignUp = async (e) => {
        e.preventDefault();
        setIsSubmitting(true); // Disable the button during the request
        setMessage(''); // Clear any previous messages
        try {
            const response = await requestSignupForLeague(selectedLeague);
            setMessage(response.message || 'Successfully signed up for the league!');
            setPendingRequest(true); // Mark as pending request
        } catch (error) {
            setMessage('Error signing up for the league.');
            console.error('Error signing up for the league:', error);
        } finally {
            setIsSubmitting(false); // Re-enable the button
        }
    };

    // Redirect to CurrentLeague page if the user is already in a league
    useEffect(() => {
        if (activeLeague) {
            navigate('/current-league'); // Redirect to the CurrentLeague page
        }
    }, [activeLeague, navigate]);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (pendingRequest) {
        return (
            <div className="container mt-4">
                <h2 className="mb-4">Sign Up for a League</h2>
                <p className="text-warning">
                    You already have a pending signup request. Please wait for it to be approved.
                </p>
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
                        disabled={isSubmitting} // Disable the dropdown during submission
                    >
                        <option value="">Choose a league</option>
                        {leagues.map((league) => (
                            <option key={league.id} value={league.id}>
                                {league.name}
                            </option>
                        ))}
                    </select>
                </div>
                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSubmitting || !selectedLeague} // Disable if no league is selected or during submission
                >
                    {isSubmitting ? 'Signing Up...' : 'Sign Up'}
                </button>
            </form>
            {message && <p className="mt-3">{message}</p>}
        </div>
    );
};

export default SignUp;