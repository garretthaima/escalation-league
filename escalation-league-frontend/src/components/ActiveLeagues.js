import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getLeagues, setActiveLeague } from '../api/api';

const ActiveLeagues = () => {
    const [activeLeagues, setActiveLeagues] = useState([]);

    useEffect(() => {
        const fetchLeagues = async () => {
            try {
                const data = await getLeagues();
                setActiveLeagues(data.filter((league) => league.is_active));
            } catch (error) {
                console.error('Error fetching active leagues:', error);
            }
        };

        fetchLeagues();
    }, []);

    const handleSetActiveLeague = async (leagueId) => {
        try {
            await setActiveLeague({ leagueId });
            alert('League set as active!');
            window.location.reload(); // Reload to reflect changes
        } catch (error) {
            console.error('Error setting active league:', error);
        }
    };

    return (
        <div className="container mt-4">
            <h2 className="mb-4">Active Leagues</h2>
            <table className="table table-striped">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Start Date</th>
                        <th>End Date</th>
                        <th>Current Week</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {activeLeagues.map((league) => (
                        <tr key={league.id}>
                            <td>{league.name}</td>
                            <td>{league.start_date}</td>
                            <td>{league.end_date}</td>
                            <td>{league.current_week}</td>
                            <td>
                                <Link to={`/leagues/${league.id}`} className="btn btn-primary btn-sm me-2">
                                    View
                                </Link>
                                {!league.is_active && (
                                    <button
                                        className="btn btn-success btn-sm"
                                        onClick={() => handleSetActiveLeague(league.id)}
                                    >
                                        Set Active
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ActiveLeagues;