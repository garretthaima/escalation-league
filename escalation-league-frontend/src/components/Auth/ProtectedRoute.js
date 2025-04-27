import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');

  if (!token) {
    return <Navigate to="/signin" />; // Redirect to sign-in if no token
  }

  // Decode JWT payload to extract user information
  const tokenPayload = JSON.parse(atob(token.split('.')[1])); // Decode JWT payload
  const isTokenExpired = tokenPayload.exp * 1000 < Date.now();

  if (isTokenExpired) {
    localStorage.removeItem('token'); // Clear expired token
    return <Navigate to="/signin" />; // Redirect to sign-in if token is expired
  }

  // Check if the user's role is allowed
  if (allowedRoles && !allowedRoles.includes(tokenPayload.role)) {
    return <Navigate to="/not-authorized" />; // Redirect if role is not allowed
  }

  return children; // Render the protected component if all checks pass
};

export default ProtectedRoute;