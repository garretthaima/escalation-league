import React from 'react';
import { useNavigate } from 'react-router-dom';

const NotAuthorized = () => {
    const navigate = useNavigate();

    return (
        <div className="container text-center mt-5">
            <h1 className="text-danger">403 - Not Authorized</h1>
            <p className="mt-3">
                You do not have permission to access this page. Please contact your administrator if you believe this is an error.
            </p>
            <button
                className="btn btn-primary mt-3"
                onClick={() => navigate('/')}
            >
                Go to Home
            </button>
        </div>
    );
};

export default NotAuthorized;