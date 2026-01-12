import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { updateUserProfile, getDiscordAuthUrl, getDiscordStatus, unlinkDiscord } from '../../../api/usersApi';

const SettingsTab = ({ user, handlePictureUpdate }) => {
    // Define the stock images
    const stockImages = [
        '/images/profile-pictures/avatar1.png',
        '/images/profile-pictures/avatar2.png',
        '/images/profile-pictures/avatar3.png',
        '/images/profile-pictures/avatar4.png',
        '/images/profile-pictures/avatar5.png',
    ];

    // State to track the selected picture and name fields
    const [selectedPicture, setSelectedPicture] = useState(user.picture);
    const [firstname, setFirstname] = useState(user.firstname);
    const [lastname, setLastname] = useState(user.lastname);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Discord state
    const [discordStatus, setDiscordStatus] = useState(null);
    const [discordLoading, setDiscordLoading] = useState(true);
    const [searchParams, setSearchParams] = useSearchParams();

    // Check for Discord OAuth callback result
    useEffect(() => {
        const discordResult = searchParams.get('discord');
        if (discordResult === 'success') {
            setSuccess('Discord account linked successfully!');
            // Clear the URL params
            setSearchParams({});
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
            setError(errorMessages[message] || 'Failed to link Discord account');
            setSearchParams({});
        }
    }, [searchParams, setSearchParams]);

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

    const handleSavePicture = () => {
        // Call the function to update the user's profile picture
        handlePictureUpdate(selectedPicture);
    };

    const handleSaveName = async () => {
        try {
            setError('');
            setSuccess('');
            await updateUserProfile({ firstname, lastname });
            setSuccess('Name updated successfully!');
            // Update parent component's user state
            window.location.reload(); // Reload to reflect changes
        } catch (err) {
            console.error('Error updating name:', err);
            setError('Failed to update name.');
        }
    };

    const handleLinkDiscord = async () => {
        try {
            setError('');
            const { url } = await getDiscordAuthUrl();
            // Redirect to Discord OAuth
            window.location.href = url;
        } catch (err) {
            console.error('Error getting Discord auth URL:', err);
            setError('Failed to start Discord linking process.');
        }
    };

    const handleUnlinkDiscord = async () => {
        if (!window.confirm('Are you sure you want to unlink your Discord account?')) {
            return;
        }
        try {
            setError('');
            await unlinkDiscord();
            setDiscordStatus({ linked: false });
            setSuccess('Discord account unlinked successfully!');
        } catch (err) {
            console.error('Error unlinking Discord:', err);
            setError('Failed to unlink Discord account.');
        }
    };

    return (
        <div>
            <h4>Account Settings</h4>

            {error && <div className="alert alert-danger">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <div className="mb-4">
                <h5>Personal Information</h5>
                <div className="mb-3">
                    <label>First Name:</label>
                    <input
                        type="text"
                        className="form-control"
                        value={firstname}
                        onChange={(e) => setFirstname(e.target.value)}
                    />
                </div>
                <div className="mb-3">
                    <label>Last Name:</label>
                    <input
                        type="text"
                        className="form-control"
                        value={lastname}
                        onChange={(e) => setLastname(e.target.value)}
                    />
                </div>
                <button className="btn btn-primary" onClick={handleSaveName}>
                    <i className="fas fa-save me-2"></i>
                    Save Name
                </button>
            </div>

            <hr />

            <div className="mb-3">
                <label>Email:</label>
                <input
                    type="email"
                    className="form-control"
                    defaultValue={user.email}
                    disabled={user.google_id ? true : false} // Disable if authenticated with Google
                />
                {user.google_id && <small className="text-muted">Email cannot be changed for Google accounts</small>}
            </div>

            <hr />

            <div className="mb-4">
                <h5>Connected Accounts</h5>

                {/* Discord Integration */}
                <div className="card mb-3">
                    <div className="card-body d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center">
                            <i className="fab fa-discord fa-2x me-3" style={{ color: '#5865F2' }}></i>
                            <div>
                                <strong>Discord</strong>
                                {discordLoading ? (
                                    <p className="mb-0 text-muted small">Loading...</p>
                                ) : discordStatus?.linked ? (
                                    <p className="mb-0 text-success small">
                                        Connected as {discordStatus.discord_username}
                                    </p>
                                ) : (
                                    <p className="mb-0 text-muted small">
                                        Link your Discord to check in via reactions
                                    </p>
                                )}
                            </div>
                        </div>
                        {!discordLoading && (
                            discordStatus?.linked ? (
                                <button
                                    className="btn btn-outline-danger btn-sm"
                                    onClick={handleUnlinkDiscord}
                                >
                                    Unlink
                                </button>
                            ) : (
                                <button
                                    className="btn btn-primary btn-sm"
                                    onClick={handleLinkDiscord}
                                    style={{ backgroundColor: '#5865F2', borderColor: '#5865F2' }}
                                >
                                    <i className="fab fa-discord me-1"></i>
                                    Link Discord
                                </button>
                            )
                        )}
                    </div>
                </div>

                {/* Google - show status only */}
                <div className="card mb-3">
                    <div className="card-body d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center">
                            <i className="fab fa-google fa-2x me-3" style={{ color: '#4285F4' }}></i>
                            <div>
                                <strong>Google</strong>
                                {user.google_id ? (
                                    <p className="mb-0 text-success small">Connected</p>
                                ) : (
                                    <p className="mb-0 text-muted small">Not connected</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <hr />

            <div className="mb-3">
                <label>Select Profile Picture:</label>
                <div className="d-flex">
                    {stockImages.map((image) => (
                        <img
                            key={image}
                            src={image}
                            alt="Profile"
                            className={`rounded-circle m-2 ${selectedPicture === image ? 'border border-3 border-primary' : ''
                                }`}
                            style={{ width: '50px', height: '50px', cursor: 'pointer' }}
                            onClick={() => setSelectedPicture(image)}
                        />
                    ))}
                </div>
                <button className="btn btn-secondary mt-2" onClick={handleSavePicture}>
                    <i className="fas fa-image me-2"></i>
                    Save Picture
                </button>
            </div>
        </div>
    );
};

export default SettingsTab;
