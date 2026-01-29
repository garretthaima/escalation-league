import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createLeague } from '../../api/leaguesApi';
import { useToast } from '../../context/ToastContext';
import { parseDate, formatDateISO } from '../../utils/dateFormatter';

const CreateLeaguePage = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [newLeague, setNewLeague] = useState({
        name: '',
        start_date: '',
        number_of_weeks: '', // New field for number of weeks
        description: '',
        max_players: '',
        weekly_budget: '',
        league_code: '',
    });

    const handleCreateLeague = async (e) => {
        e.preventDefault();

        // Calculate the end date based on the start date and number of weeks
        const startDate = parseDate(newLeague.start_date);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + newLeague.number_of_weeks * 7); // Add weeks to the start date

        try {
            await createLeague({
                ...newLeague,
                end_date: formatDateISO(endDate), // Format as YYYY-MM-DD
            });
            showToast('League created successfully!', 'success');
            navigate('/admin/leagues'); // Redirect back to the League Admin page
        } catch (err) {
            showToast('Failed to create league. Please try again.', 'error');
        }
    };

    return (
        <div className="container mt-4">
            <h2>Create League</h2>
            <form onSubmit={handleCreateLeague} className="mb-4">
                <div className="form-group">
                    <label>Name</label>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Name"
                        value={newLeague.name}
                        onChange={(e) => setNewLeague({ ...newLeague, name: e.target.value })}
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Start Date</label>
                    <input
                        type="date"
                        className="form-control"
                        value={newLeague.start_date}
                        onChange={(e) => setNewLeague({ ...newLeague, start_date: e.target.value })}
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Number of Weeks</label>
                    <input
                        type="number"
                        className="form-control"
                        placeholder="Number of Weeks"
                        value={newLeague.number_of_weeks}
                        onChange={(e) =>
                            setNewLeague({ ...newLeague, number_of_weeks: e.target.value })
                        }
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Description</label>
                    <textarea
                        className="form-control"
                        placeholder="Description"
                        value={newLeague.description}
                        onChange={(e) => setNewLeague({ ...newLeague, description: e.target.value })}
                    />
                </div>
                <div className="form-group">
                    <label>Max Players</label>
                    <input
                        type="number"
                        className="form-control"
                        placeholder="Max Players"
                        value={newLeague.max_players}
                        onChange={(e) => setNewLeague({ ...newLeague, max_players: e.target.value })}
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Weekly Budget</label>
                    <input
                        type="number"
                        className="form-control"
                        placeholder="Weekly Budget"
                        value={newLeague.weekly_budget}
                        onChange={(e) => setNewLeague({ ...newLeague, weekly_budget: e.target.value })}
                        required
                    />
                </div>
                <div className="form-group">
                    <label>League Code</label>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="League Code"
                        value={newLeague.league_code}
                        onChange={(e) => setNewLeague({ ...newLeague, league_code: e.target.value })}
                        required
                    />
                </div>
                <button type="submit" className="btn btn-primary">
                    Create League
                </button>
                <button
                    type="button"
                    className="btn btn-secondary ml-2"
                    onClick={() => navigate('/admin/leagues')}
                >
                    Cancel
                </button>
            </form>
        </div>
    );
};

export default CreateLeaguePage;