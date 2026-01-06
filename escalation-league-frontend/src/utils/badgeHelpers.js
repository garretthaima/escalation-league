import React from 'react';

// Pod status badges - grayscale
export const getPodStatusBadge = (status) => {
    const badges = {
        open: { color: '#adb5bd', text: 'Open', icon: 'fa-door-open' },
        active: { color: '#495057', text: 'Active', icon: 'fa-play-circle' },
        pending: { color: '#6c757d', text: 'Pending', icon: 'fa-clock' },
        complete: { color: '#343a40', text: 'Complete', icon: 'fa-check-circle' }
    };
    const badge = badges[status] || { color: '#dee2e6', text: status, icon: 'fa-question-circle' };

    return (
        <span className="badge" style={{ backgroundColor: badge.color, color: 'white' }}>
            <i className={`fas ${badge.icon} me-1`}></i>
            {badge.text}
        </span>
    );
};

// Game result badges - grayscale
export const getResultBadge = (result) => {
    const badges = {
        win: { color: '#343a40', text: 'Win', icon: 'fa-trophy' },
        loss: { color: '#6c757d', text: 'Loss', icon: 'fa-times-circle' },
        draw: { color: '#adb5bd', text: 'Draw', icon: 'fa-handshake' }
    };
    const badge = badges[result] || { color: '#dee2e6', text: result, icon: 'fa-question' };

    return (
        <span className="badge" style={{ backgroundColor: badge.color, color: 'white' }}>
            <i className={`fas ${badge.icon} me-1`}></i>
            {badge.text}
        </span>
    );
};

// League status badges - grayscale
export const getLeagueStatusBadge = (isActive) => {
    return isActive ? (
        <span className="badge" style={{ backgroundColor: '#495057', color: 'white' }}>
            <i className="fas fa-circle me-1"></i>
            Active
        </span>
    ) : (
        <span className="badge" style={{ backgroundColor: '#adb5bd', color: 'white' }}>
            <i className="fas fa-pause-circle me-1"></i>
            Inactive
        </span>
    );
};

// User status badges - grayscale
export const getUserStatusBadge = (user) => {
    if (user.is_banned) {
        return (
            <span className="badge" style={{ backgroundColor: '#343a40', color: 'white' }}>
                <i className="fas fa-ban me-1"></i>
                Banned
            </span>
        );
    }
    if (!user.is_active) {
        return (
            <span className="badge" style={{ backgroundColor: '#6c757d', color: 'white' }}>
                <i className="fas fa-exclamation-triangle me-1"></i>
                Inactive
            </span>
        );
    }
    return (
        <span className="badge" style={{ backgroundColor: '#495057', color: 'white' }}>
            <i className="fas fa-check-circle me-1"></i>
            Active
        </span>
    );
};

// Confirmation status - grayscale
export const getConfirmationBadge = (confirmed) => {
    return confirmed ? (
        <span className="badge" style={{ backgroundColor: '#495057', color: 'white' }}>
            <i className="fas fa-check me-1"></i>
            Confirmed
        </span>
    ) : (
        <span className="badge" style={{ backgroundColor: '#adb5bd', color: 'white' }}>
            <i className="fas fa-clock me-1"></i>
            Pending
        </span>
    );
};
