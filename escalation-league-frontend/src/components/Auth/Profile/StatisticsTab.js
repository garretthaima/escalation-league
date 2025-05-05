import React from 'react';

const StatisticsTab = ({ user }) => {
    return (
        <div>
            <h4>Deck Statistics</h4>
            <div className="mb-3">
                <strong>Most Played Deck:</strong> {user.most_common_win_condition || 'N/A'}
            </div>
            <div className="mb-3">
                <strong>Favorite Commander:</strong> {user.current_commander || 'N/A'}
            </div>
            <div className="mb-3">
                <strong>Past Commanders:</strong> {user.past_commanders?.join(', ') || 'N/A'}
            </div>
            <div className="mb-3">
                <strong>Win Rate:</strong> {user.opponent_win_percentage || '0.00'}%
            </div>
        </div>
    );
};

export default StatisticsTab;