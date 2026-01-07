import React, { useState } from 'react';
import { updateUserProfile } from '../../../api/usersApi';

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