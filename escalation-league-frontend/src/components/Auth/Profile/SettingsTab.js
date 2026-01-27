import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { updateUserProfile, getDiscordAuthUrl, getDiscordStatus, unlinkDiscord } from '../../../api/usersApi';
import { useToast } from '../../../context/ToastContext';
import { DiscordIcon, GoogleIcon, ConfirmModal } from '../../Shared';

const SettingsTab = ({ user, handlePictureUpdate }) => {
    const stockImages = [
        '/images/profile-pictures/avatar1.png',
        '/images/profile-pictures/avatar2.png',
        '/images/profile-pictures/avatar3.png',
        '/images/profile-pictures/avatar4.png',
        '/images/profile-pictures/avatar5.png',
    ];

    const [selectedPicture, setSelectedPicture] = useState(user.picture || stockImages[0]);
    const [firstname, setFirstname] = useState(user.firstname || '');
    const [lastname, setLastname] = useState(user.lastname || '');
    const [saving, setSaving] = useState(false);

    const [discordStatus, setDiscordStatus] = useState(null);
    const [discordLoading, setDiscordLoading] = useState(true);
    const [showUnlinkModal, setShowUnlinkModal] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();
    const { showToast } = useToast();

    // Check for Discord OAuth callback result
    useEffect(() => {
        const discordResult = searchParams.get('discord');
        if (discordResult === 'success') {
            showToast('Discord account linked successfully!', 'success');
            setSearchParams({ tab: 'settings' });
        } else if (discordResult === 'error') {
            const message = searchParams.get('message');
            const errorMessages = {
                'missing_code': 'Discord authorization failed - missing code',
                'missing_state': 'Discord authorization failed - invalid request',
                'invalid_state': 'Discord authorization failed - invalid state',
                'expired': 'Discord authorization expired - please try again',
                'token_failed': 'Failed to connect to Discord - please try again',
                'user_fetch_failed': 'Failed to get Discord user info',
                'already_linked': 'This Discord account is already linked to another user',
                'server_error': 'Server error - please try again later',
            };
            showToast(errorMessages[message] || 'Failed to link Discord account', 'error');
            setSearchParams({ tab: 'settings' });
        }
    }, [searchParams, setSearchParams, showToast]);

    // Fetch Discord status on mount
    useEffect(() => {
        const fetchDiscordStatus = async () => {
            try {
                const status = await getDiscordStatus();
                setDiscordStatus(status);
            } catch (err) {
                console.error('Failed to fetch Discord status:', err);
            } finally {
                setDiscordLoading(false);
            }
        };
        fetchDiscordStatus();
    }, []);

    const handleSaveName = async () => {
        setSaving(true);
        try {
            await updateUserProfile({ firstname, lastname });
            showToast('Profile updated successfully!', 'success');
            setTimeout(() => window.location.reload(), 500);
        } catch (err) {
            console.error('Error updating name:', err);
            showToast('Failed to update profile.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleSavePicture = async () => {
        setSaving(true);
        try {
            await handlePictureUpdate(selectedPicture);
            showToast('Profile picture updated!', 'success');
        } catch (err) {
            showToast('Failed to update profile picture.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleLinkDiscord = async () => {
        try {
            const { url } = await getDiscordAuthUrl();
            window.location.href = url;
        } catch (err) {
            console.error('Error getting Discord auth URL:', err);
            showToast('Failed to start Discord linking process.', 'error');
        }
    };

    const handleUnlinkDiscord = async () => {
        try {
            await unlinkDiscord();
            setDiscordStatus({ linked: false });
            setShowUnlinkModal(false);
            showToast('Discord account unlinked successfully!', 'success');
        } catch (err) {
            console.error('Error unlinking Discord:', err);
            showToast('Failed to unlink Discord account.', 'error');
        }
    };

    return (
        <div className="row g-4">
            {/* Personal Information */}
            <div className="col-lg-6">
                <div className="profile-card h-100">
                    <div className="profile-card-header">
                        <h5>
                            <i className="fas fa-user"></i>
                            Personal Information
                        </h5>
                    </div>
                    <div className="profile-card-body">
                        <div className="profile-form-group">
                            <label className="profile-form-label">First Name</label>
                            <input
                                type="text"
                                className="profile-form-input"
                                value={firstname}
                                onChange={(e) => setFirstname(e.target.value)}
                                placeholder="Enter your first name"
                            />
                        </div>
                        <div className="profile-form-group">
                            <label className="profile-form-label">Last Name</label>
                            <input
                                type="text"
                                className="profile-form-input"
                                value={lastname}
                                onChange={(e) => setLastname(e.target.value)}
                                placeholder="Enter your last name"
                            />
                        </div>
                        <div className="profile-form-group">
                            <label className="profile-form-label">Email</label>
                            <input
                                type="email"
                                className="profile-form-input"
                                defaultValue={user.email}
                                disabled
                            />
                            {user.google_id && (
                                <small className="settings-helper-text">
                                    Email cannot be changed for Google accounts
                                </small>
                            )}
                        </div>
                        <button
                            className="profile-btn profile-btn-primary w-100"
                            onClick={handleSaveName}
                            disabled={saving}
                        >
                            {saving ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2"></span>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-save"></i>
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Profile Picture */}
            <div className="col-lg-6">
                <div className="profile-card h-100">
                    <div className="profile-card-header">
                        <h5>
                            <i className="fas fa-image"></i>
                            Profile Picture
                        </h5>
                    </div>
                    <div className="profile-card-body">
                        <div className="text-center mb-3">
                            <img
                                src={selectedPicture || stockImages[0]}
                                alt="Selected profile"
                                className="settings-avatar-preview"
                            />
                        </div>
                        <p className="text-center settings-avatar-instruction">
                            Choose an avatar below
                        </p>
                        <div className="avatar-grid">
                            {stockImages.map((image) => (
                                <img
                                    key={image}
                                    src={image}
                                    alt="Avatar option"
                                    className={`avatar-option ${selectedPicture === image ? 'selected' : ''}`}
                                    onClick={() => setSelectedPicture(image)}
                                />
                            ))}
                        </div>
                        <button
                            className="profile-btn profile-btn-secondary w-100"
                            onClick={handleSavePicture}
                            disabled={saving || selectedPicture === user.picture}
                        >
                            <i className="fas fa-check"></i>
                            Apply Avatar
                        </button>
                    </div>
                </div>
            </div>

            {/* Connected Accounts */}
            <div className="col-12">
                <div className="profile-card">
                    <div className="profile-card-header">
                        <h5>
                            <i className="fas fa-link"></i>
                            Connected Accounts
                        </h5>
                    </div>
                    <div className="profile-card-body">
                        <div className="row g-3">
                            {/* Discord */}
                            <div className="col-md-6">
                                <div className="connected-account">
                                    <div className="connected-account-info">
                                        <div className="connected-account-icon discord">
                                            <DiscordIcon />
                                        </div>
                                        <div>
                                            <div className="connected-account-name">Discord</div>
                                            {discordLoading ? (
                                                <div className="connected-account-status">Loading...</div>
                                            ) : discordStatus?.linked ? (
                                                <div className="connected-account-status connected">
                                                    <i className="fas fa-check-circle me-1"></i>
                                                    {discordStatus.discord_username}
                                                </div>
                                            ) : (
                                                <div className="connected-account-status">
                                                    Not connected
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {!discordLoading && (
                                        discordStatus?.linked ? (
                                            <button
                                                className="profile-btn profile-btn-danger"
                                                onClick={() => setShowUnlinkModal(true)}
                                            >
                                                Unlink
                                            </button>
                                        ) : (
                                            <button
                                                className="profile-btn profile-btn-discord"
                                                onClick={handleLinkDiscord}
                                            >
                                                <DiscordIcon />
                                                Link
                                            </button>
                                        )
                                    )}
                                </div>
                            </div>

                            {/* Google */}
                            <div className="col-md-6">
                                <div className="connected-account">
                                    <div className="connected-account-info">
                                        <div className="connected-account-icon google">
                                            <GoogleIcon />
                                        </div>
                                        <div>
                                            <div className="connected-account-name">Google</div>
                                            {user.google_id ? (
                                                <div className="connected-account-status connected">
                                                    <i className="fas fa-check-circle me-1"></i>
                                                    Connected
                                                </div>
                                            ) : (
                                                <div className="connected-account-status">
                                                    Not connected
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {user.google_id && (
                                        <span className="badge settings-badge-primary">
                                            Primary
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="mt-3 p-3 rounded settings-info-box">
                            <i className="fas fa-info-circle me-2 settings-info-icon"></i>
                            <span className="settings-info-text">
                                Link your Discord account to enable check-in via Discord reactions and receive game notifications.
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Unlink Discord Confirmation Modal */}
            <ConfirmModal
                show={showUnlinkModal}
                title="Unlink Discord Account"
                message="Are you sure you want to unlink your Discord account? You will no longer receive game notifications or be able to check in via Discord reactions."
                onConfirm={handleUnlinkDiscord}
                onCancel={() => setShowUnlinkModal(false)}
                confirmText="Unlink"
                cancelText="Cancel"
                type="danger"
            />
        </div>
    );
};

SettingsTab.propTypes = {
    user: PropTypes.shape({
        email: PropTypes.string,
        firstname: PropTypes.string,
        lastname: PropTypes.string,
        picture: PropTypes.string,
        google_id: PropTypes.string,
    }).isRequired,
    handlePictureUpdate: PropTypes.func.isRequired,
};

export default SettingsTab;
