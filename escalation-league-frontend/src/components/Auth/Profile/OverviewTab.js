import React from 'react';

const OverviewTab = ({ user }) => {
    return (
        <div>
            <div className="mb-3">
                <strong>Name:</strong> {user.firstname || 'N/A'} {user.lastname || 'N/A'}
            </div>
            <div className="mb-3">
                <strong>Email:</strong> {user.email}
            </div>
        </div>
    );
};

export default OverviewTab;