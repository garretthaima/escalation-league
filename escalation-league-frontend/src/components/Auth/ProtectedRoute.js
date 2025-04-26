import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');

  if (!token) {
    return <Navigate to="/register" />;
  }

  // Optional: Add token expiry validation
  const tokenPayload = JSON.parse(atob(token.split('.')[1])); // Decode JWT payload
  const isTokenExpired = tokenPayload.exp * 1000 < Date.now();

  if (isTokenExpired) {
    localStorage.removeItem('token'); // Clear expired token
    return <Navigate to="/register" />;
  }

  return children;
};

export default ProtectedRoute;