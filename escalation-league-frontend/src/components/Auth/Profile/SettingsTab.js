import React, { useState } from 'react';

const SettingsTab = ({ user, handlePictureUpdate }) => {
    // Define the stock images
    const stockImages = [
        `${process.env.REACT_APP_BACKEND_URL}/images/profile-pictures/avatar1.png`,
        `${process.env.REACT_APP_BACKEND_URL}/images/profile-pictures/avatar2.png`,
        `${process.env.REACT_APP_BACKEND_URL}/images/profile-pictures/avatar3.png`,
    ];

    // State to track the selected picture
    const [selectedPicture, setSelectedPicture] = useState(user.picture);

    const handleSave = () => {
        // Call the function to update the user's profile picture
        handlePictureUpdate(selectedPicture);
    };

    return (
        <div>
            <h4>Account Settings</h4>
            <div className="mb-3">
                <label>Email:</label>
                <input
                    type="email"
                    className="form-control"
                    defaultValue={user.email}
                    disabled={user.google_id ? true : false} // Disable if authenticated with Google
                />
            </div>
            <div className="mb-3">
                <label>Password:</label>
                <input type="password" className="form-control" placeholder="Change Password" />
            </div>
            <div className="mb-3">
                <label>Notification Preferences:</label>
                <select className="form-control">
                    <option>Email Notifications</option>
                    <option>In-App Notifications</option>
                    <option>Both</option>
                    <option>None</option>
                </select>
            </div>
            <div className="mb-3">
                <label>Select Profile Picture:</label>
                <div className="d-flex">
                    {stockImages.map((image) => (
                        <img
                            key={image}
                            src={image}
                            alt="Profile"
                            className={`rounded-circle m-2 ${selectedPicture === image ? 'border border-primary' : ''
                                }`}
                            style={{ width: '50px', height: '50px', cursor: 'pointer' }}
                            onClick={() => setSelectedPicture(image)}
                        />
                    ))}
                </div>
                <button className="btn btn-sm btn-primary mt-2" onClick={handleSave}>
                    Save Picture
                </button>
            </div>
        </div>
    );
};

export default SettingsTab;