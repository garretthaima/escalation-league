import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePermissions } from '../../context/PermissionsProvider';
import DiscordIcon from './DiscordIcon';
import './DiscordPromptBanner.css';

/**
 * Banner prompting users to link their Discord account
 * Shows on key pages when user has not linked Discord
 * Dismissible per page view - will reappear on navigation to encourage linking
 */
const DiscordPromptBanner = () => {
    const { user, loading } = usePermissions();
    const [isDismissed, setIsDismissed] = useState(false);

    const handleDismiss = () => {
        setIsDismissed(true);
    };

    // Don't show if loading, dismissed, or user already has Discord linked
    if (loading || isDismissed || !user || user.discord_id) {
        return null;
    }

    return (
        <div className="discord-prompt-banner mb-3">
            <div className="discord-prompt-content">
                <div className="discord-prompt-icon">
                    <DiscordIcon />
                </div>
                <div className="discord-prompt-text">
                    <strong>Link your Discord account</strong>
                    <span className="discord-prompt-description">
                        Get game notifications and check in via Discord reactions
                    </span>
                </div>
                <Link
                    to="/profile?tab=settings"
                    className="discord-prompt-link-btn"
                >
                    <DiscordIcon className="me-1" />
                    Link Discord
                </Link>
            </div>
            <button
                className="discord-prompt-dismiss"
                onClick={handleDismiss}
                aria-label="Dismiss"
            >
                <i className="fas fa-times"></i>
            </button>
        </div>
    );
};

export default DiscordPromptBanner;
