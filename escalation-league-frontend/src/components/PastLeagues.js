import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getLeagues } from '../api/api';

const PastLeagues = () => {
    const [pastLeagues, setPastLeagues] = useState([]);

    useEffect(() => {
        const fetchLeagues = async () => {
            try {
                const data = await getLeagues();
                setPastLeagues(data.filter((league) => !league.is_active));
            } catch (error) {
                console.error('Error fetching past leagues:', error);
            }
        };

        fetchLeagues();
    }, []);

    return (
        <div className="container mt-4">
            <h2 className="mb-4">Past Leagues</h2>
            {pastLeagues.length === 0 ? (
                <p className="text-muted">No past leagues available.</p>
            ) : (
                <table className="table table-striped">
                    <thead className="table-dark">
                        <tr>
                            <th>Name</th>
                            <th>Start Date</th>
                            <th>End Date</th>
                            <th>Total Money</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pastLeagues.map((league) => (
                            <tr key={league.id}>
                                <td>{league.name}</td>
                                <td>{league.start_date}</td>
                                <td>{league.end_date}</td>
                                <td>${league.money_accumulated}</td>
                                <td>
                                    <Link to={`/leagues/${league.id}`} className="btn btn-primary btn-sm">
                                        View
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default PastLeagues;