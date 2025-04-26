import React, { useState } from 'react';
import { createLeague } from '../api/api';

const CreateLeague = () => {
    const [name, setName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [message, setMessage] = useState('');

    const handleCreateLeague = async (e) => {
        e.preventDefault();
        try {
            const response = await createLeague({ name, startDate, endDate });
            setMessage(response.message);
            setName('');
            setStartDate('');
            setEndDate('');
        } catch (error) {
            setMessage('Error creating league.');
        }
    };

    return (
        <div className="container mt-4">
            <h2 className="mb-4">Create New League</h2>
            <form onSubmit={handleCreateLeague} className="needs-validation">
                <div className="mb-3">
                    <label htmlFor="leagueName" className="form-label">League Name</label>
                    <input
                        type="text"
                        id="leagueName"
                        className="form-control"
                        placeholder="Enter league name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                </div>
                <div className="mb-3">
                    <label htmlFor="startDate" className="form-label">Start Date</label>
                    <input
                        type="date"
                        id="startDate"
                        className="form-control"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        required
                    />
                </div>
                <div className="mb-3">
                    <label htmlFor="endDate" className="form-label">End Date</label>
                    <input
                        type="date"
                        id="endDate"
                        className="form-control"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        required
                    />
                </div>
                <button type="submit" className="btn btn-primary">Create League</button>
            </form>
            {message && <div className="alert alert-info mt-3">{message}</div>}
        </div>
    );
};

export default CreateLeague;