import React from 'react';

const SettingsTab = ({ user, handlePictureChange, handlePictureUpload }) => {
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
                <label>Change Profile Picture:</label>
                <input type="file" className="form-control" onChange={handlePictureChange} />
                <button className="btn btn-sm btn-primary mt-2" onClick={handlePictureUpload}>
                    Upload Picture
                </button>
            </div>
        </div>
    );
};

export default SettingsTab;